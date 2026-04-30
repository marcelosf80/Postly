// services/ai-providers.js — Multi-Provider AI Service
const axios = require('axios');

const PROVIDERS = {
    groq: {
        url: 'https://api.groq.com/openai/v1/chat/completions',
        model: 'meta-llama/llama-4-scout-17b-16e-instruct', // Nuevo modelo Llama 4 Scout
        secondaryModel: 'qwen/qwen3-32b', // Modelo Qwen 3
        apiKeyEnv: 'GROQ_API_KEY',
        name: 'Groq Next-Gen'
    },
    meta: {
        url: 'https://api.llama-api.com/chat/completions',
        model: 'llama3.1-70b', 
        apiKeyEnv: 'META_LLAMA_API_KEY',
        name: 'Meta Llama'
    },
    openai: {
        url: 'https://api.openai.com/v1/chat/completions',
        model: 'gpt-4o-mini', 
        apiKeyEnv: 'OPENAI_API_KEY',
        name: 'OpenAI'
    }
};

const IMAGE_PROVIDERS = {
    pollinations: {
        name: 'Pollinations AI (Gratis)',
        available: true,
        generate: async (prompt) => {
            const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true&seed=${Math.floor(Math.random() * 100000)}`;
            const response = await axios.get(url, { responseType: 'arraybuffer' });
            const base64Str = Buffer.from(response.data, 'binary').toString('base64');
            return `data:image/jpeg;base64,${base64Str}`;
        }
    }
};

function getAvailableProvider() {
    const preferenceOrder = ['groq', 'meta', 'openai'];
    for (const key of preferenceOrder) {
        const provider = PROVIDERS[key];
        const apiKey = process.env[provider.apiKeyEnv];
        if (apiKey && apiKey.length > 5) {
            return { key, ...provider, apiKey };
        }
    }
    throw new Error('No hay ninguna API key de IA configurada en el archivo .env. Por favor, agregá tu GROQ_API_KEY.');
}

async function callAI(systemPrompt, userPrompt, options = {}) {
    let { temperature = 0.7, maxTokens = 1200, images = [], imageBase64 = null, provider: requestedProvider = null } = options;

    // Support single imageBase64 for backward compatibility
    if (imageBase64 && images.length === 0) {
        images = [imageBase64];
    }
    try {
        if (requestedProvider && PROVIDERS[requestedProvider]) {
            const apiKey = process.env[PROVIDERS[requestedProvider].apiKeyEnv];
            provider = { key: requestedProvider, ...PROVIDERS[requestedProvider], apiKey };
        } else {
            provider = getAvailableProvider();
        }
    } catch (e) {
        throw e;
    }

    let messages = [
        { role: 'system', content: systemPrompt }
    ];

    // Usamos Llama 4 Scout como modelo preferencial, incluso para visión si está disponible
    let currentModel = provider.model;
    if (provider.key === 'groq' && images && images.length > 0) {
        // Llama 4 Scout soporta visión y es más avanzado que el anterior
        currentModel = 'meta-llama/llama-4-scout-17b-16e-instruct'; 
    }

    if (images && images.length > 0) {
        const content = [{ type: "text", text: userPrompt }];
        images.forEach(img => {
            const base64Data = img.includes('base64,') ? img.split('base64,')[1] : img;
            content.push({
                type: "image_url",
                image_url: { url: `data:image/jpeg;base64,${base64Data}` }
            });
        });
        messages.push({ role: 'user', content });
    } else {
        messages.push({ role: 'user', content: userPrompt });
    }

    try {
        const response = await axios.post(provider.url, {
            model: currentModel,
            messages,
            temperature,
            max_tokens: maxTokens
        }, {
            headers: {
                'Authorization': `Bearer ${provider.apiKey}`,
                'Content-Type': 'application/json'
            },
            timeout: 60000
        });

        return response.data.choices[0].message.content;
    } catch (error) {
        const msg = error.response?.data?.error?.message || error.message;
        console.error(`[AI Error] ${provider.name}:`, msg);
        throw new Error(`${provider.name}: ${msg}`);
    }
}

async function generateCaption(description, options = {}) {
    const systemPrompt = "Eres un experto en marketing digital. Genera captions atractivos con emojis y hashtags.";
    return callAI(systemPrompt, `Genera un caption para: ${description}`, options);
}

async function generateFlyer(data, options = {}) {
    const systemPrompt = `Sos un experto en diseño gráfico y marketing. Analiza los datos del negocio y las imágenes para crear un concepto de flyer profesional.
Responde siguiendo exactamente esta estructura:
### 🎯 CONCEPTO VISUAL
### 🎨 PALETA DE COLORES
### ✍️ TIPOGRAFÍAS SUGERIDAS
### 📝 TEXTO EXACTO DEL FLYER
### 🖼️ PROMPT PARA GENERADOR DE IMÁGENES
### 📐 FORMATO RECOMENDADO`;

    const userPrompt = `Diseña un flyer para:
Negocio: ${data.negocio}
Oferta: ${data.oferta}
Contacto: ${data.contacto}
Formato: ${data.formato}`;

    return callAI(systemPrompt, userPrompt, { ...options, maxTokens: 1500 });
}

async function generateHashtags(description, options = {}) {
    return callAI("Genera 15 hashtags relevantes.", description, options);
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
    return IMAGE_PROVIDERS.pollinations.generate(prompt);
}

async function analyzeImage(imageBase64, options = {}) {
    return callAI("Analiza esta imagen y dame insights.", "Analiza la imagen.", { ...options, images: [imageBase64] });
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
