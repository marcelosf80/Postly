const express = require('express');
const router = express.Router();
const { MercadoPagoConfig, Preference, Payment } = require('mercadopago');
const { users } = require('../data/store');
const { authMiddleware } = require('../middleware/auth');

// Helper para obtener el cliente de Mercado Pago dinámicamente
function getMPClient() {
    const adminUser = users.findOne({ is_admin: true });
    
    // Si el admin guardó un token, lo usamos.
    if (adminUser && adminUser.mp_access_token) {
        return new MercadoPagoConfig({ accessToken: adminUser.mp_access_token });
    }
    
    // Fallback a variable de entorno
    if (process.env.MP_ACCESS_TOKEN) {
        return new MercadoPagoConfig({ accessToken: process.env.MP_ACCESS_TOKEN });
    }
    
    // Si no hay token configurado
    throw new Error('Pagos no disponibles actualmente. El Administrador debe configurar la pasarela de pago en el Panel.');
}

const PLANS = {
    'unica': { title: '1 Publicación', price: 2000, posts: 1 },
    'semanal': { title: 'Abono Semanal (10 Posts)', price: 10000, posts: 10 },
    'mensual': { title: 'Abono Mensual (60 Posts)', price: 50000, posts: 60 }
};

// ==========================================
// 1. CREAR PREFERENCIA (Generar Checkout)
// ==========================================
router.post('/create-preference', authMiddleware, async (req, res) => {
    try {
        const { planId } = req.body;
        const plan = PLANS[planId];
        
        if (!plan) return res.status(400).json({ error: 'Plan no válido' });

        const client = getMPClient();
        const preference = new Preference(client);
        
        // Detectamos la URL del servidor dinámicamente
        const host = req.headers.host;
        const scheme = req.protocol === 'https' || req.headers['x-forwarded-proto'] === 'https' ? 'https' : 'http';
        const serverUrl = `${scheme}://${host}`;
        
        const isLocalHost = host.includes('localhost') || host.includes('127.0.0.1');

        // Construir cuerpo de la preferencia
        const prefBody = {
            items: [
                {
                    id: planId,
                    title: plan.title,
                    quantity: 1,
                    unit_price: plan.price,
                    currency_id: 'ARS'
                }
            ],
            back_urls: {
                success: `${serverUrl}/app`,
                failure: `${serverUrl}/app`,
                pending: `${serverUrl}/app`
            },
            external_reference: req.user.id
        };

        // Mercado Pago bloquea auto_return si la URL es http://localhost
        if (!isLocalHost) {
            prefBody.auto_return = 'approved';
            prefBody.notification_url = `${serverUrl}/api/billing/webhook`;
        }

        const response = await preference.create({ body: prefBody });

        res.json({ id: response.id, init_point: response.init_point });
    } catch (error) {
        console.error('[BILLING] Error creando preferencia de MP:', error.message || error);
        
        // Si es un error nuestro de configuración, mostramos el mensaje:
        if (error.message && error.message.includes('Pagos no disponibles')) {
            return res.status(400).json({ error: error.message });
        }

        res.status(500).json({ error: error.message || 'Error interno al generar el link de pago.' });
    }
});

// ==========================================
// 2. WEBHOOK (IPN) - Acreditación Automática
// ==========================================
router.post('/webhook', async (req, res) => {
    const { type, data } = req.body;
    
    // Respondemos rápido con OK a Mercado Pago para que sepa que llegó
    res.status(200).send('OK');

    if (type === 'payment' && data && data.id) {
        try {
            const paymentId = data.id;
            const client = getMPClient();
            const payment = new Payment(client);
            const paymentInfo = await payment.get({ id: paymentId });
            
            // Si el pago se acreditó...
            if (paymentInfo.status === 'approved') {
                const userId = paymentInfo.external_reference; // Recuperamos quién era
                const items = paymentInfo.additional_info && paymentInfo.additional_info.items;
                const planId = items ? items[0].id : null;
                
                if (userId && planId) {
                    const user = users.findById(userId);
                    const plan = PLANS[planId];
                    if (user && plan) {
                        // Verificamos en el historial que no hayamos sumado esto antes
                        const txExists = (user.transactions || []).find(t => t.payment_id == paymentId);
                        
                        if (!txExists) {
                            // MAGIA: ¡Sumar saldo automáticamente!
                            const newBalance = (user.posts_remaining || 0) + plan.posts;
                            const newTransaction = {
                                payment_id: paymentId,
                                plan: planId,
                                posts_added: plan.posts,
                                date: new Date().toISOString()
                            };
                            
                            const txs = user.transactions || [];
                            txs.push(newTransaction);
                            
                            users.update(userId, { 
                                posts_remaining: newBalance,
                                transactions: txs
                            });
                            
                            console.log(`[BILLING] 🤑 PAGO ACREDITADO: Se sumaron +${plan.posts} posts al usuario ${user.email}. Saldo: ${newBalance}`);
                        }
                    }
                }
            }
        } catch (error) {
            console.error('[BILLING] Error procesando Webhook IPN:', error.message);
        }
    }
});

module.exports = router;
