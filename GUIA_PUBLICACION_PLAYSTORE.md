# Guía de Publicación en Google Play Store — Postly

Este documento contiene toda la información exacta y estructurada que necesitarás copiar y pegar en la consola de **Google Play Console** al momento de preparar el lanzamiento de Postly.

---

## 🎯 1. Ficha de la Tienda (Main Store Listing)

### ✍️ Textos de la Ficha
*   **Nombre de la App (Máx. 30 caracteres):**
    ```text
    Postly - Publicador de Redes
    ```
*   **Descripción Corta (Máx. 80 caracteres):**
    ```text
    Crea, programa y publica tus posts en Instagram y Facebook de forma automática.
    ```
*   **Descripción Larga (Máx. 4000 caracteres):**
    ```text
    Postly es tu asistente definitivo para la gestión de redes sociales. Diseñada específicamente para emprendedores, creadores y marcas que buscan automatizar su presencia digital de forma ágil y profesional.

    Características Principales:
    - 🚀 Publicación Directa y Automática: Programa y publica tus posts, imágenes y reels directamente en tus páginas de Facebook y cuentas comerciales de Instagram sin necesidad de recordatorios ni notificaciones manuales.
    - ✍️ Redactor Creativo con IA: ¿Te falta inspiración? Utiliza nuestro generador de captions integrado con Inteligencia Artificial para obtener copys persuasivos, hashtags relevantes y las mejores sugerencias contextuales en segundos.
    - 📅 Calendario de Contenidos: Visualiza y organiza todas tus publicaciones programadas en un planificador intuitivo.
    - 🎨 Vista Previa en Vivo: Diseña tus posts sabiendo exactamente cómo se verán en el feed real de Instagram antes de hacer clic en enviar.

    Optimiza tu tiempo, incrementa el engagement de tu comunidad y automatiza tu marketing digital con Postly. ¡Descarga la app ahora y lleva tus redes al siguiente nivel!
    ```

### 🖼️ Requisitos de Recursos Gráficos
*   **Ícono de la App:**
    *   Medidas: `512 x 512 píxeles`
    *   Formato: `PNG de 32 bits` (con canal alfa/transparencia)
    *   Peso máximo: `1 MB`
*   **Gráfico de Funciones (Feature Graphic):**
    *   Medidas: `1024 x 500 píxeles`
    *   Formato: `JPG o PNG de 24 bits` (sin transparencia)
    *   Peso máximo: `1 MB`
*   **Capturas de Pantalla (Teléfono):**
    *   Mínimo: `2 capturas` (Recomendable: 4 a 6 capturas de las secciones clave: Creador de Post, Vista Previa, Historial y Ajustes).
    *   Relación de aspecto: `16:9` o `9:16`
    *   Tamaño: Entre `320 px` y `3840 px` por lado.

---

## 🔒 2. Cuestionario de Seguridad de Datos (Data Safety)

Google exige declarar detalladamente qué datos recopila y comparte tu app debido a las librerías de terceros instaladas (**Facebook SDK** para login y **AdMob SDK** para anuncios).

### ➡️ Preguntas Generales
1.  **¿Tu app recopila o comparte alguno de los tipos de datos de usuario requeridos?**
    *   Respuesta: **Sí**
2.  **¿Todos los datos de usuario que recopila tu app se cifran en tránsito?**
    *   Respuesta: **Sí**
3.  **¿Ofreces a los usuarios alguna forma de solicitar la eliminación de sus datos?**
    *   Respuesta: **Sí** (Debes tener un link en tu web de soporte donde el usuario pueda rellenar un formulario para pedir borrar su cuenta).

### 🗂️ Selección de Datos y Propósitos

#### A. Información Personal (Personal Info)
*   **Datos recopilados:**
    *   `Nombre`
    *   `Dirección de correo electrónico`
*   **¿Se comparte este dato?**
    *   **No** (Solo se recopila para la sesión de usuario).
*   **¿Es obligatorio u opcional?**
    *   **Obligatorio** (Es necesario para crear e identificar la cuenta de usuario).
*   **Propósitos de la recopilación:**
    *   `Funcionalidad de la app` (Identificar al usuario).
    *   `Administración de cuentas` (Registro y login).

#### B. Identificadores del Dispositivo (Device or Other IDs) — *Requerido por AdMob*
*   **Datos recopilados:**
    *   `ID del dispositivo u otros identificadores` (ej: ID de publicidad de Google/Ad ID).
*   **¿Se comparte este dato?**
    *   **Sí** (Se comparte con la red publicitaria de Google AdMob).
*   **¿Es obligatorio u opcional?**
    *   **Obligatorio** (Requerido para el funcionamiento del módulo publicitario).
*   **Propósitos de la recopilación:**
    *   `Publicidad o marketing` (Personalización de anuncios y medición de conversión).
    *   `Analíticas` (Seguimiento de rendimiento del banner publicitario).

---

## 🛠️ 3. Otros Cuestionarios Obligatorios (App Content)

### 📌 Acceso a la App (App Access)
Google probará tu aplicación de forma manual. Si requiere inicio de sesión, debes proveerles una cuenta de prueba activa.
*   **Selección:** *"Algunas partes de mi app están restringidas"*
*   **Datos de la cuenta de prueba:**
    *   **Nombre de la instrucción:** Acceso para revisión de Google Play
    *   **Usuario/Email:** `test_playstore@postly.com` (Crea este usuario previamente en tu base de datos).
    *   **Contraseña:** `PlayStore2026!`
    *   **Instrucciones adicionales:** "Iniciar sesión con las credenciales provistas para acceder al dashboard principal de creación y programación de publicaciones."

### 📢 Anuncios (Ads)
*   **Pregunta:** ¿Tu app contiene anuncios?
*   **Respuesta:** **Sí, mi app contiene anuncios** (Declara esto ya que contiene el banner de AdMob).

### 🔞 Clasificación de Contenido (Content Rating)
Rellena el cuestionario como una aplicación de tipo **Social/Red de comunicación / Utilidad**.
*   **Respuestas sugeridas:**
    *   ¿Contiene material violento? **No**
    *   ¿Contiene desnudez o material sexual? **No**
    *   ¿Permite a los usuarios interactuar con otros? **Sí** (Permite publicar contenido en redes externas).
    *   ¿Comparte la ubicación física del usuario con otros? **No**
    *   ¿Permite a los usuarios comprar productos digitales? **No**

### 🎯 Público Objetivo y Contenido (Target Audience)
*   **Rango de edad recomendado:** **Mayor de 18 años** (o 16-17 años).
    *   *Nota:* Si seleccionas rangos menores (ej. niños), Google aplicará reglas extremadamente estrictas de protección de datos familiares que rechazarán la app si usas AdMob. **Mantén el público en mayores de 18 años.**
