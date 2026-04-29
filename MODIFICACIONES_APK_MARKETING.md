# Resumen de Modificaciones: Restauración de Publicación en APK

Este documento detalla los cambios realizados para corregir el fallo de publicación en redes sociales desde la aplicación Android (APK).

## 1. Alineación de Versiones de Meta Graph API
Se detectó que la versión `BETA OLD` (funcional) usaba la **v19.0**, mientras que la nueva usaba la **v21.0**.
- **Archivos modificados:** `facebook_api.js` e `instagram_api.js` (en la raíz).
- **Cambio:** Se revirtió la constante `this.graphUrl` de `v21.0` a `v19.0`.

## 2. Cambio de Arquitectura: de Standalone a Cliente-Servidor
La APK estaba configurada en modo "Standalone/Offline", lo que impedía que el servidor procesara las publicaciones.

### Configuración de Conexión (`public/mobile/js/config.js`)
- Se cambió `window.API_BASE_URL` de una cadena vacía a la URL real del servidor en Render: `https://marketing-4778.onrender.com`.
- Se desactivó el aviso de "Modo Standalone" en la consola para reflejar la conexión activa al backend.

### Sincronización de Tokens de Meta (`public/mobile/js/facebook-oauth.js`)
Originalmente, el login de Meta en la APK solo guardaba el token localmente.
- **Modificación:** Se añadió una llamada `fetch` al endpoint `/api/auth/facebook` del servidor inmediatamente después de un login exitoso.
- **Propósito:** Esto permite que el servidor reciba el `accessToken`, lo extienda a uno de larga duración y descubra automáticamente los IDs de las páginas de Instagram y Facebook vinculadas.

### Lógica de Publicación Real (`public/mobile/js/api.js`)
Se rediseñó el cliente API para que deje de usar simulaciones locales.
- **`publishPost(id)`**: Se eliminó el uso de `navigator.share` (menú de compartir del móvil) y se reemplazó por una petición POST real al servidor: `${window.API_BASE_URL}/api/posts/${id}/publish`.
- **`createPost(formData)`**: Se configuró para que envíe los datos al servidor mediante `FormData` en lugar de guardarlos solo en `localStorage`. Esto asegura que la imagen del post esté físicamente en la carpeta `uploads/` del servidor para que la API de Meta pueda acceder a ella.
- **Modo Híbrido:** Se mantuvo una lógica de fallback por si la `API_BASE_URL` llegara a estar vacía en el futuro.

## 3. Requerimientos para el Servidor (Backend)
Para que esta implementación se mantenga funcional, el servidor debe:
1. Tener acceso a las variables de entorno (`.env`) con los `APP_ID` y `APP_SECRET` correctos.
2. Tener las carpetas `uploads/` y `data/` con permisos de escritura.
3. Estar accesible públicamente (ej. Render, VPS) para que la APK pueda comunicarse desde fuera de la red local.

---
**Antigravity AI Coding Assistant**
*Fecha: 24 de Abril, 2026*
