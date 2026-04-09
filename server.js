// server.js — Marketing SaaS Platform — Main Server
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// === Ensure directories exist ===
const dirs = ['uploads', 'data'];
dirs.forEach(dir => {
    const dirPath = path.join(__dirname, dir);
    if (!fs.existsSync(dirPath)) fs.mkdirSync(dirPath, { recursive: true });
});

// === Middleware ===
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Request logging (dev)
app.use((req, res, next) => {
    if (req.path.startsWith('/api')) {
        console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.path}`);
    }
    next();
});

// === API Routes ===
app.use('/api/auth', require('./routes/auth'));
app.use('/api/posts', require('./routes/posts'));
app.use('/api/ai', require('./routes/ai'));
app.use('/api/billing', require('./routes/billing'));

// === Public Config ===
app.get('/api/config', (req, res) => {
    res.json({
        google_client_id: process.env.GOOGLE_CLIENT_ID,
        facebook_app_id: process.env.FACEBOOK_APP_ID
    });
});

// === Health check ===
app.get('/api/health', (req, res) => {
    res.json({
        status: 'ok',
        platform: 'SocialPulse Marketing SaaS',
        version: '1.0.0',
        uptime: process.uptime()
    });
});

// === SPA fallback — serve app.html for /app routes ===
app.get('/app', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'app.html'));
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

// === Error handling ===
app.use((err, req, res, next) => {
    console.error('[ERROR]', err.message);

    if (err.name === 'MulterError') {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(400).json({ error: 'El archivo es demasiado grande. Máximo 10MB.' });
        }
        return res.status(400).json({ error: 'Error al subir el archivo.' });
    }

    res.status(err.status || 500).json({
        error: err.message || 'Error interno del servidor.'
    });
});

// === Start server ===
app.listen(PORT, () => {
    console.log('');
    console.log('  ╔══════════════════════════════════════════╗');
    console.log('  ║                                          ║');
    console.log('  ║    🚀 SocialPulse Marketing SaaS         ║');
    console.log('  ║                                          ║');
    console.log(`  ║    🌐 http://localhost:${PORT}              ║`);
    console.log('  ║    📊 Dashboard: /app                    ║');
    console.log('  ║    🔑 Login: /login                      ║');
    console.log('  ║                                          ║');
    console.log('  ╚══════════════════════════════════════════╝');
    console.log('');
});

module.exports = app;
