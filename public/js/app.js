// public/js/app.js — Dashboard SPA Logic

// === Auth Check ===
const token = API.getToken();
const currentUser = API.getUser();

if (!token || !currentUser) {
    window.location.href = '/login';
}

// === State ===
let currentSection = 'overview';
let postsCache = [];
let currentImageBase64 = null;

// === Init ===
document.addEventListener('DOMContentLoaded', () => {
    initUserInfo();
    navigateTo('overview');
    if (typeof lucide !== 'undefined') {
        lucide.createIcons();
    }
});

async function initUserInfo() {
    if (!currentUser) return;
    
    // UI Elements
    const nameEl = document.getElementById('user-name');
    const planEl = document.getElementById('user-plan');
    const avatarEl = document.getElementById('user-avatar');

    // 1. Render immediate data from Cache
    renderUserData(currentUser);

    // 2. Fetch fresh data from Server to update Cache
    try {
        const data = await API.getProfile();
        const freshUser = data.user;
        
        // Update Cache
        localStorage.setItem('sp_user', JSON.stringify(freshUser));
        Object.assign(currentUser, freshUser);
        
        // Render again with fresh data
        renderUserData(freshUser);
    } catch (err) {
        console.warn('[APP] Error al sincronizar perfil:', err.message);
    }

    if (currentUser.onboarding_completed === false) {
        const overlay = document.getElementById('onboarding-overlay');
        if (overlay) overlay.classList.add('active');
    }
}

function renderUserData(user) {
    const nameEl = document.getElementById('user-name');
    const planEl = document.getElementById('user-plan');
    const avatarEl = document.getElementById('user-avatar');

    if (nameEl) nameEl.textContent = user.name || 'Usuario';
    if (planEl) planEl.textContent = `Plan ${(user.plan || 'free').charAt(0).toUpperCase() + (user.plan || 'free').slice(1)}`;
    if (avatarEl) {
        if (user.avatar_url) {
            avatarEl.innerHTML = `<img src="${user.avatar_url}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;" onerror="this.onerror=null; this.parentElement.innerHTML='${(user.name || 'U').charAt(0).toUpperCase()}'; this.parentElement.style.background='${user.avatar_color || 'var(--primary)'}';">`;
            avatarEl.style.background = 'transparent';
        } else {
            avatarEl.textContent = (user.name || 'U').charAt(0).toUpperCase();
            avatarEl.style.background = user.avatar_color || 'var(--gradient-primary)';
            avatarEl.innerHTML = (user.name || 'U').charAt(0).toUpperCase();
        }
    }

    // Toggle admin link based on User Role
    const adminLink = document.getElementById('admin-link');
    if (adminLink) {
        adminLink.style.display = user.is_admin ? 'flex' : 'none';
    }
}

// === Navigation ===
function navigateTo(section) {
    currentSection = section;

    // Update sidebar active state
    document.querySelectorAll('.sidebar-link').forEach(link => {
        link.classList.toggle('active', link.dataset.section === section);
    });

    // Close mobile sidebar
    document.getElementById('sidebar').classList.remove('open');

    // Update page title
    const titles = {
        overview: 'Dashboard',
        posts: 'Mis Posts',
        create: 'Crear Post',
        calendar: 'Calendario',
        ai: 'IA Assistant',
        brand: 'Mi Marca',
        settings: 'Configuración',
        billing: '💳 Planes y Precios',
        admin: '🛡️ Administración'
    };
    document.getElementById('page-title').textContent = titles[section] || 'Dashboard';

    // Render section
    const renderers = {
        overview: renderOverview,
        posts: renderPosts,
        create: renderCreatePost,
        calendar: renderCalendar,
        ai: renderAI,
        brand: renderBrand,
        settings: renderSettings,
        billing: renderBilling,
        admin: renderAdmin
    };

    const renderer = renderers[section];
    if (renderer) renderer();

    // Refresh icons
    if (typeof lucide !== 'undefined') {
        setTimeout(() => lucide.createIcons(), 50);
    }
}

function toggleSidebar() {
    document.getElementById('sidebar').classList.toggle('open');
}

function logout() {
    API.clearAuth();
    window.location.href = '/login';
}

