
// Postly V2 — Core Application Logic
let currentSection = 'dashboard';
let cachedPosts = [];
let currentPostData = {
    content: '',
    image: null,
    platform: 'instagram',
    aspect_ratio: 'feed',
    filter: 'none'
};

const PHOTO_FILTERS = {
    'none': { name: 'Original', style: 'none' },
    'vintage': { name: 'Vintage', style: 'sepia(0.5) contrast(1.2) brightness(0.9)' },
    'b-w': { name: 'B&N', style: 'grayscale(1) contrast(1.1)' },
    'warm': { name: 'Cálido', style: 'sepia(0.2) saturate(1.5) brightness(1.1)' },
    'cool': { name: 'Frío', style: 'hue-rotate(30deg) saturate(1.2) brightness(1.05)' },
    'vibrant': { name: 'Vibrante', style: 'saturate(2) contrast(1.1)' },
    'noir': { name: 'Noir', style: 'grayscale(1) contrast(1.5) brightness(0.9)' },
    'golden': { name: 'Dorado', style: 'sepia(0.3) saturate(1.4) brightness(1.1) hue-rotate(-10deg)' },
    'cyberpunk': { name: 'Cyberpunk', style: 'hue-rotate(150deg) saturate(1.6) contrast(1.2)' },
    'lomo': { name: 'Lomo', style: 'contrast(1.3) saturate(1.6) brightness(0.9)' },
    'fade': { name: 'Fade', style: 'brightness(1.1) contrast(0.85) saturate(0.8)' },
    'teal': { name: 'Teal', style: 'hue-rotate(130deg) saturate(1.4) contrast(1.1)' },
    'dramatic': { name: 'Dramático', style: 'contrast(1.5) brightness(0.8) saturate(0.8)' },
    'polaroid': { name: 'Polaroid', style: 'contrast(1.15) brightness(1.1) saturate(0.9) sepia(0.15)' },
    'retro': { name: 'Retro', style: 'sepia(0.3) contrast(1.15) saturate(1.1) hue-rotate(-5deg)' },
    'summer': { name: 'Verano', style: 'saturate(1.4) brightness(1.1) contrast(1.05) sepia(0.05)' },
    'winter': { name: 'Invierno', style: 'hue-rotate(20deg) saturate(0.8) contrast(1.1) brightness(1.05)' },
    'haze': { name: 'Niebla', style: 'brightness(1.15) contrast(0.8) saturate(0.9) sepia(0.05)' },
    'neon': { name: 'Neón', style: 'saturate(2.2) contrast(1.2) hue-rotate(-20deg) brightness(1.1)' },
    'nordic': { name: 'Nórdico', style: 'saturate(0.7) contrast(1.2) brightness(1.02) hue-rotate(10deg)' },
    'velvet': { name: 'Terciopelo', style: 'contrast(1.3) saturate(1.3) sepia(0.1) brightness(0.95)' },
    'sepia-strong': { name: 'Sepia F.', style: 'sepia(0.9) contrast(1.1) brightness(0.95)' },
    'monochrome': { name: 'Monocromo', style: 'grayscale(1) brightness(1.15) contrast(1.25)' },
    'invert': { name: 'Invertir', style: 'invert(1)' },
    'dreamy': { name: 'Ensueño', style: 'brightness(1.1) saturate(1.1) contrast(0.9)' },
    'cinematic': { name: 'Cine', style: 'contrast(1.25) saturate(1.3) sepia(0.15) hue-rotate(-10deg)' },
    'warm-sunset': { name: 'Atardecer', style: 'sepia(0.35) saturate(1.6) brightness(1.08) hue-rotate(-15deg)' },
    'rose-gold': { name: 'Oro Rosa', style: 'sepia(0.25) saturate(1.3) hue-rotate(320deg) brightness(1.05)' },
    'dark-moody': { name: 'Moody', style: 'contrast(1.4) brightness(0.82) saturate(0.85)' },
    'emerald': { name: 'Esmeralda', style: 'hue-rotate(85deg) saturate(1.4) contrast(1.1)' },
    'chrome': { name: 'Cromo', style: 'contrast(1.5) saturate(1.8) brightness(1.05)' },
    'vignette': { name: 'Viñeta', style: 'contrast(1.3) brightness(0.9) saturate(1.2)' },
    'hdr-punch': { name: 'HDR', style: 'contrast(1.45) saturate(1.5) brightness(1.02)' },
    'soft-glow': { name: 'Brillo Suave', style: 'brightness(1.12) contrast(0.92) saturate(1.15)' },
    'vintage-70s': { name: 'Retro 70s', style: 'sepia(0.45) contrast(1.1) saturate(1.25) hue-rotate(-8deg)' }
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

            <button class="btn" id="btn-connect-facebook" onclick="connectWithFacebook()" style="background: #1877f2; color: white; border-radius: 20px; height: 70px; font-weight:800; font-size: 1.2rem; margin-bottom: 12px; box-shadow: 0 10px 25px rgba(24, 119, 242, 0.3);">
                <i data-lucide="facebook"></i> Vincular Fanpage de Meta
            </button>
        </div>
    `;
    lucide.createIcons();
}

window.testLoginBypass = async function() {
    try {
        showToast('Iniciando sesión de prueba...', 'info');
        const res = await fetch('/api/auth/test-bypass', {
            method: 'POST'
        });
        
        const data = await res.json();
        if(!res.ok) throw new Error(data.error || 'Error en bypass');
        
        const { token, user } = data;
        
        if (window.API) {
            window.API.setAuth(token, user);
        } else {
            localStorage.setItem('sp_token', token);
            localStorage.setItem('sp_user', JSON.stringify(user));
        }
        
        navigate('dashboard');
        showToast('Bienvenido en Modo Prueba', 'success');
    } catch(e) {
        showToast(e.message, 'error');
    }
}

// Función main init
async function initApp() {
    console.log("Inicializando Postly V2...");
    
    // Inicializar iconos
    lucide.createIcons();

    // Setup de Capacitor AdMob
    if (window.Capacitor && window.Capacitor.Plugins.AdMob) {
        try {
            await window.Capacitor.Plugins.AdMob.initialize({
                requestTrackingAuthorization: true,
                initializeForTesting: false,
            });
            console.log('[ADMOB] Inicializado correctamente');
            
            const bannerOptions = {
                adId: 'ca-app-pub-5343221992536229/3520448384',
                adSize: 'BANNER',
                position: 'BOTTOM_CENTER',
                margin: 0,
                isTesting: false
            };
            await window.Capacitor.Plugins.AdMob.showBanner(bannerOptions);
            console.log('[ADMOB] Banner mostrado');
        } catch(e) {
            console.error('[ADMOB] Error inicializando o mostrando AdMob:', e);
        }
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
            case 'editor-ia': renderAIPhotoEditor(); break;
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
        cachedPosts = posts;
        
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
                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 12px; padding-top: 12px; border-top: 1px solid #f1f5f9;">
                                        <div style="display: flex; gap: 8px;">
                                            ${post.status !== 'published' ? `
                                                <button onclick="publishPostAction('${post.id}')" style="background: var(--primary); color: white; border: none; border-radius: 12px; padding: 6px 14px; font-size: 0.75rem; cursor: pointer; font-weight: 700; display: flex; align-items: center; gap: 5px;">
                                                    <i data-lucide="send" style="width: 12px;"></i> Publicar
                                                </button>
                                            ` : ''}
                                            <button onclick="deletePostAction('${post.id}')" style="background: #fee2e2; color: #991b1b; border: none; border-radius: 12px; padding: 6px 10px; font-size: 0.75rem; cursor: pointer;">
                                                <i data-lucide="trash-2" style="width: 14px;"></i>
                                            </button>
                                        </div>
                                        <div style="display: flex; align-items: center; gap: 6px; color: var(--text-secondary); font-size: 0.75rem; font-weight:600;">
                                            <i data-lucide="calendar" style="width: 14px;"></i>
                                            <span>${new Date(post.created_at || Date.now()).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    `).join('')}
                </div>
                </div>
            </div>
        `;
        lucide.createIcons();
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
            const imageBase64 = res.imageBase64 || res; // Fallback in case the API was modified to return the string directly
            resultDiv.innerHTML = `
                <img src="${imageBase64}" style="width: 100%; border-radius: 12px; margin-bottom: 10px;">
                <button class="btn btn-sm" onclick="useAIImage('${imageBase64}')" style="background: var(--success); color: white;">Usar en mi Post</button>
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
        <div class="fade-in" style="padding-bottom: 40px;">
            <div style="padding: 24px 20px 16px 20px; display:flex; justify-content:space-between; align-items:center;">
                <div>
                    <h2 style="font-weight: 800; font-size: 1.8rem; letter-spacing: -1px; background: linear-gradient(135deg, #6366f1, #a855f7); -webkit-background-clip: text; -webkit-text-fill-color: transparent;">Crear Publicación</h2>
                    <p style="color: var(--text-secondary); font-size: 0.85rem; font-weight: 500;">Editor Inteligente de Redes Sociales</p>
                </div>
                <span class="ai-badge"><i data-lucide="sparkles" style="width:12px;"></i> IA Activa</span>
            </div>

            <!-- Editor Card -->
            <div class="card" style="margin: 0 20px; padding: 20px; border: 1px solid rgba(255,255,255,0.8); box-shadow: 0 10px 30px rgba(99, 102, 241, 0.08);">
                <!-- Platform Toggle -->
                <div style="display: flex; gap: 8px; margin-bottom: 16px; background: #f1f5f9; padding: 6px; border-radius: 18px;">
                    <button class="btn btn-sm" id="plat-ig" onclick="setPlatform('instagram')" style="flex: 1; border-radius: 14px; background: white; box-shadow: 0 4px 10px rgba(0,0,0,0.05); font-weight: 700;">Instagram</button>
                    <button class="btn btn-sm" id="plat-fb" onclick="setPlatform('facebook')" style="flex: 1; border-radius: 14px; background: transparent; font-weight: 700; color: var(--text-secondary);">Facebook</button>
                </div>

                <!-- Post Type Toggle (Feed vs Stories) -->
                <div style="display: flex; gap: 8px; margin-bottom: 20px;">
                    <button class="btn btn-sm" id="type-feed" onclick="setPostType('feed')" style="flex: 1; border-radius: 12px; background: #f1f5f9; font-weight: 700; border: 1.5px solid var(--primary); color: var(--primary);">
                        <i data-lucide="layout" style="width: 14px;"></i> Feed
                    </button>
                    <button class="btn btn-sm" id="type-story" onclick="setPostType('story')" style="flex: 1; border-radius: 12px; background: #f1f5f9; font-weight: 700; border: 1.5px solid transparent; color: var(--text-secondary);">
                        <i data-lucide="layers" style="width: 14px;"></i> Historia
                    </button>
                </div>

                <!-- Media Source Picker Toolbar -->
                <div class="media-source-picker">
                    <button class="source-btn" onclick="takePhotoFromCamera()" style="background:#f0f7ff; border-color:#bae6fd; color:#0369a1;">
                        <i data-lucide="camera"></i>
                        <span>Cámara</span>
                    </button>
                    <button class="source-btn" onclick="pickPhotoFromGallery()" style="background:#f5f3ff; border-color:#ddd6fe; color:#6d28d9;">
                        <i data-lucide="image"></i>
                        <span>Galería</span>
                    </button>
                    <button class="source-btn" onclick="openNativeEditor()" style="background:#fdf2f8; border-color:#fbcfe8; color:#be185d;">
                        <i data-lucide="sliders"></i>
                        <span>Editor Pro</span>
                    </button>
                </div>

                <!-- Hidden input file -->
                <input type="file" id="file-input" hidden accept="image/*" onchange="handleFile(event)">

                <!-- Realistic Mockup Preview -->
                <div id="realistic-preview" style="margin-bottom: 16px;"></div>

                <!-- Image Controls Row -->
                <div id="image-info-row" style="display:none; justify-content:space-between; align-items:center; background:#f8fafc; padding:12px; border-radius:14px; margin-bottom:20px; border:1px solid #e2e8f0;">
                    <span style="font-size:0.82rem; font-weight:700; color:var(--text-primary);">📷 Foto Cargada</span>
                    <div style="display:flex; gap:8px;">
                        <button class="btn btn-sm" onclick="openNativeEditor()" style="background: linear-gradient(135deg, #6366f1, #8b5cf6); color: white; width:auto; border-radius:10px; padding:6px 12px;">
                            <i data-lucide="sliders" style="width:14px;"></i> Editar Foto
                        </button>
                        <button class="btn btn-sm" onclick="removeImage()" style="background:#fee2e2; color:#b91c1c; width:auto; border-radius:10px; padding:6px 10px;">
                            <i data-lucide="trash-2" style="width:14px;"></i>
                        </button>
                    </div>
                </div>

                <!-- Textarea Editor -->
                <div style="margin-bottom: 20px;">
                    <label style="font-size:0.8rem; font-weight:700; color:var(--text-secondary); display:block; margin-bottom:8px;">Texto de la publicación</label>
                    <textarea id="post-text" oninput="updatePreview()" placeholder="Escribe el texto de tu publicación aquí..." style="width: 100%; min-height: 110px; padding: 14px; border: 1.5px solid var(--border); border-radius: 14px; outline: none; font-family: inherit; font-size: 0.95rem; resize: vertical; line-height: 1.5;"></textarea>
                </div>

                <!-- AI Dynamic Assistant Panel -->
                <div style="background: linear-gradient(135deg, #f8fafc, #f1f5f9); padding: 16px; border-radius: 20px; margin-bottom: 20px; border: 1px solid #e2e8f0;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 10px;">
                        <span style="font-size:0.85rem; font-weight:800; color:#475569; display:flex; align-items:center; gap:6px;">
                            <i data-lucide="bot" style="width:16px; color:#6366f1;"></i> Asistente de Contenido IA
                        </span>
                        <span style="font-size:0.7rem; font-weight:600; color:#10b981;">💡 Horario Sugerido: 18:30 hrs</span>
                    </div>

                    <div style="margin-bottom: 12px;">
                        <input type="text" id="ai-context" placeholder="Dile a la IA sobre qué quieres publicar (ej: Promoción de fin de semana)..." style="width: 100%; border: 1px solid #cbd5e1; padding: 10px 14px; border-radius: 12px; font-size: 0.85rem; outline: none; background: white;">
                    </div>

                    <div style="display: flex; gap: 8px; margin-bottom:12px;">
                        <button class="btn btn-sm" id="btn-ai-suggest" onclick="generateAICaption()" style="background: linear-gradient(135deg, #6366f1, #4f46e5); color: white; font-size: 0.8rem; flex: 1; border-radius: 12px; font-weight: 700; height: 42px;">
                            <i data-lucide="sparkles" style="width: 14px;"></i> Generar Copy con IA
                        </button>
                        <button class="btn btn-sm" onclick="generateHashtags()" style="background: #ffffff; color: #0284c7; border:1px solid #bae6fd; font-size: 0.8rem; border-radius: 12px; font-weight: 700; height: 42px; padding: 0 16px;">
                            <i data-lucide="hash" style="width: 14px;"></i> Hashtags
                        </button>
                    </div>

                    <!-- Instant Tone Quick Actions -->
                    <div style="display:flex; gap:6px; overflow-x:auto; padding-top:4px;">
                        <button class="btn btn-sm" onclick="improveTextWithTone('viral')" style="padding:4px 10px; font-size:0.72rem; background:white; border:1px solid #e2e8f0; color:#475569; border-radius:16px;">🚀 Tono Viral</button>
                        <button class="btn btn-sm" onclick="improveTextWithTone('sales')" style="padding:4px 10px; font-size:0.72rem; background:white; border:1px solid #e2e8f0; color:#475569; border-radius:16px;">🛍️ Modo Ventas</button>
                        <button class="btn btn-sm" onclick="improveTextWithTone('formal')" style="padding:4px 10px; font-size:0.72rem; background:white; border:1px solid #e2e8f0; color:#475569; border-radius:16px;">💼 Profesional</button>
                    </div>
                </div>

                <button class="btn btn-primary" id="submit-btn" onclick="submitPost()" style="height: 60px; border-radius: 18px; font-size: 1.05rem; font-weight: 800;">
                    Publicar ahora <i data-lucide="send" style="width: 18px; margin-left: 8px;"></i>
                </button>
            </div>
        </div>
    `;
    updatePreview();
    lucide.createIcons();
}

function updatePreview() {
    const user = API.getUser() || { name: 'Usuario' };
    const platform = currentPostData.platform || 'instagram';
    const postType = currentPostData.aspect_ratio || 'feed';
    const text = document.getElementById('post-text')?.value || '';
    const image = currentPostData.image;
    const filterKey = currentPostData.filter || 'none';
    const filterStyleVal = PHOTO_FILTERS[filterKey]?.style || 'none';

    const container = document.getElementById('realistic-preview');
    if (!container) return;

    // Actualizar visibilidad en el editor de controles
    const imgInfoRow = document.getElementById('image-info-row');
    if (imgInfoRow) {
        imgInfoRow.style.display = image ? 'flex' : 'none';
    }

    const avatarUrl = user.avatar_url;
    const userName = user.name || 'Usuario';
    const avatarColor = user.avatar_color || '#6366f1';
    const avatarInitial = userName.charAt(0).toUpperCase();

    const avatarHtml = avatarUrl 
        ? `<div style="width: 100%; height: 100%; border-radius: 50%; background-image: url('${avatarUrl}'); background-size: cover; background-position: center;"></div>`
        : `<div style="width: 100%; height: 100%; border-radius: 50%; background: ${avatarColor}; color: white; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 0.8rem;">${avatarInitial}</div>`;

    let innerContent = "";

    if (platform === 'instagram') {
        if (postType === 'story') {
            innerContent = `
                <div class="phone-mockup-header" style="position: absolute; top: 20px; left: 12px; right: 12px; display: flex; align-items: center; gap: 10px; z-index: 10;">
                    <div class="phone-mockup-avatar" style="margin: 0; padding: 0; border: none;">${avatarHtml}</div>
                    <span style="color: white; font-weight: 600; font-size: 0.85rem; text-shadow: 0 2px 4px rgba(0,0,0,0.6);">${userName}</span>
                    <span style="color: rgba(255,255,255,0.6); font-size: 0.75rem; text-shadow: 0 2px 4px rgba(0,0,0,0.6);">Hace un momento</span>
                </div>

                <div class="phone-mockup-image" style="position: absolute; inset: 0; width: 100%; height: 100%; background: #121212;">
                    ${image 
                        ? `<img id="pv-image" src="${image}" style="width:100%; height:100%; object-fit:cover; filter: ${filterStyleVal};" onclick="document.getElementById('file-input').click()">` 
                        : `<div onclick="document.getElementById('file-input').click()" style="width:100%; height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#777; cursor:pointer; gap: 8px;">
                            <i data-lucide="image-plus" style="width:36px; height:36px; color:var(--primary);"></i>
                            <span style="font-size:0.75rem; font-weight:600;">Subir Imagen</span>
                           </div>`}
                </div>
                
                <div style="position: absolute; top: 10px; left: 10px; right: 10px; height: 2px; background: rgba(255,255,255,0.2); border-radius: 2px; z-index: 10;">
                    <div style="width: 75%; height: 100%; background: white; border-radius: 2px;"></div>
                </div>

                ${text ? `
                <div style="position: absolute; bottom: 80px; left: 50%; transform: translateX(-50%); width: 85%; max-height: 120px; background: rgba(0,0,0,0.75); color: white; padding: 12px 16px; border-radius: 12px; font-size: 0.85rem; font-weight: 700; text-align: center; display: flex; align-items: center; justify-content: center; backdrop-filter: blur(4px); box-shadow: 0 8px 24px rgba(0,0,0,0.2); z-index: 10;">
                    <p style="margin: 0; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; word-break: break-word;">${text}</p>
                </div>
                ` : ''}

                <div class="phone-mockup-actions" style="position: absolute; bottom: 15px; left: 12px; right: 12px; display: flex; align-items: center; gap: 16px; z-index: 10; background: transparent; padding: 0;">
                    <div style="flex: 1; height: 40px; border: 1px solid rgba(255,255,255,0.4); border-radius: 20px; background: rgba(0,0,0,0.25); display: flex; align-items: center; padding: 0 12px; color: rgba(255,255,255,0.6); font-size: 0.75rem;">
                        Enviar mensaje...
                    </div>
                    <i data-lucide="heart" style="color: white; width: 22px; height: 22px;"></i>
                    <i data-lucide="send" style="color: white; width: 22px; height: 22px;"></i>
                </div>
            `;
        } else {
            innerContent = `
                <div class="phone-mockup-header">
                    <div class="phone-mockup-avatar">${avatarHtml}</div>
                    <div style="display:flex; flex-direction:column;">
                        <span class="phone-mockup-username">${userName}</span>
                        <span style="font-size: 0.7rem; color: #8e8e8e;">Original audio</span>
                    </div>
                    <i data-lucide="more-horizontal" style="margin-left: auto; color: #262626; width: 18px;"></i>
                </div>
                
                <div class="phone-mockup-image">
                    ${image 
                        ? `<img id="pv-image" src="${image}" style="width:100%; height:100%; object-fit:cover; filter: ${filterStyleVal};" onclick="document.getElementById('file-input').click()">` 
                        : `<div onclick="document.getElementById('file-input').click()" style="width:100%; height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#cbd5e1; cursor:pointer; gap: 8px;">
                            <i data-lucide="image-plus" style="width:36px; height:36px; color:var(--primary);"></i>
                            <span style="font-size:0.75rem; font-weight:600; color: #8e8e8e;">Subir Imagen</span>
                           </div>`}
                </div>

                <div class="phone-mockup-actions">
                    <i data-lucide="heart" style="color: #262626; width: 22px; height: 22px; cursor: pointer;"></i>
                    <i data-lucide="message-circle" style="color: #262626; width: 22px; height: 22px; cursor: pointer;"></i>
                    <i data-lucide="send" style="color: #262626; width: 22px; height: 22px; cursor: pointer;"></i>
                    <i data-lucide="bookmark" style="margin-left: auto; color: #262626; width: 22px; height: 22px; cursor: pointer;"></i>
                </div>

                <div style="padding: 0 16px 4px 16px; font-weight: 700; font-size: 0.8rem; color: #262626;">
                    Le gusta a tu_marca y a otras personas
                </div>

                <div class="phone-mockup-caption" style="padding-top: 0;">
                    <span class="caption-username-prefix" style="font-weight: 700; margin-right: 6px;">${userName}</span>
                    <span style="word-break: break-word;">${text || 'Tu texto aparecerá aquí...'}</span>
                </div>
            `;
        }
    } else {
        innerContent = `
            <div class="phone-mockup-header" style="border-bottom: none; padding-bottom: 8px;">
                <div class="phone-mockup-avatar" style="background: transparent; padding: 0;">
                    <div style="width:100%; height:100%; border-radius:50%; overflow:hidden;">${avatarHtml}</div>
                </div>
                <div style="display:flex; flex-direction:column;">
                    <span class="phone-mockup-username" style="display:flex; align-items:center; gap:4px;">
                        ${userName} <i data-lucide="check-circle" style="width:14px; height:14px; fill:#1877f2; color:white;"></i>
                    </span>
                    <div style="display:flex; align-items:center; gap:4px; color:#65676b; font-size:0.7rem; font-weight: 400;">
                        <span>Hace un momento</span>
                        <span>•</span>
                        <i data-lucide="globe" style="width:10px; height:10px;"></i>
                    </div>
                </div>
                <i data-lucide="more-horizontal" style="margin-left: auto; color: #65676b; width: 20px;"></i>
            </div>
            
            <div class="phone-mockup-caption" style="padding: 0 16px 12px 16px; font-size: 0.85rem; color: #050505;">
                ${text || 'Escribe algo aquí...'}
            </div>

            <div class="phone-mockup-image" style="height: ${postType === 'vertical' ? '400px' : '220px'};">
                ${image 
                    ? `<img id="pv-image" src="${image}" style="width:100%; height:100%; object-fit:cover; filter: ${filterStyleVal};" onclick="document.getElementById('file-input').click()">` 
                    : `<div onclick="document.getElementById('file-input').click()" style="width:100%; height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; color:#cbd5e1; cursor:pointer; gap: 8px;">
                        <i data-lucide="image-plus" style="width:36px; height:36px; color:var(--primary);"></i>
                        <span style="font-size:0.75rem; font-weight:600; color: #65676b;">Subir Imagen</span>
                       </div>`}
            </div>

            <div style="padding: 8px 16px; display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #e2e8f0; font-size: 0.75rem; color: #65676b;">
                <div style="display:flex; align-items:center; gap:4px;">
                    <span style="background:#1877f2; color:white; border-radius:50%; width:14px; height:14px; display:flex; align-items:center; justify-content:center; font-size:8px;">👍</span>
                    <span style="background:#e1306c; color:white; border-radius:50%; width:14px; height:14px; display:flex; align-items:center; justify-content:center; font-size:8px;">❤️</span>
                    <span>42</span>
                </div>
                <div>
                    <span>8 comentarios</span>
                    <span style="margin: 0 4px;">•</span>
                    <span>2 compartidos</span>
                </div>
            </div>

            <div class="phone-mockup-actions" style="padding: 6px; display: flex; justify-content: space-around; align-items: center; background: #ffffff;">
                <button style="flex:1; background:none; border:none; height:32px; border-radius:6px; display:flex; align-items:center; justify-content:center; gap:6px; color:#65676b; font-weight:600; font-size:0.75rem; cursor:pointer;">
                    <i data-lucide="thumbs-up" style="width: 16px;"></i> Me gusta
                </button>
                <button style="flex:1; background:none; border:none; height:32px; border-radius:6px; display:flex; align-items:center; justify-content:center; gap:6px; color:#65676b; font-weight:600; font-size:0.75rem; cursor:pointer;">
                    <i data-lucide="message-square" style="width: 16px;"></i> Comentar
                </button>
                <button style="flex:1; background:none; border:none; height:32px; border-radius:6px; display:flex; align-items:center; justify-content:center; gap:6px; color:#65676b; font-weight:600; font-size:0.75rem; cursor:pointer;">
                    <i data-lucide="share-2" style="width: 16px;"></i> Compartir
                </button>
            </div>
        `;
    }

    container.innerHTML = `
        <div class="phone-mockup-wrapper">
            <div class="phone-mockup ${platform === 'facebook' ? 'platform-facebook' : ''} format-${postType}">
                <div class="phone-mockup-screen">
                    ${innerContent}
                </div>
            </div>
        </div>
    `;

    lucide.createIcons();
}

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
                <button onclick="document.getElementById('manual-config').style.display = document.getElementById('manual-config').style.display === 'none' ? 'block' : 'none'" style="width:100%; background:none; border:none; color:var(--text-secondary); font-size:0.8rem; cursor:pointer; margin-bottom:10px; display:flex; align-items:center; justify-content:center; gap:5px;">
                    <i data-lucide="chevron-down" style="width:14px;"></i> Configuración Avanzada
                </button>
                
                <div id="manual-config" style="display:none; padding-bottom:15px; border-bottom:1px solid var(--border); margin-bottom:15px;">
                    <div style="display:flex; flex-direction:column; gap:10px;">
                        <div>
                            <label style="font-size:0.7rem; font-weight:600; color:var(--text-secondary); display:block; margin-bottom:4px;">Instagram Page ID</label>
                            <input type="text" id="set-ig-page" class="input" style="padding:8px 12px; font-size:0.85rem;" value="${user.ig_page_id || ''}" placeholder="Ej: 1784140...">
                        </div>
                        <div>
                            <label style="font-size:0.7rem; font-weight:600; color:var(--text-secondary); display:block; margin-bottom:4px;">Instagram Token</label>
                            <input type="password" id="set-ig-token" class="input" style="padding:8px 12px; font-size:0.85rem;" value="${user.ig_access_token || ''}" placeholder="EAAf...">
                        </div>
                        <div style="margin-top:5px;">
                            <label style="font-size:0.7rem; font-weight:600; color:var(--text-secondary); display:block; margin-bottom:4px;">Facebook Page ID</label>
                            <input type="text" id="set-fb-page" class="input" style="padding:8px 12px; font-size:0.85rem;" value="${user.fb_page_id || ''}" placeholder="Ej: 38118...">
                        </div>
                        <div>
                            <label style="font-size:0.7rem; font-weight:600; color:var(--text-secondary); display:block; margin-bottom:4px;">Facebook Token</label>
                            <input type="password" id="set-fb-token" class="input" style="padding:8px 12px; font-size:0.85rem;" value="${user.fb_access_token || ''}" placeholder="EAAf...">
                        </div>
                        <button class="btn-primary" onclick="handleSaveSocialConfig()" style="margin-top:10px; padding:10px;">Guardar Configuración</button>
                    </div>
                </div>

                <button class="btn" onclick="logout()" style="background: transparent; color: var(--danger); border: 1px solid var(--danger); padding:10px;">Cerrar Sesión</button>
            </div>
        </div>
    `;
}

