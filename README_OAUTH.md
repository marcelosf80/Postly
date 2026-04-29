# 🚀 OAuth Meta - Inicio Rápido

## ✅ Lo que acabás de recibir

Tu sistema **SocialPulse** ahora tiene **conexión OAuth automática** con Meta/Facebook para que los usuarios puedan conectar sus cuentas de Instagram Business con un solo click.

---

## 📦 Archivos Nuevos

```
✅ public/js/facebook-oauth.js     → Módulo OAuth completo
✅ verify-oauth-setup.js            → Script de verificación
✅ GUIA_OAUTH_META.md              → Documentación completa
✅ README_OAUTH.md                  → Este archivo
```

---

## ⚡ Inicio Rápido (5 minutos)

### 1️⃣ Configurar URLs en Meta Developer

Ve a tu Panel de Desarrolladores de Meta y selecciona tu App. Luego ve a: **Facebook Login > Settings**

**Agregar en "Valid OAuth Redirect URIs":**
```
http://localhost:3000/
http://localhost:3000/app
```

**Guardar cambios** ✅

### 2️⃣ Iniciar el servidor

```bash
node server.js
```

### 3️⃣ Probar la conexión

1. Abrir: `http://localhost:3000/login`
2. Loguearte o registrarte
3. Ir a **Configuración** (⚙️ en sidebar)
4. Click en **"Conectar con Facebook"**
5. Otorgar permisos
6. ✅ Ver mensaje de éxito con tu Instagram ID

### 4️⃣ Publicar en Instagram

1. Ir a **Crear Post** (➕)
2. Subir imagen
3. Escribir caption
4. Click **"Publicar Ahora"**
5. ✅ Post aparece en tu Instagram Business

---

## 🔍 Verificar que todo esté OK

```bash
node verify-oauth-setup.js
```

Deberías ver: `✅ TODO OK`

---

## 📸 Requisitos Instagram

Tu cuenta de Instagram debe ser:
- ✅ **Business** o **Creator** (no Personal)
- ✅ Vinculada a una **Facebook Page**

**Convertir a Business:**
```
Instagram App → Settings → Account 
→ Switch to Professional Account → Business
```

**Vincular a Facebook:**
```
Instagram → Settings → Business 
→ Linked Accounts → Facebook 
→ Seleccionar tu Fanpage
```

---

## 🎯 Qué hace el sistema automáticamente

Cuando el usuario hace click en "Conectar con Facebook":

1. ✅ Abre ventana de Facebook OAuth
2. ✅ Intercambia token short → long-lived (60 días)
3. ✅ Busca todas las Facebook Pages del usuario
4. ✅ Detecta cuál tiene Instagram Business vinculado
5. ✅ Guarda automáticamente:
   - Instagram Page ID
   - Access Token
   - Facebook Page ID
6. ✅ Usuario puede publicar inmediatamente

**Sin configuración manual necesaria** 🎉

---

## 🐛 Problemas Comunes

### "Given URL is not allowed..."
→ Agregar `http://localhost:3000/` en Valid OAuth Redirect URIs

### No detecta Instagram
→ Verificar que Instagram sea Business y esté vinculado a Facebook Page

### Token expira
→ Volver a conectar (válido por 60 días)

**Ver más soluciones en:** `GUIA_OAUTH_META.md`

---

## 📚 Documentación Completa

- `GUIA_OAUTH_META.md` → Documentación detallada con troubleshooting
- Código comentado en `public/js/facebook-oauth.js`
- Backend OAuth en `routes/auth.js` (línea 236)

---

## 🎨 Interfaz Actualizada

El nuevo botón aparece en **Settings** con:
- Estado de conexión (conectado/no conectado)
- Botón grande "Conectar con Facebook"
- Campos manuales colapsados (para usuarios avanzados)
- Mensaje de éxito automático con los IDs detectados

---

## 🚀 Próximos Pasos Opcionales

### Producción:
1. Configurar dominio real en Meta Developer
2. Agregar Privacy Policy y Terms of Service
3. Solicitar App Review para modo Live

### Features avanzados:
1. Renovación automática de tokens (ver GUIA_OAUTH_META.md)
2. Multi-account support
3. Webhooks para eventos de posts
4. Analytics de publicaciones

---

## ✨ Resumen

**Antes:**
- ❌ Usuario tenía que obtener tokens manualmente
- ❌ Copiar IDs del Graph Explorer
- ❌ Configuración compleja

**Ahora:**
- ✅ 1 click "Conectar con Facebook"
- ✅ Auto-detección de Instagram
- ✅ Publicar inmediatamente

---

**¿Dudas?** Ver `GUIA_OAUTH_META.md` o revisar logs en consola del navegador (F12)

**Última actualización:** Abril 2026
