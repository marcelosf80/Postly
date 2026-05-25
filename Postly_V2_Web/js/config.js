// config.js - Configuración Standalone para Postly
// NOTA: Esta versión funciona de manera 100% autónoma usando LocalStorage, sin Backend.

const isCapacitor = (
    window.location.protocol === 'capacitor:' ||
    (window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()) ||
    document.URL.startsWith('https://localhost')
);

// Mantenemos la variable global. ¡IMPORTANTE!: Cambia esta URL por la de tu servidor de Render una vez la tengas.
window.API_BASE_URL = "https://marketing-4778.onrender.com"; 

console.log('[CONFIG] Entorno:', isCapacitor ? 'Mobile APK (Nativo)' : 'Web Browser');
console.log('[CONFIG] Modo: Conectado a Servidor (Backend)');