// === Toast Notifications ===
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icons = { success: 'check-circle', error: 'x-circle', warning: 'alert-triangle', info: 'info' };
    const iconName = icons[type] || 'info';
    toast.innerHTML = `<i data-lucide="${iconName}" style="width:18px;height:18px;"></i> ${message}`;
    container.appendChild(toast);
    if (typeof lucide !== 'undefined') lucide.createIcons();
    setTimeout(() => {
        toast.classList.add('toast-exit');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// === Modal ===
function openModal(html) {
    document.getElementById('modal-content').innerHTML = html;
    document.getElementById('modal-overlay').classList.add('active');
}

function closeModal(e) {
    if (e && e.target !== e.currentTarget) return;
    document.getElementById('modal-overlay').classList.remove('active');
}

// === Onboarding ===
async function handleOnboarding(e) {
    if (e) e.preventDefault();
    const btn = document.getElementById('ob-btn');
    btn.disabled = true;
    btn.textContent = 'Guardando...';

    const payload = {
        account_type: document.getElementById('ob-account-type').value,
        business_type: document.getElementById('ob-type').value,
        target_audience: document.getElementById('ob-audience').value,
        brand_voice: document.getElementById('ob-voice').value
    };

    try {
        const res = await fetch('/api/auth/onboarding', {
            method: 'POST',
            headers: { 
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(payload)
        });

        const data = await res.json();
        if (!res.ok) throw new Error(data.error || 'Error al guardar el perfil');

        localStorage.setItem('sp_user', JSON.stringify(data.user));
        Object.assign(currentUser, data.user);
        
        document.getElementById('onboarding-overlay').classList.remove('active');
        showToast('¡Perfil completado con éxito!', 'success');
        
    } catch(err) {
        showToast(err.message, 'error');
        btn.disabled = false;
        btn.textContent = 'Comenzar a usar la app';
    }
}

// === Dynamic Labels ===
function updateOnboardingLabels(type) {
    const labelType = document.getElementById('label-ob-type');
    const labelAudience = document.getElementById('label-ob-audience');
    const inputType = document.getElementById('ob-type');
    const inputAudience = document.getElementById('ob-audience');

    if (type === 'personal') {
        labelType.textContent = 'Tu Actividad, Arte o Especialidad';
        inputType.placeholder = 'Ej: Fotografía de bodas, Música urbana, Fitness Coach';
        labelAudience.textContent = '¿Quién es tu comunidad / seguidores?';
        inputAudience.placeholder = 'Ej: Personas interesadas en vida sana de 20 a 40 años';
    } else {
        labelType.textContent = 'Tipo de Negocio / Rubro';
        inputType.placeholder = 'Ej: Venta de artículos deportivos';
        labelAudience.textContent = '¿A quién le vendes? (Público Objetivo)';
        inputAudience.placeholder = 'Ej: Deportistas amateurs de 18 a 35 años';
    }
}

// === Help Modal ===
function showHelp(topic) {
    const helpData = {
        'ig-page': {
            title: 'Encontrar tu Instagram Page ID',
            text: `
                <p>Para que la IA publique en Instagram, necesitamos el ID numérico de tu cuenta <strong>Business</strong>:</p>
                <ol style="margin-top:10px; padding-left:20px;">
                    <li>Entra a tu FanPage de Facebook vinculada a Instagram.</li>
                    <li>Ve a <strong>Panel para profesionales</strong> > <strong>Cuentas vinculadas</strong>.</li>
                    <li>Si no lo ves ahí, la forma más infalible es entrar al <strong><a href="https://developers.facebook.com/tools/explorer/" target="_blank">Meta Explorer</a></strong>, poner <code>me/accounts?fields=instagram_business_account</code> y darle a Submit.</li>
                </ol>
            `
        },
        'fb-page': {
            title: 'Encontrar tu Facebook Page ID',
            text: `
                <p>El ID de tu página de Facebook es muy fácil de encontrar:</p>
                <ol style="margin-top:10px; padding-left:20px;">
                    <li>Entra a tu página de Facebook.</li>
                    <li>Haz clic en la pestaña <strong>Información</strong>.</li>
                    <li>Baja hasta el final y verás el <strong>ID de la página</strong> (un número largo).</li>
                </ol>
            `
        },
        'meta-token': {
            title: 'Obtener tu Access Token',
            text: `
                <p>Es la "llave" que usa Postly para publicar por ti:</p>
                <ol style="margin-top:10px; padding-left:20px;">
                    <li>Entra al <strong><a href="https://developers.facebook.com/tools/explorer/" target="_blank">Meta Graph Explorer</a></strong>.</li>
                    <li>Selecciona tu App y dale permisos: <code>instagram_basic</code>, <code>instagram_content_publish</code>, <code>pages_show_list</code>.</li>
                    <li>Haz clic en <strong>Generate Token</strong>.</li>
                    <li>Copia ese token y pégalo aquí. ¡Recuerda guardarlo!</li>
                </ol>
            `
        }
    };

    const data = helpData[topic] || { title: 'Ayuda', text: 'Información no disponible.' };
    
    openModal(`
        <div class="modal-header">
            <h3 class="modal-title" style="display:flex; align-items:center; gap:8px;"><i data-lucide="help-circle" style="width:20px; height:20px; color:var(--primary);"></i> ${data.title}</h3>
            <button class="modal-close" onclick="closeModal(event)">✕</button>
        </div>
        <div style="line-height:1.6; color:var(--text-secondary); font-size:14px;">
            ${data.text}
        </div>
        <button class="btn btn-primary btn-sm" style="width:100%; margin-top:24px;" onclick="closeModal()">Entendido</button>
    `);
}

// === Utility ===
function formatDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function statusBadge(status) {
    const map = {
        draft: { class: 'badge-info', label: 'Borrador' },
        scheduled: { class: 'badge-warning', label: 'Programado' },
        published: { class: 'badge-success', label: 'Publicado' },
        failed: { class: 'badge-danger', label: 'Falló' }
    };
    const s = map[status] || { class: '', label: status };
    return `<span class="badge ${s.class}">${s.label}</span>`;
}

function platformIcon(platform) {
    const map = { 
        instagram: '<i data-lucide="instagram" style="width:14px;height:14px;vertical-align:middle;"></i>', 
        facebook: '<i data-lucide="facebook" style="width:14px;height:14px;vertical-align:middle;"></i>', 
        twitter: '<i data-lucide="twitter" style="width:14px;height:14px;vertical-align:middle;"></i>' 
    };
    return map[platform] || '<i data-lucide="smartphone" style="width:14px;height:14px;vertical-align:middle;"></i>';
}

// ============================================
// SECTION RENDERERS
// ============================================

// === OVERVIEW ===
async function renderOverview() {
    const body = document.getElementById('main-body');
    body.innerHTML = `
        <div class="stats-grid">
            <div class="stat-card"><div><div class="stat-value skeleton" style="width:60px;height:32px;"></div><div class="stat-label">Total Posts</div></div><div class="stat-icon" style="background:rgba(102,126,234,0.12)"><i data-lucide="file-text"></i></div></div>
            <div class="stat-card"><div><div class="stat-value skeleton" style="width:60px;height:32px;"></div><div class="stat-label">Este Mes</div></div><div class="stat-icon" style="background:rgba(0,212,255,0.12)"><i data-lucide="calendar"></i></div></div>
            <div class="stat-card"><div><div class="stat-value skeleton" style="width:60px;height:32px;"></div><div class="stat-label">Publicados</div></div><div class="stat-icon" style="background:rgba(16,185,129,0.12)"><i data-lucide="check-circle"></i></div></div>
            <div class="stat-card"><div><div class="stat-value skeleton" style="width:60px;height:32px;"></div><div class="stat-label">Programados</div></div><div class="stat-icon" style="background:rgba(245,158,11,0.12)"><i data-lucide="clock"></i></div></div>
        </div>
        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:var(--space-lg);">
            <div>
                <h3 style="margin-bottom:var(--space-md);">Posts Recientes</h3>
                <div id="recent-posts"><div class="skeleton" style="height:200px;"></div></div>
            </div>
            <div>
                <h3 style="margin-bottom:var(--space-md);">Acciones Rápidas</h3>
                <div style="display:grid;gap:var(--space-sm);">
                    <button class="card card-glow" style="text-align:left;cursor:pointer;border:1px solid var(--border);background:var(--bg-card);" onclick="navigateTo('create')">
                        <div style="display:flex;align-items:center;gap:12px;">
                            <span style="font-size:24px; color:var(--primary);"><i data-lucide="plus-square"></i></span>
                            <div><strong>Crear Post</strong><br><small class="text-muted">Publicar o programar contenido</small></div>
                        </div>
                    </button>
                    <button class="card card-glow" style="text-align:left;cursor:pointer;border:1px solid var(--border);background:var(--bg-card);" onclick="navigateTo('ai')">
                        <div style="display:flex;align-items:center;gap:12px;">
                            <span style="font-size:24px; color:var(--accent);"><i data-lucide="sparkles"></i></span>
                            <div><strong>Generar con IA</strong><br><small class="text-muted">Captions, hashtags e ideas</small></div>
                        </div>
                    </button>
                    <button class="card card-glow" style="text-align:left;cursor:pointer;border:1px solid var(--border);background:var(--bg-card);" onclick="navigateTo('settings')">
                        <div style="display:flex;align-items:center;gap:12px;">
                            <span style="font-size:24px; color:var(--purple);"><i data-lucide="link"></i></span>
                            <div><strong>Conectar Redes</strong><br><small class="text-muted">Instagram, Facebook</small></div>
                        </div>
                    </button>
                </div>
            </div>
        </div>
    `;

    try {
        const stats = await API.getPostStats();
        const cards = body.querySelectorAll('.stat-card .stat-value');
        const values = [stats.total, stats.this_month, stats.published, stats.scheduled];
        cards.forEach((card, i) => {
            card.classList.remove('skeleton');
            card.style.width = 'auto';
            card.style.height = 'auto';
            card.textContent = values[i] || 0;
        });

        // Load recent posts
        const postsData = await API.getPosts({ limit: 5 });
        const recentDiv = document.getElementById('recent-posts');
        if (postsData.posts.length === 0) {
            recentDiv.innerHTML = `
                <div class="empty-state" style="padding:40px 20px;">
                    <div class="empty-state-icon">📭</div>
                    <div class="empty-state-title">Sin posts todavía</div>
                    <div class="empty-state-text">Creá tu primer post para empezar</div>
                    <button class="btn btn-primary btn-sm" onclick="navigateTo('create')">Crear Post</button>
                </div>
            `;
        } else {
            recentDiv.innerHTML = postsData.posts.map(post => `
                <div class="post-card" style="margin-bottom:8px; padding:16px; cursor:pointer;" onclick="viewPost('${post.id}')">
                    <div class="post-content" style="flex:1;">
                        <div class="post-meta">
                            ${platformIcon(post.platform)} ${post.platform}
                            ${statusBadge(post.status)}
                            <span>${formatDate(post.created_at)}</span>
                        </div>
                        <div class="post-text" style="-webkit-line-clamp:2;">${post.content || '<em>Sin texto</em>'}</div>
                    </div>
                </div>
            `).join('');
        }
    } catch (error) {
        showToast(error.message, 'error');
    }
}

// === POSTS LIST ===
async function renderPosts() {
    const body = document.getElementById('main-body');
    body.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-lg);">
            <div class="tabs">
                <button class="tab active" onclick="filterPosts(null, this)">Todos</button>
                <button class="tab" onclick="filterPosts('draft', this)">Borradores</button>
                <button class="tab" onclick="filterPosts('scheduled', this)">Programados</button>
                <button class="tab" onclick="filterPosts('published', this)">Publicados</button>
            </div>
            <button class="btn btn-primary btn-sm" onclick="navigateTo('create')">➕ Nuevo Post</button>
        </div>
        <div class="posts-list" id="posts-list">
            <div class="skeleton" style="height:100px;margin-bottom:8px;"></div>
            <div class="skeleton" style="height:100px;margin-bottom:8px;"></div>
            <div class="skeleton" style="height:100px;"></div>
        </div>
    `;

    await loadPosts();
}

async function loadPosts(statusFilter = null) {
    try {
        const params = {};
        if (statusFilter) params.status = statusFilter;

        const data = await API.getPosts(params);
        postsCache = data.posts;
        const list = document.getElementById('posts-list');

        if (data.posts.length === 0) {
            list.innerHTML = `
                <div class="empty-state">
                    <div class="empty-state-icon"><i data-lucide="inbox"></i></div>
                    <div class="empty-state-title">No hay posts${statusFilter ? ' con este filtro' : ''}</div>
                    <div class="empty-state-text">Creá tu primer post para empezar a publicar</div>
                    <button class="btn btn-primary" onclick="navigateTo('create')">Crear Post</button>
                </div>
            `;
            return;
        }

        list.innerHTML = data.posts.map(post => `
            <div class="post-card">
                ${post.image_path ? `<img src="${post.image_path}" class="post-image" alt="Post image">` : ''}
                <div class="post-content">
                    <div class="post-meta">
                        ${platformIcon(post.platform)} ${post.platform}
                        ${statusBadge(post.status)}
                        <span>${formatDate(post.created_at)}</span>
                        ${post.scheduled_at ? `<span>📅 ${formatDate(post.scheduled_at)}</span>` : ''}
                    </div>
                    <div class="post-text">${post.content || '<em>Sin texto</em>'}</div>
                    ${post.hashtags ? `<div style="font-size:12px;color:var(--primary-light);margin-bottom:8px;">${post.hashtags}</div>` : ''}
                    <div class="post-actions">
                        ${post.status === 'draft' ? `<button class="btn btn-primary btn-sm" onclick="publishPostAction('${post.id}')">🚀 Publicar</button>` : ''}
                        ${post.status === 'draft' ? `<button class="btn btn-outline btn-sm" onclick="schedulePostAction('${post.id}')">📅 Programar</button>` : ''}
                        <button class="btn btn-ghost btn-sm" onclick="editPost('${post.id}')">✏️ Editar</button>
                        <button class="btn btn-ghost btn-sm" onclick="deletePostAction('${post.id}')" style="color:var(--danger);">🗑️</button>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (error) {
        showToast(error.message, 'error');
    }
}

function filterPosts(status, btn) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    if (btn) btn.classList.add('active');
    loadPosts(status);
}

function viewPost(id) {
    const post = postsCache.find(p => p.id === id);
    if (!post) return;
    openModal(`
        <div class="modal-header">
            <h3 class="modal-title">${platformIcon(post.platform)} Post ${statusBadge(post.status)}</h3>
            <button class="modal-close" onclick="closeModal(event)">✕</button>
        </div>
        ${post.image_path ? `<img src="${post.image_path}" style="width:100%;border-radius:var(--radius-md);margin-bottom:16px;" alt="">` : ''}
        <p style="white-space:pre-wrap;line-height:1.7;margin-bottom:16px;">${post.content || 'Sin contenido'}</p>
        ${post.hashtags ? `<p style="color:var(--primary-light);font-size:13px;margin-bottom:16px;">${post.hashtags}</p>` : ''}
        <div style="font-size:12px;color:var(--text-muted);">
            Creado: ${formatDate(post.created_at)}
            ${post.scheduled_at ? `<br>Programado: ${formatDate(post.scheduled_at)}` : ''}
            ${post.published_at ? `<br>Publicado: ${formatDate(post.published_at)}` : ''}
        </div>
    `);
}

async function publishPostAction(id) {
    if (!confirm('¿Publicar este post ahora?')) return;
    try {
        await API.publishPost(id);
        showToast('Post publicado exitosamente', 'success');
        loadPosts();
    } catch (error) {
        showToast(error.message, 'error');
    }
}

async function schedulePostAction(id) {
    const dt = prompt('Fecha y hora de publicación (YYYY-MM-DD HH:MM):');
    if (!dt) return;
    try {
        const scheduled_at = new Date(dt.replace(' ', 'T')).toISOString();
        await API.schedulePost(id, scheduled_at);
        showToast('Post programado', 'success');
        loadPosts();
    } catch (error) {
        showToast(error.message, 'error');
    }
}

async function deletePostAction(id) {
    if (!confirm('¿Eliminar este post? Esta acción no se puede deshacer.')) return;
    try {
        await API.deletePost(id);
        showToast('Post eliminado', 'success');
        loadPosts();
    } catch (error) {
        showToast(error.message, 'error');
    }
}

function editPost(id) {
    navigateTo('create');
    // Load post data into form after render
    setTimeout(async () => {
        try {
            const data = await API.getPost(id);
            const post = data.post;
            document.getElementById('post-content').value = post.content || '';
            document.getElementById('post-platform').value = post.platform || 'instagram';
            document.getElementById('post-hashtags').value = post.hashtags || '';
            const aspectSelect = document.getElementById('post-aspect-ratio');
            if (aspectSelect) {
                aspectSelect.value = post.aspect_ratio || 'feed';
                // Trigger mockup update
                changeMockupAspectRatio({ target: { value: aspectSelect.value } });
            }
            // Store edit mode
            document.getElementById('create-post-form').dataset.editId = id;
            document.querySelector('#main-body h2').textContent = 'Editar Post';
        } catch (error) {
            showToast(error.message, 'error');
        }
    }, 100);
}

// === CREATE POST ===
function renderCreatePost() {
    const body = document.getElementById('main-body');
    const userName = currentUser ? (currentUser.brand_name || currentUser.name || 'usuario') : 'usuario';
    body.innerHTML = `
        <div class="dual-column-layout">
            <!-- Left Column: Form -->
            <div class="create-post-form-full">
                <h2 style="margin-bottom:var(--space-lg); font-size:20px;">Escribir Publicación</h2>

                <form id="create-post-form" onsubmit="handleCreatePost(event)">
                    <div class="form-group" style="margin-bottom: var(--space-xl);">
                        <label class="form-label" style="text-transform:none; font-size:14px;">Foto del Trabajo (Arrastrar o Clickeá)</label>
                        <div class="image-upload-zone" id="upload-zone" onclick="document.getElementById('post-image').click()" style="padding:var(--space-4xl) var(--space-md);">
                            <div class="upload-icon">
                                <svg width="48" height="48" viewBox="0 0 24 24" fill="#9ca3c4" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M4 16L8.586 11.414C8.96106 11.0391 9.46967 10.8284 10 10.8284C10.5303 10.8284 11.0389 11.0391 11.414 11.414L16 16M14 14L15.586 12.414C15.9611 12.0391 16.4697 11.8284 17 11.8284C17.5303 11.8284 18.0389 12.0391 18.414 12.414L20 14M14 8H14.01M6 20H18C19.1046 20 20 19.1046 20 18V6C20 4.89543 19.1046 4 18 4H6C4.89543 4 4 4.89543 4 6V18C4 19.1046 4.89543 20 6 20Z" stroke="none" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                                </svg>
                            </div>
                            <div class="upload-text" style="font-size:18px; color:var(--text-primary); font-weight:500; margin-bottom:8px;">Sube una foto acá</div>
                            <div class="upload-text">Recomendado formato Cuadrado (1:1) o Vertical (4:5)</div>
                        </div>
                        <input type="file" id="post-image" accept="image/*,video/*" style="display:none;" onchange="previewImage(event); updateMockupImage(event)">
                    </div>

                    <div class="form-group">
                        <label class="form-label" style="text-transform:none;">Pista para la IA (Opcional)</label>
                        <input type="text" id="post-pista" class="form-input" placeholder="Ej: Es un corpóreo de polyfan gigante">
                    </div>

                    <div class="form-group">
                        <label class="form-label" style="text-transform:none;">Motor de IA</label>
                        <div style="display:flex;justify-content:space-between;gap:var(--space-md);margin-bottom:var(--space-md);">
                            <button type="button" class="btn btn-outline" style="flex:1;" onclick="aiGenerateWithHint('caption')">⭐ Escribir Texto</button>
                            <button type="button" class="btn btn-outline" style="flex:1;" onclick="aiGenerateWithHint('hashtags')"># Generar Hashtags</button>
                        </div>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Contenido / Caption</label>
                        <textarea id="post-content" class="form-textarea" rows="5" placeholder="Escribí el caption de tu publicación..." oninput="updateMockupCaption(event)"></textarea>
                    </div>

                    <div class="form-group" style="display:flex;gap:var(--space-md);">
                        <div style="flex:1;">
                            <label class="form-label">Plataforma</label>
                            <select id="post-platform" class="form-select" onchange="changeMockupPlatform(event)">
                                <option value="instagram">📸 Instagram</option>
                                <option value="facebook">📘 Facebook</option>
                            </select>
                        </div>
                        <div style="flex:1;">
                            <label class="form-label">Formato (Aspect Ratio)</label>
                            <select id="post-aspect-ratio" class="form-select" onchange="changeMockupAspectRatio(event)">
                                <option value="feed">Feed Cuadrado (1:1)</option>
                                <option value="vertical">Feed Vertical (4:5)</option>
                                <option value="story">Historia / Reel (9:16)</option>
                            </select>
                        </div>
                    </div>

                    <input type="hidden" id="post-hashtags" value="">
                    
                    <div id="ai-inline-result" style="display:none;" class="ai-result">
                        <div id="ai-inline-text"></div>
                        <div class="ai-result-actions">
                            <button type="button" class="btn btn-primary btn-sm" onclick="useAIResult()">✓ Usar este texto</button>
                            <button type="button" class="btn btn-outline btn-sm" onclick="aiGenerateWithHint(lastAIType)">🔄 Otra sugerencia</button>
                            <button type="button" class="btn btn-ghost btn-sm" onclick="document.getElementById('ai-inline-result').style.display='none'">✕ Descartar</button>
                        </div>
                    </div>

                    <div style="display:flex;gap:var(--space-md);margin-top:var(--space-xl);">
                        <button type="button" class="btn btn-primary" style="flex:1;" onclick="handleCreateAndPublish()">Publicar Inmediato</button>
                        <button type="button" class="btn btn-outline" style="flex:1;">🕒 Programar</button>
                    </div>
                </form>
            </div>

            <!-- Right Column: Mockup -->
            <div class="phone-mockup-wrapper">
                <h3 style="margin-bottom:var(--space-lg); font-size:18px; font-weight:500;">Vista Previa (Instagram)</h3>
                
                <div class="phone-mockup">
                    <div class="phone-mockup-screen">
                        <div class="phone-mockup-header">
                            <div class="phone-mockup-avatar">
                                <div class="phone-mockup-avatar-inner" style="display:flex;align-items:center;justify-content:center;color:white;font-size:12px;font-weight:700;">${userName.charAt(0).toUpperCase()}</div>
                            </div>
                            <div class="phone-mockup-username">
                                <div class="mockup-username-text">${userName}</div>
                                <div class="mockup-fb-time" style="display:none; font-size:11px; color:#64748b; font-weight:400; margin-top:2px;">Justo ahora · 🌎</div>
                            </div>
                            <div style="margin-left:auto; color:#94a3b8; letter-spacing:2px; font-weight:700; margin-top:-8px;">...</div>
                        </div>
                        <div class="phone-mockup-image" id="mockup-img-container">
                            <svg width="60" height="60" viewBox="0 0 24 24" fill="#9ca3c4" xmlns="http://www.w3.org/2000/svg">
                                <path d="M4 16L8.586 11.414C8.96106 11.0391 9.46967 10.8284 10 10.8284C10.5303 10.8284 11.0389 11.0391 11.414 11.414L16 16M14 14L15.586 12.414C15.9611 12.0391 16.4697 11.8284 17 11.8284C17.5303 11.8284 18.0389 12.0391 18.414 12.414L20 14M14 8H14.01M6 20H18C19.1046 20 20 19.1046 20 18V6C20 4.89543 19.1046 4 18 4H6C4.89543 4 4 4.89543 4 6V18C4 19.1046 4.89543 20 6 20Z" stroke="none"/>
                            </svg>
                        </div>
                        <div class="phone-mockup-actions">
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1e293b" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1e293b" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1e293b" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1e293b" stroke-width="2" style="margin-left:auto;"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
                        </div>
                        <div class="phone-mockup-caption">
                            <span class="caption-username-prefix" style="font-weight:600;margin-right:4px;">${userName}</span><span id="mockup-caption-text">Tu publicación aparecerá aquí...</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;
}

function changeMockupPlatform(event) {
    const platform = event.target.value;
    const mockup = document.querySelector('.phone-mockup');
    const title = document.querySelector('.phone-mockup-wrapper h3');
    
    if (platform === 'facebook') {
        mockup.classList.add('platform-facebook');
        title.textContent = 'Vista Previa (Facebook)';
        document.querySelector('.phone-mockup-actions').innerHTML = `
            <div style="display:flex; justify-content:space-between; width:100%; border-top:1px solid #e2e8f0; padding-top:12px; color:#64748b; font-weight:600; font-size:13px;">
                <div style="display:flex; align-items:center; justify-content:center; gap:6px; flex:1;"><svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"></path></svg> Me gusta</div>
                <div style="display:flex; align-items:center; justify-content:center; gap:6px; flex:1;"><svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg> Comentar</div>
                <div style="display:flex; align-items:center; justify-content:center; gap:6px; flex:1;"><svg width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M17 3v4M21 13V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h8m4-4l3 3m0-3l-3-3m3 3h-8"></path></svg> Compartir</div>
            </div>`;
    } else {
        mockup.classList.remove('platform-facebook');
        title.textContent = 'Vista Previa (Instagram)';
        document.querySelector('.phone-mockup-actions').innerHTML = `
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1e293b" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"></path></svg>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1e293b" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1e293b" stroke-width="2"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1e293b" stroke-width="2" style="margin-left:auto;"><path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path></svg>
        `;
    }
}

function changeMockupAspectRatio(event) {
    const format = event.target.value;
    const mockup = document.querySelector('.phone-mockup');
    
    mockup.classList.remove('format-story', 'format-vertical');
    
    if (format === 'story') {
        mockup.classList.add('format-story');
    } else if (format === 'vertical') {
        mockup.classList.add('format-vertical');
    }
}

function updateMockupImage(event) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        const container = document.getElementById('mockup-img-container');
        if(container) {
            if (file.type.startsWith('video/')) {
                container.innerHTML = `<video src="${e.target.result}" style="width:100%;height:100%;object-fit:cover;" autoplay loop muted playsinline></video>`;
            } else {
                container.innerHTML = `<img src="${e.target.result}" style="width:100%;height:100%;object-fit:cover;">`;
            }
        }
    };
    reader.readAsDataURL(file);
}

function updateMockupCaption(event) {
    let valStr = '';
    if (event && event.target) {
        valStr = event.target.value;
    } else if (typeof event === 'string') {
        valStr = event;
    }
    
    const cEl = document.getElementById('mockup-caption-text');
    if (cEl) {
        // preserve newlines
        cEl.innerHTML = (valStr || 'Tu publicación aparecerá aquí...').replace(/\n/g, '<br>');
    }
}

let lastAIType = 'caption';

async function aiGenerateWithHint(type) {
    lastAIType = type;
    const hint = document.getElementById('post-pista').value;
    const resultDiv = document.getElementById('ai-inline-result');
    const resultText = document.getElementById('ai-inline-text');

    resultDiv.style.display = 'block';
    resultText.innerHTML = '<div style="display:flex;align-items:center;gap:8px;"><span class="spinner"></span> Generando con IA...</div>';

    try {
        let result = '';
        if (type === 'caption') {
            const desc = hint || prompt('¿Sobre qué es el post? (Deja en blanco si quieres que la IA escriba basada en la foto)');
            if (!desc && !currentImageBase64) { resultDiv.style.display = 'none'; return; }
            const data = await API.generateCaption(desc, { imageBase64: currentImageBase64 });
            result = data.caption;
            lastAIField = 'content';
        } else if (type === 'hashtags') {
            const desc = hint || prompt('¿Sobre qué tema generar hashtags?');
            if (!desc) { resultDiv.style.display = 'none'; return; }
            const data = await API.generateHashtags(desc);
            result = data.hashtags;
            lastAIField = 'append'; // We will append hashtags to the text
        }
        resultText.textContent = result;
    } catch (error) {
        resultText.textContent = '❌ ' + error.message;
        showToast(error.message, 'error');
    }
}

function previewImage(event) {
    const file = event.target.files[0];
    if (!file) return;
    const zone = document.getElementById('upload-zone');
    const reader = new FileReader();
    reader.onload = (e) => {
        const isVideo = file.type.startsWith('video/');
        currentImageBase64 = isVideo ? null : e.target.result; // Store base64 for Vision API only if image
        zone.classList.add('has-image');
        zone.style.padding = '8px';
        
        let mediaHtml = isVideo 
            ? `<video src="${e.target.result}" style="width:100%; max-height:400px; object-fit:contain; border-radius:var(--radius-md);" autoplay loop muted></video>`
            : `<img src="${e.target.result}" style="width:100%; max-height:400px; object-fit:contain; border-radius:var(--radius-md);" alt="Preview">`;
            
        zone.innerHTML = `${mediaHtml}
                          <div style="margin-top:8px;"><small class="text-muted" style="text-decoration:underline;">Click para cambiar</small></div>`;
    };
    reader.readAsDataURL(file);
}

let lastAIField = 'content';

async function aiGenerateForPost(type) {
    const content = document.getElementById('post-content').value;
    const resultDiv = document.getElementById('ai-inline-result');
    const resultText = document.getElementById('ai-inline-text');

    resultDiv.style.display = 'block';
    resultText.innerHTML = '<div style="display:flex;align-items:center;gap:8px;"><span class="spinner"></span> Generando con IA...</div>';

    try {
        let result;
        if (type === 'caption') {
            const desc = prompt('¿Sobre qué es el post?', content || '');
            if (!desc) { resultDiv.style.display = 'none'; return; }
            const data = await API.generateCaption(desc);
            result = data.caption;
            lastAIField = 'content';
        } else if (type === 'hashtags') {
            const desc = content || prompt('¿Sobre qué tema generar hashtags?');
            if (!desc) { resultDiv.style.display = 'none'; return; }
            const data = await API.generateHashtags(desc);
            result = data.hashtags;
            lastAIField = 'hashtags';
        } else if (type === 'improve') {
            if (!content) { showToast('Primero escribí algo para mejorar', 'warning'); resultDiv.style.display = 'none'; return; }
            const data = await API.improveText(content);
            result = data.improved;
            lastAIField = 'content';
        }
        resultText.textContent = result;
    } catch (error) {
        resultText.textContent = '❌ ' + error.message;
        showToast(error.message, 'error');
    }
}

function useAIResult() {
    const text = document.getElementById('ai-inline-text').textContent;
    const contentBox = document.getElementById('post-content');
    if (lastAIField === 'append') {
        contentBox.value = contentBox.value + '\n\n' + text;
    } else {
        contentBox.value = text;
    }
    document.getElementById('ai-inline-result').style.display = 'none';
    
    // update mockup!
    const ev = { target: { value: contentBox.value } };
    updateMockupCaption(ev);
    showToast('Texto aplicado', 'success');
}

async function handleCreatePost(e) {
    if (e) e.preventDefault();
    const form = document.getElementById('create-post-form');
    const editId = form.dataset.editId;
    const imageInput = document.getElementById('post-image');

    const formData = new FormData();
    formData.append('content', document.getElementById('post-content').value);
    formData.append('platform', document.getElementById('post-platform').value);
    formData.append('hashtags', document.getElementById('post-hashtags').value);
    formData.append('aspect_ratio', document.getElementById('post-aspect-ratio').value);
    formData.append('status', 'draft');

    if (imageInput.files[0]) {
        formData.append('image', imageInput.files[0]);
    }

    try {
        if (editId) {
            await API.updatePost(editId, formData);
            showToast('Post actualizado', 'success');
        } else {
            await API.createPost(formData);
            showToast('Post creado como borrador', 'success');
        }
        navigateTo('posts');
    } catch (error) {
        showToast(error.message, 'error');
    }
}

async function handleCreateAndPublish() {
    const imageInput = document.getElementById('post-image');
    const formData = new FormData();
    formData.append('content', document.getElementById('post-content').value);
    formData.append('platform', document.getElementById('post-platform').value);
    formData.append('hashtags', document.getElementById('post-hashtags').value);
    formData.append('aspect_ratio', document.getElementById('post-aspect-ratio').value);
    formData.append('status', 'draft');

    if (imageInput.files[0]) {
        formData.append('image', imageInput.files[0]);
    }

    try {
        const data = await API.createPost(formData);
        await API.publishPost(data.post.id);
        showToast('Post publicado exitosamente', 'success');
        navigateTo('posts');
    } catch (error) {
        showToast(error.message, 'error');
    }
}

// === CALENDAR ===
function renderCalendar() {
    const body = document.getElementById('main-body');
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const monthNames = ['Enero','Febrero','Marzo','Abril','Mayo','Junio','Julio','Agosto','Septiembre','Octubre','Noviembre','Diciembre'];

    let calendarHTML = '';
    const dayNames = ['Dom','Lun','Mar','Mié','Jue','Vie','Sáb'];

    calendarHTML += '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:2px;text-align:center;">';
    dayNames.forEach(d => {
        calendarHTML += `<div style="padding:12px;font-size:12px;font-weight:600;color:var(--text-muted);text-transform:uppercase;">${d}</div>`;
    });

    // Empty cells
    for (let i = 0; i < firstDay; i++) {
        calendarHTML += '<div style="padding:12px;"></div>';
    }

    // Days
    for (let day = 1; day <= daysInMonth; day++) {
        const isToday = day === now.getDate() && month === now.getMonth();
        calendarHTML += `
            <div style="padding:12px;border-radius:var(--radius-md);border:1px solid var(--border);min-height:80px;background:${isToday ? 'rgba(102,126,234,0.08)' : 'var(--bg-card)'};cursor:pointer;transition:all 0.2s;" 
                 onmouseover="this.style.borderColor='var(--primary)'" 
                 onmouseout="this.style.borderColor='var(--border)'"
                 id="cal-day-${day}">
                <div style="font-weight:${isToday ? '700' : '500'};font-size:14px;color:${isToday ? 'var(--primary-light)' : 'var(--text-primary)'};">${day}</div>
                <div class="cal-posts" data-day="${day}" style="margin-top:4px;"></div>
            </div>
        `;
    }
    calendarHTML += '</div>';

    body.innerHTML = `
        <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:var(--space-lg);">
            <h2>${monthNames[month]} ${year}</h2>
            <button class="btn btn-primary btn-sm" onclick="navigateTo('create')">➕ Nuevo Post</button>
        </div>
        ${calendarHTML}
    `;

    // Load posts and mark calendar
    loadCalendarPosts(year, month);
}

async function loadCalendarPosts(year, month) {
    try {
        const data = await API.getPosts({ limit: 100 });
        data.posts.forEach(post => {
            const date = new Date(post.scheduled_at || post.created_at);
            if (date.getFullYear() === year && date.getMonth() === month) {
                const dayEl = document.querySelector(`.cal-posts[data-day="${date.getDate()}"]`);
                if (dayEl) {
                    dayEl.innerHTML += `<div style="font-size:10px;padding:2px 6px;border-radius:4px;margin-top:2px;background:${post.status === 'published' ? 'rgba(16,185,129,0.2)' : post.status === 'scheduled' ? 'rgba(245,158,11,0.2)' : 'rgba(102,126,234,0.2)'};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${platformIcon(post.platform)} ${(post.content || '').slice(0, 20)}</div>`;
                }
            }
        });
    } catch (error) {
        console.error('Calendar load error:', error);
    }
}

