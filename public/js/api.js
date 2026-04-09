// public/js/api.js — Centralized API Client for Postly

const API = {
    base: '',

    getToken() {
        return localStorage.getItem('sp_token');
    },

    getUser() {
        try {
            return JSON.parse(localStorage.getItem('sp_user'));
        } catch {
            return null;
        }
    },

    setAuth(token, user) {
        localStorage.setItem('sp_token', token);
        localStorage.setItem('sp_user', JSON.stringify(user));
    },

    clearAuth() {
        localStorage.removeItem('sp_token');
        localStorage.removeItem('sp_user');
    },

    async request(endpoint, options = {}) {
        const token = this.getToken();
        const headers = { ...options.headers };

        if (token) {
            headers['Authorization'] = `Bearer ${token}`;
        }

        // Don't set Content-Type for FormData (multipart)
        if (!(options.body instanceof FormData)) {
            headers['Content-Type'] = 'application/json';
        }

        try {
            const response = await fetch(`${this.base}${endpoint}`, {
                ...options,
                headers
            });

            if (response.status === 401) {
                this.clearAuth();
                window.location.href = '/login';
                return;
            }

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `Error ${response.status}`);
            }

            return data;
        } catch (error) {
            if (error.message === 'Failed to fetch') {
                throw new Error('No se pudo conectar al servidor. Verificá tu conexión.');
            }
            throw error;
        }
    },

    // === Auth ===
    async login(email, password) {
        return this.request('/api/auth/login', {
            method: 'POST',
            body: JSON.stringify({ email, password })
        });
    },

    async register(data) {
        return this.request('/api/auth/register', {
            method: 'POST',
            body: JSON.stringify(data)
        });
    },

    async getProfile() {
        return this.request('/api/auth/me');
    },

    async updateProfile(data) {
        return this.request('/api/auth/profile', {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    },

    // === Posts ===
    async getPosts(params = {}) {
        const query = new URLSearchParams(params).toString();
        return this.request(`/api/posts${query ? '?' + query : ''}`);
    },

    async getPostStats() {
        return this.request('/api/posts/stats');
    },

    async getPost(id) {
        return this.request(`/api/posts/${id}`);
    },

    async createPost(formData) {
        return this.request('/api/posts', {
            method: 'POST',
            body: formData  // FormData for file upload
        });
    },

    async updatePost(id, formData) {
        return this.request(`/api/posts/${id}`, {
            method: 'PUT',
            body: formData
        });
    },

    async deletePost(id) {
        return this.request(`/api/posts/${id}`, { method: 'DELETE' });
    },

    async publishPost(id) {
        return this.request(`/api/posts/${id}/publish`, { method: 'POST' });
    },

    async schedulePost(id, scheduled_at) {
        return this.request(`/api/posts/${id}/schedule`, {
            method: 'POST',
            body: JSON.stringify({ scheduled_at })
        });
    },

    // === AI ===
    async generateCaption(description, options = {}) {
        return this.request('/api/ai/caption', {
            method: 'POST',
            body: JSON.stringify({ description, ...options })
        });
    },

    async generateHashtags(description, options = {}) {
        return this.request('/api/ai/hashtags', {
            method: 'POST',
            body: JSON.stringify({ description, ...options })
        });
    },

    async generateIdeas(industry, options = {}) {
        return this.request('/api/ai/ideas', {
            method: 'POST',
            body: JSON.stringify({ industry, ...options })
        });
    },

    async improveText(text, options = {}) {
        return this.request('/api/ai/improve', {
            method: 'POST',
            body: JSON.stringify({ text, ...options })
        });
    }
};
