
import sys
import os

path = 'c:/Marketing/public/mobile/js/app.js'
if not os.path.exists(path):
    print(f'Error: {path} not found')
    sys.exit(1)

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Define the missing block to be inserted
missing_block = """                <div class="ai-tool-icon" style="background:rgba(124, 58, 237, 0.1); color:#7C3AED;">🎨</div>
                <h3>Cerebro Visual</h3>
                <p>Crea prompts profesionales para generar imágenes (Midjourney/DALL-E).</p>
            </div>
            <div class="ai-tool-card" onclick="openAITool('hashtags')">
                <div class="ai-tool-icon">#️⃣</div>
                <h3>SEO Hashtags</h3>
                <p>Hashtags estratégicos basados en tu nicho y audiencia.</p>
            </div>
            <div class="ai-tool-card" onclick="openAITool('ideas')">
                <div class="ai-tool-icon">💡</div>
                <h3>Ideas de Contenido</h3>
                <p>Sugerencias creativas alineadas a tus servicios y rubro.</p>
            </div>
            <div class="ai-tool-card" onclick="openAITool('improve')">
                <div class="ai-tool-icon">✨</div>
                <h3>Humanizar Texto</h3>
                <p>Limpia el lenguaje robótico y dale un toque personal a tus textos.</p>
            </div>
            <div class="ai-tool-card" onclick="openAITool('flyer')">
                <div class="ai-tool-icon" style="background:rgba(236, 72, 153, 0.1); color:var(--accent);">🖼️</div>
                <h3>Creador de Flyers</h3>
                <p>Genera ideas y prompts para tus piezas gráficas y ofertas.</p>
            </div>
        </div>

        <div id="ai-workspace" style="display:none;margin-top:var(--space-xl);">
            <div class="card" style="max-width:700px; border: 1px solid var(--border);">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:var(--space-md);">
                    <h3 id="ai-tool-title" style="margin:0;"></h3>
                    <button class="btn btn-ghost btn-sm" onclick="document.getElementById('ai-workspace').style.display='none'">✕</button>
                </div>
                <div id="ai-tool-form"></div>
                <div id="ai-tool-result" style="display:none;margin-top:var(--space-lg);"></div>
            </div>
        </div>
    `;
}

function openAITool(tool) {
    const workspace = document.getElementById('ai-workspace');
    const title = document.getElementById('ai-tool-title');
    const form = document.getElementById('ai-tool-form');
    const result = document.getElementById('ai-tool-result');

    workspace.style.display = 'block';
    result.style.display = 'none';

    const tools = {
        caption: {
            title: '✍️ Generar Caption Humano',
            form: `
                <div class="form-group">
                    <label class="form-label">¿Sobre qué es el post?</label>
                    <textarea id="ai-input" class="form-textarea" rows="3" placeholder="Ej: Hoy entregamos este letrero neon para una cafetería..."></textarea>
                </div>
                <div style="display:flex;gap:var(--space-md);">
                    <div class="form-group" style="flex:1;">
                        <label class="form-label">Plataforma</label>
                        <select id="ai-platform" class="form-select">
                            <option value="Instagram">Instagram</option>
                            <option value="Facebook">Facebook</option>
                        </select>
                    </div>
                </div>
                <button class="btn btn-accent" onclick="runAITool('caption')">🤖 Generar con mi Cerebro de Marca</button>
            `
        },
        visual: {
            title: '🎨 Generador de Prompts Visuales',
            form: `
                <div class="form-group">
                    <label class="form-label">Idea o concepto de la imagen</label>
                    <textarea id="ai-input" class="form-textarea" rows="3" placeholder="Ej: Un primer plano de un letrero neon Rosa en una pared de ladrillo gris..."></textarea>
                </div>
                <p class="text-secondary" style="font-size:12px; margin-bottom:12px;">Esto generará un prompt técnico en Inglés optimizado para Midjourney, DALL-E o Canva AI siguiendo tu estilo visual.</p>
                <button class="btn btn-accent" onclick="runAITool('visual')" style="background:var(--accent);">📸 Crear Prompt Maestro</button>
            `
        },
        hashtags: {
            title: '#️⃣ Generar Hashtags Estratégicos',
            form: `
                <div class="form-group">
                    <label class="form-label">Tema del post</label>
                    <textarea id="ai-input" class="form-textarea" rows="3" placeholder="Ej: Cartelería 3D para negocios locales..."></textarea>
                </div>
                <button class="btn btn-accent" onclick="runAITool('hashtags')">🤖 Generar Hashtags</button>
            `
        },
        ideas: {
            title: '💡 Ideas de Contenido',
            form: `
                <div class="form-group">
                    <label class="form-label">Rubro o tema específico</label>
                    <input type="text" id="ai-input" class="form-input" placeholder="Ej: Ideas para Reels sobre mi taller...">
                </div>
                <button class="btn btn-accent" onclick="runAITool('ideas')">🤖 Ver Sugerencias</button>
            `
        },
        improve: {
            title: '✨ Humanizar y Mejorar Texto',
            form: `
                <div class="form-group">
                    <label class="form-label">Tu borrador inicial</label>
                    <textarea id="ai-input" class="form-textarea" rows="4" placeholder="Escribí de forma natural lo que tenés en mente..."></textarea>
                </div>
                <button class="btn btn-accent" onclick="runAITool('improve')">🚀 Darle el Toque Humano</button>
            `
        },
        flyer: {
            title: '🖼️ Creador de Flyers',
            form: `
                <div class="form-group">
                    <label class="form-label">Categoría del Negocio</label>
                    <select id="flyer-category" class="form-select">
                        <option value="Cartelería">Cartelería</option>
                        <option value="Gráfica">Gráfica</option>
                        <option value="Sublimación">Sublimación</option>
                        <option value="Corpóreos">Corpóreos</option>
                    </select>
                </div>
                <div class="form-group">
                    <label class="form-label">Detalles del Flyer</label>
                    <textarea id="ai-input" class="form-textarea" rows="3" placeholder="Ej: Promo de letras corpóreas para locales, estilo moderno..."></textarea>
                </div>
                <button class="btn btn-accent" onclick="runAITool('flyer')" style="background:var(--gradient-warm);">✨ Generar Idea de Flyer</button>
            `
        }
    };

    const config = tools[tool];
    if (config) {
        title.textContent = config.title;
        form.innerHTML = config.form;
    }

    workspace.scrollIntoView({ behavior: 'smooth' });
}
"""

target = '<div class="ai-tool-card" onclick="openAITool(\'visual\')">\\n'
if target in content:
    split_content = content.split(target)
    # We want to replace the gap starting from the target line
    # The gap is between line 1054 and 1055 in the CURRENT damaged file
    # Let's find the async function runAITool(tool) {
    second_part_start = "async function runAITool(tool) {"
    if second_part_start in split_content[1]:
        parts = split_content[1].split(second_part_start)
        new_content = split_content[0] + target + missing_block + "\\n\\n" + second_part_start + parts[1]
        with open(path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print('Successfully fixed app.js')
    else:
        print('Could not find start of runAITool')
else:
    print('Could not find target card')
