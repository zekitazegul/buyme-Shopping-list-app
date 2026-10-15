const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const {once}=require('node:events');
const fs=require('node:fs');
const {chromium}=require('playwright');
let browser,server,base;
before(async()=>{
    const {createApp}=await import('../server.mjs');server=createApp({dbPath:':memory:'});server.listen(0,'127.0.0.1');await once(server,'listening');base=`http://127.0.0.1:${server.address().port}`;
    browser=await chromium.launch({executablePath:process.env.BUYME_CHROMIUM||(fs.existsSync('/usr/bin/chromium')?'/usr/bin/chromium':undefined),headless:true,args:['--no-sandbox']});
});
after(async()=>{await browser?.close();if(server)await new Promise(resolve=>server.close(resolve));});
async function text(page,id,value){await page.waitForFunction(({id,value})=>document.getElementById(id).textContent.includes(value),{id,value},{timeout:10000}).catch(async error=>{throw Error(`${id}: expected ${value}; got ${await page.locator('#'+id).textContent()}`,{cause:error});});}
async function signup(page,name){
    await page.goto(base);await page.locator('#signupTab').click();await page.locator('#signupName').fill(name);await page.locator('#emailInput').fill(`${name}@example.com`);await page.locator('#passwordInput').fill('password-123');
    await page.waitForFunction(()=>!document.getElementById('signupButton').disabled);await page.locator('#signupButton').click();await page.locator('#shoppingScreen').waitFor({state:'visible'});
}
async function guest(page){await page.goto(base);await page.locator('#guestButton').click();}
async function addMarket(page,name){await page.locator('#addMarketButton').click();await page.locator('#marketNameInput').fill(name);await page.locator('#marketNameInput').press('Enter');}
async function addProduct(page,name){await page.locator('#productNameInput').fill(name);await page.locator('#productNameInput').press('Enter');}
async function openShare(page){await page.locator('#shareOpenButton').click();await page.locator('#shareDialog').waitFor({state:'visible'});}
async function closeDialog(page,id){await page.locator(`[data-close=${id}]`).click();}
async function listId(page){await page.waitForFunction(()=>Object.keys(localStorage).some(k=>k.startsWith('buymeData:user:')&&JSON.parse(localStorage.getItem(k)).listId));return page.evaluate(()=>JSON.parse(localStorage.getItem(Object.keys(localStorage).find(k=>k.startsWith('buymeData:user:')))).listId);}
test('local use survives API outages, preserves edits and safely displays names on mobile',async()=>{
    const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await page.route('**/api/**',route=>route.abort());
    await guest(page);await addMarket(page,'Lidl "<img src=x onerror=window.pwned=1>"');await addProduct(page,'Milk');
    for(const expected of ['Alındı','Bulunamadı','Alınacak']){await page.locator('.status-button').click();assert.equal(await page.locator('.status-button').textContent(),expected);}
    await page.locator('.product-name').click();await page.locator('.inline-edit input').fill('Bread "<script>"');await page.locator('.inline-edit input').press('Enter');
    await page.reload();await page.locator('#guestButton').click();assert.equal(await page.locator('.product-name').textContent(),'Bread "<script>"');assert.equal(await page.evaluate(()=>window.pwned),undefined);
    page.once('dialog',d=>d.dismiss());await page.locator('.delete-product').click();assert.equal(await page.locator('.product-item').count(),1);
    page.once('dialog',d=>d.accept());await page.locator('.delete-product').click();assert.equal(await page.locator('.product-item').count(),0);
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));assert.deepEqual(errors,[]);await context.close();
});
test('blocked browser storage reports the limitation and keeps in-memory use working',async()=>{
    const context=await browser.newContext(),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.addInitScript(()=>Object.defineProperty(window,'localStorage',{get(){throw new DOMException('Blocked','SecurityError');}}));
    await guest(page);await addMarket(page,'Local');await addProduct(page,'Eggs');assert(await page.locator('#storageWarning').isVisible());assert.equal(await page.locator('.product-item').count(),1);assert.deepEqual(errors,[]);await context.close();
});
test('email accounts persist login, share with saved contacts and protect conflicting edits',async()=>{
    const a=await browser.newContext(),b=await browser.newContext(),owner=await a.newPage(),member=await b.newPage(),errors=[];
    owner.on('pageerror',e=>errors.push(e.message));member.on('pageerror',e=>errors.push(e.message));
    await signup(owner,'browser_owner');await signup(member,'browser_member');
    await owner.locator('.market-choice').filter({hasText:'Lidl'}).click();await addProduct(owner,'Milk');await text(owner,'syncStatus','Liste güncel');const id=await listId(owner);
    await owner.locator('.list-details summary').click();await owner.locator('#listNameInput').fill('Weekly shared');await owner.locator('#saveListNameButton').click();
    await text(owner,'listNameStatus','Liste adı bu cihaza kaydedildi');assert.equal(await owner.locator('#sharedListSelect option:checked').textContent(),'Weekly shared');await text(owner,'syncStatus','Liste güncel');
    await openShare(owner);await owner.locator('#recipientInput').fill('browser_member@example.com');await owner.locator('#recipientName').fill('Ayşe');await owner.locator('#inviteButton').click();await text(owner,'shareStatus','Ayşe ile paylaşıldı');
    assert.equal(await owner.locator('.contact-chip strong').textContent(),'Ayşe');await closeDialog(owner,'shareDialog');
    await member.locator('#reloadListButton').click();await member.locator(`#sharedListSelect option[value="${id}"]`).waitFor({state:'attached'});await member.locator('#sharedListSelect').selectOption(id);await text(member,'syncStatus','Liste güncel');assert.equal(await member.locator('.product-name').textContent(),'Milk');
    await member.locator('.status-button').click();await text(member,'syncStatus','Liste güncel');
    await owner.locator('.product-name').click();await owner.locator('.inline-edit input').fill('Local pending');await owner.locator('.inline-edit input').press('Enter');await text(owner,'syncStatus','Başka bir kişi');
    let event=owner.waitForEvent('dialog');await owner.locator('#reloadListButton').click();await(await event).dismiss();assert.equal(await owner.locator('.product-name').textContent(),'Local pending');
    event=owner.waitForEvent('dialog');await owner.locator('#reloadListButton').click();await(await event).accept();await text(owner,'syncStatus','Liste güncel');assert.equal(await owner.locator('.product-name').textContent(),'Milk');assert.equal(await owner.locator('.status-button').textContent(),'Alındı');
    await owner.reload();await owner.locator('#shoppingScreen').waitFor({state:'visible'});assert(await owner.locator('#authScreen').isHidden());assert.equal(await owner.locator('#listNameInput').inputValue(),'Weekly shared');assert.equal(await owner.locator('#sharedListSelect option:checked').textContent(),'Weekly shared');await openShare(owner);await owner.locator('#recipientInput').fill('Ayşe');assert.equal(await owner.locator('.contact-chip strong').textContent(),'Ayşe');await owner.locator('#inviteButton').click();await text(owner,'shareStatus','Ayşe ile paylaşıldı');await closeDialog(owner,'shareDialog');
    await member.locator('#settingsButton').click();await member.locator('#logoutButton').click();await member.locator('#authScreen').waitFor({state:'visible'});assert.equal(await member.locator('.product-item').count(),0);
    await member.locator('#emailInput').fill('browser_member@example.com');await member.locator('#passwordInput').fill('password-123');await member.locator('#loginButton').click();await member.locator('#shoppingScreen').waitFor({state:'visible'});await member.locator('.product-name').waitFor();assert.equal(await member.locator('.product-name').textContent(),'Milk');
    assert.deepEqual(errors,[]);await a.close();await b.close();
});
test('search, filters, unnamed lists, market switching and bulk clearing work together',async()=>{
    const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage();await guest(page);
    assert.equal(await page.locator('#locationInput').count(),0);assert(await page.locator('#itemsSection').isHidden());await page.locator('.market-choice').filter({hasText:'Lidl'}).click();await addProduct(page,'Milk');await addProduct(page,'Bread');
    assert.equal(await page.locator('#listNameInput').inputValue(),'');await page.locator('.product-item').filter({hasText:'Milk'}).locator('.status-button').click();await text(page,'progressText','2 üründen 1');
    await page.locator('#statusFilter').selectOption('pending');assert.equal(await page.locator('.product-name').textContent(),'Bread');await page.locator('#statusFilter').selectOption('all');await page.locator('#productSearch').fill('MILK');assert.equal(await page.locator('.product-name').textContent(),'Milk');
    await page.locator('#productSearch').fill('missing');assert.match(await page.locator('.empty-message').textContent(),/Eşleşen/);await page.locator('#productSearch').fill('');
    page.once('dialog',d=>d.accept());await page.locator('#clearPurchasedButton').click();assert.equal(await page.locator('.product-name').textContent(),'Bread');
    await page.locator('.market-choice').filter({hasText:'Aldi'}).click();await addProduct(page,'Apples');await page.locator('.market-choice').filter({hasText:'Lidl'}).click();assert.equal(await page.locator('.product-name').textContent(),'Bread');
    await page.locator('.list-details summary').click();await page.locator('#listNameInput').fill('Weekend');await page.locator('#saveListNameButton').click();await page.reload();await page.locator('#guestButton').click();assert.equal(await page.locator('#listNameInput').inputValue(),'Weekend');await context.close();
});
test('all languages, settings, dialogs and preferences update live and survive reload',async()=>{
    const context=await browser.newContext({viewport:{width:390,height:844}}),page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(e.message));await guest(page);await addMarket(page,'Market');await addProduct(page,'Milk');
    for(const [language,title,pending,deletion] of [['en','What do we need?','Pending','Delete Milk?'],['nl','Wat hebben we nodig?','Te kopen','Milk verwijderen?'],['tr','Neler alıyoruz?','Alınacak','Milk silinsin mi?']]){
        await page.locator('#languageSelect').selectOption(language);assert.equal(await page.locator('html').getAttribute('lang'),language);assert.equal(await page.locator('#shoppingScreen h1').textContent(),title);assert.equal(await page.locator('.status-button').textContent(),pending);
        const event=page.waitForEvent('dialog');const click=page.locator('.delete-product').click();const dialog=await event;assert.equal(dialog.message(),deletion);await dialog.dismiss();await click;
    }
    await page.locator('#languageSelect').selectOption('nl');await page.locator('#settingsButton').click();assert.equal(await page.locator('#settingsDialog h2').textContent(),'Instellingen');await page.locator('#themeSelect').selectOption('dark');await page.locator('#accentSelect').selectOption('rose');await page.locator('#sizeSelect').selectOption('large');await closeDialog(page,'settingsDialog');
    assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.reload();await page.locator('#guestButton').click();assert.equal(await page.locator('#languageSelect').inputValue(),'nl');assert.equal(await page.locator('html').getAttribute('data-theme'),'dark');assert.equal(await page.locator('html').getAttribute('data-accent'),'rose');assert.equal(await page.locator('html').getAttribute('data-size'),'large');assert.deepEqual(errors,[]);await context.close();
});
test('missing language script leaves readable labels and safe recovery instructions',async()=>{
    const context=await browser.newContext(),page=await context.newPage();
    await page.route('**/i18n.js',route=>route.abort());await page.goto(base);
    assert.equal(await page.locator('#loginButton').textContent(),'Giriş yap');
    assert.equal(await page.locator('#emailLabel').textContent(),'E-posta veya eski kullanıcı adı');
    assert.match(await page.locator('#startupNotice').textContent(),/sunucuyu yeniden başlat/);
    assert(await page.locator('#startupNotice').isVisible());
    assert.equal(await page.locator('main').evaluate(el=>el.inert),true);
    await context.close();
});
