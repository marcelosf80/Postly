// config.js - Configuración Standalone para Postly
// NOTA: Esta versión funciona de manera 100% autónoma usando LocalStorage, sin Backend.

const isCapacitor = (
    window.location.protocol === 'capacitor:' ||
    (window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform()) ||
    document.URL.startsWith('https://localhost')
);

// Mantenemos la variable global por si algún viejo componente de la UI la busca
window.API_BASE_URL = '';

console.log('[CONFIG] Entorno:', isCapacitor ? 'Mobile APK (Nativo)' : 'Web Browser');
console.log('[CONFIG] Modo: Standalone 100% (Offline/LocalStorage) con APIs delegadas al Frontend');