// === AI ASSISTANT ===
function renderAI() {
    const body = document.getElementById('main-body');
    body.innerHTML = `
        <div style="margin-bottom:var(--space-xl);">
            <p class="text-secondary">Usá inteligencia artificial para generar contenido profesional para tus redes sociales.</p>
        </div>

        <div class="ai-tools-grid">
            <div class="ai-tool-card" onclick="openAITool('caption')">
                <div class="ai-tool-icon">✍️</div>
                <h3>Generar Caption</h3>
                <p>Creá textos atractivos para tus publicaciones con IA. Elegí tono y plataforma.</p>
            </div>
            <div class="ai-tool-card" onclick="openAITool('hashtags')">
                <div class="ai-tool-icon">#️⃣</div>
                <h3>Generar Hashtags</h3>
                <p>Obtené hashtags relevantes y optimizados para maximizar el alcance de tus posts.</p>
            </div>
            <div class="ai-tool-card" onclick="openAITool('ideas')">
                <div class="ai-tool-icon">💡</div>
                <h3>Ideas de Contenido</h3>
                <p>La IA te sugiere ideas de posts, reels y stories basadas en tu industria.</p>
            </div>
            <div class="ai-tool-card" onclick="openAITool('improve')">
                <div class="ai-tool-icon">✨</div>
                <h3>Mejorar Texto</h3>
                <p>Optimizá un texto existente para mayor engagement y profesionalismo.</p>
            </div>
        </div>

        <div id="ai-workspace" style="display:none;margin-top:var(--space-xl);">
            <div class="card" style="max-width:700px;">
                <h3 id="ai-tool-title" style="margin-bottom:var(--space-md);"></h3>
                <div id="ai-tool-form"></div>
                <div id="ai-tool-result" style="display:none;margin-top:var(--space-lg);"></div>
            </div>
        </div>
    `;
}

