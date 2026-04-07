// data/store.js — JSON File Data Store
const fs = require('fs');
const path = require('path');

class JsonStore {
    constructor(filename) {
        this.filepath = path.join(__dirname, filename);
        this._ensureFile();
    }

    _ensureFile() {
        const dir = path.dirname(this.filepath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        if (!fs.existsSync(this.filepath)) {
            fs.writeFileSync(this.filepath, '[]', 'utf8');
        }
    }

    _read() {
        try {
            const raw = fs.readFileSync(this.filepath, 'utf8');
            return JSON.parse(raw);
        } catch {
            return [];
        }
    }

    _write(data) {
        fs.writeFileSync(this.filepath, JSON.stringify(data, null, 2), 'utf8');
    }

    _generateId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2, 8);
    }

    // === CRUD ===

    findAll(filter = null) {
        const data = this._read();
        if (!filter) return data;
        return data.filter(item => {
            return Object.keys(filter).every(key => item[key] === filter[key]);
        });
    }

    findById(id) {
        return this._read().find(item => item.id === id) || null;
    }

    findOne(filter) {
        const data = this._read();
        return data.find(item => {
            return Object.keys(filter).every(key => item[key] === filter[key]);
        }) || null;
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

        // Don't allow overwriting id or created_at
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

    count(filter = null) {
        return this.findAll(filter).length;
    }
}

// Pre-configured stores
const users = new JsonStore('users.json');
const posts = new JsonStore('posts.json');
const payments = new JsonStore('payments.json');

module.exports = { JsonStore, users, posts, payments };
