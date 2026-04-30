
// Postly V2 — Core Application Logic
let currentSection = 'dashboard';
let currentPostData = {
    content: '',
    image: null,
    platform: 'instagram',
    aspect_ratio: 'feed'
};

document.addEventListener('DOMContentLoaded', () => {
    if (!API.getToken()) {
        renderLogin();
    } else {
        navigate('dashboard');
    }
});

function renderLogin() {
    const main = document.getElementById('main-content');
    // Ocultar nav en login
    document.querySelector('.bottom-nav').style.display = 'none';
    document.querySelector('header').style.display = 'none';

    main.innerHTML = `
        <div class="fade-in" style="padding: 40px 24px; display: flex; flex-direction: column; align-items: center; min-height: 90vh;">
            <div class="logo" style="font-size: 3rem; margin-bottom: 32px; flex-direction: column; gap: 15px;">
                <img src="./assets/img/logo.png" alt="Postly" style="width: 100px; height: 100px; border-radius: 28px; margin-bottom: 8px; box-shadow: 0 20px 40px rgba(99, 102, 241, 0.25);">
                <div style="text-align:center;">
                    <span style="display:block; font-weight:800; letter-spacing:-1px;">Postly</span>
                    <small style="font-size: 1.1rem; opacity: 0.4; font-weight:400;">Intelligent Marketing</small>
                </div>
            </div>
            
            <p style="text-align: center; color: var(--text-secondary); margin-bottom: 32px; max-width: 280px; font-size: 1rem;">Tu asistente inteligente para dominar las redes sociales.</p>

            <button class="btn" id="btn-connect-facebook" onclick="connectWithFacebook()" style="background: #1877f2; color: white; border-radius: 20px; height: 70px; font-weight:800; font-size: 1.2rem; margin-bottom: 24px; box-shadow: 0 10px 25px rgba(24, 119, 242, 0.3);">
                <i data-lucide="facebook"></i> Entrar con Facebook
            </button>

            <div style="margin: 16px 0; display: flex; align-items: center; gap: 15px; width: 100%; max-width: 300px;">
                <div style="flex: 1; height: 1px; background: var(--border); opacity: 0.5;"></div>
                <span style="font-size: 0.85rem; color: var(--text-secondary); font-weight:600;">o usa tu email</span>
                <div style="flex: 1; height: 1px; background: var(--border); opacity: 0.5;"></div>
            </div>

            <div class="card" style="width: 100%; margin: 24px 0 0 0; padding: 24px; border: none; background: transparent; box-shadow: none;">
                <div style="margin-bottom: 16px;">
                    <input type="email" id="login-email" placeholder="Email" style="width: 100%; padding: 16px; border: 2px solid var(--border); border-radius: 16px; font-family: inherit; font-size:1rem; outline:none; background: white;">
                </div>
                
                <div style="margin-bottom: 24px;">
                    <input type="password" id="login-password" placeholder="Contraseña" style="width: 100%; padding: 16px; border: 2px solid var(--border); border-radius: 16px; font-family: inherit; font-size:1rem; outline:none; background: white;">
                </div>

                <button class="btn btn-primary" id="login-btn" onclick="handleLogin()" style="height: 60px; font-size: 1.1rem; border-radius: 16px; background: var(--text-primary); color: white;">Entrar</button>
            </div>
            
            <p style="margin-top: 32px; font-size: 0.9rem; color: var(--text-secondary); font-weight:500;">
                ¿Eres nuevo? <a href="#" onclick="showToast('Usa el botón de Facebook para registrarte al instante.')" style="color: var(--primary); font-weight: 700; text-decoration: none;">Regístrate ahora</a>
            </p>
        </div>
    `;
    lucide.createIcons();
}

async function handleLogin() {
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const btn = document.getElementById('login-btn');

    if (!email || !password) {
        showToast("Ingresa tus credenciales", "warning");
        return;
    }

    btn.innerHTML = '<div class="spinner" style="margin:0; width:20px; height:20px; border-width:2px;"></div>';
    btn.disabled = true;

    try {
        const res = await API.login(email, password);
        API.setAuth(res.token, res.user);
        
        // Mostrar header y nav de nuevo
        document.querySelector('.bottom-nav').style.display = 'flex';
        document.querySelector('header').style.display = 'flex';
        
        navigate('dashboard');
    } catch (e) {
        showToast(e.message, "error");
    } finally {
        btn.innerHTML = 'Entrar';
        btn.disabled = false;
    }
}

function navigate(section) {
    currentSection = section;
    updateNavUI();
    
    // Asegurar que la navegación sea visible al navegar
    document.querySelector('.bottom-nav').style.display = 'flex';
    document.querySelector('header').style.display = 'flex';

    const main = document.getElementById('main-content');
    main.innerHTML = '<div class="fade-in"><div class="spinner"></div></div>'; // Loading state

    setTimeout(() => {
        switch(section) {
            case 'dashboard': renderDashboard(); break;
            case 'posts': renderPosts(); break;
            case 'create': renderCreatePost(); break;
            case 'flyers': renderFlyerGenerator(); break;
            case 'settings': renderSettings(); break;
        }
        lucide.createIcons();
    }, 300);
}

function updateNavUI() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('onclick').includes(currentSection)) {
            item.classList.add('active');
        }
    });
}

