// services/ai-providers.js — Multi-Provider AI Service
// Soporta: Meta AI (Llama), Groq, OpenAI, Claude

const axios = require('axios');

// ============================================
// CONFIGURACIÓN DE PROVIDERS
// ============================================

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
    }
};

// ============================================
// DETECTAR MEJOR PROVIDER DISPONIBLE
// ============================================

function getAvailableProvider() {
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

🚫 EVITAR:
- Exceso de hashtags genéricos (#love #instagood)
- Múltiples CTAs en un post
- Textos >2200 caracteres (corta lectura)
- Emojis sin contexto
`;

function getBrandContext(userProfile) {
    if (!userProfile) return '';
    
    const isPersonal = userProfile.account_type === 'personal';
    const name = userProfile.company || userProfile.name || (isPersonal ? 'Artista' : 'Empresa');
    const businessType = userProfile.business_type || 'No especificado';
    const audience = userProfile.target_audience || 'No especificado';
    const tone = userProfile.brand_voice || 'Profesional';

    return `
--- CONTEXTO DE MARCA ---
Tipo: ${isPersonal ? 'Marca Personal' : 'Empresa'}
Nombre: ${name}
Rubro: ${businessType}
Audiencia: ${audience}
Tono: ${tone}
-------------------------
${isPersonal ? 
    'ESTILO: Primera persona, auténtico, humano (evita sonar corporativo)' : 
    'ESTILO: Representa la organización profesionalmente'}
`;
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

    const systemPrompt = `Eres un experto en marketing de redes sociales con años de experiencia en Meta (Facebook/Instagram).
${SOCIAL_MEDIA_EXPERTISE}
${brandContext}

TAREA: Genera un caption optimizado para ${platform}.
TONO: ${tone}
IDIOMA: ${language}

INSTRUCCIONES:
- Usa emojis estratégicamente (no en exceso)
- Primera línea debe enganchar (hook)
- Incluye pregunta o CTA al final
- Máximo 2000 caracteres
- NO incluyas hashtags (se generan aparte)
- Responde SOLO con el caption, sin explicaciones ni comillas`;

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
// INFO DE PROVIDERS DISPONIBLES
// ============================================

function getProviderStatus() {
    const status = {};
    
    for (const [key, config] of Object.entries(PROVIDERS)) {
        status[key] = {
            name: config.name,
            model: config.model,
            available: !!process.env[config.apiKeyEnv],
            envVar: config.apiKeyEnv
        };
    }
    
    return status;
}

module.exports = { 
    generateCaption, 
    generateHashtags, 
    generateIdeas, 
    improveText,
    analyzeImage,
    callAI,
    getProviderStatus
};
