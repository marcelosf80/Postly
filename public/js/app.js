// public/js/app.js — Dashboard SPA Logic

// === Auth Check ===
const token = API.getToken();
let currentUser = API.getUser();

function platformIcon(platform) {
    switch (platform?.toLowerCase()) {
        case 'instagram': return '📸';
        case 'facebook': return '📘';
        default: return '🔗';
    }
}

function statusBadge(status) {
    switch (status) {
        case 'published': return '<span class="badge badge-success" style="font-size:10px;">Publicado</span>';
        case 'scheduled': return '<span class="badge badge-warning" style="font-size:10px;">Programado</span>';
        case 'draft': return '<span class="badge badge-ghost" style="font-size:10px;">Borrador</span>';
        default: return '<span class="badge" style="font-size:10px;">' + (status || 'Borrador') + '</span>';
    }
}

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
const APP_VERSION = '1.0.21';

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
            avatarEl.innerHTML = `<img src="${user.avatar_url}" style="width:100%; height:100%; border-radius:50%; object-fit:cover;" onerror="this.onerror=null; this.parentElement.innerHTML='${(user.name || 'U').charAt(0).toUpperCase()}'; this.parentElement.style.background='${user.avatar_color || 'var(--primary)'}';">`;
            avatarEl.style.background = 'transparent';
        } else {
            const initial = (user.name || 'U').charAt(0).toUpperCase();
            const bg = user.avatar_color || 'var(--gradient-primary)';
            avatarEl.textContent = initial;
            avatarEl.style.background = bg;
            avatarEl.innerHTML = initial;
            if (mobileAvatarEl) {
                mobileAvatarEl.textContent = initial;
                mobileAvatarEl.style.background = bg;
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
    if (titleEl) titleEl.textContent = titles[section] || 'Dashboard';

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

function platformIcon(platform) {
    switch (platform?.toLowerCase()) {
        case 'instagram': return '📸';
        case 'facebook': return '📘';
        default: return '🔗';
    }
}

function statusBadge(status) {
    switch (status) {
        case 'published': return '<span class="badge badge-success" style="font-size:10px;">Publicado</span>';
        case 'scheduled': return '<span class="badge badge-warning" style="font-size:10px;">Programado</span>';
        case 'draft': return '<span class="badge badge-ghost" style="font-size:10px;">Borrador</span>';
        default: return '<span class="badge" style="font-size:10px;">' + (status || 'Borrador') + '</span>';
    }
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

// === SECTION RENDERERS START ===
// ============================================
// SECTION RENDERERS
// ============================================

// === OVERVIEW ===
async function renderOverview() {
    const body = document.getElementById('main-body');
    const user = API.getUser();
    const isConnected = !!(user && user.id && user.avatar_url);
    const userName = user ? user.name : 'Usuario';

    const connectionHTML = isConnected
        ? '<div class="connection-status connected"><span class="connection-dot"></span> Conectado como <strong>' + userName + '</strong></div>'
        : '<div class="connection-status disconnected"><span class="connection-dot"></span> No conectado a redes sociales</div>';

    const fbSVG = '<svg width="22" height="22" viewBox="0 0 24 24" fill="white"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>';
    const igSVG = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2"><rect x="2" y="2" width="20" height="20" rx="5"/><circle cx="12" cy="12" r="5"/></svg>';
    const linkSVG = '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#64748b" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>';

    let socialAccountsHTML = '';
    if (isConnected) {
        socialAccountsHTML = '<div class="social-account-card">'
            + '<div class="social-account-icon facebook">' + fbSVG + '</div>'
            + '<div class="social-account-info"><div class="social-account-name">Facebook</div><div class="social-account-detail">Conectado: ' + userName + '</div></div>'
            + '<span class="badge badge-success">Activo</span>'
            + '</div>'
            + '<div class="social-account-card">'
            + '<div class="social-account-icon instagram">' + igSVG + '</div>'
            + '<div class="social-account-info"><div class="social-account-name">Instagram</div><div class="social-account-detail">Vinculado via Meta Business</div></div>'
            + '<span class="badge badge-success">Activo</span>'
            + '</div>';
    } else {
        socialAccountsHTML = '<div class="social-account-card" style="cursor:pointer;" onclick="navigateTo(\'settings\')">'
            + '<div class="social-account-icon" style="background:var(--border);">' + linkSVG + '</div>'
            + '<div class="social-account-info"><div class="social-account-name" style="color:var(--text-muted);">Sin redes conectadas</div><div class="social-account-detail">Toca para vincular tu cuenta</div></div>'
            + '</div>';
    }

    body.innerHTML = '<div style="margin-bottom: var(--space-lg);">' + connectionHTML + '</div>'
        + '<div class="stats-grid">'
        + '<div class="stat-card"><div><div class="stat-value skeleton" style="width:50px;height:28px;"></div><div class="stat-label">Total Posts</div></div><div class="stat-icon" style="background:rgba(102,126,234,0.12)"><i data-lucide="file-text"></i></div></div>'
        + '<div class="stat-card"><div><div class="stat-value skeleton" style="width:50px;height:28px;"></div><div class="stat-label">Este Mes</div></div><div class="stat-icon" style="background:rgba(0,212,255,0.12)"><i data-lucide="calendar"></i></div></div>'
        + '<div class="stat-card"><div><div class="stat-value skeleton" style="width:50px;height:28px;"></div><div class="stat-label">Publicados</div></div><div class="stat-icon" style="background:rgba(16,185,129,0.12)"><i data-lucide="check-circle"></i></div></div>'
        + '<div class="stat-card"><div><div class="stat-value skeleton" style="width:50px;height:28px;"></div><div class="stat-label">Programados</div></div><div class="stat-icon" style="background:rgba(245,158,11,0.12)"><i data-lucide="clock"></i></div></div>'
        + '</div>'
        + '<div style="margin-bottom: var(--space-lg);">'
        + '<h3 style="margin-bottom:var(--space-md); font-size:16px;">Redes Sociales</h3>'
        + socialAccountsHTML
        + '</div>'
        + '<div class="overview-grid" style="display:grid; grid-template-columns: 1fr 1fr; gap:var(--space-lg);">'
        + '<div>'
        + '<h3 style="margin-bottom:var(--space-md); font-size:16px;">Posts Recientes</h3>'
        + '<div id="recent-posts"><div class="skeleton" style="height:150px;border-radius:var(--radius-md);"></div></div>'
        + '</div>'
        + '<div>'
        + '<h3 style="margin-bottom:var(--space-md); font-size:16px;">Acciones Rapidas</h3>'
        + '<div style="display:grid;gap:var(--space-sm);">'
        + '<button class="card card-glow" style="text-align:left;cursor:pointer;border:1px solid var(--border);background:var(--bg-card);padding:14px;" onclick="navigateTo(\'create\')"><div style="display:flex;align-items:center;gap:12px;"><span style="font-size:22px; color:var(--primary);"><i data-lucide="plus-square"></i></span><div><strong style="font-size:14px;">Crear Post</strong><br><small class="text-muted" style="font-size:12px;">Publicar o programar</small></div></div></button>'
        + '<button class="card card-glow" style="text-align:left;cursor:pointer;border:1px solid var(--border);background:var(--bg-card);padding:14px;" onclick="navigateTo(\'ai\')"><div style="display:flex;align-items:center;gap:12px;"><span style="font-size:22px; color:var(--accent);"><i data-lucide="sparkles"></i></span><div><strong style="font-size:14px;">Generar con IA</strong><br><small class="text-muted" style="font-size:12px;">Captions, hashtags e ideas</small></div></div></button>'
        + '<button class="card card-glow" style="text-align:left;cursor:pointer;border:1px solid var(--border);background:var(--bg-card);padding:14px;" onclick="navigateTo(\'settings\')"><div style="display:flex;align-items:center;gap:12px;"><span style="font-size:22px; color:var(--purple);"><i data-lucide="link"></i></span><div><strong style="font-size:14px;">Conectar Redes</strong><br><small class="text-muted" style="font-size:12px;">Instagram, Facebook</small></div></div></button>'
        + '</div>'
        + '</div>'
        + '</div>';

    renderIcons();

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

        const postsData = await API.getPosts({ limit: 5 });
        const recentDiv = document.getElementById('recent-posts');
        if (postsData.posts.length === 0) {
            recentDiv.innerHTML = '<div class="empty-state" style="padding:30px 16px;">'
                + '<div class="empty-state-icon" style="font-size:40px;">&#128237;</div>'
                + '<div class="empty-state-title" style="font-size:16px;">Sin posts</div>'
                + '<div class="empty-state-text" style="font-size:13px;">Crea tu primer post</div>'
                + '<button class="btn btn-primary btn-sm" onclick="navigateTo(\'create\')">Crear Post</button>'
                + '</div>';
        } else {
            recentDiv.innerHTML = postsData.posts.map(function(post) {
                return '<div class="post-card" style="margin-bottom:8px; padding:12px; cursor:pointer;" onclick="viewPost(\'' + post.id + '\')">'
                    + '<div class="post-content" style="flex:1;">'
                    + '<div class="post-meta">'
                    + platformIcon(post.platform) + ' ' + (post.platform || 'General') + ' '
                    + statusBadge(post.status)
                    + ' <span>' + formatDate(post.created_at) + '</span>'
                    + '</div>'
                    + '<div class="post-text" style="-webkit-line-clamp:2;">' + (post.content || '<em>Sin texto</em>') + '</div>'
                    + '</div>'
                    + '</div>';
            }).join('');
        }
        renderIcons();
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
                ${(post.image || post.image_path) ? `<img src="${post.image || post.image_path}" class="post-image" alt="Post image">` : ''}
                <div class="post-content">
                    <div class="post-meta">
                        ${platformIcon(post.platform)} ${post.platform || 'General'}
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
                        <button class="btn btn-ghost btn-sm" onclick="deletePostAction('${post.id}')" style="color:var(--danger);">🗑️ Eliminar</button>
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
            <button class="modal-close" onclick="closeModal(event)">✅¢</button>
        </div>
        ${(post.image || post.image_path) ? `<img src="${post.image || post.image_path}" style="width:100%;border-radius:var(--radius-md);margin-bottom:16px;" alt="">` : ''}
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
            
            // Handle image preview in mockup and currentImageBase64
            if (post.image || post.image_path) {
                const imgSource = post.image || post.image_path;
                currentImageBase64 = imgSource;
                const container = document.getElementById('mockup-img-container');
                if (container) {
                    container.innerHTML = `<img src="${imgSource}" style="width:100%;height:100%;object-fit:cover;">`;
                }
                
                // Update upload zone preview
                const zone = document.getElementById('upload-zone');
                if (zone) {
                    zone.classList.add('has-image');
                    zone.innerHTML = `<img src="${imgSource}" style="width:100%; height:100%; object-fit:cover; border-radius:12px;" />`;
                }
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
                        <div id="upload-zone" class="upload-zone ${currentImageBase64 ? 'has-image' : ''}" onclick="document.getElementById('post-image').click()" style="${currentImageBase64 ? 'padding:8px;' : ''}">
                            ${currentImageBase64 ? `<img src="${currentImageBase64}" style="width:100%; height:100%; object-fit:cover; border-radius:12px;" />` : `
                            <div class="upload-icon" style="font-size:40px; margin-bottom:12px; color:var(--primary);">📸</div>
                            <div class="upload-text" style="font-size:18px; color:var(--text-primary); font-weight:500; margin-bottom:8px;">Sube una foto acá</div>
                            <div class="upload-text">Recomendado formato Cuadrado (1:1) o Vertical (4:5)</div>
                            `}
                        </div>
                        <input type="file" id="post-image" accept="image/*,video/*" style="display:none;" onchange="previewImage(event); updateMockupImage(event)">
                    </div>

                    <div class="form-group" style="margin-bottom:12px;">
                        <label class="form-label" style="text-transform:none;">Pista para la IA (Opcional)</label>
                        <input type="text" id="post-pista" class="form-input" placeholder="Ej: Es un corpóreo de polyfan gigante">
                    </div>

                    <div class="form-group" style="margin-bottom:12px;">
                        <label class="form-label" style="text-transform:none;">Ayuda de IA</label>
                        <div style="display:flex; flex-wrap:wrap; gap:8px;">
                            <button type="button" class="btn btn-outline" style="flex:1; min-width:140px; padding:8px;" onclick="aiGenerateWithHint('caption')">✨ Escribir Texto</button>
                            <button type="button" class="btn btn-outline" style="flex:1; min-width:140px; padding:8px;" onclick="aiGenerateWithHint('hashtags')"># Hashtags</button>
                        </div>
                    </div>

                    <div class="form-group" style="margin-bottom:12px;">
                        <label class="form-label">Contenido / Caption</label>
                        <textarea id="post-content" class="form-textarea" rows="4" placeholder="Escribí el caption de tu publicación..." oninput="updateMockupCaption(event)"></textarea>
                    </div>

                    <div class="form-group" style="display:flex; flex-direction:column; gap:12px;">
                        <div>
                            <label class="form-label">Plataforma</label>
                            <select id="post-platform" class="form-select" onchange="changeMockupPlatform(event)">
                                <option value="instagram">📸 Instagram</option>
                                <option value="facebook">📘 Facebook</option>
                            </select>
                        </div>
                        <div>
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
                            <button type="button" class="btn btn-primary btn-sm" onclick="useAIResult()">✅ Usar este texto</button>
                            <button type="button" class="btn btn-outline btn-sm" onclick="aiGenerateWithHint(lastAIType)">🔄 Otra sugerencia</button>
                            <button type="button" class="btn btn-ghost btn-sm" onclick="document.getElementById('ai-inline-result').style.display='none'">✕</button>
                        </div>
                    </div>

                    <div style="display:flex; flex-direction:column; gap:12px; margin-top:24px;">
                        <button type="button" class="btn btn-primary" style="width:100%;" onclick="handleCreateAndPublish()">🚀 Publicar Inmediato</button>
                        <button type="button" class="btn btn-outline" style="width:100%;">🕒 Programar para después</button>
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

            <div class="settings-section">
                <h3>🛠️ Mantenimiento</h3>
                <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 16px;">
                    Si la aplicación está lenta o te aparece un error de almacenamiento, puedes limpiar el historial de posts locales.
                </p>
                <button type="button" class="btn btn-danger btn-sm" style="width:100%" onclick="clearLocalPosts()">
                    🗑️ Borrar Historial de Posts
                </button>
                <div style="font-size:10px; color:var(--text-muted); margin-top:12px; text-align:center;">Versión: ${APP_VERSION}</div>
            </div>
        </div>
    `;
}

async function clearLocalPosts() {
    if (!confirm('¿Estás seguro de borrar todo el historial de posts locales? Esta acción liberará espacio de almacenamiento.')) return;
    localStorage.removeItem('sp_offline_posts');
    window.LocalPosts._ensureReady();
    showToast('Historial de posts eliminado con éxito', 'success');
    renderSettings();
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
        resultText.textContent = 'Ã¢Â Å’ ' + error.message;
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

function useAIResult() {
    const text = document.getElementById('ai-inline-text').textContent;
    if (lastAIField === 'content') {
        document.getElementById('post-content').value = text;
    } else {
        const current = document.getElementById('post-content').value;
        document.getElementById('post-content').value = current + (current ? '\n' : '') + text;
    }
    document.getElementById('ai-inline-result').style.display = 'none';
    const ev = { target: document.getElementById('post-content') };
    updateMockupCaption(ev);
    showToast('Texto aplicado', 'success');
}

function useAIImage() {
    const img = document.getElementById('generated-ai-image');
    if (!img || !img.src || !img.src.startsWith('data:image')) {
        showToast('No hay imagen válida para usar', 'error');
        return;
    }
    currentImageBase64 = img.src;
    navigateTo('create');
    showToast('Imagen aplicada al post', 'success');
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
    } else if (currentImageBase64) {
        formData.append('image', currentImageBase64);
    } else if (currentImageBase64) {
        formData.append('image', currentImageBase64);
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
    } else if (currentImageBase64) {
        formData.append('image', currentImageBase64);
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
            <p class="text-secondary">Usá la inteligencia de marca para generar contenido humano y visualmente impactante.</p>
        </div>

        <div class="ai-tools-grid">
            <div class="ai-tool-card" onclick="openAITool('caption')">
                <div class="ai-tool-icon">✍️</div>
                <h3>Generar Caption</h3>
                <p>Textos auténticos con el ADN de tu marca para Instagram y FB.</p>
            </div>
            <div class="ai-tool-card" onclick="openAITool('visual')">
                <div class="ai-tool-icon" style="background:rgba(124, 58, 237, 0.1); color:#7C3AED;">🎨</div>
                <h3>Cerebro Visual</h3>
                <p>Crea prompts profesionales para generar imágenes (Midjourney/DALL-E).</p>
            </div>
            <div class="ai-tool-card" onclick="openAITool('hashtags')">
                <div class="ai-tool-icon">#️⃣</div>
                <h3>SEO Hashtags</h3>
                <p>Hashtags estratégicos basados en tu nicho y audiencia.</p>
            </div>
            <div class="ai-tool-card" onclick="openAITool('ideas')">
                <div class="ai-tool-icon">💡</div>
                <h3>Ideas de Contenido</h3>
                <p>Sugerencias creativas alineadas a tus servicios y rubro.</p>
            </div>
            <div class="ai-tool-card" onclick="openAITool('improve')">
                <div class="ai-tool-icon">✨</div>
                <h3>Humanizar Texto</h3>
                <p>Limpia el lenguaje robótico y dale un toque personal a tus textos.</p>
            </div>
        </div>

        <div id="ai-workspace" style="display:none;margin-top:var(--space-xl);">
            <div class="card" style="max-width:700px; border: 1px solid var(--border);">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:var(--space-md);">
                    <h3 id="ai-tool-title" style="margin:0;"></h3>
                    <button class="btn btn-ghost btn-sm" onclick="document.getElementById('ai-workspace').style.display='none'">✕</button>
                </div>
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
            title: '✍️ Generar Caption Humano',
            form: `
                <div class="form-group">
                    <label class="form-label">¿Sobre qué es el post?</label>
                    <textarea id="ai-input" class="form-textarea" rows="3" placeholder="Ej: Hoy entregamos este letrero neon para una cafetería..."></textarea>
                </div>
                <div style="display:flex;gap:var(--space-md);">
                    <div class="form-group" style="flex:1;">
                        <label class="form-label">Plataforma</label>
                        <select id="ai-platform" class="form-select">
                            <option value="Instagram">Instagram</option>
                            <option value="Facebook">Facebook</option>
                        </select>
                    </div>
                </div>
                <button class="btn btn-accent" onclick="runAITool('caption')">🤖 Generar con mi Cerebro de Marca</button>
            `
        },
        visual: {
            title: '🎨 Generador de Prompts Visuales',
            form: `
                <div class="form-group">
                    <label class="form-label">Idea o concepto de la imagen</label>
                    <textarea id="ai-input" class="form-textarea" rows="3" placeholder="Ej: Un primer plano de un letrero neon Rosa en una pared de ladrillo gris..."></textarea>
                </div>
                <p class="text-secondary" style="font-size:12px; margin-bottom:12px;">Esto generará un prompt técnico en Inglés optimizado para Midjourney, DALL-E o Canva AI siguiendo tu estilo visual.</p>
                <button class="btn btn-accent" onclick="runAITool('visual')" style="background:var(--accent);">📸 Crear Prompt Maestro</button>
            `
        },
        hashtags: {
            title: '#️⃣ Generar Hashtags Estratégicos',
            form: `
                <div class="form-group">
                    <label class="form-label">Tema del post</label>
                    <textarea id="ai-input" class="form-textarea" rows="3" placeholder="Ej: Cartelería 3D para negocios locales..."></textarea>
                </div>
                <button class="btn btn-accent" onclick="runAITool('hashtags')">🤖 Generar Hashtags</button>
            `
        },
        ideas: {
            title: '💡 Ideas de Contenido',
            form: `
                <div class="form-group">
                    <label class="form-label">Rubro o tema específico</label>
                    <input type="text" id="ai-input" class="form-input" placeholder="Ej: Ideas para Reels sobre mi taller...">
                </div>
                <button class="btn btn-accent" onclick="runAITool('ideas')">🤖 Ver Sugerencias</button>
            `
        },
        improve: {
            title: '✨ Humanizar y Mejorar Texto',
            form: `
                <div class="form-group">
                    <label class="form-label">Tu borrador inicial</label>
                    <textarea id="ai-input" class="form-textarea" rows="4" placeholder="Escribí de forma natural lo que tenés en mente..."></textarea>
                </div>
                <button class="btn btn-accent" onclick="runAITool('improve')">🚀 Darle el Toque Humano</button>
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
    result.innerHTML = '<div class="ai-result"><div style="display:flex;align-items:center;gap:8px;"><span class="spinner"></span> Consultando a tu Cerebro de Marca...</div></div>';

    try {
        let data;
        const currentTool = tool;
        
        if (tool === 'caption') {
            data = await API.generateCaption(input, { platform: document.getElementById('ai-platform')?.value });
            resultHTML = formatAIResult(data.caption, data, 'text', currentTool);
        } else if (tool === 'visual') {
            data = await API.generateVisualPrompt(input);
            resultHTML = formatAIResult(data.visualPrompt, data, 'image-prompt', currentTool);
        } else if (tool === 'hashtags') {
            data = await API.generateHashtags(input);
            resultHTML = formatAIResult(data.hashtags, data, 'text', currentTool);
        } else if (tool === 'ideas') {
            data = await API.generateIdeas(input);
            resultHTML = formatAIResult(data.ideas, data, 'text', currentTool);
        } else if (tool === 'improve') {
            data = await API.improveText(input);
            resultHTML = formatAIResult(data.improved, data, 'text', currentTool);
        }

        result.innerHTML = resultHTML;
    } catch (error) {
        result.innerHTML = `<div class="ai-result" style="border-color:var(--danger);">Ã¢ÂÅ’ ${error.message}</div>`;
        showToast(error.message, 'error');
    }
}

let _lastAIContent = '';
let _lastAIPromptForImage = '';

function formatAIResult(content, data, type = 'text', tool = 'caption') {
    const isManual = data.isManual;
    const masterPrompt = data.masterPrompt;

    // Store content globally for copy/generate buttons
    _lastAIContent = content || '';
    if (type === 'image-prompt') _lastAIPromptForImage = content || '';

    if (isManual) {
        return `
            <div class="ai-result" style="border: 2px dashed var(--accent); background: rgba(236, 72, 153, 0.03);">
                <div style="display:flex; align-items:center; gap:8px; color:var(--accent); font-weight:700; margin-bottom:12px;">
                    <i data-lucide="info"></i> Modo Manual (Sin API Key)
                </div>
                <p style="font-size:13px; margin-bottom:12px;">No tienes una API de IA conectada, pero hemos generado el <strong>Prompt Maestro</strong> con todo tu ADN de marca. Copialo y pegalo en ChatGPT o Claude para obtener el resultado perfecto:</p>
                
                <div style="background:var(--bg-secondary); padding:12px; border-radius:8px; font-family:monospace; font-size:12px; white-space:pre-wrap; border:1px solid var(--border); max-height:200px; overflow-y:auto; margin-bottom:12px;">${masterPrompt}</div>
                
                <div class="ai-result-actions" style="flex-wrap: wrap;">
                    <button class="btn btn-accent btn-sm" onclick="copyLastAIContent()">📋 Copiar Prompt Maestro</button>
                    <a href="https://chat.openai.com" target="_blank" class="btn btn-outline btn-sm">Ir a ChatGPT</a>
                </div>
            </div>
        `;
    }

    return `
        <div class="ai-result">
            <div style="white-space:pre-wrap;line-height:1.7;">${content}</div>
            <div class="ai-result-actions" style="flex-wrap: wrap;">
                <button class="btn btn-primary btn-sm" onclick="copyLastAIContent()">📋 Copiar ${type === 'image-prompt' ? 'Prompt' : 'Resultado'}</button>
                ${type === 'image-prompt' ? `<button class="btn btn-accent btn-sm" style="background:var(--accent); color:white; border:none;" onclick="generateImageFromPrompt()">✨ Generar Imagen</button>` : ''}
                <button class="btn btn-outline btn-sm" onclick="runAITool('${tool}')">🔄 Regenerar</button>
            </div>
        </div>`;
}
}

function copyLastAIContent() {
    if (!_lastAIContent) return;
    navigator.clipboard.writeText(_lastAIContent).then(() => {
        showToast('Copiado al portapapeles', 'success');
    }).catch(() => {
        const ta = document.createElement('textarea');
        ta.value = _lastAIContent;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        showToast('Copiado al portapapeles', 'success');
    });
}

async function generateImageFromPrompt() {
    const prompt = _lastAIPromptForImage;
    if (!prompt) { showToast('No hay prompt visual disponible', 'warning'); return; }
    
    const resultDiv = document.getElementById('ai-tool-result');
    resultDiv.innerHTML = '<div class="ai-result"><div style="display:flex;align-items:center;gap:8px;"><span class="spinner"></span> Generando obra de arte con IA...</div><p style="font-size:12px; color:var(--text-muted); margin-top:8px;">Esto tomará unos 10-20 segundos.</p></div>';
    
    try {
        const imageUrl = await API.generateImage(prompt);
        resultDiv.innerHTML = `
            <div class="ai-result">
                <h4 style="margin-bottom:12px; color:var(--primary);">✨ ¡Arte Generado!</h4>
                <img src="${imageUrl}" id="generated-ai-image" style="width:100%; max-width:400px; border-radius:12px; box-shadow:0 4px 20px rgba(0,0,0,0.15); display:block; margin: 0 auto;" />
                <div class="ai-result-actions" style="margin-top:16px; flex-wrap:wrap; justify-content:center; gap:8px;">
                    <button class="btn btn-primary" onclick="useAIImage()">✅ Usar en mi Post</button>
                    <a href="${imageUrl}" target="_blank" download="postly_ai_image.jpg" class="btn btn-outline">💾 Descargar</a>
                </div>
            </div>
        `;
        showToast('Imagen generada con éxito.', 'success');
    } catch(error) {
        resultDiv.innerHTML = `<div class="ai-result" style="border-color:var(--danger);">❌ Error generando imagen: ${error.message}</div>`;
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
                    <h3>Ã°Å¸â€â€” Conexiones Sociales</h3>
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
                    Ã¢Å¡â„¢Ã¯Â¸Â Configuración manual avanzada
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
        <div style="max-width:800px;">
            <div style="margin-bottom:var(--space-xl);">
                <p class="text-secondary">Configurá el <strong>Cerebro de tu Marca</strong>. Mientras más detalles humanos y específicos agregues, la IA podrá generar contenido que suene exactamente como tú y atraiga a tu cliente ideal.</p>
            </div>

            <form onsubmit="saveBrand(event)">
                <!-- Identidad Humana -->
                <div class="settings-section">
                    <h3 style="display:flex; align-items:center; gap:8px;"><i data-lucide="brain" style="color:var(--primary);"></i> Identidad Humana y Estrategia</h3>
                    
                    <div class="settings-row">
                        <div class="form-group">
                            <label class="form-label">Nombre de Marca</label>
                            <input type="text" id="brand-name" class="form-input" value="${user.brand_name || ''}" placeholder="Ej: MR Letreros">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Rubro/Industria</label>
                            <input type="text" id="brand-industry" class="form-input" value="${user.brand_industry || ''}" placeholder="Ej: Cartelería 3D y Neon">
                        </div>
                    </div>

                    <div class="form-group">
                        <label class="form-label">ADN de la Marca (Misión y Valores)</label>
                        <textarea id="brand-dna" class="form-textarea" rows="2" placeholder="¿Qué te apasiona de lo que haces? ¿Cuál es tu historia breve?">${user.brand_dna || ''}</textarea>
                    </div>

                    <div class="form-group">
                        <label class="form-label">La "Chispa Humana" (Muletillas o frases propias)</label>
                        <textarea id="human-quirks" class="form-textarea" rows="2" placeholder="Ej: 'Hola gente linda', 'Manos a la obra', 'Che, miren este laburo'">${user.human_quirks || ''}</textarea>
                        <small class="text-muted">Palabras o expresiones que usas siempre para sonar más natural.</small>
                    </div>

                    <div class="settings-row">
                        <div class="form-group">
                            <label class="form-label">Palabras que SIEMPRE usar</label>
                            <input type="text" id="brand-keywords" class="form-input" value="${user.brand_keywords || ''}" placeholder="Ej: Calidad, artesanal, detalle">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Palabras PROHIBIDAS (IA-speak)</label>
                            <input type="text" id="brand-avoid" class="form-input" value="${user.brand_avoid || ''}" placeholder="Ej: Potenciar, descubrir, revolucionario">
                        </div>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Emoción a transmitir</label>
                        <select id="target-emotion" class="form-select">
                            <option value="Confianza y Seguridad" ${user.target_emotion === 'Confianza y Seguridad' ? 'selected' : ''}>🛡️ Confianza y Seguridad</option>
                            <option value="Inspiración y Creatividad" ${user.target_emotion === 'Inspiración y Creatividad' ? 'selected' : ''}>✨ Inspiración y Creatividad</option>
                            <option value="Cercanía y Amistad" ${user.target_emotion === 'Cercanía y Amistad' ? 'selected' : ''}>🤝 Cercanía y Amistad</option>
                            <option value="Exclusividad y Lujo" ${user.target_emotion === 'Exclusividad y Lujo' ? 'selected' : ''}>💎 Exclusividad y Lujo</option>
                            <option value="DiverSIón y Energía" ${user.target_emotion === 'DiverSIón y Energía' ? 'selected' : ''}>⚡ Diversión y Energía</option>
                        </select>
                    </div>
                </div>

                <!-- Cerebro Visual -->
                <div class="settings-section">
                    <h3 style="display:flex; align-items:center; gap:8px;"><i data-lucide="palette" style="color:var(--accent);"></i> Cerebro Visual (Guía para Imágenes)</h3>
                    
                    <div class="form-group">
                        <label class="form-label">Estilo Visual Dominante</label>
                        <textarea id="visual-style" class="form-textarea" rows="2" placeholder="Ej: Minimalista, luz natural, fondo desenfocado, colores cálidos.">${user.visual_style || ''}</textarea>
                    </div>

                    <div class="form-group">
                        <label class="form-label">Elementos que NO deben faltar</label>
                        <textarea id="visual-elements" class="form-textarea" rows="2" placeholder="Ej: Herramientas de taller, manos trabajando, logo al fondo.">${user.visual_elements || ''}</textarea>
                    </div>
                </div>

                <!-- Configuración de Marketing (Original) -->
                <div class="settings-section">
                    <h3 style="display:flex; align-items:center; gap:8px;">📢 Estrategia de Público</h3>
                    <div class="form-group">
                        <label class="form-label">¿A quién le vendés? (Público Objetivo)</label>
                        <textarea id="brand-audience" class="form-textarea" rows="2">${user.brand_audience || ''}</textarea>
                    </div>
                    <div class="settings-row">
                        <div class="form-group">
                            <label class="form-label">Tono de Voz</label>
                            <select id="brand-tone" class="form-select">
                                <option value="Profesional" ${user.brand_tone === 'Profesional' ? 'selected' : ''}>Profesional</option>
                                <option value="Amigable" ${user.brand_tone === 'Amigable' ? 'selected' : ''}>Amigable</option>
                                <option value="Humorístico" ${user.brand_tone === 'Humorístico' ? 'selected' : ''}>Humorístico</option>
                                <option value="Inspirador" ${user.brand_tone === 'Inspirador' ? 'selected' : ''}>Inspirador</option>
                            </select>
                        </div>
                    </div>
                </div>

                <div style="position: sticky; bottom: 20px; z-index: 10;">
                    <button type="submit" class="btn btn-primary" style="width:100%; box-shadow: 0 4px 12px rgba(0,0,0,0.2);">💾 Guardar Todo el Cerebro de Marca</button>
                </div>
            </form>
        </div>
    `;
    renderIcons();
}

async function saveBrand(e) {
    if (e) e.preventDefault();
    try {
        const payload = {
            brand_name: document.getElementById('brand-name').value,
            brand_industry: document.getElementById('brand-industry').value,
            brand_dna: document.getElementById('brand-dna').value,
            human_quirks: document.getElementById('human-quirks').value,
            brand_keywords: document.getElementById('brand-keywords').value,
            brand_avoid: document.getElementById('brand-avoid').value,
            target_emotion: document.getElementById('target-emotion').value,
            visual_style: document.getElementById('visual-style').value,
            visual_elements: document.getElementById('visual-elements').value,
            brand_audience: document.getElementById('brand-audience').value,
            brand_tone: document.getElementById('brand-tone').value
        };

        const data = await API.updateProfile(payload);

        // Update cached user
        localStorage.setItem('sp_user', JSON.stringify(data.user));
        Object.assign(currentUser, data.user);
        
        showToast('¡Cerebro de Marca actualizado!', 'success');
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
                    Ã°Å¸Å’Â Configuración Meta
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
                        <h3 style="display:flex; align-items:center; gap:8px;">Ã¢â€žÂ¹Ã¯Â¸Â ¿Qué datos se usan aquí?</h3>
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
                        <h3>Ã°Å¸â€â€” Enlaces Rápidos (Developers)</h3>
                        <div class="card" style="display:flex; flex-direction:column; gap:12px;">
                            <a href="https://developers.facebook.com/tools/explorer/" target="_blank" class="btn btn-outline" style="justify-content:flex-start; text-align:left;">
                                Ã°Å¸â€ºÂ Ã¯Â¸Â Meta Graph Explorer
                            </a>
                            <a href="https://developers.facebook.com/tools/debug/accesstoken/" target="_blank" class="btn btn-outline" style="justify-content:flex-start; text-align:left;">
                                Ã°Å¸â€Â Access Token Debugger
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
                    <h3 style="display:flex; align-items:center; gap:8px;">Ã¢â€žÂ¹Ã¯Â¸Â ¿Cómo evitar el error de "Modo Prueba"?</h3>
                    <div class="card" style="background:#fff7ed; border-color:#fed7aa; font-size:14px; color:#9a3412;">
                        <p style="margin-bottom:8px;"><strong>Importante:</strong> Para que los pagos funcionen con tarjetas reales, ambas claves deben ser de <strong>Producción</strong> (las que empiezan con <code>APP_USR</code> y <code>APP_USR</code>).</p>
                        <ul style="margin-left:20px; line-height:1.6;">
                            <li>Si usas claves <code>TEST-</code>, solo funcionará con cuentas de prueba de Mercado Pago.</li>
                            <li>Si usas claves <code>APP_USR-</code>, funcionará con dinero real.</li>
                        </ul>
                        <p style="margin-top:12px; font-weight:bold;">
                            <a href="https://www.mercadopago.com.ar/developers/panel/app" target="_blank" style="color:#9a3412; text-decoration:underline;">Ir a mi Panel de Aplicaciones →</a>
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
                    <h3>Ã°Å¸ÂÂ¦ Configuración de Pasarela (Checkout Integrado)</h3>
                    <div class="card">
                        <div style="margin-bottom: 20px;">
                            <label class="form-label" style="margin-bottom:8px;">Modo Detectado:</label>
                            ${(currentUser.mp_access_token || '').startsWith('TEST-') 
                                ? '<span class="badge badge-warning">Ã°Å¸Â§Âª MODO PRUEBAS (SANDBOX)</span>' 
                                : (currentUser.mp_access_token || '').startsWith('APP_USR-') 
                                    ? '<span class="badge badge-success">Ã°Å¸â€™Â° MODO PRODUCCIÃƒâ€œN (REAL)</span>' 
                                    : '<span class="badge badge-danger">Ã¢Å¡Â Ã¯Â¸Â NO CONFIGURADO</span>'}
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
                        ${user.ig_access_token ? 'Ã°Å¸â€Å’ Conectado' : 'Ã¢ÂÅ’ Desconectado'}
                    </div>
                </div>
                <div>
                    <h4 style="color:var(--text-secondary); font-size:12px; text-transform:uppercase; margin-bottom:12px;">Facebook Page</h4>
                    <div style="margin-bottom:8px;"><strong>ID:</strong> ${user.fb_page_id || 'N/A'}</div>
                    <div style="margin-bottom:12px; font-size:12px; color:var(--text-secondary); word-break:break-all;"><strong>Token:</strong> ${fbToken.substring(0, 15)}...</div>
                    <div class="badge ${user.fb_access_token ? 'badge-success' : 'badge-danger'}">
                        ${user.fb_access_token ? 'Ã°Å¸â€Å’ Conectado' : 'Ã¢ÂÅ’ Desconectado'}
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
                <td style="padding:12px;">${user.is_admin ? 'Ã°Å¸â€ºÂ¡Ã¯Â¸Â Admin' : '👤 User'}</td>
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
        
        showToast('Ã°Å¸â€â€œ Credenciales de Mercado Pago guardadas. El Pop-up ahora está activo.', 'success');
        
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
                        <li style="margin-bottom: 12px;">✅¦ <strong>1 Publicación</strong> agregada al saldo</li>
                        <li style="margin-bottom: 12px;">✅¦ Todas las herramientas IA</li>
                        <li style="margin-bottom: 12px;">✅¦ Sin vencimiento</li>
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
// === ADMIN PANEL ===
async function loadAdminStats() {
    try {
        const data = await API.getAdminStats();
        const container = document.getElementById('admin-stats');
        const cards = container.querySelectorAll('.stat-value');
        
        cards[0].textContent = data.stats.totalUsers;
        cards[1].textContent = data.stats.totalPosts;
        cards[2].textContent = data.stats.planDistribution.pro + data.stats.planDistribution.gold;
        
        cards.forEach(c => c.classList.remove('skeleton'));
    } catch (err) {
        console.error(err);
    }
}

async function loadAdminUsers() {
    const search = document.getElementById('user-search').value;
    const plan = document.getElementById('user-filter-plan').value;
    const tbody = document.getElementById('user-table-body');

    try {
        const data = await API.getAdminUsers({ search, plan });
        
        if (data.users.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="padding:20px; text-align:center;">No se encontraron usuarios.</td></tr>';
            return;
        }

        tbody.innerHTML = data.users.map(u => `
            <tr style="border-bottom:1px solid var(--border);">
                <td style="padding:12px;">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <div class="avatar" style="width:30px; height:30px; font-size:12px; background:${u.avatar_color || 'var(--primary)'}">${(u.name || 'U').charAt(0).toUpperCase()}</div>
                        <div>
                            <div style="font-weight:600; font-size:13px;">${u.name || 'Sin nombre'}</div>
                            <div style="font-size:11px; color:var(--text-secondary);">${u.email}</div>
                        </div>
                    </div>
                </td>
                <td style="padding:12px;">
                    <select class="form-select" style="padding:4px 8px; font-size:12px; width:auto; margin:0;" onchange="updateUserPlan('${u.id}', this.value)">
                        <option value="free" ${u.plan === 'free' ? 'selected' : ''}>Free</option>
                        <option value="pro" ${u.plan === 'pro' ? 'selected' : ''}>Pro</option>
                        <option value="gold" ${u.plan === 'gold' ? 'selected' : ''}>Gold</option>
                    </select>
                </td>
                <td style="padding:12px;">
                    <input type="number" class="form-input" style="padding:4px 8px; font-size:12px; width:60px; margin:0;" value="${u.posts_remaining || 0}" onchange="updateUserCredits('${u.id}', this.value)">
                </td>
                <td style="padding:12px;">
                    <span class="badge ${u.subscription_status === 'active' ? 'badge-success' : 'badge-warning'}" style="font-size:10px;">
                        ${u.subscription_status || 'trial'}
                    </span>
                </td>
                <td style="padding:12px;">
                    <button class="btn btn-ghost btn-sm" onclick="deleteUserAction('${u.id}')" title="Eliminar Usuario" style="color:var(--danger); padding:4px 8px;">
                        <i data-lucide="trash-2" style="width:16px; height:16px;"></i>
                    </button>
                    ${u.is_admin ? '<span title="Administrador">Ã°Å¸â€ºÂ¡Ã¯Â¸Â</span>' : `<button class="btn btn-ghost btn-sm" onclick="makeAdminAction('${u.id}')" title="Hacer Admin">👤</button>`}
                </td>
            </tr>
        `).join('');
        
        renderIcons();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function updateUserPlan(id, plan) {
    try {
        await API.updateAdminUser(id, { plan });
        showToast('Plan actualizado exitosamente', 'success');
        loadAdminStats();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function updateUserCredits(id, posts_remaining) {
    try {
        await API.updateAdminUser(id, { posts_remaining: parseInt(posts_remaining) });
        showToast('Créditos actualizados', 'success');
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function deleteUserAction(id) {
    if (!confirm('¿Estás SEGURO de eliminar este usuario? Se perderán todos sus posts y datos permanentemente.')) return;
    try {
        await API.deleteAdminUser(id);
        showToast('Usuario eliminado', 'success');
        loadAdminUsers();
        loadAdminStats();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

async function makeAdminAction(id) {
    if (!confirm('¿Quieres otorgar permisos de administrador a este usuario?')) return;
    try {
        await API.updateAdminUser(id, { is_admin: true });
        showToast('Nuevos permisos otorgados', 'success');
        loadAdminUsers();
    } catch (err) {
        showToast(err.message, 'error');
    }
}

function debounce(func, timeout = 300) {
    let timer;
    return (...args) => {
        clearTimeout(timer);
        timer = setTimeout(() => { func.apply(this, args); }, timeout);
    };
}
