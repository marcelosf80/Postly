// public/js/local-store.js — LocalStorage wrapper for offline standalone mode

class LocalStore {
    constructor(key) {
        this.key = key;
        this._ensureReady();
    }

    _ensureReady() {
        if (!localStorage.getItem(this.key)) {
            localStorage.setItem(this.key, JSON.stringify([]));
        }
    }

    _read() {
        try {
            return JSON.parse(localStorage.getItem(this.key));
        } catch {
            return [];
        }
    }

    _write(data) {
        try {
            localStorage.setItem(this.key, JSON.stringify(data));
        } catch (e) {
            if (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED' || e.code === 22) {
                // If storage is full, remove oldest 5 posts and retry
                if (data.length > 5) {
                    console.warn('[STORAGE] Quota exceeded, removing oldest entries to free space...');
                    const newData = [...data];
                    newData.splice(0, 5); // Remove 5 oldest
                    try {
                        localStorage.setItem(this.key, JSON.stringify(newData));
                    } catch (retryError) {
                        // If still failing, keep removing until it works or 1 left
                        if (newData.length > 1) {
                            this._write(newData);
                        }
                    }
                } else {
                    console.error('[STORAGE] Critical Storage Full');
                }
            } else {
                throw e;
            }
        }
    }

    _generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    }

    findAll() {
        // Devuelve ordenado por mas reciente primero
        return this._read().sort((a,b) => new Date(b.created_at) - new Date(a.created_at));
    }

    findById(id) {
        return this._read().find(item => item.id === id) || null;
    }

    create(item) {
        const data = this._read();
        const newItem = {
            id: this._generateId(),
            ...item,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
        };
        data.push(newItem);
        this._write(data);
        return newItem;
    }

    update(id, updates) {
        const data = this._read();
        const index = data.findIndex(item => item.id === id);
        if (index === -1) return null;

        delete updates.id;
        delete updates.created_at;

        data[index] = {
            ...data[index],
            ...updates,
            updated_at: new Date().toISOString()
        };
        this._write(data);
        return data[index];
    }

    delete(id) {
        const data = this._read();
        const filtered = data.filter(item => item.id !== id);
        if (filtered.length === data.length) return false;
        this._write(filtered);
        return true;
    }
}

window.LocalPosts = new LocalStore('sp_offline_posts');
window.LocalUsers = new LocalStore('sp_offline_users');
