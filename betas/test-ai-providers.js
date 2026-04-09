// test-ai-providers.js
// Script para probar y comparar diferentes providers de IA

require('dotenv').config();
const { 
    generateCaption, 
    generateHashtags, 
    getProviderStatus 
} = require('./services/ai-providers');

console.log('\n╔══════════════════════════════════════════════════════╗');
console.log('║                                                      ║');
console.log('║  🤖 Test de Providers de IA para SocialPulse       ║');
console.log('║                                                      ║');
console.log('╚══════════════════════════════════════════════════════╝\n');

// 1. Verificar providers disponibles
console.log('📊 Providers disponibles:\n');
const status = getProviderStatus();

for (const [key, info] of Object.entries(status)) {
    const statusEmoji = info.available ? '✅' : '❌';
    const statusText = info.available ? 'Configurado' : 'No configurado';
    console.log(`${statusEmoji} ${info.name}`);
    console.log(`   Modelo: ${info.model}`);
    console.log(`   Variable: ${info.envVar}`);
    console.log(`   Estado: ${statusText}\n`);
}

// 2. Test de generación de caption
async function testCaption() {
    console.log('\n📝 Test de Generación de Caption\n');
    console.log('Prompt: "Nuevo café de especialidad con latte art increíble"\n');
    
    const testPrompt = 'Nuevo café de especialidad con latte art increíble';
    const userProfile = {
        business_type: 'Cafetería',
        target_audience: 'Jóvenes 25-35 años amantes del café',
        brand_voice: 'Amigable y cercano'
    };

    // Probar con el provider por defecto
    try {
        console.log('⏳ Generando caption...\n');
        const startTime = Date.now();
        
        const caption = await generateCaption(testPrompt, {
            tone: 'amigable',
            platform: 'Instagram',
            language: 'español',
            userProfile
        });
        
        const endTime = Date.now();
        const duration = ((endTime - startTime) / 1000).toFixed(2);
        
        console.log('═══════════════════════════════════════════════════════');
        console.log(`✅ Caption generado (${duration}s):\n`);
        console.log(caption);
        console.log('\n═══════════════════════════════════════════════════════\n');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

// 3. Test de generación de hashtags
async function testHashtags() {
    console.log('\n#️⃣ Test de Generación de Hashtags\n');
    console.log('Prompt: "Café de especialidad con arte latte"\n');
    
    try {
        console.log('⏳ Generando hashtags...\n');
        const startTime = Date.now();
        
        const hashtags = await generateHashtags('Café de especialidad con arte latte', {
            count: 15,
            platform: 'Instagram',
            language: 'español'
        });
        
        const endTime = Date.now();
        const duration = ((endTime - startTime) / 1000).toFixed(2);
        
        console.log('═══════════════════════════════════════════════════════');
        console.log(`✅ Hashtags generados (${duration}s):\n`);
        console.log(hashtags);
        console.log('\n═══════════════════════════════════════════════════════\n');
        
    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

// 4. Ejecutar tests
async function runTests() {
    // Verificar que al menos un provider está disponible
    const hasAnyProvider = Object.values(status).some(p => p.available);
    
    if (!hasAnyProvider) {
        console.error('\n❌ ERROR: No hay ningún provider de IA configurado.');
        console.error('\nConfigurá al menos uno en tu archivo .env:\n');
        console.error('  - META_LLAMA_API_KEY (Recomendado - Gratis)');
        console.error('  - GROQ_API_KEY (Rápido - Gratis)');
        console.error('  - OPENAI_API_KEY (Premium - Pago)');
        console.error('  - ANTHROPIC_API_KEY (Premium - Pago)\n');
        console.error('Ver: GUIA_IA_PROVIDERS.md para instrucciones\n');
        process.exit(1);
    }

    await testCaption();
    await testHashtags();
    
    console.log('\n✨ Tests completados exitosamente\n');
    console.log('═══════════════════════════════════════════════════════\n');
    console.log('💡 Tips:\n');
    console.log('1. Para usar Meta Llama: Agregar META_LLAMA_API_KEY al .env');
    console.log('2. Ver guía completa: GUIA_IA_PROVIDERS.md');
    console.log('3. El sistema usa el mejor provider disponible automáticamente\n');
}

// Ejecutar
runTests().catch(error => {
    console.error('\n❌ Error en tests:', error.message);
    process.exit(1);
});
