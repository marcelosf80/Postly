function getAbsoluteImageUrl(path) {
    if (!path) return '';
    if (path.startsWith('data:') || path.startsWith('http')) return path;
    const base = window.API_BASE_URL || '';
    return base + (path.startsWith('/') ? '' : '/') + path;
}
// public/js/app.js — Dashboard SPA Logic

// === Auth Check ===
const token = API.getToken();
let currentUser = API.getUser();


function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit' });
}


if (!token || !currentUser) {
    window.location.href = './index.html';
}

// === State ===
let currentSection = 'overview';
let postsCache = [];
let currentImageBase64 = null;

// === Theme Sync ===
const syncTheme = () => {
    const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    document.body.classList.toggle('dark-theme', isDark);
};
syncTheme();
window.matchMedia('(prefers-color-scheme: dark)').addListener(syncTheme);
const APP_VERSION = '1.0.5';
alert('Postly v' + APP_VERSION);
console.log(`[INIT] Postly v${APP_VERSION}`);

if (window.Capacitor) {
    console.log('[INIT] Plugins detectados:', Object.keys(window.Capacitor.Plugins));
}

// === ICONS (SVG Inline) ===
const ICONS = {
    dashboard: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7"></rect><rect x="14" y="3" width="7" height="7"></rect><rect x="14" y="14" width="7" height="7"></rect><rect x="3" y="14" width="7" height="7"></rect></svg>`,
    posts: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>`,
    create: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>`,
    calendar: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>`,
    ai: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"></path></svg>`,
    brand: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path><line x1="7" y1="7" x2="7.01" y2="7"></line></svg>`,
    billing: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"></rect><line x1="1" y1="10" x2="23" y2="10"></line></svg>`,
    settings: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>`,
    shield: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>`,
    menu: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>`,
    close: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`,
    plus: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`,
    trash: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>`,
    edit: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>`,
    info: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`,
    success: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>`,
    error: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="15" y1="9" x2="9" y2="15"></line><line x1="9" y1="9" x2="15" y2="15"></line></svg>`,
    warning: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`,
    brain: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9.5 2A5.43 5.43 0 0 1 12 4.75 5.43 5.43 0 0 1 14.5 2a5.5 5.5 0 0 1 5.5 5.5c0 3.04-2.46 5.5-5.5 5.5h-5A5.5 5.5 0 0 1 4 7.5 5.5 5.5 0 0 1 9.5 2z"></path><path d="M12 13v7"></path><path d="M8 17h8"></path></svg>`,
    palette: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r=".5"></circle><circle cx="17.5" cy="10.5" r=".5"></circle><circle cx="8.5" cy="7.5" r=".5"></circle><circle cx="6.5" cy="12.5" r=".5"></circle><path d="M12 2C6.477 2 2 6.477 2 12c0 4.418 3.582 8 8 8 1.105 0 2-.895 2-2 0-.53-.21-.93-.55-1.21-.34-.28-.45-.61-.45-.79 0-.55.45-1 1-1h2c3.866 0 7-3.134 7-7 0-4.418-3.582-8-8-8z"></path></svg>`,
    instagram: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="20" rx="5" ry="5"></rect><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"></path><line x1="17.5" y1="6.5" x2="17.51" y2="6.5"></line></svg>`,
    facebook: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"></path></svg>`,
    twitter: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M23 3a10.9 10.9 0 0 1-3.14 1.53 4.48 4.48 0 0 0-7.86 3v1A10.66 10.66 0 0 1 3 4s-4 9 5 13a11.64 11.64 0 0 1-7 2c9 5 20 0 20-11.5a4.5 4.5 0 0 0-.08-.83A7.72 7.72 0 0 0 23 3z"></path></svg>`,
    help: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`
};

function renderIcons() {
    document.querySelectorAll('i[data-lucide]').forEach(el => {
        const iconName = el.getAttribute('data-lucide').replace('layout-dashboard', 'dashboard').replace('file-text', 'posts').replace('plus-circle', 'create').replace('sparkles', 'ai').replace('tag', 'brand').replace('credit-card', 'billing').replace('shield', 'shield').replace('help-circle', 'help').replace('plus-square', 'create').replace('trash-2', 'trash');
        const iconSvg = ICONS[iconName] || ICONS.info;
        const temp = document.createElement('div');
        temp.innerHTML = iconSvg;
        const svg = temp.firstChild;
        if (el.className) svg.setAttribute('class', el.className);
        if (el.getAttribute('style')) svg.setAttribute('style', el.getAttribute('style'));
        el.parentNode.replaceChild(svg, el);
    });
}

// === Init ===
document.addEventListener('DOMContentLoaded', () => {
    initUserInfo();
    navigateTo('overview');
    renderIcons();
    renderVersion();
});

function renderVersion() {
    const el = document.getElementById('app-version-label');
    if (el) el.textContent = `v${APP_VERSION}`;
}

async function initUserInfo() {
    const cachedUser = API.getUser();
    if (cachedUser) {
        currentUser = cachedUser;
        renderUserData(currentUser);
        // If we have cached data, we don't block the start
        // We'll update the profile in the background
        API.getProfile().then(data => {
            if (data.user) {
                currentUser = data.user;
                renderUserData(currentUser);
            }
        }).catch(() => {});
        return;
    }
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
    const mobileAvatarEl = document.getElementById('mobile-user-avatar');

    if (nameEl) nameEl.textContent = user.name || 'Usuario';
    if (planEl) planEl.textContent = `Plan ${(user.plan || 'free').charAt(0).toUpperCase() + (user.plan || 'free').slice(1)}`;
    if (avatarEl) {
        if (user.avatar_url) {
            const imgHTML = `<img src="${user.avatar_url}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;" onerror="this.onerror=null; this.parentElement.innerHTML='${(user.name || 'U').charAt(0).toUpperCase()}'; this.parentElement.style.background='${user.avatar_color || 'var(--primary)'}';">`;
            avatarEl.innerHTML = imgHTML;
            avatarEl.style.background = 'transparent';
            if (mobileAvatarEl) {
                mobileAvatarEl.innerHTML = imgHTML;
                mobileAvatarEl.style.background = 'transparent';
            }
        } else {
            const initial = (user.name || 'U').charAt(0).toUpperCase();
            const bg = user.avatar_color || 'var(--gradient-primary)';
            avatarEl.textContent = initial;
            avatarEl.style.background = bg;
            avatarEl.innerHTML = initial;
            if (mobileAvatarEl) {
                mobileAvatarEl.textContent = initial;
                mobileAvatarEl.style.background = bg;
                mobileAvatarEl.innerHTML = initial;
            }
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

    // Update bottom nav active state
    document.querySelectorAll('.bottom-nav-item').forEach(link => {
        if (link.dataset.section) {
            link.classList.toggle('active', link.dataset.section === section);
        }
    });

    // Close mobile sidebar
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.remove('open');

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
    const titleEl = document.getElementById('page-title');
    if (titleEl) {
        // Keep the logo, only change the text span if it exists
        const span = titleEl.querySelector('span');
        if (span) {
            span.textContent = section === 'overview' ? 'Postly' : (titles[section] || 'Postly');
        } else {
            titleEl.textContent = titles[section] || 'Postly';
        }
    }

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
    renderIcons();
}

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    if (sidebar) sidebar.classList.toggle('open');
}

function logout() {
    API.clearAuth();
    window.location.href = './index.html';
}

// === Toast Notifications ===
function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const iconSvg = ICONS[type] || ICONS.info;
    toast.innerHTML = `${iconSvg} <span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => {
        toast.classList.add('toast-exit');
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// === Modal ===
function openModal(html) {
    const modalContent = document.getElementById('modal-content');
    const modalOverlay = document.getElementById('modal-overlay');
    if (modalContent) modalContent.innerHTML = html;
    if (modalOverlay) modalOverlay.classList.add('active');
}

function closeModal(e) {
    if (e && e.target !== e.currentTarget) return;
    const modalOverlay = document.getElementById('modal-overlay');
    if (modalOverlay) modalOverlay.classList.remove('active');
}

// === Onboarding ===
async function handleOnboarding(e) {
    if (e) e.preventDefault();
    const btn = document.getElementById('ob-btn');
    if (btn) {
        btn.disabled = true;
        btn.textContent = 'Guardando...';
    }

    const payload = {
        account_type: document.getElementById('ob-account-type')?.value,
        business_type: document.getElementById('ob-type')?.value,
        target_audience: document.getElementById('ob-audience')?.value,
        brand_voice: document.getElementById('ob-voice')?.value
    };

    try {
        const res = await API.updateProfile(payload);
        
        localStorage.setItem('sp_user', JSON.stringify(res.user));
        Object.assign(currentUser, res.user);
        
        const overlay = document.getElementById('onboarding-overlay');
        if (overlay) overlay.classList.remove('active');
        showToast('¡Perfil completado con éxito!', 'success');
        
    } catch(err) {
        showToast(err.message, 'error');
        if (btn) {
            btn.disabled = false;
            btn.textContent = 'Comenzar a usar la app';
        }
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

// === CORE RENDERERS ===

async function renderOverview() {
    const body = document.getElementById('main-body');
    const user = currentUser || API.getUser();
    const isConnected = !!(user && user.fb_page_id);
    
    const connectionHTML = isConnected 
        ? `<div class="connection-status connected"><span class="connection-dot"></span> Conectado a Meta</div>`
        : `<div class="connection-status disconnected"><span class="connection-dot"></span> Sin redes conectadas</div>`;

    body.innerHTML = `
        <div style="margin-bottom: 24px;">
            <div style="font-size: 13px; color: var(--text-muted); margin-bottom: 4px;">Hola, ${user.name || 'Usuario'}</div>
            <h2 style="font-size: 24px; font-weight: 800; margin: 0;">Dashboard</h2>
        </div>

        <div style="margin-bottom: 24px;">
            ${connectionHTML}
        </div>

        <div class="stats-grid" style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; margin-bottom:24px;">
            <div class="stat-card" style="cursor:pointer;" onclick="if(window.Capacitor) window.Capacitor.Plugins.NativeUI.openDashboard()">
                <div class="stat-label">Total Posts <span style="font-size:9px; color:var(--primary); font-weight:800;">VER NATIVO</span></div>
                <div id="stat-total" class="stat-value">...</div>
            </div>
            <div class="stat-card">
                <div class="stat-label">Créditos</div>
                <div id="stat-credits" class="stat-value">...</div>
            </div>
        </div>

        <div style="margin-bottom: 24px;">
            <h3 style="margin-bottom:16px; font-size:16px; font-weight:800;">Acciones Rápidas</h3>
            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px;">
                <button class="admin-user-card" style="margin:0; text-align:center; padding:16px;" onclick="navigateTo('create')">
                    <div style="font-size:24px; margin-bottom:8px;">✍️</div>
                    <div style="font-weight:700; font-size:14px;">Crear Post</div>
                </button>
                <button class="admin-user-card" style="margin:0; text-align:center; padding:16px;" onclick="navigateTo('ai')">
                    <div style="font-size:24px; margin-bottom:8px;">✨</div>
                    <div style="font-weight:700; font-size:14px;">IA Assistant</div>
                </button>
            </div>
        </div>

        <div style="margin-bottom: 24px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px;">
                <h3 style="margin:0; font-size:16px; font-weight:800;">Posts Recientes</h3>
                <button class="btn btn-ghost btn-sm" onclick="navigateTo('posts')">Ver todos</button>
            </div>
            <div id="recent-posts-list">
                <div class="skeleton" style="height:80px;border-radius:12px;margin-bottom:12px;"></div>
            </div>
        </div>
    `;

    renderIcons();
    loadOverviewData();
}

async function loadOverviewData() {
    try {
        const stats = await API.getPostStats();
        document.getElementById('stat-total').textContent = stats.total || 0;
        
        const profile = await API.getProfile();
        currentUser = profile.user;
        document.getElementById('stat-credits').textContent = currentUser.posts_remaining || 0;

        const postsData = await API.getPosts({ limit: 3 });
        const listDiv = document.getElementById('recent-posts-list');
        
        if (postsData.posts.length === 0) {
            listDiv.innerHTML = `<div style="text-align:center; padding:20px; color:var(--text-muted); font-size:13px;">No hay posts aún.</div>`;
        } else {
            listDiv.innerHTML = postsData.posts.map(post => `
                <div class="admin-user-card" style="margin-bottom:12px; padding:12px; display:flex; gap:12px;">
                    ${(post.image || post.image_path) ? `<img src="${getAbsoluteImageUrl(post.image || post.image_path)}" style="width:50px; height:50px; border-radius:8px; object-fit:cover;">` : `<div style="width:50px; height:50px; background:#f1f5f9; border-radius:8px; display:flex; align-items:center; justify-content:center;">📄</div>`}
                    <div style="flex:1; overflow:hidden;">
                        <div style="font-size:13px; font-weight:700; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${post.content || 'Sin texto'}</div>
                        <div style="font-size:11px; color:var(--text-secondary); margin-top:4px;">${formatDate(post.created_at)} • ${post.status}</div>
                    </div>
                </div>
            `).join('');
        }
    } catch (err) { console.error(err); }
}

async function renderPosts() {
    const body = document.getElementById('main-body');
    body.innerHTML = `
        <div style="margin-bottom: 24px; display:flex; justify-content:space-between; align-items:center;">
            <h2 style="font-size:22px; font-weight:800; margin:0;">Mis Posts</h2>
            <button class="btn btn-primary btn-sm" onclick="navigateTo('create')">＋ Nuevo</button>
        </div>
        <div id="posts-list-container">
            <div class="skeleton" style="height:100px; margin-bottom:12px;"></div>
        </div>
    `;
    loadPostsList();
}

async function loadPostsList() {
    try {
        const data = await API.getPosts();
        const container = document.getElementById('posts-list-container');
        if (data.posts.length === 0) {
            container.innerHTML = `<div style="text-align:center; padding:40px;">📂 No hay publicaciones.</div>`;
            return;
        }
        container.innerHTML = data.posts.map(post => `
            <div class="admin-user-card" style="margin-bottom:16px; padding:0; overflow:hidden;">
                ${(post.image || post.image_path) ? `<img src="${getAbsoluteImageUrl(post.image || post.image_path)}" style="width:100%; height:160px; object-fit:cover;">` : ''}
                <div style="padding:16px;">
                    <div style="font-size:14px; line-height:1.5; margin-bottom:12px;">${post.content || ''}</div>
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span class="badge ${post.status === 'published' ? 'badge-success' : 'badge-warning'}">${post.status}</span>
                        <div style="display:flex; gap:8px;">
                            <button class="btn btn-ghost btn-sm" onclick="deletePost('${post.id}')" style="color:var(--danger);">🗑️</button>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');
    } catch (err) { showToast(err.message, 'error'); }
}

async function deletePost(id) {
    if (!confirm('¿Eliminar post?')) return;
    try {
        await API.deletePost(id);
        showToast('Post eliminado');
        renderPosts();
    } catch (err) { showToast(err.message, 'error'); }
}

function renderCreatePost() {
    const body = document.getElementById('main-body');
    const userName = currentUser ? (currentUser.brand_name || currentUser.name || 'Usuario') : 'Usuario';
    const userInitial = userName.charAt(0).toUpperCase();

    body.innerHTML = `
        <div style="margin-bottom:20px;">
            <h2 style="font-size:22px; font-weight:800; margin:0;">Crear Publicación</h2>
        </div>
        
        <div id="create-post-container">
            <!-- Top Section: Integrated Mockup -->
            <div class="phone-mockup-wrapper">
                <div class="phone-mockup" id="mockup-container">
                    <div class="phone-mockup-screen">
                        <div class="phone-mockup-header">
                            <div class="phone-mockup-avatar" id="mockup-avatar-container">
                                ${currentUser && currentUser.avatar_url 
                                    ? `<img src="${currentUser.avatar_url}" style="width:100%; height:100%; object-fit:cover;">` 
                                    : `<div class="phone-mockup-avatar-inner" style="background:${currentUser?.avatar_color || 'var(--primary)'}">${userInitial}</div>`}
                            </div>
                            <div class="phone-mockup-username">
                                <div class="mockup-username-text" id="mockup-username-display">${userName}</div>
                                <div class="mockup-fb-time" id="mockup-time-display">Justo ahora · 🌎</div>
                            </div>
                            <div style="margin-left:auto; color:#94a3b8; font-weight:700;">•••</div>
                        </div>
                        
                        <div class="phone-mockup-image" id="mockup-img-area" onclick="document.getElementById('post-image').click()">
                            <div id="mockup-image-placeholder" style="display:flex; flex-direction:column; align-items:center; gap:8px;">
                                <i data-lucide="image" style="width:48px; height:48px; color:#cbd5e1;"></i>
                                <span style="color:#94a3b8; font-size:14px;">Toca para subir foto</span>
                            </div>
                        </div>

                        <div class="phone-mockup-actions" id="mockup-actions-bar"></div>

                        <div class="phone-mockup-caption">
                            <span style="font-weight:700; margin-right:6px;" id="mockup-caption-user">${userName}</span>
                            <span id="mockup-caption-text">Tu texto aparecerá aquí...</span>
                        </div>
                    </div>
                </div>
                <input type="file" id="post-image" accept="image/*" style="display:none;" onchange="handleImagePreview(event)">
                
                <div id="filter-btn-container" style="display:none; margin-top:12px;">
                    <button class="btn btn-outline btn-sm" style="width:100%; border-radius:12px; background:white;" onclick="openFilterEditor()">🎨 Aplicar Filtros Profesionales</button>
                </div>
            </div>

            <!-- Bottom Section: Controls -->
            <div class="admin-user-card" style="padding:20px; border-radius:24px;">
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:12px; margin-bottom:16px;">
                    <div>
                        <label class="form-label" style="font-size:11px;">Red Social</label>
                        <select id="post-platform" class="form-select" style="font-size:13px; height:45px; border-radius:12px;" onchange="updateMockup()">
                            <option value="facebook">Facebook</option>
                            <option value="instagram" selected>Instagram</option>
                        </select>
                    </div>
                    <div>
                        <label class="form-label" style="font-size:11px;">Formato</label>
                        <select id="post-type" class="form-select" style="font-size:13px; height:45px; border-radius:12px;" onchange="updateMockup()">
                            <option value="feed">Post Cuadrado</option>
                            <option value="story">Historia / Reel</option>
                        </select>
                    </div>
                </div>

                <div class="form-group" style="margin-bottom:12px;">
                    <label class="form-label">Pista para la IA (Opcional)</label>
                    <input type="text" id="post-pista" class="form-input" style="height:45px; border-radius:12px;" placeholder="Ej: Es una pizza de pepperoni muy rica">
                </div>

                <div style="display:flex; gap:10px; margin-bottom:16px;">
                    <button class="btn btn-outline btn-sm" style="flex:1; border-radius:12px;" onclick="aiGenerateInline('caption')">✨ Escribir Texto</button>
                    <button class="btn btn-outline btn-sm" style="flex:1; border-radius:12px;" onclick="aiGenerateInline('hashtags')"># Hashtags</button>
                </div>

                <div id="ai-inline-result" style="display:none;" class="ai-result">
                    <div id="ai-inline-text" style="font-size:13px; line-height:1.4;"></div>
                    <div class="ai-result-actions">
                        <button type="button" class="btn btn-primary btn-sm" style="padding:6px 12px; font-size:11px;" onclick="useAIResult()">Usar Texto</button>
                        <button type="button" class="btn btn-ghost btn-sm" style="padding:6px 12px; font-size:11px;" onclick="aiGenerateInline(lastAIType)">🔄 Otro</button>
                        <button type="button" class="btn btn-ghost btn-sm" style="padding:6px 12px; font-size:11px;" onclick="document.getElementById('ai-inline-result').style.display='none'">✕</button>
                    </div>
                </div>

                <label class="form-label" style="margin-top:12px;">Contenido del Post</label>
                <textarea id="post-content" class="form-textarea" rows="4" style="border-radius:16px; padding:12px;" placeholder="Escribe tu mensaje aquí..." oninput="updateMockup()"></textarea>

                <button class="btn btn-primary" id="btn-submit-post" style="width:100%; height:56px; font-size:16px; font-weight:800; border-radius:16px; margin-top:20px;" onclick="submitPost()">Publicar Ahora</button>
            </div>
        </div>
    `;
    renderIcons();
    updateMockup();

    // Precargar anuncio si estamos en la app nativa
    if (window.Capacitor && window.Capacitor.Plugins.AdMob) {
        console.log("[ADS] Precargando anuncio rewarded...");
        window.Capacitor.Plugins.AdMob.loadRewardedAd().catch(e => console.warn("[ADS] Error precarga:", e));
    }
}

function updateMockup() {
    const content = document.getElementById('post-content')?.value || 'Tu texto aparecerá aquí...';
    const platform = document.getElementById('post-platform')?.value || 'instagram';
    const type = document.getElementById('post-type')?.value || 'feed';
    
    const container = document.getElementById('mockup-container');
    const imgArea = document.getElementById('mockup-img-area');
    const actionsBar = document.getElementById('mockup-actions-bar');
    const captionText = document.getElementById('mockup-caption-text');
    const timeDisplay = document.getElementById('mockup-time-display');

    if (!container) return;

    // Platform specific look
    if (platform === 'facebook') {
        container.className = 'phone-mockup platform-facebook';
        timeDisplay.style.display = 'block';
        actionsBar.innerHTML = `
            <div style="display:flex; justify-content:space-around; width:100%; border-top:1px solid #e2e8f0; padding-top:10px; font-size:12px; font-weight:600; color:#64748b;">
                <span>👍 Me gusta</span>
                <span>💬 Comentar</span>
                <span>🚀 Compartir</span>
            </div>
        `;
    } else {
        container.className = 'phone-mockup platform-instagram';
        timeDisplay.style.display = 'none';
        actionsBar.innerHTML = `
            <i data-lucide="heart" style="width:24px; height:24px;"></i>
            <i data-lucide="message-circle" style="width:24px; height:24px;"></i>
            <i data-lucide="send" style="width:24px; height:24px;"></i>
            <i data-lucide="bookmark" style="width:24px; height:24px; margin-left:auto;"></i>
        `;
        renderIcons();
    }

    // Aspect Ratio
    if (type === 'story') {
        container.classList.add('format-story');
    } else {
        container.classList.remove('format-story');
    }

    // Text update
    if (captionText) {
        captionText.innerHTML = content.replace(/\n/g, '<br>');
    }

    // Image update
    if (imgArea) {
        if (currentImageBase64) {
            imgArea.innerHTML = `<img src="${currentImageBase64}" style="width:100%; height:100%; object-fit:cover;">`;
            imgArea.classList.add('has-image');
        } else {
            imgArea.innerHTML = `
                <div style="display:flex; flex-direction:column; align-items:center; gap:8px;">
                    <i data-lucide="image" style="width:48px; height:48px; color:#cbd5e1;"></i>
                    <span style="color:#94a3b8; font-size:14px;">Toca para subir foto</span>
                </div>
            `;
            imgArea.classList.remove('has-image');
            renderIcons();
        }
    }
}

function handleImagePreview(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ex) => {
        currentImageBase64 = ex.target.result;
        updateMockup();
        document.getElementById('filter-btn-container').style.display = 'block';
    };
    reader.readAsDataURL(file);
}

let lastAIType = 'caption';
async function aiGenerateInline(type) {
    lastAIType = type;
    const hint = document.getElementById('post-pista').value;
    const resultDiv = document.getElementById('ai-inline-result');
    const resultText = document.getElementById('ai-inline-text');

    resultDiv.style.display = 'block';
    resultText.innerHTML = '<div style="display:flex;align-items:center;gap:8px;"><div class="spinner"></div> Pensando...</div>';

    try {
        let res;
        if (type === 'caption') {
            const prompt = hint || 'Un post para redes sociales';
            const data = await API.generateAIContent(`Escribe un caption profesional y creativo sobre: ${prompt}`);
            res = data.content;
        } else {
            const prompt = hint || document.getElementById('post-content').value || 'Marketing';
            const data = await API.generateHashtags(prompt);
            res = data.hashtags;
        }
        resultText.textContent = res;
    } catch (err) {
        resultText.textContent = 'Error: ' + err.message;
    }
}

function useAIResult() {
    const text = document.getElementById('ai-inline-text').textContent;
    const textarea = document.getElementById('post-content');
    if (lastAIType === 'hashtags' && textarea.value) {
        textarea.value += '\\n\\n' + text;
    } else {
        textarea.value = text;
    }
    updateMockup();
    document.getElementById('ai-inline-result').style.display = 'none';
    showToast('¡Texto aplicado!');
}

async function submitPost() {
    const content = document.getElementById('post-content').value;
    const platform = document.getElementById('post-platform').value;
    const type = document.getElementById('post-type').value;

    if (!content && !currentImageBase64) {
        showToast('Escribe algo o sube una imagen', 'warning');
        return;
    }

    const btn = document.getElementById('btn-submit-post');
    btn.disabled = true;
    const originalText = btn.textContent;
    btn.textContent = 'Publicando...';

    try {
        // --- LÓGICA DE MONETIZACIÓN: SIEMPRE ver anuncio antes de publicar ---
        if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.AdMob) {
            btn.textContent = 'Cargando Anuncio...';
            try {
                let isReady = await window.Capacitor.Plugins.AdMob.isAdReady();
                
                if (!isReady.ready) {
                    btn.textContent = 'Cargando Video...';
                    await window.Capacitor.Plugins.AdMob.loadRewardedAd();
                    // Wait a second for it to actually be ready
                    await new Promise(r => setTimeout(r, 1500));
                    isReady = await window.Capacitor.Plugins.AdMob.isAdReady();
                }

                if (isReady.ready) {
                    const result = await window.Capacitor.Plugins.AdMob.showRewardedAd();
                    if (result.completed) {
                        btn.textContent = 'Verificando...';
                        try { await API.verifyAdReward(); } catch(e) {}
                        showToast('¡Anuncio visto!', 'success');
                    } else {
                        throw new Error('Debes ver el anuncio para publicar.');
                    }
                } else {
                    console.warn('[ADS] Ad still not ready after load attempt.');
                    showToast('Anuncio no disponible. Publicando como cortesía...', 'warning');
                }
            } catch (adError) {
                console.error('[ADS] Error:', adError.message);
                showToast('Error de anuncios. Publicando...', 'warning');
            }
        }
        // --- FIN LÓGICA MONETIZACIÓN ---


        // 1. Create the post as draft
        btn.textContent = 'Guardando...';
        const createRes = await API.createPost({
            content,
            image_base64: currentImageBase64,
            platform,
            aspect_ratio: type,
            status: 'draft'
        });

        if (!createRes.post || !createRes.post.id) {
            throw new Error('Error al crear el borrador del post');
        }

        const postId = createRes.post.id;

        // 2. Publish the post
        btn.textContent = 'Publicando en redes...';
        const publishRes = await API.publishPost(postId);
        
        if (publishRes.message && publishRes.message.includes('simulado')) {
            showToast(publishRes.message, 'info');
        } else {
            showToast('¡Publicado con éxito!', 'success');
            
            // SAVE TO GALLERY (New Feature)
            if (window.Capacitor && window.Capacitor.Plugins.NativeUI && currentImageBase64) {
                try {
                    const galleryRes = await window.Capacitor.Plugins.NativeUI.saveToGallery({ image: currentImageBase64 });
                    console.log('[GALLERY] Guardado en:', galleryRes.uri);
                    // We could store galleryRes.uri in the post metadata if the API supported it
                } catch (gErr) {
                    console.warn('[GALLERY] No se pudo guardar en galería:', gErr.message);
                }
            }
        }

        currentImageBase64 = null;
        navigateTo('posts');
    } catch (err) {
        console.error('[SUBMIT] Error:', err);
        showToast(err.message || 'Error al procesar la publicación', 'error');
        btn.disabled = false;
        btn.textContent = originalText;
    }
}


async function renderCalendar() {
    const body = document.getElementById('main-body');
    body.innerHTML = `
        <h2 style="font-size:22px; font-weight:800; margin-bottom:20px;">Calendario</h2>
        <div class="admin-user-card" style="padding:20px; text-align:center;">
            <div style="font-size:48px; margin-bottom:16px;">📅</div>
            <p>Próximamente: Gestiona tus publicaciones programadas de forma visual.</p>
        </div>
    `;
}

// === SECONDARY RENDERERS ===

function renderAI() {
    const body = document.getElementById('main-body');
    body.innerHTML = `
        <h2 style="font-size:22px; font-weight:800; margin-bottom:8px;">Asistente IA</h2>
        <p style="color:var(--text-secondary); font-size:13px; margin-bottom:24px;">Potencia tus redes con inteligencia artificial.</p>

        <div style="display:grid; gap:16px;">
            <div class="admin-user-card" style="padding:20px; display:flex; align-items:center; gap:16px;" onclick="openAITool('cerebro')">
                <div style="font-size:32px;">🧠</div>
                <div>
                    <div style="font-weight:700;">Cerebro Visual</div>
                    <div style="font-size:12px; color:var(--text-secondary);">Captions e ideas para tus fotos</div>
                </div>
            </div>
            <div class="admin-user-card" style="padding:20px; display:flex; align-items:center; gap:16px;" onclick="openAITool('seo')">
                <div style="font-size:32px;">#️⃣</div>
                <div>
                    <div style="font-weight:700;">Hashtags Virales</div>
                    <div style="font-size:12px; color:var(--text-secondary);">SEO para mayor alcance</div>
                </div>
            </div>
        </div>
    `;
}

let currentAITool = 'cerebro';
function openAITool(tool) {
    currentAITool = tool;
    const modal = document.getElementById('ai-modal');
    if (modal) {
        modal.style.display = 'flex';
        document.getElementById('ai-title').textContent = tool === 'cerebro' ? 'Cerebro Visual' : 'Hashtags Virales';
        document.getElementById('ai-result').style.display = 'none';
        document.getElementById('ai-form-container').style.display = 'block';
    }
}

async function generateAI() {
    const prompt = document.getElementById('ai-input').value;
    if (!prompt) return;
    const resDiv = document.getElementById('ai-result');
    const textDiv = document.getElementById('ai-result-text');
    const formDiv = document.getElementById('ai-form-container');
    
    const originalForm = formDiv.innerHTML;
    formDiv.innerHTML = '<div style="text-align:center; padding:20px;"><div class="spinner"></div><p>Pensando...</p></div>';
    
    try {
        let result;
        if (currentAITool === 'cerebro') {
            const data = await API.generateAIContent(`Caption para: ${prompt}`);
            result = data.content;
        } else {
            const data = await API.generateHashtags(prompt);
            result = data.hashtags;
        }
        textDiv.textContent = result;
        formDiv.style.display = 'none';
        resDiv.style.display = 'block';
        formDiv.innerHTML = originalForm;
    } catch (err) {
        showToast(err.message, 'error');
        formDiv.innerHTML = originalForm;
    }
}

function copyAI() {
    navigator.clipboard.writeText(document.getElementById('ai-result-text').textContent);
    showToast('Copiado');
}

function useAIText() {
    const text = document.getElementById('ai-result-text').textContent;
    navigateTo('create');
    setTimeout(() => {
        const textarea = document.getElementById('post-content');
        if (textarea) {
            textarea.value = text;
            updateMockup();
        }
    }, 100);
    document.getElementById('ai-modal').style.display = 'none';
}

function renderSettings() {
    const body = document.getElementById('main-body');
    const user = currentUser;
    body.innerHTML = `
        <h2 style="font-size:22px; font-weight:800; margin-bottom:24px;">Configuración</h2>
        
        <div class="admin-user-card" style="padding:20px; margin-bottom:20px;">
            <h3 style="font-size:16px; margin-bottom:16px;">Perfil</h3>
            <div class="form-group">
                <label class="form-label">Nombre</label>
                <input type="text" id="set-name" class="form-input" value="${user.name}">
            </div>
            <div class="form-group" style="margin-top:12px;">
                <label class="form-label">Email</label>
                <input type="text" class="form-input" value="${user.email}" disabled>
            </div>
            <button class="btn btn-primary" style="width:100%; margin-top:20px;" onclick="updateProfile()">Guardar Cambios</button>
        </div>

        <div class="admin-user-card" style="padding:20px;">
            <h3 style="font-size:16px; margin-bottom:16px;">Redes Sociales</h3>
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <div style="display:flex; align-items:center; gap:12px;">
                    <div style="width:32px; height:32px; background:#1877F2; color:white; border-radius:8px; display:flex; align-items:center; justify-content:center;">F</div>
                    <div>
                        <div style="font-weight:700; font-size:14px;">Facebook / Meta</div>
                        <div style="font-size:11px; color:var(--text-secondary);">${user.fb_page_id ? 'Conectado ✅' : 'No conectado'}</div>
                    </div>
                </div>
                <button class="btn btn-outline btn-sm" onclick="connectWithFacebook()">${user.fb_page_id ? 'Reconectar' : 'Conectar'}</button>
            </div>
        </div>

        <button class="btn btn-outline" style="width:100%; margin-top:32px; color:var(--danger); border-color:var(--danger);" onclick="logout()">Cerrar Sesión</button>
    `;
}

async function updateProfile() {
    const name = document.getElementById('set-name').value;
    try {
        const res = await API.updateProfile({ name });
        Object.assign(currentUser, res.user);
        showToast('Perfil actualizado');
        initUserInfo();
    } catch (err) { showToast(err.message, 'error'); }
}

function renderBrand() {
    const body = document.getElementById('main-body');
    const user = currentUser;
    body.innerHTML = `
        <h2 style="font-size:22px; font-weight:800; margin-bottom:8px;">Mi Marca</h2>
        <p style="color:var(--text-secondary); font-size:13px; margin-bottom:24px;">Configura tu ADN de marca para la IA.</p>

        <div class="admin-user-card" style="padding:20px;">
            <div class="form-group" style="margin-bottom:16px;">
                <label class="form-label">Nombre de Marca</label>
                <input type="text" id="brand-name" class="form-input" value="${user.brand_name || ''}">
            </div>
            <div class="form-group" style="margin-bottom:16px;">
                <label class="form-label">Rubro / Industria</label>
                <input type="text" id="brand-industry" class="form-input" value="${user.brand_industry || ''}">
            </div>
            <div class="form-group">
                <label class="form-label">Tono de Voz</label>
                <select id="brand-tone" class="form-select">
                    <option value="Amigable" ${user.brand_tone === 'Amigable' ? 'selected' : ''}>Amigable</option>
                    <option value="Profesional" ${user.brand_tone === 'Profesional' ? 'selected' : ''}>Profesional</option>
                    <option value="Divertido" ${user.brand_tone === 'Divertido' ? 'selected' : ''}>Divertido</option>
                </select>
            </div>
            <button class="btn btn-primary" style="width:100%; margin-top:20px;" onclick="updateBrand()">Guardar ADN</button>
        </div>
    `;
}

async function updateBrand() {
    const brand_name = document.getElementById('brand-name').value;
    const brand_industry = document.getElementById('brand-industry').value;
    const brand_tone = document.getElementById('brand-tone').value;
    try {
        const res = await API.updateProfile({ brand_name, brand_industry, brand_tone });
        Object.assign(currentUser, res.user);
        showToast('Marca actualizada');
    } catch (err) { showToast(err.message, 'error'); }
}

async function renderAdmin(tab = 'users') {
    const body = document.getElementById('main-body');
    body.innerHTML = `
        <h2 style="font-size:22px; font-weight:800; margin-bottom:20px;">Panel Admin</h2>
        
        <div style="display:flex; gap:12px; margin-bottom:24px;">
            <button class="tab-chip ${tab === 'users' ? 'active' : ''}" onclick="toggleAdminTab('users')">Usuarios</button>
            <button class="tab-chip ${tab === 'status' ? 'active' : ''}" onclick="toggleAdminTab('status')">Estado</button>
        </div>

        <div id="admin-content"></div>
    `;

    const content = document.getElementById('admin-content');
    if (tab === 'users') {
        content.innerHTML = '<div class="skeleton" style="height:200px;"></div>';
        try {
            const data = await API.getAdminUsers();
            const users = data.users || [];
            if (users.length === 0) {
                content.innerHTML = '<div style="text-align:center; padding:40px; color:var(--text-muted);">No se encontraron usuarios.</div>';
                return;
            }
            content.innerHTML = users.map(u => `
                <div class="admin-user-card" style="padding:16px; margin-bottom:12px; border-radius:16px;">
                    <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                        <div>
                            <div style="font-weight:800; font-size:15px;">${u.name}</div>
                            <div style="font-size:12px; color:var(--text-secondary);">${u.email}</div>
                        </div>
                        <span class="badge ${u.plan === 'free' ? 'badge-warning' : 'badge-success'}">${u.plan}</span>
                    </div>
                    <div style="margin-top:12px; display:flex; gap:10px;">
                        <button class="btn btn-outline btn-sm" style="flex:1;" onclick="toggleUserRole('${u.id}', ${u.is_admin})">${u.is_admin ? 'Quitar Admin' : 'Hacer Admin'}</button>
                        <button class="btn btn-ghost btn-sm" style="color:var(--danger);" onclick="adminDeleteUser('${u.id}')">🗑️</button>
                    </div>
                </div>
            `).join('');
        } catch (err) { content.innerHTML = err.message; }
    } else {
        content.innerHTML = `
            <div class="admin-user-card" style="padding:20px;">
                <div style="font-weight:700; margin-bottom:12px;">Estado del Sistema</div>
                <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid var(--border);"><span>API</span> <span style="color:var(--success);">Online ✅</span></div>
                <div style="display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid var(--border);"><span>Versión</span> <span>${APP_VERSION}</span></div>
            </div>
        `;
    }
}

async function toggleUserRole(id, currentAdmin) {
    try {
        await API.request(`/api/admin/users/${id}/role`, { method: 'POST', body: JSON.stringify({ is_admin: !currentAdmin }) });
        showToast('Rol actualizado');
        renderAdmin('users');
    } catch (err) { showToast(err.message, 'error'); }
}

async function adminDeleteUser(id) {
    if (!confirm('¿ELIMINAR USUARIO PERMANENTEMENTE?')) return;
    try {
        await API.request(`/api/admin/users/${id}`, { method: 'DELETE' });
        showToast('Usuario eliminado');
        renderAdmin('users');
    } catch (err) { showToast(err.message, 'error'); }
}

async function renderBilling() {
    const body = document.getElementById('main-body');
    const user = currentUser;
    body.innerHTML = `
        <h2 style="font-size:22px; font-weight:800; margin-bottom:8px;">Planes y Créditos</h2>
        <p style="color:var(--text-secondary); font-size:13px; margin-bottom:24px;">Tu saldo actual: <strong>${user.posts_remaining || 0} publicaciones</strong></p>

        <div style="display:grid; gap:16px;">
            <div class="admin-user-card" style="padding:20px; border:2px solid var(--primary); background:white;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                    <h3 style="margin:0; font-size:18px;">Abono Semanal</h3>
                    <div style="font-weight:800; font-size:20px; color:var(--primary);">$10.000</div>
                </div>
                <ul style="margin:0 0 20px 0; padding:0; list-style:none; font-size:13px; color:var(--text-secondary);">
                    <li style="margin-bottom:8px;">✅ 10 Publicaciones</li>
                    <li>✅ Asistente IA Ilimitado</li>
                </ul>
                <button class="btn btn-primary" style="width:100%; height:48px; border-radius:12px;" onclick="buyPlan('semanal')">Comprar Plan</button>
            </div>
        </div>

        <div style="margin-top:32px; text-align:center; opacity:0.6;">
            <img src="https://http2.mlstatic.com/frontend-assets/ui-navigation/5.19.1/mercadopago/logo__small@2x.png" style="height:20px;">
            <div style="font-size:11px; margin-top:8px;">Pagos procesados por Mercado Pago</div>
        </div>
    `;
}

// === HELPERS ===

function toggleAdminTab(tab) {
    renderAdmin(tab);
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text);
    showToast('Copiado al portapapeles', 'success');
}

async function buyPlan(planId) {
    try {
        const res = await API.request('/api/billing/create-preference', {
            method: 'POST',
            body: { planId }
        });
        if (res.init_point) window.location.href = res.init_point;
    } catch (err) { showToast(err.message, 'error'); }
}

function platformIcon(p) {
    if (p === 'facebook') return ICONS.facebook;
    if (p === 'instagram') return ICONS.instagram;
    return ICONS.posts;
}

function statusBadge(status) {
    if (status === 'published') return '<span class="badge badge-success">Publicado</span>';
    if (status === 'scheduled') return '<span class="badge badge-info">Programado</span>';
    return '<span class="badge badge-warning">Borrador</span>';
}

// === PHOTO FILTERS ===
let originalImageDataURL = null;

function openFilterEditor() {
    if (!currentImageBase64) return;
    
    // Check if running in Native Android
    if (window.Capacitor && window.Capacitor.isNativePlatform()) {
        window.Capacitor.Plugins.NativeUI.openPhotoEditor({ image: currentImageBase64 })
            .then(result => {
                if (result.image) {
                    currentImageBase64 = result.image;
                    updateMockup();
                    showToast('Imagen editada en modo nativo', 'success');
                }
            })
            .catch(err => {
                console.log('Native editor cancelled or failed:', err);
                // Fallback to web editor if native fails
                openWebFilterEditor();
            });
        return;
    }

    openWebFilterEditor();
}

function openWebFilterEditor() {
    let container = document.getElementById('filter-editor-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'filter-editor-container';
        container.className = 'filter-editor-overlay';
        container.innerHTML = `
            <div class="filter-editor-header">
                <button onclick="closeFilterEditor()">Cancelar</button>
                <div style="font-weight:700; color:white;">Filtros</div>
                <button class="btn-apply-filter" onclick="applyFilterAndClose()">Aplicar</button>
            </div>
            <div class="filter-preview-area">
                <canvas id="filter-main-canvas"></canvas>
            </div>
            <div class="filter-picker">
                <div class="filter-picker-scroll" id="filter-picker-scroll"></div>
            </div>
        `;
        document.body.appendChild(container);
    }
    
    container.style.display = 'flex';
    originalImageDataURL = currentImageBase64;
    
    const img = new Image();
    img.onload = () => {
        const canvas = document.getElementById('filter-main-canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        
        if (window.PhotoFilters) {
            renderFilterThumbnails(img);
        } else {
            showToast('Librería de filtros no cargada', 'error');
        }
    };
    img.src = currentImageBase64;
}

function closeFilterEditor() {
    const container = document.getElementById('filter-editor-container');
    if (container) container.style.display = 'none';
}

function applyFilterAndClose() {
    const canvas = document.getElementById('filter-main-canvas');
    currentImageBase64 = canvas.toDataURL('image/jpeg', 0.9);
    closeFilterEditor();
    updateMockup();
    showToast('Filtro aplicado', 'success');
}

function renderFilterThumbnails(sourceImg) {
    const scrollEl = document.getElementById('filter-picker-scroll');
    scrollEl.innerHTML = '';
    
    if (!window.PhotoFilters) return;

    // Get preset names without duplicating 'Original'
    const presetEntries = Object.entries(window.PhotoFilters.presets);
    
    presetEntries.forEach(([name, filterKey]) => {
        const chip = document.createElement('div');
        chip.className = 'filter-chip';
        
        // Create a small preview canvas
        const pCanvas = document.createElement('canvas');
        pCanvas.width = 100;
        pCanvas.height = 100;
        const pCtx = pCanvas.getContext('2d');
        
        // Draw centered square from original
        const size = Math.min(sourceImg.width, sourceImg.height);
        pCtx.drawImage(sourceImg, (sourceImg.width - size)/2, (sourceImg.height - size)/2, size, size, 0, 0, 100, 100);
        
        // Apply filter to thumbnail — use returned canvas for the preview image
        let previewCanvas = pCanvas;
        if (filterKey) {
            previewCanvas = window.PhotoFilters.apply(pCanvas, filterKey);
        }

        const dataUrl = previewCanvas.toDataURL('image/jpeg', 0.8);
        chip.innerHTML = `
            <img src="${dataUrl}">
            <div style="font-size:10px; color:white;">${name}</div>
        `;
        
        chip.onclick = () => {
            document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
            chip.classList.add('active');
            
            const mainCanvas = document.getElementById('filter-main-canvas');
            const mainCtx = mainCanvas.getContext('2d');
            mainCtx.drawImage(sourceImg, 0, 0);
            
            if (filterKey) {
                // Apply filter and copy result back to the visible main canvas
                const filteredCanvas = window.PhotoFilters.apply(mainCanvas, filterKey);
                mainCtx.drawImage(filteredCanvas, 0, 0);
            }
        };
        
        scrollEl.appendChild(chip);
    });
}
