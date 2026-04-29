// services/email.js — Transactional Email Service
const nodemailer = require('nodemailer');

/**
 * Transactional Email Service
 * Handles sending emails using SMTP or falling back to a mock (console log).
 */
class EmailService {
    constructor() {
        this.isProduction = process.env.NODE_ENV === 'production';
        this.isMock = !process.env.SMTP_HOST || process.env.SMTP_MOCK === 'true';
        
        if (!this.isMock) {
            this.transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST,
                port: parseInt(process.env.SMTP_PORT || 587),
                secure: process.env.SMTP_SECURE === 'true',
                auth: {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASS
                }
            });
        }
    }

    /**
     * Sends an email
     * @param {Object} options { to, subject, html, text }
     */
    async sendEmail({ to, subject, html, text }) {
        const from = process.env.SMTP_FROM || '"SocialPulse Support" <noreply@socialpulse.com>';

        if (this.isMock) {
            console.log('\n--- [EMAIL MOCK] ---');
            console.log(`De: ${from}`);
            console.log(`Para: ${to}`);
            console.log(`Asunto: ${subject}`);
            console.log(`Texto: ${text || 'N/A'}`);
            console.log('--------------------\n');
            return { messageId: 'mock-id-' + Date.now() };
        }

        try {
            const info = await this.transporter.sendMail({
                from,
                to,
                subject,
                text,
                html
            });
            console.log(`[EMAIL] Correo enviado a ${to}: ${info.messageId}`);
            return info;
        } catch (error) {
            console.error('[EMAIL] Error enviando correo:', error);
            throw new Error('No se pudo enviar el correo de notificación.');
        }
    }

    /**
     * Send password reset email
     */
    async sendPasswordReset(user, token) {
        const resetUrl = `${process.env.BASE_URL || 'http://localhost:3000'}/reset-password?token=${token}`;
        
        await this.sendEmail({
            to: user.email,
            subject: 'Recuperar tu contraseña — SocialPulse',
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
                    <h2 style="color: #6366f1;">Recuperación de Contraseña</h2>
                    <p>Hola <strong>${user.name}</strong>,</p>
                    <p>Recibimos una solicitud para restablecer tu contraseña. Si no fuiste tú, puedes ignorar este correo.</p>
                    <p>Haz clic en el siguiente botón para crear una nueva contraseña:</p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${resetUrl}" style="background-color: #6366f1; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Restablecer Contraseña</a>
                    </div>
                    <p style="font-size: 12px; color: #64748b;">El enlace expirará en 1 hora.</p>
                    <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;">
                    <p style="font-size: 11px; color: #94a3b8;">Si tienes problemas con el botón, copia y pega este enlace en tu navegador:<br>${resetUrl}</p>
                </div>
            `,
            text: `Restablece tu contraseña en el siguiente enlace: ${resetUrl}`
        });
    }
}

module.exports = new EmailService();
