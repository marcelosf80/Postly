// facebook_api.js
const axios = require('axios');

class FacebookAPI {
    constructor(pageId, pageAccessToken) {
        this.pageId = pageId;
        this.accessToken = pageAccessToken;
        this.graphUrl = 'https://graph.facebook.com/v19.0';
    }

    /**
     * Publica una imagen con mensaje en el muro de la Página de Facebook
     * @param {string} imageUrl - URL pública de la imagen
     * @param {string} message - El texto del post
     */
    async publishPhoto(imageUrl, message) {
        try {
            console.log(`[FACEBOOK] Publicando en página ${this.pageId}...`);
            const response = await axios.post(`${this.graphUrl}/${this.pageId}/photos`, null, {
                params: {
                    url: imageUrl,
                    message: message,
                    access_token: this.accessToken
                }
            });

            console.log('[FACEBOOK] ✅ Publicación exitosa. ID:', response.data.id);
            return response.data.id;
        } catch (error) {
            const detail = error.response ? JSON.stringify(error.response.data) : error.message;
            console.error('[FACEBOOK] Error publicando foto:', detail);
            throw new Error(`Error al publicar en Facebook: ${detail}`);
        }
    }

    /**
     * Publica solo texto (si no hay imagen)
     */
    async publishText(message) {
        try {
            console.log(`[FACEBOOK] Publicando texto en página ${this.pageId}...`);
            const response = await axios.post(`${this.graphUrl}/${this.pageId}/feed`, null, {
                params: {
                    message: message,
                    access_token: this.accessToken
                }
            });

            console.log('[FACEBOOK] ✅ Publicación de texto exitosa. ID:', response.data.id);
            return response.data.id;
        } catch (error) {
            const detail = error.response ? JSON.stringify(error.response.data) : error.message;
            console.error('[FACEBOOK] Error publicando texto:', detail);
            throw new Error(`Error al publicar texto en Facebook: ${detail}`);
        }
    }
}

module.exports = FacebookAPI;
