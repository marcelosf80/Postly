# INFORME TÉCNICO: INTEGRACIÓN ANDROID + BACKEND + MONETIZACIÓN

**Proyecto:** Postly Marketing - Android Native  
**Backend:** Render.com (Node.js/Express)  
**Fecha:** 28/04/2026  
**Stack:** Kotlin + Node.js + Meta Graph API + Google AdMob

---

## RESUMEN EJECUTIVO

**Estado Actual:**
- ✅ APK Android nativa en Kotlin funcionando
- ✅ Login con Meta OAuth funcional
- ✅ Backend desplegado en Render.com
- ❌ Publicación en redes sociales NO funciona
- ❌ Sistema de monetización NO implementado

**Objetivos:**
1. Conectar APK Android con backend para publicar posts
2. Implementar Google AdMob para monetización
3. Sistema de créditos: 1 anuncio visto = 1 publicación habilitada
4. Debugging y fix del flujo de publicación

---

## ARQUITECTURA DEL SISTEMA

```
┌─────────────────────────────────────────────────────────────┐
│                     ANDROID APP (KOTLIN)                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Meta OAuth  │  │   AdMob SDK  │  │  Retrofit    │      │
│  │   (Login)    │  │  (Ads)       │  │  (API Client)│      │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘      │
│         │                  │                  │              │
│         └──────────────────┴──────────────────┘              │
│                            │                                 │
└────────────────────────────┼─────────────────────────────────┘
                             │ HTTPS
                             │
┌────────────────────────────▼─────────────────────────────────┐
│                  BACKEND (RENDER.COM)                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │              Node.js + Express API                    │   │
│  │  • POST /api/posts/create                            │   │
│  │  • POST /api/posts/:id/publish                       │   │
│  │  • GET  /api/user/credits                            │   │
│  │  • POST /api/user/credits/add (after ad view)        │   │
│  │  • POST /api/user/credits/consume (before publish)   │   │
│  └──────────────┬───────────────────────────────────────┘   │
│                 │                                            │
│  ┌──────────────▼───────────────────────────────────────┐   │
│  │           PostgreSQL / MongoDB                       │   │
│  │  • users (id, email, fb_token, credits)             │   │
│  │  • posts (id, user_id, content, image_url, status)  │   │
│  └──────────────────────────────────────────────────────┘   │
└────────────────────────────┬─────────────────────────────────┘
                             │
                             │ Meta Graph API
                             │
┌────────────────────────────▼─────────────────────────────────┐
│                  META GRAPH API                              │
│  • POST /{ig-user-id}/media (crear container)               │
│  • POST /{ig-user-id}/media_publish (publicar)              │
│  • POST /{page-id}/feed (Facebook)                          │
└──────────────────────────────────────────────────────────────┘
```

---

## PARTE 1: DEBUGGING - POR QUÉ NO ESTÁ PUBLICANDO

### Checklist de Diagnóstico

#### A. Verificar Backend en Render.com

1. **¿Está el servicio activo?**
   - Acceder a: `https://marketing-4778.onrender.com/health` o `/.well-known/status`
   - Debería responder `200 OK`

2. **¿Existen los endpoints necesarios?**
   ```bash
   # Verificar desde terminal o Postman
   curl https://marketing-4778.onrender.com/api/posts/create
   curl https://marketing-4778.onrender.com/api/posts/publish
   ```

3. **¿Están configuradas las variables de entorno?**
   - `META_APP_ID`
   - `META_APP_SECRET`
   - `DATABASE_URL`
   - `PORT`

#### B. Verificar Flujo Android → Backend

**Posible Problema 1:** La APK no está enviando el token correctamente

```kotlin
// ❌ INCORRECTO
val request = PostCreateRequest(content = "Test")
api.createPost(request) // Falta Authorization header

// ✅ CORRECTO
val request = PostCreateRequest(content = "Test")
val token = sharedPrefs.getString("meta_token", null)
api.createPost("Bearer $token", request)
```

**Posible Problema 2:** CORS bloqueando las peticiones

En el backend (Node.js), verificar:
```javascript
app.use(cors({
    origin: '*', // En producción usar dominio específico
    credentials: true
}));
```

**Posible Problema 3:** El backend NO tiene la lógica de publicación implementada

Revisar si existe el código de publicación real (ver PARTE 2).

---

## PARTE 2: IMPLEMENTACIÓN BACKEND - NODE.JS

### Archivo: `routes/posts.js`