async function renderDashboard() {
    const main = document.getElementById('main-content');
    let stats = { total: 0, published: 0 };
    
    try {
        const data = await API.getPostStats();
        stats = data;
    } catch (e) {
        console.warn("Error fetching stats:", e);
    }

    const user = API.getUser();

    main.innerHTML = `
        <div class="fade-in">
            <div style="padding: 32px 24px 16px 24px;">
                <h1 style="font-size: 2.2rem; font-weight: 800; margin-bottom: 4px; letter-spacing: -1px;">Hola, ${(user && user.name) || 'Marcelo'} 👋</h1>
                <p style="color: var(--text-secondary); font-size: 1rem; font-weight:500;">Tu estrategia va por excelente camino.</p>
            </div>

            <div class="stats-grid">
                <div class="stat-card">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                        <span class="stat-value" style="color: var(--primary); font-size:1.8rem;">${stats.total}</span>
                        <i data-lucide="file-text" style="width:20px; color:var(--primary); opacity:0.3;"></i>
                    </div>
                    <span class="stat-label">Total Posts</span>
                </div>
                <div class="stat-card">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                        <span class="stat-value" style="color: var(--success); font-size:1.8rem;">${stats.published}</span>
                        <i data-lucide="check-circle" style="width:20px; color:var(--success); opacity:0.3;"></i>
                    </div>
                    <span class="stat-label">Publicados</span>
                </div>
            </div>

            <div class="card" style="background: linear-gradient(135deg, #0f172a, #1e293b); color: white; border: none; padding: 28px; position: relative; overflow: hidden;">
                <div style="position: relative; z-index: 2;">
                    <h3 style="margin-bottom: 12px; font-size: 1.4rem; font-weight:800;">✨ Generador de Ideas IA</h3>
                    <p style="font-size: 0.95rem; opacity: 0.8; margin-bottom: 24px; line-height:1.5;">¿No sabes qué publicar hoy? Nuestra IA diseña tu contenido en segundos.</p>
                    <button class="btn" onclick="navigate('ai')" style="background: rgba(255,255,255,1); color: #0f172a; width: auto; padding: 12px 24px;">Probar ahora</button>
                </div>
                <i data-lucide="sparkles" style="position: absolute; right: -20px; top: -20px; width: 120px; height: 120px; opacity: 0.1; color: white;"></i>
            </div>

            <div style="padding: 0 24px;">
                <h3 style="margin-bottom: 20px; font-weight:800; font-size:1.2rem;">Acciones Rápidas</h3>
                <div style="display: flex; gap: 16px; overflow-x: auto; padding-bottom: 20px; scrollbar-width: none;">
                    <div class="stat-card" style="min-width: 140px; align-items: center; cursor: pointer; border-radius:24px; padding: 24px 16px;" onclick="navigate('create')">
                        <div style="width:48px; height:48px; border-radius:16px; background:#f5f3ff; display:flex; align-items:center; justify-content:center; margin-bottom:12px;">
                            <i data-lucide="plus-circle" style="color: var(--primary); width:24px; height:24px;"></i>
                        </div>
                        <span style="font-size: 0.85rem; font-weight: 700;">Nuevo Post</span>
                    </div>
                    <div class="stat-card" style="min-width: 140px; align-items: center; cursor: pointer; border-radius:24px; padding: 24px 16px;" onclick="navigate('ai')">
                        <div style="width:48px; height:48px; border-radius:16px; background:#fff1f2; display:flex; align-items:center; justify-content:center; margin-bottom:12px;">
                            <i data-lucide="sparkles" style="color: var(--secondary); width:24px; height:24px;"></i>
                        </div>
                        <span style="font-size: 0.85rem; font-weight: 700;">Sugerir Idea</span>
                    </div>
                    <div class="stat-card" style="min-width: 140px; align-items: center; cursor: pointer; border-radius:24px; padding: 24px 16px;">
                        <div style="width:48px; height:48px; border-radius:16px; background:#ecfdf5; display:flex; align-items:center; justify-content:center; margin-bottom:12px;">
                            <i data-lucide="bar-chart-3" style="color: var(--success); width:24px; height:24px;"></i>
                        </div>
                        <span style="font-size: 0.85rem; font-weight: 700;">Reportes</span>
                    </div>
                </div>
            </div>
        </div>
    `;
}

