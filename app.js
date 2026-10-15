'use strict';
const { normalize, documentOf, Storage, createId, statuses } = window.BuyMeCore;
const $ = id => document.getElementById(id);
let browserStorage;
try { browserStorage = window.localStorage; }
catch { browserStorage = { getItem() { throw new Error('Storage blocked'); }, setItem() { throw new Error('Storage blocked'); } }; }
const storage = new Storage(browserStorage, () => {
    $('storageWarning').hidden = false;
});
let data = storage.load(), user = null, cloud = null, cloudLists = [];
let epoch = 0, generation = 0, saving = false, saveTimer, blocked = false, cloudReady = false, authBusy = false;
cloud = new window.BuyMeCloud();
let searchQuery = "", statusFilter = "all";

function announceSession() { try { browserStorage.setItem('buyme:session', String(Date.now())); } catch { /* The session cookie still works. */ } }
function message(text, error = false) {
    $('appStatus').textContent = text;
    $('appStatus').classList.toggle('error', error);
}
function cloudError(error) {
    if (error?.code === 'CONFLICT') return 'Another member changed this list. Your changes are kept on this device. Export them before loading the latest shared list.';
    if (error?.code === 'SERVER_UNAVAILABLE') return 'Sharing server is unavailable. Local lists still work. Start the Node server as described in the README.';
    return 'Cloud action failed. Your local changes are kept. Check your connection and try again.';
}
function persist() { storage.save(data, user?.id); }
function changed() {
    generation++;
    data.dirty = Boolean(user && data.listId);
    persist(); render();
    if (data.dirty) {
        $('syncStatus').textContent = 'Changes saved on this device; waiting to sync.';
        clearTimeout(saveTimer); saveTimer = setTimeout(sync, 200);
    }
}
async function sync() {
    if (!cloud || !cloudReady || !user || !data.listId || !data.dirty || saving || blocked) return;
    const sessionEpoch = epoch, listId = data.listId;
    saving = true;
    try {
        while (data.dirty && sessionEpoch === epoch && data.listId === listId) {
            const sentGeneration = generation;
            const snapshot = JSON.parse(JSON.stringify(documentOf(data)));
            $('syncStatus').textContent = 'Syncing…';
            const record = await cloud.save(listId, data.version, snapshot);
            if (sessionEpoch !== epoch || data.listId !== listId) return;
            data.version = record.version;
            data.dirty = generation !== sentGeneration;
            persist();
        }
        if (sessionEpoch === epoch) $('syncStatus').textContent = 'Shared list is up to date.';
    } catch (error) {
        if (sessionEpoch === epoch) {
            blocked = error.code === 'CONFLICT';
            $('syncStatus').textContent = cloudError(error);
        }
    } finally {
        if (sessionEpoch === epoch) saving = false;
    }
}
function button(label, action, className = '') {
    const b = document.createElement('button'); b.type = 'button'; b.textContent = label;
    b.className = className; b.addEventListener('click', action); return b;
}
function textElement(tag, text, className = '') {
    const el = document.createElement(tag); el.textContent = text; el.className = className; return el;
}
function renameRow(element, original, save) {
    const input = document.createElement('input'); input.value = original; input.maxLength = 200;
    input.setAttribute('aria-label', 'New name');
    const row = document.createElement('div'); row.className = 'inline-edit';
    const commit = () => { const value = input.value.trim(); if (value) save(value); else input.focus(); };
    row.append(input, button('Save', commit), button('Cancel', render)); element.replaceWith(row);
    input.addEventListener('keydown', event => {
        if (event.key === 'Enter') { event.preventDefault(); commit(); }
        if (event.key === 'Escape') { event.preventDefault(); render(); }
    });
    input.focus(); input.select();
}
function render() {
    for (const [id, value] of [['usernameInput', data.username], ['listNameInput', data.listName], ['locationInput', data.location]]) {
        if (document.activeElement !== $(id)) $(id).value = value;
    }
    $('usernameDisplay').textContent = data.username ? `User: ${data.username}` : '';
    $('listOwnerDisplay').textContent = data.owner ? `Owner: ${data.owner}` : '';
    $('locationDisplay').textContent = data.location ? `Location: ${data.location}` : '';
    $('logoutButton').hidden = !user;
    $('loginButton').disabled = !cloud.available || authBusy || Boolean(user);
    $('signupButton').disabled = !cloud.available || authBusy || Boolean(user);
    $('emailInput').disabled = Boolean(user) || authBusy;
    $('passwordInput').disabled = Boolean(user) || authBusy;
    $('saveUsernameButton').disabled = authBusy;
    $('shareButton').disabled = !cloudReady || !user || Boolean(data.listId) || authBusy;
    $('sharedListSelect').disabled = !cloudReady || !user || authBusy;
    $('newLocalButton').disabled = authBusy || saving;
    $('inviteButton').hidden = !(user && cloudReady && data.listId && data.ownerId === user.id);
    $('membersContainer').replaceChildren();
    for (const member of data.members) {
        const row = textElement('div', '', 'member-item');
        row.append(textElement('span', member), textElement('span', member === data.owner ? 'Owner' : 'Member', 'member-role'));
        $('membersContainer').append(row);
    }
    if (!data.members.length) $('membersContainer').append(textElement('p', data.listId ? 'No members loaded.' : 'Local list. Share it after signing in to invite members.', 'empty-message'));
    const products = data.markets.flatMap(m => m.products);
    const purchased = products.filter(p => p.status === 'purchased').length;
    $('progressText').textContent = `${purchased} of ${products.length} purchased`;
    $('shoppingProgress').max = products.length || 1;
    $('shoppingProgress').value = purchased;
    $('clearPurchasedButton').disabled = !purchased;
    renderMarkets();
}
function renderMarkets() {
    $('marketsContainer').replaceChildren();
    if (!data.markets.length) $('marketsContainer').append(textElement('p', 'No markets added yet.', 'empty-markets'));
    let matchingMarkets = 0;
    for (const market of data.markets) {
        const visibleProducts = market.products.filter(p =>
            (statusFilter === 'all' || p.status === statusFilter) &&
            (!searchQuery || `${market.name} ${p.name}`.toLocaleLowerCase().includes(searchQuery)));
        if ((searchQuery || statusFilter !== 'all') && !visibleProducts.length) continue;
        matchingMarkets++;
        const box = textElement('section', '', 'market'); box.dataset.marketId = market.id;
        const header = textElement('div', '', 'market-header');
        const name = button(`Market: ${market.name}`, () => renameRow(name, market.name, value => { market.name = value; changed(); }), 'market-name');
        header.append(name, button('Delete', () => {
            if (confirm(`Delete "${market.name}" and its ${market.products.length} product(s)?`)) {
                data.markets = data.markets.filter(m => m.id !== market.id); changed();
            }
        }, 'delete-market'));
        const list = textElement('ul', '', 'product-list');
        if (!market.products.length) list.append(textElement('li', 'No products yet.', 'empty-message'));
        for (const product of visibleProducts) {
            const row = textElement('li', '', 'product-item'); row.dataset.productId = product.id;
            const css = product.status === 'purchased' ? 'purchased' : product.status === 'not_found' ? 'not-found' : '';
            const label = product.status === 'purchased' ? 'Purchased' : product.status === 'not_found' ? 'Not found' : 'Pending';
            const status = button(label, () => { product.status = statuses[(statuses.indexOf(product.status) + 1) % statuses.length]; changed(); }, `status-button ${css}`);
            status.setAttribute('aria-label', `Change status of ${product.name}: ${label}`);
            const title = button(product.name, () => renameRow(title, product.name, value => { product.name = value; changed(); }), `product-name ${css}`);
            title.title = 'Edit product';
            row.append(status, title, button('Delete', () => {
                if (confirm(`Delete "${product.name}"?`)) { market.products = market.products.filter(p => p.id !== product.id); changed(); }
            }, 'delete-product')); list.append(row);
        }
        const add = textElement('form', '', 'add-product-row');
        const input = document.createElement('input'); input.placeholder = 'Add product…'; input.maxLength = 200;
        input.setAttribute('aria-label', `Add product to ${market.name}`);
        const submit = button('+ Add', () => {}); submit.type = 'submit';
        add.append(input, submit);
        add.addEventListener('submit', event => {
            event.preventDefault(); const name = input.value.trim(); if (!name) return input.focus();
            market.products.push({ id: createId(), name, status: 'pending' }); changed();
            const replacement = [...$('marketsContainer').querySelectorAll('.market')].find(m => m.dataset.marketId === market.id);
            replacement?.querySelector('.add-product-row input')?.focus();
        });
        box.append(header, list, add); $('marketsContainer').append(box);
    }
    if (data.markets.length && !matchingMarkets) $('marketsContainer').append(textElement('p', 'No matching products. Try another search or filter.', 'empty-markets'));
}
$('productSearch').addEventListener('input', event => { searchQuery = event.target.value.trim().toLocaleLowerCase(); renderMarkets(); });
for (const filter of document.querySelectorAll('[data-filter]')) filter.addEventListener('click', () => {
    statusFilter = filter.dataset.filter;
    for (const item of document.querySelectorAll('[data-filter]')) item.setAttribute('aria-pressed', String(item === filter));
    renderMarkets();
});
$('clearPurchasedButton').addEventListener('click', () => {
    if (!confirm('Remove all purchased products from this list?')) return;
    for (const market of data.markets) market.products = market.products.filter(p => p.status !== 'purchased');
    changed();
});
function guard(action) {
    return async (...args) => {
        try { await action(...args); }
        catch (error) { message(cloudError(error), true); }
    };
}
async function refreshLists() {
    const sessionEpoch = epoch;
    const lists = await cloud.lists();
    if (sessionEpoch !== epoch) return;
    cloudLists = lists;
    $('sharedListSelect').replaceChildren(new Option('Choose a shared list…', ''));
    for (const list of lists) $('sharedListSelect').append(new Option(list.document.listName || 'Shopping list', list.id));
    $('sharedListSelect').value = data.listId;
}
async function openList(id, discard = false) {
    if (!id) return;
    if (data.dirty && !discard && !confirm('Replace your unsynced local changes? Export a backup first if you want to keep them.')) return;
    const sessionEpoch = epoch, localGeneration = generation;
    const record = await cloud.list(id), members = await cloud.members(id);
    if (sessionEpoch !== epoch) return;
    if (localGeneration !== generation) { message('You edited this list while loading. Your changes were kept; choose the shared list again when ready.', true); return; }
    data = normalize({ ...record.document, listId: record.id, version: record.version, ownerId: record.owner_id,
        username: data.username, owner: members.find(m => m.role === 'owner')?.username || '', members: members.map(m => m.username) });
    generation++; blocked = false; persist(); render();
    $('sharedListSelect').value = data.listId;
    $('syncStatus').textContent = 'Shared list is up to date.';
}
async function transition(session) {
    const nextUser = session?.user || null;
    if (nextUser?.id === user?.id && Boolean(nextUser) === Boolean(user)) { render(); return; }
    epoch++; clearTimeout(saveTimer); saving = false; blocked = false; cloudReady = false;
    user = nextUser; data = storage.load(user?.id); cloudLists = [];
    $('sharedListSelect').replaceChildren(new Option('Choose a shared list…', ''));
    $('passwordInput').value = '';
    $('authStatus').textContent = user ? `Signed in: ${user.username}` : 'Local mode. Sign in only if you want to share lists.';
    $('syncStatus').textContent = ''; render();
    if (!user) return;
    const sessionEpoch = epoch;
    try {
        const profile = await cloud.profile(user);
        if (sessionEpoch !== epoch) return;
        data.username = profile.username; persist();
        await refreshLists(); if (sessionEpoch !== epoch) return;
        cloudReady = true;
        if (data.listId && !data.dirty) await openList(data.listId, true);
        else if (data.dirty) $('syncStatus').textContent = 'Unsynced changes recovered on this device. Retry sync or export a backup.';
        message('Signed in. Choose a shared list, or share your current local list.'); render();
    } catch (error) { if (sessionEpoch === epoch) { message(cloudError(error), true); render(); } }
}
async function authenticate(signup) {
    if (!cloud.available || authBusy) return;
    const email = $('emailInput').value.trim(), password = $('passwordInput').value;
    if (!email || !password) { $('authStatus').textContent = 'Please enter your account username and password.'; return; }
    if (signup && password.length < 8) { $('authStatus').textContent = 'Use a password with at least 8 characters.'; return; }
    authBusy = true; render(); $('authStatus').textContent = signup ? 'Creating account…' : 'Logging in…';
    try {
        const result = signup ? await cloud.signup(email, password) : await cloud.login(email, password);
        $('passwordInput').value = '';
        await transition({ user: result.user });
        announceSession();
    } catch (error) { $('authStatus').textContent = error.message || 'Sign-in failed. Please try again.'; }
    finally { authBusy = false; render(); }
}
$('loginButton').addEventListener('click', () => authenticate(false));
$('signupButton').addEventListener('click', () => authenticate(true));
$('passwordInput').addEventListener('keydown', event => { if (event.key === 'Enter') authenticate(false); });
$('logoutButton').addEventListener('click', guard(async () => {
    if (data.dirty && !confirm('Unsynced changes are kept on this device for this account. Log out?')) return;
    await cloud.logout();
    announceSession();
    await transition(null); message('Logged out. Your local list is shown.');
}));
$('saveUsernameButton').addEventListener('click', guard(async () => {
    const name = $('usernameInput').value.trim();
    if (name.length < 2 || name.length > 40) return message('Use a name with 2–40 characters.', true);
    if (user) {
        const sessionEpoch = epoch;
        const profile = await cloud.rename(user, name); if (sessionEpoch !== epoch) return;
        user = profile; $('authStatus').textContent = `Signed in: ${profile.username}`;
    }
    const previousName = data.username;
    data.username = user?.username || name;
    if (data.listId && user?.id === data.ownerId) data.owner = data.username;
    data.members = data.members.map(member => member === previousName ? data.username : member);
    if (!data.listId) { data.owner = name; data.members = [name]; }
    persist(); render(); message('Username saved.');
}));
for (const [input, buttonId, field] of [['listNameInput', 'saveListNameButton', 'listName'], ['locationInput', 'saveLocationButton', 'location']]) {
    const save = () => { const value = $(input).value.trim(); if (!value && field === 'listName') return message('Please enter a list name.', true); data[field] = value; changed(); };
    $(buttonId).addEventListener('click', save);
    $(input).addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); save(); } });
}
$('usernameInput').addEventListener('keydown', e => { if (e.key === 'Enter') $('saveUsernameButton').click(); });
$('addMarketButton').addEventListener('click', () => { $('addMarketForm').hidden = false; $('addMarketButton').hidden = true; $('marketNameInput').focus(); });
function cancelMarket() { $('addMarketForm').hidden = true; $('addMarketButton').hidden = false; $('marketNameInput').value = ''; }
$('cancelMarketButton').addEventListener('click', cancelMarket);
$('addMarketForm').addEventListener('submit', event => {
    event.preventDefault(); const name = $('marketNameInput').value.trim(); if (!name) return;
    data.markets.push({ id: createId(), name, products: [] }); cancelMarket(); changed();
});
$('marketNameInput').addEventListener('keydown', e => { if (e.key === 'Escape') cancelMarket(); });
$('inviteButton').addEventListener('click', guard(async () => {
    const name = prompt('Enter the BuyMe username of an already registered person to add to this list:');
    if (!name?.trim()) return;
    if (data.dirty) { await sync(); if (data.dirty) return message('Sync or export your pending edits before adding a member.', true); }
    await cloud.invite(data.listId, name.trim()); await openList(data.listId, true);
    message('Member added. They can select this list after signing in.');
}));
$('shareButton').addEventListener('click', guard(async () => {
    if (!cloudReady || !user || data.listId || authBusy) return;
    authBusy = true; render(); const sessionEpoch = epoch;
    try {
        const record = await cloud.create(documentOf(data));
        if (sessionEpoch !== epoch) return;
        // Keep edits made while the request was in flight; sync them afterwards.
        data.listId = record.id; data.ownerId = record.owner_id; data.version = record.version;
        data.owner = data.username; data.members = [data.username]; data.dirty = true;
        persist(); await refreshLists(); await sync(); render();
    } finally { authBusy = false; render(); }
}));
$('sharedListSelect').addEventListener('change', guard(async event => {
    const selected = event.target.value;
    if (!selected) return;
    if (saving) { $('sharedListSelect').value = data.listId; return message('Wait for the current sync before switching lists.'); }
    if (!data.listId && data.markets.length && !confirm('Your current local list stays saved only until you switch. Export it first if you want a backup. Open shared list?')) {
        $('sharedListSelect').value = data.listId; return;
    }
    await openList(selected);
    $('sharedListSelect').value = data.listId;
}));
$('newLocalButton').addEventListener('click', () => {
    if (!confirm('Start a new local list? Export a backup first if needed. Shared lists remain in the cloud.')) return;
    epoch++; clearTimeout(saveTimer); blocked = false;
    data = normalize({ username: data.username, owner: data.username, members: data.username ? [data.username] : [] });
    generation++; persist(); render(); $('sharedListSelect').value = ''; $('syncStatus').textContent = '';
});
$('retrySyncButton').addEventListener('click', guard(async () => {
    if (!cloudReady && user) { const session = { user }; user = null; await transition(session); }
    if (blocked) return message('Export your local changes, then use Load latest to resolve the conflict.', true);
    await sync(); if (user && cloudReady) await refreshLists();
}));
$('reloadListButton').addEventListener('click', guard(async () => {
    if (!user || !cloudReady || saving) return;
    await refreshLists(); if (data.listId) await openList(data.listId);
}));
$('exportButton').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob), a = document.createElement('a');
    a.href = url; a.download = 'buyme-list.json'; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
});
$('importInput').addEventListener('change', guard(async event => {
    const file = event.target.files[0]; event.target.value = '';
    if (!file) return;
    if (file.size > 1000000) return message('Backup is too large (maximum 1 MB).', true);
    const sessionEpoch = epoch, localGeneration = generation;
    let imported;
    try { imported = normalize(JSON.parse(await file.text())); }
    catch { return message('This file is not a valid JSON backup.', true); }
    if (sessionEpoch !== epoch || generation !== localGeneration) return message('The list changed while reading the backup. Please try again.', true);
    if (!confirm('Import this backup as a new local list? Export your current list first if needed.')) return;
    data = normalize({ ...documentOf(imported), username: data.username, owner: data.username,
        members: data.username ? [data.username] : [] });
    epoch++; generation++; blocked = false; clearTimeout(saveTimer); saving = false;
    persist(); render(); $('sharedListSelect').value = ''; $('syncStatus').textContent = ''; message('Backup imported as a local list.');
}));
window.addEventListener('online', () => sync());
window.addEventListener('storage', event => {
    if (event.key === storage.key(user?.id)) message('This list changed in another tab. Export unsynced edits before refreshing.', true);
});
async function poll() {
    if (!user || !cloudReady || !data.listId || data.dirty || saving || document.hidden || $('addMarketForm').hidden === false) return;
    if (['INPUT', 'SELECT'].includes(document.activeElement?.tagName) || document.querySelector('.inline-edit')) return;
    const sessionEpoch = epoch, listId = data.listId, revision = data.version, localGeneration = generation;
    try {
        const record = await cloud.list(listId);
        if (sessionEpoch !== epoch || data.listId !== listId || data.dirty || generation !== localGeneration) return;
        if (record.version !== revision) await openList(listId);
        else {
            const members = await cloud.members(listId);
            if (sessionEpoch !== epoch || data.listId !== listId || data.dirty || generation !== localGeneration) return;
            const names = members.map(member => member.username);
            const owner = members.find(member => member.role === 'owner')?.username || '';
            if (JSON.stringify(names) !== JSON.stringify(data.members) || owner !== data.owner) {
                data.members = names; data.owner = owner; persist(); render();
            }
        }
    } catch { $('syncStatus').textContent = 'Connection unavailable. Local editing is still available.'; }
}
render();
cloud.session().then(transition).catch(() => {
    $('authStatus').textContent = 'Local mode. To share lists, run the BuyMe server (see README).'; render();
});
window.addEventListener('storage', event => {
    if (event.key === 'buyme:session') cloud.session().then(transition).catch(() => {});
});
setInterval(poll, 10000);
