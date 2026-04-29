// photo-filters.js — Photo Filter Engine (Canvas 2D API)
// Ported from Kotlin PhotoFilters library

const PhotoFilters = {
  // Apply a named filter to an image element, returns dataURL
  apply(imgOrCanvas, filterName, params = {}) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    let src;
    if (imgOrCanvas instanceof HTMLCanvasElement) { src = imgOrCanvas; }
    else { src = imgOrCanvas; }
    canvas.width = src.width || src.naturalWidth;
    canvas.height = src.height || src.naturalHeight;
    ctx.drawImage(src, 0, 0, canvas.width, canvas.height);
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    const fn = this.filters[filterName];
    if (!fn) { console.warn('Filter not found:', filterName); return canvas; }
    const result = fn(imageData, canvas, ctx, params);
    if (result instanceof ImageData) ctx.putImageData(result, 0, 0);
    return canvas;
  },

  // Generate thumbnail previews for filter picker
  generatePreviews(img, size = 80) {
    const list = [];
    for (const [name] of Object.entries(this.presets)) {
      const c = document.createElement('canvas');
      c.width = size; c.height = size;
      c.getContext('2d').drawImage(img, 0, 0, size, size);
      const filtered = this.apply(c, name);
      list.push({ name, canvas: filtered });
    }
    return list;
  },

  // ── Helper: apply 4x5 color matrix to ImageData ──
  _applyMatrix(data, m) {
    const d = data.data;
    for (let i = 0; i < d.length; i += 4) {
      const r = d[i], g = d[i+1], b = d[i+2], a = d[i+3];
      d[i]   = Math.min(255, Math.max(0, m[0]*r + m[1]*g + m[2]*b + m[3]*a + m[4]));
      d[i+1] = Math.min(255, Math.max(0, m[5]*r + m[6]*g + m[7]*b + m[8]*a + m[9]));
      d[i+2] = Math.min(255, Math.max(0, m[10]*r + m[11]*g + m[12]*b + m[13]*a + m[14]));
    }
    return data;
  },

  // ── Helper: 3x3 convolution kernel ──
  _convolve(data, w, h, kernel, divisor = 1) {
    const src = new Uint8ClampedArray(data.data);
    const d = data.data;
    const kSize = Math.sqrt(kernel.length) | 0;
    const half = (kSize / 2) | 0;
    for (let y = half; y < h - half; y++) {
      for (let x = half; x < w - half; x++) {
        let r = 0, g = 0, b = 0;
        for (let ky = 0; ky < kSize; ky++) {
          for (let kx = 0; kx < kSize; kx++) {
            const idx = ((y + ky - half) * w + (x + kx - half)) * 4;
            const kv = kernel[ky * kSize + kx];
            r += src[idx] * kv; g += src[idx+1] * kv; b += src[idx+2] * kv;
          }
        }
        const idx = (y * w + x) * 4;
        d[idx] = Math.min(255, Math.max(0, r / divisor));
        d[idx+1] = Math.min(255, Math.max(0, g / divisor));
        d[idx+2] = Math.min(255, Math.max(0, b / divisor));
      }
    }
    return data;
  },

  filters: {},
  presets: {}
};

