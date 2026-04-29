// services/ai-providers.js — Multi-Provider AI Service
// Soporta: Meta AI (Llama), Groq, OpenAI, Claude

const axios = require('axios');
<<<<<<< HEAD
const { GoogleAuth } = require('google-auth-library');
=======
>>>>>>> 0d6074004f5f2f1a157b3bfea43781b84dba81f1

// ============================================
// CONFIGURACIÓN DE PROVIDERS
// ============================================

<<<<<<< HEAD
    // Ollama (Local AI - 100% Offline y Privado)
    ollama: {
        url: 'http://localhost:11434/api/chat',
        model: 'llama3', // Modelo recomendado para Ollama
        apiKeyEnv: 'OLLAMA_ENABLED', // Flag para habilitarlo en .env
        name: 'Ollama (Local)',
        formatPayload: (messages, temperature, maxTokens) => ({
            model: 'llama3',
            messages,
            stream: false,
            options: {
                temperature,
                num_predict: maxTokens
            }
        }),
        extractResponse: (data) => data.message.content
    }
};

// ============================================
// CONFIGURACIÓN DE IMAGE PROVIDERS
// ============================================

const IMAGE_PROVIDERS = {
    pollinations: {
        name: 'Pollinations AI (Gratis)',
        type: 'free',
        available: true, // Siempre disponible
        generate: async (prompt) => {
            const url = `https://image.pollinations.ai/prompt/${encodeURIComponent(prompt)}?width=1024&height=1024&nologo=true&seed=${Math.floor(Math.random() * 100000)}`;
            const response = await axios.get(url, { responseType: 'arraybuffer' });
            return Buffer.from(response.data, 'binary').toString('base64');
        }
    },

    vertex: {
        name: 'Vertex AI Imagen 3 (GCP)',
        type: 'vertex',
        apiKeyEnv: 'GCP_PROJECT_ID',
        available: !!process.env.GCP_PROJECT_ID,
        generate: async (prompt) => {
            const projectId = process.env.GCP_PROJECT_ID;
            const location = process.env.GCP_LOCATION || 'us-central1';
            
            const { GoogleAuth } = require('google-auth-library');
            const auth = new GoogleAuth({
                scopes: ['https://www.googleapis.com/auth/cloud-platform']
            });
            const client = await auth.getClient();
            
            const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${location}/publishers/google/models/imagen-3.0-generate-001:predict`;
            
            const res = await client.request({
                url,
                method: 'POST',
                data: {
                    instances: [ { prompt } ],
                    parameters: { sampleCount: 1, aspectRatio: "1:1" }
                }
            });

            if (res.data?.predictions?.length > 0) {
                return res.data.predictions[0].bytesBase64Encoded;
            }
            throw new Error('Respuesta inválida de Vertex AI');
        }
    },

    openai: {
        name: 'OpenAI DALL-E 3',
        type: 'openai',
        apiKeyEnv: 'OPENAI_API_KEY',
        available: !!process.env.OPENAI_API_KEY,
        generate: async (prompt) => {
            const apiKey = process.env.OPENAI_API_KEY;
            const res = await axios.post('https://api.openai.com/v1/images/generations', {
                model: "dall-e-3",
                prompt: prompt,
                n: 1,
                size: "1024x1024",
                response_format: "b64_json"
            }, {
                headers: { 'Authorization': `Bearer ${apiKey}` }
            });
            return res.data.data[0].b64_json;
        }
=======
const PROVIDERS = {
    // Meta AI API (Llama - Gratis y especializado en redes sociales)
    meta: {
        url: 'https://api.llama-api.com/chat/completions',
        model: 'llama3.1-70b', // o llama3.3-70b
        apiKeyEnv: 'META_LLAMA_API_KEY',
        name: 'Meta Llama'
    },
    
    // Groq (Llama ultra-rápido - Actual)
    groq: {
        url: 'https://api.groq.com/openai/v1/chat/completions',
        model: 'meta-llama/llama-4-scout-17b-16e-instruct',
        apiKeyEnv: 'GROQ_API_KEY',
        name: 'Groq (Llama)'
    },
    
    // OpenAI (GPT-4 - Pago)
    openai: {
        url: 'https://api.openai.com/v1/chat/completions',
        model: 'gpt-4o-mini', // o gpt-4o
        apiKeyEnv: 'OPENAI_API_KEY',
        name: 'OpenAI GPT'
    },
    
    // Anthropic Claude (Pago)
    claude: {
        url: 'https://api.anthropic.com/v1/messages',
        model: 'claude-3-5-sonnet-20241022',
        apiKeyEnv: 'ANTHROPIC_API_KEY',
        name: 'Claude',
        headers: (apiKey) => ({
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'Content-Type': 'application/json'
        }),
        formatPayload: (messages, temperature, maxTokens) => ({
            model: 'claude-3-5-sonnet-20241022',
            max_tokens: maxTokens,
            temperature,
            messages: messages.map(m => ({
                role: m.role === 'system' ? 'user' : m.role,
                content: m.role === 'system' ? 
                    `[SYSTEM INSTRUCTIONS]\n${m.content}` : 
                    m.content
            }))
        }),
        extractResponse: (data) => data.content[0].text
>>>>>>> 0d6074004f5f2f1a157b3bfea43781b84dba81f1
    }
};

// ============================================
// DETECTAR MEJOR PROVIDER DISPONIBLE
// ============================================

function getAvailableProvider() {
<<<<<<< HEAD
    // Orden de preferencia: Cloud primero para movilidad (Meta, Groq), Ollama como fallback local
    const preferenceOrder = ['meta', 'groq', 'openai', 'claude', 'ollama'];
    
    for (const providerKey of preferenceOrder) {
        const provider = PROVIDERS[providerKey];
        
        // Para proveedores Cloud: verificar API Key en el .env
        if (providerKey !== 'ollama') {
            const apiKey = process.env[provider.apiKeyEnv];
            if (apiKey) {
                console.log(`[AI] Usando provider cloud: ${provider.name}`);
                return { key: providerKey, ...provider, apiKey };
            }
        } else {
            // Ollama: solo si ya no hay nada en la nube y el usuario lo habilitó
             console.log(`[AI] Probando provider local (fallback): ${provider.name}`);
             return { key: providerKey, ...provider, apiKey: 'local' };
        }
    }
    
    throw new Error('No hay ninguna IA configurada (necesitas una API key en el .env)');
=======
    // Orden de preferencia
    const preferenceOrder = ['meta', 'groq', 'openai', 'claude'];
    
    for (const providerKey of preferenceOrder) {
        const provider = PROVIDERS[providerKey];
        const apiKey = process.env[provider.apiKeyEnv];
        
        if (apiKey) {
            console.log(`[AI] Usando provider: ${provider.name}`);
            return { key: providerKey, ...provider, apiKey };
        }
    }
    
    throw new Error('No hay ninguna API key de IA configurada. Revisa tu .env');
>>>>>>> 0d6074004f5f2f1a157b3bfea43781b84dba81f1
}

// ============================================
// LLAMADA UNIFICADA A IA
// ============================================

async function callAI(systemPrompt, userPrompt, options = {}) {
    const { 
        temperature = 0.8, 
        maxTokens = 600, 
        imageBase64 = null,
        provider: requestedProvider = null 
    } = options;

    // Seleccionar provider
    let provider;
    if (requestedProvider && PROVIDERS[requestedProvider]) {
        const apiKey = process.env[PROVIDERS[requestedProvider].apiKeyEnv];
        if (!apiKey) {
            throw new Error(`${requestedProvider} solicitado pero no configurado`);
        }
        provider = { key: requestedProvider, ...PROVIDERS[requestedProvider], apiKey };
    } else {
        provider = getAvailableProvider();
    }

    // Preparar mensajes
    let messages = [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
    ];

    // Soporte para imágenes (solo algunos providers)
    if (imageBase64 && ['groq', 'openai'].includes(provider.key)) {
        messages[1].content = [
            { type: "text", text: userPrompt },
            { type: "image_url", image_url: { url: imageBase64 } }
        ];
    }

    try {
        // Formato especial para Claude
        let payload, headers;
        
        if (provider.formatPayload) {
            payload = provider.formatPayload(messages, temperature, maxTokens);
            headers = provider.headers(provider.apiKey);
        } else {
            // Formato OpenAI-compatible (Meta, Groq, OpenAI)
            payload = {
                model: provider.model,
                messages,
                temperature,
                max_tokens: maxTokens
            };
            headers = {
                'Authorization': `Bearer ${provider.apiKey}`,
                'Content-Type': 'application/json'
            };
        }

        const response = await axios.post(provider.url, payload, {
            headers,
            timeout: 30000
        });

        // Extraer respuesta
        if (provider.extractResponse) {
            return provider.extractResponse(response.data);
        } else {
            return response.data.choices[0].message.content;
        }

    } catch (error) {
        const errorMsg = error.response?.data?.error?.message || error.message;
        console.error(`[AI] Error en ${provider.name}:`, errorMsg);
        
        if (error.response?.status === 401) {
            throw new Error(`API Key de ${provider.name} inválida. Revisa tu .env`);
        }
        if (error.response?.status === 429) {
            throw new Error(`Límite de velocidad de ${provider.name} excedido. Espera unos minutos.`);
        }
        
        throw new Error(`${provider.name}: ${errorMsg}`);
    }
}

// ============================================
// PROMPTS ESPECIALIZADOS PARA REDES SOCIALES
// ============================================

// Prompts optimizados con conocimiento de Meta sobre redes sociales
const SOCIAL_MEDIA_EXPERTISE = `
CONOCIMIENTO ESPECIALIZADO EN REDES SOCIALES:

📊 MÉTRICAS QUE FUNCIONAN EN INSTAGRAM/FACEBOOK:
- Posts con preguntas → +23% engagement
- Carousels (2-10 slides) → 1.4x más alcance que posts simples
- Horarios óptimos: Mar-Vie 10am-3pm (zona horaria del público)
- Hashtags ideales: 5-10 (más de 15 reduce alcance)
- Emojis en caption: +47% interacción
- Call-to-action claro: +35% conversión

🎯 FORMATOS QUE FUNCIONAN:
1. "Antes/Después" → Alto engagement
2. "Tips rápidos" (3-5 puntos) → Alta compartibilidad
3. "Behind the scenes" → Autenticidad
4. "Pregunta abierta" → Comentarios
5. "Datos sorprendentes" → Guardados

💬 TONO POR AUDIENCIA:
- Gen Z (18-24): Informal, memes, autenticidad
- Millennials (25-40): Storytelling, valores, humor inteligente
- Gen X+ (40+): Profesional, valor práctico, claridad

🚫 REGLAS DE HUMANIZACIÓN (EVITAR "MODO IA"):
- NUNCA usar frases como: "En el mundo dinámico de...", "Potencia tu...", "Descubre la magia de...", "Sumérgete en...", "Te invitamos a...".
- EVITAR el exceso de adjetivos innecesarios.
- EVITAR sonar como un asistente virtual.
- USAR lenguaje directo, honesto y conversacional. Habla como un experto apasionado en su rubro.
`;

function getBrandContext(userProfile) {
    if (!userProfile) return '';
    
    const isPersonal = userProfile.account_type === 'personal';
    const name = userProfile.brand_name || userProfile.company || userProfile.name || (isPersonal ? 'Artista' : 'Empresa');
    const businessType = userProfile.brand_industry || userProfile.business_type || 'No especificado';
    const audience = userProfile.brand_audience || userProfile.target_audience || 'No especificado';
    const tone = userProfile.brand_tone || userProfile.brand_voice || 'Profesional';

    // Brain fields
    const dna = userProfile.brand_dna || '';
    const keywords = userProfile.brand_keywords || '';
    const avoid = userProfile.brand_avoid || '';
    const quirks = userProfile.human_quirks || '';
    const emotion = userProfile.target_emotion || '';

    let context = `
--- CEREBRO DE MARCA (IDENTIDAD HUMANA) ---
Nombre: ${name}
Rubro: ${businessType}
Audiencia: ${audience}
Tono: ${tone}
Esencia (DNA): ${dna}
Emoción objetivo: ${emotion}
${keywords ? `Palabras clave permitidas: ${keywords}` : ''}
${avoid ? `PALABRAS PROHIBIDAS (NO USAR): ${avoid}` : ''}
${quirks ? `Expresiones propias/muletillas: ${quirks}` : ''}
------------------------------------------
${isPersonal ? 
    'ESTILO: Habla en primera persona, sé vulnerable, auténtico y directo. No uses lenguaje corporativo.' : 
    'ESTILO: Representa la marca como un equipo de personas expertas y apasionadas.'}
`;

    if (avoid) {
        context += `\nINSTRUCCIÓN CRÍTICA: Bajo ninguna circunstancia uses estas palabras o conceptos: ${avoid}.`;
    }

    return context;
}

// ============================================
// FUNCIONES DE GENERACIÓN
// ============================================

async function generateCaption(description, options = {}) {
    const { 
        tone = 'profesional', 
        platform = 'Instagram', 
        language = 'español', 
        userProfile, 
        imageBase64,
        provider = null 
    } = options;
    
    const brandContext = getBrandContext(userProfile);

    const systemPrompt = `Eres un experto en marketing de redes sociales con un enfoque humano y auténtico.
${SOCIAL_MEDIA_EXPERTISE}
${brandContext}

TAREA: Genera un caption optimizado para ${platform}. 
OBJETIVO: Que el lector sienta que lo escribió una persona real vinculada a la marca, no una IA.

INSTRUCCIONES:
- Usa hooks potentes que resuelvan un problema o despierten curiosidad.
- Usa emojis estratégicamente para enfatizar, no para decorar.
- Estructura el texto con párrafos cortos para facilitar la lectura.
<<<<<<< HEAD
- Termina con un CTA (Call to Action) potente que genere conversación.
- Incluye siempre una lista de 5 a 10 hashtags estratégicos al final del post, separados por espacios.
- Responde SOLO con el contenido del post (caption + hashtags), sin comentarios adicionales ni introducciones.`;
=======
- Termina con un CTA (Call to Action) que genere conversación.
- Responde SOLO con el caption, sin comentarios adicionales.`;
>>>>>>> 0d6074004f5f2f1a157b3bfea43781b84dba81f1


    const userPrompt = `Genera caption para: ${description}`;
    
    return callAI(systemPrompt, userPrompt, { 
        imageBase64, 
        provider,
        temperature: 0.85 
    });
}

async function generateHashtags(description, options = {}) {
    const { 
        count = 20, 
        platform = 'Instagram', 
        language = 'español', 
        userProfile,
        provider = null 
    } = options;
    
    const brandContext = getBrandContext(userProfile);

    const systemPrompt = `Eres un experto en SEO de redes sociales especializado en estrategia de hashtags.
${brandContext}

ESTRATEGIA DE HASHTAGS EFECTIVA:
1. 30% hashtags populares (100k-1M posts) → alcance
2. 40% hashtags medios (10k-100k) → engagement
3. 30% hashtags nicho (<10k) → audiencia específica

IDIOMA: ${language}
PLATAFORMA: ${platform}

Responde SOLO con hashtags separados por espacios, sin números ni explicaciones.`;

    const userPrompt = `Genera ${count} hashtags estratégicos para: ${description}`;
    
    return callAI(systemPrompt, userPrompt, { 
        provider,
        temperature: 0.7 
    });
}

async function generateIdeas(industry, options = {}) {
    const { 
        count = 5, 
        platform = 'Instagram', 
        language = 'español', 
        userProfile,
        provider = null 
    } = options;
    
    const brandContext = getBrandContext(userProfile);

    const systemPrompt = `Eres un estratega de contenido especializado en ${platform}.
${SOCIAL_MEDIA_EXPERTISE}
${brandContext}

IDIOMA: ${language}

Genera ideas creativas basadas en:
- Tendencias actuales de ${platform}
- Formatos con mejor performance
- Contenido que genera conversación

FORMATO DE RESPUESTA:
1. [Título breve]
   Descripción (1-2 líneas)
   Formato: [Post/Reel/Carousel/Story]
   
2. [Título breve]
   ...`;

    const userPrompt = `Genera ${count} ideas de contenido para: ${industry}`;
    
    return callAI(systemPrompt, userPrompt, { 
        provider,
        maxTokens: 1000,
        temperature: 0.9 
    });
}

async function improveText(text, options = {}) {
    const { 
        goal = 'más engagement', 
        platform = 'Instagram', 
        userProfile,
        provider = null 
    } = options;
    
    const brandContext = getBrandContext(userProfile);

    const systemPrompt = `Eres un copywriter experto en optimización de contenido para redes sociales.
${SOCIAL_MEDIA_EXPERTISE}
${brandContext}

OBJETIVO: ${goal}
PLATAFORMA: ${platform}

MEJORAS A APLICAR:
- Refuerza el hook inicial
- Mejora claridad y estructura
- Optimiza emojis
- Añade CTA efectivo
- Mantén la esencia original

Responde SOLO con el texto mejorado, sin explicaciones.`;

    return callAI(systemPrompt, `Mejora este texto: "${text}"`, { provider });
}

// ============================================
// CEREBRO VISUAL (Generación de Prompts para Imágenes)
// ============================================

async function generateVisualPrompt(concept, options = {}) {
    const { userProfile, provider = null } = options;
    const brandContext = getBrandContext(userProfile);

    const style = userProfile.visual_style || 'Realista, alta calidad, luz natural';
    const elements = userProfile.visual_elements || '';

    const systemPrompt = `Eres un experto en "Prompt Engineering" para generadores de imágenes por IA (como Midjourney o DALL-E).
Tu objetivo es traducir una idea simple en un prompt visual profesional alineado con la identidad de la marca.

${brandContext}
ESTILO VISUAL REQUERIDO: ${style}
ELEMENTOS RECURRENTES: ${elements}

INSTRUCCIONES:
- El prompt debe estar en INGLÉS (es el idioma estándar de estas IAs).
- Incluye detalles técnicos: iluminación, ángulo de cámara, texturas y atmósfera.
- Asegúrate de que el prompt refleje la "emoción objetivo" de la marca.
- NO incluyas texto dentro de la imagen.
- Responde SOLO con el prompt en inglés, sin explicaciones.`;

    const userPrompt = `Genera un prompt visual profesional para: ${concept}`;

    return callAI(systemPrompt, userPrompt, { provider, temperature: 0.9, maxTokens: 400 });
}

// ============================================
// MASTER PROMPT (Modo Manual)
// ============================================

function getMasterPrompt(userProfile, type = 'post', input = '') {
    const brandContext = getBrandContext(userProfile);
    
    return `[INSTRUCCIONES DE MARCA]
${brandContext}

[TAREA]
Genera un ${type} para redes sociales sobre el siguiente tema: "${input}"

[REQUISITOS CRÍTICOS]
1. Mantén un tono humano y auténtico. Evita sonar como una IA.
2. Usa hooks que capturen la atención en el primer segundo.
3. Incluye emojis estratégicos.
4. Finaliza con un llamado a la acción que fomente la interacción.
5. Estructura el contenido para una lectura rápida y agradable.`;
}

// ============================================
// ANÁLISIS DE IMAGEN (solo providers compatibles)
// ============================================

async function analyzeImage(imageBase64, options = {}) {
    const { provider = null } = options;
    
    const systemPrompt = `Eres un experto en marketing visual para redes sociales.
Analiza la imagen y describe:
1. Elementos visuales principales
2. Emociones que transmite
3. Sugerencias para el caption
4. Hashtags visuales recomendados

Sé conciso y directo.`;

    const userPrompt = 'Analiza esta imagen y dame insights para crear contenido optimizado.';
    
    return callAI(systemPrompt, userPrompt, { 
        imageBase64, 
        provider: provider || 'groq', // Groq soporta visión
        maxTokens: 500 
    });
}

// ============================================
<<<<<<< HEAD
// GENERACIÓN DE IMÁGENES (Multi-Provider)
// ============================================

async function generateImage(prompt, options = {}) {
    const { provider: requestedProvider = null } = options;
    
    // 1. Determinar provider a usar
    let providerKey = requestedProvider;
    
    if (!providerKey) {
        // Prioridad: Vertex (si está configurado) > Pollinations (siempre disponible)
        providerKey = process.env.GCP_PROJECT_ID ? 'vertex' : 'pollinations';
    }

    const provider = IMAGE_PROVIDERS[providerKey] || IMAGE_PROVIDERS.pollinations;
    
    console.log(`[AI] Generando imagen con: ${provider.name}...`);

    try {
        return await provider.generate(prompt);
    } catch (error) {
        console.warn(`[AI] Falló ${provider.name}:`, error.response?.data?.error?.message || error.message);
        
        // Si falló el solicitado y no es pollinations, intentar pollinations como fallback
        if (providerKey !== 'pollinations') {
            console.log('[AI] Reintentando con Pollinations AI (Gratis)...');
            try {
                return await IMAGE_PROVIDERS.pollinations.generate(prompt);
            } catch (fallbackError) {
                console.error('[AI] Fallback también falló:', fallbackError.message);
            }
        }

        // Si llegamos aquí, dar un error útil
        if (error.response?.data?.error?.code === 403 || error.message.includes('billing')) {
            throw new Error('Google Cloud requiere habilitar facturación. Usa Pollinations o activa el billing en GCP.');
        }
        
        throw new Error(`Error generando imagen (${provider.name}): ${error.message}`);
    }
}

// ============================================
=======
>>>>>>> 0d6074004f5f2f1a157b3bfea43781b84dba81f1
// INFO DE PROVIDERS DISPONIBLES
// ============================================

function getProviderStatus() {
<<<<<<< HEAD
    const status = {
        text: {},
        image: {}
    };
    
    // Status de Texto
    for (const [key, config] of Object.entries(PROVIDERS)) {
        status.text[key] = {
=======
    const status = {};
    
    for (const [key, config] of Object.entries(PROVIDERS)) {
        status[key] = {
>>>>>>> 0d6074004f5f2f1a157b3bfea43781b84dba81f1
            name: config.name,
            model: config.model,
            available: !!process.env[config.apiKeyEnv],
            envVar: config.apiKeyEnv
        };
    }
<<<<<<< HEAD

    // Status de Imagen
    for (const [key, config] of Object.entries(IMAGE_PROVIDERS)) {
        status.image[key] = {
            name: config.name,
            available: config.available,
            envVar: config.apiKeyEnv || 'NONE'
        };
    }
=======
>>>>>>> 0d6074004f5f2f1a157b3bfea43781b84dba81f1
    
    return status;
}

module.exports = { 
    generateCaption, 
    generateHashtags, 
    generateIdeas, 
    improveText,
    generateVisualPrompt,
    getMasterPrompt,
    analyzeImage,
<<<<<<< HEAD
    generateImage,
=======
>>>>>>> 0d6074004f5f2f1a157b3bfea43781b84dba81f1
    callAI,
    getProviderStatus
};

