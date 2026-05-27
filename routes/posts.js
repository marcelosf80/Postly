// routes/posts.js — Posts CRUD & Publishing Routes
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { posts, users } = require('../data/store');
const { authMiddleware } = require('../middleware/auth');
const InstagramAPI = require('../instagram_api');
const FacebookAPI = require('../facebook_api');

const router = express.Router();

// Configure multer for image uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, path.join(__dirname, '..', 'uploads'));
    },
    filename: (req, file, cb) => {
        const uniqueName = `${Date.now()}-${Math.random().toString(36).substr(2, 8)}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage,
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
    fileFilter: (req, file, cb) => {
        const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.gif'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowed.includes(ext)) {
            cb(null, true);
        } else {
            cb(new Error('Solo se permiten imágenes (jpg, png, webp, gif)'));
        }
    }
});

// All routes require auth
router.use(authMiddleware);

// GET /api/posts — List user's posts
router.get('/', (req, res) => {
    try {
        const { status, platform, page = 1, limit = 20 } = req.query;
        let userPosts = posts.findAll({ user_id: req.user.id });

        // Filter by status
        if (status) {
            userPosts = userPosts.filter(p => p.status === status);
        }
        // Filter by platform
        if (platform) {
            userPosts = userPosts.filter(p => p.platform === platform);
        }

        // Sort by newest first
        userPosts.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        // Paginate
        const start = (parseInt(page) - 1) * parseInt(limit);
        const paginated = userPosts.slice(start, start + parseInt(limit));

        res.json({
            posts: paginated,
            total: userPosts.length,
            page: parseInt(page),
            totalPages: Math.ceil(userPosts.length / parseInt(limit))
        });
    } catch (error) {
        console.error('[POSTS] Error listando posts:', error);
        res.status(500).json({ error: 'Error al obtener los posts.' });
    }
});

// GET /api/posts/stats — Get post statistics
router.get('/stats', (req, res) => {
    try {
        const userPosts = posts.findAll({ user_id: req.user.id });
        const now = new Date();
        const thisMonth = userPosts.filter(p => {
            const d = new Date(p.created_at);
            return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
        });

        res.json({
            total: userPosts.length,
            this_month: thisMonth.length,
            published: userPosts.filter(p => p.status === 'published').length,
            scheduled: userPosts.filter(p => p.status === 'scheduled').length,
            drafts: userPosts.filter(p => p.status === 'draft').length,
            failed: userPosts.filter(p => p.status === 'failed').length
        });
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener estadísticas.' });
    }
});

// GET /api/posts/:id — Get single post
router.get('/:id', (req, res) => {
    const post = posts.findById(req.params.id);
    if (!post || post.user_id !== req.user.id) {
        return res.status(404).json({ error: 'Post no encontrado.' });
    }
    res.json({ post });
});

// Helper to save base64 image
function saveBase64Image(base64String) {
    try {
        // More flexible regex to match any data URI
        const matches = base64String.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        if (!matches || matches.length !== 3) return null;
        
        // Get extension from mime type (e.g. image/jpeg -> jpeg)
        let extension = matches[1].split('/')[1] || 'png';
        if (extension.includes(';')) extension = extension.split(';')[0];
        
        const data = Buffer.from(matches[2], 'base64');
        const filename = `${Date.now()}-${Math.random().toString(36).substr(2, 8)}.${extension}`;
        const relativePath = `uploads/${filename}`;
        const absPath = path.join(__dirname, '..', relativePath);
        
        fs.writeFileSync(absPath, data);
        return `/${relativePath}`;
    } catch (e) {
        console.error('[POSTS] Error saving base64 image:', e);
        return null;
    }
}

// Helper to execute publishing logic (reusable)
async function executePublishing(post, user) {
    console.log(`[PUBLISH] Iniciando publicación para post ${post.id} (${post.platform})`);
    const hasIGCredentials = user && user.ig_page_id && user.ig_access_token;
    const hasFBCredentials = user && user.fb_page_id && user.fb_access_token;

    let instagramId = '';
    let facebookId = '';

    // --- Flow for Instagram (or Both) ---
    if (post.platform === 'instagram' || post.platform === 'both') {
        if (!hasIGCredentials) {
            throw new Error('Faltan credenciales de Instagram. Ve a Ajustes y conecta tu cuenta.');
        }
        try {
            const api = new InstagramAPI(user.ig_page_id, user.ig_access_token);
            const relativePath = post.image_path ? (post.image_path.startsWith('/') ? post.image_path.substring(1) : post.image_path) : '';
            
            if (!relativePath) {
                throw new Error('Instagram requiere que incluyas una imagen en tu post.');
            }
            
            const absImagePath = path.join(__dirname, '..', relativePath);
            if (!fs.existsSync(absImagePath)) {
                throw new Error('No se encontró el archivo de imagen en el servidor.');
            }
            
            const mediaType = post.aspect_ratio === 'story' ? 'STORIES' : 'IMAGE';
            const captionText = post.content + (post.hashtags ? '\n\n' + post.hashtags : '');
            console.log(`[PUBLISH] Publicando en Instagram (${mediaType})...`);
            instagramId = await api.processAndPublish(absImagePath, captionText, mediaType);
        } catch (err) {
            console.error('[PUBLISH] Error en Instagram:', err.message);
            throw new Error(`Error de Meta API (Instagram): ${err.message}`);
        }
    }

    // --- Flow for Facebook (or Both) ---
    if (post.platform === 'facebook' || post.platform === 'both') {
        if (!hasFBCredentials) {
            if (post.platform === 'facebook') {
                throw new Error('Faltan credenciales de Facebook. Ve a Ajustes y conecta tu cuenta.');
            }
            // Si es 'both' y ya publicó en IG, podemos omitir FB o fallar. Para 'both' fallamos si falta una.
            throw new Error('Faltan credenciales de Facebook para publicar en ambas plataformas.');
        }

        try {
            const uploader = new InstagramAPI(user.ig_page_id || 'no-id', user.ig_access_token || 'no-token');
            const fbApi = new FacebookAPI(user.fb_page_id, user.fb_access_token);
            const fullMessage = post.content + (post.hashtags ? '\n\n' + post.hashtags : '');

            if (post.image_path) {
                const relativePath = post.image_path.startsWith('/') ? post.image_path.substring(1) : post.image_path;
                const absImagePath = path.join(__dirname, '..', relativePath);
                
                if (fs.existsSync(absImagePath)) {
                    const publicUrl = await uploader.uploadLocalImage(absImagePath);
                    facebookId = await fbApi.publishPhoto(publicUrl, fullMessage);
                } else {
                    throw new Error('No se encontró el archivo de imagen en el servidor.');
                }
            } else {
                facebookId = await fbApi.publishText(fullMessage);
            }
        } catch (err) {
            console.error('[PUBLISH] Error en Facebook:', err.message);
            throw new Error(`Error de Meta API (Facebook): ${err.message}`);
        }
    }

    if (!instagramId && !facebookId) {
        throw new Error('No se pudo publicar. Faltan credenciales o fallaron ambas plataformas.');
    }

    return { 
        externalId: instagramId || facebookId,
        instagramId,
        facebookId
    };
}

// POST /api/posts — Create post
router.post('/', upload.single('image'), async (req, res) => {
    console.log('[POSTS] Creando post. Body keys:', Object.keys(req.body));
    try {
        const { content, platform, status, scheduled_at, image_base64, local_image_uri } = req.body;

        if (!content && !req.file && !image_base64) {
            return res.status(400).json({ error: 'Se requiere contenido o imagen.' });
        }

        let imagePath = '';
        if (req.file) {
            imagePath = `/uploads/${req.file.filename}`;
        } else if (image_base64) {
            imagePath = saveBase64Image(image_base64) || '';
        }

        const post = posts.create({
            user_id: req.user.id,
            content: content || '',
            platform: platform || 'instagram',
            image_path: imagePath,
            status: status || 'draft',
            scheduled_at: scheduled_at || null,
            published_at: null,
            external_post_id: null,
            hashtags: req.body.hashtags || '',
            aspect_ratio: req.body.aspect_ratio || 'feed',
            local_image_uri: local_image_uri || null
        });

        // AUTO-PUBLISH if status is 'published'
        if (post.status === 'published') {
            const user = users.findById(req.user.id);
            try {
                const pubResult = await executePublishing(post, user);
                posts.update(post.id, {
                    published_at: new Date().toISOString(),
                    external_post_id: pubResult.externalId
                });
            } catch (pubErr) {
                console.error('[POSTS] Auto-publish failed:', pubErr.message);
                posts.update(post.id, { status: 'failed' });
                // We propagate the error so the frontend knows it failed
                return res.status(500).json({ error: `Error publicando automáticamente: ${pubErr.message}` });
            }
        }

        res.status(201).json({ message: 'Post creado.', post: posts.findById(post.id) });
    } catch (error) {
        console.error('[POSTS] Error creando post:', error);
        res.status(500).json({ error: 'Error al crear el post.' });
    }
});

// PUT /api/posts/:id — Update post
router.put('/:id', upload.single('image'), (req, res) => {
    try {
        const existing = posts.findById(req.params.id);
        if (!existing || existing.user_id !== req.user.id) {
            return res.status(404).json({ error: 'Post no encontrado.' });
        }

        if (existing.status === 'published') {
            return res.status(400).json({ error: 'No se puede editar un post ya publicado.' });
        }

        const updates = {};
        if (req.body.content !== undefined) updates.content = req.body.content;
        if (req.body.platform !== undefined) updates.platform = req.body.platform;
        if (req.body.status !== undefined) updates.status = req.body.status;
        if (req.body.scheduled_at !== undefined) updates.scheduled_at = req.body.scheduled_at;
        if (req.body.hashtags !== undefined) updates.hashtags = req.body.hashtags;
        if (req.body.aspect_ratio !== undefined) updates.aspect_ratio = req.body.aspect_ratio;
        if (req.file) updates.image_path = `/uploads/${req.file.filename}`;

        const updated = posts.update(req.params.id, updates);
        res.json({ message: 'Post actualizado.', post: updated });
    } catch (error) {
        console.error('[POSTS] Error actualizando post:', error);
        res.status(500).json({ error: 'Error al actualizar el post.' });
    }
});

// DELETE /api/posts/:id — Delete post
router.delete('/:id', (req, res) => {
    try {
        const existing = posts.findById(req.params.id);
        if (!existing || existing.user_id !== req.user.id) {
            return res.status(404).json({ error: 'Post no encontrado.' });
        }

        // Delete physical image file if exists
        if (existing.image_path) {
            const absolutePath = path.join(__dirname, '..', existing.image_path.startsWith('/') ? existing.image_path.substring(1) : existing.image_path);
            if (fs.existsSync(absolutePath)) {
                fs.unlinkSync(absolutePath);
                console.log(`[STORAGE] Imagen eliminada: ${absolutePath}`);
            }
        }

        posts.delete(req.params.id);
        res.json({ message: 'Post eliminado.' });
    } catch (error) {
        console.error('[STORAGE] Error al eliminar post:', error);
        res.status(500).json({ error: 'Error al eliminar el post.' });
    }
});

// POST /api/posts/:id/publish — Publish immediately
router.post('/:id/publish', async (req, res) => {
    try {
        const post = posts.findById(req.params.id);
        if (!post || post.user_id !== req.user.id) {
            return res.status(404).json({ error: 'Post no encontrado.' });
        }

        if (post.status === 'published') {
            return res.status(400).json({ error: 'Este post ya fue publicado.' });
        }

        // Check if user has configured IG credentials
        const user = users.findById(req.user.id);
        
        console.log(`[PUBLISH] Usuario ${req.user.id} (${user ? user.email : 'No encontrado'}) intentando publicar post ${post.id}`);

        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado en la base de datos.' });
        }

        const hasIGCredentials = user && user.ig_page_id && user.ig_access_token;
        const hasFBCredentials = user && user.fb_page_id && user.fb_access_token;

        if (post.platform === 'instagram') {
            if (!hasIGCredentials) {
                console.log(`[PUBLISH] Post ${post.id} falló (Faltan credenciales IG)`);
                return res.status(403).json({ error: 'Configura tu cuenta de Instagram en Ajustes para publicar.' });
            }

            console.log(`[PUBLISH] Intentando publicar post ${post.id} en Instagram real...`);
            try {
                const api = new InstagramAPI(user.ig_page_id, user.ig_access_token);
                if (!post.image_path) {
                    throw new Error('Instagram requiere una imagen para publicar.');
                }
                const relativePath = post.image_path.startsWith('/') ? post.image_path.substring(1) : post.image_path;
                const absImagePath = path.join(__dirname, '..', relativePath);
                
                if (!fs.existsSync(absImagePath)) {
                    throw new Error('Archivo de imagen no encontrado en el servidor.');
                }

                const mediaType = post.aspect_ratio === 'story' ? 'STORIES' : 'IMAGE';
                const captionText = post.content + (post.hashtags ? '\n\n' + post.hashtags : '');
                const externalId = await api.processAndPublish(absImagePath, captionText, mediaType);
                
                const updated = posts.update(req.params.id, {
                    status: 'published',
                    published_at: new Date().toISOString(),
                    external_post_id: externalId
                });


                return res.json({ message: '¡Post publicado exitosamente en Instagram!', post: updated });
                
            } catch (err) {
                console.error('[PUBLISH] Error en Instagram:', err.message);
                return res.status(500).json({ error: `Error de Meta API (Instagram): ${err.message}` });
            }
        } 
        else if (post.platform === 'facebook') {
            if (!hasFBCredentials) {
                 console.log(`[PUBLISH] Post ${post.id} falló (Faltan credenciales FB)`);
                 return res.status(403).json({ error: 'Configura tu cuenta de Facebook en Ajustes para publicar.' });
            }

            console.log(`[PUBLISH] Intentando publicar post ${post.id} en Facebook real...`);
            try {
                const igHelper = new InstagramAPI(user.ig_page_id, user.ig_access_token);
                const fbApi = new FacebookAPI(user.fb_page_id, user.fb_access_token);
                
                const fullMessage = post.content + (post.hashtags ? '\n\n' + post.hashtags : '');
                let externalId = '';

                if (post.image_path) {
                    const relativePath = post.image_path.startsWith('/') ? post.image_path.substring(1) : post.image_path;
                    const absImagePath = path.join(__dirname, '..', relativePath);
                    const publicUrl = await igHelper.uploadLocalImage(absImagePath);
                    externalId = await fbApi.publishPhoto(publicUrl, fullMessage);
                } else {
                    externalId = await fbApi.publishText(fullMessage);
                }

                const updated = posts.update(req.params.id, {
                    status: 'published',
                    published_at: new Date().toISOString(),
                    external_post_id: externalId
                });


                return res.json({ message: '¡Post publicado exitosamente en Facebook!', post: updated });

            } catch (err) {
                console.error('[PUBLISH] Error en Facebook:', err.message);
                return res.status(500).json({ error: `Error de Meta API (Facebook): ${err.message}` });
            }
        }
        else if (post.platform === 'both') {
            if (!hasIGCredentials && !hasFBCredentials) {
                console.log(`[PUBLISH] Post ${post.id} falló (Faltan credenciales IG y FB)`);
                return res.status(403).json({ error: 'Configura tus cuentas de Instagram y Facebook en Ajustes para publicar.' });
            }

            console.log(`[PUBLISH] Intentando publicar post ${post.id} en AMBAS plataformas...`);
            try {
                const result = await executePublishing(post, user);
                
                const updated = posts.update(req.params.id, {
                    status: 'published',
                    published_at: new Date().toISOString(),
                    external_post_id: result.externalId,
                    instagram_post_id: result.instagramId || '',
                    facebook_post_id: result.facebookId || ''
                });


                const platforms = [];
                if (result.instagramId) platforms.push('Instagram');
                if (result.facebookId) platforms.push('Facebook');
                return res.json({ message: `¡Post publicado exitosamente en ${platforms.join(' y ')}!`, post: updated });

            } catch (err) {
                console.error('[PUBLISH] Error publicando en ambas:', err.message);
                return res.status(500).json({ error: `Error de Meta API: ${err.message}` });
            }
        }

        // Si llega hasta aquí, hubo algún fallo lógico
        return res.status(500).json({ error: 'No se pudo publicar en la plataforma seleccionada.' });
    } catch (error) {
        console.error('[POSTS] Error publicando post:', error);
        res.status(500).json({ error: 'Error al publicar el post.' });
    }
});

// POST /api/posts/:id/schedule — Schedule post
router.post('/:id/schedule', (req, res) => {
    try {
        const { scheduled_at } = req.body;
        if (!scheduled_at) {
            return res.status(400).json({ error: 'Se requiere la fecha de programación.' });
        }

        const scheduledDate = new Date(scheduled_at);
        if (scheduledDate <= new Date()) {
            return res.status(400).json({ error: 'La fecha debe ser en el futuro.' });
        }

        const post = posts.findById(req.params.id);
        if (!post || post.user_id !== req.user.id) {
            return res.status(404).json({ error: 'Post no encontrado.' });
        }

        const updated = posts.update(req.params.id, {
            status: 'scheduled',
            scheduled_at: scheduledDate.toISOString()
        });

        res.json({ message: 'Post programado.', post: updated });
    } catch (error) {
        res.status(500).json({ error: 'Error al programar el post.' });
    }
});

module.exports = router;
