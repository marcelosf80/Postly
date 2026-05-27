
/**
 * Postly V2 — Web Photo Editor
 * Manages image processing and filters using Canvas API
 */

const PhotoEditor = {
    canvas: null,
    ctx: null,
    originalImage: null,
    currentFilter: 'none',

    init() {
        this.canvas = document.createElement('canvas');
        this.ctx = this.canvas.getContext('2d');
    },

    /**
     * Applies a filter to a base64 image and returns a new base64 image
     * @param {string} base64 - The source image
     * @param {string} filter - The filter type
     * @returns {Promise<string>} - The processed image
     */
    async processImage(base64, filter) {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                this.canvas.width = img.width;
                this.canvas.height = img.height;
                
                // Clear and draw original
                this.ctx.filter = this.getCanvasFilter(filter);
                this.ctx.drawImage(img, 0, 0);
                
                resolve(this.canvas.toDataURL('image/jpeg', 0.9));
            };
            img.src = base64;
        });
    },

    getCanvasFilter(filter) {
        switch(filter) {
            case 'vintage': return 'sepia(0.5) contrast(1.2) brightness(0.9)';
            case 'b-w': return 'grayscale(1) contrast(1.1)';
            case 'warm': return 'sepia(0.2) saturate(1.5) brightness(1.1)';
            case 'cool': return 'hue-rotate(30deg) saturate(1.2) brightness(1.05)';
            case 'vibrant': return 'saturate(2) contrast(1.1)';
            case 'noir': return 'grayscale(1) contrast(1.5) brightness(0.9)';
            case 'golden': return 'sepia(0.3) saturate(1.4) brightness(1.1) hue-rotate(-10deg)';
            case 'cyberpunk': return 'hue-rotate(150deg) saturate(1.6) contrast(1.2)';
            case 'lomo': return 'contrast(1.3) saturate(1.6) brightness(0.9)';
            case 'fade': return 'brightness(1.1) contrast(0.85) saturate(0.8)';
            case 'teal': return 'hue-rotate(130deg) saturate(1.4) contrast(1.1)';
            case 'dramatic': return 'contrast(1.5) brightness(0.8) saturate(0.8)';
            case 'polaroid': return 'contrast(1.15) brightness(1.1) saturate(0.9) sepia(0.15)';
            case 'retro': return 'sepia(0.3) contrast(1.15) saturate(1.1) hue-rotate(-5deg)';
            case 'summer': return 'saturate(1.4) brightness(1.1) contrast(1.05) sepia(0.05)';
            case 'winter': return 'hue-rotate(20deg) saturate(0.8) contrast(1.1) brightness(1.05)';
            case 'haze': return 'brightness(1.15) contrast(0.8) saturate(0.9) sepia(0.05)';
            case 'neon': return 'saturate(2.2) contrast(1.2) hue-rotate(-20deg) brightness(1.1)';
            case 'nordic': return 'saturate(0.7) contrast(1.2) brightness(1.02) hue-rotate(10deg)';
            case 'velvet': return 'contrast(1.3) saturate(1.3) sepia(0.1) brightness(0.95)';
            case 'sepia-strong': return 'sepia(0.9) contrast(1.1) brightness(0.95)';
            case 'monochrome': return 'grayscale(1) brightness(1.15) contrast(1.25)';
            case 'invert': return 'invert(1)';
            case 'dreamy': return 'brightness(1.1) saturate(1.1) contrast(0.9) blur(0.5px)';
            default: return 'none';
        }
    }
};

// Auto-initialize
PhotoEditor.init();
window.PhotoEditor = PhotoEditor;
