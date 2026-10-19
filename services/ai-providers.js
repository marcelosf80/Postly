// services/ai-providers.js — Multi-Provider AI Service
const axios = require('axios');
const FormData = require('form-data');

const PROVIDERS = {
    deepseek: {
        url: 'https://api.deepseek.com/chat/completions',
        model: process.env.DEEPSEEK_MODEL || 'deepseek-flash',
        apiKeyEnv: 'DEEPSEEK_API_KEY',
        name: 'DeepSeek'
    }
};

function getCandidateProviders() {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey || apiKey.trim().length < 12) {
        throw new Error('Configura DEEPSEEK_API_KEY en las variables de entorno del servidor.');
    }
    const provider = PROVIDERS.deepseek;
    return [{ key: 'deepseek', ...provider, apiKey }];
}

async function describeImage(imageBase64, options = {}) {
    if (!imageBase64 || imageBase64.length < 50) return null;
    try {
        return await callAI(
            'Describe imágenes en español con precisión. No inventes detalles ni identifiques personas.',
            'Describe brevemente los elementos visibles, colores, composición y ambiente de esta fotografía.',
            { ...options, imageBase64, maxTokens: 300 }
        );
    } catch (e) {
        console.warn('[VISION] DeepSeek no pudo analizar la imagen:', e.message);
        return null;
    }
}

