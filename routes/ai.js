const express = require('express');
const { authMiddleware } = require('../middleware/auth');
const ai = require('../services/ai-providers');
const store = require('../data/store');

const router = express.Router();

router.use(authMiddleware);

router.get('/providers', (req, res) => {
    try {
        const status = ai.getProviderStatus();
        res.json({ providers: status });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/caption', async (req, res) => {
    try {
        const { description, imageBase64, provider } = req.body;
        const result = await ai.generateCaption(description, { imageBase64, provider });
        res.json({ caption: result });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/flyer', async (req, res) => {
    try {
        const { data, images, provider } = req.body;
        const result = await ai.generateFlyer(data, { images, provider });
        res.json({ concept: result });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/hashtags', async (req, res) => {
    try {
        const { description, provider } = req.body;
        const result = await ai.generateHashtags(description, { provider });
        res.json({ hashtags: result });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/ideas', async (req, res) => {
    try {
        const { industry, provider } = req.body;
        const result = await ai.generateIdeas(industry, { provider });
        res.json({ ideas: result });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/generate-image', async (req, res) => {
    try {
        const { prompt } = req.body;
        const imageBase64 = await ai.generateImage(prompt);
        res.json({ imageBase64 });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

router.post('/improve', async (req, res) => {
    try {
        const { text, provider } = req.body;
        const result = await ai.improveText(text, { provider });
        res.json({ improved: result });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;
