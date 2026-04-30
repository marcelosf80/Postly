# AUDITORÍA COMPLETA - POSTLY MOBILE APP

**Fecha:** 29 de Abril, 2026  
**Proyecto:** Postly Marketing - Aplicación Móvil Android (Capacitor)  
**Versión App:** 1.0.5  
**Estado:** 🔴 CRÍTICO - 3 Funcionalidades Principales No Operativas

---

## 📋 RESUMEN EJECUTIVO

Se han identificado **3 problemas críticos** que impiden el funcionamiento de las características principales de la aplicación:

| # | Problema | Severidad | Estado | Tiempo Estimado |
|---|----------|-----------|--------|-----------------|
| 1 | **Monetización AdMob NO funciona** | 🔴 CRÍTICA | Plugin no instalado | 2-3 horas |
| 2 | **Publicación en redes sociales NO funciona** | 🔴 CRÍTICA | Backend sin implementar | 8-12 horas |
| 3 | **Editor de imagen y filtros NO funciona** | 🟠 ALTA | Problema de inicialización | 1-2 horas |

---

## 🔴 PROBLEMA #1: MONETIZACIÓN ADMOB NO FUNCIONA

### Descripción del Problema

La aplicación **NO muestra anuncios** antes de publicar posts. El código está implementado en JavaScript pero el plugin nativo de Capacitor **NO ESTÁ INSTALADO**.

### Ubicación del Bug

**Archivo:** `/android/capacitor.settings.gradle`  
**Líneas:** 1-7

```gradle
// ARCHIVO ACTUAL (INCORRECTO)
include ':capacitor-android'
project(':capacitor-android').projectDir = new File('../node_modules/@capacitor/android/capacitor')

include ':capacitor-community-facebook-login'
project(':capacitor-community-facebook-login').projectDir = new File('../node_modules/@capacitor-community/facebook-login/android')

// ❌ FALTA: Plugin de AdMob
```

### Evidencia del Código Que Intenta Usar AdMob

**Archivo:** `/mobile/js/app.js`  
**Líneas:** 717-747

```javascript
// Código que INTENTA usar AdMob pero FALLA porque el plugin no existe
if (window.Capacitor && window.Capacitor.Plugins && window.Capacitor.Plugins.AdMob) {
    btn.textContent = 'Cargando Anuncio...';
    try {
        let isReady = await window.Capacitor.Plugins.AdMob.isAdReady();
        
        if (!isReady.ready) {
            await window.Capacitor.Plugins.AdMob.loadRewardedAd();
            await new Promise(r => setTimeout(r, 1500));
            isReady = await window.Capacitor.Plugins.AdMob.isAdReady();
        }

        if (isReady.ready) {
            const result = await window.Capacitor.Plugins.AdMob.showRewardedAd();
            // ... resto del código
        }
    } catch (adError) {
        console.error('[ADS] Error:', adError.message);
    }
}
```

**Problema:** `window.Capacitor.Plugins.AdMob` es `undefined` porque el plugin no está instalado.

### 🛠️ SOLUCIÓN PASO A PASO

#### PASO 1: Instalar Plugin de AdMob

```bash
# Ir al directorio raíz del proyecto (donde está package.json)
cd /ruta/del/proyecto

# Instalar el plugin de AdMob para Capacitor
npm install @capacitor-community/admob@next

# Sincronizar con Android
npx cap sync android
```

#### PASO 2: Configurar AndroidManifest.xml

**Archivo:** `/android/app/src/main/AndroidManifest.xml`

Agregar estas líneas DENTRO del tag `<application>`:

```xml
<application
    android:name=".MainApplication"
    ...>
    
    <!-- AdMob App ID - AGREGAR ESTAS LÍNEAS -->
    <meta-data
        android:name="com.google.android.gms.ads.APPLICATION_ID"
        android:value="ca-app-pub-5343221992536229~8884455709"/>
    
    <!-- ... resto del contenido -->
</application>
```

#### PASO 3: Actualizar build.gradle (app level)

**Archivo:** `/android/app/build.gradle`

Agregar en la sección `dependencies`:

