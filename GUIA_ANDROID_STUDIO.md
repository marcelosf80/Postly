# 📱 Guía: Compilar Postly APK en Android Studio

## Requisitos Previos

| Herramienta | Versión Mínima | Descarga |
|---|---|---|
| Android Studio | Ladybug (2024+) | [developer.android.com](https://developer.android.com/studio) |
| JDK | 17+ | Incluido en Android Studio |
| Node.js | 18+ | [nodejs.org](https://nodejs.org) |
| npm | 9+ | Incluido con Node.js |

---

## Paso 1: Preparar el Proyecto Web

Antes de abrir Android Studio, necesitás sincronizar los archivos web con el proyecto Android.

```bash
# Desde la raíz del proyecto (c:\marketing)
npm install
npx cap copy android
npx cap sync android
```

> **¿Qué hace cada comando?**
> - `cap copy`: Copia tu carpeta `public/` dentro de `android/app/src/main/assets/public/`
> - `cap sync`: Además de copiar, sincroniza los plugins nativos (como Facebook Login)

---

## Paso 2: Abrir en Android Studio

1. Abrí **Android Studio**
2. Seleccioná **Open** (no "New Project")
3. Navegá hasta `c:\marketing\android` y seleccioná esa carpeta
4. Esperá a que Gradle sincronice (puede tardar 2-5 minutos la primera vez)
5. Si pide actualizar Gradle o AGP, **aceptá las actualizaciones sugeridas**

---

## Paso 3: Generar el Key Hash para Meta

Meta (Facebook) necesita un "Key Hash" para verificar que tu APK es legítima. Hay dos formas de obtenerlo:

### Opción A: Desde Android Studio (Recomendado)
1. En Android Studio, abrí la pestaña **Gradle** (barra lateral derecha)
2. Navegá a: `app > Tasks > android > signingReport`
3. Hacé doble click en `signingReport`
4. En la consola de abajo, buscá la línea `SHA1:`
5. Copiá ese valor SHA1

### Opción B: Desde la Terminal
```bash
keytool -exportcert -alias androiddebugkey -keystore "%USERPROFILE%\.android\debug.keystore" -storepass android | openssl dgst -sha1 -binary | openssl base64
```

---

## Paso 4: Configurar Meta for Developers

1. Entrá a [Meta for Developers](https://developers.facebook.com)
2. Seleccioná tu App **Postly** (ID: `2217261002140935`)
3. Andá a **Configuración > Básica**
4. Hacé click en **Agregar Plataforma > Android**
5. Completá:

| Campo | Valor |
|---|---|
| Nombre del Paquete | `com.socialpulse.marketing` |
| Clase de Actividad Principal | `com.socialpulse.marketing.MainActivity` |
| Key Hash | (el que obtuviste en el Paso 3) |
| Single Sign On | ✅ Sí |

6. **Guardá los cambios**

---

## Paso 5: Compilar la APK

### Desde Android Studio (GUI)
1. Menú **Build > Build Bundle(s) / APK(s) > Build APK(s)**
2. Esperá a que termine
3. Click en **"locate"** en la notificación que aparece abajo

### Desde la Terminal
```bash
cd android
gradlew assembleDebug
```

La APK estará en:
```
android\app\build\outputs\apk\debug\app-debug.apk
```

### Script Automático
También podés usar el script incluido:
```bash
BUILD_APK.bat
```

---

## Paso 6: Instalar en un Dispositivo

### Desde Android Studio
1. Conectá tu teléfono por USB
2. Habilitá **Opciones de Desarrollador > Depuración USB**
3. Seleccioná tu dispositivo en el dropdown de arriba
4. Click en ▶️ (Run)

### Desde la Terminal
```bash
adb install android\app\build\outputs\apk\debug\app-debug.apk
```

### Via WhatsApp/Email
Simplemente mandá el archivo `app-debug.apk` y abrilo desde el teléfono.

---

## Cómo Funciona el Login con Meta (SSO)

Cuando el usuario toca **"Continuar con Meta"** en la APK:

```
┌─────────────┐     ┌──────────────┐     ┌─────────────────┐
│  App Postly  │────▶│ Facebook SDK │────▶│  Facebook App   │
│  (Capacitor) │     │  (Nativo)    │     │  (Permisos)     │
└─────────────┘     └──────────────┘     └────────┬────────┘
                                                   │
                         Token de acceso ◀─────────┘
                                │
                    ┌───────────▼───────────┐
                    │  Backend (server.js)   │
                    │  POST /api/auth/facebook│
                    ├────────────────────────┤
                    │ 1. Exchange token      │
                    │    (60 días)           │
                    │ 2. Auto-discovery:     │
                    │    - Páginas de FB     │
                    │    - Instagram Business│
                    │ 3. Token de página     │
                    │    (No expira)         │
                    │ 4. Crear/Login usuario │
                    └───────────┬────────────┘
                                │
                    ┌───────────▼───────────┐
                    │  Usuario logueado +    │
                    │  Redes configuradas    │
                    │  automáticamente ✅     │
                    └───────────────────────┘
```

### Permisos que se solicitan:

| Permiso | Para qué |
|---|---|
| `email` | Login e identificación |
| `public_profile` | Nombre y avatar |
| `pages_manage_posts` | Publicar en Facebook |
| `pages_read_engagement` | Leer métricas |
| `instagram_basic` | Acceder a Instagram |
| `instagram_content_publish` | Publicar en Instagram |
| `business_management` | Vincular cuentas business |
| `pages_show_list` | Listar páginas del usuario |

---

## Seguridad de Red

La APK está configurada con `network_security_config.xml`:

- ✅ **Solo HTTPS** para todas las conexiones en producción
- ✅ **HTTP permitido** solo para `localhost` y emulador (desarrollo)
- ✅ **Certificados del sistema** para validar conexiones TLS
- ✅ **Tokens encriptados** vía JWT con expiración

---

## Troubleshooting

### "No se pudo conectar al servidor"
- Verificá que `capacitor.config.json` apunte al backend correcto
- Verificá que el backend esté corriendo en producción

### "Login con Facebook no funciona"
- Verificá el Key Hash en Meta for Developers
- Verificá que `facebook_app_id` en `strings.xml` coincida
- Verificá que la app de Meta esté en modo "Live" (no "Development")

### "Error de permisos de Instagram"
- Tu app de Meta necesita pasar el **App Review** para permisos avanzados
- Mientras tanto, agregá usuarios de prueba en Meta for Developers > Roles
