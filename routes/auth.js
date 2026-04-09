// routes/auth.js — Authentication Routes
const express = require('express');
const bcrypt = require('bcryptjs');
const { users } = require('../data/store');
const { authMiddleware, generateToken } = require('../middleware/auth');
const { OAuth2Client } = require('google-auth-library');
const axios = require('axios');

const router = express.Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// POST /api/auth/register
router.post('/register', async (req, res) => {
    try {
        const { email, password, name, company, country } = req.body;

        if (!email || !password || !name) {
            return res.status(400).json({ error: 'Email, contraseña y nombre son obligatorios.' });
        }

        if (password.length < 6) {
            return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres.' });
        }

        // Check if email already exists
        const existing = users.findOne({ email: email.toLowerCase() });
        if (existing) {
            return res.status(409).json({ error: 'Ya existe una cuenta con ese email.' });
        }

        // Hash password
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        // Create user
        const user = users.create({
            email: email.toLowerCase(),
            password_hash,
            name,
            company: company || '',
            country: country || 'AR',
            plan: 'free',
            subscription_status: 'trial',
            trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(), // 14 days
            ig_page_id: '',
            ig_access_token: '',
            fb_page_id: '',
            fb_access_token: '',
            posts_this_month: 0,
            avatar_color: `hsl(${Math.floor(Math.random() * 360)}, 70%, 60%)`,
            onboarding_completed: false,
            account_type: 'business',
            business_type: '',
            target_audience: '',
            brand_voice: ''
        });

        // Generate token
        const token = generateToken(user);

        // Don't send password hash back
        const { password_hash: _, ...safeUser } = user;

        res.status(201).json({
            message: 'Cuenta creada exitosamente.',
            token,
            user: safeUser
        });
    } catch (error) {
        console.error('[AUTH] Error en registro:', error);
        res.status(500).json({ error: 'Error interno al crear la cuenta.' });
    }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ error: 'Email y contraseña son obligatorios.' });
        }

        // Find user
        const user = users.findOne({ email: email.toLowerCase() });
        if (!user) {
            return res.status(401).json({ error: 'Email o contraseña incorrectos.' });
        }

        // Verify password
        const isValid = await bcrypt.compare(password, user.password_hash);
        if (!isValid) {
            return res.status(401).json({ error: 'Email o contraseña incorrectos.' });
        }

        // Generate token
        const token = generateToken(user);
        const { password_hash: _, ...safeUser } = user;

        res.json({
            message: 'Login exitoso.',
            token,
            user: safeUser
        });
    } catch (error) {
        console.error('[AUTH] Error en login:', error);
        res.status(500).json({ error: 'Error interno al iniciar sesión.' });
    }
});

// GET /api/auth/me — Get current user profile
router.get('/me', authMiddleware, (req, res) => {
    const user = users.findById(req.user.id);
    if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado.' });
    }
    const { password_hash: _, ...safeUser } = user;
    res.json({ user: safeUser });
});

// PUT /api/auth/profile — Update profile
router.put('/profile', authMiddleware, (req, res) => {
    const { name, company, country, ig_page_id, ig_access_token, fb_page_id, fb_access_token, mp_access_token, mp_public_key } = req.body;

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (company !== undefined) updates.company = company;
    if (country !== undefined) updates.country = country;
    if (ig_page_id !== undefined) updates.ig_page_id = ig_page_id;
    if (ig_access_token !== undefined) updates.ig_access_token = ig_access_token;
    if (fb_page_id !== undefined) updates.fb_page_id = fb_page_id;
    if (fb_access_token !== undefined) updates.fb_access_token = fb_access_token;
    
    // Solo admins pueden guardar el token de Mercado Pago
    const currentUser = users.findById(req.user.id);
    if (currentUser && currentUser.is_admin) {
        if (mp_access_token !== undefined) updates.mp_access_token = mp_access_token;
        if (mp_public_key !== undefined) updates.mp_public_key = mp_public_key;
    }

    console.log(`[AUTH] Actualizando perfil para usuario ${req.user.id}:`, updates);
    const updated = users.update(req.user.id, updates);
    if (!updated) {
        return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    const { password_hash: _, ...safeUser } = updated;
    res.json({ message: 'Perfil actualizado.', user: safeUser });
});

// POST /api/auth/google — Verify Google token and login/register
router.post('/google', async (req, res) => {
    try {
        const { credential } = req.body;
        if (!credential) return res.status(400).json({ error: 'Token de Google requerido.' });

        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID
        });
        const payload = ticket.getPayload();
        const email = payload.email.toLowerCase();

        // Check if user exists
        let user = users.findOne({ email });

        if (!user) {
            // Create user from Google payload
            user = users.create({
                email,
                password_hash: '', // No password since it's Google Auth
                name: payload.name,
                company: '',
                country: 'AR',
                plan: 'free',
                subscription_status: 'trial',
                trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
                ig_page_id: '',
                ig_access_token: '',
                fb_page_id: '',
                fb_access_token: '',
                posts_this_month: 0,
                posts_remaining: 5,
                transactions: [],
                avatar_color: `hsl(${Math.floor(Math.random() * 360)}, 70%, 60%)`,
                avatar_url: payload.picture || '',
                onboarding_completed: false,
                business_type: '',
                target_audience: '',
                brand_voice: '',
                auth_provider: 'google'
            });
        }

        // Generate token
        const token = generateToken(user);
        
        // Update avatar if it changed or wasn't set (for existing users)
        if (payload.picture && user.avatar_url !== payload.picture) {
            user = users.update(user.id, { avatar_url: payload.picture });
        }

        const { password_hash: _, ...safeUser } = user;

        res.json({
            message: 'Login exitoso con Google.',
            token,
            user: safeUser
        });
    } catch (error) {
        console.error('[AUTH] Error en login Google:', error);
        res.status(401).json({ error: 'Fallo al autenticar con Google. Revisa tu Client ID.' });
    }
});