```gradle
dependencies {
    implementation fileTree(dir: 'libs', include: ['*.jar'])
    implementation project(':capacitor-android')
    implementation project(':capacitor-community-facebook-login')
    
    // AdMob Plugin - AGREGAR ESTA LÍNEA
    implementation project(':capacitor-community-admob')
    
    // Google Mobile Ads SDK - AGREGAR ESTA LÍNEA
    implementation 'com.google.android.gms:play-services-ads:22.6.0'
    
    // ... resto de dependencias
}
```

#### PASO 4: Inicializar AdMob en MainActivity

**Archivo:** `/android/app/src/main/java/.../MainActivity.java` (o MainActivity.kt)

```java
import com.getcapacitor.community.admob.AdMob;
import com.google.android.gms.ads.MobileAds;

public class MainActivity extends BridgeActivity {
    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        
        // Inicializar Mobile Ads SDK
        MobileAds.initialize(this, initializationStatus -> {
            Log.d("AdMob", "AdMob initialized");
        });
        
        // Registrar plugin
        this.init(savedInstanceState, new ArrayList<Class<? extends Plugin>>() {{
            add(AdMob.class);
        }});
    }
}
```

#### PASO 5: Actualizar código JavaScript

**Archivo:** `/mobile/js/app.js`  
**Línea:** 577

REEMPLAZAR:

```javascript
if (window.Capacitor && window.Capacitor.Plugins.AdMob) {
    console.log("[ADS] Precargando anuncio rewarded...");
    window.Capacitor.Plugins.AdMob.loadRewardedAd().catch(e => console.warn("[ADS] Error precarga:", e));
}
```

CON:

```javascript
if (window.Capacitor && window.Capacitor.Plugins.AdMob) {
    console.log("[ADS] Precargando anuncio rewarded...");
    try {
        // Inicializar AdMob con las credenciales
        await window.Capacitor.Plugins.AdMob.initialize({
            testingDevices: [], // Vacío para producción
            initializeForTesting: false
        });
        
        // Preparar Rewarded Ad
        await window.Capacitor.Plugins.AdMob.prepareRewardVideoAd({
            adId: 'ca-app-pub-5343221992536229/3520448384',
            isTesting: false
        });
        
        console.log("[ADS] AdMob inicializado y anuncio preparado");
    } catch (e) {
        console.warn("[ADS] Error en inicialización:", e);
    }
}
```

**Archivo:** `/mobile/js/app.js`  
**Líneas:** 720-731

REEMPLAZAR:

```javascript
let isReady = await window.Capacitor.Plugins.AdMob.isAdReady();

if (!isReady.ready) {
    btn.textContent = 'Cargando Video...';
    await window.Capacitor.Plugins.AdMob.loadRewardedAd();
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
}
```

CON:

```javascript
// Mostrar anuncio recompensado
btn.textContent = 'Cargando Anuncio...';

const adResult = await window.Capacitor.Plugins.AdMob.showRewardVideoAd();

if (adResult && adResult.value === true) {
    btn.textContent = 'Verificando...';
    showToast('¡Anuncio visto completo!', 'success');
    
    // Opcional: Notificar al backend
    try { 
        await API.verifyAdReward(); 
    } catch(e) {
        console.warn('[ADS] No se pudo verificar en backend:', e);
    }
} else {
    throw new Error('Debes ver el anuncio completo para publicar.');
}
```

#### PASO 6: Compilar y Probar

```bash
# Sincronizar cambios
npx cap sync android

# Abrir en Android Studio
npx cap open android

# Compilar APK desde Android Studio
# Build > Build Bundle(s) / APK(s) > Build APK(s)
```

### ⚠️ Notas Importantes

1. **IDs de Prueba:** Para testing, usar:
   ```javascript
   adId: 'ca-app-pub-3940256099942544/5224354917' // Test Rewarded Ad
   ```

2. **IDs de Producción:** (Ya proporcionados en el PDF)
   ```javascript
   adId: 'ca-app-pub-5343221992536229/3520448384' // Production
   ```