// ═══════════════════════════════════════════
// COLOR MATRIX FILTERS
// ═══════════════════════════════════════════
const CM = {
  grayscale: [0.299,0.587,0.114,0,0, 0.299,0.587,0.114,0,0, 0.299,0.587,0.114,0,0, 0,0,0,1,0],
  sepia: [0.393,0.769,0.189,0,0, 0.349,0.686,0.168,0,0, 0.272,0.534,0.131,0,0, 0,0,0,1,0],
  vintage: [0.9,0.05,0.05,0,10, 0,0.8,0.05,0,5, 0,0.05,0.75,0,-5, 0,0,0,1,0],
  coolTone: [0.85,0,0.15,0,-10, 0,0.95,0.05,0,5, 0.15,0.05,1.05,0,15, 0,0,0,1,0],
  warmTone: [1.1,0.05,0,0,15, 0,0.95,0,0,5, 0,0,0.85,0,-10, 0,0,0,1,0],
  negative: [-1,0,0,0,255, 0,-1,0,0,255, 0,0,-1,0,255, 0,0,0,1,0],
  fade: [0.9,0,0,0,25, 0,0.9,0,0,25, 0,0,0.9,0,25, 0,0,0,1,0],
  crossProcess: [1,-0.15,0.1,0,5, -0.15,1.1,-0.05,0,-5, 0.05,-0.05,1.2,0,-10, 0,0,0,1,0],
  moonlight: [0.7,0.1,0.3,0,-10, 0.1,0.7,0.3,0,-15, 0.2,0.2,0.9,0,10, 0,0,0,1,0],
  sunset: [1.2,0.1,0,0,20, 0,0.9,0,0,-5, 0,0,0.7,0,-20, 0,0,0,1,0],
  forest: [0.8,0,0,0,-10, 0.1,1.1,0.05,0,10, 0,0.05,0.7,0,-15, 0,0,0,1,0],
  ocean: [0.7,0.05,0.1,0,-10, 0.05,0.9,0.1,0,5, 0.1,0.1,1.2,0,20, 0,0,0,1,0],
  roseTint: [1.1,0.05,0.05,0,15, 0.05,0.85,0.05,0,-5, 0.05,0.05,0.9,0,5, 0,0,0,1,0],
  polaroid: [1.44,-0.14,0.07,0,-14, -0.14,1.32,-0.14,0,10, -0.07,-0.07,1.16,0,20, 0,0,0,1,0],
  tealAndOrange: [1.2,-0.1,-0.1,0,10, 0,0.9,-0.1,0,0, -0.2,0.1,1.1,0,-10, 0,0,0,1,0],
  matrix: [0,0,0,0,0, 0.5,0.7,0.3,0,0, 0,0,0,0,0, 0,0,0,1,0],
  lavender: [0.9,0.05,0.15,0,5, 0,0.8,0.05,0,-5, 0.15,0.05,1,0,10, 0,0,0,1,0],
  goldenHour: [1.3,0.1,0,0,20, 0,1.05,0,0,5, 0,0,0.8,0,-15, 0,0,0,1,0],
  cyberpunk: [1,-0.2,0.3,0,10, 0,0.9,0.2,0,0, 0.3,0,1.3,0,20, 0,0,0,1,0],
  kodachrome: [1.22,-0.08,-0.06,0,0, -0.03,1.05,-0.08,0,0, -0.03,-0.06,1.05,0,0, 0,0,0,1,0],
  velvia: [1.1,0,0,0,5, 0,1.15,0,0,0, 0,0,1.05,0,-5, 0,0,0,1,0],
  filmFade: [0.8,0,0,0,30, 0,0.8,0,0,30, 0,0,0.8,0,30, 0,0,0,1,0]
};

// Register all color matrix filters
for (const [name, matrix] of Object.entries(CM)) {
  PhotoFilters.filters[name] = (data) => PhotoFilters._applyMatrix(data, matrix);
}

// ── Parametric color filters ──
PhotoFilters.filters.brightness = (data, c, ctx, p) => {
  const a = p.amount || 30;
  return PhotoFilters._applyMatrix(data, [1,0,0,0,a, 0,1,0,0,a, 0,0,1,0,a, 0,0,0,1,0]);
};
PhotoFilters.filters.contrast = (data, c, ctx, p) => {
  const v = p.amount || 1.4, off = 127.5*(1-v);
  return PhotoFilters._applyMatrix(data, [v,0,0,0,off, 0,v,0,0,off, 0,0,v,0,off, 0,0,0,1,0]);
};
PhotoFilters.filters.saturation = (data, c, ctx, p) => {
  const s = p.amount || 1.5, sr = 0.3086, sg = 0.6094, sb = 0.082;
  const a = (1-s)*sr, b2 = (1-s)*sg, cc = (1-s)*sb;
  return PhotoFilters._applyMatrix(data, [a+s,b2,cc,0,0, a,b2+s,cc,0,0, a,b2,cc+s,0,0, 0,0,0,1,0]);
};

// ═══════════════════════════════════════════
// NOIR (high contrast B&W)
// ═══════════════════════════════════════════
PhotoFilters.filters.noir = (data) => {
  const d = data.data;
  for (let i = 0; i < d.length; i += 4) {
    let v = 0.299*d[i] + 0.587*d[i+1] + 0.114*d[i+2];
    v = ((v - 127.5) * 2) + 127.5;
    v = Math.min(255, Math.max(0, v));
    d[i] = d[i+1] = d[i+2] = v;
  }
  return data;
};

// ── LOMO (high saturation + contrast) ──
PhotoFilters.filters.lomo = (data) => {
  const s = 1.8, sr = 0.3086, sg = 0.6094, sb = 0.082;
  const a = (1-s)*sr, b2 = (1-s)*sg, cc = (1-s)*sb;
  PhotoFilters._applyMatrix(data, [a+s,b2,cc,0,0, a,b2+s,cc,0,0, a,b2,cc+s,0,0, 0,0,0,1,0]);
  const v = 1.3, off = 127.5*(1-v);
  return PhotoFilters._applyMatrix(data, [v,0,0,0,off, 0,v,0,0,off, 0,0,v,0,off, 0,0,0,1,0]);
};

