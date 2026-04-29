const axios = require('axios');
require('dotenv').config();

async function testV2() {
    console.log('--- TEST GENERACIÓN CON FALLBACK ---');
    try {
        const response = await axios.post('http://localhost:3002/api/ai/generate-image', {
            prompt: 'A futuristic city'
        }, {
            headers: {
                // We need a token. I'll search for one in the data store or use a mock if possible.
                // But the API might require authentication.
            }
        });
        console.log('Respuesta OK:', response.data.imageBase64.substring(0, 50) + '...');
    } catch (e) {
        console.error('Fallo el test:', e.response?.data || e.message);
    }
}
// testV2(); 
// Actually since I can't easily get a token without logging in, I'll test the service directly.

const ai = require('../services/ai-providers');
async function testServiceDirectly() {
    console.log('--- TEST SERVICE DIRECTLY ---');
    try {
        const res = await ai.generateImage('A cute cat');
        console.log('✅ ÉXITO:', res.substring(0, 50) + '...');
    } catch (e) {
        console.error('❌ ERROR:', e.message);
    }
}
testServiceDirectly();