3. **Verificar Logs:**
   ```bash
   adb logcat | grep -i "admob\|ads\|rewarded"
   ```

---

## 🔴 PROBLEMA #2: PUBLICACIÓN EN REDES SOCIALES NO FUNCIONA

### Descripción del Problema

El botón "Publicar" **NO envía posts a Instagram/Facebook**. El backend en Render.com **NO tiene implementada** la función de publicación real en Meta Graph API.

### Ubicación del Bug

**Archivo:** `/mobile/js/api.js`  
**Líneas:** 199-207

```javascript
// CÓDIGO ACTUAL (INCOMPLETO)
async publishPost(id) {
    if (!window.API_BASE_URL) {
        // Fallback a menú compartir si no hay servidor
        return this._publishFallbackShare(id);
    }

    console.log(`[API] Solicitando publicación real de post ${id} al servidor...`);
    return this.request(`/api/posts/${id}/publish`, { method: 'POST' });
    // ❌ PROBLEMA: El endpoint /api/posts/:id/publish NO existe en el backend
}
```

### Diagnóstico del Backend

**URL del Backend:** `https://marketing-4778.onrender.com`

**Problema Identificado:**
- ✅ Backend está **activo** (responde a peticiones)
- ❌ Endpoint `/api/posts/:id/publish` **NO EXISTE**
- ❌ Backend **NO tiene lógica** para publicar en Meta Graph API

### 🛠️ SOLUCIÓN PASO A PASO

#### PASO 1: Crear Endpoint en el Backend

Necesitas acceso al código del backend en Render.com. Crear el siguiente archivo:

**Archivo:** `/backend/routes/posts.js` (nuevo)

```javascript
const express = require('express');
const router = express.Router();
const fetch = require('node-fetch');
const FormData = require('form-data');

/**
 * POST /api/posts/:id/publish
 * Publicar un post en Instagram o Facebook
 */
router.post('/:id/publish', async (req, res) => {
    try {
        const postId = req.params.id;
        const userId = req.user.id; // Viene del middleware de auth
        const userToken = req.user.meta_token; // Token de Meta OAuth
        
        // 1. Obtener el post de la base de datos
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
        
        // 2. Publicar según la plataforma
        let result;
        if (post.platform === 'instagram') {
            result = await publishToInstagram(post, userToken, req.user);
        } else if (post.platform === 'facebook') {
            result = await publishToFacebook(post, userToken, req.user);
        } else {
            return res.status(400).json({ error: 'Plataforma no soportada' });
        }
        
        // 3. Actualizar estado en DB
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
            platform_post_id: result.id
        });
        
    } catch (error) {
        console.error('[PUBLISH ERROR]:', error);
        res.status(500).json({ 
            error: 'Error al publicar',
            details: error.message 
        });
    }
});

/**
 * Función auxiliar: Publicar en Instagram
 */
async function publishToInstagram(post, token, user) {
    // 1. Obtener Instagram Business Account ID
    const igAccountId = await getInstagramAccountId(token, user);
    
    if (!igAccountId) {
        throw new Error('No se encontró cuenta de Instagram Business vinculada');
    }
    
    if (!post.image_url) {
        throw new Error('Instagram requiere una imagen para publicar');
    }
    
    // 2. Crear Media Container
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
        throw new Error(`Instagram API: ${containerData.error.message}`);
    }
    
    const containerId = containerData.id;
    
    // 3. Esperar a que esté listo
    await waitForMediaContainerReady(igAccountId, containerId, token);
    
    // 4. Publicar
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
 * Función auxiliar: Publicar en Facebook
 */
async function publishToFacebook(post, token, user) {
    const pageData = await getFacebookPageData(token, user);
    
    if (!pageData) {
        throw new Error('No se encontró página de Facebook vinculada');
    }
    
    const { pageId, pageToken } = pageData;
    
    const formData = new FormData();
    formData.append('message', post.content || '');
    formData.append('access_token', pageToken);
    
    if (post.image_url) {
        const imageResponse = await fetch(post.image_url);
        const imageBuffer = await imageResponse.buffer();
        formData.append('source', imageBuffer, { filename: 'post-image.jpg' });
    }
    
    const endpoint = post.image_url 
        ? `https://graph.facebook.com/v21.0/${pageId}/photos`
        : `https://graph.facebook.com/v21.0/${pageId}/feed`;
    
    const response = await fetch(endpoint, {
        method: 'POST',
        body: formData
    });
    
    const data = await response.json();
    if (data.error) {
        throw new Error(`Facebook API: ${data.error.message}`);
    }
    
    return {
        id: data.id,
        post_url: data.post_id ? `https://www.facebook.com/${data.post_id}` : null
    };
}

