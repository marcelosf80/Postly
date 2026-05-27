# Guía de Activación: Meta for Developers

El error **"Aplicación no activa"** o **"App not setup"** que apareció al intentar iniciar sesión desde otro celular ocurre porque tu aplicación en el portal de desarrolladores de Meta (Facebook) está actualmente en modo **"Desarrollo"**. 

Mientras la app esté en modo Desarrollo, Meta **solo permite que inicien sesión los administradores de la aplicación o usuarios agregados manualmente como "Testers"**. Cualquier otra persona común recibirá ese error.

Para que **cualquier usuario** pueda descargar la APK e iniciar sesión con su Facebook/Instagram, debes completar estos pasos:

## Paso 1: Configurar Políticas de Privacidad y Condiciones
Meta requiere que toda aplicación pública tenga documentos legales.
1. Ingresa a [developers.facebook.com](https://developers.facebook.com/).
2. Ve a la sección **Mis aplicaciones** y selecciona tu aplicación de Postly.
3. En el menú izquierdo, ve a **Configuración de la app > Información básica**.
4. Busca el campo **URL de la política de privacidad** y **URL de las Condiciones del servicio**.
5. Debes pegar allí enlaces reales hacia tus políticas. Si aún no tienes una página web para Postly, puedes crear un documento público gratuito en Google Docs, publicarlo en la web, y pegar esos enlaces temporalmente.
6. Completa el **Icono de la aplicación** (si aún no lo tiene) y la **Categoría** (por ejemplo, Negocios).
7. Haz clic en **Guardar cambios** abajo de todo.

## Paso 2: Cambiar la app a Modo "En Vivo" (Live)
1. En el mismo panel principal (arriba, junto al nombre de la app), verás un interruptor que dice **"Modo de la aplicación: Desarrollo"**.
2. Haz clic en el botón para pasarlo a **Activo** o **En Vivo** (Live).
3. Meta hará una comprobación rápida. Si la Política de Privacidad está configurada, el interruptor se pondrá en verde.

## Paso 3: Revisión de Permisos Avanzados (App Review)
Este es el paso más importante para las herramientas de publicación como Postly:
Dado que Postly pide permisos sensibles (como leer páginas, publicar en Instagram y publicar en páginas de Facebook), **Meta requiere revisar tu aplicación antes de otorgar esos permisos al público en general**.

1. En el panel izquierdo, ve a **Revisión de aplicaciones > Permisos y funciones**.
2. Busca los siguientes permisos y haz clic en **"Solicitar acceso avanzado"**:
   - `pages_manage_posts`
   - `pages_show_list`
   - `instagram_basic`
   - `instagram_content_publish`
   - `public_profile`
   - `email`
3. Meta te pedirá que llenes un formulario explicando **para qué** usas cada permiso y te pedirá un **Video de demostración** (Screencast) donde grabes tu pantalla usando Postly para vincular la cuenta y hacer una publicación de prueba.
4. Una vez enviado el formulario, la revisión puede demorar desde unos pocos días hasta un par de semanas.

> [!IMPORTANT]
> **Solución Temporal Inmediata (Modo Testers)**
> Si solo quieres probar la app con unas pocas cuentas específicas de tus amigos o equipo mientras haces el trámite de Revisión de la App, no necesitas hacer el Paso 3. Simplemente ve a **Roles de la aplicación > Roles**, baja hasta "Probadores" (Testers) y haz clic en **Agregar probadores**. Ingresa el nombre de Facebook del usuario. A esa persona le llegará una notificación en Facebook que debe aceptar; una vez aceptada, podrá iniciar sesión en la APK sin error.
