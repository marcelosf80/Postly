
// Postly V2 — Core Application Logic
let currentSection = 'dashboard';
let currentPostData = {
    content: '',
    image: null,
    platform: 'instagram'
};

document.addEventListener('DOMContentLoaded', () => {
    navigate('dashboard');
});

function navigate(section) {
    currentSection = section;
    updateNavUI();
    const main = document.getElementById('main-content');
    main.innerHTML = '<div class="fade-in"><div class="spinner"></div></div>'; // Loading state

    setTimeout(() => {
        switch(section) {
            case 'dashboard': renderDashboard(); break;
            case 'posts': renderPosts(); break;
            case 'create': renderCreatePost(); break;
            case 'ai': renderAI(); break;
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
            <div style="padding: 20px;">
                <h1 style="font-size: 1.8rem; font-weight: 800; margin-bottom: 5px;">Hola, ${(user && user.name) || 'Marcelo'} 👋</h1>
                <p style="color: var(--text-secondary); font-size: 0.9rem;">Tu estrategia de marketing va por buen camino.</p>
            </div>

            <div class="stats-grid">
                <div class="stat-card">
                    <span class="stat-value" style="color: var(--primary);">${stats.total}</span>
                    <span class="stat-label">Total Posts</span>
                </div>
                <div class="stat-card">
                    <span class="stat-value" style="color: var(--success);">${stats.published}</span>
                    <span class="stat-label">Publicados</span>
                </div>
            </div>

            <div class="card" style="background: linear-gradient(135deg, #1e293b, #0f172a); color: white; border: none;">
                <h3 style="margin-bottom: 10px;">✨ Generador de Ideas IA</h3>
                <p style="font-size: 0.8rem; opacity: 0.8; margin-bottom: 15px;">¿No sabes qué publicar hoy? Deja que nuestra IA te ayude.</p>
                <button class="btn btn-primary" onclick="navigate('ai')" style="background: rgba(255,255,255,0.1); backdrop-filter: blur(5px);">Probar ahora</button>
            </div>

            <div style="padding: 0 20px;">
                <h3 style="margin-bottom: 15px;">Acciones Rápidas</h3>
                <div style="display: flex; gap: 10px; overflow-x: auto; padding-bottom: 10px;">
                    <div class="stat-card" style="min-width: 120px; align-items: center; cursor: pointer;" onclick="navigate('create')">
                        <i data-lucide="plus-circle" style="color: var(--primary);"></i>
                        <span style="font-size: 0.75rem; font-weight: 600;">Nuevo Post</span>
                    </div>
                    <div class="stat-card" style="min-width: 120px; align-items: center; cursor: pointer;" onclick="navigate('ai')">
                        <i data-lucide="sparkles" style="color: var(--accent);"></i>
                        <span style="font-size: 0.75rem; font-weight: 600;">Sugerir Idea</span>
                    </div>
                    <div class="stat-card" style="min-width: 120px; align-items: center; cursor: pointer;">
                        <i data-lucide="bar-chart-3" style="color: var(--secondary);"></i>
                        <span style="font-size: 0.75rem; font-weight: 600;">Ver Reportes</span>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function renderCreatePost() {
    const main = document.getElementById('main-content');
    main.innerHTML = `
        <div class="fade-in">
            <div style="padding: 20px;">
                <h2 style="font-weight: 800;">Crear Publicación</h2>
            </div>

            <div class="card" style="margin-top: 0;">
                <!-- Platform Toggle -->
                <div style="display: flex; gap: 10px; margin-bottom: 20px; background: #f1f5f9; padding: 5px; border-radius: 12px;">
                    <button class="btn btn-sm" id="plat-ig" onclick="setPlatform('instagram')" style="flex: 1; border-radius: 8px; background: white; box-shadow: 0 2px 5px rgba(0,0,0,0.05);">Instagram</button>
                    <button class="btn btn-sm" id="plat-fb" onclick="setPlatform('facebook')" style="flex: 1; border-radius: 8px; background: transparent;">Facebook</button>
                </div>

                <!-- Image Upload Area -->
                <div id="image-upload-area" onclick="document.getElementById('file-input').click()" style="width: 100%; aspect-ratio: 1; background: #f8fafc; border: 2px dashed var(--border); border-radius: 16px; display: flex; flex-direction: column; justify-content: center; align-items: center; gap: 10px; cursor: pointer; overflow: hidden; position: relative;">
                    <i data-lucide="image" style="width: 48px; height: 48px; color: #94a3b8;"></i>
                    <span style="color: #94a3b8; font-size: 0.9rem;">Subir Foto</span>
                    <input type="file" id="file-input" hidden accept="image/*" onchange="handleFile(event)">
                </div>

                <!-- Filters (Hidden until image uploaded) -->
                <div id="filter-section" style="display: none; margin-top: 15px;">
                    <p style="font-size: 0.8rem; font-weight: 700; margin-bottom: 8px;">🎨 Filtros Profesionales</p>
                    <div style="display: flex; gap: 10px; overflow-x: auto; padding: 5px 0; scrollbar-width: none;">
                        <div class="filter-thumb" onclick="applyFilter('none')">Original</div>
                        <div class="filter-thumb" onclick="applyFilter('vintage')" style="filter: sepia(0.5) contrast(1.2) brightness(0.9);">Vintage</div>
                        <div class="filter-thumb" onclick="applyFilter('b-w')" style="filter: grayscale(1);">B&N</div>
                        <div class="filter-thumb" onclick="applyFilter('warm')" style="filter: sepia(0.2) saturate(1.5) brightness(1.1);">Warm</div>
                        <div class="filter-thumb" onclick="applyFilter('cool')" style="filter: hue-rotate(30deg) saturate(1.2);">Cool</div>
                        <div class="filter-thumb" onclick="applyFilter('vibrant')" style="filter: saturate(1.8) contrast(1.1);">Vibrante</div>
                        <div class="filter-thumb" onclick="applyFilter('dramatic')" style="filter: contrast(1.5) brightness(0.8);">Drama</div>
                    </div>
                </div>

                <div style="margin-top: 20px;">
                    <label style="font-size: 0.8rem; font-weight: 700; color: var(--text-secondary);">Contenido del Post</label>
                    <textarea id="post-text" placeholder="Escribe algo creativo..." style="width: 100%; height: 120px; border: 1px solid var(--border); border-radius: 12px; padding: 12px; margin-top: 5px; font-family: inherit; resize: none; font-size: 0.9rem;"></textarea>
                    
                    <div style="display: flex; gap: 8px; margin-top: 10px;">
                        <button class="btn btn-sm" onclick="generateAICaption()" style="background: #f1f5f9; color: var(--primary); font-size: 0.8rem; flex: 1; border-radius: 10px;">✨ IA Texto</button>
                        <button class="btn btn-sm" onclick="generateHashtags()" style="background: #f1f5f9; color: var(--accent); font-size: 0.8rem; flex: 1; border-radius: 10px;"># Hashtags</button>
                    </div>
                </div>

                <button class="btn btn-primary" id="submit-btn" onclick="submitPost()" style="margin-top: 30px; height: 55px; border-radius: 20px; font-size: 1rem; box-shadow: 0 10px 20px rgba(99, 102, 241, 0.2);">Publicar ahora</button>
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
}

function handleFile(e) {
    const file = e.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (event) => {
        currentPostData.image = event.target.result;
        const area = document.getElementById('image-upload-area');
        area.innerHTML = `<img src="${event.target.result}" id="preview-img" style="width: 100%; height: 100%; object-fit: cover;">`;
        document.getElementById('filter-section').style.display = 'block';
    };
    reader.readAsDataURL(file);
}

function applyFilter(filter) {
    currentPostData.filter = filter;
    const img = document.getElementById('preview-img');
    if (!img) return;
    
    // Preview uses CSS filters for speed
    switch(filter) {
        case 'none': img.style.filter = 'none'; break;
        case 'vintage': img.style.filter = 'sepia(0.5) contrast(1.2) brightness(0.9)'; break;
        case 'b-w': img.style.filter = 'grayscale(1) contrast(1.1)'; break;
        case 'warm': img.style.filter = 'sepia(0.2) saturate(1.5) brightness(1.1)'; break;
        case 'cool': img.style.filter = 'hue-rotate(30deg) saturate(1.2) brightness(1.05)'; break;
        case 'vibrant': img.style.filter = 'saturate(1.8) contrast(1.1)'; break;
        case 'dramatic': img.style.filter = 'contrast(1.5) brightness(0.8) saturate(0.8)'; break;
    }

    // Highlight selected
    document.querySelectorAll('.filter-thumb').forEach(t => t.style.borderColor = 'transparent');
    if (event && event.target) {
        event.target.style.borderColor = 'var(--primary)';
    }
}

async function generateAICaption() {
    const text = document.getElementById('post-text').value;
    const btn = event.target;
    const originalText = btn.innerHTML;
    btn.innerHTML = 'Generando...';
    btn.disabled = true;

    try {
        const res = await API.generateCaption(text || 'Marketing digital para mi negocio');
        document.getElementById('post-text').value = res.caption;
    } catch (e) {
        alert("Error de IA: " + e.message);
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
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

    // El sistema ahora es puramente basado en anuncios para cada publicación
    if (window.Capacitor && window.Capacitor.Plugins.AdMob) {
        const confirmAd = confirm("Para publicar gratis, debes ver un anuncio corto. ¿Continuar?");
        if (confirmAd) {
            window.Capacitor.Plugins.AdMob.showRewardedAd();
            return;
        } else {
            return;
        }
    }

    // Si no estamos en entorno móvil, publicamos directo (modo dev)
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
            status: 'published'
        });
        
        alert("¡Publicación exitosa!");
        // Actualizar datos de usuario (créditos) tras publicar
        const profile = await API.getProfile();
        API.setAuth(API.getToken(), profile.user);
        
        navigate('dashboard');
    } catch (e) {
        console.error(e);
        alert("Error al publicar: " + (e.error || e.message));
    } finally {
        btn.innerHTML = 'Publicar ahora';
        btn.disabled = false;
    }
}

// Iniciar ads al cargar
initAds();
