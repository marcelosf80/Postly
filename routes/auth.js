const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { users } = require('../data/store');
const { authMiddleware, generateToken } = require('../middleware/auth');
const emailService = require('../services/email');
const { OAuth2Client } = require('google-auth-library');
const axios = require('axios');
const { getInstagramUserId, discoverIGBusinessAccount } = require('../services/instagram/instagramUserIdService');

const router = express.Router();
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

// POST /api/auth/test-bypass (ONLY FOR TESTING)
router.post('/test-bypass', async (req, res) => {
    const user = users.findOne({ email: 'marcelojmaidana@gmail.com' });
    if (!user) return res.status(404).json({error: 'No user found'});
    const token = generateToken(user);
    res.json({ token, user });
});

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
            posts_remaining: 5,
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
    const { 
        name, company, country, 
        ig_page_id, ig_access_token, fb_page_id, fb_access_token, 
        mp_access_token, mp_public_key,
        brand_name, brand_industry, brand_audience, brand_tone, 
        brand_services, brand_differentiators,
        brand_dna, brand_keywords, brand_avoid, human_quirks,
        target_emotion, visual_style, visual_elements
    } = req.body;

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (company !== undefined) updates.company = company;
    if (country !== undefined) updates.country = country;
    if (ig_page_id !== undefined) updates.ig_page_id = ig_page_id;
    if (ig_access_token !== undefined) updates.ig_access_token = ig_access_token;
    if (fb_page_id !== undefined) updates.fb_page_id = fb_page_id;
    if (fb_access_token !== undefined) updates.fb_access_token = fb_access_token;
    
    // Brand fields
    if (brand_name !== undefined) updates.brand_name = brand_name;
    if (brand_industry !== undefined) updates.brand_industry = brand_industry;
    if (brand_audience !== undefined) updates.brand_audience = brand_audience;
    if (brand_tone !== undefined) updates.brand_tone = brand_tone;
    if (brand_services !== undefined) updates.brand_services = brand_services;
    if (brand_differentiators !== undefined) updates.brand_differentiators = brand_differentiators;

    // Intelligence Center / Brain fields
    if (brand_dna !== undefined) updates.brand_dna = brand_dna;
    if (brand_keywords !== undefined) updates.brand_keywords = brand_keywords;
    if (brand_avoid !== undefined) updates.brand_avoid = brand_avoid;
    if (human_quirks !== undefined) updates.human_quirks = human_quirks;
    if (target_emotion !== undefined) updates.target_emotion = target_emotion;
    if (visual_style !== undefined) updates.visual_style = visual_style;
    if (visual_elements !== undefined) updates.visual_elements = visual_elements;
    console.log(`[AUTH] Actualizando perfil de marca para usuario ${req.user.id}`);

    const updated = users.update(req.user.id, updates);
    if (!updated) {
        return res.status(404).json({ error: 'Usuario no encontrado.' });
    }

    const { password_hash: _, ...safeUser } = updated;
    res.json({ message: 'Perfil actualizado.', user: safeUser });
});

// POST /api/auth/google — Verify Google token and login/register (API mode)
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