async function renderPosts() {
    const main = document.getElementById('main-content');
    main.innerHTML = '<div class="fade-in"><div class="spinner"></div></div>';

    try {
        const { posts } = await API.getPosts();
        
        main.innerHTML = `
            <div class="fade-in">
                <div style="padding: 20px;">
                    <h2 style="font-weight: 800;">Mis Publicaciones</h2>
                    <p style="color: var(--text-secondary); font-size: 0.8rem;">Gestiona tu contenido publicado y programado.</p>
                </div>

                <div style="padding: 0 20px;">
                    ${posts.length === 0 ? `
                        <div class="card" style="text-align: center; padding: 40px 20px;">
                            <i data-lucide="file-text" style="width: 48px; height: 48px; color: var(--border); margin-bottom: 15px;"></i>
                            <p style="color: var(--text-secondary);">Aún no tienes publicaciones.</p>
                            <button class="btn btn-primary" onclick="navigate('create')" style="margin-top: 20px;">Crear mi primer post</button>
                        </div>
                    ` : posts.map(post => `
                        <div class="card" style="margin-bottom: 20px; padding: 20px; border-radius: 24px; box-shadow: 0 4px 15px rgba(0,0,0,0.03);">
                            <div style="display: flex; gap: 20px;">
                                <div style="position: relative;">
                                    ${post.image_url ? `<img src="${post.image_url}" style="width: 85px; height: 85px; border-radius: 18px; object-fit: cover; box-shadow: 0 5px 15px rgba(0,0,0,0.1);">` : `<div style="width: 85px; height: 85px; border-radius: 18px; background: #f1f5f9; display: flex; align-items: center; justify-content: center;"><i data-lucide="type" style="color: #94a3b8; width: 32px; height: 32px;"></i></div>`}
                                    <div style="position: absolute; -right: 8px; -bottom: 8px; width: 28px; height: 28px; background: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                                        <i data-lucide="${post.platform || 'instagram'}" style="width: 14px; color: ${post.platform === 'facebook' ? '#1877f2' : '#e1306c'};"></i>
                                    </div>
                                </div>
                                <div style="flex: 1;">
                                    <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
                                        <span style="font-size: 0.65rem; padding: 4px 10px; border-radius: 20px; background: ${post.status === 'published' ? '#ecfdf5' : '#f1f5f9'}; color: ${post.status === 'published' ? '#059669' : '#64748b'}; text-transform: uppercase; font-weight: 800; letter-spacing: 0.5px;">
                                            ${post.status}
                                        </span>
                                        <button style="background:none; border:none; color:var(--text-secondary); cursor:pointer;"><i data-lucide="more-vertical" style="width: 18px;"></i></button>
                                    </div>
                                    <p style="font-size: 0.95rem; line-height: 1.4; color: var(--text-primary); font-weight: 500; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; margin-bottom: 8px;">
                                        ${post.content || 'Sin descripción'}
                                    </p>
                                    <div style="display: flex; align-items: center; gap: 6px; color: var(--text-secondary); font-size: 0.75rem; font-weight:600;">
                                        <i data-lucide="calendar" style="width: 14px;"></i>
                                        <span>${new Date(post.created_at || Date.now()).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    } catch (e) {
        showToast("Error al cargar posts", "error");
        main.innerHTML = `<div style="padding: 40px; text-align: center;">Error: ${e.message}</div>`;
    }
}

async function renderAI() {
    const main = document.getElementById('main-content');
    main.innerHTML = `
        <div class="fade-in">
            <div style="padding: 32px 24px 16px 24px;">
                <h2 style="font-weight: 800; font-size: 2rem; letter-spacing: -1px;">Asistente IA</h2>
                <p style="color: var(--text-secondary); font-size: 1rem; font-weight: 500;">Potencia tu estrategia con inteligencia artificial de vanguardia.</p>
            </div>

            <div class="card" style="margin-top: 0; background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; border: none; padding: 32px; border-radius: 32px; box-shadow: 0 20px 40px rgba(99, 102, 241, 0.3);">
                <h3 style="margin-bottom: 24px; font-size: 1.4rem; font-weight: 800;">¿Qué quieres crear hoy?</h3>
                <div style="display: flex; flex-direction: column; gap: 12px;">
                    <button class="btn" onclick="openAIModal('ideas')" style="background: rgba(255,255,255,0.15); color: white; border: 1px solid rgba(255,255,255,0.2); backdrop-filter: blur(10px); justify-content: flex-start; padding: 16px 20px;">
                        <i data-lucide="lightbulb" style="width: 20px;"></i> Ideas de Contenido
                    </button>
                    <button class="btn" onclick="openAIModal('caption')" style="background: rgba(255,255,255,0.15); color: white; border: 1px solid rgba(255,255,255,0.2); backdrop-filter: blur(10px); justify-content: flex-start; padding: 16px 20px;">
                        <i data-lucide="pen-tool" style="width: 20px;"></i> Mejorar un Texto
                    </button>
                    <button class="btn" onclick="openAIModal('hashtags')" style="background: rgba(255,255,255,0.15); color: white; border: 1px solid rgba(255,255,255,0.2); backdrop-filter: blur(10px); justify-content: flex-start; padding: 16px 20px;">
                        <i data-lucide="hash" style="width: 20px;"></i> Generar Hashtags
                    </button>
                </div>
            </div>

            <div style="padding: 0 24px;">
                <h3 style="margin-bottom: 20px; font-weight: 800; font-size: 1.2rem;">Herramientas Visuales</h3>
                <div class="card" style="cursor: pointer; margin: 0; padding: 24px; border-left: 6px solid var(--accent); border-radius: 20px;" onclick="openAIModal('image')">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <h4 style="font-size: 1.1rem; font-weight: 800; margin-bottom: 4px;">Generador de Imágenes</h4>
                            <p style="font-size: 0.9rem; color: var(--text-secondary); font-weight: 500;">Crea arte visual único desde texto.</p>
                        </div>
                        <div style="width: 48px; height: 48px; border-radius: 14px; background: #f5f3ff; display: flex; align-items: center; justify-content: center;">
                            <i data-lucide="image" style="color: var(--accent); width: 24px;"></i>
                        </div>
                    </div>
                </div>
            </div>
        </div>
        
        <div id="ai-modal" class="modal-overlay" style="display: none; align-items: flex-end; justify-content: center; position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(15, 23, 42, 0.6); backdrop-filter: blur(8px); z-index: 2000;">
            <div class="modal" style="width: 100%; max-width: 480px; border-radius: 32px 32px 0 0; animation: slideUp 0.4s cubic-bezier(0.4, 0, 0.2, 1); background: white; padding: 32px; position: absolute; bottom: 0; box-shadow: 0 -20px 40px rgba(0,0,0,0.1);">
                <div style="width: 40px; height: 4px; background: #e2e8f0; border-radius: 10px; margin: -16px auto 24px auto;"></div>
                <div id="ai-modal-content"></div>
                <button class="btn" onclick="closeAIModal()" style="margin-top: 24px; background: #f1f5f9; color: var(--text-secondary); font-weight: 700; border-radius: 16px;">Cancelar</button>
            </div>
        </div>
        
        <style>
            @keyframes slideUp {
                from { transform: translateY(100%); opacity: 0; }
                to { transform: translateY(0); opacity: 1; }
            }
        </style>
    `;
    lucide.createIcons();
}

function closeAIModal() {
    document.getElementById('ai-modal').style.display = 'none';
}

function openAIModal(type) {
    const modal = document.getElementById('ai-modal');
    const content = document.getElementById('ai-modal-content');
    modal.style.display = 'flex';
    
    switch(type) {
        case 'ideas':
            content.innerHTML = `
                <h3 style="margin-bottom: 15px;">Generar Ideas</h3>
                <p style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 15px;">¿Sobre qué tema quieres ideas?</p>
                <input type="text" id="ai-input" placeholder="Ej: Venta de zapatillas, Tips de cocina..." style="width: 100%; padding: 12px; border: 1px solid var(--border); border-radius: 12px; margin-bottom: 15px;">
                <button class="btn btn-primary" onclick="runAI('ideas')">Generar Ideas ✨</button>
                <div id="ai-result" style="margin-top: 20px; font-size: 0.9rem; line-height: 1.6; white-space: pre-wrap;"></div>
            `;
            break;
        case 'caption':
            content.innerHTML = `
                <h3 style="margin-bottom: 15px;">Mejorar Texto</h3>
                <p style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 15px;">Escribe el texto que quieres mejorar.</p>
                <textarea id="ai-input" placeholder="Ej: Vendo zapatillas baratas..." style="width: 100%; height: 80px; padding: 12px; border: 1px solid var(--border); border-radius: 12px; margin-bottom: 15px; resize: none;"></textarea>
                <button class="btn btn-primary" onclick="runAI('caption')">Mejorar con IA ✨</button>
                <div id="ai-result" style="margin-top: 20px; font-size: 0.9rem; background: #f8fafc; padding: 15px; border-radius: 12px;"></div>
            `;
            break;
        case 'hashtags':
            content.innerHTML = `
                <h3 style="margin-bottom: 15px;">Hashtags Virales</h3>
                <p style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 15px;">Describe tu post brevemente.</p>
                <input type="text" id="ai-input" placeholder="Ej: Una foto de mi perro en la playa" style="width: 100%; padding: 12px; border: 1px solid var(--border); border-radius: 12px; margin-bottom: 15px;">
                <button class="btn btn-primary" onclick="runAI('hashtags')">Obtener Hashtags #</button>
                <div id="ai-result" style="margin-top: 20px; font-size: 0.9rem; background: #f8fafc; padding: 15px; border-radius: 12px;"></div>
            `;
            break;
        case 'image':
            content.innerHTML = `
                <h3 style="margin-bottom: 15px;">Imagen con IA</h3>
                <p style="font-size: 0.8rem; color: var(--text-secondary); margin-bottom: 15px;">Describe la imagen que imaginas.</p>
                <textarea id="ai-input" placeholder="Ej: A futuristic city with neon lights, high resolution, cinematic" style="width: 100%; height: 80px; padding: 12px; border: 1px solid var(--border); border-radius: 12px; margin-bottom: 15px; resize: none;"></textarea>
                <button class="btn btn-primary" onclick="runAI('image')">Generar Imagen 🎨</button>
                <div id="ai-result" style="margin-top: 20px; text-align: center;"></div>
            `;
            break;
    }
    lucide.createIcons();
}

async function runAI(type) {
    const input = document.getElementById('ai-input').value;
    const resultDiv = document.getElementById('ai-result');
    if (!input) return showToast("Escribe algo primero", "warning");

    resultDiv.innerHTML = '<div class="spinner"></div>';
    
    try {
        let res;
        if (type === 'ideas') {
            res = await API.generateIdeas(input);
            resultDiv.innerHTML = `<div style="background: #f8fafc; padding: 15px; border-radius: 12px; border-left: 4px solid var(--primary);">${res.ideas}</div>`;
        } else if (type === 'caption') {
            res = await API.improveText(input);
            resultDiv.innerHTML = `<div style="background: #f8fafc; padding: 15px; border-radius: 12px;">${res.improved}</div>`;
        } else if (type === 'hashtags') {
            res = await API.generateHashtags(input);
            resultDiv.innerHTML = `<div style="color: var(--primary); font-weight: 600;">${res.hashtags}</div>`;
        } else if (type === 'image') {
            res = await API.generateImage(input);
            resultDiv.innerHTML = `
                <img src="${res}" style="width: 100%; border-radius: 12px; margin-bottom: 10px;">
                <button class="btn btn-sm" onclick="useAIImage('${res}')" style="background: var(--success); color: white;">Usar en mi Post</button>
            `;
        }
    } catch (e) {
        resultDiv.innerHTML = `<p style="color: var(--danger);">Error: ${e.message}</p>`;
    }
}

function useAIImage(base64) {
    currentPostData.image = base64;
    navigate('create');
    setTimeout(() => {
        const area = document.getElementById('image-upload-area');
        if (area) {
            area.innerHTML = `<img src="${base64}" id="preview-img" style="width: 100%; height: 100%; object-fit: cover;">`;
            document.getElementById('filter-section').style.display = 'block';
        }
    }, 500);
}

function renderCreatePost() {
    const main = document.getElementById('main-content');
    main.innerHTML = `
        <div class="fade-in">
            <div style="padding: 32px 24px 16px 24px;">
                <h2 style="font-weight: 800; font-size: 2rem; letter-spacing: -1px;">Crear Post</h2>
                <p style="color: var(--text-secondary); font-size: 1rem; font-weight: 500;">Diseña tu próxima publicación viral.</p>
            </div>

            <div class="card" style="margin-top: 0; padding: 24px; border: none; box-shadow: 0 4px 20px rgba(0,0,0,0.03);">
                <!-- Platform Toggle -->
                <div style="display: flex; gap: 8px; margin-bottom: 24px; background: #f1f5f9; padding: 6px; border-radius: 18px;">
                    <button class="btn btn-sm" id="plat-ig" onclick="setPlatform('instagram')" style="flex: 1; border-radius: 14px; background: white; box-shadow: 0 4px 10px rgba(0,0,0,0.05); font-weight: 700;">Instagram</button>
                    <button class="btn btn-sm" id="plat-fb" onclick="setPlatform('facebook')" style="flex: 1; border-radius: 14px; background: transparent; font-weight: 700; color: var(--text-secondary);">Facebook</button>
                </div>

                <!-- Post Type Toggle (Feed vs Stories) -->
                <div style="display: flex; gap: 8px; margin-bottom: 24px;">
                    <button class="btn btn-sm" id="type-feed" onclick="setPostType('feed')" style="flex: 1; border-radius: 12px; background: #f1f5f9; font-weight: 700; border: 1.5px solid var(--primary); color: var(--primary);">
                        <i data-lucide="layout" style="width: 14px;"></i> Feed
                    </button>
                    <button class="btn btn-sm" id="type-story" onclick="setPostType('story')" style="flex: 1; border-radius: 12px; background: #f1f5f9; font-weight: 700; border: 1.5px solid transparent; color: var(--text-secondary);">
                        <i data-lucide="layers" style="width: 14px;"></i> Historia
                    </button>
                </div>

                <!-- Image Upload Area -->
                <div id="image-upload-area" onclick="document.getElementById('file-input').click()" style="width: 100%; aspect-ratio: 1; background: #f8fafc; border: 2px dashed #cbd5e1; border-radius: 24px; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 12px; cursor: pointer; overflow: hidden; position: relative; transition: all 0.3s ease;">
                    <div style="width: 64px; height: 64px; border-radius: 50%; background: white; display: flex; align-items: center; justify-content: center; box-shadow: 0 10px 20px rgba(0,0,0,0.05);">
                        <i data-lucide="image" style="width: 28px; height: 28px; color: var(--primary);"></i>
                    </div>
                    <span style="color: var(--text-secondary); font-size: 0.95rem; font-weight: 600;">Subir una foto increíble</span>
                    <input type="file" id="file-input" hidden accept="image/*" onchange="handleFile(event)">
                </div>

                <!-- Dynamic Controls for Image -->
                <div id="filter-btn-container" style="display: none; gap: 10px; margin-top: 15px;">
                    <button class="btn btn-sm" onclick="openNativeEditor()" style="flex: 1; background: var(--primary); color: white; border-radius: 12px; font-weight: 700; height: 44px;">
                        <i data-lucide="edit-3" style="width: 14px;"></i> Filtros
                    </button>
                    <button class="btn btn-sm" onclick="removeImage()" style="flex: 1; background: #fee2e2; color: #991b1b; border-radius: 12px; font-weight: 700; height: 44px;">
                        <i data-lucide="trash-2" style="width: 14px;"></i> Quitar
                    </button>
                </div>

                <!-- Filters -->
                <div id="filter-section" style="display: none; margin-top: 24px;">
                    <p style="font-size: 0.9rem; font-weight: 800; margin-bottom: 12px; display: flex; align-items: center; gap: 8px;">
                        <i data-lucide="palette" style="width: 16px; color: var(--primary);"></i> Filtros Profesionales
                    </p>
                    <div style="display: flex; gap: 12px; overflow-x: auto; padding: 4px 0; scrollbar-width: none; -webkit-overflow-scrolling: touch;">
                        <div class="filter-thumb" onclick="applyFilter('none')" style="border-radius: 14px; min-width: 70px; height: 70px;">Original</div>
                        <div class="filter-thumb" onclick="applyFilter('vintage')" style="filter: sepia(0.5) contrast(1.2) brightness(0.9); border-radius: 14px; min-width: 70px; height: 70px;">Vintage</div>
                        <div class="filter-thumb" onclick="applyFilter('b-w')" style="filter: grayscale(1); border-radius: 14px; min-width: 70px; height: 70px;">B&N</div>
                        <div class="filter-thumb" onclick="applyFilter('warm')" style="filter: sepia(0.2) saturate(1.5) brightness(1.1); border-radius: 14px; min-width: 70px; height: 70px;">Warm</div>
                        <div class="filter-thumb" onclick="applyFilter('cool')" style="filter: hue-rotate(30deg) saturate(1.2); border-radius: 14px; min-width: 70px; height: 70px;">Cool</div>
                        <div class="filter-thumb" onclick="applyFilter('vibrant')" style="filter: saturate(2) contrast(1.1); border-radius: 14px; min-width: 70px; height: 70px;">Vibrant</div>
                        <div class="filter-thumb" onclick="applyFilter('noir')" style="filter: grayscale(1) contrast(1.5) brightness(0.9); border-radius: 14px; min-width: 70px; height: 70px;">Noir</div>
                        <div class="filter-thumb" onclick="applyFilter('golden')" style="filter: sepia(0.3) saturate(1.4) brightness(1.1) hue-rotate(-10deg); border-radius: 14px; min-width: 70px; height: 70px;">Golden</div>
                        <div class="filter-thumb" onclick="applyFilter('cyberpunk')" style="filter: hue-rotate(150deg) saturate(1.6) contrast(1.2); border-radius: 14px; min-width: 70px; height: 70px;">Cyber</div>
                        <div class="filter-thumb" onclick="applyFilter('lomo')" style="filter: contrast(1.3) saturate(1.6) brightness(0.9); border-radius: 14px; min-width: 70px; height: 70px;">Lomo</div>
                        <div class="filter-thumb" onclick="applyFilter('fade')" style="filter: brightness(1.1) contrast(0.85) saturate(0.8); border-radius: 14px; min-width: 70px; height: 70px;">Fade</div>
                        <div class="filter-thumb" onclick="applyFilter('teal')" style="filter: hue-rotate(130deg) saturate(1.4) contrast(1.1); border-radius: 14px; min-width: 70px; height: 70px;">Teal</div>
                        <div class="filter-thumb" onclick="applyFilter('dramatic')" style="filter: contrast(1.5) brightness(0.8) saturate(0.8); border-radius: 14px; min-width: 70px; height: 70px;">Dramatic</div>
                    </div>
                </div>

                <div style="margin-top: 24px;">
                    <label style="font-size: 0.9rem; font-weight: 800; color: var(--text-primary); margin-left: 4px;">Contenido</label>
                    <textarea id="post-text" placeholder="¿Qué quieres contar hoy?" style="width: 100%; height: 140px; border: 2px solid var(--border); border-radius: 20px; padding: 16px; margin-top: 8px; font-family: inherit; resize: none; font-size: 1rem; outline: none; transition: border-color 0.2s;"></textarea>
                    
                    <div style="display: flex; gap: 10px; margin-top: 12px;">
                        <button class="btn btn-sm" onclick="generateAICaption()" style="background: #f5f3ff; color: var(--primary); font-size: 0.85rem; flex: 1; border-radius: 12px; font-weight: 700; height: 44px;">
                            <i data-lucide="sparkles" style="width: 14px;"></i> IA Texto
                        </button>
                        <button class="btn btn-sm" onclick="generateHashtags()" style="background: #fff1f2; color: var(--secondary); font-size: 0.85rem; flex: 1; border-radius: 12px; font-weight: 700; height: 44px;">
                            <i data-lucide="hash" style="width: 14px;"></i> Hashtags
                        </button>
                    </div>
                </div>

                <button class="btn btn-primary" id="submit-btn" onclick="submitPost()" style="margin-top: 32px; height: 64px; border-radius: 20px; font-size: 1.1rem; letter-spacing: -0.5px;">
                    Publicar ahora <i data-lucide="send" style="width: 20px; margin-left: 8px;"></i>
                </button>
            </div>
        </div>
    `;
}

// Dummy functions for navigation screens not yet implemented
function renderSettings() {
    const main = document.getElementById('main-content');
    const user = API.getUser() || {};
    
    const hasIG = user.ig_page_id;
    const hasFB = user.fb_page_id;

    main.innerHTML = `
        <div class="fade-in">
            <div style="padding: 20px;">
                <h2 style="font-weight: 800;">Ajustes</h2>
            </div>

            <div class="card">
                <div style="display: flex; align-items: center; gap: 15px; margin-bottom: 25px;">
                    <div style="width: 60px; height: 60px; border-radius: 50%; background: var(--primary); color: white; display: flex; justify-content: center; align-items: center; font-size: 1.5rem; font-weight: 700;">
                        ${(user.name || 'M').charAt(0)}
                    </div>
                    <div>
                        <h3 style="font-size: 1.1rem;">${user.name || 'Usuario'}</h3>
                        <p style="font-size: 0.8rem; color: var(--text-secondary);">${user.email || 'Conectado con Meta'}</p>
                    </div>
                </div>

                <div style="border-top: 1px solid var(--border); padding-top: 20px;">
                    <h4 style="font-size: 0.9rem; margin-bottom: 15px;">Conexiones Sociales</h4>
                    
                    <div style="display: flex; flex-direction: column; gap: 12px;">
                        <div style="display: flex; align-items: center; justify-content: space-between; background: #f8fafc; padding: 12px; border-radius: 12px;">
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <i data-lucide="instagram" style="color: #e1306c;"></i>
                                <span style="font-size: 0.9rem; font-weight: 600;">Instagram</span>
                            </div>
                            <span style="font-size: 0.75rem; padding: 4px 8px; border-radius: 20px; background: ${hasIG ? '#dcfce7' : '#fee2e2'}; color: ${hasIG ? '#166534' : '#991b1b'};">
                                ${hasIG ? 'Vinculado' : 'No vinculado'}
                            </span>
                        </div>

                        <div style="display: flex; align-items: center; justify-content: space-between; background: #f8fafc; padding: 12px; border-radius: 12px;">
                            <div style="display: flex; align-items: center; gap: 10px;">
                                <i data-lucide="facebook" style="color: #1877f2;"></i>
                                <span style="font-size: 0.9rem; font-weight: 600;">Facebook</span>
                            </div>
                            <span style="font-size: 0.75rem; padding: 4px 8px; border-radius: 20px; background: ${hasFB ? '#dcfce7' : '#fee2e2'}; color: ${hasFB ? '#166534' : '#991b1b'};">
                                ${hasFB ? 'Vinculado' : 'No vinculado'}
                            </span>
                        </div>
                    </div>

                    <button class="btn" id="btn-connect-facebook" onclick="connectWithFacebook()" style="margin-top: 20px; background: #1877f2; color: white; border-radius: 12px;">
                        <i data-lucide="refresh-cw"></i> Sincronizar con Meta
                    </button>
                    <p style="font-size: 0.7rem; color: var(--text-secondary); margin-top: 10px; text-align: center;">
                        Postly necesita permisos para publicar en tu nombre.
                    </p>
                </div>
            </div>

            <div class="card" style="margin-top: 0;">
                <button class="btn" onclick="logout()" style="background: transparent; color: var(--danger); border: 1px solid var(--danger);">Cerrar Sesión</button>
            </div>
        </div>
    `;
}

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.style.position = 'fixed';
    toast.style.bottom = '100px';
    toast.style.left = '50%';
    toast.style.transform = 'translateX(-50%)';
    toast.style.padding = '12px 24px';
    toast.style.borderRadius = '30px';
    toast.style.background = type === 'error' ? 'var(--danger)' : (type === 'warning' ? 'var(--warning)' : '#1e293b');
    toast.style.color = 'white';
    toast.style.fontSize = '0.9rem';
    toast.style.zIndex = '10000';
    toast.style.boxShadow = '0 5px 15px rgba(0,0,0,0.2)';
    toast.innerText = message;
    
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
}

