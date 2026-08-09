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
    async uploadLocalImage(filePath, mediaType = 'IMAGE') {
        try {
            const sharp = require('sharp');
            
            // Obtener metadatos de la imagen original
            const metadata = await sharp(filePath).metadata();
            let { width, height } = metadata;
            console.log(`[INSTAGRAM] Imagen original: ${width}x${height}`);

            let sharpInstance = sharp(filePath);

            if (mediaType === 'STORIES') {
                // Stories: aspecto 9:16 (0.5625), resolución recomendada 1080x1920
                const targetW = 1080;
                const targetH = 1920;
                sharpInstance = sharpInstance
                    .resize(targetW, targetH, { fit: 'cover', position: 'center' });
                console.log(`[INSTAGRAM] Redimensionando a Story: ${targetW}x${targetH}`);
            } else {
                // Feed: aspecto debe estar entre 4:5 (0.8) y 1.91:1
                const currentRatio = width / height;
                const MIN_RATIO = 0.8;   // 4:5 (vertical)
                const MAX_RATIO = 1.91;   // 1.91:1 (horizontal)

                if (currentRatio < MIN_RATIO || currentRatio > MAX_RATIO) {
                    // Recortar al ratio válido más cercano
                    let targetRatio = currentRatio < MIN_RATIO ? MIN_RATIO : MAX_RATIO;
                    let newW, newH;
                    if (currentRatio < MIN_RATIO) {
                        // Imagen demasiado vertical → recortar altura
                        newW = width;
                        newH = Math.round(width / targetRatio);
                    } else {
                        // Imagen demasiado horizontal → recortar ancho
                        newH = height;
                        newW = Math.round(height * targetRatio);
                    }
                    sharpInstance = sharpInstance
                        .resize(newW, newH, { fit: 'cover', position: 'center' });
                    console.log(`[INSTAGRAM] Ratio ${currentRatio.toFixed(2)} fuera de rango. Recortando a ${newW}x${newH} (ratio ${targetRatio})`);
                    width = newW;
                    height = newH;
                }

                // Asegurar ancho entre 320 y 1440px
                if (width > 1440) {
                    const newH = Math.round(1440 * height / width);
                    sharpInstance = sharpInstance.resize(1440, newH, { fit: 'inside' });
                    console.log(`[INSTAGRAM] Reduciendo ancho a 1440px`);
                } else if (width < 320) {
                    const newH = Math.round(320 * height / width);
                    sharpInstance = sharpInstance.resize(320, newH, { fit: 'inside' });
                    console.log(`[INSTAGRAM] Ampliando ancho a 320px`);
                }
            }

            const normalizedBuffer = await sharpInstance
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

    async waitForContainerReady(creationId, maxWaitMs = 30000) {
        const startTime = Date.now();
        while (Date.now() - startTime < maxWaitMs) {
            try {
                const res = await axios.get(`${this.graphUrl}/${creationId}`, {
                    params: {
                        fields: 'status_code,status',
                        access_token: this.accessToken
                    }
                });
                const statusCode = res.data.status_code;
                console.log(`[INSTAGRAM] Estado del contenedor ${creationId}: ${statusCode}`);
                if (statusCode === 'FINISHED') {
                    return true;
                } else if (statusCode === 'ERROR') {
                    throw new Error(`Instagram no pudo procesar la imagen (${res.data.status || 'Error en formato o descarga'}).`);
                }
            } catch (e) {
                if (e.message.includes('Instagram no pudo procesar')) throw e;
                console.warn('[INSTAGRAM] Esperando procesamiento del contenedor...', e.message);
            }
            await new Promise(resolve => setTimeout(resolve, 3000));
        }
        // Si después de 30s no responde FINISHED, intentamos publicar de todos modos o fallamos
        return true;
    }

    /**
     * Flujo completo de publicación
     */
    async processAndPublish(filePath, caption, mediaType = 'IMAGE') {
        console.log(`[INSTAGRAM] 1. Normalizando y subiendo imagen (${mediaType}) a servidor público interino...`);
        const publicUrl = await this.uploadLocalImage(filePath, mediaType);
        
        console.log(`[INSTAGRAM] 1.5. Verificando que la URL sea accesible para Meta...`);
        await this.verifyImageUrlAccessible(publicUrl);

        console.log(`[INSTAGRAM] 2. Creando contenedor ${mediaType} en Meta Graph con URL:`, publicUrl);
        const creationId = await this.createMediaContainer(publicUrl, caption, mediaType);
        
        console.log('[INSTAGRAM] 2.5. Esperando a que Meta termine de procesar el archivo multimedia...');
        await this.waitForContainerReady(creationId);

        console.log('[INSTAGRAM] 3. Publicando en Instagram...');
        const postId = await this.publishMedia(creationId);
        
        console.log('[INSTAGRAM] ✅ Publicación exitosa. ID:', postId);
        return postId;
    }
}

module.exports = InstagramAPI;
