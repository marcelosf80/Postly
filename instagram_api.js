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
            const sharp = require('sharp');
            const normalizedBuffer = await sharp(filePath)
                .jpeg({ quality: 90 })
                .toBuffer();

            const form = new FormData();
            form.append('reqtype', 'fileupload');
            form.append('fileToUpload', normalizedBuffer, { filename: 'image.jpg', contentType: 'image/jpeg' });
            
            // Usamos catbox.moe como host temporal confiable (retorna URL directa)
            const response = await axios.post('https://catbox.moe/user/api.php', form, {
                headers: {
                    ...form.getHeaders()
                }
            });

            if (response.data && response.data.startsWith('http')) {
                let directUrl = response.data;
                // Forzar HTTPS
                if (directUrl.startsWith('http://')) {
                    directUrl = directUrl.replace('http://', 'https://');
                }
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

    async verifyImageUrlAccessible(imageUrl, timeoutMs = 5000) {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), timeoutMs);

        try {
            const res = await fetch(imageUrl, { method: 'HEAD', signal: controller.signal });
            const contentType = res.headers.get('content-type') || '';
            if (!res.ok || !contentType.startsWith('image/')) {
                throw new Error(`URL no válida para Instagram: status=${res.status}, content-type=${contentType}`);
            }
        } finally {
            clearTimeout(timeout);
        }
    }

    /**
     * Flujo completo de publicación
     */
    async processAndPublish(filePath, caption, mediaType = 'IMAGE') {
        console.log(`[INSTAGRAM] 1. Normalizando y subiendo imagen (${mediaType}) a servidor público interino...`);
        const publicUrl = await this.uploadLocalImage(filePath);
        
        console.log(`[INSTAGRAM] 1.5. Verificando que la URL sea accesible para Meta...`);
        await this.verifyImageUrlAccessible(publicUrl);

        console.log(`[INSTAGRAM] 2. Creando contenedor ${mediaType} en Meta Graph con URL:`, publicUrl);
        const creationId = await this.createMediaContainer(publicUrl, caption, mediaType);
        
        console.log('[INSTAGRAM] 3. Publicando en Instagram...');
        const postId = await this.publishMedia(creationId);
        
        console.log('[INSTAGRAM] ✅ Publicación exitosa. ID:', postId);
        return postId;
    }
}

module.exports = InstagramAPI;
