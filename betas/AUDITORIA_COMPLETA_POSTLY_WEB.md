# AUDITORÍA COMPLETA - POSTLY V2 WEB

**Fecha:** 29 de Abril, 2026  
**Proyecto:** Postly V2 - Plataforma Web  
**Stack:** HTML5 + Vanilla JavaScript + Render.com Backend  
**Estado:** 🔴 CRÍTICO - Múltiples Funcionalidades No Operativas

---

## 📋 RESUMEN EJECUTIVO

Se han identificado **3 problemas críticos** que impiden que la aplicación funcione correctamente:

| # | Problema | Severidad | Causa Raíz | Ubicación |
|---|----------|-----------|-----------|-----------|
| 1 | **NO conecta con el backend** | 🔴 CRÍTICA | URL mal configurada + Endpoints no implementados | config.js, api.js |
| 2 | **NO publica en redes sociales** | 🔴 CRÍTICA | Endpoint `/api/posts/publish` no existe | backend |
| 3 | **IA NO da sugerencias** | 🔴 CRÍTICA | Endpoints `/api/ai/*` no implementados + API Key expuesta | api.js, backend |

---

## 🔴 PROBLEMA #1: NO CONECTA CON EL BACKEND

### Descripción del Problema

La aplicación intenta conectarse con `https://postly-z7cf.onrender.com` pero **falla silenciosamente** porque:

1. La URL está configurada en múltiples lugares de forma inconsistente
2. Los endpoints esperados NO existen en el backend
3. No hay manejo de errores de conexión visible para el usuario

### Ubicación de los Bugs

**Archivo:** `/js/config.js`  
**Líneas:** 11

```javascript
// PROBLEMA 1: URL hardcodeada sin validación
window.API_BASE_URL = "https://postly-z7cf.onrender.com"; 
```

**Archivo:** `/js/api.js`  
**Líneas:** 4-9

```javascript
// PROBLEMA 2: Lógica confusa de API_BASE_URL
if (window.Capacitor && (window.Capacitor.getPlatform() === 'android' || window.Capacitor.getPlatform() === 'ios')) {
    window.API_BASE_URL = "https://postly-z7cf.onrender.com";
} else {
    window.API_BASE_URL = window.location.origin.includes('localhost') ? 'http://localhost:3002' : '';
}
// ❌ PROBLEMA: Si no es localhost, API_BASE_URL se deja VACÍO!
```

### El Flujo Real de lo que Pasa

```
Usuario hace clic en "IA Texto"
    ↓
generateAICaption() se llama
    ↓
API.generateCaption() intenta conectar
    ↓
Envía request a: "https://postly-z7cf.onrender.com/api/ai/caption"
    ↓
Backend responde 404 (endpoint no existe)
    ↓
Error es capturado pero NO se muestra correctamente
    ↓
Usuario solo ve el error de IA pero NO sabe por qué
```

### 🛠️ SOLUCIÓN PASO A PASO

#### PASO 1: Corregir config.js

**Archivo:** `/js/config.js`

REEMPLAZAR:

```javascript
// config.js - Configuración Standalone para Postly
// NOTA: Esta versión funciona de manera 100% autónoma usando LocalStorage, sin Backend.

const isCapacitor = (
    window.location.protocol === 'capacitor:' ||
    (window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()) ||
    document.URL.startsWith('https://localhost')
);

// Mantenemos la variable global. ¡IMPORTANTE!: Cambia esta URL por la de tu servidor de Render una vez la tengas.
window.API_BASE_URL = "https://postly-z7cf.onrender.com"; 

console.log('[CONFIG] Entorno:', isCapacitor ? 'Mobile APK (Nativo)' : 'Web Browser');
console.log('[CONFIG] Modo: Conectado a Servidor (Backend)');
```

CON:

```javascript
// config.js - Configuración Centralizada de Postly V2
// ✅ VERSIÓN CORREGIDA - Manejo correcto de entornos

const isCapacitor = (
    window.location.protocol === 'capacitor:' ||
    (window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()) ||
    document.URL.startsWith('https://localhost')
);

// ✅ URL del backend - Misma para todos los entornos
window.API_BASE_URL = "https://postly-z7cf.onrender.com";

// ✅ Validar que el backend esté disponible
window.API_HEALTH_CHECK = async function() {
    try {
        const response = await fetch(`${window.API_BASE_URL}/health`, { 
            method: 'GET',
            timeout: 5000 
        });
        return response.ok;
    } catch (error) {
        console.error('[CONFIG] Backend no disponible:', error.message);
        return false;
    }
};

console.log('[CONFIG] ✅ Backend configurado:', window.API_BASE_URL);
console.log('[CONFIG] ✅ Entorno:', isCapacitor ? 'Mobile APK (Nativo)' : 'Web Browser');

// Verificar conexión al cargar
window.addEventListener('load', async () => {
    const isHealthy = await window.API_HEALTH_CHECK();
    if (!isHealthy) {
        console.warn('[CONFIG] ⚠️ ADVERTENCIA: Backend no responde. Algunas funciones estarán limitadas.');
    }
});
```