// POST /api/auth/onboarding — Save business profile and complete onboarding
router.post('/onboarding', authMiddleware, (req, res) => {
    const { business_type, target_audience, brand_voice, account_type } = req.body;

    const updates = {
        business_type: business_type || '',
        target_audience: target_audience || '',
        brand_voice: brand_voice || '',
        account_type: account_type || 'business',
        onboarding_completed: true
    };

    const updated = users.update(req.user.id, updates);
    if (!updated) {
        return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    const { password_hash: _, ...safeUser } = updated;
    res.json({ message: 'Onboarding completado.', user: safeUser });
});

// POST /api/auth/facebook — Verify Facebook token and auto-sync IDs
router.post('/facebook', async (req, res) => {
    try {
        const { accessToken } = req.body;
        if (!accessToken) return res.status(400).json({ error: 'Token de Facebook requerido.' });

        const appId = process.env.FACEBOOK_APP_ID;
        const appSecret = process.env.FACEBOOK_APP_SECRET;

        // 1. Exchange for long-lived token (60 days)
        const exchangeUrl = `https://graph.facebook.com/v19.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${accessToken}`;
        const exchangeRes = await axios.get(exchangeUrl);
        const longToken = exchangeRes.data.access_token;

        // 2. Fetch User Info (Email and Picture)
        const meUrl = `https://graph.facebook.com/v19.0/me?fields=id,name,email,picture.type(large)&access_token=${longToken}`;
        const meRes = await axios.get(meUrl);
        const { email, name: fbName, picture } = meRes.data;
        const fbAvatarUrl = picture && picture.data ? picture.data.url : '';

        if (!email) {
            return res.status(400).json({ error: 'No pudimos obtener tu email de Facebook. Asegúrate de dar los permisos necesarios.' });
        }

        // 3. AUTO-DISCOVERY: Fetch Pages and Instagram IDs
        let ig_page_id = '';
        let ig_access_token = '';
        
        // Fetch Pages managed by user
        const pagesUrl = `https://graph.facebook.com/v19.0/me/accounts?access_token=${longToken}`;
        const pagesRes = await axios.get(pagesUrl);
        const pages = pagesRes.data.data;

        if (pages && pages.length > 0) {
            console.log(`[AUTH] Buscando Instagram vinculado en ${pages.length} páginas...`);
            
            for (const page of pages) {
                // Check if page has an Instagram Business Account
                const igUrl = `https://graph.facebook.com/v19.0/${page.id}?fields=instagram_business_account&access_token=${page.access_token}`;
                try {
                    const igRes = await axios.get(igUrl);
                    if (igRes.data.instagram_business_account) {
                        ig_page_id = igRes.data.instagram_business_account.id;
                        ig_access_token = page.access_token;
                        console.log(`[AUTH] ✅ Instagram encontrado: ${ig_page_id} vinculado a la página: ${page.name}`);
                        break;
                    }
                } catch (e) {
                    console.warn(`[AUTH] No se pudo consultar IG en la página ${page.name}`);
                }
            }
        }

        // 4. Update or Create User
        let user = users.findOne({ email: email.toLowerCase() });
        const fb_page_id = pages && pages[0] ? pages[0].id : '';
        const fb_access_token = pages && pages[0] ? pages[0].access_token : '';

        console.log(`[AUTH] Descubrimiento Meta p/ ${email}: IG=${ig_page_id}, FB=${fb_page_id}, Avatar=${fbAvatarUrl ? 'SI' : 'NO'}`);

        const updates = {
            ig_page_id: ig_page_id || (user ? user.ig_page_id : ''),
            ig_access_token: ig_access_token || (user ? user.ig_access_token : ''),
            fb_page_id: fb_page_id || (user ? user.fb_page_id : ''),
            fb_access_token: fb_access_token || (user ? user.fb_access_token : ''),
            name: user ? user.name : fbName,
            avatar_url: fbAvatarUrl || (user ? user.avatar_url : ''),
            auth_provider: 'facebook'
        };

        if (!user) {
            user = users.create({
                email: email.toLowerCase(),
                password_hash: '',
                name: fbName,
                company: '',
                country: 'AR',
                plan: 'free',
                subscription_status: 'trial',
                trial_ends_at: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
                ...updates,
                onboarding_completed: false,
                posts_this_month: 0,
                avatar_color: `hsl(${Math.floor(Math.random() * 360)}, 70%, 60%)`
            });
            console.log(`[AUTH] Nuevo usuario creado vía Meta: ${email}`);
        } else {
            console.log(`[AUTH] Actualizando usuario existente vía Meta: ${email}`);
            user = users.update(user.id, updates);
        }

        // 5. Generate Response
        const token = generateToken(user);
        const { password_hash: _, ...safeUser } = user;

        res.json({
            message: 'Conectado con Meta exitosamente.',
            token,
            user: safeUser,
            autoConfigured: !!ig_page_id
        });

    } catch (error) {
        console.error('[AUTH] Error en login Facebook:', error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Error al conectar con Facebook. Revisa los IDs de la Aplicación en el servidor.' });
    }
});

module.exports = router;