async function callAI(systemPrompt, userPrompt, options = {}) {
    const { temperature = 0.7, maxTokens = 1200, imageBase64 = null } = options;
    const provider = getCandidateProviders()[0];
    const imageUrl = imageBase64
        ? (imageBase64.startsWith('data:image/') ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`)
        : null;
    const userContent = imageUrl
        ? [
            { type: 'text', text: userPrompt },
            { type: 'image_url', image_url: { url: imageUrl } }
        ]
        : userPrompt;

    try {
        const response = await axios.post(provider.url, {
            model: provider.model,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userContent }
            ],
            temperature,
            max_tokens: maxTokens
        }, {
            headers: {
                Authorization: `Bearer ${provider.apiKey}`,
                'Content-Type': 'application/json'
            },
            timeout: 60000
        });
        const text = response.data?.choices?.[0]?.message?.content;
        if (typeof text !== 'string' || !text.trim()) throw new Error('Respuesta vacía de DeepSeek.');
        return text.trim();
    } catch (error) {
        const detail = error.response?.data?.error?.message || error.response?.data?.message || error.message;
        console.error('[AI] Error de DeepSeek:', detail);
        if (error.response?.status === 401) throw new Error('API key de DeepSeek inválida.');
        if (error.response?.status === 402) throw new Error('La cuenta de DeepSeek no tiene saldo disponible.');
        if (error.response?.status === 429) throw new Error('DeepSeek alcanzó el límite temporal de solicitudes.');
        throw new Error(`DeepSeek: ${detail}`);
    }
}

async function generateCaption(description, options = {}) {
    const { imageBase64 = null } = options;
    const systemPrompt = `Eres un creador de contenido humano y cercano para Instagram, Facebook y TikTok.
Escribe en español natural, evita clichés y no inventes datos que no estén en la foto o en la indicación.
Si hay una foto, úsala como contexto visual. Incluye una pregunta orgánica, de 2 a 4 emojis y entre 3 y 5 hashtags.
Devuelve únicamente el texto final listo para publicar.`;
    const userPrompt = description && description.trim()
        ? `Crea una publicación atractiva basada en la foto y esta indicación: "${description.trim()}".`
        : 'Crea una publicación atractiva basada en esta foto.';
    return callAI(systemPrompt, userPrompt, { ...options, imageBase64, maxTokens: 600 });
}

async function generateFlyer(data, options = {}) {
    const systemPrompt = `Sos un experto en diseño gráfico y marketing digital de alto nivel. Analiza los datos del negocio y las imágenes para estructurar un concepto de flyer profesional, corporativo y estéticamente superior.
IMPORTANTE: En la sección 'PROMPT PARA GENERADOR DE IMÁGENES' debes escribir exclusivamente un prompt detallado en inglés optimizado para Midjourney/Stable Diffusion que describa un flyer comercial o anuncio publicitario limpio (ad template). Debe especificar la composición gráfica, los colores corporativos, la distribución de elementos, fondo de estudio y calidad comercial (commercial product shot, graphic design, clean layout, modern typography placeholders, high resolution, professional advertising style). No debe generar caras humanas deformadas ni paisajes genéricos irrelevantes, debe enfocarse 100% en la venta del producto/servicio.
Responde siguiendo exactamente esta estructura:
### 🎯 CONCEPTO VISUAL
### 🎨 PALETA DE COLORES
### ✍️ TIPOGRAFÍAS SUGERIDAS
### 📝 TEXTO EXACTO DEL FLYER
### 🖼️ PROMPT PARA GENERADOR DE IMÁGENES
### 📐 FORMATO RECOMENDADO`;

    let userPrompt = `Diseña un flyer para:
Negocio: ${data.negocio}
Oferta: ${data.oferta}
Contacto: ${data.contacto}
Formato: ${data.formato}`;

    if (data.extra) {
        userPrompt += `\nInstrucciones adicionales / Estilo deseado: ${data.extra}`;
    }

    return callAI(systemPrompt, userPrompt, { ...options, maxTokens: 1500 });
}

async function generateHashtags(description, options = {}) {
    const { imageBase64 = null } = options;
    
    // Si hay imagen, primero la analizamos
    let imageContext = '';
    if (imageBase64) {
        const imageDesc = await describeImage(imageBase64);
        if (imageDesc) {
            imageContext = ` La imagen muestra: "${imageDesc}".`;
        }
    }

    const systemPrompt = `Eres un experto en SEO y hashtags para redes sociales (Instagram, Facebook, TikTok).
Genera exactamente 15 hashtags ultra-relevantes, mezclando populares (alto alcance) con hashtags de nicho (alto engagement).
Respuesta: SOLO los hashtags separados por espacios. Sin explicaciones ni numeración.`;
    
    const userPrompt = `Genera 15 hashtags estratégicos para: ${description || 'publicación de redes sociales'}.${imageContext}`;
    return callAI(systemPrompt, userPrompt, options);
}

async function generateIdeas(industry, options = {}) {
    return callAI("Genera 5 ideas de contenido.", industry, options);
}

async function improveText(text, options = {}) {
    return callAI("Mejora este texto para redes sociales.", text, options);
}

async function generateVisualPrompt(concept, options = {}) {
    return callAI("Genera un prompt visual en inglés.", concept, options);
}

async function generateImage(prompt, options = {}) {
    const imageBase64 = options.imageBase64;
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey || apiKey.trim().length < 12) {
        throw new Error('Configura OPENAI_API_KEY en las variables de entorno del servidor.');
    }

    const model = process.env.OPENAI_IMAGE_MODEL || 'gpt-image-2.5-sunburst';
    const imagePrompt = String(prompt || 'Crea una variación atractiva y natural para una publicación de Instagram.').slice(0, 4000);

    try {
        let response;
        if (imageBase64) {
            const match = imageBase64.match(/^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=\s]+)$/i);
            if (!match) {
                throw new Error('La foto de referencia debe ser PNG, JPEG o WebP en formato base64.');
            }
            const mimeType = match[1].toLowerCase();
            const imageBuffer = Buffer.from(match[2].replace(/\s/g, ''), 'base64');
            if (imageBuffer.length > 20 * 1024 * 1024) {
                throw new Error('La foto de referencia supera el límite de 20 MB.');
            }

            const extension = mimeType === 'image/jpeg' ? 'jpg' : mimeType.split('/')[1];
            const form = new FormData();
            form.append('model', model);
            form.append('prompt', imagePrompt);
            form.append('image[]', imageBuffer, { filename: `reference.${extension}`, contentType: mimeType });
            form.append('output_format', 'png');
            response = await axios.post('https://api.openai.com/v1/images/edits', form, {
                headers: { Authorization: `Bearer ${apiKey}`, ...form.getHeaders() },
                timeout: 180000,
                maxBodyLength: Infinity,
                maxContentLength: Infinity
            });
        } else {
            response = await axios.post('https://api.openai.com/v1/images/generations', {
                model,
                prompt: imagePrompt,
                output_format: 'png'
            }, {
                headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
                timeout: 180000
            });
        }

        const encoded = response.data?.data?.[0]?.b64_json;
        if (!encoded) throw new Error('OpenAI no devolvió una imagen.');
        return `data:image/png;base64,${encoded}`;
    } catch (error) {
        const detail = error.response?.data?.error?.message || error.message;
        console.error('[IMAGE] Error de OpenAI:', detail);
        if (error.response?.status === 401) throw new Error('API key de OpenAI inválida.');
        if (error.response?.status === 429) throw new Error('OpenAI alcanzó el límite temporal de solicitudes.');
        throw new Error(`OpenAI Images: ${detail}`);
    }
}

async function analyzeImage(imageBase64, options = {}) {
    const imageDesc = await describeImage(imageBase64);
    if (imageDesc) {
        return callAI(
            'Eres un experto en marketing visual para redes sociales.',
            `La imagen muestra: "${imageDesc}". Basándote en eso, dame: 1) Elementos visuales principales, 2) Emociones que transmite, 3) Sugerencias para el caption, 4) 10 hashtags recomendados.`,
            options
        );
    }
    return 'No se pudo analizar la imagen. Revisa DEEPSEEK_API_KEY en la configuración del servidor.';
}

function getProviderStatus() {
    const status = {};
    Object.keys(PROVIDERS).forEach(k => {
        status[k] = { 
            name: PROVIDERS[k].name, 
            model: PROVIDERS[k].model,
            envVar: PROVIDERS[k].apiKeyEnv,
            available: !!(process.env[PROVIDERS[k].apiKeyEnv] && process.env[PROVIDERS[k].apiKeyEnv].length > 5)
        };
    });
    return status;
}

module.exports = { 
    generateCaption, generateHashtags, generateIdeas, improveText,
    generateVisualPrompt, generateFlyer, analyzeImage, generateImage,
    callAI, getProviderStatus 
};
