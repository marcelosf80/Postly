// services/ai.js — AI Service (Groq for testing, Claude for production)
const axios = require('axios');

const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const MODEL = process.env.GROQ_MODEL || 'qwen/qwen3.6-27b';

async function callAI(systemPrompt, userPrompt, options = {}) {
    const { temperature = 0.8, maxTokens = 600, imageBase64 = null } = options;

    if (!GROQ_API_KEY) {
        throw new Error('GROQ_API_KEY no configurada. Agregala al archivo .env');
    }

    let payloadModel = MODEL;
    let userMessageContent = userPrompt;

    if (imageBase64) {
        payloadModel = process.env.GROQ_MODEL || 'qwen/qwen3.6-27b';
        userMessageContent = [
            { type: "text", text: userPrompt },
            { type: "image_url", image_url: { url: imageBase64 } }
        ];
    }

    try {
        const response = await axios.post(GROQ_URL, {
            model: payloadModel,
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userMessageContent }
            ],
            temperature,
            max_tokens: maxTokens
        }, {
            headers: {
                'Authorization': `Bearer ${GROQ_API_KEY}`,
                'Content-Type': 'application/json'
            },
            timeout: 30000
        });

        return response.data.choices[0].message.content;
    } catch (error) {
        const groqError = error.response?.data?.error?.message || error.message;
        console.error('[AI] Error oficial de Groq:', groqError);
        
        if (error.response?.status === 401) {
            throw new Error('API Key de Groq inválida. Revisa tu archivo .env');
        }
        if (error.response?.status === 429) {
            throw new Error('Límite de velocidad de Groq excedido. Espera unos minutos.');
        }
        
        throw new Error(`Groq AI: ${groqError}`);
    }
}

// === Funciones específicas de marketing ===

function getBrandContext(userProfile) {
    if (!userProfile) return '';
    
    const isPersonal = userProfile.account_type === 'personal';
    const name = userProfile.company || userProfile.name || (isPersonal ? 'Artista' : 'Empresa');
    
    const businessType = userProfile.business_type || userProfile.brand_industry || 'No especificado';
    const audience = userProfile.target_audience || userProfile.brand_audience || 'No especificado';
    const tone = userProfile.brand_voice || userProfile.brand_tone || 'No especificado';

    let context = `
--- CONTEXTO DEL PERFIL ---
Tipo de Cuenta: ${isPersonal ? 'Marca Personal / Artista' : 'Negocio / Empresa'}
Nombre: ${name}
${isPersonal ? 'Actividad/Arte' : 'Rubro de Negocio'}: ${businessType}
${isPersonal ? 'Comunidad/Seguidores' : 'Público Objetivo'}: ${audience}
Tono deseado: ${tone}
---------------------------
`;

    if (isPersonal) {
        context += `\nINSTRUCCIÓN ESPECIAL: Estás redactando para una PERSONA real (marca personal o artista). Evita sonar corporativo. Usa un lenguaje más humano, auténtico y directo. Si el tono es amigable, puedes usar la primera persona del singular ("yo").`;
    } else {
        context += `\nINSTRUCCIÓN ESPECIAL: Estás redactando para una EMPRESA. Mantén un perfil profesional que represente a la organización, incluso si el tono es amigable.`;
    }

    return context;
}

async function generateCaption(description, options = {}) {
    const { tone = 'profesional', platform = 'Instagram', language = 'español', userProfile, imageBase64 } = options;
    const brandContext = getBrandContext(userProfile);

    const systemPrompt = `Eres un experto en marketing digital y copywriting para redes sociales.${brandContext}
Genera captions atractivos y efectivos para ${platform}.
Tono: ${tone}. Idioma: ${language}.
Incluye emojis relevantes y una lista de hashtags estratégicos al final.
Responde SOLAMENTE con el post completo (caption + hashtags), sin explicaciones ni comillas.`;

    const userPrompt = `Genera un caption para ${platform} sobre: ${description}`;
    return callAI(systemPrompt, userPrompt, { imageBase64 });
}

async function generateHashtags(description, options = {}) {
    const { count = 20, platform = 'Instagram', language = 'español', userProfile } = options;
    const brandContext = getBrandContext(userProfile);

    const systemPrompt = `Eres un experto en marketing digital y SEO de redes sociales.${brandContext}
Genera hashtags efectivos y relevantes para ${platform}.
Mezcla hashtags populares con hashtags de nicho para maximizar alcance.
Idioma preferido: ${language}.
Responde SOLAMENTE con los hashtags separados por espacios, sin explicaciones.`;

    const userPrompt = `Genera ${count} hashtags relevantes para: ${description}`;
    return callAI(systemPrompt, userPrompt, { temperature: 0.6 });
}

async function generateIdeas(industry, options = {}) {
    const { count = 5, platform = 'Instagram', language = 'español', userProfile } = options;
    const brandContext = getBrandContext(userProfile);

    const systemPrompt = `Eres un estratega de contenido digital especializado en ${platform}.${brandContext}
Genera ideas de contenido creativas, tendencias actuales y formatos que funcionan.
Idioma: ${language}.
Responde en formato de lista numerada. Cada idea debe tener:
- Título corto
- Descripción breve (1-2 líneas)
- Formato recomendado (post, reel, carousel, story)`;

    const userPrompt = `Genera ${count} ideas de contenido para la industria/rubro: ${industry}`;
    return callAI(systemPrompt, userPrompt, { maxTokens: 1000 });
}

async function improveText(text, options = {}) {
    const { goal = 'más engagement', platform = 'Instagram', userProfile } = options;
    const brandContext = getBrandContext(userProfile);

    const systemPrompt = `Eres un copywriter experto en redes sociales.${brandContext}
Mejora el texto proporcionado para lograr: ${goal}.
Mantén la esencia del mensaje original pero hazlo más atractivo para ${platform}.
Responde SOLAMENTE con el texto mejorado, sin explicaciones.`;

    return callAI(systemPrompt, `Mejora este texto: "${text}"`);
}

module.exports = { generateCaption, generateHashtags, generateIdeas, improveText, callAI };
