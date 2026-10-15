const { test } = require('node:test');
const assert = require('node:assert/strict');
const { normalize, Storage } = require('../core.js');

test('legacy data is normalized without losing valid names or statuses', () => {
    const data = normalize({ listName: 'Weekly', markets: [null, { id: 1, name: 'A', products: [
        { id: 'x', name: 'Milk', status: 'purchased' }, { id: 'x', name: '<img src=x>', status: 'bad' }, null
    ] }, { id: 1, name: 'B', products: [] }] });
    assert.equal(data.listName, 'Weekly'); assert.equal(data.markets.length, 2);
    assert.notEqual(data.markets[0].id, data.markets[1].id);
    assert.notEqual(data.markets[0].products[0].id, data.markets[0].products[1].id);
    assert.equal(data.markets[0].products[0].status, 'purchased');
    assert.equal(data.markets[0].products[1].status, 'pending');
    assert.equal(data.markets[0].products[1].name, '<img src=x>');
});
test('guest and account caches remain isolated; old remote IDs are not reused', () => {
    const values = new Map([['buymeData', JSON.stringify({ listId: 'legacy-id', listName: 'Guest' })]]);
    const store = new Storage({ getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) });
    const guest = store.load(); assert.equal(guest.listId, ''); assert.equal(guest.legacyListId, 'legacy-id');
    store.save(normalize({ listName: 'Alice', dirty: true }), 'alice');
    assert.equal(store.load('alice').listName, 'Alice'); assert.equal(store.load('alice').dirty, true);
    assert.equal(store.load('bob').listName, 'My Shopping List'); assert.equal(store.load().listName, 'Guest');
});
test('corrupt or inaccessible storage does not prevent local use', () => {
    let errors = 0; const values = new Map([['buymeData', '{bad']]);
    const storage = new Storage({ getItem: key => values.get(key), setItem: (key, value) => values.set(key, value) }, () => errors++);
    assert.equal(storage.load().listName, 'My Shopping List'); assert.equal(errors, 1);
    assert([...values.keys()].some(key => key.startsWith('buymeData:corrupt:')));
    const denied = new Storage({ getItem() { throw Error(); }, setItem() { throw Error(); } }, () => errors++);
    assert.equal(denied.load().markets.length, 0); assert.equal(denied.save(normalize()), false); assert.equal(errors, 3);
});
