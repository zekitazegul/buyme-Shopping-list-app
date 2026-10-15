/* Pure data/storage code, shared by the browser and Node tests. */
(function (root) {
    'use strict';
    const statuses = ['pending', 'purchased', 'not_found'];
    const id = () => globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const text = (value, fallback = '') => typeof value === 'string' ? value : fallback;
    const uniqueId = (value, used) => {
        let result = typeof value === 'string' || typeof value === 'number' ? String(value) : id();
        if (!result || used.has(result)) result = id();
        used.add(result); return result;
    };
    function normalize(raw = {}) {
        if (!raw || typeof raw !== 'object') raw = {};
        const marketIds = new Set(), productIds = new Set();
        return {
            listId: text(raw.listId), legacyListId: text(raw.legacyListId),
            username: text(raw.username), owner: text(raw.owner), ownerId: text(raw.ownerId),
            version: Number.isSafeInteger(raw.version) && raw.version >= 0 ? raw.version : 0,
            dirty: raw.dirty === true, listName: text(raw.listName).trim(),
            location: text(raw.location), members: Array.isArray(raw.members)
                ? [...new Set(raw.members.filter(m => typeof m === 'string' && m.trim()))] : [],
            markets: (Array.isArray(raw.markets) ? raw.markets : []).filter(m => m && typeof m === 'object').map(m => ({
                id: uniqueId(m.id, marketIds), name: text(m.name, 'Unnamed Market'),
                products: (Array.isArray(m.products) ? m.products : []).filter(p => p && typeof p === 'object').map(p => ({
                    id: uniqueId(p.id, productIds), name: text(p.name, 'Unnamed Product'),
                    status: statuses.includes(p.status) ? p.status : 'pending'
                }))
            }))
        };
    }
    const documentOf = data => ({ listName: data.listName, location: data.location, markets: data.markets });
    class Storage {
        constructor(storage, onError = () => {}) { this.storage = storage; this.onError = onError; }
        key(userId) { return userId ? `buymeData:user:${userId}` : 'buymeData'; }
        load(userId) {
            let raw;
            try {
                raw = this.storage.getItem(this.key(userId));
                const data = normalize(raw ? JSON.parse(raw) : {});
                if (!userId && data.listId) {
                    data.legacyListId = data.listId; data.listId = ''; data.ownerId = ''; data.dirty = false;
                }
                return data;
            } catch (error) {
                if (raw) {
                    try { this.storage.setItem(`${this.key(userId)}:corrupt:${Date.now()}`, raw); } catch { /* Keep original key. */ }
                }
                this.onError(error); return normalize();
            }
        }
        save(data, userId) {
            try { this.storage.setItem(this.key(userId), JSON.stringify(data)); return true; }
            catch (error) { this.onError(error); return false; }
        }
    }
    const searchText = value => String(value).normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replaceAll('ı', 'i');
    const api = { searchText, normalize, documentOf, Storage, createId: id, statuses };
    if (typeof module !== 'undefined') module.exports = api;
    root.BuyMeCore = api;
})(globalThis);
