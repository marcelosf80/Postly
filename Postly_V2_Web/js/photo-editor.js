
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
            case 'vibrant': return 'saturate(1.8) contrast(1.1)';
            case 'dramatic': return 'contrast(1.5) brightness(0.8) saturate(0.8)';
            default: return 'none';
        }
    }
};

// Auto-initialize
PhotoEditor.init();
window.PhotoEditor = PhotoEditor;
