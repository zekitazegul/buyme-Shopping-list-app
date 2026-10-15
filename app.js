'use strict';
const { normalize, documentOf, Storage, createId, statuses, searchText } = window.BuyMeCore;
const i18n = window.BuyMeI18n, t = (key, values) => i18n.t(key, values);
const $ = id => document.getElementById(id);
let browserStorage;
try { browserStorage = window.localStorage; }
catch { browserStorage = { getItem() { throw Error('Storage blocked'); }, setItem() { throw Error('Storage blocked'); } }; }
const storage = new Storage(browserStorage, () => { $('storageWarning').hidden = false; });
const preferences = { language: 'tr', theme: 'light', accent: 'purple', size: 'normal' };
try { const saved = JSON.parse(browserStorage.getItem('buymePreferences') || '{}'); for (const key of Object.keys(preferences)) if (typeof saved[key] === 'string') preferences[key] = saved[key]; } catch { /* Defaults remain usable. */ }
let data = storage.load(), user = null, cloudLists = [], contacts = [];
const cloud = new window.BuyMeCloud();
let epoch = 0, generation = 0, saving = false, creating = null, saveTimer, blocked = false, cloudReady = false, authBusy = false;
let searchQuery = '', statusFilter = 'all', activeMarket = '', guestMode = false, signupMode = false;
const messages = new Map();
function status(id, key, values = {}, error = false) {
    messages.set(id, { key, values, error });
    $(id).textContent = key ? t(key, values) : '';
    $(id).classList.toggle('error', error);
}
function errorKey(error) {
    if (i18n.catalog[error?.message]) return error.message;
    if (i18n.catalog[error?.code]) return error.code;
    return 'Connection error';
}
function fail(error, id = 'appStatus') { status(id, errorKey(error), {}, true); }
function guard(action, id) { return async (...args) => { try { await action(...args); } catch (error) { fail(error, id); } }; }
function persist() { return storage.save(data, user?.id); }
function announceSession() { try { browserStorage.setItem('buyme:session', String(Date.now())); } catch { /* Cookie works without browser storage. */ } }
function savePreferences() { try { browserStorage.setItem('buymePreferences', JSON.stringify(preferences)); } catch { $('storageWarning').hidden = false; } }
function applyPreferences() {
    i18n.setLanguage(preferences.language); preferences.language = i18n.language;
    document.documentElement.lang = i18n.language;
    document.documentElement.dataset.theme = ['light','dark','system'].includes(preferences.theme) ? preferences.theme : 'light';
    document.documentElement.dataset.accent = ['purple','green','blue','rose'].includes(preferences.accent) ? preferences.accent : 'purple';
    document.documentElement.dataset.size = preferences.size === 'large' ? 'large' : 'normal';
    for (const el of document.querySelectorAll('[data-i18n]')) el.textContent = t(el.dataset.i18n);
    for (const el of document.querySelectorAll('[data-i18n-placeholder]')) el.placeholder = t(el.dataset.i18nPlaceholder);
    for (const el of document.querySelectorAll('[data-i18n-aria]')) el.setAttribute('aria-label', t(el.dataset.i18nAria));
    $('languageSelect').setAttribute('aria-label', t('Language'));
    for (const [id,key] of [['languageSelect','language'],['themeSelect','theme'],['accentSelect','accent'],['sizeSelect','size']]) $(id).value = preferences[key];
    for (const [id, msg] of messages) status(id, msg.key, msg.values, msg.error);
    renderListOptions(); render();
}
function button(label, action, className = '') {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = label;
    b.className = className; b.addEventListener('click', action); return b;
}
function textElement(tag, text, className = '') { const el = document.createElement(tag); el.textContent = text; el.className = className; return el; }
function listTitle(record) { return record.listName && record.listName !== 'My Shopping List' ? record.listName : record.markets.map(m => m.name).join(' · ') || t('Shopping list'); }
function selectedMarket() { return data.markets.find(m => m.id === activeMarket); }
function changed() {
    generation++; data.dirty = Boolean(user); const saved = persist(); render();
    if (user) {
        status('syncStatus', 'Waiting to sync');
        clearTimeout(saveTimer); saveTimer = setTimeout(() => saveToAccount().catch(fail), 250);
    }
    return saved;
}
async function ensureList() {
    if (!user || !cloudReady) throw Object.assign(Error(), { code: 'UNAUTHORIZED' });
    if (data.listId) return;
    if (creating) return creating;
    const sessionEpoch = epoch;
    const task = (async () => {
        const record = await cloud.create(documentOf(data));
        if (epoch !== sessionEpoch) return;
        data.listId = record.id; data.ownerId = user.id; data.owner = user.name; data.members = [user.name]; data.version = record.version;
        data.dirty = true; persist(); await refreshLists();
    })();
    creating = task; render();
    try { await task; } finally { if (creating === task) { creating = null; render(); } }
}
async function saveToAccount() {
    if (!user || !cloudReady) return;
    const sessionEpoch = epoch;
    await ensureList(); if (sessionEpoch !== epoch) return;
    await sync(); render();
}
async function sync() {
    if (!cloudReady || !user || !data.listId || !data.dirty || saving || blocked) return;
    const sessionEpoch = epoch, id = data.listId;
    saving = true;
    try {
        while (data.dirty && sessionEpoch === epoch && id === data.listId) {
            const sentGeneration = generation, snapshot = structuredClone(documentOf(data));
            status('syncStatus', 'Syncing');
            const record = await cloud.save(id, data.version, snapshot);
            if (sessionEpoch !== epoch || id !== data.listId) return;
            data.version = record.version; data.dirty = generation !== sentGeneration; persist();
            cloudLists = cloudLists.map(list => list.id === record.id ? record : list); renderListOptions();
        }
        if (sessionEpoch === epoch) status('syncStatus', 'Up to date');
    } catch (error) {
        if (sessionEpoch === epoch) { blocked = error.code === 'CONFLICT'; fail(error, 'syncStatus'); }
    } finally { if (sessionEpoch === epoch) { saving = false; render(); } }
}
function renameRow(element, original, save) {
    const input = document.createElement('input'); input.value = original; input.maxLength = 200; input.setAttribute('aria-label', t('New name'));
    const row = textElement('div', '', 'inline-edit');
    const commit = () => { const value = input.value.trim(); if (value) save(value); else input.focus(); };
    row.append(input, button(t('Save'), commit), button(t('Cancel'), render)); element.replaceWith(row);
    input.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); commit(); } if (e.key === 'Escape') render(); });
    input.focus(); input.select();
}
function render() {
    $('authScreen').hidden = Boolean(user) || guestMode;
    $('shoppingScreen').hidden = !user && !guestMode;
    $('accountSettings').hidden = !user;
    $('savedListsSection').hidden = !user && !data.markets.length;
    $('sharedListSelect').hidden = !user;
    $('reloadListButton').hidden = !user;
    $('signupNameRow').hidden = !signupMode;
    $('loginButton').hidden = signupMode; $('signupButton').hidden = !signupMode;
    $('loginTab').setAttribute('aria-pressed', String(!signupMode)); $('signupTab').setAttribute('aria-pressed', String(signupMode));
    $('passwordInput').autocomplete = signupMode ? 'new-password' : 'current-password';
    $('emailInput').type = signupMode ? 'email' : 'text';
    $('emailLabel').textContent = t(signupMode ? 'Email' : 'Email or old username');
    for (const id of ['loginButton','signupButton']) $(id).disabled = !cloud.available || authBusy;
    $('shareOpenButton').disabled = Boolean(creating);
    $('saveOnlineButton').hidden = !user || Boolean(data.listId);
    $('saveOnlineButton').disabled = !cloudReady || Boolean(creating);
    $('newLocalButton').disabled = Boolean(creating) || saving;
    $('sharedListSelect').disabled = !cloudReady;
    $('reloadListButton').disabled = !cloudReady || saving;
    $('retrySyncButton').hidden = !user || !data.dirty;
    $('greeting').textContent = user ? t('Hello {name}', { name: user.name }) : t('Local mode');
    $('accountEmail').textContent = user?.email || user?.username || '';
    $('legacyEmailRow').hidden = !user || Boolean(user.email);
    if (document.activeElement !== $('usernameInput')) $('usernameInput').value = user?.name || '';
    if (document.activeElement !== $('listNameInput')) $('listNameInput').value = data.listName === 'My Shopping List' ? '' : data.listName;
    $('listNameSummary').textContent = data.listName && data.listName !== 'My Shopping List' ? t('List name: {name}', { name: data.listName }) : t('Name your list (optional)');
    const market = selectedMarket(); if (!market) activeMarket = data.markets[0]?.id || '';
    renderMarketChoices(); renderProducts(); renderContacts(); renderMembers();
}
function renderMarketChoices() {
    const names = [...new Set([...data.markets.map(m => m.name), 'Albert Heijn', 'Lidl', 'Aldi', 'Jumbo', 'Dirk', 'Plus'])];
    $('marketChoices').replaceChildren();
    for (const name of names) {
        const existing = data.markets.find(m => m.name === name);
        const b = button(name, () => {
            if (existing) { activeMarket = existing.id; render(); }
            else { const market = { id: createId(), name, products: [] }; data.markets.push(market); activeMarket = market.id; changed(); }
            $('productNameInput').focus();
        }, 'market-choice');
        b.setAttribute('aria-pressed', String(existing?.id === activeMarket));
        $('marketChoices').append(b);
    }
}
function renderProducts() {
    const market = selectedMarket(); $('itemsSection').hidden = !market;
    $('marketsContainer').replaceChildren(); if (!market) return;
    $('activeMarketName').textContent = market.name;
    const allProducts = data.markets.flatMap(m => m.products), purchased = allProducts.filter(p => p.status === 'purchased').length;
    $('progressText').textContent = t('{done} of {total} purchased', { done: purchased, total: allProducts.length });
    $('shoppingProgress').max = allProducts.length || 1; $('shoppingProgress').value = purchased;
    $('clearPurchasedButton').disabled = !purchased;
    const products = market.products.filter(p => (statusFilter === 'all' || p.status === statusFilter) && (!searchQuery || searchText(p.name).includes(searchText(searchQuery))));
    const list = textElement('ul', '', 'product-list');
    if (!products.length) list.append(textElement('li', t(market.products.length ? 'No matching products' : 'No products yet'), 'empty-message'));
    for (const product of products) {
        const row = textElement('li', '', 'product-item'); row.dataset.productId = product.id;
        const key = product.status === 'purchased' ? 'Purchased' : product.status === 'not_found' ? 'Not found' : 'Pending';
        const statusButton = button(t(key), () => { product.status = statuses[(statuses.indexOf(product.status)+1)%statuses.length]; changed(); }, `status-button ${product.status}`);
        statusButton.setAttribute('aria-label', t('Change status of {name}: {status}', { name: product.name, status: t(key) }));
        const title = button(product.name, () => renameRow(title, product.name, value => { product.name = value; changed(); }), `product-name ${product.status}`); title.title = t('Edit product');
        row.append(statusButton, title, button(t('Delete'), () => { if (confirm(t('Delete {name}?', { name: product.name }))) { market.products = market.products.filter(p => p.id !== product.id); changed(); } }, 'delete-product'));
        list.append(row);
    }
    $('marketsContainer').append(list);
}
function renderMembers() {
    $('membersContainer').replaceChildren();
    for (const name of data.members) { const row = textElement('div', '', 'member-item'); row.append(textElement('span', name), textElement('span', t(name === data.owner ? 'Owner' : 'Member'), 'muted')); $('membersContainer').append(row); }
    if (!data.listId) $('membersContainer').append(textElement('p', t('Local list help'), 'muted'));
    $('inviteButton').disabled = !cloudReady || (Boolean(data.listId) && data.ownerId !== user?.id);
}
function renderContacts() {
    $('contactSuggestions').replaceChildren();
    const q = searchText($('recipientInput').value.trim());
    for (const person of contacts.filter(c => !q || searchText(`${c.name} ${c.email}`).includes(q))) {
        const b = button('', () => { $('recipientInput').value = person.email; $('recipientName').value = person.name; renderContacts(); }, 'contact-chip');
        b.append(textElement('strong', person.name), textElement('small', person.email)); $('contactSuggestions').append(b);
    }
}
function renderListOptions() {
    $('sharedListSelect').replaceChildren(new Option(t('Choose a list'), ''));
    for (const list of cloudLists) $('sharedListSelect').append(new Option(listTitle(list.document), list.id));
    $('sharedListSelect').value = data.listId;
}
async function refreshLists() {
    const sessionEpoch = epoch, lists = await cloud.lists();
    if (sessionEpoch !== epoch) return;
    cloudLists = lists; renderListOptions();
}
async function refreshContacts() { const sessionEpoch = epoch, result = await cloud.contacts(); if (sessionEpoch === epoch) { contacts = result; renderContacts(); } }
async function openList(id, discard = false) {
    if (!id) return;
    if (data.dirty && !discard && !confirm(t('Confirm replace'))) return;
    const sessionEpoch = epoch, localGeneration = generation;
    const record = await cloud.list(id), members = await cloud.members(id);
    if (sessionEpoch !== epoch) return;
    if (localGeneration !== generation) return status('appStatus', 'Changed while loading', {}, true);
    data = normalize({ ...record.document, listId: record.id, version: record.version, ownerId: record.owner_id, username: user.name,
        owner: members.find(m => m.role === 'owner')?.name || '', members: members.map(m => m.name) });
    status('listNameStatus', '');
    generation++; blocked = false; activeMarket = data.markets[0]?.id || ''; persist(); render(); renderListOptions(); status('syncStatus', 'Up to date');
}
async function transition(session) {
    const nextUser = session?.user || null;
    if (nextUser?.id === user?.id && Boolean(nextUser) === Boolean(user)) { render(); return; }
    epoch++; clearTimeout(saveTimer); saving = false; creating = null; blocked = false; cloudReady = false;
    user = nextUser; data = storage.load(user?.id); cloudLists = []; contacts = []; activeMarket = '';
    $('passwordInput').value = ''; $('recipientInput').value = ''; $('recipientName').value = '';
    for (const dialog of document.querySelectorAll('dialog[open]')) dialog.close();
    status('syncStatus', ''); status('listNameStatus', ''); renderListOptions(); render();
    if (!user) { signupMode = false; render(); return; }
    const sessionEpoch = epoch;
    try {
        data.username = user.name; persist();
        await refreshLists(); await refreshContacts(); if (sessionEpoch !== epoch) return;
        cloudReady = true;
        if (data.listId && !data.dirty) await openList(data.listId, true);
        else if (data.dirty) status('syncStatus', 'Recovered edits');
        else if (!data.markets.length && cloudLists.length) await openList(cloudLists[0].id, true);
        status('authStatus', 'Signed in'); render();
    } catch (error) { if (sessionEpoch === epoch) { fail(error); render(); } }
}
async function authenticate() {
    if (!cloud.available || authBusy) return;
    authBusy = true; render(); status('authStatus', signupMode ? 'Creating account' : 'Signing in');
    try {
        const email = $('emailInput').value.trim(), password = $('passwordInput').value;
        const result = signupMode ? await cloud.signup(email,password,$('signupName').value.trim()) : await cloud.login(email,password);
        await transition({ user: result.user }); announceSession(); status('appStatus', '');
    } catch (error) { fail(error, 'authStatus'); }
    finally { authBusy = false; render(); }
}
$('authForm').addEventListener('submit', e => { e.preventDefault(); authenticate(); });
$('loginTab').addEventListener('click', () => { signupMode = false; render(); });
$('signupTab').addEventListener('click', () => { signupMode = true; render(); });
$('guestButton').addEventListener('click', () => { guestMode = true; render(); });
$('logoutButton').addEventListener('click', guard(async () => {
    if (data.dirty && !confirm(t('Confirm logout'))) return;
    await cloud.logout(); guestMode = false; await transition(null); announceSession(); status('authStatus', 'Logged out');
}));
$('profileForm').addEventListener('submit', guard(async e => {
    e.preventDefault(); const sessionEpoch = epoch;
    const profile = { name: $('usernameInput').value.trim() };
    if (!user.email) { profile.email = $('profileEmail').value.trim(); profile.password = $('profilePassword').value; }
    const result = await cloud.rename(profile); if (sessionEpoch !== epoch) return;
    const previous = user.name; user = result; data.username = user.name;
    data.members = data.members.map(name => name === previous ? user.name : name); if (user.id === data.ownerId) data.owner = user.name;
    $('profilePassword').value = ''; persist(); render(); status('settingsStatus', 'Profile saved');
}, 'settingsStatus'));
$('saveListNameButton').addEventListener('click', () => {
    data.listName = $('listNameInput').value.trim(); const saved = changed();
    cloudLists = cloudLists.map(list => list.id === data.listId ? { ...list, document: { ...list.document, listName: data.listName } } : list);
    renderListOptions();
    status('listNameStatus', saved ? 'List name saved locally' : 'Storage warning', {}, !saved);
});
$('listNameInput').addEventListener('input', () => status('listNameStatus', ''));
$('listNameInput').addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); $('saveListNameButton').click(); } });
$('addMarketButton').addEventListener('click', () => { $('addMarketForm').hidden = false; $('marketNameInput').focus(); });
$('cancelMarketButton').addEventListener('click', () => { $('addMarketForm').hidden = true; $('marketNameInput').value = ''; });
$('addMarketForm').addEventListener('submit', e => {
    e.preventDefault(); const name = $('marketNameInput').value.trim(); if (!name) return;
    let market = data.markets.find(m => m.name.toLocaleLowerCase(i18n.language) === name.toLocaleLowerCase(i18n.language));
    if (!market) { market = { id: createId(), name, products: [] }; data.markets.push(market); }
    activeMarket = market.id; $('addMarketForm').hidden = true; $('marketNameInput').value = ''; changed(); $('productNameInput').focus();
});
$('productForm').addEventListener('submit', e => {
    e.preventDefault(); const market = selectedMarket(), name = $('productNameInput').value.trim(); if (!market || !name) return;
    market.products.unshift({ id: createId(), name, status: 'pending' });
    searchQuery = ''; statusFilter = 'all'; $('productSearch').value = ''; $('statusFilter').value = 'all';
    $('productNameInput').value = ''; changed(); $('marketsContainer').scrollTop = 0; $('productNameInput').focus();
});
$('renameMarketButton').addEventListener('click', () => { const market = selectedMarket(); const name = prompt(t('New name'),market.name); if (name?.trim() && name.trim().length <= 200) { market.name = name.trim(); changed(); } });
$('deleteMarketButton').addEventListener('click', () => { const market = selectedMarket(); if (confirm(t('Delete market {name} with {count} products?', { name: market.name, count: market.products.length }))) { data.markets = data.markets.filter(m => m.id !== market.id); activeMarket = ''; changed(); } });
$('productSearch').addEventListener('input', e => { searchQuery = e.target.value.trim(); renderProducts(); });
$('statusFilter').addEventListener('change', e => { statusFilter = e.target.value; renderProducts(); });
$('clearPurchasedButton').addEventListener('click', () => { if (!confirm(t('Clear purchased?'))) return; for (const market of data.markets) market.products = market.products.filter(p => p.status !== 'purchased'); changed(); });
$('shareOpenButton').addEventListener('click', guard(async () => {
    if (!user) { guestMode = false; render(); status('authStatus', 'Login to share'); return; }
    status('shareStatus', ''); $('shareDialog').showModal(); await refreshContacts();
}));
$('recipientInput').addEventListener('input', renderContacts);
$('shareForm').addEventListener('submit', guard(async e => {
    e.preventDefault(); if (!cloudReady || authBusy) return;
    const sessionEpoch = epoch, input = $('recipientInput').value.trim(); if (!input) return;
    const recipient = input.includes('@') ? { email: input } : { name: input };
    if ($('recipientName').value.trim()) recipient.alias = $('recipientName').value.trim();
    authBusy = true; $('inviteButton').disabled = true;
    try {
        if (data.listId && data.ownerId !== user.id) return status('shareStatus','Owner only',{},true);
        await saveToAccount(); if (sessionEpoch !== epoch) return;
        if (data.dirty) return status('shareStatus','Sync first',{},true);
        await cloud.invite(data.listId,recipient); if (sessionEpoch !== epoch) return;
        await openList(data.listId,true); await refreshContacts();
        const person = contacts.find(c => c.email?.toLowerCase() === input.toLowerCase() || c.name.toLowerCase() === input.toLowerCase());
        status('shareStatus','Shared with {name}', { name: person?.name || input });
    } catch (error) { if (sessionEpoch === epoch) fail(error,'shareStatus'); }
    finally { authBusy = false; render(); }
}, 'shareStatus'));
$('saveOnlineButton').addEventListener('click', guard(saveToAccount));
$('sharedListSelect').addEventListener('change', guard(async e => {
    const id = e.target.value; if (!id) return;
    if (saving || creating) { renderListOptions(); return status('appStatus','Wait for sync'); }
    if (!data.listId && data.markets.length && !confirm(t('Confirm switch'))) { renderListOptions(); return; }
    await openList(id); renderListOptions();
}));
$('newLocalButton').addEventListener('click', () => {
    if ((data.dirty || (!data.listId && data.markets.length)) && !confirm(t('Confirm new list'))) return;
    epoch++; clearTimeout(saveTimer); blocked = false; creating = null; saving = false;
    data = normalize({ username: user?.name || '' }); activeMarket = ''; generation++; persist(); render(); renderListOptions(); status('syncStatus','');
});
$('retrySyncButton').addEventListener('click', guard(async () => {
    if (!cloudReady && user) { const previous = user; user = null; await transition({user:previous}); }
    if (blocked) return status('appStatus','Resolve conflict',{},true);
    await saveToAccount();
}));
$('reloadListButton').addEventListener('click', guard(async () => { if (!cloudReady || saving) return; await refreshLists(); if (data.listId) await openList(data.listId); }));
$('settingsButton').addEventListener('click', () => $('settingsDialog').showModal());
for (const b of document.querySelectorAll('[data-close]')) b.addEventListener('click', () => $(b.dataset.close).close());
for (const [id,key] of [['languageSelect','language'],['themeSelect','theme'],['accentSelect','accent'],['sizeSelect','size']]) $(id).addEventListener('change', e => { preferences[key] = e.target.value; savePreferences(); applyPreferences(); });
$('exportButton').addEventListener('click', () => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(data,null,2)],{type:'application/json'})), a = document.createElement('a'); a.href = url; a.download = 'buyme-list.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url),1000);
});
$('importInput').addEventListener('change', guard(async e => {
    const file = e.target.files[0]; e.target.value = ''; if (!file) return;
    if (file.size > 1000000) return status('settingsStatus','Backup too large',{},true);
    const sessionEpoch = epoch, localGeneration = generation; let imported;
    try { const raw = JSON.parse(await file.text()); if (!raw || !Array.isArray(raw.markets)) throw Error(); imported = normalize(raw); } catch { return status('settingsStatus','Invalid backup',{},true); }
    if (sessionEpoch !== epoch || generation !== localGeneration) return status('appStatus','Changed while loading',{},true);
    if (!confirm(t('Confirm import'))) return;
    epoch++; generation++; clearTimeout(saveTimer); saving = false; creating = null; blocked = false;
    data = normalize({ ...documentOf(imported), username: user?.name || '' }); activeMarket = ''; guestMode = !user;
    persist(); render(); renderListOptions(); $('settingsDialog').close(); status('appStatus','Backup imported');
}));
async function poll() {
    if (document.hidden || authBusy) return;
    if (!cloud.available || !user) { try { await transition(await cloud.session()); } catch { /* Preserve local mode until connectivity returns. */ } return; }
    if (!cloudReady || data.dirty || saving || creating || ['INPUT','SELECT'].includes(document.activeElement?.tagName) || document.querySelector('.inline-edit')) return;
    const sessionEpoch = epoch, id = data.listId, revision = data.version, localGeneration = generation;
    try {
        await refreshLists(); if (!id) return;
        const record = await cloud.list(id); if (sessionEpoch !== epoch || id !== data.listId || data.dirty || generation !== localGeneration) return;
        if (record.version !== revision) await openList(id);
    } catch (error) { fail(error,'syncStatus'); }
}
window.addEventListener('online', () => { if (user && cloudReady) saveToAccount().catch(fail); else poll(); });
window.addEventListener('storage', e => { if (e.key === storage.key(user?.id)) status('appStatus','Other tab changed',{},true); if (e.key === 'buyme:session') cloud.session().then(transition).catch(() => {}); });
applyPreferences();
$('startupNotice').hidden = true;
document.querySelector('main').inert = false;
cloud.session().then(transition).catch(() => { status('authStatus','Server offline'); render(); });
setInterval(poll,10000);
