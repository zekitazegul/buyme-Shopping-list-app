import { test } from 'node:test';
import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createApp } from '../server.mjs';

async function start(t, dbPath = ':memory:') {
    const server = createApp({ dbPath }); server.listen(0,'127.0.0.1'); await once(server,'listening');
    t.after(() => new Promise(resolve => server.close(resolve)));
    const origin = `http://127.0.0.1:${server.address().port}`;
    const call = async (path, method = 'GET', body, cookie) => {
        const res = await fetch(origin+path,{method,headers:{...(body===undefined?{}:{'Content-Type':'application/json',Origin:origin}),...(cookie?{Cookie:cookie}:{})},...(body===undefined?{}:{body:JSON.stringify(body)})});
        return {status:res.status,body:await res.json(),cookie:res.headers.get('set-cookie')?.split(';')[0]};
    };
    const signup = async username => { const result=await call('/api/signup','POST',{username,password:'password-123'}); assert.equal(result.status,201);return result; };
    return {origin,call,signup,server};
}
const doc = name => ({listName:name,location:'Rotterdam',markets:[{id:'m',name:'Lidl',products:[{id:'p',name:'Milk',status:'pending'}]}]});

test('authentication, sharing permissions, optimistic conflicts and durable edits', async t => {
    const {call,signup}=await start(t);
    const alice=await signup('alice'),bob=await signup('bob'),carol=await signup('carol');
    assert.match(alice.cookie,/buyme_session=/);
    assert.equal((await call('/api/lists')).status,401);
    assert.equal((await call('/api/login','POST',{username:'alice',password:'wrong-password'})).status,401);
    const created=await call('/api/lists','POST',{document:doc('Weekly')},alice.cookie);
    assert.equal(created.status,201); const id=created.body.id;
    assert.equal((await call(`/api/lists/${id}`,'GET',undefined,bob.cookie)).status,404);
    assert.equal((await call(`/api/lists/${id}/members`,'POST',{username:'bob'},alice.cookie)).status,200);
    assert.equal((await call('/api/lists','GET',undefined,bob.cookie)).body.length,1);
    const shared=await call(`/api/lists/${id}`,'GET',undefined,bob.cookie);
    assert.equal(shared.body.document.listName,'Weekly');
    assert.equal((await call(`/api/lists/${id}/members`,'POST',{username:'carol'},bob.cookie)).status,403);
    const changed=doc('Saturday'); changed.markets[0].products[0].status='purchased';
    const saved=await call(`/api/lists/${id}`,'PUT',{document:changed,version:shared.body.version},bob.cookie);
    assert.equal(saved.status,200);
    assert.equal((await call(`/api/lists/${id}`,'PUT',{document:doc('Stale'),version:shared.body.version},alice.cookie)).status,409);
    const latest=await call(`/api/lists/${id}`,'GET',undefined,alice.cookie);
    assert.equal(latest.body.document.markets[0].products[0].status,'purchased');
    assert.equal((await call(`/api/lists/${id}`,'PUT',{document:doc('Attack'),version:latest.body.version},carol.cookie)).status,404);
    const invalid=doc('Bad'); invalid.markets[0].products[0].status='invalid';
    assert.equal((await call(`/api/lists/${id}`,'PUT',{document:invalid,version:latest.body.version},alice.cookie)).status,400);
    assert.equal((await call('/api/logout','POST',{},alice.cookie)).status,200);
    assert.equal((await call('/api/lists','GET',undefined,alice.cookie)).status,401);
});
test('cross-origin writes and private filesystem paths are rejected', async t => {
    const {origin,signup}=await start(t); const alice=await signup('alice');
    const evil=await fetch(origin+'/api/lists',{method:'POST',headers:{'Content-Type':'application/json',Origin:'https://evil.example',Cookie:alice.cookie},body:JSON.stringify({document:doc('Unsafe')})});
    assert.equal(evil.status,403);
    for(const path of ['/data/buyme.sqlite','/.git/config','/server.mjs']) assert.equal((await fetch(origin+path)).status,404);
    const home=await fetch(origin+'/');assert.equal(home.status,200);assert(home.headers.get('content-security-policy').includes("script-src 'self'"));
    const duplicate=await fetch(origin+'/api/signup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:'alice',password:'other-pass-123'})});
    assert.equal(duplicate.status,409);
});
test('SQLite data and session survive restarting the server', async t => {
    const directory=mkdtempSync(join(tmpdir(),'buyme-persist-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));
    const path=join(directory,'app.sqlite');
    const first=createApp({dbPath:path});first.listen(0,'127.0.0.1');await once(first,'listening');
    const base=`http://127.0.0.1:${first.address().port}`;
    const auth=await fetch(base+'/api/signup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:'alice',password:'password-123'})});
    const cookie=auth.headers.get('set-cookie').split(';')[0];
    await fetch(base+'/api/lists',{method:'POST',headers:{'Content-Type':'application/json',Cookie:cookie},body:JSON.stringify({document:doc('Persistent')})});
    await new Promise(resolve=>first.close(resolve));
    const next=createApp({dbPath:path});next.listen(0,'127.0.0.1');await once(next,'listening');
    const res=await fetch(`http://127.0.0.1:${next.address().port}/api/lists`,{headers:{Cookie:cookie}});
    assert.equal(res.status,200);assert.equal((await res.json())[0].document.listName,'Persistent');
    await new Promise(resolve=>next.close(resolve));
});
test('live SQLite backup restores accounts and lists on another server', async t => {
    const { execFileSync } = await import('node:child_process');
    const directory=mkdtempSync(join(tmpdir(),'buyme-backup-'));t.after(()=>rmSync(directory,{recursive:true,force:true}));
    const source=join(directory,'source.sqlite'), backup=join(directory,'backup.sqlite');
    const original=await start(t,source), user=await original.signup('backup_user');
    await original.call('/api/lists','POST',{document:doc('Portable list')},user.cookie);
    execFileSync(process.execPath,['scripts/backup.mjs',backup],{cwd:new URL('..',import.meta.url),env:{...process.env,BUYME_DB:source}});
    const restored=await start(t,backup);
    const lists=await restored.call('/api/lists','GET',undefined,user.cookie);
    assert.equal(lists.status,200);assert.equal(lists.body[0].document.listName,'Portable list');
});
