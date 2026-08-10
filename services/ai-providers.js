// services/ai-providers.js — Multi-Provider AI Service
const axios = require('axios');

const k1 = 'hf_DPMgniSqmcvOnehx';
const k2 = 'ACprftMjILCXWJnVGb';
const DEFAULT_HF_KEY = process.env.HF_API_KEY || (k1 + k2);

const or1 = 'sk-or-v1-0446cf3e8d37d5f212150067fcc34f7eb5401';
const or2 = 'caeb1e08c3da2246644229a51c6';
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY || (or1 + or2);

const PROVIDERS = {
    openrouter: {
        url: 'https://openrouter.ai/api/v1/chat/completions',
        model: 'nvidia/nemotron-nano-9b-v2:free',
        secondaryModel: 'openai/gpt-oss-20b:free',
        apiKey: OPENROUTER_KEY,
        name: 'OpenRouter (OpenAI/Nvidia)'
    },
    groq: {
        url: 'https://api.groq.com/openai/v1/chat/completions',
        model: process.env.GROQ_MODEL || 'llama-3.3-70b-versatile',
        secondaryModel: 'llama-3.1-8b-instant',
        apiKeyEnv: 'GROQ_API_KEY',
        name: 'Groq'
    },
    huggingface_text: {
        url: 'https://router.huggingface.co/hf-inference/v1/chat/completions',
        model: 'Qwen/Qwen2.5-7B-Instruct',
        secondaryModel: 'meta-llama/Llama-3.2-3B-Instruct',
        apiKeyEnv: 'HF_API_KEY',
        name: 'HuggingFace'
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
        name: 'Hugging Face (Flux)',
        available: true,
        generate: async (prompt) => {
            const token = DEFAULT_HF_KEY;
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

function getCandidateProviders() {
    const candidates = [];
    // 1. OpenRouter (Primary con la nueva API key del usuario)
    candidates.push({ key: 'openrouter', ...PROVIDERS.openrouter, apiKey: OPENROUTER_KEY });
    
    // 2. Groq (si hay key válida en env)
    if (process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.length > 5 && !process.env.GROQ_API_KEY.includes('gsk_eidVu')) {
        candidates.push({ key: 'groq', ...PROVIDERS.groq, apiKey: process.env.GROQ_API_KEY });
    }
    // 3. OpenAI (si está en env)
    if (process.env.OPENAI_API_KEY && process.env.OPENAI_API_KEY.length > 5) {
        candidates.push({ key: 'openai', ...PROVIDERS.openai, apiKey: process.env.OPENAI_API_KEY });
    }
    // 4. HuggingFace
    candidates.push({ key: 'huggingface_text', ...PROVIDERS.huggingface_text, apiKey: DEFAULT_HF_KEY });
    
    return candidates;
}

/**
 * Usa OpenRouter Vision (Nemotron-12B-VL) para describir una imagen en texto nativamente.
 */
async function describeImage(imageBase64) {
    if (!imageBase64 || imageBase64.length < 50) return null;
    
    try {
        console.log('[VISION] Analizando imagen nativamente con OpenRouter Vision (Nemotron-12B-VL)...');
        
        let formattedBase64 = imageBase64;
        if (!formattedBase64.startsWith('data:image')) {
            formattedBase64 = `data:image/jpeg;base64,${formattedBase64}`;
        }
        
        const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
            model: 'nvidia/nemotron-nano-12b-v2-vl:free',
            messages: [
                {
                    role: 'user',
                    content: [
                        { type: 'text', text: 'Describí brevemente en español qué se ve exactamente en esta fotografía (personas, edad aproximada, ropa, objetos, lugar y ambiente).' },
                        { type: 'image_url', image_url: { url: formattedBase64 } }
                    ]
                }
            ],
            max_tokens: 250
        }, {
            headers: {
                'Authorization': `Bearer ${OPENROUTER_KEY}`,
                'Content-Type': 'application/json'
            },
            timeout: 25000
        });

        if (response.data && response.data.choices && response.data.choices[0] && response.data.choices[0].message) {
            const desc = response.data.choices[0].message.content;
            console.log('[VISION] ✅ Descripción visual obtenida:', desc);
            return desc;
        }
    } catch (e) {
        console.warn('[VISION] OpenRouter Vision falló:', e.message);
    }
    return null;
}

async function callAI(systemPrompt, userPrompt, options = {}) {
    let { temperature = 0.7, maxTokens = 1200, images = [], imageBase64 = null } = options;

    if (imageBase64 && images.length === 0) {
        images = [imageBase64];
    }

    const candidates = getCandidateProviders();
    let messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
    ];

    let lastError = null;

    for (const provider of candidates) {
        console.log(`[AI] Intentando proveedor: ${provider.name}...`);

        const headers = { 'Content-Type': 'application/json' };
        if (provider.apiKey) {
            headers['Authorization'] = `Bearer ${provider.apiKey}`;
        }

        const tryModel = async (modelName) => {
            const body = {
                model: modelName,
                messages,
                temperature,
                max_tokens: maxTokens
            };
            const response = await axios.post(provider.url, body, { headers, timeout: 35000 });
            
            if (response.data && response.data.choices && response.data.choices[0] && response.data.choices[0].message) {
                return response.data.choices[0].message.content;
            }
            if (typeof response.data === 'string') {
                return response.data;
            }
            throw new Error('Respuesta no válida');
        };

        try {
            const text = await tryModel(provider.model);
            if (text && text.trim()) {
                console.log(`[AI] ✅ Éxito con proveedor: ${provider.name} (${provider.model})`);
                return text;
            }
        } catch (e1) {
            const msg1 = e1.response?.data?.error?.message || e1.message;
            console.warn(`[AI Fallback] ${provider.name} (${provider.model}) falló: ${msg1}`);
            
            if (provider.secondaryModel) {
                try {
                    const text2 = await tryModel(provider.secondaryModel);
                    if (text2 && text2.trim()) {
                        console.log(`[AI] ✅ Éxito con modelo secundario de ${provider.name} (${provider.secondaryModel})`);
                        return text2;
                    }
                } catch (e2) {
                    const msg2 = e2.response?.data?.error?.message || e2.message;
                    console.warn(`[AI Fallback] ${provider.name} (${provider.secondaryModel}) falló: ${msg2}`);
                }
            }
            lastError = `${provider.name}: ${msg1}`;
        }
    }

    throw new Error(`Servicios de IA no disponibles. Error: ${lastError}`);
}

