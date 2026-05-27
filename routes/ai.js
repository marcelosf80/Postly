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
        const concept = await ai.generateFlyer(data, { images, provider });
        
        // Extraer prompt para imagen usando regex flexible
        let prompt = "";
        const promptMatch = concept.match(/###\s*🖼️\s*PROMPT[^\n]*\n([\s\S]*?)(?:###|$)/i);
        if (promptMatch && promptMatch[1]) {
            prompt = promptMatch[1].trim();
        } else {
            // Intento alternativo sin emoji por si el LLM no lo puso
            const altMatch = concept.match(/PROMPT[^\n]*\n([\s\S]*?)(?:###|$)/i);
            if (altMatch && altMatch[1]) {
                prompt = altMatch[1].trim();
            }
        }
        
        prompt = prompt.replace(/^:\s*/, '').trim();
        if (prompt) {
            prompt = `Professional commercial advertising flyer design, corporate ad layout, graphic design template, ${prompt}, clean design, studio lighting, highly detailed commercial marketing art, 4k resolution`;
        } else {
            prompt = `Professional commercial advertising flyer design, corporate ad layout for ${data.negocio}, promoting ${data.oferta}, graphic design template, clean design, studio lighting, highly detailed commercial marketing art, 4k resolution`;
        }

        console.log(`[FLYER] Generando imagen para prompt: "${prompt}"`);
        let imageBase64 = null;
        try {
            const firstImage = images && images.length > 0 ? images[0] : null;
            imageBase64 = await ai.generateImage(prompt, { imageBase64: firstImage });
        } catch (imgErr) {
            console.error('[FLYER] Error generando imagen:', imgErr.message);
        }

        res.json({ concept, prompt, imageBase64 });
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
        const { prompt, imageBase64 } = req.body;
        const resultImage = await ai.generateImage(prompt, { imageBase64 });
        res.json({ imageBase64: resultImage });
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