function logout() {
    API.clearAuth();
    window.location.reload();
}

// Post Creation Logic
function setPlatform(plat) {
    currentPostData.platform = plat;
    document.getElementById('plat-ig').style.background = plat === 'instagram' ? 'white' : 'transparent';
    document.getElementById('plat-fb').style.background = plat === 'facebook' ? 'white' : 'transparent';
    document.getElementById('plat-ig').style.boxShadow = plat === 'instagram' ? '0 2px 5px rgba(0,0,0,0.05)' : 'none';
    document.getElementById('plat-fb').style.boxShadow = plat === 'facebook' ? '0 2px 5px rgba(0,0,0,0.05)' : 'none';
    document.getElementById('plat-ig').style.color = plat === 'instagram' ? 'var(--text-primary)' : 'var(--text-secondary)';
    document.getElementById('plat-fb').style.color = plat === 'facebook' ? 'var(--text-primary)' : 'var(--text-secondary)';
}

function setPostType(type) {
    currentPostData.aspect_ratio = type;
    document.getElementById('type-feed').style.borderColor = type === 'feed' ? 'var(--primary)' : 'transparent';
    document.getElementById('type-story').style.borderColor = type === 'story' ? 'var(--primary)' : 'transparent';
    document.getElementById('type-feed').style.color = type === 'feed' ? 'var(--primary)' : 'var(--text-secondary)';
    document.getElementById('type-story').style.color = type === 'story' ? 'var(--primary)' : 'var(--text-secondary)';
    
    // Cambiar aspecto del área de subida
    const area = document.getElementById('image-upload-area');
    if (area) {
        area.style.aspectRatio = type === 'feed' ? '1' : '9/16';
    }
}

function handleFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        currentPostData.image = e.target.result;
        const area = document.getElementById('image-upload-area');
        area.innerHTML = `<img src="${e.target.result}" id="preview-img" style="width: 100%; height: 100%; object-fit: cover;">`;
        
        // Mostrar botones de filtros y quitar
        document.getElementById('filter-btn-container').style.display = 'flex';
        document.getElementById('filter-section').style.display = 'block';
        lucide.createIcons();
    };
    reader.readAsDataURL(file);
}

function removeImage() {
    currentPostData.image = null;
    currentPostData.filter = 'none';
    const area = document.getElementById('image-upload-area');
    area.innerHTML = `
        <div style="width: 64px; height: 64px; border-radius: 50%; background: white; display: flex; align-items: center; justify-content: center; box-shadow: 0 10px 20px rgba(0,0,0,0.05);">
            <i data-lucide="image" style="width: 28px; height: 28px; color: var(--primary);"></i>
        </div>
        <span style="color: var(--text-secondary); font-size: 0.95rem; font-weight: 600;">Subir una foto increíble</span>
    `;
    document.getElementById('filter-btn-container').style.display = 'none';
    document.getElementById('filter-section').style.display = 'none';
    lucide.createIcons();
}

async function openNativeEditor() {
    if (window.Capacitor && window.Capacitor.Plugins.NativeUI && currentPostData.image) {
        try {
            const result = await window.Capacitor.Plugins.NativeUI.openPhotoEditor({
                image: currentPostData.image
            });
            if (result.image) {
                currentPostData.image = result.image;
                document.getElementById('preview-img').src = result.image;
            }
        } catch (e) {
            console.error("Native editor failed:", e);
        }
    } else {
        // Fallback: scroll to web filters
        document.getElementById('filter-section').scrollIntoView({ behavior: 'smooth' });
    }
}

