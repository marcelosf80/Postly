// facebook-oauth.js — OAuth Flow para conectar Meta automáticamente

let fbAppId = null;

// Inicializar SDK de Facebook
async function initFacebookSDK() {
    try {
        // Obtener App ID desde el servidor
        const response = await fetch('/api/config');
        const config = await response.json();
        fbAppId = config.facebook_app_id;

        if (!fbAppId) {
            console.error('[META] Facebook App ID no configurado en el servidor');
            return;
        }

        // Cargar SDK de Facebook
        window.fbAsyncInit = function() {
            FB.init({
                appId: fbAppId,
                cookie: true,
                xfbml: true,
                version: 'v21.0'
            });

            console.log('[META] SDK de Facebook inicializado');
        };

        // Insertar script del SDK si no existe
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

// Conectar con Facebook (OAuth Flow)
async function connectWithFacebook() {
    if (!fbAppId) {
        showToast('Error: Configuración de Facebook no encontrada', 'error');
        return;
    }

    try {
        // Mostrar loading
        const btn = document.getElementById('btn-connect-facebook');
        if (btn) {
            btn.innerHTML = '<span style="display:inline-flex;align-items:center;gap:8px;">⏳ Conectando...</span>';
            btn.disabled = true;
        }

        // Iniciar flujo OAuth
        FB.login(function(response) {
            if (response.authResponse) {
                const accessToken = response.authResponse.accessToken;
                console.log('[META] Token obtenido, enviando al servidor...');
                
                // Enviar token al backend para exchange y auto-discovery
                exchangeTokenAndSaveUser(accessToken);
            } else {
                console.log('[META] Login cancelado por el usuario');
                showToast('Conexión cancelada', 'info');
                resetConnectButton();
            }
        }, {
            scope: 'email,public_profile,pages_manage_posts,pages_read_engagement,instagram_basic,instagram_content_publish,business_management,pages_show_list',
            return_scopes: true
        });
    } catch (error) {
        console.error('[META] Error en OAuth flow:', error);
        showToast('Error al conectar con Facebook', 'error');
        resetConnectButton();
    }
}

// Enviar token al backend y obtener IDs automáticamente
async function exchangeTokenAndSaveUser(shortToken) {
    try {
        const response = await fetch('/api/auth/facebook', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ accessToken: shortToken })
        });

        const data = await response.json();

        if (response.ok) {
            // Guardar nuevo token en localStorage
            localStorage.setItem('token', data.token);
            
            // Actualizar usuario global
            window.currentUser = data.user;

            if (data.autoConfigured) {
                showToast('✅ Instagram conectado automáticamente', 'success');
                
                // Mostrar mensaje de éxito con los IDs encontrados
                const modal = document.createElement('div');
                modal.className = 'modal-overlay';
                modal.style.display = 'flex';
                modal.innerHTML = `
                    <div class="modal" style="max-width: 500px;">
                        <div style="text-align: center; padding: 24px;">
                            <div style="font-size: 64px; margin-bottom: 16px;">🎉</div>
                            <h2 style="margin-bottom: 12px;">¡Conexión Exitosa!</h2>
                            <p style="color: var(--text-muted); margin-bottom: 24px;">
                                Detectamos y configuramos automáticamente tu Instagram Business Account.
                            </p>
                            <div style="background: var(--bg-secondary); padding: 16px; border-radius: 8px; margin-bottom: 24px; text-align: left;">
                                <div style="margin-bottom: 8px;">
                                    <strong>📸 Instagram Page ID:</strong><br>
                                    <code style="font-size: 12px;">${data.user.ig_page_id}</code>
                                </div>
                                <div>
                                    <strong>🔐 Access Token:</strong><br>
                                    <code style="font-size: 11px;">${data.user.ig_access_token.substring(0, 30)}...</code>
                                </div>
                            </div>
                            <p style="font-size: 13px; color: var(--text-muted); margin-bottom: 24px;">
                                ⏰ Tu token es válido por <strong>60 días</strong>. Te notificaremos cuando debas renovarlo.
                            </p>
                            <button class="btn btn-primary" onclick="this.closest('.modal-overlay').remove(); navigateTo('settings');">
                                Continuar
                            </button>
                        </div>
                    </div>
                `;
                // Update global state and persistent storage
                localStorage.setItem('sp_user', JSON.stringify(data.user));
                window.currentUser = data.user;
                if (typeof initUserInfo === 'function') initUserInfo();
                if (typeof checkConnectionStatus === 'function') checkConnectionStatus();

                document.body.appendChild(modal);
            } else {
                // Update even if no modal is shown
                localStorage.setItem('sp_user', JSON.stringify(data.user));
                window.currentUser = data.user;
                if (typeof initUserInfo === 'function') initUserInfo();
                if (typeof checkConnectionStatus === 'function') checkConnectionStatus();

                showToast('Conectado con Facebook. Configura manualmente tu Instagram Business ID en Ajustes.', 'warning');
                setTimeout(() => navigateTo('settings'), 1000);
            }
        } else {
            throw new Error(data.error || 'Error en el servidor');
        }
    } catch (error) {
        console.error('[META] Error intercambiando token:', error);
        showToast(error.message || 'Error al procesar la conexión', 'error');
    } finally {
        resetConnectButton();
    }
}

