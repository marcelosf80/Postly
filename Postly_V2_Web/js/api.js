// Postly V2 — Web API Client
const GROQ_API_KEY = "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";

// Auto-configurar URL de backend
if (window.Capacitor && (window.Capacitor.getPlatform() === 'android' || window.Capacitor.getPlatform() === 'ios')) {
    window.API_BASE_URL = "https://postly-z7cf.onrender.com";
} else {
    window.API_BASE_URL = window.location.origin.includes('localhost') 
        ? 'http://localhost:3002' 
        : 'https://postly-z7cf.onrender.com';
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

    // === POSTS ===
    async getPosts() { return this.request('/api/posts'); },
    async createPost(data) {
        return this.request('/api/posts', {
            method: 'POST',
            body: data
        });
    },

    // === AI (Hybrid) ===
    async _fetchGroq(prompt, system = "Eres un asistente experto.") {
        try {
            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${GROQ_API_KEY}`
                },
                body: JSON.stringify({
                    model: "llama-3.3-70b-versatile",
                    messages: [
                        { role: "system", content: system },
                        { role: "user", content: prompt }
                    ],
                    temperature: 0.7
                })
            });
            const data = await response.json();
            if (data.error) throw new Error(data.error.message);
            return data.choices[0].message.content;
        } catch (e) {
            throw new Error(`Error de IA: ${e.message}`);
        }
    },

    async generateCaption(description, options = {}) {
        if (window.API_BASE_URL) {
            return this.request('/api/ai/caption', {
                method: 'POST',
                body: { description, ...options }
            });
        }
        const res = await this._fetchGroq(`Genera un caption para: ${description}`);
        return { caption: res };
    },

    async generateFlyer(data, images = []) {
        if (window.API_BASE_URL) {
            return this.request('/api/ai/flyer', {
                method: 'POST',
                body: { data, images }
            });
        }
        throw new Error("El generador de flyers requiere conexión al servidor.");
    },

    async generateHashtags(description) {
        if (window.API_BASE_URL) {
            return this.request('/api/ai/hashtags', {
                method: 'POST',
                body: { description }
            });
        }
        const res = await this._fetchGroq(`Hashtags para: ${description}`);
        return { hashtags: res };
    },

    async generateIdeas(industry) {
        if (window.API_BASE_URL) {
            return this.request('/api/ai/ideas', {
                method: 'POST',
                body: { industry }
            });
        }
        const res = await this._fetchGroq(`Ideas para: ${industry}`);
        return { ideas: res };
    },

    async improveText(text) {
        if (window.API_BASE_URL) {
            return this.request('/api/ai/improve', {
                method: 'POST',
                body: { text }
            });
        }
        const improved = await this._fetchGroq(`Mejora este texto para redes sociales: "${text}"`);
        return { improved: improved };
    },

    async generateImage(prompt) {
        if (window.API_BASE_URL) {
            return this.request('/api/ai/generate-image', {
                method: 'POST',
                body: { prompt }
            });
        }
        // Fallback to Pollinations
        return `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true`;
    }
};

window.API = API;
