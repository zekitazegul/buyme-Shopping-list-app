import http from 'node:http';
import { DatabaseSync } from 'node:sqlite';
import { randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
import { mkdirSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
const scrypt = promisify(scryptCallback);
const root = dirname(fileURLToPath(import.meta.url));
const digest = value => createHash('sha256').update(value).digest('hex');
class ApiError extends Error {
    constructor(status, message, code = 'REQUEST_ERROR') { super(message); this.status = status; this.code = code; }
}
function check(condition, status, message, code) { if (!condition) throw new ApiError(status, message, code); }
function emailOf(value) {
    check(typeof value === 'string' && value.trim().length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim()), 400, 'EMAIL_INVALID', 'EMAIL_INVALID');
    return value.trim().toLowerCase();
}
function displayNameOf(value) {
    check(typeof value === 'string' && value.trim().length >= 1 && value.trim().length <= 80, 400, 'NAME_INVALID', 'NAME_INVALID');
    return value.trim();
}
const publicUser = row => ({ id: row.id, username: row.username, email: row.email, name: row.display_name || row.username });
const sessionSeconds = 90 * 24 * 60 * 60;
function documentOf(raw) {
    check(raw && typeof raw === 'object' && !Array.isArray(raw), 400, 'Invalid list.');
    const text = (value, required = true) => {
        check(typeof value === 'string' && value.trim().length <= 200 && (!required || value.trim()), 400, 'Names must contain 1–200 characters.');
        return value.trim();
    };
    const names = new Set();
    const id = (value, kind) => { const key = `${kind}:${value}`; check(typeof value === 'string' && value.length > 0 && value.length <= 120 && !names.has(key), 400, 'Invalid or duplicate item ID.'); names.add(key); return value; };
    check(Array.isArray(raw.markets) && raw.markets.length <= 100, 400, 'A list may contain up to 100 markets.');
    let total = 0;
    const markets = raw.markets.map(m => {
        check(m && Array.isArray(m.products) && m.products.length <= 1000, 400, 'A market may contain up to 1000 products.');
        total += m.products.length; check(total <= 5000, 400, 'A list may contain up to 5000 products.');
        return { id: id(m.id, 'market'), name: text(m.name), products: m.products.map(p => {
            check(p && ['pending', 'purchased', 'not_found'].includes(p.status), 400, 'Invalid product status.');
            return { id: id(p.id, 'product'), name: text(p.name), status: p.status };
        }) };
    });
    return { listName: text(raw.listName ?? '', false), location: text(raw.location ?? '', false), markets };
}
export function createApp({ dbPath = process.env.BUYME_DB || resolve(root, 'data/buyme.sqlite'), secureCookies = false, publicOrigin = process.env.PUBLIC_ORIGIN || '' } = {}) {
    if (dbPath !== ':memory:') mkdirSync(dirname(resolve(dbPath)), { recursive: true });
    const db = new DatabaseSync(dbPath);
    db.exec(`PRAGMA foreign_keys=ON; PRAGMA journal_mode=WAL; PRAGMA busy_timeout=5000;
      CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY, username TEXT NOT NULL UNIQUE COLLATE NOCASE, salt TEXT NOT NULL, password_hash TEXT NOT NULL);
      CREATE TABLE IF NOT EXISTS sessions(token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, expires INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS lists(id TEXT PRIMARY KEY, owner_id TEXT NOT NULL REFERENCES users(id), document TEXT NOT NULL, version INTEGER NOT NULL DEFAULT 1, updated_at INTEGER NOT NULL);
      CREATE TABLE IF NOT EXISTS members(list_id TEXT NOT NULL REFERENCES lists(id) ON DELETE CASCADE, user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, PRIMARY KEY(list_id,user_id));
      CREATE INDEX IF NOT EXISTS members_user ON members(user_id);`);
    // Additive migration: preserve existing accounts, sessions and lists.
    const columns = new Set(db.prepare('PRAGMA table_info(users)').all().map(c => c.name));
    if (!columns.has('email')) db.exec('ALTER TABLE users ADD COLUMN email TEXT COLLATE NOCASE');
    if (!columns.has('display_name')) db.exec('ALTER TABLE users ADD COLUMN display_name TEXT');
    db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS users_email ON users(email) WHERE email IS NOT NULL;
      CREATE TABLE IF NOT EXISTS contacts(owner_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        contact_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE, alias TEXT NOT NULL,
        PRIMARY KEY(owner_id,contact_id));`);
    const stmt = sql => db.prepare(sql);
    const rate = new Map();
    const transaction = action => {
        db.exec('BEGIN IMMEDIATE');
        try { const result = action(); db.exec('COMMIT'); return result; }
        catch (error) { db.exec('ROLLBACK'); throw error; }
    };
    const tokenOf = req => (req.headers.cookie || '').split(';').map(v => v.trim()).find(v => v.startsWith('buyme_session='))?.slice(14);
    const sessionUser = req => {
        const token = tokenOf(req); if (!token || !/^[a-f0-9]{64}$/.test(token)) return null;
        const row = stmt('SELECT u.* FROM users u JOIN sessions s ON s.user_id=u.id WHERE s.token_hash=? AND s.expires>?').get(digest(token), Date.now());
        return row ? publicUser(row) : null;
    };
    const auth = req => { const user = sessionUser(req); check(user, 401, 'Please log in.', 'UNAUTHORIZED'); return user; };
    const accessible = (id, user) => {
        const row = stmt('SELECT l.* FROM lists l JOIN members m ON m.list_id=l.id WHERE l.id=? AND m.user_id=?').get(id, user.id);
        check(row, 404, 'List not found.'); return row;
    };
    const record = row => ({ id: row.id, owner_id: row.owner_id, document: JSON.parse(row.document), version: row.version, updated_at: row.updated_at });
    const cookie = (res, token, maxAge = sessionSeconds) => res.setHeader('Set-Cookie', `buyme_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secureCookies ? '; Secure' : ''}`);
    const newSession = (res, user) => {
        const token = randomBytes(32).toString('hex');
        stmt('DELETE FROM sessions WHERE expires<=?').run(Date.now());
        stmt('INSERT INTO sessions VALUES(?,?,?)').run(digest(token), user.id, Date.now() + sessionSeconds * 1000);
        cookie(res, token);
    };
    const bodyOf = async req => {
        check((req.headers['content-type'] || '').split(';')[0] === 'application/json', 415, 'JSON body required.');
        const chunks = []; let size = 0;
        for await (const chunk of req) { size += chunk.length; check(size <= 1000000, 413, 'Request too large.'); chunks.push(chunk); }
        try { const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8')); check(parsed && typeof parsed === 'object' && !Array.isArray(parsed), 400, 'Invalid JSON.'); return parsed; }
        catch { throw new ApiError(400, 'Invalid JSON.'); }
    };
    const response = (res, status, value) => { res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }); res.end(JSON.stringify(value)); };
    const server = http.createServer(async (req, res) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Referrer-Policy', 'same-origin');
        res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:; base-uri 'none'; form-action 'self'; frame-ancestors 'none'");
        try {
            const url = new URL(req.url, 'http://localhost');
            if (!url.pathname.startsWith('/api/')) {
                check(['GET', 'HEAD'].includes(req.method), 405, 'Method not allowed.');
                const files = { '/': ['index.html','text/html'], '/index.html': ['index.html','text/html'], '/app.js':['app.js','text/javascript'], '/core.js':['core.js','text/javascript'], '/cloud.js':['cloud.js','text/javascript'], '/i18n.js':['i18n.js','text/javascript'], '/style.css':['style.css','text/css'] };
                const asset = files[url.pathname]; check(asset, 404, 'Not found.');
                res.writeHead(200, { 'Content-Type': `${asset[1]}; charset=utf-8`, 'Cache-Control': 'no-cache' });
                return res.end(req.method === 'HEAD' ? undefined : readFileSync(resolve(root, asset[0])));
            }
            if (!['GET','HEAD'].includes(req.method)) {
                const origin = req.headers.origin;
                check(!origin || origin === (publicOrigin || `http://${req.headers.host}`), 403, 'Cross-origin action refused.');
            }
            if (url.pathname === '/api/session' && req.method === 'GET') {
                const user = sessionUser(req);
                if (user) {
                    stmt('UPDATE sessions SET expires=? WHERE token_hash=?').run(Date.now() + sessionSeconds * 1000, digest(tokenOf(req)));
                    cookie(res, tokenOf(req));
                }
                return response(res, 200, { user });
            }
            if (['/api/signup','/api/login'].includes(url.pathname) && req.method === 'POST') {
                const key = req.socket.remoteAddress || 'local'; const now = Date.now();
                const attempts = (rate.get(key) || []).filter(t => now-t < 900000);
                check(attempts.length < 30, 429, 'Too many sign-in attempts. Try again later.');
                attempts.push(now); rate.set(key, attempts);
                if (rate.size > 10000) for (const [ip, times] of rate) if (times.every(t => now-t>=900000)) rate.delete(ip);
                const body = await bodyOf(req);
                check(typeof body.password === 'string' && body.password.length >= 8 && body.password.length <= 200, 400, 'PASSWORD_LENGTH', 'PASSWORD_LENGTH');
                if (url.pathname === '/api/signup') {
                    const email = emailOf(body.email), name = displayNameOf(body.name || email.split('@')[0]);
                    const salt = randomBytes(16).toString('hex'), hash = await scrypt(body.password, salt, 64);
                    const id = randomUUID(), username = `account-${id}`;
                    try { stmt('INSERT INTO users(id,username,salt,password_hash,email,display_name) VALUES(?,?,?,?,?,?)').run(id,username,salt,hash.toString('hex'),email,name); }
                    catch (error) { if (String(error.message).includes('UNIQUE')) throw new ApiError(409, 'EMAIL_TAKEN', 'EMAIL_TAKEN'); throw error; }
                    const user = publicUser(stmt('SELECT * FROM users WHERE id=?').get(id));
                    newSession(res,user); return response(res,201,{user});
                }
                // Legacy usernames remain usable so an existing account can add an email.
                const identity = String(body.email || body.username || '').trim().toLowerCase();
                const found = identity.includes('@') ? stmt('SELECT * FROM users WHERE email=?').get(identity) : stmt('SELECT * FROM users WHERE username=?').get(identity);
                const hash = await scrypt(body.password, found?.salt || '00000000000000000000000000000000', 64);
                check(found && timingSafeEqual(hash, Buffer.from(found.password_hash,'hex')),401,'LOGIN_INVALID','LOGIN_INVALID');
                const user = publicUser(found); newSession(res,user); return response(res,200,{user});
            }
            const user = auth(req);
            if (url.pathname === '/api/logout' && req.method === 'POST') {
                await bodyOf(req); stmt('DELETE FROM sessions WHERE token_hash=?').run(digest(tokenOf(req))); cookie(res,'',0); return response(res,200,{ok:true});
            }
            if (url.pathname === '/api/profile' && req.method === 'PATCH') {
                const body = await bodyOf(req), name = displayNameOf(body.name);
                const email = body.email === undefined ? user.email : emailOf(body.email);
                if (email !== user.email) {
                    const found = stmt('SELECT salt,password_hash FROM users WHERE id=?').get(user.id);
                    check(typeof body.password === 'string' && body.password.length <= 200,400,'PASSWORD_REQUIRED','PASSWORD_REQUIRED');
                    const hash = await scrypt(body.password,found.salt,64);
                    check(timingSafeEqual(hash,Buffer.from(found.password_hash,'hex')),401,'LOGIN_INVALID','LOGIN_INVALID');
                }
                try { stmt('UPDATE users SET display_name=?,email=? WHERE id=?').run(name,email,user.id); }
                catch (error) { if (String(error.message).includes('UNIQUE')) throw new ApiError(409,'EMAIL_TAKEN','EMAIL_TAKEN'); throw error; }
                return response(res,200,publicUser(stmt('SELECT * FROM users WHERE id=?').get(user.id)));
            }
            if (url.pathname === '/api/contacts' && req.method === 'GET') {
                return response(res,200,stmt('SELECT u.id,u.email,c.alias AS name FROM contacts c JOIN users u ON u.id=c.contact_id WHERE c.owner_id=? ORDER BY c.alias').all(user.id));
            }
            if (url.pathname === '/api/lists' && req.method === 'GET') {
                return response(res,200,stmt('SELECT l.* FROM lists l JOIN members m ON m.list_id=l.id WHERE m.user_id=? ORDER BY l.updated_at DESC').all(user.id).map(record));
            }
            if (url.pathname === '/api/lists' && req.method === 'POST') {
                const document = documentOf((await bodyOf(req)).document), id = randomUUID();
                const row = transaction(() => {
                    stmt('INSERT INTO lists VALUES(?,?,?,1,?)').run(id,user.id,JSON.stringify(document),Date.now());
                    stmt('INSERT INTO members VALUES(?,?)').run(id,user.id);
                    return stmt('SELECT * FROM lists WHERE id=?').get(id);
                });
                return response(res,201,record(row));
            }
            const match = /^\/api\/lists\/([a-zA-Z0-9-]+)(\/members)?$/.exec(url.pathname);
            check(match,404,'Not found.');
            const id=match[1], row=accessible(id,user);
            if (match[2]) {
                if (req.method==='GET') return response(res,200,stmt("SELECT u.id,u.username,COALESCE(u.display_name,u.username) name,CASE WHEN u.id=? THEN 'owner' ELSE 'member' END role FROM members m JOIN users u ON u.id=m.user_id WHERE m.list_id=? ORDER BY role DESC,u.username").all(row.owner_id,id));
                check(req.method==='POST',405,'Method not allowed.'); check(row.owner_id===user.id,403,'Only the owner can add members.');
                const body = await bodyOf(req);
                let target;
                if (body.contactId) target = stmt('SELECT u.id FROM contacts c JOIN users u ON u.id=c.contact_id WHERE c.owner_id=? AND c.contact_id=?').get(user.id,body.contactId);
                else if (body.email) target = stmt('SELECT id FROM users WHERE email=?').get(emailOf(body.email));
                else if (body.name) {
                    const matches = stmt('SELECT contact_id AS id FROM contacts WHERE owner_id=? AND alias=? COLLATE NOCASE').all(user.id,displayNameOf(body.name));
                    check(matches.length <= 1,400,'CONTACT_AMBIGUOUS','CONTACT_AMBIGUOUS'); target = matches[0];
                }
                check(target,404,'CONTACT_NOT_FOUND','CONTACT_NOT_FOUND');
                const targetUser = stmt('SELECT * FROM users WHERE id=?').get(target.id);
                const previousContact = stmt('SELECT alias FROM contacts WHERE owner_id=? AND contact_id=?').get(user.id,target.id);
                const alias = displayNameOf(body.alias || previousContact?.alias || targetUser.display_name || targetUser.username);
                transaction(() => {
                    stmt('INSERT INTO contacts VALUES(?,?,?) ON CONFLICT(owner_id,contact_id) DO UPDATE SET alias=excluded.alias').run(user.id,target.id,alias);
                    const result=stmt('INSERT OR IGNORE INTO members VALUES(?,?)').run(id,target.id);
                    if(result.changes) stmt('UPDATE lists SET version=version+1,updated_at=? WHERE id=?').run(Date.now(),id);
                });
                return response(res,200,{ok:true});
            }
            if(req.method==='GET') return response(res,200,record(row));
            check(req.method==='PUT',405,'Method not allowed.');
            const body=await bodyOf(req), document=documentOf(body.document);
            check(Number.isSafeInteger(body.version) && body.version>=1,400,'Version required.');
            const saved=transaction(() => {
                const result=stmt('UPDATE lists SET document=?,version=version+1,updated_at=? WHERE id=? AND version=?').run(JSON.stringify(document),Date.now(),id,body.version);
                check(result.changes===1,409,'List changed. Load latest before retrying.','CONFLICT');
                return stmt('SELECT * FROM lists WHERE id=?').get(id);
            });
            return response(res,200,record(saved));
        } catch (error) {
            if(!error.status) console.error('BuyMe server error:',error.message);
            if(!res.headersSent) response(res,error.status||500,{error:error.status?error.message:'Server error.',code:error.code||'SERVER_ERROR'});
            else res.end();
        }
    });
    server.on('close',()=>db.close());
    return server;
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
    const origin=process.env.PUBLIC_ORIGIN||'';
    if(process.env.NODE_ENV==='production' && !origin.startsWith('https://')) throw new Error('PUBLIC_ORIGIN must be an HTTPS URL in production.');
    createApp({secureCookies:origin.startsWith('https://'),publicOrigin:origin}).listen(Number(process.env.PORT||3000),process.env.HOST||'127.0.0.1',()=>console.log('BuyMe is running. Local and shared lists are available.'));
}