function openAITool(tool) {
    const workspace = document.getElementById('ai-workspace');
    const title = document.getElementById('ai-tool-title');
    const form = document.getElementById('ai-tool-form');
    const result = document.getElementById('ai-tool-result');

    workspace.style.display = 'block';
    result.style.display = 'none';

    const tools = {
        caption: {
            title: '✍️ Generar Caption',
            form: `
                <div class="form-group">
                    <label class="form-label">¿Sobre qué es el post?</label>
                    <textarea id="ai-input" class="form-textarea" rows="3" placeholder="Ej: Lanzamiento de nueva colección de verano..."></textarea>
                </div>
                <div style="display:flex;gap:var(--space-md);">
                    <div class="form-group" style="flex:1;">
                        <label class="form-label">Tono</label>
                        <select id="ai-tone" class="form-select">
                            <option value="profesional">Profesional</option>
                            <option value="casual">Casual</option>
                            <option value="divertido">Divertido</option>
                            <option value="inspiracional">Inspiracional</option>
                            <option value="urgente">Urgente/Oferta</option>
                        </select>
                    </div>
                    <div class="form-group" style="flex:1;">
                        <label class="form-label">Plataforma</label>
                        <select id="ai-platform" class="form-select">
                            <option value="Instagram">Instagram</option>
                            <option value="Facebook">Facebook</option>
                            <option value="Twitter">Twitter</option>
                        </select>
                    </div>
                </div>
                <button class="btn btn-accent" onclick="runAITool('caption')">🤖 Generar Caption</button>
            `
        },
        hashtags: {
            title: '#️⃣ Generar Hashtags',
            form: `
                <div class="form-group">
                    <label class="form-label">Tema o descripción</label>
                    <textarea id="ai-input" class="form-textarea" rows="3" placeholder="Ej: Fotografía de paisajes naturales..."></textarea>
                </div>
                <button class="btn btn-accent" onclick="runAITool('hashtags')">🤖 Generar Hashtags</button>
            `
        },
        ideas: {
            title: '💡 Ideas de Contenido',
            form: `
                <div class="form-group">
                    <label class="form-label">¿Cuál es tu rubro/industria?</label>
                    <input type="text" id="ai-input" class="form-input" placeholder="Ej: Gastronomía, Moda, Tecnología, Fitness...">
                </div>
                <button class="btn btn-accent" onclick="runAITool('ideas')">🤖 Generar Ideas</button>
            `
        },
        improve: {
            title: '✨ Mejorar Texto',
            form: `
                <div class="form-group">
                    <label class="form-label">Texto a mejorar</label>
                    <textarea id="ai-input" class="form-textarea" rows="4" placeholder="Pegá el texto que querés mejorar..."></textarea>
                </div>
                <button class="btn btn-accent" onclick="runAITool('improve')">✨ Mejorar</button>
            `
        }
    };

    const config = tools[tool];
    title.textContent = config.title;
    form.innerHTML = config.form;

    workspace.scrollIntoView({ behavior: 'smooth' });
}

