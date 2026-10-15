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
function usernameOf(value) {
    check(typeof value === 'string' && /^[a-z0-9_.-]{3,40}$/i.test(value.trim()), 400, 'Use 3–40 letters, numbers, dots, dashes or underscores for the account username.');
    return value.trim().toLowerCase();
}
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
    return { listName: text(raw.listName), location: text(raw.location ?? '', false), markets };
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
        return stmt('SELECT u.id,u.username FROM users u JOIN sessions s ON s.user_id=u.id WHERE s.token_hash=? AND s.expires>?').get(digest(token), Date.now()) || null;
    };
    const auth = req => { const user = sessionUser(req); check(user, 401, 'Please log in.', 'UNAUTHORIZED'); return user; };
    const accessible = (id, user) => {
        const row = stmt('SELECT l.* FROM lists l JOIN members m ON m.list_id=l.id WHERE l.id=? AND m.user_id=?').get(id, user.id);
        check(row, 404, 'List not found.'); return row;
    };
    const record = row => ({ id: row.id, owner_id: row.owner_id, document: JSON.parse(row.document), version: row.version, updated_at: row.updated_at });
    const cookie = (res, token, maxAge = 604800) => res.setHeader('Set-Cookie', `buyme_session=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}${secureCookies ? '; Secure' : ''}`);
    const newSession = (res, user) => {
        const token = randomBytes(32).toString('hex');
        stmt('DELETE FROM sessions WHERE expires<=?').run(Date.now());
        stmt('INSERT INTO sessions VALUES(?,?,?)').run(digest(token), user.id, Date.now() + 604800000);
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
                const files = { '/': ['index.html','text/html'], '/index.html': ['index.html','text/html'], '/app.js':['app.js','text/javascript'], '/core.js':['core.js','text/javascript'], '/cloud.js':['cloud.js','text/javascript'], '/style.css':['style.css','text/css'] };
                const asset = files[url.pathname]; check(asset, 404, 'Not found.');
                res.writeHead(200, { 'Content-Type': `${asset[1]}; charset=utf-8`, 'Cache-Control': 'no-cache' });
                return res.end(req.method === 'HEAD' ? undefined : readFileSync(resolve(root, asset[0])));
            }
            if (!['GET','HEAD'].includes(req.method)) {
                const origin = req.headers.origin;
                check(!origin || origin === (publicOrigin || `http://${req.headers.host}`), 403, 'Cross-origin action refused.');
            }
            if (url.pathname === '/api/session' && req.method === 'GET') return response(res, 200, { user: sessionUser(req) });
            if (['/api/signup','/api/login'].includes(url.pathname) && req.method === 'POST') {
                const key = req.socket.remoteAddress || 'local'; const now = Date.now();
                const attempts = (rate.get(key) || []).filter(t => now-t < 900000);
                check(attempts.length < 30, 429, 'Too many sign-in attempts. Try again later.');
                attempts.push(now); rate.set(key, attempts);
                if (rate.size > 10000) for (const [ip, times] of rate) if (times.every(t => now-t>=900000)) rate.delete(ip);
                const body = await bodyOf(req), username = usernameOf(body.username);
                check(typeof body.password === 'string' && body.password.length >= 8 && body.password.length <= 200, 400, 'Use a password with 8–200 characters.');
                if (url.pathname === '/api/signup') {
                    const salt = randomBytes(16).toString('hex'), hash = await scrypt(body.password, salt, 64);
                    const user = { id: randomUUID(), username };
                    try { stmt('INSERT INTO users VALUES(?,?,?,?)').run(user.id, username, salt, hash.toString('hex')); }
                    catch (error) { if (String(error.message).includes('UNIQUE')) throw new ApiError(409, 'That account username is taken.'); throw error; }
                    newSession(res,user); return response(res,201,{user});
                }
                const found = stmt('SELECT * FROM users WHERE username=?').get(username);
                const hash = await scrypt(body.password, found?.salt || '00000000000000000000000000000000', 64);
                check(found && timingSafeEqual(hash, Buffer.from(found.password_hash,'hex')),401,'Invalid username or password.');
                const user = { id: found.id, username: found.username }; newSession(res,user); return response(res,200,{user});
            }
            const user = auth(req);
            if (url.pathname === '/api/logout' && req.method === 'POST') {
                await bodyOf(req); stmt('DELETE FROM sessions WHERE token_hash=?').run(digest(tokenOf(req))); cookie(res,'',0); return response(res,200,{ok:true});
            }
            if (url.pathname === '/api/profile' && req.method === 'PATCH') {
                const username = usernameOf((await bodyOf(req)).username);
                try { stmt('UPDATE users SET username=? WHERE id=?').run(username,user.id); }
                catch (error) { if (String(error.message).includes('UNIQUE')) throw new ApiError(409,'That account username is taken.'); throw error; }
                return response(res,200,{id:user.id,username});
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
                if (req.method==='GET') return response(res,200,stmt("SELECT u.id,u.username,CASE WHEN u.id=? THEN 'owner' ELSE 'member' END role FROM members m JOIN users u ON u.id=m.user_id WHERE m.list_id=? ORDER BY role DESC,u.username").all(row.owner_id,id));
                check(req.method==='POST',405,'Method not allowed.'); check(row.owner_id===user.id,403,'Only the owner can add members.');
                const username=usernameOf((await bodyOf(req)).username), target=stmt('SELECT id FROM users WHERE username=?').get(username);
                check(target,404,'No account with that username. Ask the person to register on this BuyMe server first.');
                transaction(() => {
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