function applyFilter(filter) {
    currentPostData.filter = filter;
    const img = document.getElementById('preview-img');
    if (!img) return;

    const filters = {
        'none': 'none',
        'vintage': 'sepia(0.5) contrast(1.2) brightness(0.9)',
        'b-w': 'grayscale(1)',
        'warm': 'sepia(0.2) saturate(1.5) brightness(1.1)',
        'cool': 'hue-rotate(30deg) saturate(1.2)',
        'vibrant': 'saturate(2) contrast(1.1)',
        'noir': 'grayscale(1) contrast(1.5) brightness(0.9)',
        'golden': 'sepia(0.3) saturate(1.4) brightness(1.1) hue-rotate(-10deg)',
        'cyberpunk': 'hue-rotate(150deg) saturate(1.6) contrast(1.2)',
        'lomo': 'contrast(1.3) saturate(1.6) brightness(0.9)',
        'fade': 'brightness(1.1) contrast(0.85) saturate(0.8)',
        'teal': 'hue-rotate(130deg) saturate(1.4) contrast(1.1)',
        'dramatic': 'contrast(1.5) brightness(0.8) saturate(0.8)'
    };

    img.style.filter = filters[filter] || 'none';
}



async function generateAICaption() {
    const text = document.getElementById('post-text').value;
    const btn = event.currentTarget; // Usar currentTarget para evitar problemas con el icono
    const originalText = btn.innerHTML;
    btn.innerHTML = 'Generando...';
    btn.disabled = true;

    try {
        const res = await API.generateCaption(text || 'Marketing digital para mi negocio', {
            imageBase64: currentPostData.image // Enviar imagen para contexto si existe
        });
        document.getElementById('post-text').value = res.caption;
    } catch (e) {
        showToast("Error de IA: " + e.message, "error");
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
        lucide.createIcons();
    }
}