// POST /api/auth/google-redirect — Handle Google redirect mode (form POST)
router.post('/google-redirect', express.urlencoded({ extended: true }), async (req, res) => {
    try {
        const credential = req.body.credential;
        if (!credential) return res.redirect('/login?error=no_credential');

        const ticket = await googleClient.verifyIdToken({
            idToken: credential,
            audience: process.env.GOOGLE_CLIENT_ID
        });
        const payload = ticket.getPayload();
        const email = payload.email.toLowerCase();

        let user = users.findOne({ email });

        if (!user) {
            user = users.create({
                email,
                password_hash: '',
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

        const token = generateToken(user);
        
        if (payload.picture && user.avatar_url !== payload.picture) {
            users.update(user.id, { avatar_url: payload.picture });
        }

        const { password_hash: _, ...safeUser } = user;
        const userJSON = encodeURIComponent(JSON.stringify(safeUser));

        // Redirect to a page that saves the token and redirects to /app
        res.send(`
            <html><body>
            <script>
                localStorage.setItem('sp_token', '${token}');
                localStorage.setItem('sp_user', decodeURIComponent('${userJSON}'));
                window.location.href = '/app';
            </script>
            </body></html>
        `);
    } catch (error) {
        console.error('[AUTH] Error en Google redirect:', error);
        res.redirect('/login?error=google_failed');
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
        const exchangeUrl = `https://graph.facebook.com/v21.0/oauth/access_token?grant_type=fb_exchange_token&client_id=${appId}&client_secret=${appSecret}&fb_exchange_token=${accessToken}`;
        const exchangeRes = await axios.get(exchangeUrl);
        const longToken = exchangeRes.data.access_token;

        // 2. Fetch User Profile (Personal ID) and Accounts (Pages) concurrently
        const [meRes, pagesRes] = await Promise.all([
            axios.get(`https://graph.facebook.com/v21.0/me?fields=id,name,email,picture.type(large)&access_token=${longToken}`),
            axios.get(`https://graph.facebook.com/v21.0/me/accounts?fields=id,name,access_token,instagram_business_account&access_token=${longToken}`)
        ]);

        const { id: fbId, email, name: fbName, picture } = meRes.data;
        const fbAvatarUrl = picture && picture.data ? picture.data.url : '';
        const userEmail = email ? email.toLowerCase() : `${fbId}@facebook.com`;

        const pagesData = pagesRes.data.data || [];
        
        // Mapear las páginas según el nuevo formato
        const pages = pagesData.map(page => ({
            pageId: page.id,
            pageName: page.name,
            pageToken: page.access_token,
            instagramId: page.instagram_business_account ? page.instagram_business_account.id : null
        }));

        // Mantener compatibilidad hacia atrás: Asignar la primera página encontrada a fb_page_id e ig_page_id
        let ig_page_id = '';
        let fb_page_id = '';
        let fb_access_token = '';
        let ig_access_token = '';

        if (pages.length > 0) {
            fb_page_id = pages[0].pageId;
            fb_access_token = pages[0].pageToken;
            
            // Buscar la primera página que tenga instagramId
            const pageWithIg = pages.find(p => p.instagramId);
            if (pageWithIg) {
                ig_page_id = pageWithIg.instagramId;
                // Usamos el token de la página de Facebook asociada a ese IG Business
                ig_access_token = pageWithIg.pageToken; 
                console.log(`[AUTH] ✅ Instagram descubierto: ${ig_page_id} vinculado a Page: ${pageWithIg.pageName}`);
            }
        }

        // 3. Update or Create User
        let user = users.findOne({ fb_user_id: fbId }) || users.findOne({ email: userEmail });

        console.log(`[AUTH] Descubrimiento Meta p/ ${userEmail}: IG=${ig_page_id}, FB=${fb_page_id}`);

        const updates = {
            fb_user_id: fbId,
            fb_access_token: fb_access_token || (user ? user.fb_access_token : ''),
            ig_page_id: ig_page_id || (user ? user.ig_page_id : ''),
            ig_access_token: ig_access_token || (user ? user.ig_access_token : ''),
            fb_page_id: fb_page_id || (user ? user.fb_page_id : ''),
            name: user ? user.name : fbName,
            avatar_url: fbAvatarUrl || (user ? user.avatar_url : ''),
            auth_provider: 'facebook',
            pages: pages // Nuevo campo
        };

        if (!user) {
            user = users.create({
                email: userEmail,
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
            console.log(`[AUTH] Nuevo usuario creado vía Meta: ${userEmail}`);
        } else {
            console.log(`[AUTH] Actualizando usuario existente vía Meta: ${userEmail}`);
            user = users.update(user.id, updates);
        }

        // 4. Generate Response
        const token = generateToken(user);
        const { password_hash: _, ...safeUser } = user;

        res.json({
            message: 'Conectado con Meta exitosamente.',
            token,
            user: safeUser,
            autoConfigured: !!ig_page_id
        });

    } catch (error) {
        const errorData = error.response ? error.response.data : error.message;
        console.error('[AUTH] ❌ Error en login Facebook:', errorData);
        
        let userMessage = 'Error al conectar con Facebook. ';
        if (error.response && error.response.data && error.response.data.error) {
            userMessage += error.response.data.error.message;
        } else {
            userMessage += 'Revisa los IDs de la Aplicación en el servidor y asegúrate de que el App Secret sea correcto.';
        }

        res.status(500).json({ 
            error: userMessage,
            details: process.env.NODE_ENV === 'development' ? errorData : undefined
        });
    }
});

// GET /api/auth/instagram-lookup — Buscar ID de Instagram por username (endpoints públicos)
router.get('/instagram-lookup', authMiddleware, async (req, res) => {
    try {
        const { username } = req.query;
        if (!username) {
            return res.status(400).json({ error: 'Se requiere el parámetro "username".' });
        }

        const result = await getInstagramUserId(username);
        res.json({
            message: 'Instagram ID encontrado.',
            instagram: result
        });
    } catch (error) {
        console.error('[AUTH] Error en instagram-lookup:', error.message);
        res.status(404).json({ error: error.message });
    }
});

// POST /api/auth/instagram-resolve — Resolver IG Business Account usando token OAuth de Meta
router.post('/instagram-resolve', authMiddleware, async (req, res) => {
    try {
        const user = users.findById(req.user.id);
        if (!user) return res.status(404).json({ error: 'Usuario no encontrado.' });

        // Usar el token de FB del usuario para discovery
        const token = user.fb_access_token;
        if (!token) {
            return res.status(400).json({ error: 'No hay token de Facebook almacenado. Conectá tu cuenta de Meta primero.' });
        }

        const discovery = await discoverIGBusinessAccount(token);
        if (!discovery) {
            return res.status(404).json({
                error: 'No se encontró una cuenta Business/Creator de Instagram vinculada a tus Páginas de Facebook.',
                hint: 'Asegurate de que tu cuenta de Instagram esté configurada como Profesional y vinculada a una Página de Facebook.'
            });
        }

        // Auto-guardar en el perfil del usuario
        const updated = users.update(user.id, {
            ig_page_id: discovery.igBusinessId,
            ig_access_token: discovery.pageAccessToken,
            ig_username: discovery.igUsername
        });

        const { password_hash: _, ...safeUser } = updated;

        res.json({
            message: `Instagram vinculado: @${discovery.igUsername} (ID: ${discovery.igBusinessId})`,
            instagram: discovery,
            user: safeUser
        });
    } catch (error) {
        console.error('[AUTH] Error en instagram-resolve:', error.message);
        res.status(500).json({ error: 'Error al resolver cuenta de Instagram.' });
    }
});

// POST /api/auth/forgot-password — Request a reset link
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) return res.status(400).json({ error: 'Email requerido.' });

        const user = users.findOne({ email: email.toLowerCase() });
        if (!user) {
            // Regla de seguridad: No revelar si el email existe, pero no enviamos correo.
            return res.json({ message: 'Si el correo existe, se enviará un enlace de recuperación.' });
        }

        // Generate token and expiry (1 hour)
        const token = crypto.randomBytes(32).toString('hex');
        const expires = new Date(Date.now() + 3600000).toISOString();

        users.update(user.id, {
            reset_token: token,
            reset_token_expires: expires
        });

        // Send Email (MOCKED or REAL)
        await emailService.sendPasswordReset(user, token);

        res.json({ message: 'Si el correo existe, se enviará un enlace de recuperación.' });
    } catch (error) {
        console.error('[AUTH] Error en forgot-password:', error);
        res.status(500).json({ error: 'Error al procesar la solicitud.' });
    }
});

// POST /api/auth/reset-password — Reset password using token
router.post('/reset-password', async (req, res) => {
    try {
        const { token, password } = req.body;
        if (!token || !password) return res.status(400).json({ error: 'Token y nueva contraseña requeridos.' });

        const user = users.findOne({ reset_token: token });
        
        if (!user || new Date(user.reset_token_expires) < new Date()) {
            return res.status(400).json({ error: 'El token es inválido o ha expirado.' });
        }

        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);

        // Update user and clear token
        users.update(user.id, {
            password_hash,
            reset_token: null,
            reset_token_expires: null
        });

        res.json({ message: 'Contraseña actualizada exitosamente. Ya puedes iniciar sesión.' });
    } catch (error) {
        console.error('[AUTH] Error en reset-password:', error);
        res.status(500).json({ error: 'Error al restablecer la contraseña.' });
    }
});

module.exports = router;