async function runAITool(tool) {
    const input = document.getElementById('ai-input').value;
    if (!input.trim()) { showToast('Ingresá un texto o descripción', 'warning'); return; }

    const result = document.getElementById('ai-tool-result');
    result.style.display = 'block';
    result.innerHTML = '<div class="ai-result"><div style="display:flex;align-items:center;gap:8px;"><span class="spinner"></span> Generando con IA... Puede tomar unos segundos.</div></div>';

    try {
        let data;
        if (tool === 'caption') {
            const tone = document.getElementById('ai-tone')?.value;
            const platform = document.getElementById('ai-platform')?.value;
            data = await API.generateCaption(input, { tone, platform });
            result.innerHTML = `
                <div class="ai-result">
                    <div style="white-space:pre-wrap;line-height:1.7;">${data.caption}</div>
                    <div class="ai-result-actions">
                        <button class="btn btn-primary btn-sm" onclick="copyToClipboard('${encodeURIComponent(data.caption)}')">📋 Copiar</button>
                        <button class="btn btn-outline btn-sm" onclick="runAITool('caption')">🔄 Regenerar</button>
                    </div>
                </div>`;
        } else if (tool === 'hashtags') {
            data = await API.generateHashtags(input);
            result.innerHTML = `
                <div class="ai-result">
                    <div style="line-height:2;color:var(--primary-light);">${data.hashtags}</div>
                    <div class="ai-result-actions">
                        <button class="btn btn-primary btn-sm" onclick="copyToClipboard('${encodeURIComponent(data.hashtags)}')">📋 Copiar</button>
                        <button class="btn btn-outline btn-sm" onclick="runAITool('hashtags')">🔄 Regenerar</button>
                    </div>
                </div>`;
        } else if (tool === 'ideas') {
            data = await API.generateIdeas(input);
            result.innerHTML = `
                <div class="ai-result">
                    <div style="white-space:pre-wrap;line-height:1.8;">${data.ideas}</div>
                    <div class="ai-result-actions">
                        <button class="btn btn-primary btn-sm" onclick="copyToClipboard('${encodeURIComponent(data.ideas)}')">📋 Copiar</button>
                        <button class="btn btn-outline btn-sm" onclick="runAITool('ideas')">🔄 Regenerar</button>
                    </div>
                </div>`;
        } else if (tool === 'improve') {
            data = await API.improveText(input);
            result.innerHTML = `
                <div class="ai-result">
                    <div style="white-space:pre-wrap;line-height:1.7;">${data.improved}</div>
                    <div class="ai-result-actions">
                        <button class="btn btn-primary btn-sm" onclick="copyToClipboard('${encodeURIComponent(data.improved)}')">📋 Copiar</button>
                        <button class="btn btn-outline btn-sm" onclick="runAITool('improve')">🔄 Regenerar</button>
                    </div>
                </div>`;
        }
    } catch (error) {
        result.innerHTML = `<div class="ai-result" style="border-color:var(--danger);">❌ ${error.message}</div>`;
        showToast(error.message, 'error');
    }
}

function copyToClipboard(encodedText) {
    const text = decodeURIComponent(encodedText);
    navigator.clipboard.writeText(text).then(() => {
        showToast('Copiado al portapapeles', 'success');
    }).catch(() => {
        // Fallback
        const ta = document.createElement('textarea');
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        showToast('Copiado al portapapeles', 'success');
    });
}