async function generateHashtags() {
    const text = document.getElementById('post-text').value;
    const btn = event.currentTarget;
    const originalText = btn.innerHTML;
    btn.innerHTML = 'Generando...';
    btn.disabled = true;

    try {
        const res = await API.generateHashtags(text || 'Marketing digital');
        document.getElementById('post-text').value += "\n\n" + res.hashtags;
    } catch (e) {
        showToast("Error de IA: " + e.message, "error");
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
        lucide.createIcons();
    }
}

async function generateIdeas() {
    // Esta función podría usarse en otra sección
    showToast("Generando ideas...", "info");
}

// AdMob Integration
function initAds() {
    if (window.Capacitor && window.Capacitor.Plugins.AdMob) {
        console.log("[ADS] Inicializando AdMob...");
        window.Capacitor.Plugins.AdMob.loadRewardedAd();
        
        window.Capacitor.Plugins.AdMob.addListener('onRewarded', async (info) => {
            console.log("[ADS] Recompensa recibida!", info);
            try {
                await API.verifyAdReward();
                console.log("[ADS] Crédito verificado en el servidor.");
                // Una vez verificado, procedemos a publicar automáticamente
                finalizePostSubmission();
            } catch (e) {
                alert("Error al validar recompensa: " + e.message);
            }
        });

        window.Capacitor.Plugins.AdMob.addListener('onAdFailedToLoad', (err) => {
            console.warn("[ADS] Error al cargar anuncio:", err);
        });
    }
}

async function submitPost() {
    const content = document.getElementById('post-text').value;
    if (!content && !currentPostData.image) {
        alert("Agrega una imagen o texto para publicar.");
        return;
    }

    // Verificar si AdMob está disponible y el anuncio está listo
    if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.AdMob) {
        try {
            const adStatus = await window.Capacitor.Plugins.AdMob.isAdReady();
            if (adStatus && adStatus.ready) {
                const confirmAd = confirm("Para publicar gratis, mira un anuncio corto. ¿Continuar?");
                if (confirmAd) {
                    try {
                        const result = await window.Capacitor.Plugins.AdMob.showRewardedAd();
                        if (result && result.completed) {
                            // Verificar recompensa en el servidor
                            try { await API.verifyAdReward(); } catch(e) { console.warn('[ADS] Verify failed:', e); }
                            finalizePostSubmission();
                            return;
                        }
                    } catch(e) {
                        console.warn("[ADS] Error mostrando anuncio:", e);
                        showToast("Anuncio no disponible, publicando directamente...", "info");
                    }
                } else {
                    return; // Usuario canceló
                }
            } else {
                console.log("[ADS] Anuncio no está listo, publicando directamente.");
                // Pre-cargar para la próxima vez
                try { window.Capacitor.Plugins.AdMob.loadRewardedAd(); } catch(e) {}
            }
        } catch(e) {
            console.warn("[ADS] AdMob no disponible:", e);
        }
    }

    // Publicar directamente (sin ads o ads no disponibles)
    finalizePostSubmission();
}

async function finalizePostSubmission() {
    const content = document.getElementById('post-text').value;
    const btn = document.getElementById('submit-btn');
    btn.innerHTML = '<div class="spinner" style="margin:0; width:20px; height:20px; border-width:2px;"></div> Publicando...';
    btn.disabled = true;

    try {
        let finalImage = currentPostData.image;
        
        if (currentPostData.image && currentPostData.filter && currentPostData.filter !== 'none') {
            finalImage = await PhotoEditor.processImage(currentPostData.image, currentPostData.filter);
        }

        const res = await API.createPost({
            content: content,
            image_base64: finalImage,
            platform: currentPostData.platform,
            aspect_ratio: currentPostData.aspect_ratio,
            status: 'published'
        });
        
        alert("¡Publicación exitosa!");
        // Actualizar datos de usuario (créditos) tras publicar
        const profile = await API.getProfile();
        API.setAuth(API.getToken(), profile.user);
        
        navigate('dashboard');
    } catch (e) {
        console.error("[PUBLISH ERROR]", e);
        showToast("Error al publicar: " + e.message, "error");
    } finally {
        btn.innerHTML = 'Publicar ahora <i data-lucide="send" style="width: 20px; margin-left: 8px;"></i>';
        btn.disabled = false;
        lucide.createIcons();
    }
}