// Resetear botón de conexión
function resetConnectButton() {
    const btn = document.getElementById('btn-connect-facebook');
    if (btn) {
        btn.innerHTML = `<span style="display:inline-flex;align-items:center;gap:8px;">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="white"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>
            Conectar con Meta (Instagram & FB)
        </span>`;
        btn.disabled = false;
    }
}

// Desconectar cuenta de Facebook
async function disconnectFacebook() {
    if (!confirm('¿Estás seguro que querés desconectar tu cuenta de Meta? Dejarás de poder publicar automáticamente.')) {
        return;
    }

    try {
        const token = API.getToken();
        const response = await fetch('/api/auth/profile', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                ig_page_id: '',
                ig_access_token: '',
                fb_page_id: '',
                fb_access_token: ''
            })
        });

        if (response.ok) {
            showToast('Cuenta de Meta desconectada', 'success');
            navigateTo('settings');
        } else {
            throw new Error('Error al desconectar');
        }
    } catch (error) {
        showToast('Error al desconectar la cuenta', 'error');
    }
}

// Verificar estado de conexión
function checkConnectionStatus() {
    const user = window.currentUser;
    const hasIG = user && user.ig_page_id && user.ig_access_token;
    const hasFB = user && user.fb_page_id && user.fb_access_token;
    const isConnected = hasIG || hasFB;
    
    const statusContainer = document.getElementById('meta-connection-status');
    if (statusContainer) {
        if (isConnected) {
            let details = '';
            if (hasIG) details += `<div><i data-lucide="instagram" style="width:12px;height:12px;vertical-align:middle;"></i> <strong>Instagram:</strong> ${user.ig_page_id}</div>`;
            if (hasFB) details += `<div><i data-lucide="facebook" style="width:12px;height:12px;vertical-align:middle;"></i> <strong>Facebook Page:</strong> ${user.fb_page_id}</div>`;

            statusContainer.innerHTML = `
                <div style="display: flex; align-items: center; gap: 12px; padding: 16px; background: rgba(16, 185, 129, 0.1); border: 1px solid rgba(16, 185, 129, 0.3); border-radius: 8px;">
                    <span style="font-size: 24px;"><i data-lucide="check-circle" style="color:var(--success);"></i></span>
                    <div style="flex: 1;">
                        <div style="font-weight: 600; color: var(--success);">Meta Conectado</div>
                        <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">
                            ${details}
                        </div>
                    </div>
                    <button class="btn btn-outline btn-sm" onclick="disconnectFacebook()" style="border-color: var(--danger); color: var(--danger);">
                        Desconectar
                    </button>
                </div>
            `;
        } else if (user && user.auth_provider === 'facebook') {
            statusContainer.innerHTML = `
                <div style="display: flex; align-items: center; gap: 12px; padding: 16px; background: rgba(102, 126, 234, 0.1); border: 1px solid var(--primary); border-radius: 8px;">
                    <span style="font-size: 24px;"><i data-lucide="user-check" style="color:var(--primary);"></i></span>
                    <div style="flex: 1;">
                        <div style="font-weight: 600; color: var(--primary-light);">Autenticado con Meta</div>
                        <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">
                            No encontramos páginas de Facebook o cuentas de Instagram vinculadas a tu perfil. 
                            Asegúrate de tener una <strong>Fan Page</strong> creada.
                        </div>
                    </div>
                </div>
            `;
        } else {
            statusContainer.innerHTML = `
                <div style="display: flex; align-items: center; gap: 12px; padding: 16px; background: rgba(251, 191, 36, 0.1); border: 1px solid rgba(251, 191, 36, 0.3); border-radius: 8px;">
                    <span style="font-size: 24px;"><i data-lucide="alert-triangle" style="color:var(--warning);"></i></span>
                    <div style="flex: 1;">
                        <div style="font-weight: 600; color: var(--warning);">No conectado</div>
                        <div style="font-size: 12px; color: var(--text-muted); margin-top: 4px;">
                            Conectá tu cuenta para publicar automáticamente en FB e Instagram
                        </div>
                    </div>
                </div>
            `;
        }
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }
}

// Inicializar cuando el DOM esté listo
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFacebookSDK);
} else {
    initFacebookSDK();
}
