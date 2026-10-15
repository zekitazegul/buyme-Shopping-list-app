const { test, before, after } = require('node:test');
const assert = require('node:assert/strict');
const { once } = require('node:events');
const fs = require('node:fs');
const { chromium } = require('playwright');
let browser, server, base;
before(async () => {
    const { createApp } = await import('../server.mjs');
    server=createApp({dbPath:':memory:'});server.listen(0,'127.0.0.1');await once(server,'listening');
    base=`http://127.0.0.1:${server.address().port}`;
    const executablePath=process.env.BUYME_CHROMIUM || (fs.existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined);
    browser=await chromium.launch({executablePath,headless:true,args:['--no-sandbox']});
});
after(async () => { await browser?.close(); if(server)await new Promise(resolve=>server.close(resolve)); });
async function waitText(page,id,text) { await page.waitForFunction(({id,text})=>document.getElementById(id).textContent.includes(text),{id,text}); }
async function signup(page,name) {
    await page.goto(base);await page.locator('.settings-panel summary').click();await page.locator('#signupButton').waitFor({state:'visible'});
    await page.waitForFunction(()=>!document.getElementById('signupButton').disabled);
    await page.locator('#emailInput').fill(name);await page.locator('#passwordInput').fill('password-123');
    await page.locator('#signupButton').click();await waitText(page,'authStatus',`Signed in: ${name}`);
    await page.waitForFunction(()=>!document.getElementById('shareButton').disabled);
}
async function addMarket(page,name) {
    await page.locator('#addMarketButton').click();await page.locator('#marketNameInput').fill(name);await page.locator('#marketNameInput').press('Enter');
}
async function addProduct(page,name) {
    await page.locator('.add-product-row input').first().fill(name);await page.locator('.add-product-row input').first().press('Enter');
}
test('local mode works offline, retains edits, safely displays markup and fits mobile',async()=>{
    const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage();const errors=[];
    page.on('pageerror',e=>errors.push(e.message));await page.route('**/api/**',route=>route.abort());
    await page.goto(base);await addMarket(page,'Lidl "<img src=x onerror=window.pwned=1>"');await addProduct(page,'Milk');
    await page.locator('.status-button').click();assert.equal(await page.locator('.status-button').textContent(),'Purchased');
    await page.locator('.status-button').click();assert.equal(await page.locator('.status-button').textContent(),'Not found');
    await page.locator('.status-button').click();assert.equal(await page.locator('.status-button').textContent(),'Pending');
    await page.locator('.product-name').click();await page.locator('.inline-edit input').fill('Bread "<script>"');await page.locator('.inline-edit input').press('Enter');
    await page.reload();assert.equal(await page.locator('.product-name').textContent(),'Bread "<script>"');
    assert.equal(await page.locator('img,script:not([src])').count(),0);assert.equal(await page.evaluate(()=>window.pwned),undefined);
    page.once('dialog',d=>d.dismiss());await page.locator('.delete-product').click();assert.equal(await page.locator('.product-item').count(),1);
    page.once('dialog',d=>d.accept());await page.locator('.delete-product').click();assert.equal(await page.locator('.product-item').count(),0);
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth));assert.deepEqual(errors,[]);
    await context.close();
});
test('denied localStorage shows warning but adding a local list still works',async()=>{
    const context=await browser.newContext(),page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw new DOMException('Blocked','SecurityError');}}));
    await page.goto(base);await addMarket(page,'Local');await addProduct(page,'Eggs');
    assert.equal(await page.locator('#storageWarning').isVisible(),true);assert.equal(await page.locator('.product-item').count(),1);assert.deepEqual(errors,[]);
    await context.close();
});
test('two accounts share changes, protect conflicts and clear private list after logout',async()=>{
    const a=await browser.newContext(),b=await browser.newContext();const owner=await a.newPage(),member=await b.newPage();
    const errors=[];owner.on('pageerror',e=>errors.push(e.message));member.on('pageerror',e=>errors.push(e.message));
    await signup(owner,'browser_owner');await addMarket(owner,'AH');await addProduct(owner,'Milk');
    await owner.locator('#shareButton').click();await waitText(owner,'syncStatus','up to date');
    const id=await owner.evaluate(()=>JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k=>k.startsWith('buymeData:user:')))).listId);
    await signup(member,'browser_member');
    owner.once('dialog',d=>d.accept('browser_member'));await owner.locator('#inviteButton').click();await waitText(owner,'appStatus','Member added');
    await member.locator('#reloadListButton').click();await member.locator(`#sharedListSelect option[value="${id}"]`).waitFor({state:'attached'});
    await member.locator('#sharedListSelect').selectOption(id);await waitText(member,'syncStatus','up to date');
    assert.equal(await member.locator('.product-name').textContent(),'Milk');assert.equal(await member.locator('#inviteButton').isVisible(),false);
    await member.locator('.status-button').click();await waitText(member,'syncStatus','up to date');
    // Owner has an older version. Its local change must not overwrite the member's change.
    await owner.locator('.product-name').click();await owner.locator('.inline-edit input').fill('Local pending');await owner.locator('.inline-edit input').press('Enter');
    await waitText(owner,'syncStatus','Another member changed');
    assert.equal(await owner.locator('.product-name').textContent(),'Local pending');
    let dialogEvent=owner.waitForEvent('dialog');await owner.locator('#reloadListButton').click();await (await dialogEvent).dismiss();
    assert.equal(await owner.locator('.product-name').textContent(),'Local pending');
    dialogEvent=owner.waitForEvent('dialog');await owner.locator('#reloadListButton').click();await (await dialogEvent).accept();await waitText(owner,'syncStatus','up to date');
    assert.equal(await owner.locator('.product-name').textContent(),'Milk');assert.equal(await owner.locator('.status-button').textContent(),'Purchased');
    await member.locator('#logoutButton').click();await waitText(member,'authStatus','Local mode');
    assert.equal(await member.locator('.market').count(),0);assert.equal(await owner.locator('.market').count(),1);assert.deepEqual(errors,[]);
    await a.close();await b.close();
});
test('search, status filters, progress and clearing purchased products work together',async()=>{
    const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage();
    await page.goto(base);await addMarket(page,'Lidl');await addProduct(page,'Milk');await addProduct(page,'Bread');
    await page.locator('.status-button').first().click();assert.equal(await page.locator('#progressText').textContent(),'1 of 2 purchased');
    await page.locator('[data-filter=pending]').click();assert.equal(await page.locator('.product-name').textContent(),'Bread');
    await page.locator('[data-filter=all]').click();await page.locator('#productSearch').fill('MILK');assert.equal(await page.locator('.product-name').textContent(),'Milk');
    await page.locator('#productSearch').fill('missing');assert.match(await page.locator('.empty-markets').textContent(),/No matching/);
    await page.locator('#productSearch').fill('');page.once('dialog',d=>d.accept());await page.locator('#clearPurchasedButton').click();
    assert.equal(await page.locator('.product-name').textContent(),'Bread');assert.equal(await page.locator('#progressText').textContent(),'0 of 1 purchased');
    await page.reload();assert.equal(await page.locator('.product-name').textContent(),'Bread');
    await context.close();
});