```javascript
const express = require('express');
const router = express.Router();
const multer = require('multer');
const FormData = require('form-data');
const fetch = require('node-fetch');

// Configurar multer para manejar imágenes
const storage = multer.memoryStorage();
const upload = multer({ 
    storage,
    limits: { fileSize: 10 * 1024 * 1024 } // 10MB
});

// Middleware de autenticación
const authMiddleware = require('../middleware/auth');

/**
 * POST /api/posts/create
 * Crear un post en borrador
 */
router.post('/create', authMiddleware, upload.single('image'), async (req, res) => {
    try {
        const { content, platform, hashtags, aspect_ratio } = req.body;
        const userId = req.user.id; // Del middleware auth
        
        // Validaciones
        if (!content && !req.file) {
            return res.status(400).json({ 
                error: 'Se requiere contenido o imagen' 
            });
        }
        
        // Subir imagen a servicio de hosting (ImgBB, Cloudinary, etc)
        let imageUrl = null;
        if (req.file) {
            imageUrl = await uploadImageToHost(req.file);
        }
        
        // Guardar en DB
        const post = await db.posts.create({
            user_id: userId,
            content: content || '',
            image_url: imageUrl,
            platform: platform || 'instagram',
            hashtags: hashtags || '',
            aspect_ratio: aspect_ratio || '1:1',
            status: 'draft',
            created_at: new Date()
        });
        
        res.json({ 
            success: true, 
            post 
        });
        
    } catch (error) {
        console.error('[POST CREATE ERROR]:', error);
        res.status(500).json({ 
            error: 'Error al crear el post',
            details: error.message 
        });
    }
});

/**
 * POST /api/posts/:id/publish
 * Publicar un post en la red social
 */
router.post('/:id/publish', authMiddleware, async (req, res) => {
    try {
        const postId = req.params.id;
        const userId = req.user.id;
        const userToken = req.user.meta_token;
        
        // 1. Verificar que el usuario tenga créditos
        const user = await db.users.findById(userId);
        if (user.credits < 1) {
            return res.status(403).json({ 
                error: 'Sin créditos disponibles',
                message: 'Mira un anuncio para obtener créditos' 
            });
        }
        
        // 2. Obtener el post
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
        
        // 3. Publicar según la plataforma
        let result;
        if (post.platform === 'instagram') {
            result = await publishToInstagram(post, userToken, user);
        } else if (post.platform === 'facebook') {
            result = await publishToFacebook(post, userToken, user);
        } else {
            return res.status(400).json({ error: 'Plataforma no soportada' });
        }
        
        // 4. Actualizar post en DB
        await db.posts.update(postId, {
            status: 'published',
            published_at: new Date(),
            platform_post_id: result.id,
            platform_url: result.permalink || result.post_url
        });
        
        // 5. Consumir crédito
        await db.users.update(userId, {
            credits: user.credits - 1
        });
        
        res.json({ 
            success: true, 
            post_url: result.permalink || result.post_url,
            remaining_credits: user.credits - 1
        });
        
    } catch (error) {
        console.error('[PUBLISH ERROR]:', error);
        
        // Marcar como fallido
        await db.posts.update(req.params.id, {
            status: 'failed',
            error_message: error.message
        });
        
        res.status(500).json({ 
            error: 'Error al publicar',
            details: error.message 
        });
    }
});

/**
 * Publicar en Instagram
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
    
    // 3. Esperar a que el container esté listo
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
 * Publicar en Facebook
 */
async function publishToFacebook(post, token, user) {
    // 1. Obtener Page ID y Page Token
    const pageData = await getFacebookPageData(token, user);
    
    if (!pageData) {
        throw new Error('No se encontró página de Facebook vinculada');
    }
    
    // 2. Preparar FormData
    const formData = new FormData();
    formData.append('message', post.content || '');
    formData.append('access_token', pageData.pageToken);
    
    if (post.image_url) {
        // Descargar imagen y subirla
        const imageResponse = await fetch(post.image_url);
        const imageBuffer = await imageResponse.buffer();
        formData.append('source', imageBuffer, { filename: 'post-image.jpg' });
    }
    
    // 3. Publicar
    const endpoint = post.image_url 
        ? `https://graph.facebook.com/v21.0/${pageData.pageId}/photos`
        : `https://graph.facebook.com/v21.0/${pageData.pageId}/feed`;
    
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

async function uploadImageToHost(file) {
    // Implementar según el servicio elegido
    // Opción 1: ImgBB
    // Opción 2: Cloudinary
    // Opción 3: AWS S3
    
    const IMGBB_API_KEY = process.env.IMGBB_API_KEY;
    
    const formData = new FormData();
    formData.append('image', file.buffer.toString('base64'));
    
    const response = await fetch(
        `https://api.imgbb.com/1/upload?key=${IMGBB_API_KEY}`,
        {
            method: 'POST',
            body: formData
        }
    );
    
    const data = await response.json();
    if (!data.success) {
        throw new Error('Error al subir imagen');
    }
    
    return data.data.url;
}

module.exports = router;
```

### Archivo: `routes/credits.js`

```javascript
const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/auth');

/**
 * GET /api/user/credits
 * Obtener créditos actuales del usuario
 */