// ═══════════════════════════════════════════
// CONVOLUTION FILTERS
// ═══════════════════════════════════════════
PhotoFilters.filters.sharpen = (data, c) => PhotoFilters._convolve(data, c.width, c.height, [0,-1,0,-1,5,-1,0,-1,0]);
PhotoFilters.filters.emboss = (data, c) => PhotoFilters._convolve(data, c.width, c.height, [-2,-1,0,-1,1,1,0,1,2]);
PhotoFilters.filters.edgeDetect = (data, c) => PhotoFilters._convolve(data, c.width, c.height, [-1,-1,-1,-1,8,-1,-1,-1,-1]);
PhotoFilters.filters.blur = (data, c) => PhotoFilters._convolve(data, c.width, c.height, [1,1,1,1,1,1,1,1,1], 9);

// ═══════════════════════════════════════════
// PIXEL MANIPULATION FILTERS
// ═══════════════════════════════════════════
PhotoFilters.filters.vignette = (data, c) => {
  const d = data.data, w = c.width, h = c.height;
  const cx = w/2, cy = h/2, maxDist = Math.sqrt(cx*cx + cy*cy);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const dist = Math.sqrt((x-cx)**2 + (y-cy)**2) / maxDist;
      const factor = 1 - (dist * dist * 0.7);
      const i = (y * w + x) * 4;
      d[i] *= factor; d[i+1] *= factor; d[i+2] *= factor;
    }
  }
  return data;
};

PhotoFilters.filters.pixelate = (data, c, ctx, p) => {
  const d = data.data, w = c.width, h = c.height, bs = p.blockSize || 12;
  for (let y = 0; y < h; y += bs) {
    for (let x = 0; x < w; x += bs) {
      const i = (y * w + x) * 4;
      const r = d[i], g = d[i+1], b = d[i+2];
      for (let dy = 0; dy < bs && y+dy < h; dy++) {
        for (let dx = 0; dx < bs && x+dx < w; dx++) {
          const j = ((y+dy) * w + (x+dx)) * 4;
          d[j] = r; d[j+1] = g; d[j+2] = b;
        }
      }
    }
  }
  return data;
};

PhotoFilters.filters.posterize = (data, c, ctx, p) => {
  const d = data.data, levels = p.levels || 4, step = 255 / levels;
  for (let i = 0; i < d.length; i += 4) {
    d[i] = Math.round(d[i] / step) * step;
    d[i+1] = Math.round(d[i+1] / step) * step;
    d[i+2] = Math.round(d[i+2] / step) * step;
  }
  return data;
};

PhotoFilters.filters.threshold = (data, c, ctx, p) => {
  const d = data.data, t = p.value || 128;
  for (let i = 0; i < d.length; i += 4) {
    const v = (0.299*d[i] + 0.587*d[i+1] + 0.114*d[i+2]) > t ? 255 : 0;
    d[i] = d[i+1] = d[i+2] = v;
  }
  return data;
};

PhotoFilters.filters.solarize = (data) => {
  const d = data.data;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i] > 128) d[i] = 255 - d[i];
    if (d[i+1] > 128) d[i+1] = 255 - d[i+1];
    if (d[i+2] > 128) d[i+2] = 255 - d[i+2];
  }
  return data;
};

PhotoFilters.filters.noise = (data, c, ctx, p) => {
  const d = data.data, intensity = p.intensity || 35;
  for (let i = 0; i < d.length; i += 4) {
    const n = (Math.random() - 0.5) * intensity;
    d[i] += n; d[i+1] += n; d[i+2] += n;
  }
  return data;
};

PhotoFilters.filters.chromaticAberration = (data, c) => {
  const d = data.data, w = c.width, src = new Uint8ClampedArray(d), off = 5;
  for (let i = 0; i < d.length; i += 4) {
    const x = (i/4) % w;
    if (x + off < w) d[i] = src[i + off*4];
    if (x - off >= 0) d[i+2] = src[i - off*4 + 2];
  }
  return data;
};

PhotoFilters.filters.glitch = (data, c) => {
  const d = data.data, w = c.width, h = c.height;
  for (let i = 0; i < 15; i++) {
    const y = Math.floor(Math.random() * h);
    const sliceH = Math.floor(Math.random() * 10) + 2;
    const shift = Math.floor((Math.random() - 0.5) * 40);
    for (let sy = y; sy < Math.min(y + sliceH, h); sy++) {
      for (let x = 0; x < w; x++) {
        const srcX = Math.min(Math.max(x + shift, 0), w - 1);
        const di = (sy * w + x) * 4, si = (sy * w + srcX) * 4;
        d[di] = d[si]; d[di+1] = d[si+1]; d[di+2] = d[si+2];
      }
    }
  }
  return data;
};