#### PASO 2: Corregir api.js

**Archivo:** `/js/api.js`  
**Líneas:** 4-9

REEMPLAZAR:

```javascript
// Auto-configurar URL de backend
if (window.Capacitor && (window.Capacitor.getPlatform() === 'android' || window.Capacitor.getPlatform() === 'ios')) {
    window.API_BASE_URL = "https://postly-z7cf.onrender.com";
} else {
    window.API_BASE_URL = window.location.origin.includes('localhost') ? 'http://localhost:3002' : '';
}
```

CON:

```javascript
// ✅ URL de backend ya configurada en config.js
// No duplicar configuración aquí
```

#### PASO 3: Agregar Validación en las Peticiones

**Archivo:** `/js/api.js`  
**Función:** `request` (Línea 29)

REEMPLAZAR:

```javascript
async request(endpoint, options = {}) {
    const base = window.API_BASE_URL || '';
    const token = this.getToken();
    const headers = { ...options.headers };

    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (!(options.body instanceof FormData)) headers['Content-Type'] = 'application/json';

    const body = (options.body && !(options.body instanceof FormData) && typeof options.body !== 'string') 
        ? JSON.stringify(options.body) 
        : options.body;

    try {
        const response = await fetch(`${base}${endpoint}`, { ...options, body, headers });
        // ... resto del código
    }
}
```

CON:

```javascript
async request(endpoint, options = {}) {
    const base = window.API_BASE_URL;
    
    // ✅ Validar que la URL esté configurada
    if (!base) {
        throw new Error('Backend no configurado. URL_BASE no establecida.');
    }
    
    const token = this.getToken();
    const headers = { ...options.headers };

    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (!(options.body instanceof FormData)) headers['Content-Type'] = 'application/json';

    const body = (options.body && !(options.body instanceof FormData) && typeof options.body !== 'string') 
        ? JSON.stringify(options.body) 
        : options.body;

    try {
        console.log(`[API] ${options.method || 'GET'} ${base}${endpoint}`);
        
        const response = await fetch(`${base}${endpoint}`, { 
            ...options, 
            body, 
            headers,
            timeout: 30000 // Timeout de 30 segundos
        });
        
        if (response.status === 401) {
            this.clearAuth();
            if (!window.location.href.includes('login.html')) window.location.href = './index.html';
            return;
        }

        const data = await response.json();
        
        // ✅ Mejor manejo de errores
        if (!response.ok) {
            const errorMsg = data.error || data.message || `Error ${response.status}`;
            console.error(`[API ERROR] ${endpoint}:`, errorMsg);
            throw new Error(errorMsg);
        }
        
        return data;
        
    } catch (error) {
        console.error(`[API ERROR] ${endpoint}:`, error.message);
        
        // ✅ Diferenciar entre errores de red y errores de API
        if (error instanceof TypeError && error.message.includes('fetch')) {
            throw new Error('Error de conexión con el servidor. ¿Backend está activo?');
        }
        
        throw error;
    }
}
```

#### PASO 4: Agregar Endpoint de Health Check en el Backend

**Archivo:** `/backend/server.js` (o app.js principal)

AGREGAR:

```javascript
// Health check endpoint - debe ser lo primero
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});

// También lo necesitas en /api/ para consistencia
app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'ok',
        message: 'Backend activo y funcionando',
        timestamp: new Date().toISOString()
    });
});
```

### ⚠️ Testing de Conexión

Abrir la consola del navegador (F12) y ejecutar:

```javascript
// Probar conexión
const isHealthy = await window.API_HEALTH_CHECK();
console.log('Backend disponible:', isHealthy);

// Si devuelve false, el backend NO está activo
```

---

## 🔴 PROBLEMA #2: NO PUBLICA EN REDES SOCIALES

### Descripción del Problema

Cuando el usuario presiona "Publicar ahora", la aplicación **NO publica el post en Instagram o Facebook**. El código llama a `API.createPost()` pero:

1. El endpoint `/api/posts` **NO valida permisos de publicación**
2. No existe endpoint `/api/posts/{id}/publish`
3. Backend NO tiene código para conectarse con Meta Graph API

