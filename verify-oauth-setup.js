// verify-oauth-setup.js
// Script para verificar que la configuración OAuth esté completa

require('dotenv').config();
const fs = require('fs');
const path = require('path');

console.log('\n╔══════════════════════════════════════════════════════╗');
console.log('║                                                      ║');
console.log('║  🔍 Verificación de Configuración OAuth Meta        ║');
console.log('║                                                      ║');
console.log('╚══════════════════════════════════════════════════════╝\n');

let errors = 0;
let warnings = 0;

// 1. Verificar .env
console.log('📄 Verificando archivo .env...');
if (!process.env.FACEBOOK_APP_ID) {
    console.error('   ❌ FACEBOOK_APP_ID no configurado en .env');
    errors++;
} else {
    console.log(`   ✅ FACEBOOK_APP_ID: ${process.env.FACEBOOK_APP_ID}`);
}

if (!process.env.FACEBOOK_APP_SECRET) {
    console.error('   ❌ FACEBOOK_APP_SECRET no configurado en .env');
    errors++;
} else {
    console.log(`   ✅ FACEBOOK_APP_SECRET: ${process.env.FACEBOOK_APP_SECRET.substring(0, 10)}...`);
}

console.log('');

// 2. Verificar archivos necesarios
console.log('📁 Verificando archivos...');

const requiredFiles = [
    'public/js/facebook-oauth.js',
    'public/app.html',
    'routes/auth.js',
    'instagram_api.js'
];

requiredFiles.forEach(file => {
    const filePath = path.join(__dirname, file);
    if (fs.existsSync(filePath)) {
        console.log(`   ✅ ${file}`);
    } else {
        console.error(`   ❌ ${file} NO ENCONTRADO`);
        errors++;
    }
});

console.log('');

// 3. Verificar que app.html tenga el script
console.log('🔗 Verificando integración en app.html...');
const appHtmlPath = path.join(__dirname, 'public/app.html');
if (fs.existsSync(appHtmlPath)) {
    const appHtml = fs.readFileSync(appHtmlPath, 'utf-8');
    
    if (appHtml.includes('facebook-oauth.js')) {
        console.log('   ✅ Script facebook-oauth.js incluido en app.html');
    } else {
        console.error('   ❌ Script facebook-oauth.js NO incluido en app.html');
        errors++;
    }
} else {
    console.error('   ❌ app.html no encontrado');
    errors++;
}

console.log('');

// 4. Verificar endpoint OAuth en backend
console.log('🌐 Verificando endpoint OAuth...');
const authRoutePath = path.join(__dirname, 'routes/auth.js');
if (fs.existsSync(authRoutePath)) {
    const authCode = fs.readFileSync(authRoutePath, 'utf-8');
    
    if (authCode.includes('/facebook') && authCode.includes('fb_exchange_token')) {
        console.log('   ✅ Endpoint /api/auth/facebook configurado correctamente');
    } else {
        console.error('   ❌ Endpoint /api/auth/facebook incompleto');
        errors++;
    }
} else {
    console.error('   ❌ routes/auth.js no encontrado');
    errors++;
}

console.log('');

// 5. Verificar dependencias npm
console.log('📦 Verificando dependencias npm...');
const packageJsonPath = path.join(__dirname, 'package.json');
if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    const deps = { ...packageJson.dependencies, ...packageJson.devDependencies };
    
    const requiredDeps = ['axios', 'dotenv', 'express'];
    requiredDeps.forEach(dep => {
        if (deps[dep]) {
            console.log(`   ✅ ${dep}: ${deps[dep]}`);
        } else {
            console.error(`   ❌ ${dep} no instalado`);
            errors++;
        }
    });
}

console.log('');

// 6. Verificar estructura de datos
console.log('💾 Verificando estructura de datos...');
const usersPath = path.join(__dirname, 'data/users.json');
if (fs.existsSync(usersPath)) {
    const users = JSON.parse(fs.readFileSync(usersPath, 'utf-8'));
    
    if (users.length > 0) {
        const sampleUser = users[0];
        const requiredFields = ['ig_page_id', 'ig_access_token', 'fb_page_id', 'fb_access_token'];
        
        const hasAllFields = requiredFields.every(field => field in sampleUser);
        
        if (hasAllFields) {
            console.log('   ✅ Estructura de usuarios correcta');
        } else {
            console.warn('   ⚠️  Algunos campos de OAuth faltan en usuarios existentes');
            console.warn('      (Se agregarán automáticamente al conectar)');
            warnings++;
        }
    } else {
        console.log('   ℹ️  No hay usuarios registrados aún');
    }
} else {
    console.warn('   ⚠️  data/users.json no existe (se creará automáticamente)');
    warnings++;
}

console.log('');

// 7. Próximos pasos
console.log('📋 Próximos pasos:\n');

if (errors === 0) {
    console.log('   ✅ Configuración OAuth completa');
    console.log('');
    console.log('   Para probar:');
    console.log('   1. Ejecutar: node server.js');
    console.log('   2. Abrir: http://localhost:3000/login');
    console.log('   3. Registrarte o loguearte');
    console.log('   4. Ir a Configuración (⚙️)');
    console.log('   5. Click en "Conectar con Facebook"');
    console.log('');
    console.log('   IMPORTANTE:');
    console.log('   - Configurar URLs en Meta Developer:');
    console.log(`     https://developers.facebook.com/apps/${process.env.FACEBOOK_APP_ID || 'TU_APP_ID'}/settings/basic/`);
    console.log('   - Agregar http://localhost:3000/ en "Valid OAuth Redirect URIs"');
    console.log('');
} else {
    console.error(`\n   ❌ Encontrados ${errors} errores críticos`);
    console.error('   Revisar los puntos marcados arriba y corregir\n');
}

if (warnings > 0) {
    console.warn(`   ⚠️  ${warnings} advertencias (no críticas)\n`);
}

// Resumen final
console.log('═══════════════════════════════════════════════════════\n');
console.log(`Resumen: ${errors === 0 ? '✅ TODO OK' : `❌ ${errors} errores`} | ${warnings} advertencias\n`);

process.exit(errors > 0 ? 1 : 0);
