// services/ai-providers.js — Multi-Provider AI Service
const axios = require('axios');

const PROVIDERS = {
    groq: {
        url: 'https://api.groq.com/openai/v1/chat/completions',
        model: process.env.GROQ_MODEL || 'openai/gpt-oss-120b',
        secondaryModel: 'openai/gpt-oss-20b',
        apiKeyEnv: 'GROQ_API_KEY',
        name: 'Groq (GPT-OSS)'
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
            const cleanPrompt = prompt.substring(0, 800);
            const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(cleanPrompt)}?width=1024&height=1024&nologo=true&seed=${Math.floor(Math.random() * 100000)}`;
            const response = await axios.get(url, { responseType: 'arraybuffer' });
            const base64Str = Buffer.from(response.data, 'binary').toString('base64');
            return `data:image/jpeg;base64,${base64Str}`;
        }
    },
    huggingface: {
        name: 'Hugging Face (Flux - Requiere Token Gratis)',
        available: !!(process.env.HF_API_KEY && process.env.HF_API_KEY.length > 5),
        generate: async (prompt) => {
            const token = process.env.HF_API_KEY;
            const model = process.env.HF_MODEL || 'black-forest-labs/FLUX.1-schnell';
            const response = await axios.post(
                `https://api-inference.huggingface.co/models/${model}`,
                { inputs: prompt },
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    responseType: 'arraybuffer',
                    timeout: 60000
                }
            );
            const base64Str = Buffer.from(response.data, 'binary').toString('base64');
            return `data:image/jpeg;base64,${base64Str}`;
        }
    }
};

function getAvailableProvider() {
    const preferenceOrder = ['groq', 'openai'];
    for (const key of preferenceOrder) {
        const provider = PROVIDERS[key];
        const apiKey = process.env[provider.apiKeyEnv];
        if (apiKey && apiKey.length > 5) {
            return { key, ...provider, apiKey };
        }
    }
    throw new Error('No hay ninguna API key de IA configurada en el archivo .env. Por favor, agregá tu GROQ_API_KEY o tu OPENAI_API_KEY.');
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

    let currentModel = provider.model;

    if (images && images.length > 0) {
        const content = [{ type: "text", text: userPrompt }];
        images.forEach(img => {
            const dataUrl = img.startsWith('data:') ? img : `data:image/jpeg;base64,${img}`;
            content.push({
                type: "image_url",
                image_url: { url: dataUrl }
            });
        });
        messages.push({ role: 'user', content });
    } else {
        messages.push({ role: 'user', content: userPrompt });
    }

    const makeRequest = async (modelToUse) => {
        const response = await axios.post(provider.url, {
            model: modelToUse,
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
    };

    try {
        return await makeRequest(currentModel);
    } catch (error) {
        const msg = error.response?.data?.error?.message || error.message;
        console.error(`[AI Error] ${provider.name} (${currentModel}):`, msg);
        
        // Retry con modelo secundario si existe
        if (provider.secondaryModel && provider.secondaryModel !== currentModel) {
            console.log(`[AI] Intentando con modelo secundario: ${provider.secondaryModel}...`);
            try {
                return await makeRequest(provider.secondaryModel);
            } catch (error2) {
                const msg2 = error2.response?.data?.error?.message || error2.message;
                console.error(`[AI Error] ${provider.name} (${provider.secondaryModel}):`, msg2);
                throw new Error(`${provider.name}: ${msg2}`);
            }
        }
        throw new Error(`${provider.name}: ${msg}`);
    }
}

async function generateCaption(description, options = {}) {
    const systemPrompt = "Eres un experto en marketing digital. Tu objetivo es generar captions (textos para redes sociales) altamente atractivos con emojis y hashtags. IMPORTANTE: Tu respuesta debe ser ÚNICA Y EXCLUSIVAMENTE el texto del caption listo para publicar. NO uses frases conversacionales como 'Aquí tienes' ni comillas. Solo el texto final.";
    let userPrompt = "Analiza la imagen adjunta (si hay alguna) y genera un caption perfecto para ella.";
    if (description && description.trim() !== "") {
        userPrompt += ` Toma en cuenta estas instrucciones o contexto específico del usuario: "${description}"`;
    }
    return callAI(systemPrompt, userPrompt, options);
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
    const { imageBase64 = null } = options;
    if (process.env.HF_API_KEY && process.env.HF_API_KEY.length > 5) {
        try {
            if (imageBase64) {
                console.log("[IMAGE] Generando imagen adaptada con Hugging Face (Stable Diffusion Img2Img)...");
                const token = process.env.HF_API_KEY;
                const model = process.env.HF_IMAGE_EDIT_MODEL || 'runwayml/stable-diffusion-v1-5';
                const formattedBase64 = imageBase64.includes('base64,') ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`;
                const response = await axios.post(
                    `https://api-inference.huggingface.co/models/${model}`,
                    {
                        inputs: formattedBase64,
                        parameters: {
                            prompt: prompt,
                            strength: 0.4, // Fuerza baja para mantener las facciones de la persona original
                            negative_prompt: "deformed, bad quality, blurry, different face, different person, extra limbs, ugly"
                        }
                    },
                    {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        },
                        responseType: 'arraybuffer',
                        timeout: 90000
                    }
                );
                const base64Str = Buffer.from(response.data, 'binary').toString('base64');
                return `data:image/jpeg;base64,${base64Str}`;
            } else {
                console.log("[IMAGE] Generando imagen con Hugging Face (FLUX)...");
                return await IMAGE_PROVIDERS.huggingface.generate(prompt);
            }
        } catch (e) {
            console.error("[IMAGE] Falló Hugging Face:", e.message);
            if (imageBase64) {
                const errMsg = e.response ? Buffer.from(e.response.data).toString('utf8') : e.message;
                throw new Error(`Hugging Face: ${errMsg}`);
            }
        }
    }
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