### Ubicación de los Bugs

**Archivo:** `/js/app.js`  
**Función:** `finalizePostSubmission` (Línea 737)

```javascript
async function finalizePostSubmission() {
    // ... código ...
    
    const res = await API.createPost({
        content: content,
        image_base64: finalImage,
        platform: currentPostData.platform,
        aspect_ratio: currentPostData.aspect_ratio,
        status: 'published' // ❌ Intenta publicar directamente
    });
    
    alert("¡Publicación exitosa!");
    // ❌ PROBLEMA: Nunca se publica en redes reales, solo se guarda localmente
}
```

**Archivo:** `/js/api.js`  
**Línea:** 69-73

```javascript
// === POSTS ===
async getPosts() { return this.request('/api/posts'); },
async createPost(data) {
    return this.request('/api/posts', {
        method: 'POST',
        body: data
    });
    // ❌ PROBLEMA: No hay endpoint para publicar en redes sociales
}
```

### 🛠️ SOLUCIÓN PASO A PASO

#### PASO 1: Crear Endpoint de Publicación en el Backend

**Archivo:** `/backend/routes/posts.js` (NUEVO)

```javascript
const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');

/**
 * POST /api/posts
 * Crear un post (sin publicar aún)
 */
router.post('/', authMiddleware, async (req, res) => {
    try {
        const { content, image_base64, platform, aspect_ratio, status } = req.body;
        const userId = req.user.id;
        
        // Validar contenido
        if (!content && !image_base64) {
            return res.status(400).json({ error: 'Se requiere contenido o imagen' });
        }
        
        // Guardar imagen en servicio de hosting
        let imageUrl = null;
        if (image_base64) {
            imageUrl = await uploadImageToPublicURL(image_base64);
        }
        
        // Crear post en DB
        const post = await db.posts.create({
            user_id: userId,
            content: content || '',
            image_url: imageUrl,
            platform: platform || 'instagram',
            aspect_ratio: aspect_ratio || '1:1',
            status: status === 'published' ? 'draft' : status, // No publicar hasta confirmación
            created_at: new Date()
        });
        
        res.json({ 
            success: true, 
            post,
            message: 'Post creado. Próximo paso: Publicar en redes sociales.'
        });
        
    } catch (error) {
        console.error('[CREATE POST ERROR]:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/posts/:id/publish
 * Publicar el post en Instagram/Facebook
 */
router.post('/:id/publish', authMiddleware, async (req, res) => {
    try {
        const postId = req.params.id;
        const userId = req.user.id;
        const userToken = req.user.meta_token;
        
        // 1. Obtener el post
        const post = await db.posts.findOne({ 
            id: postId, 
            user_id: userId 
        });
        
        if (!post) {
            return res.status(404).json({ error: 'Post no encontrado' });
        }
        
        if (post.status === 'published') {
            return res.status(400).json({ error: 'El post ya fue publicado' });
        }
        
        // 2. Validar token de Meta
        if (!userToken) {
            return res.status(401).json({ error: 'No hay token de Meta. Por favor conecta tu cuenta.' });
        }
        
        // 3. Publicar según plataforma
        let result;
        try {
            if (post.platform === 'instagram') {
                result = await publishToInstagram(post, userToken, req.user);
            } else if (post.platform === 'facebook') {
                result = await publishToFacebook(post, userToken, req.user);
            } else {
                return res.status(400).json({ error: 'Plataforma no soportada' });
            }
        } catch (publishError) {
            console.error('[PUBLISH ERROR]:', publishError);
            
            // Retornar error específico de Meta
            return res.status(400).json({ 
                error: 'Error al publicar en ' + post.platform,
                details: publishError.message,
                hint: 'Verifica que tu cuenta esté conectada y tengas permisos.'
            });
        }
        
        // 4. Actualizar estado en DB
        await db.posts.update(postId, {
            status: 'published',
            published_at: new Date(),
            platform_post_id: result.id,
            platform_url: result.permalink || result.post_url
        });
        
        res.json({ 
            success: true,
            message: 'Post publicado exitosamente',
            post_url: result.permalink || result.post_url,
            platform: post.platform
        });
        
    } catch (error) {
        console.error('[PUBLISH ENDPOINT ERROR]:', error);
        res.status(500).json({ 
            error: 'Error interno del servidor',
            details: error.message 
        });
    }
});

/**
 * Publicar en Instagram
 */
async function publishToInstagram(post, token, user) {
    const igAccountId = await getInstagramAccountId(token, user);
    
    if (!igAccountId) {
        throw new Error('Cuenta de Instagram Business no vinculada');
    }
    
    if (!post.image_url) {
        throw new Error('Instagram requiere una imagen');
    }
    
    // Crear media container
    const containerResponse = await fetch(
        `https://graph.facebook.com/v21.0/${igAccountId}/media`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                image_url: post.image_url,
                caption: post.content || '',
                access_token: token
            })
        }
    );
    
    const containerData = await containerResponse.json();
    
    if (containerData.error) {
        throw new Error(`Instagram: ${containerData.error.message}`);
    }
    
    const containerId = containerData.id;
    
    // Esperar a que esté procesado
    await waitForMediaContainerReady(igAccountId, containerId, token);
    
    // Publicar
    const publishResponse = await fetch(
        `https://graph.facebook.com/v21.0/${igAccountId}/media_publish`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                creation_id: containerId,
                access_token: token
            })
        }
    );
    
    const publishData = await publishResponse.json();
    
    if (publishData.error) {
        throw new Error(`Instagram Publish: ${publishData.error.message}`);
    }
    
    return {
        id: publishData.id,
        permalink: `https://www.instagram.com/p/${publishData.id}/`
    };
}