/**
 * Obtener Instagram Account ID
 */
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

/**
 * Obtener datos de Facebook Page
 */
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

/**
 * Esperar a que Media Container esté listo
 */
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

module.exports = router;
```

#### PASO 2: Registrar la Ruta en el Backend

**Archivo:** `/backend/server.js` (o app.js)

```javascript
const express = require('express');
const app = express();
const cors = require('cors');

// Middlewares
app.use(cors());
app.use(express.json());

// Routes
const postsRouter = require('./routes/posts');  // AGREGAR ESTA LÍNEA

app.use('/api/posts', postsRouter);  // AGREGAR ESTA LÍNEA

// ... resto del código
```

#### PASO 3: Crear Middleware de Autenticación

**Archivo:** `/backend/middleware/auth.js` (nuevo)

```javascript
module.exports = async function authMiddleware(req, res, next) {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Token no proporcionado' });
        }
        
        const token = authHeader.substring(7);
        
        // Buscar usuario por token de Meta
        const user = await db.users.findOne({ meta_token: token });
        
        if (!user) {
            return res.status(401).json({ error: 'Token inválido' });
        }
        
        req.user = {
            id: user.id,
            email: user.email,
            meta_token: token,
            instagram_account_id: user.instagram_account_id,
            fb_page_id: user.fb_page_id
        };
        
        next();
        
    } catch (error) {
        console.error('[AUTH ERROR]:', error);
        res.status(401).json({ error: 'Autenticación fallida' });
    }
};
```

#### PASO 4: Implementar Almacenamiento de Imágenes

El problema es que Instagram requiere una URL pública de la imagen. Tienes 2 opciones:

**OPCIÓN A: Usar ImgBB (Gratis, Fácil)**

```javascript
// En routes/posts.js, agregar función:
async function uploadImageToPublicURL(base64Image) {
    const IMGBB_API_KEY = process.env.IMGBB_API_KEY; // Obtener de https://api.imgbb.com/
    
    // Extraer el base64 puro (sin el prefijo data:image/...)
    const base64Data = base64Image.replace(/^data:image\/\w+;base64,/, '');
    
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
    
    return data.data.url; // URL pública de la imagen
}
```

**OPCIÓN B: Usar Cloudinary (Más profesional)**

```bash
npm install cloudinary
```

```javascript
const cloudinary = require('cloudinary').v2;

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

async function uploadImageToPublicURL(base64Image) {
    const result = await cloudinary.uploader.upload(base64Image, {
        folder: 'postly_posts'
    });
    
    return result.secure_url;
}
```

#### PASO 5: Actualizar createPost para Guardar Imagen

**Archivo:** `/backend/routes/posts.js`

```javascript
router.post('/', authMiddleware, async (req, res) => {
    try {
        const { content, image_base64, platform, aspect_ratio, status } = req.body;
        
        // Subir imagen si existe
        let imageUrl = null;
        if (image_base64) {
            imageUrl = await uploadImageToPublicURL(image_base64);
        }
        
        // Crear post en DB
        const post = await db.posts.create({
            user_id: req.user.id,
            content: content || '',
            image_url: imageUrl,
            platform: platform || 'instagram',
            aspect_ratio: aspect_ratio || '1:1',
            status: status || 'draft',
            created_at: new Date()
        });
        
        res.json({ 
            success: true, 
            post 
        });
        
    } catch (error) {
        console.error('[CREATE POST ERROR]:', error);
        res.status(500).json({ error: error.message });
    }
});
```

#### PASO 6: Deploy del Backend

```bash
# Hacer commit de los cambios
git add .
git commit -m "Implementar publicación real en Instagram/Facebook"
git push origin main

