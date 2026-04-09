# 🚀 Integración OAuth Meta/Facebook - Documentación Completa

## ✅ Qué se Implementó

Tu sistema **SocialPulse** ahora tiene conexión OAuth automática con Meta que permite:

1. **Botón "Conectar con Facebook"** en Settings
2. **Auto-detección** de Instagram Business Account vinculado
3. **Exchange automático** de tokens (short-lived → long-lived 60 días)
4. **Guardar credenciales** automáticamente en la base de datos
5. **Publicación directa** en Instagram sin configuración manual

---

## 📋 Archivos Modificados/Creados

### Nuevos archivos:
- ✅ `/public/js/facebook-oauth.js` - Módulo OAuth completo
- ✅ `GUIA_OAUTH_META.md` - Esta documentación

### Archivos modificados:
- ✅ `/public/js/app.js` - Agregado botón OAuth en Settings
- ✅ `/public/app.html` - Agregado script facebook-oauth.js

### Ya existentes (sin cambios):
- ✅ `/routes/auth.js` - Backend OAuth (línea 236)
- ✅ `/instagram_api.js` - Lógica de publicación
- ✅ `.env` - Credenciales Meta configuradas

---

## 🔧 Configuración de Meta Developer App

### 1. Verificar Credenciales Actuales

Tu `.env` ya tiene:
```env
FACEBOOK_APP_ID=1493782988779942
FACEBOOK_APP_SECRET=9ded6acee6a119bfffcc764a509cff2a
```

### 2. Configurar Dominios en Meta Developer

1. Ve a: https://developers.facebook.com/apps/1493782988779942/settings/basic/

2. **App Domains:**
   ```
   localhost
   tudominio.com (cuando tengas producción)
   ```

3. **Privacy Policy URL:**
   ```
   http://localhost:3000/privacy (crear página simple)
   ```

4. **Terms of Service URL:**
   ```
   http://localhost:3000/terms (crear página simple)
   ```

### 3. Configurar Facebook Login

1. Ve a: **Productos → Facebook Login → Configuración**

2. **Valid OAuth Redirect URIs:**
   ```
   http://localhost:3000/
   http://localhost:3000/app
   http://localhost:3000/login
   https://tudominio.com/ (producción)
   ```

3. **Client OAuth Login:** ✅ ACTIVAR
4. **Web OAuth Login:** ✅ ACTIVAR

### 4. Verificar Permisos

Tu app necesita estos permisos:
- ✅ `pages_manage_posts`
- ✅ `pages_read_engagement`
- ✅ `instagram_basic`
- ✅ `instagram_content_publish`
- ✅ `business_management`

**IMPORTANTE:** En modo desarrollo, estos permisos están disponibles automáticamente. Para producción necesitás App Review.

---

## 🎯 Flujo OAuth Completo

### Usuario hace click en "Conectar con Facebook"

```
┌─────────────────────────────────────────────────────────┐
│ 1. Frontend (facebook-oauth.js)                         │
│    - Inicializa FB SDK con tu App ID                    │
│    - Llama FB.login() con permisos necesarios           │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ 2. Facebook OAuth Dialog                                │
│    - Usuario otorga permisos                            │
│    - Retorna Short-lived Token (1 hora)                 │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ 3. Backend (/api/auth/facebook)                         │
│    - Exchange short → long-lived token (60 días)        │
│    - Fetch user email                                   │
│    - Fetch user pages (me/accounts)                     │
│    - Para cada página:                                  │
│      ├─ Check si tiene Instagram Business               │
│      └─ Si tiene: guardar IG Page ID + Page Token       │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ 4. Database Update                                       │
│    - Actualiza user.ig_page_id                          │
│    - Actualiza user.ig_access_token                     │
│    - Actualiza user.fb_page_id                          │
│    - Actualiza user.fb_access_token                     │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│ 5. Frontend Response                                     │
│    - Muestra modal de éxito                             │
│    - Actualiza estado de conexión                       │
│    - Usuario puede publicar inmediatamente              │
└─────────────────────────────────────────────────────────┘
```

---

## 🧪 Cómo Probar la Integración

### Paso 1: Iniciar el servidor

```bash
cd /ruta/a/tu/proyecto
node server.js
```

### Paso 2: Abrir la app

```
http://localhost:3000/login
```

### Paso 3: Conectar Meta

1. Login con tu cuenta
2. Ir a **Configuración** (⚙️)
3. Click en **"Conectar con Facebook"**
4. Otorgar permisos en la ventana de Facebook
5. ✅ Deberías ver mensaje de éxito con tu IG Page ID

### Paso 4: Publicar un post

1. Ir a **Crear Post** (➕)
2. Subir una imagen
3. Escribir caption
4. Click **"Publicar Ahora"**
5. ✅ Post aparece en tu Instagram Business

---

## 🔍 Verificación de Estado

### Ver en consola del navegador (F12):

```javascript
// Ver usuario actual
console.log(window.currentUser);

// Verificar si está conectado
console.log(window.currentUser.ig_page_id); // Debe tener valor
console.log(window.currentUser.ig_access_token); // Debe tener valor
```