/**
 * Publicar en Facebook
 */
async function publishToFacebook(post, token, user) {
    const pageData = await getFacebookPageData(token, user);
    
    if (!pageData) {
        throw new Error('Página de Facebook no vinculada');
    }
    
    const FormData = require('form-data');
    const fs = require('fs');
    const https = require('https');
    
    const formData = new FormData();
    formData.append('message', post.content || '');
    formData.append('access_token', pageData.pageToken);
    
    if (post.image_url) {
        // Descargar imagen
        const imageBuffer = await downloadImage(post.image_url);
        formData.append('source', imageBuffer, { filename: 'post.jpg' });
    }
    
    const endpoint = post.image_url 
        ? `https://graph.facebook.com/v21.0/${pageData.pageId}/photos`
        : `https://graph.facebook.com/v21.0/${pageData.pageId}/feed`;
    
    const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
        headers: formData.getHeaders()
    });
    
    const data = await response.json();
    
    if (data.error) {
        throw new Error(`Facebook: ${data.error.message}`);
    }
    
    return {
        id: data.id,
        post_url: data.post_id ? `https://www.facebook.com/${data.post_id}` : null
    };
}

// Funciones auxiliares
async function getInstagramAccountId(token, user) {
    if (user.instagram_account_id) {
        return user.instagram_account_id;
    }
    
    const response = await fetch(
        `https://graph.facebook.com/v21.0/me/accounts?fields=instagram_business_account&access_token=${token}`
    );
    const data = await response.json();
    
    if (data.data && data.data.length > 0) {
        const pageWithIG = data.data.find(p => p.instagram_business_account);
        if (pageWithIG) {
            return pageWithIG.instagram_business_account.id;
        }
    }
    
    return null;
}

async function getFacebookPageData(token, user) {
    let pageId = user.fb_page_id;
    
    if (!pageId) {
        const response = await fetch(
            `https://graph.facebook.com/v21.0/me/accounts?access_token=${token}`
        );
        const data = await response.json();
        
        if (data.data && data.data.length > 0) {
            pageId = data.data[0].id;
        } else {
            return null;
        }
    }
    
    const pageResponse = await fetch(
        `https://graph.facebook.com/v21.0/${pageId}?fields=access_token&access_token=${token}`
    );
    const pageData = await pageResponse.json();
    
    return {
        pageId,
        pageToken: pageData.access_token
    };
}