# Render.com detectará automáticamente los cambios y desplegará
# Esperar 2-3 minutos a que el deploy termine
```

#### PASO 7: Configurar Variables de Entorno en Render

En el dashboard de Render.com, agregar:

```
IMGBB_API_KEY=tu_api_key_aqui
```

O si usas Cloudinary:

```
CLOUDINARY_CLOUD_NAME=tu_cloud_name
CLOUDINARY_API_KEY=tu_api_key
CLOUDINARY_API_SECRET=tu_api_secret
```

### ⚠️ Notas Importantes

1. **Permisos de Meta:** El token debe tener los siguientes scopes:
   - `instagram_basic`
   - `instagram_content_publish`
   - `pages_read_engagement`
   - `pages_manage_posts`

2. **Rate Limits:** Meta tiene límites de API calls. Implementar retry logic.

3. **Testing:** Probar primero con una cuenta de prueba de Meta.

---

## 🟠 PROBLEMA #3: EDITOR DE IMAGEN Y FILTROS NO FUNCIONA

### Descripción del Problema

El editor de imágenes y los filtros fotográficos **NO se muestran** cuando el usuario selecciona una imagen. La librería `PhotoFilters` está cargada pero **NO se inicializa correctamente**.

### Ubicación del Bug

**Archivo:** `/mobile/js/app.js`  
**Líneas:** 556-579

```javascript
// CÓDIGO ACTUAL (PROBLEMA DE FLUJO)
function renderCreatePost() {
    // ... código HTML ...
    
    // PROBLEMA: La precarga de AdMob está BLOQUEANDO el resto del código
    if (window.Capacitor && window.Capacitor.Plugins.AdMob) {
        console.log("[ADS] Precargando anuncio rewarded...");
        window.Capacitor.Plugins.AdMob.loadRewardedAd().catch(e => console.warn("[ADS] Error precarga:", e));
    }
}
```

**Archivo:** `/mobile/js/app.js`  
**Línea:** 1142 (aproximadamente)

No existe el código que LLAMA al editor de filtros cuando el usuario selecciona una imagen.

### Diagnóstico

1. ✅ Librería `PhotoFilters` está cargada (`photo-filters.js` línea 202 en app.html)
2. ✅ Funciones `openFilterEditor()` y `renderFilterThumbnails()` están implementadas
3. ❌ NO existe el **event listener** que detecta cuando el usuario selecciona una imagen
4. ❌ NO hay **botón "Aplicar Filtros"** en la UI

### 🛠️ SOLUCIÓN PASO A PASO

#### PASO 1: Agregar Botón de Filtros en la UI

**Archivo:** `/mobile/js/app.js`  
**Función:** `renderCreatePost()`  
**Después de la línea donde está el input de imagen**

BUSCAR:

```javascript
<input type="file" id="post-image-input" accept="image/*" style="display:none;" onchange="handleImageSelect(event)">
```

AGREGAR DESPUÉS:

```javascript
<input type="file" id="post-image-input" accept="image/*" style="display:none;" onchange="handleImageSelect(event)">

<!-- Botón para abrir editor de filtros - AGREGAR ESTO -->
<div id="image-editor-actions" style="display:none; margin-top:12px; gap:8px; flex-wrap:wrap;">
    <button type="button" class="btn btn-outline btn-sm" onclick="openFilterEditor()" style="flex:1;">
        ${ICONS.palette} Filtros
    </button>
    <button type="button" class="btn btn-outline btn-sm" onclick="removeImage()" style="flex:0;">
        ${ICONS.trash} Quitar
    </button>