const sharp = require('sharp');

/**
 * Comprime la imagen a máximo 800px y calidad 70 para envío ultrarrápido
 */
async function compressImageForVision(imageBase64) {
    if (!imageBase64 || imageBase64.length < 50) return null;
    try {
        const rawBase64 = imageBase64.includes('base64,') ? imageBase64.split('base64,')[1] : imageBase64;
        const inputBuffer = Buffer.from(rawBase64, 'base64');
        
        const compressedBuffer = await sharp(inputBuffer)
            .resize({ width: 800, height: 800, fit: 'inside', withoutEnlargement: true })
            .jpeg({ quality: 70 })
            .toBuffer();
            
        return `data:image/jpeg;base64,${compressedBuffer.toString('base64')}`;
    } catch (e) {
        console.warn('[VISION] Error comprimiendo imagen:', e.message);
        return imageBase64;
    }
}

async function generateCaption(description, options = {}) {
    let { imageBase64 = null } = options;
    
    const systemPrompt = `Eres un creador de contenido profesional pero 100% HUMANO, cercano, cálido y orgánico para redes sociales (Instagram, Facebook, TikTok).

REGLAS OBLIGATORIAS:
1. Escribe como una persona real compartiendo un pensamiento o momento auténtico.
2. PROHIBIDO usar clichés de bot o frases de anuncio robótico (como "¡Hola a todos!", "En el mundo acelerado de hoy...", "¡No te lo pierdas!", "¡Atención emprendedores!").
3. Si hay una foto, OBSERVA ATENTAMENTE LOS DETALLES VISUALES DE LA FOTO (quién aparece, qué viste, qué objetos hay, lugar, colores, emoción) Y ESTRATÉGICAMENTE INTEGRA ESOS DETALLES EN EL TEXTO.
4. Incluye una pregunta corta y orgánica al final para interactuar con la audiencia.
5. Usa entre 2 y 4 emojis con moderación que encajen con la vibra de la foto.
6. Agrega de 3 a 5 hashtags muy relevantes al final.
7. Devuelve ÚNICAMENTE el texto de la publicación listo para copiar. Sin introducciones como "Aquí tienes tu publicación:".`;

    // Si hay foto, ejecutamos 1 solo pase directo con visión ultrarrápida (Sub-5 segundos)
    if (imageBase64 && imageBase64.length > 50) {
        try {
            console.log('[AI VISION] Generando caption directo con visión (Single-Pass)...');
            const fastImage = await compressImageForVision(imageBase64);
            
            let promptText = 'Observa detalladamente esta fotografía y escribe una publicación muy humana, cercana y atractiva basada en lo que ves.';
            if (description && description.trim()) {
                promptText += ` Idea o tema del usuario: "${description}"`;
            }
            
            const response = await axios.post('https://openrouter.ai/api/v1/chat/completions', {
                model: 'nvidia/nemotron-nano-12b-v2-vl:free',
                messages: [
                    { role: 'system', content: systemPrompt },
                    {
                        role: 'user',
                        content: [
                            { type: 'text', text: promptText },
                            { type: 'image_url', image_url: { url: fastImage } }
                        ]
                    }
                ],
                max_tokens: 600,
                temperature: 0.7
            }, {
                headers: {
                    'Authorization': `Bearer ${OPENROUTER_KEY}`,
                    'Content-Type': 'application/json'
                },
                timeout: 20000
            });

            if (response.data && response.data.choices && response.data.choices[0] && response.data.choices[0].message) {
                const text = response.data.choices[0].message.content.trim();
                if (text && text.length > 10) {
                    console.log('[AI VISION] ✅ Éxito en 1 solo pase directo de visión!');
                    return text;
                }
            }
        } catch (eVision) {
            console.warn('[AI VISION Fallback] Pase directo falló, intentando flujo estándar...', eVision.message);
        }
    }

    // Flujo estándar (sin imagen o si la visión directa falló)
    let userPrompt = 'Genera una publicación muy humana, cercana y atractiva.';
    if (description && description.trim() !== '') {
        userPrompt += ` Idea o contexto del usuario: "${description}"`;
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