// Iniciar ads al cargar
async function renderFlyerGenerator() {
    const main = document.getElementById('main-content');
    
    main.innerHTML = `
        <div class="fade-in" style="padding: 20px 16px;">
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 24px;">
                <div style="background: var(--primary); color: white; width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center;">
                    <i data-lucide="palette"></i>
                </div>
                <div>
                    <h2 style="font-weight: 800; font-size: 1.5rem; margin: 0;">Diseño con IA</h2>
                    <p style="font-size: 0.8rem; color: var(--text-secondary); margin: 0;">Crea flyers profesionales en segundos</p>
                </div>
            </div>

            <div class="card" style="padding: 20px; border-radius: 24px; margin-bottom: 20px;">
                <h3 style="font-size: 1rem; margin-bottom: 16px; font-weight: 700;">1. Referencias Visuales</h3>
                <div id="flyer-images-area" onclick="document.getElementById('flyer-files').click()" style="border: 2px dashed var(--border); border-radius: 20px; padding: 30px 20px; text-align: center; cursor: pointer; transition: all 0.2s;">
                    <i data-lucide="image-plus" style="width: 32px; height: 32px; color: var(--primary); margin-bottom: 10px;"></i>
                    <p style="font-size: 0.9rem; font-weight: 600;">Sube tu logo y fotos</p>
                    <p style="font-size: 0.75rem; color: var(--text-secondary);">Analizaremos colores y estilo</p>
                    <input type="file" id="flyer-files" multiple accept="image/*" style="display: none;" onchange="handleFlyerFiles(this)">
                </div>
                <div id="flyer-previews" style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 12px;"></div>
            </div>

            <div class="card" style="padding: 20px; border-radius: 24px; margin-bottom: 20px;">
                <h3 style="font-size: 1rem; margin-bottom: 16px; font-weight: 700;">2. Datos del Negocio</h3>
                <div style="display: flex; flex-direction: column; gap: 12px;">
                    <input type="text" id="f-negocio" placeholder="Nombre del Negocio / Rubro" style="width: 100%; padding: 14px; border: 1.5px solid var(--border); border-radius: 14px; outline: none; font-family: inherit;">
                    <input type="text" id="f-oferta" placeholder="¿Qué quieres promocionar? (Ej: 2x1 en Pizzas)" style="width: 100%; padding: 14px; border: 1.5px solid var(--border); border-radius: 14px; outline: none; font-family: inherit;">
                    <input type="text" id="f-contacto" placeholder="WhatsApp / Instagram / Dirección" style="width: 100%; padding: 14px; border: 1.5px solid var(--border); border-radius: 14px; outline: none; font-family: inherit;">
                    
                    <select id="f-formato" style="width: 100%; padding: 14px; border: 1.5px solid var(--border); border-radius: 14px; outline: none; font-family: inherit; background: white;">
                        <option value="instagram_feed">Post Cuadrado (1:1)</option>
                        <option value="instagram_vertical">Post Vertical (4:5)</option>
                        <option value="instagram_story">Story / Reel (9:16)</option>
                    </select>
                </div>
            </div>

            <button class="btn btn-primary" id="btn-gen-flyer" onclick="generateFlyerConcept()" style="height: 60px; border-radius: 20px; font-weight: 800; font-size: 1rem; box-shadow: 0 10px 20px rgba(99, 102, 241, 0.2);">
                <i data-lucide="zap" style="width: 18px;"></i> GENERAR CONCEPTO
            </button>

            <div id="flyer-result" style="margin-top: 24px; display: none;"></div>
        </div>
    `;
    lucide.createIcons();
}

let flyerImages = [];

function handleFlyerFiles(input) {
    const files = Array.from(input.files);
    const container = document.getElementById('flyer-previews');
    
    files.forEach(file => {
        const reader = new FileReader();
        reader.onload = (e) => {
            flyerImages.push(e.target.result);
            const div = document.createElement('div');
            div.style.width = '60px';
            div.style.height = '60px';
            div.style.borderRadius = '10px';
            div.style.overflow = 'hidden';
            div.style.border = '1px solid var(--border)';
            div.innerHTML = `<img src="${e.target.result}" style="width: 100%; height: 100%; object-fit: cover;">`;
            container.appendChild(div);
        };
        reader.readAsDataURL(file);
    });
}

async function generateFlyerConcept() {
    const btn = document.getElementById('btn-gen-flyer');
    const resultDiv = document.getElementById('flyer-result');
    
    const data = {
        negocio: document.getElementById('f-negocio').value,
        oferta: document.getElementById('f-oferta').value,
        contacto: document.getElementById('f-contacto').value,
        formato: document.getElementById('f-formato').value,
        precio: '', // Opcional
        tono: 'Profesional e impactante',
        extra: ''
    };

    if (!data.negocio || !data.oferta) {
        showToast("Completa los datos básicos", "warning");
        return;
    }

    btn.innerHTML = 'Diseñando...';
    btn.disabled = true;
    resultDiv.style.display = 'none';

    try {
        const res = await API.generateFlyer(data, flyerImages);
        
        resultDiv.innerHTML = `
            <div class="card fade-in" style="padding: 20px; border-radius: 24px; background: #fafafa; border: 2px solid #eee;">
                <h3 style="color: var(--primary); font-weight: 800; margin-bottom: 15px;">Diseño Propuesto</h3>
                <div style="white-space: pre-wrap; font-size: 0.9rem; line-height: 1.6; color: #334155;">
                    ${res.concept.replace(/###/g, '<br><strong>').replace(/  /g, '</strong> ')}
                </div>
                
                <button class="btn" onclick="copyToClipboard(this)" data-text="${res.concept.replace(/"/g, '&quot;')}" style="margin-top: 20px; background: white; border: 1.5px solid #ddd; font-size: 0.8rem;">
                    Copiar Concepto
                </button>
            </div>
        `;
        resultDiv.style.display = 'block';
        window.scrollTo({ top: resultDiv.offsetTop - 100, behavior: 'smooth' });
    } catch (e) {
        showToast("Error: " + e.message, "error");
    } finally {
        btn.innerHTML = '<i data-lucide="zap" style="width: 18px;"></i> GENERAR CONCEPTO';
        btn.disabled = false;
        lucide.createIcons();
    }
}

function copyToClipboard(btn) {
    const text = btn.getAttribute('data-text');
    navigator.clipboard.writeText(text).then(() => {
        const original = btn.innerText;
        btn.innerText = '¡Copiado!';
        setTimeout(() => btn.innerText = original, 2000);
    });
}

initAds();
