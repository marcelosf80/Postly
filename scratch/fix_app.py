import os
import re

path = r'c:\marketing\public\js\app.js'
with open(path, 'r', encoding='utf-8', errors='ignore') as f:
    content = f.read()

# Fix common mojibake
replacements = {
    'Ã‚Â¡': '¡',
    'ÃƒÂ³': 'ó',
    'ÃƒÂ©': 'é',
    'ÃƒÂ­': 'í',
    'ÃƒÂ¡': 'á',
    'ÃƒÂ±': 'ñ',
    'Ã°Å¸â€™Â³': '💳',
    'Ã¢Å"â€¢': '✕',
    'Ã°Å¸â€ºÂ¡Ã¯Â¸Â ': '🛡️',
    'Ã°Å¸â€œÂ¸': '📸',
    'Ã°Å¸â€œËœ': '📘',
    'Ã°Å¸â€œâ€¦': '📅',
    'Ã°Å¸Å¡â‚¬': '🚀',
    'Ã¢Å“Â Ã¯Â¸Â ': '✍️',
    'Ã°Å¸â€”â€˜Ã¯Â¸Â ': '🗑️',
    'Ã¢Â­Â ': '⭐',
    'Ã°Å¸â€¢â€™': '🕒',
    'Ã¢â‚¬â€': '—'
}
for k, v in replacements.items():
    content = content.replace(k, v)

# Fix broken navigateTo/toast from previous attempts
# I'll just look for common broken patterns and replace with a clean block
# Actually, I'll try to find the start of the file and replace it up to SECTION RENDERERS

top_part = r'''// public/js/app.js — Dashboard SPA Logic

// === Auth Check ===
const token = API.getToken();
const currentUser = API.getUser();

if (!token || !currentUser) {
    window.location.href = './index.html';
}

// === State ===
let currentSection = 'overview';
let postsCache = [];
let currentImageBase64 = null;

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
'''

# Find where SECTION RENDERERS start in original content
# Search for "// ============================================" or similar
marker = "// ============================================"
if marker in content:
    rest = content[content.find(marker):]
else:
    # fallback to searching for renderOverview
    marker = "async function renderOverview()"
    if marker in content:
        rest = content[content.find(marker):]
    else:
        rest = ""

# Combine and write
with open(path, 'w', encoding='utf-8') as f:
    f.write(top_part + rest)
