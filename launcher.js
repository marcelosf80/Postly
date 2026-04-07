const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

console.log('\n  🚀 Iniciando SocialPulse con Túnel Seguro (ngrok)...\n');

// 1. Iniciar Servidor SocialPulse
const server = spawn('node', ['server.js'], { stdio: 'inherit', shell: true });

// 2. Determinar comando de ngrok (local o global)
const isWin = process.platform === 'win32';
const localNgrok = isWin ? './ngrok.exe' : './ngrok';
const ngrokCmd = fs.existsSync(path.join(__dirname, localNgrok)) ? localNgrok : 'ngrok';

console.log(`  [INFO] Usando comando: ${ngrokCmd}`);

// 3. Iniciar ngrok
const ngrok = spawn(ngrokCmd, ['http', '3000'], { shell: true });

async function getNgrokUrl() {
    try {
        const response = await axios.get('http://localhost:4040/api/tunnels');
        const tunnel = response.data.tunnels.find(t => t.proto === 'https');
        return tunnel ? tunnel.public_url : null;
    } catch (e) {
        return null;
    }
}

// Esperar a que ngrok genere la URL y mostrarla
let attempts = 0;
const interval = setInterval(async () => {
    attempts++;
    const url = await getNgrokUrl();
    
    if (url) {
        const { exec } = require('child_process');
        
        clearInterval(interval);
        console.log('  ╔══════════════════════════════════════════════════════╗');
        console.log('  ║                                                      ║');
        console.log('  ║    ✅ ¡SOCIALPULSE ESTÁ ACTIVO!                      ║');
        console.log('  ║                                                      ║');
        console.log(`  ║    🔗 URL Seguro: ${url}           ║`);
        console.log(`  ║    🏠 URL Local:  http://localhost:3000              ║`);
        console.log('  ║                                                      ║');
        console.log('  ║    ⚠️  RECUERDA: Agrega la URL segura en los          ║');
        console.log('  ║        "Dominios de la App" en Meta Developers.      ║');
        console.log('  ║                                                      ║');
        console.log('  ╚══════════════════════════════════════════════════════╝\n');
        
        console.log('  🌍 Abriendo el navegador automáticamente...');
        exec(`start ${url}`);
    } else if (attempts > 20) {
        clearInterval(interval);
        console.log('  ❌ No se pudo detectar la URL de ngrok automáticamente.');
        console.log('     Asegúrate de que ngrok esté instalado y en el PATH.');
    }
}, 1000);

process.on('SIGINT', () => {
    server.kill();
    ngrok.kill();
    process.exit();
});
