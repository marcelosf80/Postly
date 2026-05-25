// services/instagram/instagramUserIdService.js
const axios = require('axios');

const ENDPOINTS = {
    webProfileInfo: (username) =>
        `https://i.instagram.com/api/v1/users/web_profile_info/?username=${username}`,
    oembed: (username) =>
        `https://www.instagram.com/api/v1/oembed/?url=https://www.instagram.com/${username}/`,
};

// Headers que Instagram espera — sin estos devuelve 400/403
const IG_HEADERS = {
    'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
        '(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
    'Accept': '*/*',
    'Accept-Language': 'en-US,en;q=0.9',
    'X-IG-App-ID': '936619743392459', // App ID público del cliente web de Instagram
    'Referer': 'https://www.instagram.com/',
    'Origin': 'https://www.instagram.com',
};

/**
 * Normaliza cualquier formato de input al username limpio.
 * Acepta: "natgeo", "@natgeo", "instagram.com/natgeo", URL completa
 */
function extractUsername(input) {
    const cleaned = input.trim().replace(/^@/, '');
    try {
        const url = cleaned.startsWith('http') ? cleaned : `https://${cleaned}`;
        const parsed = new URL(url);
        if (parsed.hostname.includes('instagram.com') || parsed.hostname.includes('instagr.am')) {
            return parsed.pathname.replace(/\//g, '').split('?')[0];
        }
    } catch {
        // No es URL, es username directo
    }
    return cleaned;
}

/**
 * Intenta obtener el ID vía web_profile_info (endpoint principal).
 */
async function fetchViaWebProfile(username) {
    const response = await axios.get(ENDPOINTS.webProfileInfo(username), {
        headers: IG_HEADERS,
        timeout: 10000,
    });

    const user = response.data?.data?.user;
    if (!user) return null;

    return {
        id: user.id,
        username: user.username,
        fullName: user.full_name,
        isPrivate: user.is_private,
        profilePicUrl: user.profile_pic_url,
        followerCount: user.edge_followed_by?.count,
    };
}

/**
 * Fallback: obtener ID vía oembed (menos datos pero más estable).
 */
async function fetchViaOembed(username) {
    const response = await axios.get(ENDPOINTS.oembed(username), {
        headers: {
            'User-Agent': IG_HEADERS['User-Agent'],
        },
        timeout: 10000,
    });

    const data = response.data;
    if (!data?.author_name) return null;

    return {
        id: data.author_id || null,
        username: data.author_name,
        fullName: data.author_name,
        isPrivate: false,
        profilePicUrl: data.thumbnail_url || null,
        followerCount: null,
    };
}

/**
 * Obtiene el ID numérico de un perfil público de Instagram.
 * Intenta primero con web_profile_info, y si falla, con oembed.
 * 
 * @param {string} usernameOrUrl - Username, @handle, o URL de perfil
 * @returns {Promise<{ id: string, username: string, fullName: string, isPrivate: boolean, profilePicUrl: string, followerCount: number|null }>}
 */
async function getInstagramUserId(usernameOrUrl) {
    const username = extractUsername(usernameOrUrl);

    if (!username || /[^a-zA-Z0-9._]/.test(username)) {
        throw new Error(`Username inválido: "${username}"`);
    }

    // Intento 1: web_profile_info (más completo)
    try {
        const result = await fetchViaWebProfile(username);
        if (result) {
            console.log(`[IG-LOOKUP] ✅ ID obtenido vía web_profile_info: ${result.id} (@${result.username})`);
            return result;
        }
    } catch (err) {
        console.warn(`[IG-LOOKUP] web_profile_info falló para @${username}: ${err.response?.status || err.message}`);
    }

    // Intento 2: oembed (fallback)
    try {
        const result = await fetchViaOembed(username);
        if (result) {
            console.log(`[IG-LOOKUP] ✅ ID obtenido vía oembed: ${result.id} (@${result.username})`);
            return result;
        }
    } catch (err) {
        console.warn(`[IG-LOOKUP] oembed falló para @${username}: ${err.response?.status || err.message}`);
    }

    throw new Error(`No se pudo obtener el ID de Instagram para @${username}. El perfil puede no existir o Instagram bloqueó la solicitud.`);
}

/**
 * Intenta obtener el Instagram Business Account ID vía Graph API (con token OAuth).
 * Este es el método más confiable si el usuario ya tiene un token de Meta.
 * 
 * @param {string} accessToken - Token OAuth de Meta
 * @returns {Promise<{ igBusinessId: string, igUsername: string, pageName: string, pageId: string, pageAccessToken: string }|null>}
 */
async function discoverIGBusinessAccount(accessToken) {
    try {
        const pagesRes = await axios.get(
            `https://graph.facebook.com/v19.0/me/accounts?fields=id,name,access_token,instagram_business_account&access_token=${accessToken}`
        );

        const pages = pagesRes.data?.data || [];
        for (const page of pages) {
            if (page.instagram_business_account) {
                // Fetch IG username from the discovered business account
                let igUsername = '';
                try {
                    const igRes = await axios.get(
                        `https://graph.facebook.com/v19.0/${page.instagram_business_account.id}?fields=username,name,profile_picture_url,followers_count&access_token=${page.access_token}`
                    );
                    igUsername = igRes.data?.username || '';
                } catch { /* non-critical */ }

                return {
                    igBusinessId: page.instagram_business_account.id,
                    igUsername,
                    pageName: page.name,
                    pageId: page.id,
                    pageAccessToken: page.access_token,
                };
            }
        }

        return null;
    } catch (err) {
        console.error('[IG-LOOKUP] Error en discoverIGBusinessAccount:', err.response?.data || err.message);
        return null;
    }
}

module.exports = { getInstagramUserId, extractUsername, discoverIGBusinessAccount };
