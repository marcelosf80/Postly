// instagram_api.js
const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

class InstagramAPI {
    constructor(pageId, accessToken) {
        this.pageId = pageId;
        this.accessToken = accessToken;
        this.graphUrl = 'https://graph.facebook.com/v19.0';
    }

    /**
     * Sube la imagen local a un servicio público (tmpfiles.org) para obtener una URL pública temporal
     */
    async uploadLocalImage(filePath) {
        try {
            const form = new FormData();
            form.append('file', fs.createReadStream(filePath));
            
            // Usamos tmpfiles.org como host temporal sin auth (máximo 60 minutos o menos)
            const response = await axios.post('https://tmpfiles.org/api/v1/upload', form, {
                headers: {
                    ...form.getHeaders()
                }
            });

            if (response.data && response.data.status === 'success') {
                // Tmpfiles retorna una URL de visualización. Transformamos a descarga directa.
                const viewUrl = response.data.data.url;
                const directUrl = viewUrl.replace('tmpfiles.org/', 'tmpfiles.org/dl/');
                return directUrl;
            }
            throw new Error("Respuesta inválida del servidor de archivos temporal.");
        } catch (error) {
            console.error('[INSTAGRAM] Error subiendo imagen local:', error.message);
            throw new Error('No se pudo generar la URL pública de la imagen.');
        }
    }

    /**
     * Primero: Crear el contenedor de Media en Instagram
     */
    async createMediaContainer(imageUrl, caption, mediaType = 'IMAGE') {
        try {
            const params = {
                image_url: imageUrl,
                access_token: this.accessToken
            };

            // Stories doesn't support caption in the same way as Feed
            if (mediaType === 'STORIES') {
                params.media_type = 'STORIES';
            } else {
                if (caption) params.caption = caption;
            }

            const response = await axios.post(`${this.graphUrl}/${this.pageId}/media`, null, { params });
            return response.data.id; // Retorna el creation_id
        } catch (error) {
            const detail = error.response ? JSON.stringify(error.response.data) : error.message;
            console.error('[INSTAGRAM] Error creando contenedor:', detail);
            throw new Error(`Error al crear el contenedor en Instagram: ${detail}`);
        }
    }

    /**
     * Segundo: Publicar el contenedor en el Feed o Story
     */
    async publishMedia(creationId) {
        try {
            const response = await axios.post(`${this.graphUrl}/${this.pageId}/media_publish`, null, {
                params: {
                    creation_id: creationId,
                    access_token: this.accessToken
                }
            });
            return response.data.id; // Retorna el post id
        } catch (error) {
            const detail = error.response ? JSON.stringify(error.response.data) : error.message;
            console.error('[INSTAGRAM] Error publicando media:', detail);
            throw new Error(`Error al publicar el post en Instagram: ${detail}`);
        }
    }

    /**
     * Flujo completo de publicación
     */
    async processAndPublish(filePath, caption, mediaType = 'IMAGE') {
        console.log(`[INSTAGRAM] 1. Subiendo imagen (${mediaType}) a servidor público interino...`);
        const publicUrl = await this.uploadLocalImage(filePath);
        
        console.log(`[INSTAGRAM] 2. Creando contenedor ${mediaType} en Meta Graph con URL:`, publicUrl);
        const creationId = await this.createMediaContainer(publicUrl, caption, mediaType);
        
        console.log('[INSTAGRAM] 3. Publicando en Instagram...');
        const postId = await this.publishMedia(creationId);
        
        console.log('[INSTAGRAM] ✅ Publicación exitosa. ID:', postId);
        return postId;
    }
}

module.exports = InstagramAPI;