router.get('/', authMiddleware, async (req, res) => {
    try {
        const user = await db.users.findById(req.user.id);
        
        res.json({ 
            credits: user.credits || 0,
            user_id: user.id
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/user/credits/add
 * Agregar crédito después de ver un anuncio
 */
router.post('/add', authMiddleware, async (req, res) => {
    try {
        const { ad_unit_id, reward_amount } = req.body;
        const userId = req.user.id;
        
        // Validar que el anuncio sea válido (anti-fraude básico)
        if (!ad_unit_id) {
            return res.status(400).json({ error: 'ad_unit_id requerido' });
        }
        
        // Obtener usuario actual
        const user = await db.users.findById(userId);
        const currentCredits = user.credits || 0;
        const newCredits = currentCredits + (reward_amount || 1);
        
        // Actualizar créditos
        await db.users.update(userId, {
            credits: newCredits
        });
        
        // Registrar en log de auditoría
        await db.credit_logs.create({
            user_id: userId,
            action: 'add',
            amount: reward_amount || 1,
            source: 'admob_rewarded_ad',
            ad_unit_id: ad_unit_id,
            timestamp: new Date()
        });
        
        res.json({ 
            success: true,
            credits: newCredits,
            added: reward_amount || 1
        });
        
    } catch (error) {
        console.error('[CREDIT ADD ERROR]:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * POST /api/user/credits/consume
 * Consumir crédito (se llama automáticamente al publicar)
 */
router.post('/consume', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const user = await db.users.findById(userId);
        
        if (user.credits < 1) {
            return res.status(403).json({ 
                error: 'Sin créditos disponibles',
                credits: 0
            });
        }
        
        const newCredits = user.credits - 1;
        
        await db.users.update(userId, {
            credits: newCredits
        });
        
        await db.credit_logs.create({
            user_id: userId,
            action: 'consume',
            amount: 1,
            source: 'post_publish',
            timestamp: new Date()
        });
        
        res.json({ 
            success: true,
            credits: newCredits
        });
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
```

### Archivo: `middleware/auth.js`

```javascript
const jwt = require('jsonwebtoken');

module.exports = async function authMiddleware(req, res, next) {
    try {
        // Obtener token del header
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Token no proporcionado' });
        }
        
        const token = authHeader.substring(7); // Remover "Bearer "
        
        // Verificar token (puede ser JWT o Meta Access Token)
        // Si usas JWT:
        // const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // req.user = decoded;
        
        // Si usas Meta Access Token directamente:
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

### Archivo: `server.js` (Principal)

```javascript
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const app = express();

// Middlewares
app.use(helmet());
app.use(cors({
    origin: '*', // En producción: especificar dominios permitidos
    credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
const postsRouter = require('./routes/posts');
const creditsRouter = require('./routes/credits');

app.use('/api/posts', postsRouter);
app.use('/api/user/credits', creditsRouter);

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Error handler
app.use((error, req, res, next) => {
    console.error('[GLOBAL ERROR]:', error);
    res.status(500).json({ 
        error: 'Error interno del servidor',
        message: error.message 
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
```

---

## PARTE 3: IMPLEMENTACIÓN ANDROID - KOTLIN

### Archivo: `build.gradle.kts` (Module: app)

```kotlin
plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("com.google.gms.google-services") // Para AdMob
}

android {
    namespace = "com.tuempresa.postly"
    compileSdk = 34

    defaultConfig {
        applicationId = "com.tuempresa.postly"
        minSdk = 24
        targetSdk = 34
        versionCode = 1
        versionName = "1.0"

        // URL del backend en Render
        buildConfigField("String", "API_BASE_URL", "\"https://marketing-4778.onrender.com/api/\"")
        buildConfigField("String", "ADMOB_APP_ID", "\"ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX\"")
        buildConfigField("String", "REWARDED_AD_UNIT_ID", "\"ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX\"")
    }

    buildFeatures {
        buildConfig = true
        compose = true
    }

    composeOptions {
        kotlinCompilerExtensionVersion = "1.5.8"
    }
}

dependencies {
    // Core Android
    implementation("androidx.core:core-ktx:1.12.0")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.7.0")
    implementation("androidx.activity:activity-compose:1.8.2")

    // Jetpack Compose
    implementation(platform("androidx.compose:compose-bom:2024.02.00"))
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-graphics")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.navigation:navigation-compose:2.7.6")

    // Retrofit (HTTP Client)
    implementation("com.squareup.retrofit2:retrofit:2.9.0")
    implementation("com.squareup.retrofit2:converter-gson:2.9.0")
    implementation("com.squareup.okhttp3:logging-interceptor:4.12.0")

    // Coil (Image Loading)
    implementation("io.coil-kt:coil-compose:2.5.0")

    // Google Play Services & AdMob
    implementation("com.google.android.gms:play-services-ads:22.6.0")

    // Facebook SDK (para OAuth)
    implementation("com.facebook.android:facebook-login:16.3.0")

    // DataStore (para guardar token)
    implementation("androidx.datastore:datastore-preferences:1.0.0")

    // Coroutines
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.7.3")
}
```

### Archivo: `AndroidManifest.xml`

```xml
<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <uses-permission android:name="android.permission.INTERNET" />
    <uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />

    <application
        android:name=".PostlyApplication"
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="@string/app_name"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@style/Theme.Postly">

        <!-- AdMob App ID -->
        <meta-data
            android:name="com.google.android.gms.ads.APPLICATION_ID"
            android:value="${ADMOB_APP_ID}"/>

        <!-- Facebook App ID -->
        <meta-data
            android:name="com.facebook.sdk.ApplicationId"
            android:value="@string/facebook_app_id"/>

        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:theme="@style/Theme.Postly">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>

</manifest>
```

### Archivo: `network/ApiService.kt`

```kotlin
package com.tuempresa.postly.network

import okhttp3.MultipartBody
import okhttp3.RequestBody
import retrofit2.Response
import retrofit2.http.*

interface ApiService {
    
    @Multipart
    @POST("posts/create")
    suspend fun createPost(
        @Header("Authorization") token: String,
        @Part("content") content: RequestBody,
        @Part("platform") platform: RequestBody,
        @Part("hashtags") hashtags: RequestBody?,
        @Part image: MultipartBody.Part?
    ): Response<CreatePostResponse>
    
    @POST("posts/{id}/publish")
    suspend fun publishPost(
        @Header("Authorization") token: String,
        @Path("id") postId: String
    ): Response<PublishPostResponse>
    
    @GET("user/credits")
    suspend fun getUserCredits(
        @Header("Authorization") token: String
    ): Response<CreditsResponse>
    
    @POST("user/credits/add")
    suspend fun addCredit(
        @Header("Authorization") token: String,
        @Body request: AddCreditRequest
    ): Response<CreditsResponse>
}

// Data classes
data class CreatePostResponse(
    val success: Boolean,
    val post: Post
)

data class PublishPostResponse(
    val success: Boolean,
    val post_url: String?,
    val remaining_credits: Int
)

data class CreditsResponse(
    val credits: Int,
    val user_id: String? = null,
    val success: Boolean? = null,
    val added: Int? = null
)

data class AddCreditRequest(
    val ad_unit_id: String,
    val reward_amount: Int = 1
)

data class Post(
    val id: String,
    val content: String,
    val image_url: String?,
    val platform: String,
    val status: String,
    val created_at: String
)
```

### Archivo: `network/RetrofitClient.kt`

```kotlin
package com.tuempresa.postly.network

import com.tuempresa.postly.BuildConfig
import okhttp3.OkHttpClient
import okhttp3.logging.HttpLoggingInterceptor
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import java.util.concurrent.TimeUnit

object RetrofitClient {
    
    private val loggingInterceptor = HttpLoggingInterceptor().apply {
        level = if (BuildConfig.DEBUG) {
            HttpLoggingInterceptor.Level.BODY
        } else {
            HttpLoggingInterceptor.Level.NONE
        }
    }
    
    private val okHttpClient = OkHttpClient.Builder()
        .addInterceptor(loggingInterceptor)
        .connectTimeout(30, TimeUnit.SECONDS)
        .readTimeout(30, TimeUnit.SECONDS)
        .writeTimeout(30, TimeUnit.SECONDS)
        .build()
    
    private val retrofit = Retrofit.Builder()
        .baseUrl(BuildConfig.API_BASE_URL)
        .client(okHttpClient)
        .addConverterFactory(GsonConverterFactory.create())
        .build()
    
    val apiService: ApiService = retrofit.create(ApiService::class.java)
}
```

### Archivo: `admob/AdManager.kt`

```kotlin
package com.tuempresa.postly.admob

import android.app.Activity
import android.content.Context
import android.util.Log
import com.google.android.gms.ads.*
import com.google.android.gms.ads.rewarded.RewardedAd
import com.google.android.gms.ads.rewarded.RewardedAdLoadCallback
import com.tuempresa.postly.BuildConfig

class AdManager(private val context: Context) {
    
    private var rewardedAd: RewardedAd? = null
    private var isLoading = false
    
    init {
        // Inicializar AdMob SDK
        MobileAds.initialize(context) { initializationStatus ->
            Log.d("AdMob", "Initialized: ${initializationStatus.adapterStatusMap}")
        }
    }
    
    /**
     * Cargar anuncio recompensado
     */
    fun loadRewardedAd(onAdLoaded: () -> Unit = {}, onAdFailedToLoad: (String) -> Unit = {}) {
        if (isLoading || rewardedAd != null) {
            Log.d("AdMob", "Ad already loading or loaded")
            return
        }
        
        isLoading = true
        
        val adRequest = AdRequest.Builder().build()
        
        RewardedAd.load(
            context,
            BuildConfig.REWARDED_AD_UNIT_ID,
            adRequest,
            object : RewardedAdLoadCallback() {
                override fun onAdLoaded(ad: RewardedAd) {
                    Log.d("AdMob", "Rewarded ad loaded successfully")
                    rewardedAd = ad
                    isLoading = false
                    onAdLoaded()
                }
                
                override fun onAdFailedToLoad(loadAdError: LoadAdError) {
                    Log.e("AdMob", "Failed to load ad: ${loadAdError.message}")
                    rewardedAd = null
                    isLoading = false
                    onAdFailedToLoad(loadAdError.message)
                }
            }
        )
    }
    
    /**
     * Mostrar anuncio recompensado
     */
    fun showRewardedAd(
        activity: Activity,
        onUserEarnedReward: (Int) -> Unit,
        onAdDismissed: () -> Unit
    ) {
        val ad = rewardedAd
        
        if (ad == null) {
            Log.e("AdMob", "Rewarded ad not ready")
            onAdDismissed()
            return
        }
        
        ad.fullScreenContentCallback = object : FullScreenContentCallback() {
            override fun onAdDismissedFullScreenContent() {
                Log.d("AdMob", "Ad dismissed")
                rewardedAd = null
                onAdDismissed()
                // Pre-cargar siguiente anuncio
                loadRewardedAd()
            }
            
            override fun onAdFailedToShowFullScreenContent(adError: AdError) {
                Log.e("AdMob", "Ad failed to show: ${adError.message}")
                rewardedAd = null
                onAdDismissed()
            }
            
            override fun onAdShowedFullScreenContent() {
                Log.d("AdMob", "Ad showed")
            }
        }
        
        ad.show(activity) { rewardItem ->
            val rewardAmount = rewardItem.amount
            Log.d("AdMob", "User earned reward: $rewardAmount")
            onUserEarnedReward(rewardAmount)
        }
    }
    
    fun isAdReady(): Boolean = rewardedAd != null
}
```

### Archivo: `ui/screens/CreatePostScreen.kt`

```kotlin
package com.tuempresa.postly.ui.screens

import android.net.Uri
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.compose.foundation.layout.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.unit.dp
import androidx.lifecycle.viewmodel.compose.viewModel
import coil.compose.AsyncImage
import com.tuempresa.postly.viewmodel.PostViewModel

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun CreatePostScreen(
    viewModel: PostViewModel = viewModel(),
    onNavigateToHome: () -> Unit
) {
    val context = LocalContext.current
    val uiState by viewModel.uiState.collectAsState()
    
    var content by remember { mutableStateOf("") }
    var platform by remember { mutableStateOf("instagram") }
    var selectedImageUri by remember { mutableStateOf<Uri?>(null) }
    var showAdDialog by remember { mutableStateOf(false) }
    
    val imagePickerLauncher = rememberLauncherForActivityResult(
        contract = ActivityResultContracts.GetContent()
    ) { uri: Uri? ->
        selectedImageUri = uri
    }
    
    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Crear Post") },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.primaryContainer
                )
            )
        }
    ) { paddingValues ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(paddingValues)
                .padding(16.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp)
        ) {
            // Selector de plataforma
            Row(
                modifier = Modifier.fillMaxWidth(),
                horizontalArrangement = Arrangement.spacedBy(8.dp)
            ) {
                FilterChip(
                    selected = platform == "instagram",
                    onClick = { platform = "instagram" },
                    label = { Text("Instagram") }
                )
                FilterChip(
                    selected = platform == "facebook",
                    onClick = { platform = "facebook" },
                    label = { Text("Facebook") }
                )
            }
            
            // Campo de texto
            OutlinedTextField(
                value = content,
                onValueChange = { content = it },
                label = { Text("Caption") },
                placeholder = { Text("Escribe tu mensaje...") },
                modifier = Modifier
                    .fillMaxWidth()
                    .height(150.dp),
                maxLines = 5
            )
            
            // Botón seleccionar imagen
            Button(
                onClick = { imagePickerLauncher.launch("image/*") },
                modifier = Modifier.fillMaxWidth()
            ) {
                Text(if (selectedImageUri != null) "Cambiar Imagen" else "Seleccionar Imagen")
            }
            
            // Preview de imagen
            selectedImageUri?.let { uri ->
                AsyncImage(
                    model = uri,
                    contentDescription = "Preview",
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(200.dp)
                )
            }
            
            Spacer(modifier = Modifier.weight(1f))
            
            // Créditos disponibles
            Card(
                modifier = Modifier.fillMaxWidth(),
                colors = CardDefaults.cardColors(
                    containerColor = MaterialTheme.colorScheme.secondaryContainer
                )
            ) {
                Row(
                    modifier = Modifier
                        .fillMaxWidth()
                        .padding(16.dp),
                    horizontalArrangement = Arrangement.SpaceBetween,
                    verticalAlignment = Alignment.CenterVertically
                ) {
                    Text("Créditos disponibles:")
                    Text(
                        text = "${uiState.credits}",
                        style = MaterialTheme.typography.headlineSmall
                    )
                }
            }
            
            // Botón publicar
            Button(
                onClick = {
                    if (uiState.credits > 0) {
                        // Publicar directamente
                        viewModel.publishPost(
                            content = content,
                            platform = platform,
                            imageUri = selectedImageUri,
                            context = context,
                            onSuccess = { onNavigateToHome() }
                        )
                    } else {
                        // Mostrar diálogo para ver anuncio
                        showAdDialog = true
                    }
                },
                modifier = Modifier.fillMaxWidth(),
                enabled = !uiState.isLoading && (content.isNotEmpty() || selectedImageUri != null)
            ) {
                if (uiState.isLoading) {
                    CircularProgressIndicator(
                        modifier = Modifier.size(24.dp),
                        color = MaterialTheme.colorScheme.onPrimary
                    )
                } else {
                    Text(if (uiState.credits > 0) "Publicar Ahora" else "Ver Anuncio para Publicar")
                }
            }
            
            // Mensaje de error
            uiState.error?.let { error ->
                Text(
                    text = error,
                    color = MaterialTheme.colorScheme.error,
                    style = MaterialTheme.typography.bodySmall
                )
            }
        }
    }
    
    // Diálogo para ver anuncio
    if (showAdDialog) {
        AlertDialog(
            onDismissRequest = { showAdDialog = false },
            title = { Text("Sin Créditos") },
            text = { Text("Necesitas ver un anuncio para obtener créditos y publicar tu post.") },
            confirmButton = {
                Button(
                    onClick = {
                        showAdDialog = false
                        viewModel.showRewardedAd(
                            context = context,
                            onRewardEarned = {
                                // Crédito agregado, ahora publicar
                                viewModel.publishPost(
                                    content = content,
                                    platform = platform,
                                    imageUri = selectedImageUri,
                                    context = context,
                                    onSuccess = { onNavigateToHome() }
                                )
                            }
                        )
                    }
                ) {
                    Text("Ver Anuncio")
                }
            },
            dismissButton = {
                TextButton(onClick = { showAdDialog = false }) {
                    Text("Cancelar")
                }
            }
        )
    }
}
```

### Archivo: `viewmodel/PostViewModel.kt`

```kotlin
package com.tuempresa.postly.viewmodel

import android.content.Context
import android.net.Uri
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.tuempresa.postly.BuildConfig
import com.tuempresa.postly.admob.AdManager
import com.tuempresa.postly.data.UserPreferences
import com.tuempresa.postly.network.AddCreditRequest
import com.tuempresa.postly.network.RetrofitClient
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import okhttp3.MediaType.Companion.toMediaTypeOrNull
import okhttp3.MultipartBody
import okhttp3.RequestBody.Companion.asRequestBody
import okhttp3.RequestBody.Companion.toRequestBody
import java.io.File

data class PostUiState(
    val isLoading: Boolean = false,
    val credits: Int = 0,
    val error: String? = null,
    val successMessage: String? = null
)

class PostViewModel : ViewModel() {
    
    private val _uiState = MutableStateFlow(PostUiState())
    val uiState: StateFlow<PostUiState> = _uiState.asStateFlow()
    
    private lateinit var adManager: AdManager
    private lateinit var userPreferences: UserPreferences
    
    fun initialize(context: Context) {
        adManager = AdManager(context)
        userPreferences = UserPreferences(context)
        
        // Cargar créditos actuales
        loadCredits()
        
        // Pre-cargar anuncio
        adManager.loadRewardedAd()
    }
    
    private fun loadCredits() {
        viewModelScope.launch {
            try {
                val token = userPreferences.getToken() ?: return@launch
                
                val response = RetrofitClient.apiService.getUserCredits("Bearer $token")
                
                if (response.isSuccessful) {
                    response.body()?.let { creditsResponse ->
                        _uiState.value = _uiState.value.copy(credits = creditsResponse.credits)
                    }
                }
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    error = "Error al cargar créditos: ${e.message}"
                )
            }
        }
    }
    
    fun publishPost(
        content: String,
        platform: String,
        imageUri: Uri?,
        context: Context,
        onSuccess: () -> Unit
    ) {
        viewModelScope.launch {
            _uiState.value = _uiState.value.copy(isLoading = true, error = null)
            
            try {
                val token = userPreferences.getToken() ?: throw Exception("No autenticado")
                
                // 1. Crear post
                val contentPart = content.toRequestBody("text/plain".toMediaTypeOrNull())
                val platformPart = platform.toRequestBody("text/plain".toMediaTypeOrNull())
                
                val imagePart = imageUri?.let { uri ->
                    val file = uriToFile(uri, context)
                    val requestFile = file.asRequestBody("image/*".toMediaTypeOrNull())
                    MultipartBody.Part.createFormData("image", file.name, requestFile)
                }
                
                val createResponse = RetrofitClient.apiService.createPost(
                    token = "Bearer $token",
                    content = contentPart,
                    platform = platformPart,
                    hashtags = null,
                    image = imagePart
                )
                
                if (!createResponse.isSuccessful) {
                    throw Exception("Error al crear post: ${createResponse.code()}")
                }
                
                val postId = createResponse.body()?.post?.id 
                    ?: throw Exception("No se obtuvo ID del post")
                
                // 2. Publicar post
                val publishResponse = RetrofitClient.apiService.publishPost(
                    token = "Bearer $token",
                    postId = postId
                )
                
                if (!publishResponse.isSuccessful) {
                    val errorBody = publishResponse.errorBody()?.string()
                    throw Exception("Error al publicar: $errorBody")
                }
                
                val result = publishResponse.body() 
                    ?: throw Exception("Respuesta vacía del servidor")
                
                // 3. Actualizar créditos
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    credits = result.remaining_credits,
                    successMessage = "¡Post publicado exitosamente!"
                )
                
                onSuccess()
                
            } catch (e: Exception) {
                _uiState.value = _uiState.value.copy(
                    isLoading = false,
                    error = e.message ?: "Error desconocido"
                )
            }
        }
    }
    
    fun showRewardedAd(context: Context, onRewardEarned: () -> Unit) {
        if (!adManager.isAdReady()) {
            _uiState.value = _uiState.value.copy(
                error = "Anuncio no disponible. Intenta nuevamente."
            )
            adManager.loadRewardedAd()
            return
        }
        
        adManager.showRewardedAd(
            activity = context as android.app.Activity,
            onUserEarnedReward = { rewardAmount ->
                // Notificar al backend que se ganó la recompensa
                viewModelScope.launch {
                    try {
                        val token = userPreferences.getToken() ?: return@launch
                        
                        val response = RetrofitClient.apiService.addCredit(
                            token = "Bearer $token",
                            request = AddCreditRequest(
                                ad_unit_id = BuildConfig.REWARDED_AD_UNIT_ID,
                                reward_amount = rewardAmount
                            )
                        )
                        
                        if (response.isSuccessful) {
                            response.body()?.let { creditsResponse ->
                                _uiState.value = _uiState.value.copy(
                                    credits = creditsResponse.credits
                                )
                                onRewardEarned()
                            }
                        }
                    } catch (e: Exception) {
                        _uiState.value = _uiState.value.copy(
                            error = "Error al agregar crédito: ${e.message}"
                        )
                    }
                }
            },
            onAdDismissed = {
                // Anuncio cerrado sin completar
            }
        )
    }
    
    private fun uriToFile(uri: Uri, context: Context): File {
        val inputStream = context.contentResolver.openInputStream(uri)
        val tempFile = File.createTempFile("upload", ".jpg", context.cacheDir)
        tempFile.outputStream().use { outputStream ->
            inputStream?.copyTo(outputStream)
        }
        return tempFile
    }
}
```

### Archivo: `data/UserPreferences.kt`

```kotlin
package com.tuempresa.postly.data

import android.content.Context
import androidx.datastore.core.DataStore
import androidx.datastore.preferences.core.Preferences
import androidx.datastore.preferences.core.edit
import androidx.datastore.preferences.core.stringPreferencesKey
import androidx.datastore.preferences.preferencesDataStore
import kotlinx.coroutines.flow.Flow
import kotlinx.coroutines.flow.first
import kotlinx.coroutines.flow.map

private val Context.dataStore: DataStore<Preferences> by preferencesDataStore(name = "user_prefs")

class UserPreferences(private val context: Context) {
    
    private val TOKEN_KEY = stringPreferencesKey("meta_token")
    private val USER_ID_KEY = stringPreferencesKey("user_id")
    
    suspend fun saveToken(token: String) {
        context.dataStore.edit { preferences ->
            preferences[TOKEN_KEY] = token
        }
    }
    
    suspend fun getToken(): String? {
        return context.dataStore.data.map { preferences ->
            preferences[TOKEN_KEY]
        }.first()
    }
    
    suspend fun clearToken() {
        context.dataStore.edit { preferences ->
            preferences.remove(TOKEN_KEY)
        }
    }
}
```

---

## PARTE 4: CONFIGURACIÓN DE ADMOB

### Paso 1: Crear Cuenta en AdMob

1. Ir a https://admob.google.com/
2. Crear cuenta con Google
3. Registrar aplicación Android
4. Obtener **Application ID** (formato: `ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX`)

### Paso 2: Crear Ad Unit

1. En AdMob Console → Apps → Tu App
2. Clic en "Add ad unit"
3. Seleccionar "Rewarded"
4. Nombre: "Post Publication Reward"
5. Copiar **Ad Unit ID** (formato: `ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX`)

### Paso 3: Configurar IDs en Android

Reemplazar en `build.gradle.kts`:
```kotlin
buildConfigField("String", "ADMOB_APP_ID", "\"ca-app-pub-XXXXXXXXXXXXXXXX~XXXXXXXXXX\"")
buildConfigField("String", "REWARDED_AD_UNIT_ID", "\"ca-app-pub-XXXXXXXXXXXXXXXX/XXXXXXXXXX\"")
```

### Paso 4: IDs de Prueba (Development)

Para testing, usar:
```kotlin
// Test App ID
buildConfigField("String", "ADMOB_APP_ID", "\"ca-app-pub-3940256099942544~3347511713\"")

// Test Rewarded Ad Unit
buildConfigField("String", "REWARDED_AD_UNIT_ID", "\"ca-app-pub-3940256099942544/5224354917\"")
```

---

## PARTE 5: DIAGRAMA DE FLUJO COMPLETO

```
┌─────────────────────────────────────────────────────────────┐
│                     USUARIO EN APP                          │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
          ┌────────────────────────┐
          │  CreatePostScreen      │
          │  - Escribe caption     │
          │  - Selecciona imagen   │
          │  - Presiona "Publicar" │
          └────────────┬───────────┘
                       │
                       ▼
          ┌────────────────────────┐
          │ ¿Tiene créditos > 0?   │
          └────────┬───────────────┘
                   │
         ┌─────────┴─────────┐
         │ SÍ                │ NO
         ▼                   ▼
┌─────────────────┐  ┌──────────────────┐
│ Publicar        │  │ Mostrar diálogo  │
│ directamente    │  │ "Ver anuncio"    │
└────────┬────────┘  └────────┬─────────┘
         │                    │
         │                    ▼
         │           ┌─────────────────┐
         │           │ Usuario acepta  │
         │           │ ver anuncio     │
         │           └────────┬────────┘
         │                    │
         │                    ▼
         │           ┌─────────────────┐
         │           │ AdMob muestra   │
         │           │ anuncio         │
         │           └────────┬────────┘
         │                    │
         │                    ▼
         │           ┌─────────────────┐
         │           │ Usuario ve      │
         │           │ completo (30s)  │
         │           └────────┬────────┘
         │                    │
         │                    ▼
         │           ┌─────────────────┐
         │           │ POST /credits/  │
         │           │ add             │
         │           │ +1 crédito      │
         │           └────────┬────────┘
         │                    │
         └────────────────────┘
                      │
                      ▼
         ┌────────────────────────┐
         │ POST /posts/create     │
         │ (subir imagen)         │
         └────────────┬───────────┘
                      │
                      ▼
         ┌────────────────────────┐
         │ POST /posts/:id/       │
         │ publish                │
         │ - Verificar créditos   │
         │ - Publicar en Meta     │
         │ - Consumir crédito     │
         └────────────┬───────────┘
                      │
                      ▼
         ┌────────────────────────┐
         │ Meta Graph API         │
         │ - Crear media          │
         │ - Publicar post        │
         └────────────┬───────────┘
                      │
                      ▼
         ┌────────────────────────┐
         │ Respuesta exitosa      │
         │ - URL del post         │
         │ - Créditos restantes   │
         └────────────────────────┘
```

---

## PARTE 6: MONETIZACIÓN - ESTRATEGIA

### Modelo de Negocio

**Freemium con Ads:**
- 1 anuncio visto = 1 publicación
- Opción premium: $4.99/mes → Publicaciones ilimitadas sin ads

**Ingresos Estimados:**

```
Usuarios activos: 1,000
Publicaciones/mes: 5 por usuario
Total ads/mes: 5,000

CPM AdMob promedio: $2.00
Ingresos/mes = (5,000 / 1,000) × $2.00 = $10.00

Con 10,000 usuarios = $100/mes
Con 100,000 usuarios = $1,000/mes
```

**Mejoras para Aumentar Ingresos:**

1. **Banner Ads** en pantalla principal (adicionales)
2. **Interstitial Ads** entre secciones
3. **Plan Premium** ($4.99/mes):
   - Sin anuncios
   - Publicaciones ilimitadas
   - Programación avanzada
   - Analytics
4. **Plan Business** ($19.99/mes):
   - Multi-cuentas
   - Equipo colaborativo
   - API access

---

## PARTE 7: TESTING Y DEBUGGING

### Checklist de Testing

#### Backend
```bash
# 1. Health check
curl https://marketing-4778.onrender.com/health

# 2. Crear post (requiere token)
curl -X POST https://marketing-4778.onrender.com/api/posts/create \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -F "content=Test post" \
  -F "platform=instagram"

# 3. Verificar créditos
curl https://marketing-4778.onrender.com/api/user/credits \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### Android
1. Ejecutar app en emulador
2. Hacer login con Meta
3. Ir a Crear Post
4. Verificar que muestre créditos
5. Intentar publicar sin créditos → debe mostrar diálogo
6. Ver anuncio de prueba → debe agregar crédito
7. Publicar post → debe funcionar

### Logs Importantes

**Android Logcat:**
```
adb logcat | grep -E "AdMob|Retrofit|PostViewModel"
```

**Backend (Render.com):**
- Dashboard → Logs
- Filtrar por "ERROR" o "PUBLISH"

---

## CONCLUSIÓN Y PRÓXIMOS PASOS

### Implementar en este orden:

1. ✅ **Backend (1-2 días)**
   - Implementar routes/posts.js
   - Implementar routes/credits.js
   - Deploy en Render.com
   - Testing con Postman

2. ✅ **Android - Networking (1 día)**
   - Configurar Retrofit
   - Implementar ApiService
   - Testing de conexión

3. ✅ **Android - AdMob (1 día)**
   - Configurar AdMob SDK
   - Implementar AdManager
   - Testing con test ads

4. ✅ **Android - UI (2 días)**
   - Implementar CreatePostScreen
   - Implementar PostViewModel
   - Integrar todo el flujo

5. ✅ **Testing E2E (1 día)**
   - Probar flujo completo
   - Fix bugs
   - Optimizaciones

6. ✅ **Deploy (1 día)**
   - APK firmado
   - Google Play Console
   - Lanzamiento beta

**TOTAL: 7-8 días de desarrollo**

---

**Documento generado para implementación técnica completa**  
**Versión:** 1.0  
**Última actualización:** 28/04/2026