</div>
```

#### PASO 2: Implementar handleImageSelect

**Archivo:** `/mobile/js/app.js`  
**Agregar al final del archivo (antes de la última línea)**

```javascript
function handleImageSelect(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        currentImageBase64 = e.target.result;
        
        // Mostrar preview
        const preview = document.getElementById('image-preview');
        if (preview) {
            preview.src = currentImageBase64;
            preview.style.display = 'block';
        }
        
        // Mostrar botones de edición
        const editorActions = document.getElementById('image-editor-actions');
        if (editorActions) {
            editorActions.style.display = 'flex';
        }
        
        // Actualizar mockup
        updateMockup();
        
        showToast('Imagen cargada. Puedes aplicar filtros.', 'success');
    };
    reader.readAsDataURL(file);
}

function removeImage() {
    currentImageBase64 = null;
    
    const preview = document.getElementById('image-preview');
    if (preview) {
        preview.style.display = 'none';
        preview.src = '';
    }
    
    const editorActions = document.getElementById('image-editor-actions');
    if (editorActions) {
        editorActions.style.display = 'none';
    }
    
    const input = document.getElementById('post-image-input');
    if (input) {
        input.value = '';
    }
    
    updateMockup();
    showToast('Imagen eliminada', 'info');
}
```

#### PASO 3: Agregar Preview de Imagen en el HTML

**Archivo:** `/mobile/js/app.js`  
**Función:** `renderCreatePost()`  
**Después del botón de seleccionar imagen**

BUSCAR:

```javascript
<button type="button" class="btn btn-outline" onclick="document.getElementById('post-image-input').click()">
    📷 Seleccionar Imagen
</button>
```

AGREGAR DESPUÉS:

```javascript
<!-- Preview de imagen - AGREGAR ESTO -->
<img id="image-preview" style="display:none; width:100%; max-height:300px; object-fit:contain; margin-top:12px; border-radius:8px; border:1px solid var(--border);">
```

#### PASO 4: Fix del CSS para el Editor de Filtros

**Archivo:** `/mobile/css/main.css` (o styles.css)

AGREGAR AL FINAL:

```css
/* Filter Editor Styles */
#filter-editor-container {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.95);
    z-index: 10000;
    display: none;
    flex-direction: column;
}

#filter-editor-container.active {
    display: flex;
}

.filter-editor-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 16px;
    background: rgba(255, 255, 255, 0.05);
    border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.filter-editor-header h3 {
    margin: 0;
    color: white;
    font-size: 18px;
}

.filter-preview-area {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 16px;
    overflow: auto;
}

#filter-main-canvas {
    max-width: 100%;
    max-height: 100%;
    object-fit: contain;
    border-radius: 8px;
}