PhotoFilters.filters.mirror = (data, c) => {
  const d = data.data, w = c.width, h = c.height, src = new Uint8ClampedArray(d);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w/2; x++) {
      const li = (y*w+x)*4, ri = (y*w+(w-1-x))*4;
      d[ri] = src[li]; d[ri+1] = src[li+1]; d[ri+2] = src[li+2];
    }
  }
  return data;
};

PhotoFilters.filters.anaglyph = (data, c) => {
  const d = data.data, w = c.width, src = new Uint8ClampedArray(d), off = 8;
  for (let i = 0; i < d.length; i += 4) {
    const x = (i/4) % w;
    const gray = 0.299*src[i] + 0.587*src[i+1] + 0.114*src[i+2];
    d[i] = gray;
    if (x + off < w) { d[i+1] = src[i + off*4 + 1]; d[i+2] = src[i + off*4 + 2]; }
  }
  return data;
};

PhotoFilters.filters.comic = (data, c) => {
  // Posterize + edge outline
  PhotoFilters.filters.posterize(data, c, null, { levels: 5 });
  const edges = PhotoFilters._convolve(
    new ImageData(new Uint8ClampedArray(data.data), c.width, c.height),
    c.width, c.height, [-1,-1,-1,-1,8,-1,-1,-1,-1]
  );
  const d = data.data, e = edges.data;
  for (let i = 0; i < d.length; i += 4) {
    const edge = (e[i] + e[i+1] + e[i+2]) / 3;
    if (edge > 30) { d[i] = d[i+1] = d[i+2] = 0; }
  }
  return data;
};

PhotoFilters.filters.pencilSketch = (data, c) => {
  PhotoFilters.filters.noir(data);
  return PhotoFilters._convolve(data, c.width, c.height, [-1,-1,-1,-1,8,-1,-1,-1,-1]);
};

// ═══════════════════════════════════════════
// COMPOUND PRESETS (Stack)
// ═══════════════════════════════════════════
PhotoFilters.filters.lomoVignette = (data, c, ctx) => {
  PhotoFilters.filters.lomo(data); return PhotoFilters.filters.vignette(data, c);
};
PhotoFilters.filters.vintageFaded = (data, c, ctx) => {
  PhotoFilters._applyMatrix(data, CM.sepia);
  PhotoFilters.filters.noise(data, c, ctx, { intensity: 20 });
  return PhotoFilters.filters.vignette(data, c);
};
PhotoFilters.filters.neonCyberpunk = (data, c, ctx) => {
  PhotoFilters._applyMatrix(data, CM.cyberpunk);
  return PhotoFilters.filters.vignette(data, c);
};
PhotoFilters.filters.warmPortrait = (data, c, ctx) => {
  PhotoFilters._applyMatrix(data, CM.warmTone);
  return PhotoFilters.filters.vignette(data, c);
};

// ═══════════════════════════════════════════
// PRESET CATALOG (for filter picker UI)
// ═══════════════════════════════════════════
PhotoFilters.presets = {
  'Original': null,
  'Escala de Grises': 'grayscale', 'Sepia': 'sepia', 'Vintage': 'vintage',
  'Frío': 'coolTone', 'Cálido': 'warmTone', 'Negativo': 'negative',
  'Fade': 'fade', 'Cross Process': 'crossProcess', 'Lomo': 'lomo',
  'Luz de Luna': 'moonlight', 'Atardecer': 'sunset', 'Bosque': 'forest',
  'Océano': 'ocean', 'Rosa': 'roseTint', 'Polaroid': 'polaroid',
  'Teal & Orange': 'tealAndOrange', 'Matrix': 'matrix', 'Lavanda': 'lavender',
  'Noir': 'noir', 'Hora Dorada': 'goldenHour', 'Cyberpunk': 'cyberpunk',
  'Kodachrome': 'kodachrome', 'Velvia': 'velvia', 'Film Fade': 'filmFade',
  'Nitidez': 'sharpen', 'Relieve': 'emboss', 'Bordes': 'edgeDetect', 'Blur': 'blur',
  'Viñeta': 'vignette', 'Pixelado': 'pixelate', 'Posterizar': 'posterize',
  'Umbral': 'threshold', 'Solarizar': 'solarize', 'Ruido': 'noise',
  'Aberración': 'chromaticAberration', 'Glitch': 'glitch', 'Espejo': 'mirror',
  'Anaglifo 3D': 'anaglyph', 'Comic': 'comic', 'Lápiz': 'pencilSketch',
  'Lomo + Viñeta': 'lomoVignette', 'Vintage Film': 'vintageFaded',
  'Neon Cyberpunk': 'neonCyberpunk', 'Retrato Cálido': 'warmPortrait'
};

window.PhotoFilters = PhotoFilters;
