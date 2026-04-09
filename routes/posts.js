// routes/posts.js — Posts CRUD & Publishing Routes
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { posts, users } = require('../data/store');
const { authMiddleware } = require('../middleware/auth');
const InstagramAPI = require('../instagram_api');

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

// POST /api/posts — Create post
router.post('/', upload.single('image'), (req, res) => {
    try {
        const { content, platform, status, scheduled_at } = req.body;

        if (!content && !req.file) {
            return res.status(400).json({ error: 'Se requiere contenido o imagen.' });
        }

        const post = posts.create({
            user_id: req.user.id,
            content: content || '',
            platform: platform || 'instagram',
            image_path: req.file ? `/uploads/${req.file.filename}` : '',
            status: status || 'draft',
            scheduled_at: scheduled_at || null,
            published_at: null,
            external_post_id: null,
            hashtags: req.body.hashtags || ''
        });

        res.status(201).json({ message: 'Post creado.', post });
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

        posts.delete(req.params.id);
        res.json({ message: 'Post eliminado.' });
    } catch (error) {
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
        
        if (user.posts_remaining <= 0 && !user.is_admin) {
            return res.status(403).json({ error: 'No te quedan publicaciones disponibles. Adquiere un nuevo plan para continuar.' });
        }

        const hasIGCredentials = user && user.ig_page_id && user.ig_access_token;

        if (hasIGCredentials && post.image_path) {
            console.log(`[PUBLISH] Intentando publicar post ${post.id} en Instagram real...`);
            
            try {
                const api = new InstagramAPI(user.ig_page_id, user.ig_access_token);
                
                // Get absolute local path to image
                // post.image_path is like '/uploads/filename.jpg'
                const relativePath = post.image_path.startsWith('/') ? post.image_path.substring(1) : post.image_path;
                const absImagePath = path.join(__dirname, '..', relativePath);
                
                if (!fs.existsSync(absImagePath)) {
                    throw new Error('No se encontró el archivo físico de la imagen en el servidor.');
                }

                // Execute real publishing flow
                const externalId = await api.processAndPublish(absImagePath, post.content + (post.hashtags ? '\n\n' + post.hashtags : ''));
                
                const updated = posts.update(req.params.id, {
                    status: 'published',
                    published_at: new Date().toISOString(),
                    external_post_id: externalId
                });

                if (!user.is_admin) {
                    users.update(user.id, { posts_remaining: user.posts_remaining - 1 });
                }

                return res.json({ message: '¡Post publicado exitosamente en Instagram!', post: updated });
                
            } catch (err) {
                console.error('[PUBLISH] Falló la publicación real:', err.message);
                return res.status(500).json({ 
                    error: `Meta API Error: ${err.message}`,
                    details: 'Asegúrate de que tu Page ID y Token sean correctos y tengan permisos de publicación.'
                });
            }
        }

        // Fallback or simulation if no credentials
        const updated = posts.update(req.params.id, {
            status: 'published',
            published_at: new Date().toISOString()
        });

        if (!user.is_admin) {
            users.update(user.id, { posts_remaining: user.posts_remaining - 1 });
        }

        res.json({ message: 'Post publicado (Simulado). Configura tus tokens en Ajustes para publicar realmente.', post: updated });
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