.filter-picker {
    background: rgba(255, 255, 255, 0.05);
    padding: 16px;
    border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.filter-picker-scroll {
    display: flex;
    gap: 12px;
    overflow-x: auto;
    padding-bottom: 8px;
}

.filter-chip {
    flex-shrink: 0;
    width: 100px;
    cursor: pointer;
    border-radius: 8px;
    overflow: hidden;
    border: 2px solid transparent;
    transition: all 0.2s;
}

.filter-chip:hover {
    border-color: rgba(255, 255, 255, 0.3);
    transform: scale(1.05);
}

.filter-chip.active {
    border-color: var(--primary, #6366f1);
    box-shadow: 0 0 12px rgba(99, 102, 241, 0.5);
}

.filter-chip img {
    width: 100%;
    height: 100px;
    object-fit: cover;
    display: block;
}

.filter-chip div {
    padding: 8px 4px;
    text-align: center;
    background: rgba(0, 0, 0, 0.7);
    color: white;
    font-size: 10px;
}
```

#### PASO 5: Verificar que PhotoFilters se Cargue Correctamente

**Archivo:** `/mobile/js/app.js`  
**En la función `document.addEventListener('DOMContentLoaded')`**

AGREGAR:

```javascript
document.addEventListener('DOMContentLoaded', () => {
    initUserInfo();
    navigateTo('overview');
    renderIcons();
    renderVersion();
    
    // Verificar PhotoFilters - AGREGAR ESTO
    if (window.PhotoFilters) {
        console.log('[INIT] PhotoFilters cargado correctamente');
        console.log('[INIT] Filtros disponibles:', Object.keys(window.PhotoFilters.presets).length);
    } else {
        console.error('[INIT] ⚠️ PhotoFilters NO se cargó');
    }
});
```

### ⚠️ Notas de Testing

1. **Probar en navegador primero:**
   - Abrir `app.html` en Chrome
   - Abrir DevTools (F12)
   - Verificar que no haya errores en Console
   - Probar seleccionar imagen
   - Verificar que aparezca botón "Filtros"
   - Probar aplicar un filtro

2. **Probar en Android:**
   ```bash
   npx cap sync android
   npx cap open android
   # Compilar y ejecutar en emulador/dispositivo
   ```

3. **Debugging:**
   ```bash
   adb logcat | grep -i "photofilters\|filter\|image"
   ```

---

## 📊 RESUMEN DE CAMBIOS NECESARIOS

### Backend (Node.js - Render.com)

| Archivo | Acción | Líneas Afectadas | Prioridad |
|---------|--------|------------------|-----------|
| `/routes/posts.js` | CREAR NUEVO | ~300 líneas | 🔴 CRÍTICA |
| `/middleware/auth.js` | CREAR NUEVO | ~30 líneas | 🔴 CRÍTICA |
| `/server.js` | MODIFICAR | 2-3 líneas | 🔴 CRÍTICA |
| `/.env` | AGREGAR VAR | 1-3 variables | 🔴 CRÍTICA |

### Frontend Mobile (JavaScript/HTML/CSS)

| Archivo | Acción | Líneas Afectadas | Prioridad |
|---------|--------|------------------|-----------|
| `/mobile/js/app.js` | MODIFICAR | ~50 líneas | 🔴 CRÍTICA |
| `/mobile/js/app.js` | AGREGAR FUNCIONES | ~60 líneas nuevas | 🟠 ALTA |
| `/mobile/css/main.css` | AGREGAR ESTILOS | ~80 líneas nuevas | 🟠 ALTA |

### Android (Kotlin/Gradle/XML)

| Archivo | Acción | Líneas Afectadas | Prioridad |
|---------|--------|------------------|-----------|
| `package.json` | MODIFICAR | 1 línea | 🔴 CRÍTICA |
| `/android/app/build.gradle` | MODIFICAR | 2 líneas | 🔴 CRÍTICA |
| `/android/app/AndroidManifest.xml` | MODIFICAR | 4 líneas | 🔴 CRÍTICA |
| `/android/app/.../MainActivity.java` | MODIFICAR | ~10 líneas | 🔴 CRÍTICA |

---

## 🧪 PLAN DE TESTING

### Test 1: Monetización AdMob

```
1. Abrir app
2. Ir a "Crear Post"
3. Escribir contenido
4. Presionar "Publicar"
5. VERIFICAR: Se muestra anuncio de AdMob
6. Ver anuncio completo
7. VERIFICAR: Mensaje "¡Anuncio visto!"
8. VERIFICAR: Post se publica
```

**Resultado Esperado:** ✅ Anuncio se muestra y publicación procede

### Test 2: Publicación en Instagram

```
1. Login con cuenta de Meta que tenga Instagram Business
2. Crear post con imagen
3. Escribir caption
4. Seleccionar plataforma: Instagram
5. Ver anuncio
6. Presionar "Publicar"
7. VERIFICAR: Mensaje "Publicado con éxito"
8. Abrir Instagram
9. VERIFICAR: Post aparece en el perfil
```

**Resultado Esperado:** ✅ Post publicado en Instagram

### Test 3: Filtros de Imagen

```
1. Ir a "Crear Post"
2. Presionar "Seleccionar Imagen"
3. Elegir una foto
4. VERIFICAR: Aparece preview de la imagen
5. VERIFICAR: Aparece botón "Filtros"
6. Presionar "Filtros"
7. VERIFICAR: Se abre editor con thumbnails de filtros
8. Presionar filtro "Vintage"
9. VERIFICAR: Preview se actualiza con el filtro
10. Presionar "Aplicar"
11. VERIFICAR: Imagen principal tiene el filtro aplicado
```

**Resultado Esperado:** ✅ Filtros se aplican correctamente

---

## 📝 CHECKLIST DE IMPLEMENTACIÓN

### Fase 1: Monetización AdMob (2-3 horas)

- [ ] Instalar plugin `@capacitor-community/admob`
- [ ] Configurar `AndroidManifest.xml` con App ID
- [ ] Actualizar `build.gradle` con dependencias
- [ ] Modificar `MainActivity` para inicializar AdMob
- [ ] Actualizar código JavaScript en `app.js`
- [ ] Compilar APK y probar en dispositivo
- [ ] Verificar que anuncio se muestre
- [ ] Testing con anuncios de prueba
- [ ] Testing con anuncios reales

### Fase 2: Publicación en Redes (8-12 horas)

- [ ] Crear archivo `/backend/routes/posts.js`
- [ ] Implementar función `publishToInstagram()`
- [ ] Implementar función `publishToFacebook()`
- [ ] Crear middleware de autenticación
- [ ] Configurar ImgBB o Cloudinary
- [ ] Implementar `uploadImageToPublicURL()`
- [ ] Registrar rutas en `server.js`
- [ ] Configurar variables de entorno
- [ ] Deploy del backend en Render
- [ ] Testing de publicación en Instagram
- [ ] Testing de publicación en Facebook

### Fase 3: Editor de Imagen (1-2 horas)

- [ ] Agregar botón "Filtros" en UI
- [ ] Implementar `handleImageSelect()`
- [ ] Implementar `removeImage()`
- [ ] Agregar preview de imagen en HTML
- [ ] Agregar estilos CSS del editor
- [ ] Verificar carga de `PhotoFilters`
- [ ] Testing de selección de imagen
- [ ] Testing de aplicación de filtros
- [ ] Testing de guardado con filtro aplicado

### Fase 4: Testing Integral (2-3 horas)

- [ ] Test end-to-end completo
- [ ] Verificar flujo: Login → Crear → Filtro → Anuncio → Publicar
- [ ] Probar en múltiples dispositivos Android
- [ ] Verificar logs de AdMob
- [ ] Verificar publicaciones en Instagram
- [ ] Verificar publicaciones en Facebook
- [ ] Performance testing
- [ ] Fix de bugs encontrados

---

## 🚨 PROBLEMAS ADICIONALES DETECTADOS

### 1. Seguridad: API Key Expuesta

**Archivo:** `/mobile/js/api.js`  
**Línea:** 3

```javascript
const GROQ_API_KEY = "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";
```

**Solución:** Mover a variable de entorno y llamar desde backend.

### 2. Token de Meta sin Refresh

El token de Meta expira después de 60 días. Implementar refresh token.

### 3. Sin Manejo de Errores de Red

No hay reintentos automáticos si falla la conexión.

---

## 💰 ESTIMACIÓN DE COSTOS

### Servicios Necesarios

1. **ImgBB** (Hosting de imágenes)
   - Plan Gratuito: 150 imágenes/hora
   - Plan Pro: $9.99/mes (ilimitado)

2. **Render.com** (Backend)
   - Plan Gratuito: OK para desarrollo
   - Plan Starter: $7/mes (recomendado para producción)

3. **Google AdMob**
   - Gratuito
   - Genera ingresos (CPM ~$2-5)

**TOTAL MENSUAL:** $0-17/mes

---

## 📞 SOPORTE Y CONTACTO

### Logs de Debugging

```bash
# Android Logcat
adb logcat | grep -E "AdMob|PostlyApp|META|INSTAGRAM"

# Backend Logs (Render.com)
# Dashboard → Service → Logs

# JavaScript Console (Chrome DevTools)
# F12 → Console tab
```

### Recursos Útiles

- [Documentación AdMob Capacitor](https://github.com/capacitor-community/admob)
- [Meta Graph API Docs](https://developers.facebook.com/docs/graph-api)
- [ImgBB API](https://api.imgbb.com/)
- [Cloudinary Docs](https://cloudinary.com/documentation)

---

**Documento generado automáticamente**  
**Versión:** 1.0  
**Fecha:** 29/04/2026  
**Próxima Revisión:** Después de implementar correcciones
