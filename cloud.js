/* Optional same-origin backend; no external service or browser SDK is required. */
(function (root) {
    'use strict';
    class Cloud {
        constructor() { this.available = false; }
        async request(path, method = 'GET', body) {
            let response;
            try {
                response = await fetch(`/api${path}`, { method, credentials: 'same-origin',
                    headers: { 'Content-Type': 'application/json' },
                    ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
            } catch { throw Object.assign(new Error('Connection unavailable'), { code: 'NETWORK' }); }
            let result;
            try { result = await response.json(); }
            catch { throw Object.assign(new Error('Sharing server is not available'), { code: 'SERVER_UNAVAILABLE' }); }
            if (!response.ok) throw Object.assign(new Error(result.error || 'Request failed'), { code: result.code, status: response.status });
            return result;
        }
        async session() { const result = await this.request('/session'); this.available = true; return result; }
        login(email, password) { return this.request('/login', 'POST', { email, password }); }
        signup(email, password, name) { return this.request('/signup', 'POST', { email, password, name }); }
        logout() { return this.request('/logout', 'POST', {}); }
        profile(user) { return Promise.resolve(user); }
        rename(profile) { return this.request('/profile', 'PATCH', profile); }
        contacts() { return this.request('/contacts'); }
        lists() { return this.request('/lists'); }
        list(id) { return this.request(`/lists/${encodeURIComponent(id)}`); }
        members(id) { return this.request(`/lists/${encodeURIComponent(id)}/members`); }
        create(document) { return this.request('/lists', 'POST', { document }); }
        save(id, version, document) { return this.request(`/lists/${encodeURIComponent(id)}`, 'PUT', { version, document }); }
        invite(id, recipient) { return this.request(`/lists/${encodeURIComponent(id)}/members`, 'POST', recipient); }
    }
    root.BuyMeCloud = Cloud;
})(globalThis);