async function waitForMediaContainerReady(igAccountId, containerId, token, maxAttempts = 10) {
    for (let i = 0; i < maxAttempts; i++) {
        const response = await fetch(
            `https://graph.facebook.com/v21.0/${containerId}?fields=status_code&access_token=${token}`
        );
        const data = await response.json();
        
        if (data.status_code === 'FINISHED') {
            return true;
        } else if (data.status_code === 'ERROR') {
            throw new Error('Instagram no pudo procesar la imagen');
        }
        
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    throw new Error('Timeout esperando que Instagram procese la imagen');
}

async function uploadImageToPublicURL(base64Image) {
    // Usar ImgBB o Cloudinary
    const IMGBB_API_KEY = process.env.IMGBB_API_KEY;
    
    if (!IMGBB_API_KEY) {
        throw new Error('IMGBB_API_KEY no configurada en variables de entorno');
    }
    
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
    const FormData = require('form-data');
    
    const formData = new FormData();
    formData.append('image', base64Data);
    
    const response = await fetch(
        `https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`,
        {
            method: 'POST',
            body: formData
        }
    );
    
    const data = await response.json();
    
    if (!data.success) {
        throw new Error('Error al subir imagen a ImgBB');
    }
    
    return data.data.url;
}

async function downloadImage(url) {
    const response = await fetch(url);
    return await response.buffer();
}

module.exports = router;
```

#### PASO 2: Registrar la Ruta en el Backend

**Archivo:** `/backend/server.js` (o `app.js`)

```javascript
const postsRouter = require('./routes/posts');
app.use('/api/posts', postsRouter);
```

#### PASO 3: Actualizar la Función de Publicación en el Frontend

**Archivo:** `/js/app.js`  
**Función:** `finalizePostSubmission` (Línea 737)

REEMPLAZAR:

```javascript
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
            aspect_ratio: currentPostData.aspect_ratio,
            status: 'published'
        });
        
        alert("¡Publicación exitosa!");
        navigate('dashboard');
    } catch (e) {
        console.error("[PUBLISH ERROR]", e);
        showToast("Error al publicar: " + e.message, "error");
    } finally {
        btn.innerHTML = 'Publicar ahora <i data-lucide="send" style="width: 20px; margin-left: 8px;"></i>';
        btn.disabled = false;
        lucide.createIcons();
    }
}
```

CON:

```javascript
async function finalizePostSubmission() {
    const content = document.getElementById('post-text').value;
    const btn = document.getElementById('submit-btn');
    const platform = currentPostData.platform || 'instagram';
    
    // Validación
    if (!content && !currentPostData.image) {
        showToast('Agrega texto o imagen para publicar', 'warning');
        return;
    }
    
    btn.innerHTML = '<div class="spinner" style="margin:0; width:20px; height:20px; border-width:2px;"></div> Creando post...';
    btn.disabled = true;

    try {
        // PASO 1: Procesar imagen si tiene filtros
        let finalImage = currentPostData.image;
        
        if (currentPostData.image && currentPostData.filter && currentPostData.filter !== 'none') {
            btn.innerHTML = '<div class="spinner" style="margin:0; width:20px; height:20px; border-width:2px;"></div> Aplicando filtro...';
            finalImage = await PhotoEditor.processImage(currentPostData.image, currentPostData.filter);
        }

        // PASO 2: Crear post en el servidor
        btn.innerHTML = '<div class="spinner" style="margin:0; width:20px; height:20px; border-width:2px;"></div> Guardando post...';
        
        const createRes = await API.createPost({
            content: content,
            image_base64: finalImage,
            platform: platform,
            aspect_ratio: currentPostData.aspect_ratio || '1:1',
            status: 'draft' // Guardar como borrador primero
        });
        
        if (!createRes.post || !createRes.post.id) {
            throw new Error('El servidor no devolvió un ID de post válido');
        }
        
        const postId = createRes.post.id;
        
        // PASO 3: Publicar en redes sociales
        btn.innerHTML = '<div class="spinner" style="margin:0; width:20px; height:20px; border-width:2px;"></div> Publicando en ' + platform + '...';
        
        const publishRes = await API.publishPost(postId, platform);
        
        // PASO 4: Mostrar éxito
        const modal = document.createElement('div');
        modal.className = 'modal-overlay active';
        modal.style.zIndex = '9999';
        modal.innerHTML = `
            <div class="modal" style="text-align:center; max-width:400px; padding:32px;">
                <div style="font-size:54px; margin-bottom:16px;">🎉</div>
                <h3 style="margin-bottom:8px; font-size:22px;">¡Publicado en ${platform}!</h3>
                <p style="color:var(--text-secondary); margin-bottom:24px; line-height:1.5;">
                    Tu post se publicó exitosamente.
                </p>
                <div style="display:flex; gap:12px;">
                    <button class="btn btn-outline" style="flex:1;" onclick="this.closest('.modal-overlay').remove(); navigate('dashboard');">
                        Volver
                    </button>
                    <a href="${publishRes.post_url}" target="_blank" class="btn btn-primary" style="flex:1; text-decoration:none;">
                        Ver Post
                    </a>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
        // Actualizar lista de posts
        navigate('dashboard');
        
    } catch (e) {
        console.error("[PUBLISH ERROR]", e);
        showToast("❌ Error al publicar: " + e.message, "error");
    } finally {
        btn.innerHTML = 'Publicar ahora <i data-lucide="send" style="width: 20px; margin-left: 8px;"></i>';
        btn.disabled = false;
        lucide.createIcons();
    }
}
```

#### PASO 4: Agregar Función de Publicación en api.js

**Archivo:** `/js/api.js`

AGREGAR después de `createPost`:

```javascript
async publishPost(postId, platform) {
    return this.request(`/api/posts/${postId}/publish`, {
        method: 'POST',
        body: { platform }
    });
}
```

---

## 🔴 PROBLEMA #3: IA NO DA SUGERENCIAS

### Descripción del Problema

Cuando el usuario hace clic en "IA Texto" o "Hashtags", **no se genera ninguna sugerencia**. Los problemas son:

1. **API Key de GROQ está expuesta** (hardcodeada en el código)
2. **Endpoints `/api/ai/*` no existen** en el backend
3. **Fallback a GROQ API falla** sin mensaje de error claro

### Ubicación de los Bugs

**Archivo:** `/js/api.js`  
**Línea:** 2

```javascript
// ❌ PROBLEMA: API Key pública (cualquiera puede verla)
const GROQ_API_KEY = "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";
```

**Archivo:** `/js/api.js`  
**Líneas:** 102-143

```javascript
async generateCaption(description, options = {}) {
    if (window.API_BASE_URL) {
        // ❌ Intenta conectar a endpoint que NO existe
        return this.request('/api/ai/caption', {
            method: 'POST',
            body: { description, ...options }
        });
    }
    // Fallback a GROQ si no hay servidor
    const res = await this._fetchGroq(`Genera un caption para: ${description}`);
    return { caption: res };
}
```

### 🛠️ SOLUCIÓN PASO A PASO

#### PASO 1: Mover API Key a Variables de Entorno

**NUNCA hardcodees API keys en el código frontal**

**Archivo:** `/backend/.env`

AGREGAR:

```
GROQ_API_KEY=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
```

#### PASO 2: Eliminar la API Key del Frontend

**Archivo:** `/js/api.js`  
**Línea:** 2

ELIMINAR:

```javascript
const GROQ_API_KEY = "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";
```

Y REEMPLAZAR todas las referencias a `GROQ_API_KEY` en `_fetchGroq`:

```javascript
async _fetchGroq(prompt, system = "Eres un asistente experto.") {
    // ❌ PROBLEMA: Usar API Key en frontend
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${GROQ_API_KEY}` // ❌ EXPUESTO
        },
        // ...
    });
}
```

CON:

```javascript
async _fetchGroq(prompt, system = "Eres un asistente experto.") {
    // ✅ NUNCA USE API KEY EN FRONTEND
    // Las llamadas a IA SIEMPRE deben ir a través del backend
    throw new Error('Las sugerencias de IA requieren conexión al servidor');
}
```

#### PASO 3: Crear Endpoints de IA en el Backend

**Archivo:** `/backend/routes/ai.js` (NUEVO)

```javascript
const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');

