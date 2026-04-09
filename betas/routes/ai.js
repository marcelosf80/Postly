const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const ai = require('../services/ai-providers'); // Nuevo servicio multi-provider
const store = require('../data/store');

const router = express.Router();

// All routes require auth
router.use(authMiddleware);

// GET /api/ai/providers — Get available AI providers status
router.get('/providers', (req, res) => {
    try {
        const status = ai.getProviderStatus();
        res.json({ providers: status });
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener estado de providers.' });
    }
});

// POST /api/ai/caption — Generate caption
router.post('/caption', async (req, res) => {
    try {
        const { description, tone, platform, language, imageBase64, provider } = req.body;

        if (!description && !imageBase64) {
            return res.status(400).json({ error: 'Se requiere una descripción o imagen del contenido.' });
        }

        const userProfile = store.users.findById(req.user.id);
        const caption = await ai.generateCaption(
            description || 'Generar caption para esta imagen', 
            { tone, platform, language, userProfile, imageBase64, provider }
        );
        res.json({ caption });
    } catch (error) {
        console.error('[AI] Error generando caption:', error.message);
        res.status(500).json({ error: error.message || 'Error al generar el caption.' });
    }
});

// POST /api/ai/hashtags — Generate hashtags
router.post('/hashtags', async (req, res) => {
    try {
        const { description, count, platform, language, provider } = req.body;

        if (!description) {
            return res.status(400).json({ error: 'Se requiere una descripción.' });
        }

        const userProfile = store.users.findById(req.user.id);
        const hashtags = await ai.generateHashtags(
            description, 
            { count, platform, language, userProfile, provider }
        );
        res.json({ hashtags });
    } catch (error) {
        console.error('[AI] Error generando hashtags:', error.message);
        res.status(500).json({ error: error.message || 'Error al generar hashtags.' });
    }
});

// POST /api/ai/ideas — Generate content ideas
router.post('/ideas', async (req, res) => {
    try {
        const { industry, count, platform, language, provider } = req.body;

        if (!industry) {
            return res.status(400).json({ error: 'Se requiere el rubro/industria.' });
        }

        const userProfile = store.users.findById(req.user.id);
        const ideas = await ai.generateIdeas(
            industry, 
            { count, platform, language, userProfile, provider }
        );
        res.json({ ideas });
    } catch (error) {
        console.error('[AI] Error generando ideas:', error.message);
        res.status(500).json({ error: error.message || 'Error al generar ideas.' });
    }
});

// POST /api/ai/improve — Improve existing text
router.post('/improve', async (req, res) => {
    try {
        const { text, goal, platform, provider } = req.body;

        if (!text) {
            return res.status(400).json({ error: 'Se requiere el texto a mejorar.' });
        }

        const userProfile = store.users.findById(req.user.id);
        const improved = await ai.improveText(
            text, 
            { goal, platform, userProfile, provider }
        );
        res.json({ improved });
    } catch (error) {
        console.error('[AI] Error mejorando texto:', error.message);
        res.status(500).json({ error: error.message || 'Error al mejorar el texto.' });
    }
});

// POST /api/ai/analyze-image — Analyze image for content suggestions
router.post('/analyze-image', async (req, res) => {
    try {
        const { imageBase64, provider } = req.body;

        if (!imageBase64) {
            return res.status(400).json({ error: 'Se requiere una imagen.' });
        }

        const analysis = await ai.analyzeImage(imageBase64, { provider });
        res.json({ analysis });
    } catch (error) {
        console.error('[AI] Error analizando imagen:', error.message);
        res.status(500).json({ error: error.message || 'Error al analizar la imagen.' });
    }
});

module.exports = router;