// === SETTINGS ===
async function renderSettings() {
    const body = document.getElementById('main-body');

    let user = currentUser;
    try {
        const data = await API.getProfile();
        user = data.user;
    } catch { /* use cached */ }

    body.innerHTML = `
        <div style="max-width:700px;">
            <div class="settings-section">
                <h3>👤 Perfil</h3>
                <form onsubmit="saveSettings(event)">
                    <div class="settings-row">
                        <div class="form-group">
                            <label class="form-label">Nombre</label>
                            <input type="text" id="set-name" class="form-input" value="${user.name || ''}">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Empresa</label>
                            <input type="text" id="set-company" class="form-input" value="${user.company || ''}">
                        </div>
                    </div>
                    <div class="settings-row">
                        <div class="form-group">
                            <label class="form-label">Email</label>
                            <input type="email" class="form-input" value="${user.email || ''}" disabled>
                        </div>
                        <div class="form-group">
                            <label class="form-label">País</label>
                            <select id="set-country" class="form-select">
                                <option value="AR" ${user.country === 'AR' ? 'selected' : ''}>🇦🇷 Argentina</option>
                                <option value="MX" ${user.country === 'MX' ? 'selected' : ''}>🇲🇽 México</option>
                                <option value="CO" ${user.country === 'CO' ? 'selected' : ''}>🇨🇴 Colombia</option>
                                <option value="CL" ${user.country === 'CL' ? 'selected' : ''}>🇨🇱 Chile</option>
                                <option value="PE" ${user.country === 'PE' ? 'selected' : ''}>🇵🇪 Perú</option>
                                <option value="UY" ${user.country === 'UY' ? 'selected' : ''}>🇺🇾 Uruguay</option>
                                <option value="BR" ${user.country === 'BR' ? 'selected' : ''}>🇧🇷 Brasil</option>
                                <option value="US" ${user.country === 'US' ? 'selected' : ''}>🇺🇸 Estados Unidos</option>
                                <option value="ES" ${user.country === 'ES' ? 'selected' : ''}>🇪🇸 España</option>
                            </select>
                        </div>
                    </div>
                    <button type="submit" class="btn btn-primary">💾 Guardar Cambios</button>
                </form>
            </div>

            <div class="settings-section">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px;">
                    <h3>🔗 Conexiones Sociales</h3>
                </div>
                
                <div id="meta-connection-status" style="margin-bottom:20px;">
                    <!-- Cargado dinámicamente por checkConnectionStatus() -->
                    <div class="skeleton" style="height:80px; border-radius:8px;"></div>
                </div>

                <div style="display: flex; gap: 12px; margin-bottom: 24px;">
                    <button type="button" id="btn-connect-facebook" class="btn btn-primary" onclick="connectWithFacebook()" style="flex:1; background:#0866FF; border:none; display:flex; align-items:center; justify-content:center; gap:10px;">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
                        Conectar con Meta (Instagram & FB)
                    </button>
                </div>

                <button type="button" class="btn btn-ghost btn-sm" onclick="document.getElementById('advanced-social-config').style.display = document.getElementById('advanced-social-config').style.display === 'none' ? 'block' : 'none'" style="margin-bottom:12px; padding:0; font-size:12px; color:var(--text-muted);">
                    ⚙️ Configuración manual avanzada
                </button>

                <div id="advanced-social-config" style="display:none;">
                    <div style="background:var(--bg-secondary); padding:20px; border-radius:12px; margin-bottom:16px; border:1px solid var(--border);">
                        <h4 style="margin-bottom:12px; display:flex; align-items:center; gap:8px;">📸 Instagram Business</h4>
                        <div class="settings-row">
                            <div class="form-group">
                                <label class="form-label">Instagram Page ID <span class="help-trigger" onclick="showHelp('ig-page')">?</span></label>
                                <input type="text" id="set-ig-page" class="form-input" value="${user.ig_page_id || ''}" placeholder="Ej: 17841401234567890">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Access Token <span class="help-trigger" onclick="showHelp('meta-token')">?</span></label>
                                <input type="password" id="set-ig-token" class="form-input" value="${user.ig_access_token || ''}" placeholder="Token de Meta">
                            </div>
                        </div>
                    </div>

                    <div style="background:var(--bg-secondary); padding:20px; border-radius:12px; border:1px solid var(--border);">
                        <h4 style="margin-bottom:12px; display:flex; align-items:center; gap:8px;">📘 Facebook Page</h4>
                        <div class="settings-row">
                            <div class="form-group">
                                <label class="form-label">Facebook Page ID <span class="help-trigger" onclick="showHelp('fb-page')">?</span></label>
                                <input type="text" id="set-fb-page" class="form-input" value="${user.fb_page_id || ''}" placeholder="Ej: 102938475612345">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Access Token</label>
                                <input type="password" id="set-fb-token" class="form-input" value="${user.fb_access_token || ''}" placeholder="Token de Meta">
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="settings-section">
                <h3>💳 Abonos y Créditos</h3>
                <div class="card" style="margin-bottom: 20px;">
                    <div style="font-size: 14px; color: var(--text-muted); margin-bottom: 4px;">Saldo disponible</div>
                    <div style="font-size: 28px; font-weight: 800; color: var(--primary);">${user.posts_remaining || 0} <span style="font-size: 16px; font-weight: 600; color: var(--text-primary);">Posts</span></div>
                </div>

                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 16px;">
                    <div style="padding: 16px; text-align: center; border: 1px solid var(--border); background: var(--bg-surface); border-radius: var(--radius-md);">
                        <div style="font-weight: 700; margin-bottom: 8px;">Post Individual</div>
                        <div style="font-size: 20px; font-weight: 800; color: var(--text-primary); margin-bottom: 8px;">$2.000</div>
                        <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 16px;">+1 Post</div>
                        <button id="btn-buy-unica" class="btn btn-outline btn-sm" style="width:100%" onclick="buyPlan('unica')">Comprar</button>
                    </div>
                    <div style="padding: 16px; text-align: center; border: 2px solid var(--primary); background: rgba(102, 126, 234, 0.05); border-radius: var(--radius-md);">
                        <div style="font-weight: 700; margin-bottom: 8px; color: var(--primary);">Abono Semanal</div>
                        <div style="font-size: 20px; font-weight: 800; color: var(--text-primary); margin-bottom: 8px;">$10.000</div>
                        <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 16px;">+10 Posts</div>
                        <button id="btn-buy-semanal" class="btn btn-primary btn-sm" style="width:100%" onclick="buyPlan('semanal')">Comprar</button>
                    </div>
                    <div style="padding: 16px; text-align: center; border: 1px solid var(--border); background: var(--bg-surface); border-radius: var(--radius-md);">
                        <div style="font-weight: 700; margin-bottom: 8px;">Abono Mensual</div>
                        <div style="font-size: 20px; font-weight: 800; color: var(--text-primary); margin-bottom: 8px;">$50.000</div>
                        <div style="font-size: 12px; color: var(--text-muted); margin-bottom: 16px;">+60 Posts</div>
                        <button id="btn-buy-mensual" class="btn btn-outline btn-sm" style="width:100%" onclick="buyPlan('mensual')">Comprar</button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Initialize connection status if SDK is loaded
    if (typeof checkConnectionStatus === 'function') {
        checkConnectionStatus();
    }
}

async function saveSettings(e) {
    e.preventDefault();
    try {
        const data = await API.updateProfile({
            name: document.getElementById('set-name').value,
            company: document.getElementById('set-company').value,
            country: document.getElementById('set-country').value,
            ig_page_id: document.getElementById('set-ig-page').value,
            ig_access_token: document.getElementById('set-ig-token').value,
            fb_page_id: document.getElementById('set-fb-page').value,
            fb_access_token: document.getElementById('set-fb-token').value
        });

        // Update cached user
        localStorage.setItem('sp_user', JSON.stringify(data.user));
        initUserInfo();
        showToast('Configuración guardada', 'success');
    } catch (error) {
        showToast(error.message, 'error');
    }
}

async function buyPlan(planId) {
    try {
        const btn = document.getElementById('btn-buy-' + planId);
        const originalText = btn.innerHTML;
        btn.innerHTML = '<div class="spinner"></div>';
        btn.disabled = true;

        // 1. Get Public Config to initialize SDK
        const configRes = await fetch('/api/config');
        const config = await configRes.json();
        
        if (!config.mp_public_key) {
            throw new Error('La pasarela de pago no está configurada por el administrador.');
        }

        // 2. Initialize MP SDK
        if (typeof MercadoPago === 'undefined') {
            throw new Error('El sistema de seguridad de Mercado Pago aún se está cargando. Por favor, espera 2 segundos o refresca la página.');
        }
        const mp = new MercadoPago(config.mp_public_key, { locale: 'es-AR' });

        // 3. Create Preference on Backend
        const response = await API.createCheckoutPreference(planId);
        
        // 4. Open Official Modal
        mp.checkout({
            preference: { id: response.id },
            autoOpen: true
        });
        
        btn.innerHTML = originalText;
        btn.disabled = false;
        
        showToast('Ventana de pago segura iniciada.', 'success');
    } catch (e) {
        showToast(e.message || 'Error al iniciar pago.', 'error');
        const btn = document.getElementById('btn-buy-' + planId);
        if(btn) {
            btn.innerHTML = 'Comprar';
            btn.disabled = false;
        }
    }
}
// === BRAND PROFILE ===
async function renderBrand() {
    const body = document.getElementById('main-body');

    let user = currentUser;
    try {
        const data = await API.getProfile();
        user = data.user;
    } catch { /* use cached */ }

    body.innerHTML = `
        <div style="max-width:700px;">
            <div style="margin-bottom:var(--space-xl);">
                <p class="text-secondary">Completá esta información para que la Inteligencia Artificial de Postly conozca tu negocio y genere contenido más personalizado, preciso y alineado con tu marca.</p>
            </div>

            <div class="settings-section">
                <h3>🏷️ Identidad de Marca</h3>
                <form onsubmit="saveBrand(event)">
                    <div class="settings-row">
                        <div class="form-group">
                            <label class="form-label">Nombre de la Marca/Negocio</label>
                            <input type="text" id="brand-name" class="form-input" value="${user.brand_name || ''}" placeholder="Ej: MR Letreros" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Rubro o Industria</label>
                            <input type="text" id="brand-industry" class="form-input" value="${user.brand_industry || ''}" placeholder="Ej: Fabricación de letreros 3D, Diseño gráfico" required>
                        </div>
                    </div>
                    
                    <div class="form-group">
                        <label class="form-label">¿A quién le vendés? (Público Objetivo)</label>
                        <textarea id="brand-audience" class="form-textarea" rows="2" placeholder="Ej: Negocios locales, restaurantes, empresas de eventos que buscan destacar su marca.">${user.brand_audience || ''}</textarea>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Tono de Voz de la Marca</label>
                        <select id="brand-tone" class="form-select">
                            <option value="Profesional y Confiable" ${user.brand_tone === 'Profesional y Confiable' ? 'selected' : ''}>Profesional y Confiable</option>
                            <option value="Cercano y Amigable" ${user.brand_tone === 'Cercano y Amigable' ? 'selected' : ''}>Cercano y Amigable</option>
                            <option value="Creativo y Original" ${user.brand_tone === 'Creativo y Original' ? 'selected' : ''}>Creativo y Original</option>
                            <option value="Enérgico y Llamativo" ${user.brand_tone === 'Enérgico y Llamativo' ? 'selected' : ''}>Enérgico y Llamativo</option>
                            <option value="Lujoso y Exclusivo" ${user.brand_tone === 'Lujoso y Exclusivo' ? 'selected' : ''}>Lujoso y Exclusivo</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Productos o Servicios Principales</label>
                        <textarea id="brand-services" class="form-textarea" rows="3" placeholder="Ej: Letreros corpóreos en polyfan, carteles luminosos, neon LED, letras 3D para paredes.">${user.brand_services || ''}</textarea>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Diferenciador (¿Por qué elegirte?)</label>
                        <textarea id="brand-differentiators" class="form-textarea" rows="2" placeholder="Ej: Materiales de primera calidad, instalación rápida, diseños 100% personalizados, garantía de 1 año.">${user.brand_differentiators || ''}</textarea>
                    </div>

                    <button type="submit" class="btn btn-primary" style="margin-top:var(--space-md);">💾 Guardar Perfil de Marca</button>
                </form>
            </div>
        </div>
    `;
}

async function saveBrand(e) {
    e.preventDefault();
    try {
        const data = await API.updateProfile({
            brand_name: document.getElementById('brand-name').value,
            brand_industry: document.getElementById('brand-industry').value,
            brand_audience: document.getElementById('brand-audience').value,
            brand_tone: document.getElementById('brand-tone').value,
            brand_services: document.getElementById('brand-services').value,
            brand_differentiators: document.getElementById('brand-differentiators').value
        });

        // Update cached user
        localStorage.setItem('sp_user', JSON.stringify(data.user));
        initUserInfo();
        showToast('Perfil de Marca guardado exitosamente', 'success');
    } catch (error) {
        showToast(error.message, 'error');
    }
}

// === ADMIN PANEL ===
async function renderAdmin() {
    const body = document.getElementById('main-body');
    
    body.innerHTML = `
        <div style="max-width: 1000px; margin: 0 auto;">
            <!-- Tabs Navigation -->
            <div style="display: flex; gap: 16px; border-bottom: 2px solid var(--border); margin-bottom: 24px;">
                <button id="btn-tab-meta" class="admin-tab-btn active" onclick="switchAdminTab('meta')" style="padding: 12px 24px; background: none; border: none; font-weight: 600; font-size: 16px; color: var(--primary); border-bottom: 2px solid var(--primary); margin-bottom: -2px; cursor: pointer;">
                    🌐 Configuración Meta
                </button>
                <button id="btn-tab-mp" class="admin-tab-btn" onclick="switchAdminTab('mp')" style="padding: 12px 24px; background: none; border: none; font-weight: 600; font-size: 16px; color: var(--text-secondary); cursor: pointer;">
                    💳 Mercado Pago
                </button>
                <button id="btn-tab-users" class="admin-tab-btn" onclick="switchAdminTab('users')" style="padding: 12px 24px; background: none; border: none; font-weight: 600; font-size: 16px; color: var(--text-secondary); cursor: pointer;">
                    👥 Usuarios
                </button>
            </div>

            <!-- Tab 1: META -->
            <div id="content-tab-meta" class="admin-tab-content" style="display: block;">
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 24px;">
                    <!-- Información y Guía -->
                    <div class="settings-section" style="grid-column: 1 / -1;">
                        <h3 style="display:flex; align-items:center; gap:8px;">ℹ️ ¿Qué datos se usan aquí?</h3>
                        <div class="card" style="background:#f0f9ff; border-color:#bae6fd; font-size:14px; color:#0369a1;">
                            <p style="margin-bottom:8px;">Para que Postly pueda publicar en tus redes, necesita conectarse a la API de Meta usando:</p>
                            <ul style="margin-left:20px; line-height:1.6;">
                                <li><strong>Page ID (Facebook e Instagram):</strong> El identificador único de tus páginas comerciales.</li>
                                <li><strong>Access Token de Usuario (Larga Duración):</strong> Un permiso especial de 60 días generado en el <em>Meta Graph Explorer</em> con permisos como <code>pages_manage_posts</code> y <code>instagram_basic</code>.</li>
                            </ul>
                        </div>
                    </div>

                    <!-- API Status Card -->
                    <div class="settings-section" style="grid-column: 1 / -1;">
                        <h3>📊 Estado de Conexión Meta (Global)</h3>
                        <div id="admin-api-status" class="card" style="padding: 24px; background: #f8fafc;">
                            Cargando información del sistema...
                        </div>
                    </div>

                    <!-- Links Útiles -->
                    <div class="settings-section">
                        <h3>🔗 Enlaces Rápidos (Developers)</h3>
                        <div class="card" style="display:flex; flex-direction:column; gap:12px;">
                            <a href="https://developers.facebook.com/tools/explorer/" target="_blank" class="btn btn-outline" style="justify-content:flex-start; text-align:left;">
                                🛠️ Meta Graph Explorer
                            </a>
                            <a href="https://developers.facebook.com/tools/debug/accesstoken/" target="_blank" class="btn btn-outline" style="justify-content:flex-start; text-align:left;">
                                🔍 Access Token Debugger
                            </a>
                            <a href="https://developers.facebook.com/apps/" target="_blank" class="btn btn-outline" style="justify-content:flex-start; text-align:left;">
                                📱 Panel de Mis Apps
                            </a>
                        </div>
                    </div>

                    <!-- Recordatorios -->
                    <div class="settings-section">
                        <h3>📅 Recordatorio de Renovación</h3>
                        <div class="card" style="background: rgba(234, 179, 8, 0.1); border-color: rgba(234, 179, 8, 0.3);">
                            <p style="font-size:14px; line-height:1.6; color: #854d0e;">
                                <strong>Nota Importante:</strong> Los tokens de Meta de "Larga Duración" duran <strong>60 días</strong>. 
                                Es recomendable renovarlo 1 semana antes de que venza para evitar cortes en el servicio.
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Tab 2: MERCADO PAGO -->
            <div id="content-tab-mp" class="admin-tab-content" style="display: none;">
                <div class="settings-section">
                    <h3 style="display:flex; align-items:center; gap:8px;">ℹ️ ¿Cómo evitar el error de "Modo Prueba"?</h3>
                    <div class="card" style="background:#fff7ed; border-color:#fed7aa; font-size:14px; color:#9a3412;">
                        <p style="margin-bottom:8px;"><strong>Importante:</strong> Para que los pagos funcionen con tarjetas reales, ambas claves deben ser de <strong>Producción</strong> (las que empiezan con <code>APP_USR</code> y <code>APP_USR</code>).</p>
                        <ul style="margin-left:20px; line-height:1.6;">
                            <li>Si usas claves <code>TEST-</code>, solo funcionará con cuentas de prueba de Mercado Pago.</li>
                            <li>Si usas claves <code>APP_USR-</code>, funcionará con dinero real.</li>
                        </ul>
                        <p style="margin-top:12px; font-weight:bold;">
                            <a href="https://www.mercadopago.com.ar/developers/panel/app" target="_blank" style="color:#9a3412; text-decoration:underline;">Ir a mi Panel de Aplicaciones ↗</a>
                        </p>
                    </div>
                </div>

                <div class="settings-section">
                    <h3 style="display:flex; align-items:center; gap:8px;">🚀 Pasos Críticos para Activar Pagos</h3>
                    <div class="card" style="background:#f0f9ff; border-color:#bae6fd; font-size:13px; color:#0369a1;">
                        <ol style="margin-left:20px; display:flex; flex-direction:column; gap:8px;">
                            <li><strong>Homologación de la App:</strong> En el segundo pantallazo que pasaste, dale a <strong>"Comenzar"</strong> en "Configurar ambiente de desarrollo". Mercado Pago te pedirá completar tus datos fiscales. **Sin esto, Mercado Pago bloquea el botón "Pagar"** para evitar fraudes.</li>
                            <li><strong>Localhost (Importante):</strong> Como estás en <code>localhost:3000</code>, Mercado Pago no puede "avisarle" a tu PC que el pago fue exitoso. Para que se sumen los posts automáticamente, deberás subir la web a un servidor real o usar <strong>Ngrok</strong> para darle una URL pública.</li>
                            <li><strong>Configurar Webhooks (IPN):</strong> Una vez que tengas una URL pública, ve a "Webhooks" en el panel de Mercado Pago y coloca esta dirección:
                                <code style="display:block; background:#fff; padding:8px; border-radius:4px; margin-top:4px; border:1px solid #bae6fd;">
                                    ${window.location.origin}/api/billing/webhook
                                </code>
                            </li>
                        </ol>
                    </div>
                </div>
                </div>

                <div class="settings-section">
                    <h3>🏦 Configuración de Pasarela (Checkout Integrado)</h3>
                    <div class="card">
                        <div style="margin-bottom: 20px;">
                            <label class="form-label" style="margin-bottom:8px;">Modo Detectado:</label>
                            ${(currentUser.mp_access_token || '').startsWith('TEST-') 
                                ? '<span class="badge badge-warning">🧪 MODO PRUEBAS (SANDBOX)</span>' 
                                : (currentUser.mp_access_token || '').startsWith('APP_USR-') 
                                    ? '<span class="badge badge-success">💰 MODO PRODUCCIÓN (REAL)</span>' 
                                    : '<span class="badge badge-danger">⚠️ NO CONFIGURADO</span>'}
                        </div>

                        <form onsubmit="saveDirectPaymentConfig(event)">
                            <div class="form-group" style="margin-bottom:16px;">
                                <label class="form-label">Public Key <span class="help-trigger" onclick="showHelp('mp-public')">?</span></label>
                                <input type="text" id="mp-public-key" class="form-input" 
                                       value="${currentUser.mp_public_key || ''}" 
                                       placeholder="APP_USR-0000... o TEST-0000...">
                                <small style="color:var(--text-muted); font-size:11px;">Necesaria para abrir la ventana de pago sin salir del sitio.</small>
                            </div>

                            <div class="form-group" style="margin-bottom:20px;">
                                <label class="form-label">Access Token <span class="help-trigger" onclick="showHelp('mp-token')">?</span></label>
                                <input type="password" id="mp-access-token" class="form-input" 
                                       value="${currentUser.mp_access_token || ''}" 
                                       placeholder="APP_USR-... o TEST-...">
                                <small style="color:var(--text-muted); font-size:11px;">Mantenlo privado. Se usa para crear las órdenes de pago de forma segura.</small>
                            </div>

                            <button type="submit" class="btn btn-primary" style="width:100%;">Guardar Todo y Activar Pop-up</button>
                        </form>
                    </div>
                </div>
            </div>

            <!-- Tab 3: USUARIOS -->
            <div id="content-tab-users" class="admin-tab-content" style="display: none;">
                <div class="settings-section">
                    <h3>👥 Usuarios del Sistema</h3>
                    <div id="admin-users-list" class="card" style="padding: 0; overflow: hidden;">
                        <table style="width:100%; border-collapse: collapse; font-size:14px;">
                            <thead style="background:#f8fafc; border-bottom:1px solid var(--border);">
                                <tr>
                                    <th style="padding:12px; text-align:left;">Usuario</th>
                                    <th style="padding:12px; text-align:left;">Email</th>
                                    <th style="padding:12px; text-align:left;">Plan</th>
                                    <th style="padding:12px; text-align:left;">Rol</th>
                                </tr>
                            </thead>
                            <tbody id="users-table-body">
                                <tr><td colspan="4" style="padding:20px; text-align:center;">Cargando usuarios...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>

        </div>
    `;

    loadAdminStats();
    loadAdminUsers();
}

window.switchAdminTab = function(tabId) {
    document.querySelectorAll('.admin-tab-btn').forEach(btn => {
        btn.classList.remove('active');
        btn.style.color = 'var(--text-secondary)';
        btn.style.borderBottom = 'none';
    });
    document.querySelectorAll('.admin-tab-content').forEach(content => {
        content.style.display = 'none';
    });
    
    const activeBtn = document.getElementById('btn-tab-' + tabId);
    activeBtn.classList.add('active');
    activeBtn.style.color = 'var(--primary)';
    activeBtn.style.borderBottom = '2px solid var(--primary)';
    
    document.getElementById('content-tab-' + tabId).style.display = 'block';
}


async function loadAdminStats() {
    const statusDiv = document.getElementById('admin-api-status');
    try {
        const user = currentUser; 
        const igToken = user.ig_access_token || 'No configurado';
        const fbToken = user.fb_access_token || 'No configurado';
        
        statusDiv.innerHTML = `
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap: 32px;">
                <div>
                    <h4 style="color:var(--text-secondary); font-size:12px; text-transform:uppercase; margin-bottom:12px;">Instagram Business</h4>
                    <div style="margin-bottom:8px;"><strong>ID:</strong> ${user.ig_page_id || 'N/A'}</div>
                    <div style="margin-bottom:12px; font-size:12px; color:var(--text-secondary); word-break:break-all;"><strong>Token:</strong> ${igToken.substring(0, 15)}...</div>
                    <div class="badge ${user.ig_access_token ? 'badge-success' : 'badge-danger'}">
                        ${user.ig_access_token ? '🔌 Conectado' : '❌ Desconectado'}
                    </div>
                </div>
                <div>
                    <h4 style="color:var(--text-secondary); font-size:12px; text-transform:uppercase; margin-bottom:12px;">Facebook Page</h4>
                    <div style="margin-bottom:8px;"><strong>ID:</strong> ${user.fb_page_id || 'N/A'}</div>
                    <div style="margin-bottom:12px; font-size:12px; color:var(--text-secondary); word-break:break-all;"><strong>Token:</strong> ${fbToken.substring(0, 15)}...</div>
                    <div class="badge ${user.fb_access_token ? 'badge-success' : 'badge-danger'}">
                        ${user.fb_access_token ? '🔌 Conectado' : '❌ Desconectado'}
                    </div>
                </div>
            </div>
        `;
    } catch (e) {
        statusDiv.innerHTML = `<p style="color:var(--danger);">Error al cargar: ${e.message}</p>`;
    }
}

async function loadAdminUsers() {
    const tableBody = document.getElementById('users-table-body');
    try {
        // En esta fase 1, solo simulamos o cargamos desde la API usando getProfile
        const data = await API.getProfile();
        const user = data.user;

        tableBody.innerHTML = `
            <tr style="border-bottom:1px solid var(--border);">
                <td style="padding:12px;">${user.name}</td>
                <td style="padding:12px;">${user.email}</td>
                <td style="padding:12px;"><span class="badge badge-success">${user.plan}</span></td>
                <td style="padding:12px;">${user.is_admin ? '🛡️ Admin' : '👤 User'}</td>
            </tr>
        `;
    } catch (e) {
        tableBody.innerHTML = `<tr><td colspan="4" style="padding:20px; text-align:center; color:var(--danger);">Error: ${e.message}</td></tr>`;
    }
}

async function saveDirectPaymentConfig(e) {
    e.preventDefault();
    const btn = e.target.querySelector('button');
    const originalText = btn.textContent;
    btn.innerHTML = `<span class="spinner"></span> Procesando...`;
    btn.disabled = true;

    try {
        const publicVal = document.getElementById('mp-public-key').value;
        const accessVal = document.getElementById('mp-access-token').value;
        const res = await API.updateProfile({ 
            mp_public_key: publicVal,
            mp_access_token: accessVal 
        });
        
        // Update user cache and global state
        localStorage.setItem('sp_user', JSON.stringify(res.user));
        
        // Mutate the global object and also re-assign to be absolutely sure
        Object.assign(currentUser, res.user);
        
        showToast('🔓 Credenciales de Mercado Pago guardadas. El Pop-up ahora está activo.', 'success');
        
        // Re-render completely with fresh data
        renderAdmin(); 
    } catch (err) {
        showToast(err.message, 'error');
    } finally {
        btn.textContent = originalText;
        btn.disabled = false;
    }
}

// === BILLING PANEL ===
async function renderBilling() {
    const body = document.getElementById('main-body');
    
    // Refresh user data to get accurate balance
    let user = currentUser;
    try {
        const data = await API.getProfile();
        user = data.user;
        Object.assign(currentUser, user);
    } catch {}

    const remaining = user.posts_remaining || 0;

    body.innerHTML = `
        <div style="max-width: 900px; margin: 0 auto; text-align: center;">
            <h2 style="margin-bottom: 8px;">💳 Créditos y Planes</h2>
            <p style="color: var(--text-secondary); margin-bottom: 32px;">Agrega créditos a tu cuenta para continuar publicando.</p>
            
            <div style="background: var(--bg-secondary); padding: 16px; border-radius: 12px; display: inline-block; margin-bottom: 40px; border: 1px solid var(--border);">
                <div style="font-size: 14px; text-transform: uppercase; color: var(--text-secondary); margin-bottom: 4px;">Saldo Actual</div>
                <div style="font-size: 32px; font-weight: 700; color: ${remaining > 0 ? 'var(--success)' : 'var(--danger)'};">
                    ${remaining} Publicaciones
                </div>
            </div>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 24px; text-align: left;">
                
                <!-- Plan Único -->
                <div class="card" style="display: flex; flex-direction: column; position: relative;">
                    <h3 style="font-size: 20px; margin-bottom: 8px;">Plan Único</h3>
                    <p style="color: var(--text-secondary); font-size: 14px; margin-bottom: 24px;">Ideal para un uso ocasional.</p>
                    <div style="font-size: 36px; font-weight: 800; margin-bottom: 24px;">
                        $2.000 <span style="font-size: 14px; color: var(--text-secondary); font-weight: 400;">/ ARS</span>
                    </div>
                    <ul style="list-style: none; padding: 0; margin: 0; margin-bottom: 32px; flex-grow: 1;">
                        <li style="margin-bottom: 12px;">✅ <strong>1 Publicación</strong> agregada al saldo</li>
                        <li style="margin-bottom: 12px;">✅ Todas las herramientas IA</li>
                        <li style="margin-bottom: 12px;">✅ Sin vencimiento</li>
                    </ul>
                    <button class="btn btn-outline" style="width: 100%; border-color: var(--primary); color: var(--primary);" onclick="handleCheckout('unica')">
                        Comprar 1 Post
                    </button>
                </div>

                <!-- Plan Semanal -->
                <div class="card" style="display: flex; flex-direction: column; position: relative; border-color: var(--primary); box-shadow: 0 4px 20px rgba(79, 70, 229, 0.1);">
                    <div style="position: absolute; top: -12px; left: 50%; transform: translateX(-50%); background: var(--primary); color: white; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 700; text-transform: uppercase;">
                        Más Popular
                    </div>
                    <h3 style="font-size: 20px; margin-bottom: 8px;">Abono Semanal</h3>
                    <p style="color: var(--text-secondary); font-size: 14px; margin-bottom: 24px;">Perfecto para mantener constancia.</p>
                    <div style="font-size: 36px; font-weight: 800; margin-bottom: 24px; color: var(--primary);">
                        $10.000 <span style="font-size: 14px; color: var(--text-secondary); font-weight: 400;">/ ARS</span>
                    </div>
                    <ul style="list-style: none; padding: 0; margin: 0; margin-bottom: 32px; flex-grow: 1;">
                        <li style="margin-bottom: 12px;">✅ <strong>10 Publicaciones</strong> (50% OFF)</li>
                        <li style="margin-bottom: 12px;">✅ Todas las herramientas IA</li>
                        <li style="margin-bottom: 12px;">✅ Sin vencimiento</li>
                    </ul>
                    <button class="btn btn-primary" style="width: 100%;" onclick="handleCheckout('semanal')">
                        Adquirir Paquete
                    </button>
                </div>

                <!-- Plan Mensual -->
                <div class="card" style="display: flex; flex-direction: column; position: relative;">
                    <h3 style="font-size: 20px; margin-bottom: 8px;">Abono Mensual</h3>
                    <p style="color: var(--text-secondary); font-size: 14px; margin-bottom: 24px;">Para agencias o alto volumen.</p>
                    <div style="font-size: 36px; font-weight: 800; margin-bottom: 24px;">
                        $50.000 <span style="font-size: 14px; color: var(--text-secondary); font-weight: 400;">/ ARS</span>
                    </div>
                    <ul style="list-style: none; padding: 0; margin: 0; margin-bottom: 32px; flex-grow: 1;">
                        <li style="margin-bottom: 12px;">✅ <strong>60 Publicaciones</strong> (60% OFF)</li>
                        <li style="margin-bottom: 12px;">✅ Todas las herramientas IA</li>
                        <li style="margin-bottom: 12px;">✅ Sin vencimiento</li>
                    </ul>
                    <button class="btn btn-outline" style="width: 100%;" onclick="handleCheckout('mensual')">
                        Adquirir Paquete
                    </button>
                </div>

            </div>
            
            <div style="margin-top: 32px; text-align: center;">
                 <img src="https://http2.mlstatic.com/frontend-assets/ui-navigation/5.19.1/mercadopago/logo__small@2x.png" alt="Mercado Pago" style="height: 30px; opacity: 0.8;">
                 <p style="font-size: 12px; color: var(--text-secondary); margin-top: 8px;">Pagos seguros, se acredita al instante vía CBU, Tarjeta o Saldo MP.</p>
            </div>
        </div>
    `;
}

async function handleCheckout(planId) {
    try {
        const btn = event.target;
        const originalText = btn.textContent;
        btn.innerHTML = `<span class="spinner"></span> Procesando...`;
        btn.disabled = true;

        // Se llama al backend para crear la preferencia con el token de auth
        const res = await API.request('/api/billing/create-preference', {
            method: 'POST',
            body: JSON.stringify({ planId })
        });

        // Redirige al init_point de MercadoPago
        if (res && res.init_point) {
            window.location.href = res.init_point;
        } else {
            throw new Error('No se pudo iniciar el pago.');
        }

    } catch (e) {
        showToast(e.message, 'error');
        event.target.disabled = false;
        event.target.textContent = 'Reintentar';
    }
}
