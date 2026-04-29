// middleware/auth.js — JWT Authentication Middleware
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'socialpulse-dev-secret-2026';
const JWT_EXPIRY = '7d';

function generateToken(user) {
    const payload = {
        id: user.id,
        email: user.email,
        name: user.name,
        plan: user.plan || 'free'
    };
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRY });
}

function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Acceso no autorizado. Token requerido.' });
    }

    try {
        const token = authHeader.split(' ')[1];
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        if (error.name === 'TokenExpiredError') {
            return res.status(401).json({ error: 'Token expirado. Por favor, inicie sesión nuevamente.' });
        }
        return res.status(401).json({ error: 'Token inválido.' });
    }
}

// Optional auth — doesn't fail if no token, but populates req.user if present
function optionalAuth(req, res, next) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        try {
            const token = authHeader.split(' ')[1];
            req.user = jwt.verify(token, JWT_SECRET);
        } catch { /* ignore */ }
    }
    next();
}

function adminMiddleware(req, res, next) {
    if (!req.user || !req.user.id) {
        return res.status(401).json({ error: 'Acceso no autorizado.' });
    }

    const { users } = require('../data/store');
    const user = users.findById(req.user.id);

    if (!user || !user.is_admin) {
        return res.status(403).json({ error: 'Acceso restringido. Solo administradores.' });
    }

    next();
}

module.exports = { authMiddleware, optionalAuth, generateToken, adminMiddleware, JWT_SECRET };

