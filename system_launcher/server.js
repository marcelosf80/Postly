const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const { spawn } = require('child_process');
const kill = require('tree-kill');
const path = require('path');
const cors = require('cors');
const fs = require('fs');
const os = require('os');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const PORT = 8888;

// Obtener la IP local de la red
const getLocalIp = () => {
    const interfaces = os.networkInterfaces();
    for (const name of Object.keys(interfaces)) {
        for (const iface of interfaces[name]) {
            if (iface.family === 'IPv4' && !iface.internal) {
                return iface.address;
            }
        }
    }
    return 'localhost';
};

const LOCAL_IP = getLocalIp();

// Configuración de los servicios
const SERVICES = {
    'mr-letreros-node': {
        name: 'MR Letreros (Node)',
        cwd: 'c:\\MR_Letreros',
        command: 'npm',
        args: ['start'],
        port: 3000
    },
    'mr-letreros-python': {
        name: 'MR Letreros (Python)',
        cwd: 'c:\\MR_Letreros\\backend',
        command: 'uvicorn',
        args: ['main:app', '--reload', '--port', '8000'],
        port: 8000
    },
    'restogest-node': {
        name: 'RestoGest (Node)',
        cwd: 'c:\\RestoGest',
        command: 'npm',
        args: ['start'],
        port: 3001
    },
    'restogest-python': {
        name: 'RestoGest (Python)',
        cwd: 'c:\\RestoGest\\backend',
        command: 'uvicorn',
        args: ['main:app', '--reload', '--port', '8001'],
        port: 8001
    },
    'marketing-node': {
        name: 'SocialPulse Marketing',
        cwd: 'c:\\marketing',
        command: 'node',
        args: ['server.js'],
        port: 3002
    },
    'ollama': {
        name: 'Ollama AI',
        cwd: 'c:\\',
        command: 'ollama',
        args: ['serve'],
        port: 11434,
        env: { OLLAMA_HOST: '0.0.0.0' }
    }
};

const processes = {};

// Verificar si un puerto está en uso
const checkPort = (port) => {
    return new Promise((resolve) => {
        const net = require('net');
        const tester = net.createServer()
            .once('error', () => resolve(true))
            .once('listening', () => {
                tester.once('close', () => resolve(false)).close();
            })
            .listen(port);
    });
};

// Obtener PID de un puerto (solo Windows)
const getPidOnPort = (port) => {
    return new Promise((resolve) => {
        const cmd = `netstat -ano | findstr :${port}`;
        const exec = require('child_process').exec;
        exec(cmd, (err, stdout) => {
            if (err || !stdout) return resolve(null);
            const lines = stdout.trim().split('\n');
            const lastLine = lines[lines.length - 1]; // Tomar la última entrada activa
            const parts = lastLine.trim().split(/\s+/);
            const pid = parts[parts.length - 1];
            resolve(isNaN(pid) ? null : pid);
        });
    });
};

app.get('/api/status', async (req, res) => {
    const status = {};
    for (const [id, service] of Object.entries(SERVICES)) {
        const orphanedPid = await getPidOnPort(service.port);
        status[id] = {
            running: !!processes[id],
            portActive: !!orphanedPid,
            pid: processes[id] ? processes[id].pid : orphanedPid
        };
    }
    res.json(status);
});

app.post('/api/start/:id', (req, res) => {
    const id = req.params.id;
    const service = SERVICES[id];

    if (!service) return res.status(404).json({ error: 'Service not found' });
    if (processes[id]) return res.json({ message: 'Already running' });

    console.log(`🚀 Starting ${service.name}...`);
    
    // Usar 'shell: true' para Windows
    const proc = spawn(service.command, service.args, {
        cwd: service.cwd,
        shell: true,
        env: { ...process.env, PORT: service.port, ...(service.env || {}) }
    });

    processes[id] = proc;

    proc.stdout.on('data', (data) => {
        const msg = data.toString();
        io.emit('logs', { id, text: msg, type: 'stdout' });
    });

    proc.stderr.on('data', (data) => {
        const msg = data.toString();
        io.emit('logs', { id, text: msg, type: 'stderr' });
    });

    proc.on('close', (code) => {
        console.log(`🛑 ${service.name} exited with code ${code}`);
        delete processes[id];
        io.emit('status-update', { id, running: false });
    });

    res.json({ message: 'Started', pid: proc.pid });
});

app.post('/api/stop/:id', async (req, res) => {
    const id = req.params.id;
    const service = SERVICES[id];
    let pid = processes[id] ? processes[id].pid : await getPidOnPort(service.port);

    if (!pid) return res.json({ message: 'Not running' });

    console.log(`🛑 Stopping ${id} (PID: ${pid})...`);
    
    // Usar taskkill en Windows para asegurar que matamos el árbol de procesos
    const exec = require('child_process').exec;
    exec(`taskkill /F /T /PID ${pid}`, (err) => {
        if (err) {
            console.error(`Error killing ${id}:`, err);
            return res.status(500).json({ error: 'Failed to stop' });
        }
        delete processes[id];
        res.json({ message: 'Stopped' });
    });
});

server.listen(PORT, () => {
    console.log(`
    ╔══════════════════════════════════════════════════════╗
    ║                                                      ║
    ║   🚀 CONTROL CENTER v1.0 - READY!                    ║
    ║                                                      ║
    ║   🏠 Local:   http://localhost:${PORT}                 ║
    ║   🌐 Network: http://${LOCAL_IP}:${PORT}               ║
    ║                                                      ║
    ╚══════════════════════════════════════════════════════╝
    `);
});
