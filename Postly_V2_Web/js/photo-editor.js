
/**
 * Postly V2 — Web Photo Editor
 * Manages image processing, filters, rotation, crop & text overlays via Canvas API
 */

const PhotoEditor = {
    canvas: null,
    ctx: null,
    currentImageBase64: null,
    rotation: 0,
    flipH: false,
    flipV: false,
    aspectRatio: 'free', // 'free', '1:1', '4:5', '16:9'
    adjustments: {
        brightness: 100,
        contrast: 100,
        saturation: 100,
        blur: 0
    },
    currentFilter: 'none',
    overlayText: '',
    overlayTextColor: '#ffffff',

    init() {
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
    },

    /**
     * Renders a canvas filter string
     */
    getCanvasFilter(filter, adjustments = {}) {
        const { brightness = 100, contrast = 100, saturation = 100, blur = 0 } = adjustments;
        let adjFilter = `brightness(${brightness}%) contrast(${contrast}%) saturate(${saturation}%)`;
        if (blur > 0) adjFilter += ` blur(${blur}px)`;

        let presetFilter = '';
        switch(filter) {
            case 'vintage': presetFilter = 'sepia(0.5) contrast(1.2) brightness(0.9)'; break;
            case 'b-w': presetFilter = 'grayscale(1) contrast(1.1)'; break;
            case 'warm': presetFilter = 'sepia(0.2) saturate(1.5) brightness(1.1)'; break;
            case 'cool': presetFilter = 'hue-rotate(30deg) saturate(1.2) brightness(1.05)'; break;
            case 'vibrant': presetFilter = 'saturate(2) contrast(1.1)'; break;
            case 'noir': presetFilter = 'grayscale(1) contrast(1.5) brightness(0.9)'; break;
            case 'golden': presetFilter = 'sepia(0.3) saturate(1.4) brightness(1.1) hue-rotate(-10deg)'; break;
            case 'cyberpunk': presetFilter = 'hue-rotate(150deg) saturate(1.6) contrast(1.2)'; break;
            case 'cinematic': presetFilter = 'contrast(1.25) saturate(1.3) sepia(0.15) hue-rotate(-10deg)'; break;
            case 'warm-sunset': presetFilter = 'sepia(0.35) saturate(1.6) brightness(1.08) hue-rotate(-15deg)'; break;
            case 'rose-gold': presetFilter = 'sepia(0.25) saturate(1.3) hue-rotate(320deg) brightness(1.05)'; break;
            case 'dark-moody': presetFilter = 'contrast(1.4) brightness(0.82) saturate(0.85)'; break;
            case 'emerald': presetFilter = 'hue-rotate(85deg) saturate(1.4) contrast(1.1)'; break;
            case 'hdr-punch': presetFilter = 'contrast(1.45) saturate(1.5) brightness(1.02)'; break;
            case 'neon': presetFilter = 'saturate(2.2) contrast(1.2) hue-rotate(-20deg) brightness(1.1)'; break;
            default: presetFilter = 'none'; break;
        }

        return presetFilter === 'none' ? adjFilter : `${presetFilter} ${adjFilter}`;
    },

    /**
     * Process image and returns processed DataURL
     */
    async processImage(base64, filter = 'none', adjustments = {}, transform = {}) {
        const { rotation = 0, flipH = false, flipV = false, text = '', textColor = '#ffffff', aspectRatio = 'free' } = transform;

        return new Promise((resolve) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                let width = img.width;
                let height = img.height;

                // Handle rotation dimensions switch
                const isRotated90 = Math.abs(rotation) % 180 === 90;
                if (isRotated90) {
                    width = img.height;
                    height = img.width;
                }

                // Handle Aspect Ratio Cropping
                let cropX = 0, cropY = 0, cropW = width, cropH = height;
                if (aspectRatio === '1:1') {
                    const side = Math.min(width, height);
                    cropX = (width - side) / 2;
                    cropY = (height - side) / 2;
                    cropW = side;
                    cropH = side;
                } else if (aspectRatio === '4:5') {
                    const targetRatio = 4 / 5;
                    if (width / height > targetRatio) {
                        cropW = height * targetRatio;
                        cropX = (width - cropW) / 2;
                    } else {
                        cropH = width / targetRatio;
                        cropY = (height - cropH) / 2;
                    }
                } else if (aspectRatio === '16:9') {
                    const targetRatio = 16 / 9;
                    if (width / height > targetRatio) {
                        cropW = height * targetRatio;
                        cropX = (width - cropW) / 2;
                    } else {
                        cropH = width / targetRatio;
                        cropY = (height - cropH) / 2;
                    }
                }

                this.canvas.width = cropW;
                this.canvas.height = cropH;

                this.ctx.save();
                this.ctx.filter = this.getCanvasFilter(filter, adjustments);

                // Move origin to center for rotation/flip
                this.ctx.translate(cropW / 2, cropH / 2);
                if (rotation !== 0) this.ctx.rotate((rotation * Math.PI) / 180);
                if (flipH || flipV) this.ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);

                const drawW = isRotated90 ? height : width;
                const drawH = isRotated90 ? width : height;

                this.ctx.drawImage(
                    img,
                    -drawW / 2 - cropX,
                    -drawH / 2 - cropY,
                    width,
                    height
                );

                this.ctx.restore();

                // Draw Text Overlay if present
                if (text && text.trim() !== '') {
                    this.ctx.save();
                    const fontSize = Math.max(20, Math.floor(cropW / 18));
                    this.ctx.font = `800 ${fontSize}px 'Outfit', sans-serif`;
                    this.ctx.fillStyle = textColor;
                    this.ctx.textAlign = 'center';
                    this.ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
                    this.ctx.shadowBlur = 8;
                    this.ctx.shadowOffsetX = 2;
                    this.ctx.shadowOffsetY = 4;

                    this.ctx.fillText(text, cropW / 2, cropH - fontSize * 1.5);
                    this.ctx.restore();
                }

                resolve(this.canvas.toDataURL('image/jpeg', 0.92));
            };
            img.src = base64;
        });
    },

    /**
     * Modal Editor launcher for interactive UI
     */
    openEditorModal(base64Image, onSaveCallback) {
        this.currentImageBase64 = base64Image;
        this.rotation = 0;
        this.flipH = false;
        this.flipV = false;
        this.aspectRatio = 'free';
        this.adjustments = { brightness: 100, contrast: 100, saturation: 100, blur: 0 };
        this.currentFilter = 'none';
        this.overlayText = '';
        this.overlayTextColor = '#ffffff';

        let modalContainer = document.getElementById('modal-container');
        if (!modalContainer) {
            modalContainer = document.createElement('div');
            modalContainer.id = 'modal-container';
            document.body.appendChild(modalContainer);
        }

        modalContainer.innerHTML = `
            <div class="modal-overlay">
                <div class="modal-content-card">
                    <div class="modal-header">
                        <h3><i data-lucide="sliders" style="width:20px;"></i> Editor de Imagen Pro</h3>
                        <button class="modal-close-btn" id="editor-close-btn">&times;</button>
                    </div>

                    <div class="modal-body">
                        <!-- Canvas Preview -->
                        <div class="editor-canvas-container">
                            <canvas id="editor-preview-canvas"></canvas>
                        </div>

                        <!-- Editor Tabs -->
                        <div class="editor-tabs">
                            <button class="editor-tab-btn active" data-tab="filters"><i data-lucide="sparkles" style="width:14px;"></i> Filtros</button>
                            <button class="editor-tab-btn" data-tab="adjust"><i data-lucide="sliders" style="width:14px;"></i> Ajustes</button>
                            <button class="editor-tab-btn" data-tab="crop"><i data-lucide="crop" style="width:14px;"></i> Formato</button>
                            <button class="editor-tab-btn" data-tab="text"><i data-lucide="type" style="width:14px;"></i> Texto</button>
                        </div>

                        <!-- Tab 1: Filters -->
                        <div class="editor-tab-content" id="tab-filters">
                            <div class="filter-presets-scroll">
                                ${this.renderFilterChips()}
                            </div>
                        </div>

                        <!-- Tab 2: Adjustments -->
                        <div class="editor-tab-content" id="tab-adjust" style="display:none;">
                            <div class="adjustment-group">
                                <div class="slider-item">
                                    <div class="slider-label-row"><span>Brillo</span><span id="val-brightness">100%</span></div>
                                    <input type="range" id="input-brightness" min="50" max="150" value="100">
                                </div>
                                <div class="slider-item">
                                    <div class="slider-label-row"><span>Contraste</span><span id="val-contrast">100%</span></div>
                                    <input type="range" id="input-contrast" min="50" max="150" value="100">
                                </div>
                                <div class="slider-item">
                                    <div class="slider-label-row"><span>Saturación</span><span id="val-saturation">100%</span></div>
                                    <input type="range" id="input-saturation" min="0" max="200" value="100">
                                </div>
                            </div>
                        </div>

                        <!-- Tab 3: Crop / Transform -->
                        <div class="editor-tab-content" id="tab-crop" style="display:none;">
                            <div style="display:flex; gap:10px; flex-wrap:wrap;">
                                <button class="btn btn-sm" id="btn-rotate" style="background:rgba(255,255,255,0.08); color:white;"><i data-lucide="rotate-cw" style="width:14px;"></i> Rotar 90°</button>
                                <button class="btn btn-sm" id="btn-flip" style="background:rgba(255,255,255,0.08); color:white;"><i data-lucide="flip-horizontal" style="width:14px;"></i> Voltear H</button>
                            </div>
                            <div style="margin-top:12px; font-size:0.8rem; font-weight:600; color:#94a3b8;">Proporción:</div>
                            <div style="display:grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap:6px; margin-top:6px;">
                                <button class="btn btn-sm aspect-btn active" data-ratio="free" style="padding:6px;">Libre</button>
                                <button class="btn btn-sm aspect-btn" data-ratio="1:1" style="padding:6px;">1:1 Cuadrado</button>
                                <button class="btn btn-sm aspect-btn" data-ratio="4:5" style="padding:6px;">4:5 Retrato</button>
                                <button class="btn btn-sm aspect-btn" data-ratio="16:9" style="padding:6px;">16:9 Banner</button>
                            </div>
                        </div>

                        <!-- Tab 4: Text Overlay -->
                        <div class="editor-tab-content" id="tab-text" style="display:none;">
                            <input type="text" id="input-overlay-text" placeholder="Escribe un título sobre la foto..." style="width:100%; padding:10px 14px; background:rgba(255,255,255,0.06); border:1px solid rgba(255,255,255,0.1); border-radius:12px; color:white; font-size:0.85rem;">
                            <div style="display:flex; align-items:center; gap:10px; margin-top:10px;">
                                <span style="font-size:0.8rem; color:#94a3b8;">Color de Texto:</span>
                                <input type="color" id="input-text-color" value="#ffffff" style="border:none; width:36px; height:36px; background:transparent; cursor:pointer;">
                            </div>
                        </div>

                        <!-- Actions Footer -->
                        <div style="display:flex; gap:10px; margin-top:10px;">
                            <button class="btn" id="btn-cancel-editor" style="background:rgba(255,255,255,0.08); color:#cbd5e1;">Cancelar</button>
                            <button class="btn btn-primary" id="btn-save-editor"><i data-lucide="check" style="width:18px;"></i> Aplicar Cambios</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        modalContainer.style.display = 'block';
        if (window.lucide) window.lucide.createIcons();

        // Bind interactive elements
        this.bindEditorEvents(onSaveCallback);
        this.updatePreview();
    },

    renderFilterChips() {
        const filters = [
            { id: 'none', label: 'Original' },
            { id: 'cinematic', label: 'Cinematic' },
            { id: 'cyberpunk', label: 'Cyberpunk' },
            { id: 'warm-sunset', label: 'Sunset' },
            { id: 'rose-gold', label: 'Rose Gold' },
            { id: 'dark-moody', label: 'Moody' },
            { id: 'hdr-punch', label: 'HDR' },
            { id: 'neon', label: 'Neon' },
            { id: 'vintage', label: 'Vintage' },
            { id: 'b-w', label: 'B & N' }
        ];

        return filters.map(f => `
            <div class="filter-chip ${f.id === 'none' ? 'active' : ''}" data-filter="${f.id}">
                <div class="filter-chip-preview" style="background-image: url('${this.currentImageBase64}'); filter: ${this.getCanvasFilter(f.id)}"></div>
                <span class="filter-chip-label">${f.label}</span>
            </div>
        `).join('');
    },

    bindEditorEvents(onSaveCallback) {
        const closeBtn = document.getElementById('editor-close-btn');
        const cancelBtn = document.getElementById('btn-cancel-editor');
        const saveBtn = document.getElementById('btn-save-editor');

        const closeModal = () => {
            document.getElementById('modal-container').style.display = 'none';
        };

        closeBtn.onclick = closeModal;
        cancelBtn.onclick = closeModal;

        saveBtn.onclick = async () => {
            const finalImage = await this.processImage(this.currentImageBase64, this.currentFilter, this.adjustments, {
                rotation: this.rotation,
                flipH: this.flipH,
                flipV: this.flipV,
                aspectRatio: this.aspectRatio,
                text: this.overlayText,
                textColor: this.overlayTextColor
            });
            closeModal();
            if (onSaveCallback) onSaveCallback(finalImage);
        };

        // Tab Switching
        document.querySelectorAll('.editor-tab-btn').forEach(btn => {
            btn.onclick = (e) => {
                document.querySelectorAll('.editor-tab-btn').forEach(b => b.classList.remove('active'));
                document.querySelectorAll('.editor-tab-content').forEach(c => c.style.display = 'none');

                const targetTab = btn.getAttribute('data-tab');
                btn.classList.add('active');
                document.getElementById(`tab-${targetTab}`).style.display = 'block';
            };
        });

        // Filter Click
        document.querySelectorAll('.filter-chip').forEach(chip => {
            chip.onclick = () => {
                document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                this.currentFilter = chip.getAttribute('data-filter');
                this.updatePreview();
            };
        });

        // Adjustment Sliders
        const brightnessInput = document.getElementById('input-brightness');
        const contrastInput = document.getElementById('input-contrast');
        const saturationInput = document.getElementById('input-saturation');

        brightnessInput.oninput = (e) => {
            this.adjustments.brightness = e.target.value;
            document.getElementById('val-brightness').innerText = `${e.target.value}%`;
            this.updatePreview();
        };

        contrastInput.oninput = (e) => {
            this.adjustments.contrast = e.target.value;
            document.getElementById('val-contrast').innerText = `${e.target.value}%`;
            this.updatePreview();
        };

        saturationInput.oninput = (e) => {
            this.adjustments.saturation = e.target.value;
            document.getElementById('val-saturation').innerText = `${e.target.value}%`;
            this.updatePreview();
        };

        // Rotation & Flip
        document.getElementById('btn-rotate').onclick = () => {
            this.rotation = (this.rotation + 90) % 360;
            this.updatePreview();
        };

        document.getElementById('btn-flip').onclick = () => {
            this.flipH = !this.flipH;
            this.updatePreview();
        };

        // Aspect Ratio
        document.querySelectorAll('.aspect-btn').forEach(btn => {
            btn.onclick = () => {
                document.querySelectorAll('.aspect-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                this.aspectRatio = btn.getAttribute('data-ratio');
                this.updatePreview();
            };
        });

        // Overlay Text
        const textInput = document.getElementById('input-overlay-text');
        const colorInput = document.getElementById('input-text-color');

        textInput.oninput = (e) => {
            this.overlayText = e.target.value;
            this.updatePreview();
        };

        colorInput.oninput = (e) => {
            this.overlayTextColor = e.target.value;
            this.updatePreview();
        };
    },

    async updatePreview() {
        const processed = await this.processImage(this.currentImageBase64, this.currentFilter, this.adjustments, {
            rotation: this.rotation,
            flipH: this.flipH,
            flipV: this.flipV,
            aspectRatio: this.aspectRatio,
            text: this.overlayText,
            textColor: this.overlayTextColor
        });

        const previewCanvas = document.getElementById('editor-preview-canvas');
        if (previewCanvas) {
            const ctx = previewCanvas.getContext('2d');
            const img = new Image();
            img.onload = () => {
                previewCanvas.width = img.width;
                previewCanvas.height = img.height;
                ctx.drawImage(img, 0, 0);
            };
            img.src = processed;
        }
    }
};

PhotoEditor.init();
window.PhotoEditor = PhotoEditor;

