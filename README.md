# SocialPulse — Marketing Automation SaaS

SocialPulse es una plataforma SaaS diseñada para la automatización de marketing y gestión de redes sociales enriquecida con Inteligencia Artificial. Permite a los usuarios generar contenido persuasivo, programar publicaciones y gestionar su presencia en Instagram y Facebook de manera eficiente.

## 🚀 Características Principales

- **Generación de Contenido con IA**: Integración con múltiples proveedores de IA para crear captions y contenido optimizado.
- **Gestión Multi-Plataforma**: Publicación directa y programación en Instagram y Facebook.
- **Programación de Posts**: Calendario de publicaciones inteligente con estados de borrador, programado y publicado.
- **Autenticación Segura**: Sistema de login local y soporte para Google OAuth.
- **Gestión de Planes y Pagos**: Integración con MercadoPago para la suscripción de usuarios y límites de publicación.
- **Dashboard Intuitivo**: Interfaz moderna para el seguimiento de métricas y gestión de activos visuales.

## 🛠️ Stack Tecnológico

- **Backend**: Node.js, Express.
- **Base de Datos**: Sistema de almacenamiento optimizado basado en archivos JSON (fase actual).
- **Frontend**: Vanilla JavaScript (ES6+), HTML5, CSS3.
- **Integraciones**:
    - Meta Graph API (Instagram & Facebook).
    - Google OAuth 2.0.
    - MercadoPago Checkout Pro.
    - AI Providers (Groq, Gemini, Ollama).

## 📋 Requisitos Previos

- Node.js (v16 o superior)
- npm o yarn
- Credenciales de desarrollador de Meta (Facebook App ID/Secret).
- Google Client ID (para Auth).
- Token de acceso de MercadoPago.

## ⚙️ Configuración Inicial

1. Clona el repositorio:
   ```bash
   git clone <URL_DEL_REPOSITORIO>
   cd Marketing-1
   ```

2. Instala las dependencias:
   ```bash
   npm install
   ```

3. Configura las variables de entorno:
   Crea un archivo `.env` basado en `.env.example` y completa las claves necesarias:
   ```env
   PORT=3000
   JWT_SECRET=tu_secreto_aqui
   GOOGLE_CLIENT_ID=...
   FACEBOOK_APP_ID=...
   ```

4. Inicia el servidor:
   ```bash
   npm run dev
   ```

## 📂 Estructura del Proyecto

- `/routes`: Endpoints de la API (Auth, Posts, AI, Billing).
- `/services`: Lógica de negocio e integración con APIs externas.
- `/public`: Interfaz de usuario y activos estáticos.
- `/data`: Archivos de almacenamiento de datos.
- `/middleware`: Filtros de seguridad y autenticación.
- `/uploads`: Directorio para imágenes subidas por los usuarios.

## 🔒 Auditoría y Seguridad

El sistema cuenta con una auditoría completa detallada en [audit_report.md](./audit_report.md) (para entorno de desarrollo). Se recomienda implementar un motor de base de datos relacional para entornos de producción masivos.

## 📄 Licencia

Este proyecto está bajo la licencia [MIT](LICENSE).
