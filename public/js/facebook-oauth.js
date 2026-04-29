// facebook-oauth.js — OAuth Flow Standalone (Direct Graph API)

const FB_APP_ID = "2217261002140935"; // Hardcoded for Standalone APK

async function initFacebookSDK() {
    try {
        window.fbAsyncInit = function() {
            FB.init({
                appId: FB_APP_ID,
                cookie: true,
                xfbml: true,
                version: 'v21.0'
            });
            console.log('[META] SDK de Facebook inicializado (Standalone)');
        };

        if (!document.getElementById('facebook-jssdk')) {
            const script = document.createElement('script');
            script.id = 'facebook-jssdk';
            script.src = 'https://connect.facebook.net/es_LA/sdk.js';
            script.async = true;
            script.defer = true;
            document.body.appendChild(script);
        }
    } catch (error) {
        console.error('[META] Error inicializando Facebook SDK:', error);
    }
}

async function connectWithFacebook() {
    const isCapacitor = (window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()) || window.location.protocol === 'capacitor:';

    try {
        // Seleccionar cualquier botón de Facebook que exista en la página (login o registro)
        const btn = document.getElementById('btn-connect-facebook-login') || 
                    document.getElementById('btn-connect-facebook-reg') || 
                    document.getElementById('btn-connect-facebook');

        if (btn) {
            btn.dataset.originalInner = btn.innerHTML;
            btn.innerHTML = '<span style="display:inline-flex;align-items:center;gap:8px;"><span class="spinner" style="width:14px;height:14px;border-top-color:white;"></span> Conectando...</span>';
            btn.disabled = true;
        }

        if (isCapacitor && window.Capacitor && Capacitor.Plugins.FacebookLogin) {
            console.log('[META] Usando plugin nativo de Facebook...');
            const { FacebookLogin } = Capacitor.Plugins;
            
            const result = await FacebookLogin.login({
                permissions: ['email', 'public_profile', 'pages_manage_posts', 'pages_read_engagement', 'instagram_basic', 'instagram_content_publish', 'business_management', 'pages_show_list']
            });

            if (result.accessToken) {
                exchangeTokenAndSaveUser(result.accessToken.token);
            } else {
                showToast('Login cancelado', 'info');
                resetConnectButton();
            }
        } else {
            console.log('[META] Usando SDK de navegador...');
            if (typeof FB === 'undefined') {
                showToast('Error: El SDK web de Facebook no cargó correctamente.', 'error');
                resetConnectButton();
                return;
            }
            FB.login(function(response) {
                if (response.authResponse) {
                    exchangeTokenAndSaveUser(response.authResponse.accessToken);
                } else {
                    showToast('Login cancelado', 'info');
                    resetConnectButton();
                }
            }, {
                scope: 'email,public_profile,pages_manage_posts,pages_read_engagement,instagram_basic,instagram_content_publish,business_management,pages_show_list',
                return_scopes: true
            });
        }
    } catch (error) {
        console.error('[META] Error en OAuth flow:', error);
        showToast('Error al conectar con Facebook', 'error');
        resetConnectButton();
    }
}

async function exchangeTokenAndSaveUser(token) {
    try {
        console.log('[META] Sincronizando perfil...');
        
        // 1. Obtener info de perfil detallada
        const profileRes = await fetch(`https://graph.facebook.com/v21.0/me?fields=id,name,email,picture.width(200)&access_token=${token}`);
        const profile = await profileRes.json();
        
        if (profile.error) throw new Error(profile.error.message);

        // 2. Obtener páginas para el Dashboard (Opcional pero útil)
        const pagesRes = await fetch(`https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token,instagram_business_account&access_token=${token}`);
        const pages = await pagesRes.json();
        
        // Crear objeto de usuario basado en Facebook
        const user = {
            id: profile.id,
            name: profile.name,
            email: profile.email || '',
            avatar_url: profile.picture?.data?.url || '',
            plan: 'pro',
            onboarding_completed: true,
            fb_pages: pages.data || []
        };

        // Guardar Sesión Localmente
        if (window.API) {
            window.API.setAuth(token, user);
        } else {
            localStorage.setItem('sp_token', token);
            localStorage.setItem('sp_user', JSON.stringify(user));
        }

        // Mostrar Modal de Éxito y permitir acceso
        const modal = document.createElement('div');
        modal.className = 'modal-overlay active';
        modal.style.zIndex = '9999';
        modal.innerHTML = `
            <div class="modal" style="text-align:center; max-width:400px; padding:32px;">
                <div style="font-size:54px; margin-bottom:16px;">✨</div>
                <h3 style="margin-bottom:8px; font-size:22px;">¡Bienvenido, ${profile.name}!</h3>
                <p style="color:var(--text-secondary); margin-bottom:24px; line-height:1.5;">Tu cuenta de Meta se ha vinculado correctamente a Postly.</p>
                <button class="btn btn-primary" style="width:100%;" onclick="window.location.href='./app.html';">
                    Ingresar al Panel
                </button>
            </div>
        `;
        document.body.appendChild(modal);

    } catch (err) {
        console.error('FB Sync Error:', err);
        showToast("Error al sincronizar con Meta: " + err.message, 'error');
    } finally {
        resetConnectButton();
    }
}

function resetConnectButton() {
    const btn = document.getElementById('btn-connect-facebook-login') || 
                document.getElementById('btn-connect-facebook-reg') || 
                document.getElementById('btn-connect-facebook');
    
    if (btn && btn.dataset.originalInner) {
        btn.innerHTML = btn.dataset.originalInner;
        btn.disabled = false;
    }
}

function checkConnectionStatus() { /* Se simplifica en standalone */ }

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFacebookSDK);
} else {
    initFacebookSDK();
}
