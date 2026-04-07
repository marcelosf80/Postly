const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const ai = require('../services/ai');
const store = require('../data/store');

const router = express.Router();

// All routes require auth
router.use(authMiddleware);

// POST /api/ai/caption — Generate caption
router.post('/caption', async (req, res) => {
    try {
        const { description, tone, platform, language, imageBase64 } = req.body;

        if (!description && !imageBase64) {
            return res.status(400).json({ error: 'Se requiere una descripción o imagen del contenido.' });
        }

        const userProfile = store.users.findById(req.user.id);
        const caption = await ai.generateCaption(description || 'Generar caption para esta imagen', { tone, platform, language, userProfile, imageBase64 });
        res.json({ caption });
    } catch (error) {
        console.error('[AI] Error generando caption:', error.message);
        res.status(500).json({ error: error.message || 'Error al generar el caption.' });
    }
});

// POST /api/ai/hashtags — Generate hashtags
router.post('/hashtags', async (req, res) => {
    try {
        const { description, count, platform, language } = req.body;

        if (!description) {
            return res.status(400).json({ error: 'Se requiere una descripción.' });
        }

        const userProfile = store.users.findById(req.user.id);
        const hashtags = await ai.generateHashtags(description, { count, platform, language, userProfile });
        res.json({ hashtags });
    } catch (error) {
        console.error('[AI] Error generando hashtags:', error.message);
        res.status(500).json({ error: error.message || 'Error al generar hashtags.' });
    }
});

// POST /api/ai/ideas — Generate content ideas
router.post('/ideas', async (req, res) => {
    try {
        const { industry, count, platform, language } = req.body;

        if (!industry) {
            return res.status(400).json({ error: 'Se requiere el rubro/industria.' });
        }

        const userProfile = store.users.findById(req.user.id);
        const ideas = await ai.generateIdeas(industry, { count, platform, language, userProfile });
        res.json({ ideas });
    } catch (error) {
        console.error('[AI] Error generando ideas:', error.message);
        res.status(500).json({ error: error.message || 'Error al generar ideas.' });
    }
});

// POST /api/ai/improve — Improve existing text
router.post('/improve', async (req, res) => {
    try {
        const { text, goal, platform } = req.body;

        if (!text) {
            return res.status(400).json({ error: 'Se requiere el texto a mejorar.' });
        }

        const userProfile = store.users.findById(req.user.id);
        const improved = await ai.improveText(text, { goal, platform, userProfile });
        res.json({ improved });
    } catch (error) {
        console.error('[AI] Error mejorando texto:', error.message);
        res.status(500).json({ error: error.message || 'Error al mejorar el texto.' });
    }
});

module.exports = router;