async function handleSaveSocialConfig() {
    try {
        const payload = {
            ig_page_id: document.getElementById('set-ig-page').value,
            ig_access_token: document.getElementById('set-ig-token').value,
            fb_page_id: document.getElementById('set-fb-page').value,
            fb_access_token: document.getElementById('set-fb-token').value
        };

        const res = await API.updateProfile(payload);
        localStorage.setItem('sp_user', JSON.stringify(res.user));
        showToast('Configuración guardada correctamente', 'success');
        renderSettings();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function publishPostAction(postId) {
    try {
        showToast('Publicando post...', 'info');
        await API.publishPost(postId);
        showToast('¡Post publicado exitosamente!', 'success');
        if (currentSection === 'posts') renderPosts();
    } catch (err) {
        showToast(err.message, 'error');
        if (currentSection === 'posts') renderPosts();
    }
}

async function deletePostAction(postId) {
    if (!confirm('¿Estás seguro de eliminar este post?')) return;
    try {
        const post = cachedPosts.find(p => p.id === postId);
        const localUri = post ? post.local_image_uri : null;

        await API.deletePost(postId);

        if (localUri && window.Capacitor && window.Capacitor.Plugins.NativeUI) {
            try {
                showToast('Eliminando imagen del celular...', 'info');
                await window.Capacitor.Plugins.NativeUI.deleteFromGallery({ uri: localUri });
            } catch (err) {
                console.error("Failed to delete local image from mobile gallery:", err);
            }
        }

        showToast('Post eliminado', 'success');
        if (currentSection === 'posts') renderPosts();
    } catch (err) {
        showToast(err.message, 'error');
    }
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

function setPlatform(plat) {
    currentPostData.platform = plat;
    document.getElementById('plat-ig').style.background = plat === 'instagram' ? 'white' : 'transparent';
    document.getElementById('plat-fb').style.background = plat === 'facebook' ? 'white' : 'transparent';
    document.getElementById('plat-ig').style.boxShadow = plat === 'instagram' ? '0 2px 5px rgba(0,0,0,0.05)' : 'none';
    document.getElementById('plat-fb').style.boxShadow = plat === 'facebook' ? '0 2px 5px rgba(0,0,0,0.05)' : 'none';
    document.getElementById('plat-ig').style.color = plat === 'instagram' ? 'var(--text-primary)' : 'var(--text-secondary)';
    document.getElementById('plat-fb').style.color = plat === 'facebook' ? 'var(--text-primary)' : 'var(--text-secondary)';
    updatePreview();
}

function setPostType(type) {
    currentPostData.aspect_ratio = type;
    document.getElementById('type-feed').style.borderColor = type === 'feed' ? 'var(--primary)' : 'transparent';
    document.getElementById('type-story').style.borderColor = type === 'story' ? 'var(--primary)' : 'transparent';
    document.getElementById('type-feed').style.color = type === 'feed' ? 'var(--primary)' : 'var(--text-secondary)';
    document.getElementById('type-story').style.color = type === 'story' ? 'var(--primary)' : 'var(--text-secondary)';
    
    updatePreview();
}

function handleFile(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            const maxDim = 800;
            if (width > maxDim || height > maxDim) {
                if (width > height) {
                    height = Math.round(height * (maxDim / width));
                    width = maxDim;
                } else {
                    width = Math.round(width * (maxDim / height));
                    height = maxDim;
                }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
            
            currentPostData.image = compressedBase64;
            updatePreview();
            updateFilterThumbnails();
            generateAICaption();
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function removeImage() {
    currentPostData.image = null;
    currentPostData.filter = 'none';
    
    updatePreview();
    updateFilterThumbnails();
    
    const filterSection = document.getElementById('filter-section');
    if(filterSection) filterSection.style.display = 'none';
}

function handleTextTyping() {
    const text = document.getElementById('post-text').value;
    const btnAi = document.getElementById('btn-ai-suggest');
    if (!btnAi) return;
    
    if (text.length > 5) {
        btnAi.innerHTML = '<i data-lucide="sparkles" style="width: 14px;"></i> Reescribir con IA';
    } else {
        btnAi.innerHTML = '<i data-lucide="sparkles" style="width: 14px;"></i> Generar Sugerencia IA';
    }
    lucide.createIcons();
}

async function takePhotoFromCamera() {
    try {
        if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Camera) {
            const image = await window.Capacitor.Plugins.Camera.getPhoto({
                quality: 90,
                allowEditing: true,
                resultType: 'dataUrl',
                source: 'CAMERA'
            });
            if (image && image.dataUrl) {
                currentPostData.image = image.dataUrl;
                updatePreview();
                showImageControls();
            }
        } else {
            const fileInput = document.getElementById('file-input');
            if (fileInput) {
                fileInput.setAttribute('capture', 'environment');
                fileInput.click();
            }
        }
    } catch (err) {
        console.log('[Camera] Error taking photo:', err);
    }
}

async function pickPhotoFromGallery() {
    try {
        if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.Camera) {
            const image = await window.Capacitor.Plugins.Camera.getPhoto({
                quality: 90,
                allowEditing: true,
                resultType: 'dataUrl',
                source: 'PHOTOS'
            });
            if (image && image.dataUrl) {
                currentPostData.image = image.dataUrl;
                updatePreview();
                showImageControls();
            }
        } else {
            const fileInput = document.getElementById('file-input');
            if (fileInput) {
                fileInput.removeAttribute('capture');
                fileInput.click();
            }
        }
    } catch (err) {
        console.log('[Gallery] Error picking photo:', err);
    }
}

function toggleFilterSection() {
    const sec = document.getElementById('filter-section');
    if (sec) {
        sec.style.display = sec.style.display === 'none' ? 'block' : 'none';
    }
}

function updateImageAdjustments() {
    const brightness = document.getElementById('slider-brightness')?.value || 100;
    const contrast = document.getElementById('slider-contrast')?.value || 100;
    const saturation = document.getElementById('slider-saturation')?.value || 100;

    if (document.getElementById('val-brightness')) document.getElementById('val-brightness').innerText = `${brightness}%`;
    if (document.getElementById('val-contrast')) document.getElementById('val-contrast').innerText = `${contrast}%`;
    if (document.getElementById('val-saturation')) document.getElementById('val-saturation').innerText = `${saturation}%`;

    currentPostData.adjustments = {
        brightness: parseInt(brightness),
        contrast: parseInt(contrast),
        saturation: parseInt(saturation)
    };

    const img = document.getElementById('pv-image');
    if (img) {
        const baseFilter = PHOTO_FILTERS[currentPostData.filter]?.style || 'none';
        const adjStyle = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
        img.style.filter = baseFilter === 'none' ? adjStyle : `${baseFilter} ${adjStyle}`;
    }
}

async function openNativeEditor() {
    if (currentPostData.image) {
        PhotoEditor.openEditorModal(currentPostData.image, (editedBase64) => {
            currentPostData.image = editedBase64;
            currentPostData.filter = 'none'; // reset filter key since changes are baked into base64
            updatePreview();
            showToast('Imagen editada correctamente', 'success');
        });
    } else {
        showToast('Primero selecciona una imagen', 'warning');
    }
}

function updateFilterThumbnails() {
    const listContainer = document.getElementById('filter-thumbnails-list');
    if (!listContainer) return;

    listContainer.innerHTML = Object.keys(PHOTO_FILTERS).map(key => {
        const f = PHOTO_FILTERS[key];
        const isSelected = currentPostData.filter === key || (key === 'none' && !currentPostData.filter);
        return `
            <div class="filter-thumb-container" 
                 onclick="applyFilter('${key}')" 
                 style="position: relative; min-width: 75px; height: 75px; border-radius: 14px; border: 3px solid ${isSelected ? 'var(--primary)' : 'transparent'}; overflow: hidden; cursor: pointer; transition: all 0.2s; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
                <div style="width: 100%; height: 100%; background: #64748b; filter: ${f.style}; background-image: url('${currentPostData.image || './assets/img/logo.png'}'); background-size: cover; background-position: center;"></div>
                <span style="position: absolute; bottom: 4px; left: 0; right: 0; text-align: center; color: white; text-shadow: 0 1px 4px rgba(0,0,0,0.9); font-size: 0.65rem; font-weight: 800; letter-spacing: -0.2px;">${f.name}</span>
            </div>
        `;
    }).join('');
}

function applyFilter(filter) {
    currentPostData.filter = filter;
    const img = document.getElementById('pv-image');
    const filterStyleVal = PHOTO_FILTERS[filter]?.style || 'none';
    if (img) img.style.filter = filterStyleVal;
    
    updateFilterThumbnails();
}

async function generateAICaption() {
    const contextText = document.getElementById('ai-context') ? document.getElementById('ai-context').value : '';
    const mainText = document.getElementById('post-text').value;
    
    // Si el usuario escribió algo en el post-text, lo sumamos como contexto adicional para "reescribir"
    const descriptionToSend = contextText + (mainText ? " (Texto actual del post para reescribir/mejorar: " + mainText + ")" : "");
    
    const btn = document.getElementById('btn-ai-suggest');
    const originalText = btn ? btn.innerHTML : '';
    if (btn) {
        btn.innerHTML = 'Generando...';
        btn.disabled = true;
    }

    try {
        const res = await API.generateCaption(descriptionToSend, {
            imageBase64: currentPostData.image
        });
        document.getElementById('post-text').value = res.caption;
    } catch (e) {
        showToast("Error de IA: " + e.message, "error");
    } finally {
        if (btn) {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
        handleTextTyping(); // Update button state to "Reescribir" if text is filled
        lucide.createIcons();
    }
}

async function generateHashtags() {
    const text = document.getElementById('post-text').value;
    const btn = event ? event.currentTarget : null;
    const originalText = btn ? btn.innerHTML : '';
    if (btn) {
        btn.innerHTML = 'Generando...';
        btn.disabled = true;
    }

    try {
        const res = await API.generateHashtags(text || 'Marketing digital', currentPostData.image || null);
        document.getElementById('post-text').value += "\n\n" + res.hashtags;
        updatePreview();
    } catch (e) {
        showToast("Error de IA: " + e.message, "error");
    } finally {
        if (btn) {
            btn.innerHTML = originalText;
            btn.disabled = false;
        }
        lucide.createIcons();
    }
}

async function improveTextWithTone(tone) {
    const currentText = document.getElementById('post-text').value;
    if (!currentText.trim()) {
        showToast('Escribe un texto o idea previa para adaptar el tono', 'warning');
        return;
    }

    showToast(`Optimizando texto en modo ${tone}...`, 'info');
    try {
        const promptText = `Reescribe el siguiente texto en tono ${tone.toUpperCase()}: "${currentText}"`;
        const res = await API.improveText(promptText);
        if (res && res.improved) {
            document.getElementById('post-text').value = res.improved;
            updatePreview();
            showToast('¡Texto optimizado con éxito!', 'success');
        }
    } catch (e) {
        showToast('Error al adaptar tono: ' + e.message, 'error');
    }
}

function drawTextOnImage(base64Src, text) {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            
            // Dibujar la imagen base
            ctx.drawImage(img, 0, 0);
            
            const padding = Math.max(20, Math.floor(img.width * 0.05));
            const maxTextWidth = img.width - (padding * 2);
            const fontSize = Math.max(18, Math.floor(img.width * 0.04));
            
            ctx.font = `bold ${fontSize}px "Outfit", "Inter", "Arial", sans-serif`;
            ctx.textBaseline = 'top';
            
            const words = text.split(' ');
            const lines = [];
            let currentLine = '';
            
            for (let n = 0; n < words.length; n++) {
                if (words[n].includes('\n')) {
                    const subParts = words[n].split('\n');
                    for (let i = 0; i < subParts.length; i++) {
                        let testLine = currentLine + (currentLine ? ' ' : '') + subParts[i];
                        let metrics = ctx.measureText(testLine);
                        if (metrics.width > maxTextWidth && currentLine) {
                            lines.push(currentLine);
                            currentLine = subParts[i];
                        } else {
                            currentLine = testLine;
                        }
                        if (i < subParts.length - 1) {
                            lines.push(currentLine);
                            currentLine = '';
                        }
                    }
                } else {
                    let testLine = currentLine + (currentLine ? ' ' : '') + words[n];
                    let metrics = ctx.measureText(testLine);
                    if (metrics.width > maxTextWidth && currentLine) {
                        lines.push(currentLine);
                        currentLine = words[n];
                    } else {
                        currentLine = testLine;
                    }
                }
            }
            if (currentLine) lines.push(currentLine);
            
            const lineHeight = fontSize * 1.35;
            const textBlockHeight = lines.length * lineHeight;
            
            const startX = padding;
            const startY = img.height - textBlockHeight - padding - Math.floor(img.height * 0.1);
            
            ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
            const radius = Math.floor(fontSize * 0.4);
            const boxPaddingX = Math.floor(fontSize * 0.6);
            const boxPaddingY = Math.floor(fontSize * 0.4);
            
            const boxX = startX - boxPaddingX > 10 ? startX - boxPaddingX : 10;
            const boxY = startY - boxPaddingY;
            const boxWidth = Math.min(maxTextWidth + (boxPaddingX * 2), img.width - (boxX * 2));
            const boxHeight = textBlockHeight + (boxPaddingY * 2);
            
            ctx.beginPath();
            if (typeof ctx.roundRect === 'function') {
                ctx.roundRect(boxX, boxY, boxWidth, boxHeight, radius);
            } else {
                ctx.rect(boxX, boxY, boxWidth, boxHeight);
            }
            ctx.fill();
            
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'left';
            lines.forEach((line, index) => {
                ctx.fillText(line, startX, startY + (index * lineHeight));
            });
            
            resolve(canvas.toDataURL('image/jpeg', 0.9));
        };
        img.onerror = () => resolve(base64Src);
        img.src = base64Src;
    });
}

async function submitPost() {
    finalizePostSubmission();
}

async function finalizePostSubmission() {
    const content = document.getElementById('post-text').value;
    const btn = document.getElementById('submit-btn');
    btn.innerHTML = '<div class="spinner" style="margin:0; width:20px; height:20px; border-width:2px;"></div>';
    btn.disabled = true;

    try {
        let finalImage = currentPostData.image;
        
        if (currentPostData.image && (currentPostData.filter !== 'none' || currentPostData.adjustments)) {
            finalImage = await PhotoEditor.processImage(currentPostData.image, currentPostData.filter || 'none', currentPostData.adjustments || {});
        }

        // Si es historia de Instagram, Meta no soporta texto en el caption. Dibujamos el texto en la imagen.
        if (currentPostData.aspect_ratio === 'story' && content && currentPostData.platform !== 'facebook') {
            showToast('Añadiendo texto a la historia...', 'info');
            finalImage = await drawTextOnImage(finalImage, content);
        }

        // --- Muro de Publicidad ---
        showToast('Preparando anuncio patrocinado...', 'info');
        
        await new Promise((resolve, reject) => {
            if (!window.Capacitor || !window.Capacitor.Plugins.AdMob) {
                // Simular anuncio en entorno web
                const modal = document.createElement('div');
                modal.innerHTML = `
                    <div style="position:fixed; top:0; left:0; right:0; bottom:0; background:rgba(0,0,0,0.9); z-index:9999; display:flex; flex-direction:column; align-items:center; justify-content:center; color:white; padding: 20px;">
                        <h2 style="margin-bottom:20px;">Anuncio Patrocinado</h2>
                        <p style="margin-bottom:30px; opacity:0.8; text-align: center;">Por favor espera 3 segundos para publicar...</p>
                        <button id="btn-skip-ad" class="btn" style="background:#444; color:white; padding:10px 30px; border-radius:20px;" disabled>Esperando...</button>
                    </div>
                `;
                document.body.appendChild(modal);
                let count = 3;
                const btnSkip = document.getElementById('btn-skip-ad');
                const interval = setInterval(() => {
                    count--;
                    if (count <= 0) {
                        clearInterval(interval);
                        btnSkip.innerHTML = 'Continuar y Publicar';
                        btnSkip.style.background = 'var(--primary)';
                        btnSkip.disabled = false;
                        btnSkip.onclick = () => {
                            document.body.removeChild(modal);
                            resolve();
                        };
                    } else {
                        btnSkip.innerHTML = `Esperando... (${count})`;
                    }
                }, 1000);
            } else {
                const AdMob = window.Capacitor.Plugins.AdMob;
                
                AdMob.addListener('onRewardedVideoAdLoaded', () => {
                    AdMob.showRewardVideoAd().catch(reject);
                });
                
                AdMob.addListener('onRewardedVideoAdFailedToLoad', (err) => {
                    console.error('Ad failed to load', err);
                    resolve();
                });

                AdMob.addListener('onRewardedVideoAdRewarded', () => {});

                AdMob.addListener('onRewardedVideoAdDismissed', () => {
                    resolve();
                });

                AdMob.prepareRewardVideoAd({ adId: 'ca-app-pub-3940256099942544/5224354917' })
                    .catch(e => {
                        console.error('Error preparando ad', e);
                        resolve();
                    });
            }
        });

        // --- Proceso de Publicación ---
        showToast('Publicando en la red social...', 'info');

        let localImageUri = null;
        if (window.Capacitor && window.Capacitor.Plugins.NativeUI && finalImage) {
            try {
                showToast('Guardando en la galería...', 'info');
                const saveRes = await window.Capacitor.Plugins.NativeUI.saveToGallery({ image: finalImage });
                if (saveRes && saveRes.uri) {
                    localImageUri = saveRes.uri;
                }
            } catch (err) {
                console.error("Failed to save to device gallery:", err);
                showToast("No se pudo guardar copia local: " + err.message, "warning");
            }
        }

        const res = await API.createPost({
            content: content,
            image_base64: finalImage,
            platform: currentPostData.platform,
            aspect_ratio: currentPostData.aspect_ratio,
            status: 'published',
            local_image_uri: localImageUri
        });
        
        if (res && res.message) {
            alert(res.message);
        } else {
            alert("¡Publicación exitosa!");
        }
        
        navigate('dashboard');
    } catch (e) {
        console.error("[PUBLISH ERROR]", e);
        showToast(e.message || "Error al publicar", "error");
        alert("Error al publicar: " + (e.message || "Problema de conexión"));
    } finally {
        btn.innerHTML = 'Publicar ahora <i data-lucide="send" style="width: 20px; margin-left: 8px;"></i>';
        btn.disabled = false;
        lucide.createIcons();
    }
}

async function renderAIPhotoEditor() {
    const main = document.getElementById('main-content');
    
    main.innerHTML = `
        <div class="fade-in" style="padding: 20px 16px;">
            <div style="display: flex; align-items: center; gap: 12px; margin-bottom: 24px;">
                <div style="background: var(--primary); color: white; width: 40px; height: 40px; border-radius: 12px; display: flex; align-items: center; justify-content: center;">
                    <i data-lucide="wand-2"></i>
                </div>
                <div>
                    <h2 style="font-weight: 800; font-size: 1.5rem; margin: 0;">Retoque IA</h2>
                    <p style="font-size: 0.8rem; color: var(--text-secondary); margin: 0;">Edita tus fotos usando Inteligencia Artificial</p>
                </div>
            </div>

            <div class="card" style="padding: 20px; border-radius: 24px; margin-bottom: 20px;">
                <h3 style="font-size: 1rem; margin-bottom: 16px; font-weight: 700;">1. Sube la foto original</h3>
                <div id="editor-images-area" onclick="document.getElementById('editor-file').click()" style="border: 2px dashed var(--border); border-radius: 20px; padding: 30px 20px; text-align: center; cursor: pointer; transition: all 0.2s;">
                    <i data-lucide="image-plus" style="width: 32px; height: 32px; color: var(--primary); margin-bottom: 10px;"></i>
                    <p style="font-size: 0.9rem; font-weight: 600;">Selecciona una foto para editar</p>
                    <p style="font-size: 0.75rem; color: var(--text-secondary);">Fotos de personas, productos o paisajes</p>
                    <input type="file" id="editor-file" accept="image/*" style="display: none;" onchange="handleEditorFile(this)">
                </div>
                <div id="editor-preview-container" style="display: none; margin-top: 16px; position: relative;">
                    <img id="editor-original-preview" style="width: 100%; max-height: 250px; object-fit: contain; border-radius: 14px; border: 1.5px solid var(--border);">
                    <button onclick="removeEditorFile(event)" style="position: absolute; top: 10px; right: 10px; background: rgba(239, 68, 68, 0.9); color: white; border: none; width: 32px; height: 32px; border-radius: 50%; display: flex; align-items: center; justify-content: center; cursor: pointer;">
                        <i data-lucide="trash" style="width: 16px;"></i>
                    </button>
                </div>
            </div>

            <div class="card" style="padding: 20px; border-radius: 24px; margin-bottom: 20px;">
                <h3 style="font-size: 1rem; margin-bottom: 16px; font-weight: 700;">2. Indicaciones de Edición</h3>
                <textarea id="editor-prompt" placeholder="Ej: 'Ponle un traje formal de negocios', 'Cambia el fondo por una playa soleada', 'Añade lentes de sol y una sonrisa'..." style="width: 100%; padding: 14px; border: 1.5px solid var(--border); border-radius: 14px; outline: none; font-family: inherit; resize: vertical; min-height: 100px; font-size: 0.9rem;"></textarea>
            </div>

            <button class="btn btn-primary" id="btn-process-editor" onclick="processAIPhotoEdit()" style="height: 60px; border-radius: 20px; font-weight: 800; font-size: 1rem; box-shadow: 0 10px 20px rgba(99, 102, 241, 0.2);">
                <i data-lucide="sparkles" style="width: 18px;"></i> APLICAR RETOQUE IA
            </button>

            <div id="editor-result" style="margin-top: 24px; display: none;"></div>
        </div>
    `;
    lucide.createIcons();
}

let editorImageBase64 = null;

function handleEditorFile(input) {
    const file = input.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;
            const maxDim = 800;
            if (width > maxDim || height > maxDim) {
                if (width > height) {
                    height = Math.round(height * (maxDim / width));
                    width = maxDim;
                } else {
                    width = Math.round(width * (maxDim / height));
                    height = maxDim;
                }
            }
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            ctx.drawImage(img, 0, 0, width, height);
            const compressedBase64 = canvas.toDataURL('image/jpeg', 0.7);
            
            editorImageBase64 = compressedBase64;
            document.getElementById('editor-original-preview').src = compressedBase64;
            document.getElementById('editor-images-area').style.display = 'none';
            document.getElementById('editor-preview-container').style.display = 'block';
            lucide.createIcons();
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

function removeEditorFile(event) {
    if (event) event.stopPropagation();
    editorImageBase64 = null;
    document.getElementById('editor-file').value = '';
    document.getElementById('editor-images-area').style.display = 'block';
    document.getElementById('editor-preview-container').style.display = 'none';
    lucide.createIcons();
}

async function processAIPhotoEdit() {
    const btn = document.getElementById('btn-process-editor');
    const prompt = document.getElementById('editor-prompt').value.trim();
    const resultDiv = document.getElementById('editor-result');

    if (!editorImageBase64) {
        showToast("Sube una foto primero", "warning");
        return;
    }
    if (!prompt) {
        showToast("Escribe las indicaciones de edición", "warning");
        return;
    }

    btn.innerHTML = 'Procesando Retoque IA...';
    btn.disabled = true;
    resultDiv.style.display = 'none';

    try {
        const res = await API.generateImage(prompt, editorImageBase64);
        
        if (res.imageBase64) {
            resultDiv.innerHTML = `
                <div class="card fade-in" style="padding: 20px; border-radius: 24px; background: #fafafa; border: 2px solid #eee; margin-top:0;">
                    <h3 style="color: var(--primary); font-weight: 800; margin-bottom: 15px;">Foto Retocada con IA</h3>
                    <div style="border-radius: 20px; overflow: hidden; box-shadow: 0 10px 25px rgba(0,0,0,0.1); border: 1px solid #e2e8f0; background: #fafafa; margin-bottom: 16px;">
                        <img src="${res.imageBase64}" id="editor-result-img" style="width: 100%; max-height: 400px; object-fit: contain; display: block; background: black;">
                    </div>
                    <button class="btn btn-primary" onclick="useEditedPhoto('${res.imageBase64}')" style="width:100%; border-radius:12px; height: 50px; font-weight:700; font-size:1rem;">
                        <i data-lucide="check"></i> Usar esta Foto en mi Post
                    </button>
                </div>
            `;
            resultDiv.style.display = 'block';
            window.scrollTo({ top: resultDiv.offsetTop - 100, behavior: 'smooth' });
        } else {
            throw new Error("No se pudo obtener la imagen editada.");
        }
    } catch (e) {
        showToast("Error: " + e.message, "error");
    } finally {
        btn.innerHTML = '<i data-lucide="sparkles" style="width: 18px;"></i> APLICAR RETOQUE IA';
        btn.disabled = false;
        lucide.createIcons();
    }
}

window.useEditedPhoto = function(base64) {
    currentPostData.image = base64;
    navigate('create');
    setTimeout(() => {
        updatePreview();
    }, 500);
};


function copyToClipboard(btn) {
    const text = btn.getAttribute('data-text');
    navigator.clipboard.writeText(text).then(() => {
        const original = btn.innerText;
        btn.innerText = '¡Copiado!';
        setTimeout(() => btn.innerText = original, 2000);
    });
}

initAds();

async function handleSaveSocialConfig() {
    try {
        const payload = {
            ig_page_id: document.getElementById('set-ig-page').value,
            ig_access_token: document.getElementById('set-ig-token').value,
            fb_page_id: document.getElementById('set-fb-page').value,
            fb_access_token: document.getElementById('set-fb-token').value
        };

        const res = await API.updateProfile(payload);
        localStorage.setItem('sp_user', JSON.stringify(res.user));
        showToast('Configuración guardada correctamente', 'success');
        renderSettings();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

// Duplicate functions removed
