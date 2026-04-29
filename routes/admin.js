// routes/admin.js — Administrative API Routes
const express = require('express');
const { users, posts, payments } = require('../data/store');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

const router = express.Router();

// Apply both middlewares to all admin routes
router.use(authMiddleware);
router.use(adminMiddleware);

// GET /api/admin/stats — System-wide statistics
router.get('/stats', (req, res) => {
    try {
        const allUsers = users.findAll();
        const allPosts = posts.findAll();
        
        // Basic stats
        res.json({
            stats: {
                totalUsers: allUsers.length,
                totalPosts: allPosts.length,
                publishedPosts: allPosts.filter(p => p.status === 'published').length,
                activeUsers: allUsers.filter(u => u.subscription_status === 'active').length,
                trialUsers: allUsers.filter(u => u.subscription_status === 'trial').length,
                planDistribution: {
                    free: allUsers.filter(u => u.plan === 'free').length,
                    pro: allUsers.filter(u => u.plan === 'pro').length,
                    gold: allUsers.filter(u => u.plan === 'gold').length
                }
            }
        });
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener estadísticas globales.' });
    }
});

// GET /api/admin/users — List all users with filtering
router.get('/users', (req, res) => {
    try {
        const { search, plan } = req.query;
        let allUsers = users.findAll();

        if (search) {
            const lowSearch = search.toLowerCase();
            allUsers = allUsers.filter(u => 
                (u.name && u.name.toLowerCase().includes(lowSearch)) || 
                u.email.toLowerCase().includes(lowSearch)
            );
        }

        if (plan) {
            allUsers = allUsers.filter(u => u.plan === plan);
        }

        // Sort by newest first
        allUsers.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        // Sanitize output (don't send hashes or tokens)
        const safeUsers = allUsers.map(u => {
            const { password_hash, reset_token, reset_token_expires, ...safe } = u;
            return safe;
        });

        res.json({ users: safeUsers });
    } catch (error) {
        res.status(500).json({ error: 'Error al listar usuarios.' });
    }
});

// PUT /api/admin/users/:id — Update user properties (Admin only)
router.put('/users/:id', (req, res) => {
    try {
        const targetId = req.params.id;
        const updates = req.body;

        // Restricted fields that only admin can change
        const allowedUpdates = ['plan', 'posts_remaining', 'is_admin', 'subscription_status'];
        const filteredUpdates = {};
        
        Object.keys(updates).forEach(key => {
            if (allowedUpdates.includes(key)) {
                filteredUpdates[key] = updates[key];
            }
        });

        const updatedUser = users.update(targetId, filteredUpdates);
        if (!updatedUser) return res.status(404).json({ error: 'Usuario no encontrado.' });

        res.json({ message: 'Usuario actualizado correctamente.', user: updatedUser });
    } catch (error) {
        res.status(500).json({ error: 'Error al actualizar usuario.' });
    }
});

// DELETE /api/admin/users/:id — Delete user
router.delete('/users/:id', (req, res) => {
    try {
        if (req.params.id === req.user.id) {
            return res.status(400).json({ error: 'No puedes eliminarte a ti mismo.' });
        }

        const success = users.delete(req.params.id);
        if (!success) return res.status(404).json({ error: 'Usuario no encontrado.' });

        res.json({ message: 'Usuario eliminado correctamente.' });
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar usuario.' });
    }
});

module.exports = router;
