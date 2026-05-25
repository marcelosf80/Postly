// Postly V2 — Web API Client
if (window.Capacitor && (window.Capacitor.getPlatform() === 'android' || window.Capacitor.getPlatform() === 'ios')) {
    // URL de producción en Render
    window.API_BASE_URL = "https://marketing-4778.onrender.com";
} else {
    // Para la web (localhost, ngrok, render, etc.), usar el origen actual automáticamente
    window.API_BASE_URL = window.location.origin;
}

const API = {
    getToken: () => localStorage.getItem('token') || localStorage.getItem('sp_token'),
    getUser: () => JSON.parse(localStorage.getItem('user') || localStorage.getItem('sp_user') || '{}'),
    
    setAuth(token, user) {
        localStorage.setItem('token', token);
        localStorage.setItem('sp_token', token);
        localStorage.setItem('user', JSON.stringify(user));
        localStorage.setItem('sp_user', JSON.stringify(user));
    },

    clearAuth() {
        localStorage.removeItem('token');
        localStorage.removeItem('sp_token');
        localStorage.removeItem('user');
        localStorage.removeItem('sp_user');
    },

    async request(endpoint, options = {}) {
        const base = window.API_BASE_URL || '';
        const token = this.getToken();
        const headers = { ...options.headers };

        if (token) headers['Authorization'] = `Bearer ${token}`;
        if (!(options.body instanceof FormData)) headers['Content-Type'] = 'application/json';

        const body = (options.body && !(options.body instanceof FormData) && typeof options.body !== 'string') 
            ? JSON.stringify(options.body) 
            : options.body;

        try {
            const response = await fetch(`${base}${endpoint}`, { ...options, body, headers });
            
            if (response.status === 401) {
                this.clearAuth();
                if (!window.location.href.includes('login.html')) window.location.href = './index.html';
                return;
            }

            const data = await response.json();
            if (!response.ok) throw new Error(data.error || `Error ${response.status}`);
            return data;
        } catch (error) {
            console.error(`[API Error] ${endpoint}:`, error.message);
            throw error;
        }
    },

    // === AUTH ===
    async login(email, password) {
        return this.request('/api/auth/login', {
            method: 'POST',
            body: { email, password }
        });
    },

    async getProfile() {
        return this.request('/api/auth/me');
    },

    async updateProfile(data) {
        return this.request('/api/auth/profile', {
            method: 'PUT',
            body: data
        });
    },

    // === POSTS ===
    async getPosts() { return this.request('/api/posts'); },
    async getPostStats() { return this.request('/api/posts/stats'); },
    async getPost(id) { return this.request(`/api/posts/${id}`); },
    async createPost(data) {
        return this.request('/api/posts', {
            method: 'POST',
            body: data
        });
    },
    
    async updatePost(id, data) {
        return this.request(`/api/posts/${id}`, {
            method: 'PUT',
            body: data
        });
    },

    async deletePost(id) {
        return this.request(`/api/posts/${id}`, {
            method: 'DELETE'
        });
    },

    async publishPost(postId) {
        return this.request(`/api/posts/${postId}/publish`, {
            method: 'POST'
        });
    },

    async schedulePost(id, scheduled_at) {
        return this.request(`/api/posts/${id}/schedule`, {
            method: 'POST',
            body: { scheduled_at }
        });
    },

    // === AI (Hybrid) ===
    async generateCaption(description, options = {}) {
        return this.request('/api/ai/caption', {
            method: 'POST',
            body: { description, ...options }
        });
    },

    async generateFlyer(data, images = []) {
        return this.request('/api/ai/flyer', {
            method: 'POST',
            body: { data, images }
        });
    },

    async generateHashtags(description) {
        return this.request('/api/ai/hashtags', {
            method: 'POST',
            body: { description }
        });
    },

    async generateIdeas(industry) {
        return this.request('/api/ai/ideas', {
            method: 'POST',
            body: { industry }
        });
    },

    async improveText(text) {
        return this.request('/api/ai/improve', {
            method: 'POST',
            body: { text }
        });
    },

    async generateImage(prompt) {
        return this.request('/api/ai/generate-image', {
            method: 'POST',
            body: { prompt }
        });
    },

    // === ADS ===
    async verifyAdReward() {
        return this.request('/api/ads/verify-reward', {
            method: 'POST',
            body: {}
        });
    }
};

window.API = API;
