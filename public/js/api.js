// public/js/api.js — Standalone API Client for Postly (Offline Mode)

const GROQ_API_KEY = "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";

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

    // Helper: Convert and Resize File to Base64 to save locally
    _fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const MAX_WIDTH = 1080;
                    const MAX_HEIGHT = 1080;
                    let width = img.width;
                    let height = img.height;

                    if (width > height) {
                        if (width > MAX_WIDTH) {
                            height *= MAX_WIDTH / width;
                            width = MAX_WIDTH;
                        }
                    } else {
                        if (height > MAX_HEIGHT) {
                            width *= MAX_HEIGHT / height;
                            height = MAX_HEIGHT;
                        }
                    }

                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    
                    // Compress to JPEG with 0.7 quality
                    const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                    resolve(dataUrl);
                };
                img.onerror = reject;
            };
            reader.onerror = error => reject(error);
        });
    },

    // === Auth Mocks ===
    async login(email, password) {
        // En modo Standalone simulamos el login si es correo/pass.
        // Asume un usuario demo.
        const user = { id: 'local123', name: 'Usuario Standalone', email, plan: 'pro' };
        return { token: 'mock-offline-token', user };
    },

    async register(data) {
        const user = { id: 'local123', name: data.name, email: data.email, plan: 'free' };
        return { token: 'mock-offline-token', user };
    },

    async getProfile() {
        return { user: this.getUser() };
    },

    async updateProfile(data) {
        let user = this.getUser() || {};
        user = { ...user, ...data };
        localStorage.setItem('sp_user', JSON.stringify(user));
        return { user };
    },

    // === Posts Mocks (Using local-store.js) ===
    async getPosts(params = {}) {
        return { posts: window.LocalPosts.findAll() };
    },

    async getPostStats() {
        const posts = window.LocalPosts.findAll();
        const publishedCount = posts.filter(p => p.status === 'published').length;
        return { 
            total: posts.length, 
            published: publishedCount,
            this_month: posts.filter(p => new Date(p.created_at).getMonth() === new Date().getMonth()).length,
            scheduled: posts.filter(p => p.status === 'scheduled').length,
            engagement: publishedCount * 123
        };
    },

    async getPost(id) {
        return window.LocalPosts.findById(id);
    },

    async createPost(formData) {
        // Transform the FormData into JSON
        let postData = {
            platform: formData.get('platform') || 'instagram',
            content: formData.get('content') || '',
            status: 'draft'
        };

        const file = formData.get('image');
        if (file) {
            if (typeof file === 'object' && file.size > 0) {
                postData.image = await this._fileToBase64(file);
            } else if (typeof file === 'string' && file.startsWith('data:image')) {
                postData.image = file;
            }
        }

        const post = window.LocalPosts.create(postData);
        return { post };
    },

    async updatePost(id, formData) {
        let updates = {
            platform: formData.get('platform'),
            content: formData.get('content')
        };
        const file = formData.get('image');
        if (file) {
            if (typeof file === 'object' && file.size > 0) {
                updates.image = await this._fileToBase64(file);
            } else if (typeof file === 'string' && file.startsWith('data:image')) {
                updates.image = file;
            }
        }
        
        const post = window.LocalPosts.update(id, updates);
        return { post };
    },

    async deletePost(id) {
        window.LocalPosts.delete(id);
        return { success: true };
    },

    
    async publishPost(id) {
        const post = window.LocalPosts.findById(id);
        if (!post) throw new Error("Post no encontrado");

        let shared = false;

        // 1. Intentar Web Share API nativo
        if (navigator.share) {
            try {
                const shareData = {
                    title: 'Publicar Postly',
                    text: post.content
                };

                // Intentar adjuntar imagen si existe
                if (post.image && post.image.startsWith('data:image')) {
                    try {
                        const res = await fetch(post.image);
                        const blob = await res.blob();
                        const file = new File([blob], 'postly_image.jpg', { type: blob.type });
                        if (navigator.canShare && navigator.canShare({ files: [file] })) {
                            shareData.files = [file];
                        }
                    } catch (err) {
                        console.warn("Error preparando imagen para share:", err);
                    }
                }
                
                await navigator.share(shareData);
                shared = true;
            } catch (e) {
                console.warn("Web Share falló o cancelado, reintentando solo texto:", e);
                // Si falló con archivos, reintentar solo texto
                try {
                    await navigator.share({
                        title: 'Publicar Postly',
                        text: post.content
                    });
                    shared = true;
                } catch (e2) {
                    console.warn("Web Share total falló:", e2);
                }
            }
        } 
        
        // 2. Fallback a Capacitor Share Plugin
        if (!shared && window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Share) {
            try {
                const { Share } = window.Capacitor.Plugins;
                await Share.share({
                    title: 'Publicar Postly',
                    text: post.content,
                    url: (post.image && post.image.startsWith('data:image')) ? post.image : undefined,
                    dialogTitle: 'Compartir en redes'
                });
                shared = true;
            } catch (e) {
                console.warn("Capacitor Share failed:", e);
            }
        }

        // 3. Fallback final: Copiar al portapapeles
        if (!shared) {
            try {
                await navigator.clipboard.writeText(post.content);
                alert("El texto del post se copió al portapapeles. Ahora abre Instagram o Facebook y pégalo.");
            } catch (err) {
                console.error("Clipboard failed:", err);
                alert("Por favor, copia el texto del post manualmente para publicarlo.");
            }
        }

        const updated = window.LocalPosts.update(id, { status: 'published', published_at: new Date().toISOString() });
        return { success: true, post: updated };
    },


    async schedulePost(id, scheduled_at) {
        const post = window.LocalPosts.update(id, { status: 'scheduled', scheduled_at });
        return { success: true, post };
    },

    // === AI Mocks (Direct to Groq) ===
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
            if(!response.ok) throw new Error(data.error?.message || "Groq Error");
            if (!data.choices || !data.choices[0] || !data.choices[0].message) {
                throw new Error("Respuesta inválida de la IA: " + (data.error?.message || "Sin datos"));
            }
            return data.choices[0].message.content;
        } catch (e) {
            throw new Error(`Error de IA: ${e.message}`);
        }
    },

    async generateCaption(description, options = {}) {
        const prompt = `Actúa como Community Manager profesional. Genera una caption atractiva sobre: "${description}". Usar tono ${options.tone || 'profesional'} y ${options.length || 'mediano'} de largo. Omitir reflexiones tuyas, solo la caption con emojis.`;
        const text = await this._fetchGroq(prompt);
        return { caption: text };
    },

    async generateHashtags(description, options = {}) {
        const prompt = `Devuelve solo 15 hashtags relevantes para la siguiente publicación, separados por espacios: "${description}". Ningún otro texto adicional.`;
        const text = await this._fetchGroq(prompt);
        return { hashtags: text };
    },

    async generateIdeas(industry, options = {}) {
        const prompt = `Devuelve 5 ideas innovadoras para postear en redes sociales sobre la industria: "${industry}". Cada idea en una nueva línea con un guión. Sólo las ideas, nada de texto introductorio.`;
        const text = await this._fetchGroq(prompt);
        return { ideas: text };
    },

    async improveText(text, options = {}) {
<<<<<<< HEAD
        const prompt = `Mejora y corrige el siguiente texto para redes sociales. Hazlo más profesional, persuasivo y corregido gramaticalmente. Sólo devuelve el texto mejorado: "${text}"`;
        const result = await this._fetchGroq(prompt);
        return { improved: result };
    },

    async generateVisualPrompt(description) {
        const prompt = `Genera un prompt técnico y descriptivo en inglés para una IA generadora de imágenes (como Midjourney o DALL-E) basado en esta idea: "${description}". El prompt debe ser detallado, mencionar estilo, iluminación y composición. Solo devuelve el prompt en inglés.`;
        const text = await this._fetchGroq(prompt);
        return { visualPrompt: text };
    },

    async generateImage(prompt) {
        try {
            // Usamos Pollinations AI y convertimos a Base64 para asegurar compatibilidad en WebView
            const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1080&height=1080&nologo=true`;
            const response = await fetch(url);
            if (!response.ok) throw new Error("No se pudo obtener la imagen.");
            const blob = await response.blob();
            
            return new Promise((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result); // Base64
                reader.onerror = reject;
                reader.readAsDataURL(blob);
            });
        } catch (e) {
            throw new Error("Generación de imágenes falló: " + e.message);
        }
    },

    // === Admin Mocks ===
    async getAdminStats() { 
        return { 
            stats: { 
                totalUsers: 1, 
                totalPosts: window.LocalPosts.findAll().length, 
                planDistribution: { free: 0, pro: 1, gold: 0 } 
            } 
        }; 
    },
    async getAdminUsers(params = {}) { 
        return { users: window.LocalUsers.findAll() }; 
    },
    async updateAdminUser(id, updates) {
        const user = window.LocalUsers.update(id, updates);
        return { user };
    },
    async deleteAdminUser(id) {
        window.LocalUsers.delete(id);
        return { success: true };
=======
        return this.request('/api/ai/improve', {
            method: 'POST',
            body: JSON.stringify({ text, ...options })
        });
    },

    async generateVisualPrompt(concept, options = {}) {
        return this.request('/api/ai/visual-prompt', {
            method: 'POST',
            body: JSON.stringify({ concept, ...options })
        });
>>>>>>> 0d6074004f5f2f1a157b3bfea43781b84dba81f1
    }
};

