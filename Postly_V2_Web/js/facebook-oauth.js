// facebook-oauth.js — OAuth Flow Standalone (Direct Graph API)

const FB_APP_ID = "2217261002140935"; // Hardcoded for Standalone APK

async function initFacebookSDK() {
    try {
        window.fbAsyncInit = function() {
            FB.init({
                appId: FB_APP_ID,
                cookie: true,
                xfbml: true,
                version: 'v19.0'
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

        if (isCapacitor && window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.FacebookLogin) {
            console.log('[META] Usando plugin nativo de Facebook...');
            showToast('Iniciando conexión nativa con Meta...', 'info');
            const { FacebookLogin } = window.Capacitor.Plugins;
            
            const result = await FacebookLogin.login({
                permissions: ['email', 'public_profile', 'pages_manage_posts', 'pages_read_engagement', 'instagram_basic', 'instagram_content_publish', 'business_management', 'pages_show_list']
            });

            console.log('[META] Resultado login nativo:', result);

            if (result && result.accessToken) {
                showToast('¡Token obtenido! Sincronizando...', 'success');
                exchangeTokenAndSaveUser(result.accessToken.token);
            } else {
                const msg = result && result.errorMessage ? result.errorMessage : 'Cancelado o fallido';
                showToast('Login Nativo: ' + msg, 'info');
                resetConnectButton();
            }
        } else {
            console.log('[META] Usando SDK de navegador o plugin no encontrado...');
            showToast('Usando fallback de navegador (SDK Web)...', 'warning');
            
            if (typeof FB === 'undefined') {
                showToast('Error: El SDK web de Facebook no cargó correctamente.', 'error');
                resetConnectButton();
                return;
            }
            FB.login(function(response) {
                if (response.authResponse) {
                    exchangeTokenAndSaveUser(response.authResponse.accessToken);
                } else {
                    showToast('Login Web: Cancelado o fallido', 'info');
                    resetConnectButton();
                }
            }, {
                scope: 'email,public_profile,pages_manage_posts,pages_read_engagement,instagram_basic,instagram_content_publish,business_management,pages_show_list',
                return_scopes: true
            });
        }
    } catch (error) {
        console.error('[META] Error en OAuth flow:', error);
        const errorMsg = error.message || JSON.stringify(error);
        alert('Error de Conexión Meta: ' + errorMsg);
        resetConnectButton();
    }
}

async function exchangeTokenAndSaveUser(token) {
    try {
        console.log('[META] Sincronizando perfil...');
        
        // 1. Obtener info de perfil detallada
        const profileRes = await fetch(`https://graph.facebook.com/v19.0/me?fields=id,name,email,picture.width(200)&access_token=${token}`);
        const profile = await profileRes.json();
        
        if (profile.error) throw new Error(profile.error.message);

        // 2. Obtener páginas para el Dashboard (Opcional pero útil)
        const pagesRes = await fetch(`https://graph.facebook.com/v19.0/me/accounts?fields=id,name,access_token,instagram_business_account&access_token=${token}`);
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
        // 3. SINCRONIZAR CON EL SERVIDOR (Backend)
        // Esto es vital para que el servidor pueda publicar en tu nombre
        if (window.API_BASE_URL) {
            console.log('[META] Sincronizando token con el backend...');
            try {
                const syncRes = await fetch(`${window.API_BASE_URL}/api/auth/facebook`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ accessToken: token })
                });
                
                const syncData = await syncRes.json();
                
                if (!syncRes.ok) {
                    throw new Error(syncData.error || `Error en sincronización con backend (${syncRes.status})`);
                }

                // Si el servidor devolvió un usuario más completo (con IDs descubiertos), lo usamos
                if (syncData.user) {
                    const newUser = { ...user, ...syncData.user };
                    localStorage.setItem('sp_user', JSON.stringify(newUser));
                }

                if (syncData.autoConfigured) {
                    const igUsername = syncData.user?.ig_username ? ` (@${syncData.user.ig_username})` : '';
                    showToast(`✅ Instagram vinculado automáticamente${igUsername}`, 'success');
                } else {
                    // Intentar resolver IG Business Account con el token almacenado en backend
                    console.log('[META] Intentando resolver Instagram Business Account...');
                    try {
                        const resolveToken = syncData.token || token;
                        const resolveRes = await fetch(`${window.API_BASE_URL}/api/auth/instagram-resolve`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${resolveToken}`
                            }
                        });
                        const resolveData = await resolveRes.json();
                        if (resolveRes.ok && resolveData.instagram) {
                            showToast(`✅ Instagram descubierto: @${resolveData.instagram.igUsername}`, 'success');
                            if (resolveData.user) {
                                const updatedUser = { ...JSON.parse(localStorage.getItem('sp_user') || '{}'), ...resolveData.user };
                                localStorage.setItem('sp_user', JSON.stringify(updatedUser));
                            }
                        } else {
                            showToast('⚠️ No se encontró Instagram Business vinculado. Configuralo manualmente en Ajustes.', 'warning');
                        }
                    } catch (resolveErr) {
                        console.warn('[META] instagram-resolve falló:', resolveErr.message);
                        showToast('⚠️ No se encontró Instagram vinculado. Configuralo manualmente en Ajustes.', 'warning');
                    }
                }
                if (syncData.token) {
                    if (window.API) {
                        window.API.setAuth(syncData.token, syncData.user || user);
                    } else {
                        localStorage.setItem('sp_token', syncData.token);
                    }
                }
            } catch (syncErr) {
                console.error('[META] ❌ Error sincronizando con backend:', syncErr);
                // Clear any partial session so we don't end up in an invalid state
                if (window.API) {
                    window.API.clearAuth();
                } else {
                    localStorage.removeItem('sp_token');
                    localStorage.removeItem('sp_user');
                }
                throw syncErr;
            }
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
                <button class="btn btn-primary" style="width:100%;" onclick="this.closest('.modal-overlay').remove(); if(typeof navigate === 'function') { navigate('dashboard'); } else { window.location.reload(); }">
                    Ingresar al Panel
                </button>
            </div>
        `;
        document.body.appendChild(modal);

    } catch (err) {
        console.error('FB Sync Error:', err);
        showToast("Error al sincronizar con Meta: " + err.message, 'error');
        
        const debugDiv = document.createElement('div');
        debugDiv.style = "position:fixed; top:0; left:0; right:0; background:red; color:white; padding:20px; z-index:99999; text-align:center; font-weight:bold;";
        debugDiv.innerText = "DEBUG ERROR: " + err.message;
        document.body.appendChild(debugDiv);
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