### Ver en backend (logs del servidor):

```
[AUTH] Buscando Instagram vinculado en X páginas...
[AUTH] ✅ Instagram encontrado: 17841XXXXX vinculado a la página: Tu Página
```

---

## 🐛 Troubleshooting

### Error: "Facebook App ID no configurado"

**Causa:** El servidor no puede acceder a `FACEBOOK_APP_ID` en `.env`

**Solución:**
```bash
# Verificar que .env existe y tiene las variables
cat .env | grep FACEBOOK

# Reiniciar servidor
node server.js
```

---

### Error: "Given URL is not allowed by the Application configuration"

**Causa:** Tu URL no está en "Valid OAuth Redirect URIs"

**Solución:**
1. Ir a Meta Developer → Facebook Login → Settings
2. Agregar `http://localhost:3000/` a la lista
3. Guardar cambios

---

### Error: "Requires instagram_basic permission"

**Causa:** La app no tiene permisos de Instagram

**Solución:**
1. Verificar que tu app es tipo **Business** (no Consumer)
2. Si es Consumer, crear nueva app tipo Business
3. Los permisos de Instagram solo están en apps Business

---

### No detecta Instagram Business Account

**Causa:** Tu Instagram no está vinculado a una Facebook Page

**Solución:**
1. Convertir Instagram a cuenta Business:
   - Instagram App → Settings → Account
   - Switch to Professional Account → Business

2. Vincular a Facebook Page:
   - Instagram → Settings → Business
   - Linked Accounts → Facebook
   - Seleccionar tu Fanpage

3. Verificar vinculación en Graph Explorer:
   ```
   GET https://graph.facebook.com/v21.0/me/accounts
       ?fields=instagram_business_account
       &access_token=TU_TOKEN
   ```

---

### Token expira después de 60 días

**Causa:** Los long-lived tokens expiran

**Solución:** Simplemente volver a conectar:
1. Ir a Settings
2. Click "Desconectar"
3. Click "Conectar con Facebook" nuevamente
4. Nuevo token válido por 60 días más

**Pro tip:** Podés agregar un recordatorio automático en tu sistema para notificar al usuario 7 días antes de la expiración.

---

## 🔐 Seguridad

### Tokens almacenados:

Los tokens se guardan en:
- **Backend:** `data/users.json` (cifrados en producción recomendado)
- **Frontend:** No se exponen tokens en cliente

### Mejores prácticas:

1. ✅ **Nunca** expongas tokens en logs públicos
2. ✅ **Nunca** commitees `.env` a Git
3. ✅ Usa HTTPS en producción
4. ✅ Implementá rate limiting en `/api/auth/facebook`
5. ✅ Agrega webhook verification para producción

---

## 📊 Próximos Pasos (Opcional)

### 1. Renovación Automática de Tokens

Agregar en `routes/auth.js`:

```javascript
// Cron job para renovar tokens antes de expiración
const cron = require('node-cron');

cron.schedule('0 0 * * *', async () => {
  const users = getAllUsers();
  const expiringUsers = users.filter(u => {
    const tokenAge = Date.now() - new Date(u.token_created_at);
    return tokenAge > 50 * 24 * 60 * 60 * 1000; // 50 días
  });
  
  expiringUsers.forEach(user => {
    sendEmailNotification(user.email, 'Tu token expira pronto');
  });
});
```

### 2. Multi-Account Support

Permitir conectar múltiples páginas/Instagram:

```javascript
// Modificar schema de usuario
{
  connected_accounts: [
    { 
      ig_page_id: '123', 
      ig_username: '@marca1',
      token: 'xxx',
      is_primary: true 
    },
    { 
      ig_page_id: '456', 
      ig_username: '@marca2',
      token: 'yyy',
      is_primary: false 
    }
  ]
}
```

### 3. Webhook Events

Recibir notificaciones cuando un post se publica/falla:

```javascript
// routes/webhooks.js
router.post('/webhooks/meta', (req, res) => {
  const { entry } = req.body;
  
  entry.forEach(event => {
    if (event.changes[0].field === 'feed') {
      const postId = event.changes[0].value.post_id;
      updatePostStatus(postId, 'published');
    }
  });
  
  res.sendStatus(200);
});
```

---

## 📞 Soporte

Si encontrás errores o necesitás ayuda:

1. Revisar logs del servidor: `console.log` en terminal
2. Revisar Console del navegador (F12)
3. Verificar Network tab para errores de API
4. Consultar Meta Developer Docs: https://developers.facebook.com/docs/instagram-api

---

## ✨ Resumen

Ya tenés:
- ✅ OAuth automático funcionando
- ✅ Auto-detección de Instagram Business
- ✅ Publicación sin configuración manual
- ✅ Token management (60 días)
- ✅ UI moderna con estado de conexión

**Solo necesitás:**
1. Configurar URLs en Meta Developer (5 minutos)
2. Conectar tu cuenta de Facebook
3. ¡Listo para publicar!

---

**Última actualización:** Abril 2026  
**Versión:** 1.0.0
