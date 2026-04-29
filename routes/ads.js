// routes/ads.js — AdMob Reward Verification
const express = require('express');
const router = express.Router();
const { users } = require('../data/store');
const { authMiddleware } = require('../middleware/auth');

/**
 * POST /api/ads/verify-reward
 * Activa la capacidad de publicar tras ver un anuncio recompensado.
 * No es un banco de créditos, es un activador 1-a-1.
 */
router.post('/verify-reward', authMiddleware, async (req, res) => {
    try {
        const userId = req.user.id;
        const { ad_unit_id } = req.body;

        // Log de seguridad
        console.log(`[ADS] Intento de activación de recompensa para usuario ${userId}. Unit: ${ad_unit_id || 'N/A'}`);

        const user = users.findById(userId);
        if (!user) {
            return res.status(404).json({ error: 'Usuario no encontrado.' });
        }

        // Incrementamos posts_remaining para autorizar la publicación inmediata
        const currentPosts = user.posts_remaining || 0;
        const newBalance = currentPosts + 1;

        users.update(userId, { 
            posts_remaining: newBalance 
        });

        console.log(`[ADS] ✅ Recompensa activada para ${user.email}. Nuevas publicaciones disponibles: ${newBalance}`);

        res.json({ 
            success: true, 
            message: 'Publicación autorizada.',
            posts_remaining: newBalance 
        });

    } catch (error) {
        console.error('[ADS] Error en verify-reward:', error.message);
        res.status(500).json({ error: 'Error interno al procesar la recompensa.' });
    }
});

module.exports = router;