/**
 * POST /api/ai/caption
 * Generar caption para un post
 */
router.post('/caption', authMiddleware, async (req, res) => {
    try {
        const { description } = req.body;
        
        if (!description) {
            return res.status(400).json({ error: 'Description requerida' });
        }
        
        const caption = await generateWithGroq(
            `Genera un caption atractivo y profesional para un post de redes sociales con esta temática: "${description}". El caption debe ser corto, viral y emocionante.`
        );
        
        res.json({ 
            success: true,
            caption 
        });
        
    } catch (error) {
        console.error('[AI CAPTION ERROR]:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/ai/hashtags
 * Generar hashtags relevantes
 */
router.post('/hashtags', authMiddleware, async (req, res) => {
    try {
        const { description } = req.body;
        
        if (!description) {
            return res.status(400).json({ error: 'Description requerida' });
        }
        
        const hashtags = await generateWithGroq(
            `Genera 15 hashtags relevantes para un post sobre: "${description}". 
            Los hashtags deben ser populares, específicos y aumentar el alcance.
            Retorna solo los hashtags separados por espacio, sin numeración.`
        );
        
        res.json({ 
            success: true,
            hashtags 
        });
        
    } catch (error) {
        console.error('[AI HASHTAGS ERROR]:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/ai/ideas
 * Generar ideas de contenido
 */
router.post('/ideas', authMiddleware, async (req, res) => {
    try {
        const { industry, context } = req.body;
        
        if (!industry) {
            return res.status(400).json({ error: 'Industry requerida' });
        }
        
        const ideas = await generateWithGroq(
            `Genera 5 ideas de contenido viral para un negocio en la industria de "${industry}".
            Las ideas deben ser creativas, prácticas y fáciles de implementar.
            Retorna cada idea en una línea nueva.`
        );
        
        res.json({ 
            success: true,
            ideas 
        });
        
    } catch (error) {
        console.error('[AI IDEAS ERROR]:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/ai/improve
 * Mejorar texto existente
 */
router.post('/improve', authMiddleware, async (req, res) => {
    try {
        const { text, tone } = req.body;
        
        if (!text) {
            return res.status(400).json({ error: 'Text requerido' });
        }
        
        const improved = await generateWithGroq(
            `Mejora el siguiente texto para que sea más atractivo y profesional.
            ${tone ? `El tono debe ser: ${tone}` : ''}
            
            Texto original: "${text}"
            
            Retorna solo el texto mejorado, sin explicaciones.`
        );
        
        res.json({ 
            success: true,
            improved_text: improved 
        });
        
    } catch (error) {
        console.error('[AI IMPROVE ERROR]:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Función auxiliar: Generar con GROQ
 */
async function generateWithGroq(prompt, system = "Eres un asistente experto en marketing digital y redes sociales.") {
    const API_KEY = process.env.GROQ_API_KEY;
    
    if (!API_KEY) {
        throw new Error('GROQ_API_KEY no configurada en el servidor');
    }
    
    try {
        const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${API_KEY}`
            },
            body: JSON.stringify({
                model: "llama-3.3-70b-versatile",
                messages: [
                    { role: "system", content: system },
                    { role: "user", content: prompt }
                ],
                temperature: 0.7,
                max_tokens: 500
            })
        });
        
        const data = await response.json();
        
        if (data.error) {
            throw new Error(data.error.message);
        }
        
        return data.choices[0].message.content.trim();
        
    } catch (error) {
        console.error('[GROQ ERROR]:', error);
        throw new Error(`Error de IA: ${error.message}`);
    }
}

module.exports = router;
```

#### PASO 4: Registrar la Ruta de IA en el Backend

**Archivo:** `/backend/server.js`

```javascript
const aiRouter = require('./routes/ai');
app.use('/api/ai', aiRouter);
```

#### PASO 5: Actualizar las Funciones de IA en el Frontend

**Archivo:** `/js/api.js`

REEMPLAZAR:

```javascript
async generateCaption(description, options = {}) {
    if (window.API_BASE_URL) {
        return this.request('/api/ai/caption', {
            method: 'POST',
            body: { description, ...options }
        });
    }
    const res = await this._fetchGroq(`Genera un caption para: ${description}`);
    return { caption: res };
}

async generateHashtags(description) {
    if (window.API_BASE_URL) {
        return this.request('/api/ai/hashtags', {
            method: 'POST',
            body: { description }
        });
    }
    const res = await this._fetchGroq(`Hashtags para: ${description}`);
    return { hashtags: res };
}

async generateIdeas(industry) {
    if (window.API_BASE_URL) {
        return this.request('/api/ai/ideas', {
            method: 'POST',
            body: { industry }
        });
    }
    const res = await this._fetchGroq(`Ideas para: ${industry}`);
    return { ideas: res };
}
```

CON:

```javascript
async generateCaption(description, options = {}) {
    // ✅ Siempre conectar al backend para IA
    if (!window.API_BASE_URL) {
        throw new Error('Servidor no disponible. IA requiere conexión.');
    }
    
    return this.request('/api/ai/caption', {
        method: 'POST',
        body: { description, ...options }
    });
}

async generateHashtags(description) {
    if (!window.API_BASE_URL) {
        throw new Error('Servidor no disponible. IA requiere conexión.');
    }
    
    return this.request('/api/ai/hashtags', {
        method: 'POST',
        body: { description }
    });
}

async generateIdeas(industry) {
    if (!window.API_BASE_URL) {
        throw new Error('Servidor no disponible. IA requiere conexión.');
    }
    
    return this.request('/api/ai/ideas', {
        method: 'POST',
        body: { industry }
    });
}

async improveText(text, tone = null) {
    if (!window.API_BASE_URL) {
        throw new Error('Servidor no disponible. IA requiere conexión.');
    }
    
    return this.request('/api/ai/improve', {
        method: 'POST',
        body: { text, tone }
    });
}
```

#### PASO 6: Mejorar el Manejo de Errores en el Frontend

**Archivo:** `/js/app.js`  
**Funciones:** `generateAICaption`, `generateHashtags`

REEMPLAZAR:

```javascript
async function generateAICaption() {
    const text = document.getElementById('post-text').value;
    const btn = event.currentTarget;
    const originalText = btn.innerHTML;
    btn.innerHTML = 'Generando...';
    btn.disabled = true;

    try {
        const res = await API.generateCaption(text || 'Marketing digital para mi negocio', {
            imageBase64: currentPostData.image
        });
        document.getElementById('post-text').value = res.caption;
    } catch (e) {
        showToast("Error de IA: " + e.message, "error");
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
        lucide.createIcons();
    }
}
```

CON:

```javascript
async function generateAICaption() {
    const text = document.getElementById('post-text').value;
    const btn = event.currentTarget;
    const originalText = btn.innerHTML;
    btn.innerHTML = '<span class="spinner" style="width:12px;height:12px; border-width:2px;"></span> Generando...';
    btn.disabled = true;

    try {
        // Validar que hay algo que procesar
        if (!text && !currentPostData.image) {
            showToast("Escribe algo o sube una imagen para generar sugerencias", "warning");
            return;
        }
        
        // Validar conexión
        if (!window.API_BASE_URL) {
            throw new Error('Servidor no conectado. Verifica tu conexión.');
        }
        
        const res = await API.generateCaption(text || 'Marketing digital profesional');
        
        if (!res.caption) {
            throw new Error('El servidor no devolvió una sugerencia válida');
        }
        
        // Mostrar en modal primero para que pueda editarse
        const modal = document.createElement('div');
        modal.className = 'modal-overlay active';
        modal.style.zIndex = '9999';
        modal.innerHTML = `
            <div class="modal" style="max-width:500px; padding:32px;">
                <h3 style="margin-bottom:16px;">Sugerencia de IA</h3>
                <textarea style="width:100%; height:150px; border:2px solid var(--border); border-radius:12px; padding:12px; font-family:inherit; resize:none; margin-bottom:16px;" id="ai-caption-text">${res.caption}</textarea>
                <div style="display:flex; gap:12px;">
                    <button class="btn btn-outline" style="flex:1;" onclick="this.closest('.modal-overlay').remove();">Cancelar</button>
                    <button class="btn btn-primary" style="flex:1;" onclick="document.getElementById('post-text').value = document.getElementById('ai-caption-text').value; this.closest('.modal-overlay').remove();">Usar</button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
        
    } catch (e) {
        console.error('[AI CAPTION ERROR]', e);
        showToast("❌ " + e.message, "error");
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
        lucide.createIcons();
    }
}
```

---

## 📊 RESUMEN DE BUGS Y SOLUCIONES

| Bug | Archivo | Línea | Problema | Solución | Prioridad |
|-----|---------|-------|----------|----------|-----------|
| Config incorrecta | config.js | 11 | API_BASE_URL hardcodeada | Centralizar en config.js | 🔴 |
| API_BASE_URL vacía | api.js | 8 | Si no es localhost, URL queda vacía | Validar siempre | 🔴 |
| API Key expuesta | api.js | 2 | GROQ_API_KEY pública | Mover a backend .env | 🔴 |
| No hay endpoint publish | backend | - | POST /api/posts/:id/publish no existe | Crear endpoint | 🔴 |
| No hay endpoints IA | backend | - | /api/ai/* no existen | Crear routes/ai.js | 🔴 |
| Generador vacío | app.js | 686 | generateIdeas() sin implementación | Implementar | 🟠 |

---

## 🧪 PLAN DE TESTING

### Test 1: Conexión Backend

```javascript
// En consola del navegador
const health = await window.API_HEALTH_CHECK();
console.log('Backend conectado:', health);
```

**Resultado esperado:** `true`

### Test 2: Generar Caption de IA

1. Ir a "Crear Post"
2. Escribir algo en "Contenido"
3. Hacer clic en "IA Texto"
4. VERIFICAR: Aparece modal con sugerencia
5. VERIFICAR: Puedo editar y usar la sugerencia

### Test 3: Publicar en Instagram

1. Seleccionar imagen
2. Escribir contenido
3. Seleccionar "Instagram"
4. Hacer clic "Publicar"
5. VERIFICAR: Post aparece en Instagram

---

## 📝 CHECKLIST DE IMPLEMENTACIÓN

- [ ] Corregir config.js
- [ ] Reparar api.js
- [ ] Crear /backend/routes/posts.js
- [ ] Crear /backend/routes/ai.js
- [ ] Crear /backend/middleware/auth.js
- [ ] Registrar rutas en server.js
- [ ] Mover GROQ_API_KEY a .env
- [ ] Actualizar funciones en app.js
- [ ] Deploy en Render.com
- [ ] Testing de conexión
- [ ] Testing de publicación
- [ ] Testing de IA

---

**Documento generado automáticamente**  
**Versión:** 1.0  
**Fecha:** 29/04/2026
