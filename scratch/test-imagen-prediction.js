const { GoogleAuth } = require('google-auth-library');
const axios = require('axios');
const fs = require('fs');
require('dotenv').config();

// Override credentials path to current directory for testing
process.env.GOOGLE_APPLICATION_CREDENTIALS = 'c:\\Postly\\postly-marketing-a789641a87bc.json';
process.env.GCP_PROJECT_ID = 'postly-marketing';

async function test() {
    try {
        console.log("Obteniendo token de acceso GCP...");
        const auth = new GoogleAuth({
            scopes: 'https://www.googleapis.com/auth/cloud-platform'
        });
        const client = await auth.getClient();
        const token = await client.getAccessToken();
        console.log("Token obtenido correctamente.");

        const project = process.env.GCP_PROJECT_ID;
        const location = 'us-central1';
        const url = `https://${location}-aiplatform.googleapis.com/v1/projects/${project}/locations/${location}/publishers/google/models/imagen-3.0-generate-001:predict`;

        console.log("Enviando petición a Imagen 3...");
        const response = await axios.post(url, {
            instances: [{ prompt: "A professional coffee shop flyer, neon lights, 4k" }],
            parameters: {
                sampleCount: 1,
                aspectRatio: '1:1',
                outputMimeType: 'image/jpeg'
            }
        }, {
            headers: {
                'Authorization': `Bearer ${token.token}`,
                'Content-Type': 'application/json'
            }
        });

        if (response.data.predictions && response.data.predictions[0]) {
            console.log("¡Imagen generada exitosamente con Vertex AI!");
            console.log("Longitud de base64:", response.data.predictions[0].bytesBase64Encoded.length);
        } else {
            console.log("Respuesta inesperada:", response.data);
        }
    } catch (e) {
        console.error("Error:", e.response ? e.response.data : e.message);
    }
}

test();
