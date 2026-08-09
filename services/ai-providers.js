// services/ai-providers.js — Multi-Provider AI Service
const axios = require('axios');

const PROVIDERS = {
    groq: {
        url: 'https://api.groq.com/openai/v1/chat/completions',
        model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
        secondaryModel: 'llama-3.1-8b-instant',
        apiKeyEnv: 'GROQ_API_KEY',
        name: 'Groq'
    },
    huggingface_text: {
        url: 'https://api-inference.huggingface.co/v1/chat/completions',
        model: 'meta-llama/Llama-3.1-8B-Instruct',
        apiKeyEnv: 'HF_API_KEY',
        name: 'HuggingFace (Llama)'
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
    const preferenceOrder = ['groq', 'huggingface_text', 'openai'];
    for (const key of preferenceOrder) {
        const provider = PROVIDERS[key];
        const apiKey = process.env[provider.apiKeyEnv];
        if (apiKey && apiKey.length > 5) {
            return { key, ...provider, apiKey };
        }
    }
    throw new Error('No hay ninguna API key de IA configurada en el archivo .env. Por favor, agregá tu GROQ_API_KEY o tu OPENAI_API_KEY.');
}

/**
 * Usa Hugging Face BLIP para describir una imagen en texto.
 * Esto permite que modelos sin visión (como GPT-OSS) entiendan la imagen.
 */
async function describeImage(imageBase64) {
    const token = process.env.HF_API_KEY;
    if (!token || token.length < 5) {
        console.warn('[VISION] No hay HF_API_KEY configurada. No se puede analizar la imagen.');
        return null;
    }

    try {
        const rawBase64 = imageBase64.includes('base64,') 
            ? imageBase64.split('base64,')[1] 
            : imageBase64;
        const imageBuffer = Buffer.from(rawBase64, 'base64');

        console.log('[VISION] Analizando imagen con Hugging Face Vision (BLIP-2)...');
        
        // Intentar primero con Salesforce/blip2-opt-2.7b para mayor precisión visual
        let modelUrl = 'https://api-inference.huggingface.co/models/Salesforce/blip2-opt-2.7b';
        let response;
        try {
            response = await axios.post(
                modelUrl,
                imageBuffer,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/octet-stream'
                    },
                    timeout: 25000
                }
            );
        } catch (e1) {
            console.warn('[VISION] Falló BLIP-2, usando fallback BLIP-large...', e1.message);
            modelUrl = 'https://api-inference.huggingface.co/models/Salesforce/blip-image-captioning-large';
            response = await axios.post(
                modelUrl,
                imageBuffer,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/octet-stream'
                    },
                    timeout: 25000
                }
            );
        }

        if (response.data && response.data[0] && response.data[0].generated_text) {
            const description = response.data[0].generated_text;
            console.log('[VISION] Imagen descrita:', description);
            return description;
        }
        return null;
    } catch (e) {
        console.error('[VISION] Error analizando imagen:', e.message);
        return null;
    }
}

async function callAI(systemPrompt, userPrompt, options = {}) {
    let { temperature = 0.7, maxTokens = 1200, images = [], imageBase64 = null, provider: requestedProvider = null } = options;

    if (imageBase64 && images.length === 0) {
        images = [imageBase64];
    }
    let provider;
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
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
    ];

    let currentModel = provider.model;

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
    const { imageBase64 = null } = options;
    
    let imageContext = '';
    if (imageBase64) {
        const imageDesc = await describeImage(imageBase64);
        if (imageDesc) {
            imageContext = `\n\nDETALLES VISUALES DE LA IMAGEN ADJUNTA: "${imageDesc}".\nUsa lo que ves en la imagen (personas, objetos, colores, ambiente) para que el texto sea 100% coherente con la foto.`;
        }
    }

    const systemPrompt = `Eres un creador de contenido humano, natural y auténtico para redes sociales (Instagram, TikTok, Facebook).
REGLAS OBLIGATORIAS:
1. Escribe como una persona real compartiendo con su audiencia. Evita sonar como un anuncio de televisión o un robot de marketing artificial.
2. Haz referencias específicas y naturales a lo que aparece en la foto.
3. Incluye una llamada a la acción orgánica (hacer una pregunta a los seguidores o invitarlos a comentar).
4. Usa emojis expresivos con moderación y 3-5 hashtags relevantes al final.
5. NO incluyas introducciones ni despedidas conversacionales como "Aquí tienes tu caption:". Devuelve ÚNICAMENTE el texto listo para publicar.`;
    
    let userPrompt = 'Crea una sugerencia de publicación muy humana y cercana.';
    if (description && description.trim() !== '') {
        userPrompt += ` Idea o contexto deseado: "${description}"`;
    }
    userPrompt += imageContext;

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
    const imageDesc = await describeImage(imageBase64);
    if (imageDesc) {
        return callAI(
            'Eres un experto en marketing visual para redes sociales.',
            `La imagen muestra: "${imageDesc}". Basándote en eso, dame: 1) Elementos visuales principales, 2) Emociones que transmite, 3) Sugerencias para el caption, 4) 10 hashtags recomendados.`,
            options
        );
    }
    return 'No se pudo analizar la imagen. Asegúrate de tener tu HF_API_KEY configurada.';
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
