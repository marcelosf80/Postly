// public/mobile/js/api.js — Hybrid API Client for Postly (Server-Ready)

const GROQ_API_KEY = "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";

// Auto-configurar URL de backend si estamos en Android nativo (Capacitor)
if (window.Capacitor && (window.Capacitor.getPlatform() === 'android' || window.Capacitor.getPlatform() === 'ios')) {
    window.API_BASE_URL = "https://marketing-4778.onrender.com";
    console.log("[API] Detectado entorno Nativo. Usando backend: " + window.API_BASE_URL);
} else if (!window.API_BASE_URL && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
    // Si estamos en web pero no es localhost, usar el mismo host como base
    window.API_BASE_URL = window.location.origin;
}

const API = {
    // === Auth & Token Management ===
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

    /**
     * Generic Request Handler (replaces standard fetch for server calls)
     */
    async request(endpoint, options = {}) {
        const base = window.API_BASE_URL || '';
        if (!base && !endpoint.startsWith('http')) {
            console.warn(`[API] Llamando a ${endpoint} en modo Standalone (sin base URL).`);
        }

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
            const body = (options.body && !(options.body instanceof FormData)) 
                ? JSON.stringify(options.body) 
                : options.body;

            const response = await fetch(`${base}${endpoint}`, {
                ...options,
                body,
                headers
            });

            if (response.status === 401) {
                console.warn("[API] Sesión expirada o inválida (401).");
                if (!window.location.href.includes('login.html') && !window.location.href.includes('index.html')) {
                    this.clearAuth();
                    window.location.href = './index.html';
                }
                return;
            }

            const contentType = response.headers.get("content-type");
            if (contentType && contentType.indexOf("application/json") === -1) {
                const text = await response.text();
                console.error(`[API] Respuesta no-JSON de ${endpoint}:`, text.substring(0, 100));
                throw new Error("El servidor devolvió un error inesperado (HTML). Probablemente el servicio está caído.");
            }

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || `Error ${response.status}`);
            }

            return data;
        } catch (error) {
            console.error(`[API] Error en petición ${endpoint}:`, error.message);
            throw error;
        }
    },

    // Helper: Convert File to Blob for FormData
    async _prepareFile(file) {
        if (typeof file === 'string' && file.startsWith('data:image')) {
            const res = await fetch(file);
            return await res.blob();
        }
        return file;
    },

    // === Auth ===
    async login(email, password) {
        if (!window.API_BASE_URL) {
            // Mock login for offline mode
            const user = { id: 'local123', name: 'Usuario Offline', email, plan: 'pro' };
            return { token: 'mock-offline-token', user };
        }
        return this.request('/api/auth/login', {
            method: 'POST',
            body: { email, password }
        });
    },

    async register(data) {
        return this.request('/api/auth/register', {
            method: 'POST',
            body: data
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

    // === Posts ===
    async getPosts(params = {}) {
        if (!window.API_BASE_URL) return { posts: window.LocalPosts.findAll() };
        
        const query = new URLSearchParams(params).toString();
        return this.request(`/api/posts${query ? '?' + query : ''}`);
    },

    async getPostStats() {
        if (!window.API_BASE_URL) {
             const posts = window.LocalPosts.findAll();
             return { total: posts.length, published: posts.filter(p => p.status === 'published').length };
        }
        return this.request('/api/posts/stats');
    },

    async getPost(id) {
        if (!window.API_BASE_URL) return { post: window.LocalPosts.findById(id) };
        return this.request(`/api/posts/${id}`);
    },

    async createPost(data) {
        if (!window.API_BASE_URL) {
            // Guardado local (Legacy/Standalone)
            let postData = {
                platform: data.platform || 'instagram',
                content: data.content || '',
                status: 'draft'
            };
            const post = window.LocalPosts.create(postData);
            return { post };
        }
        
        return this.request('/api/posts', {
            method: 'POST',
            body: data
        });
    },

    async updatePost(id, formData) {
        if (!window.API_BASE_URL) return { post: window.LocalPosts.update(id, { content: formData.get('content') }) };
        
        return this.request(`/api/posts/${id}`, {
            method: 'PUT',
            body: formData
        });
    },

    async deletePost(id) {
        if (!window.API_BASE_URL) {
            window.LocalPosts.delete(id);
            return { success: true };
        }
        return this.request(`/api/posts/${id}`, { method: 'DELETE' });
    },

    /**
     * PUBLICAR POST
     * Ahora llama al servidor para publicación real en Meta/Instagram
     */
    async publishPost(id) {
        if (!window.API_BASE_URL) {
            // Fallback a menú compartir si no hay servidor
            return this._publishFallbackShare(id);
        }

        console.log(`[API] Solicitando publicación real de post ${id} al servidor...`);
        return this.request(`/api/posts/${id}/publish`, { method: 'POST' });
    },

    async _publishFallbackShare(id) {
        const post = window.LocalPosts.findById(id);
        if (!post) throw new Error("Post no encontrado");

        if (navigator.share) {
            await navigator.share({ title: 'Publicar Postly', text: post.content });
            return { success: true, method: 'web-share' };
        }
        alert("Modo Offline: Copia el texto manualmente.");
        return { success: true, method: 'none' };
    },

    async schedulePost(id, scheduled_at) {
        if (!window.API_BASE_URL) {
            const post = window.LocalPosts.update(id, { status: 'scheduled', scheduled_at });
            return { success: true, post };
        }
        return this.request(`/api/posts/${id}/schedule`, {
            method: 'POST',
            body: JSON.stringify({ scheduled_at })
        });
    },

    // === AI (Hybrid: Direct or Server) ===
    async _fetchGroq(prompt) {
        try {
            const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${GROQ_API_KEY}`
                },
                body: JSON.stringify({
                    model: "llama-3.1-8b-instant",
                    messages: [{ role: "user", content: prompt }],
                    temperature: 0.7,
                    max_completion_tokens: 300
                })
            });
            const data = await response.json();
            return data.choices[0].message.content;
        } catch (e) {
            throw new Error(`Error de IA: ${e.message}`);
        }
    },

    async generateCaption(description, options = {}) {
        if (window.API_BASE_URL) {
            return this.request('/api/ai/caption', {
                method: 'POST',
                body: JSON.stringify({ description, ...options })
            });
        }
        const prompt = `Genera una caption para redes sociales sobre: "${description}"`;
        const text = await this._fetchGroq(prompt);
        return { caption: text };
    },

    async generateVisualPrompt(description) {
        if (window.API_BASE_URL) {
            return this.request('/api/ai/visual-prompt', {
                method: 'POST',
                body: JSON.stringify({ description })
            });
        }
        const prompt = `Genera un prompt detallado en inglés para Midjourney basado en esta idea: "${description}". Incluye estilo de cámara, iluminación, paleta de colores y resolución.`;
        const text = await this._fetchGroq(prompt);
        return { visualPrompt: text, isManual: true, masterPrompt: prompt };
    },

    async generateFlyerPrompt(category, details) {
        if (window.API_BASE_URL) {
            return this.request('/api/ai/flyer-prompt', {
                method: 'POST',
                body: JSON.stringify({ category, details })
            });
        }
        
        // Prompts maestros basados en la documentación
        const styles = {
            'Gym': 'aggressively lit fitness center, high contrast, neon accents, dramatic shadows, cinematic lighting, 8k resolution',
            'Inmobiliaria': 'luxury real estate photography, bright natural sunlight, modern interior design, wide angle lens, photorealistic',
            'Belleza': 'soft studio lighting, beauty photography, pastel color palette, glowing skin, shallow depth of field, elegant',
            'Gastronomia': 'food photography, dark moody background, directional lighting highlighting textures, appetizing, 4k macro',
            'Ropa': 'fashion editorial, streetwear style, dynamic pose, urban background, film grain, vivid colors',
            'Cursos': 'professional corporate portrait, modern office background, bright and optimistic lighting, clean design',
            'Eventos': 'concert photography, laser lights, energetic crowd, motion blur, vibrant colors, epic scale',
            'Veterinaria': 'cute pet photography, bright and cheerful, colorful toys, soft lighting, sharp focus on eyes'
        };
        
        const style = styles[category] || 'professional photography, high quality, 8k';
        const prompt = `Professional flyer design background for ${category}, ${details}, ${style}, empty space for text overlay, no text, no letters, clean composition, high quality --ar 4:5 --v 6.0`;
        
        return { 
            flyerPrompt: `Prompt generado para ${category}. Haz click en "Generar Imagen" para crear el fondo del flyer.`, 
            isManual: false, 
            masterPrompt: prompt 
        };
    },

    async generateHashtags(topic) {
        if (window.API_BASE_URL) {
            return this.request('/api/ai/hashtags', {
                method: 'POST',
                body: JSON.stringify({ topic })
            });
        }
        const text = await this._fetchGroq(`Genera 15 hashtags relevantes para: "${topic}"`);
        return { hashtags: text };
    },

    async generateIdeas(topic) {
        if (window.API_BASE_URL) {
            return this.request('/api/ai/ideas', {
                method: 'POST',
                body: JSON.stringify({ topic })
            });
        }
        const text = await this._fetchGroq(`Dame 3 ideas creativas de contenido para redes sociales sobre: "${topic}"`);
        return { ideas: text };
    },

    async improveText(text) {
        if (window.API_BASE_URL) {
            return this.request('/api/ai/improve', {
                method: 'POST',
                body: JSON.stringify({ text })
            });
        }
        const improved = await this._fetchGroq(`Mejora y humaniza este texto para redes sociales, hazlo más atractivo: "${text}"`);
        return { improved: improved };
    },

    async generateImage(prompt) {
        // Pollinations AI funciona bien directo en frontend
        const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1080&height=1080&nologo=true`;
        const response = await fetch(url);
        const blob = await response.blob();
        
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result); // Base64
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    },

    async generateAIContent(prompt, imageBase64 = null) {
        if (window.API_BASE_URL) {
            try {
                return await this.request('/api/ai/generate', {
                    method: 'POST',
                    body: JSON.stringify({ prompt, image: imageBase64 })
                });
            } catch (e) {
                console.warn("[API] Fallback a IA local (Groq) por error en servidor:", e.message);
            }
        }
        // Fallback to Groq if no server or server fails
        const text = await this._fetchGroq(prompt + (imageBase64 ? " (Contexto: El usuario ha subido una imagen para este post)" : ""));
        return { content: text };
    },

    // === Admin ===
    async getAdminStats() { return this.request('/api/admin/stats'); },
    async getAdminUsers(params = {}) { 
        const query = new URLSearchParams(params).toString();
        return this.request(`/api/admin/users${query ? '?' + query : ''}`); 
    },

    async updateAdminUser(id, data) {
        return this.request(`/api/admin/users/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        });
    },

    async deleteAdminUser(id) {
        return this.request(`/api/admin/users/${id}`, {
            method: 'DELETE'
        });
    },

    // === Ads & Activation ===
    async verifyAdReward() {
        return this.request('/api/ads/verify-reward', {
            method: 'POST',
            body: { ad_unit_id: "ca-app-pub-5343221992536229/3520448384" }
        });
    }
};
