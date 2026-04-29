const socket = io();
const servicesGrid = document.getElementById('services-grid');
const consoleEl = document.getElementById('service-console');
const consoleOutput = document.getElementById('console-output');
const consoleTitle = document.getElementById('console-title');

const SERVICES_DATA = {
    'mr-letreros-node': { name: 'MR Letreros (Node)', port: 3000, icon: '🚀' },
    'mr-letreros-python': { name: 'MR Letreros (Python)', port: 8000, icon: '⚡' },
    'restogest-node': { name: 'RestoGest (Node)', port: 3001, icon: '🍔' },
    'restogest-python': { name: 'RestoGest (Python)', port: 8001, icon: '📊' },
    'marketing-node': { name: 'Marketing SaaS', port: 3002, icon: '📈' },
    'ollama': { name: 'Ollama AI Service', port: 11434, icon: '🧠' }
};

let currentServiceLogs = null;

async function updateStatus() {
    const res = await fetch('/api/status');
    const status = await res.json();
    
    servicesGrid.innerHTML = '';
    
    Object.entries(SERVICES_DATA).forEach(([id, info]) => {
        const s = status[id];
        const card = document.createElement('div');
        card.className = 'service-card';
        card.innerHTML = `
            <div class="card-header">
                <div class="status-indicator ${s.portActive ? 'status-online' : 'status-offline'}">
                    <span class="status-dot"></span>
                    ${s.portActive ? 'Online' : 'Offline'}
                </div>
                <div style="font-size: 1.5rem">${info.icon}</div>
            </div>
            <div class="service-info">
                <h3>${info.name}</h3>
                <div class="port">Puerto: ${info.port} ${s.pid ? `| PID: ${s.pid}` : ''}</div>
            </div>
            <div class="controls">
                <button class="btn-start" onclick="startService('${id}')" ${s.running || s.portActive ? 'disabled' : ''}>
                    Iniciar
                </button>
                <button class="btn-stop" onclick="stopService('${id}')" ${!s.running && !s.portActive ? 'disabled' : ''}>
                    Detener
                </button>
                <button class="btn-logs" onclick="showLogs('${id}')" title="Ver Logs">
                    📋
                </button>
            </div>
        `;
        servicesGrid.appendChild(card);
    });
}

async function startService(id) {
    await fetch(`/api/start/${id}`, { method: 'POST' });
    setTimeout(updateStatus, 1000);
}

async function stopService(id) {
    await fetch(`/api/stop/${id}`, { method: 'POST' });
    setTimeout(updateStatus, 1000);
}

function showLogs(id) {
    currentServiceLogs = id;
    consoleTitle.innerText = `Logs: ${SERVICES_DATA[id].name}`;
    consoleEl.style.display = 'flex';
    consoleOutput.innerHTML = '';
}

function closeConsole() {
    consoleEl.style.display = 'none';
}

socket.on('logs', (data) => {
    if (data.id === currentServiceLogs) {
        const line = document.createElement('div');
        line.innerText = data.text;
        line.style.color = data.type === 'stderr' ? '#f87171' : '#4ade80';
        consoleOutput.appendChild(line);
        consoleOutput.scrollTop = consoleOutput.scrollHeight;
    }
});

socket.on('status-update', () => {
    updateStatus();
});

setInterval(updateStatus, 3000);
updateStatus();
