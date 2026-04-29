package com.yourapp.photofilters.filters

import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.Color
import android.graphics.Paint
import android.graphics.RadialGradient
import android.graphics.Shader
import androidx.annotation.ColorInt
import kotlin.math.*
import kotlin.random.Random

/**
 * Pixel-by-pixel manipulation filters.
 *
 * Trade-offs:
 * - Pure Kotlin; no JNI/RenderScript dependencies — easy to audit and port.
 * - For >12 MP images, run these on a background coroutine (Dispatchers.Default).
 * - Some effects (OilPainting, Halftone) are O(radius²) per pixel — profile before
 *   using at full resolution; consider downscale-process-upscale.
 */
object PixelFilters {

    // ─── Vignette ─────────────────────────────────────────────────────

    /**
     * Radial vignette: dark gradient from corners inward.
     * Uses Canvas+RadialGradient — no pixel loop needed.
     * [strength] 0f (none) … 1f (full black corners)
     * [radius]   gradient reach as fraction of half-diagonal (0f…1f)
     */
    fun vignette(src: Bitmap, strength: Float, radius: Float): Bitmap {
        val w = src.width.toFloat()
        val h = src.height.toFloat()
        val result = src.copy(Bitmap.Config.ARGB_8888, true)
        val cx = w / 2f; val cy = h / 2f
        val diag = sqrt(cx * cx + cy * cy)
        val gradRadius = diag * radius.coerceIn(0.1f, 1.5f)
        val alpha = (strength.coerceIn(0f, 1f) * 255).toInt()
        val gradient = RadialGradient(
            cx, cy, gradRadius,
            intArrayOf(Color.TRANSPARENT, Color.argb(alpha, 0, 0, 0)),
            floatArrayOf(0f, 1f),
            Shader.TileMode.CLAMP
        )
        Canvas(result).drawRect(0f, 0f, w, h, Paint().apply { shader = gradient })
        return result
    }

    // ─── Pixelate ─────────────────────────────────────────────────────

    fun pixelate(src: Bitmap, blockSize: Int): Bitmap {
        val bs = blockSize.coerceIn(2, 128)
        val w  = src.width
        val h  = src.height
        val pixels = IntArray(w * h).also { src.getPixels(it, 0, w, 0, 0, w, h) }
        val out    = IntArray(w * h)

        var blockY = 0
        while (blockY < h) {
            var blockX = 0
            while (blockX < w) {
                // Average all pixels in the block
                var rSum = 0; var gSum = 0; var bSum = 0; var count = 0
                for (dy in 0 until bs) for (dx in 0 until bs) {
                    val px = (blockX + dx).coerceIn(0, w - 1)
                    val py = (blockY + dy).coerceIn(0, h - 1)
                    val c  = pixels[py * w + px]
                    rSum += (c shr 16) and 0xFF
                    gSum += (c shr  8) and 0xFF
                    bSum +=  c         and 0xFF
                    count++
                }
                val avg = (0xFF shl 24) or ((rSum / count) shl 16) or ((gSum / count) shl 8) or (bSum / count)
                for (dy in 0 until bs) for (dx in 0 until bs) {
                    val px = (blockX + dx).coerceIn(0, w - 1)
                    val py = (blockY + dy).coerceIn(0, h - 1)
                    out[py * w + px] = avg
                }
                blockX += bs
            }
            blockY += bs
        }
        return Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888).apply {
            setPixels(out, 0, w, 0, 0, w, h)
        }
    }

    // ─── Duotone ──────────────────────────────────────────────────────

    /**
     * Maps pixel luminance linearly between two colors.
     * [shadowColor] → dark tones,  [highlightColor] → bright tones.
     */
    fun duotone(src: Bitmap, @ColorInt shadowColor: Int, @ColorInt highlightColor: Int): Bitmap {
        val w = src.width; val h = src.height
        val pixels = IntArray(w * h).also { src.getPixels(it, 0, w, 0, 0, w, h) }
        val sr = Color.red(shadowColor);    val sg = Color.green(shadowColor);    val sb = Color.blue(shadowColor)
        val hr = Color.red(highlightColor); val hg = Color.green(highlightColor); val hb = Color.blue(highlightColor)
        val out = IntArray(w * h) { i ->
            val c = pixels[i]
            val t = luminance(c) / 255f
            val r = (sr + t * (hr - sr)).toInt().coerceIn(0, 255)
            val g = (sg + t * (hg - sg)).toInt().coerceIn(0, 255)
            val b = (sb + t * (hb - sb)).toInt().coerceIn(0, 255)
            ((c shr 24) and 0xFF shl 24) or (r shl 16) or (g shl 8) or b
        }
        return Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888).apply {
            setPixels(out, 0, w, 0, 0, w, h)
        }
    }

    // ─── Posterize ────────────────────────────────────────────────────

    fun posterize(src: Bitmap, levels: Int): Bitmap {
        val lvl = levels.coerceIn(2, 8)
        val step = 255f / (lvl - 1)
        return mapPixels(src) { c ->
            mapChannels(c) { ch -> (round(ch / step) * step).toInt().coerceIn(0, 255) }
        }
    }

    // ─── Threshold ────────────────────────────────────────────────────

    fun threshold(src: Bitmap, threshold: Int): Bitmap = mapPixels(src) { c ->
        val v = if (luminance(c) >= threshold) 255 else 0
        (0xFF shl 24) or (v shl 16) or (v shl 8) or v
    }

    // ─── Solarize ─────────────────────────────────────────────────────

    /** Inverts any channel value above 128 (Sabattier effect). */
    fun solarize(src: Bitmap): Bitmap = mapPixels(src) { c ->
        mapChannels(c) { ch -> if (ch > 128) 255 - ch else ch }
    }

    // ─── Noise / Film Grain ───────────────────────────────────────────

    fun noise(src: Bitmap, intensity: Int, seed: Long = 0L): Bitmap {
        val rng = Random(seed)
        val half = intensity / 2
        return mapPixels(src) { c ->
            val grain = rng.nextInt(-half, half + 1)
            mapChannels(c) { ch -> (ch + grain).coerceIn(0, 255) }
        }
    }

    // ─── Chromatic Aberration ─────────────────────────────────────────

    /** Shifts red channel left and blue channel right by [offset] pixels. */
    fun chromaticAberration(src: Bitmap, offset: Int): Bitmap {
        val off = offset.coerceIn(1, 30)
        val w   = src.width; val h = src.height
        val px  = IntArray(w * h).also { src.getPixels(it, 0, w, 0, 0, w, h) }
        val out = IntArray(w * h) { i ->
            val x = i % w; val y = i / w
            val rX = (x - off).coerceIn(0, w - 1)
            val bX = (x + off).coerceIn(0, w - 1)
            val r  = (px[y * w + rX] shr 16) and 0xFF
            val g  = (px[i]          shr  8) and 0xFF
            val b  =  px[y * w + bX]         and 0xFF
            val a  = (px[i] shr 24) and 0xFF
            (a shl 24) or (r shl 16) or (g shl 8) or b
        }
        return Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888).apply {
            setPixels(out, 0, w, 0, 0, w, h)
        }
    }

    // ─── Halftone ─────────────────────────────────────────────────────

    /**
     * Simulates CMYK halftone dots on white.
     * Each [dotSize]×[dotSize] cell is filled with a black circle
     * whose radius is proportional to cell luminance (inverted).
     */
    fun halftone(src: Bitmap, dotSize: Int): Bitmap {
        val ds  = dotSize.coerceIn(4, 32)
        val w   = src.width; val h = src.height
        val px  = IntArray(w * h).also { src.getPixels(it, 0, w, 0, 0, w, h) }
        val result = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(result)
        canvas.drawColor(Color.WHITE)
        val paint = Paint(Paint.ANTI_ALIAS_FLAG).apply { color = Color.BLACK }
        val half = ds / 2f

        var cy = 0
        while (cy < h) {
            var cx = 0
            while (cx < w) {
                // Average luminance of cell
                var lumSum = 0; var count = 0
                for (dy in 0 until ds) for (dx in 0 until ds) {
                    val ix = (cx + dx).coerceIn(0, w - 1)
                    val iy = (cy + dy).coerceIn(0, h - 1)
                    lumSum += luminance(px[iy * w + ix]); count++
                }
                val avgLum = lumSum / count.toFloat()
                val radius = half * (1f - avgLum / 255f)
                if (radius > 0.5f) {
                    canvas.drawCircle(cx + half, cy + half, radius, paint)
                }
                cx += ds
            }
            cy += ds
        }
        return result
    }

    // ─── Swirl ────────────────────────────────────────────────────────

    /**
     * Twists pixels around the image center.
     * Each pixel is rotated by an angle proportional to its distance from center.
     * [strength] controls max rotation in radians.
     */
    fun swirl(src: Bitmap, strength: Float): Bitmap {
        val w  = src.width; val h = src.height
        val px = IntArray(w * h).also { src.getPixels(it, 0, w, 0, 0, w, h) }
        val cx = w / 2f; val cy = h / 2f
        val maxDist = sqrt(cx * cx + cy * cy)
        val out = IntArray(w * h) { i ->
            val x = (i % w).toFloat(); val y = (i / w).toFloat()
            val dx = x - cx; val dy = y - cy
            val dist = sqrt(dx * dx + dy * dy)
            val angle = strength * (1f - dist / maxDist)
            val cos = cos(angle); val sin = sin(angle)
            val srcX = (cx + dx * cos - dy * sin).roundToInt().coerceIn(0, w - 1)
            val srcY = (cy + dx * sin + dy * cos).roundToInt().coerceIn(0, h - 1)
            px[srcY * w + srcX]
        }
        return Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888).apply {
            setPixels(out, 0, w, 0, 0, w, h)
        }
    }

    // ─── Lens Distortion ─────────────────────────────────────────────

    /**
     * Barrel (amount > 0) or pincushion (amount < 0) lens distortion.
     * Uses the Brown–Conrady model (k1 coefficient only).
     */
    fun lensDistortion(src: Bitmap, amount: Float): Bitmap {
        val w  = src.width; val h = src.height
        val px = IntArray(w * h).also { src.getPixels(it, 0, w, 0, 0, w, h) }
        val cx = w / 2f; val cy = h / 2f
        val k1 = amount.coerceIn(-1f, 1f)
        val out = IntArray(w * h) { i ->
            val xd = ((i % w) - cx) / cx
            val yd = ((i / w) - cy) / cy
            val r2 = xd * xd + yd * yd
            val scale = 1f + k1 * r2
            val srcX = (cx + xd * scale * cx).roundToInt().coerceIn(0, w - 1)
            val srcY = (cy + yd * scale * cy).roundToInt().coerceIn(0, h - 1)
            px[srcY * w + srcX]
        }
        return Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888).apply {
            setPixels(out, 0, w, 0, 0, w, h)
        }
    }

    // ─── Tilt-Shift ───────────────────────────────────────────────────

    /**
     * Keeps a horizontal band sharp, blurs rest (miniature effect).
     * Blur intensity ramps from 0 at band center to [blurRadius] at edges.
     *
     * Trade-off: we pre-blur the entire image once and alpha-blend between
     * sharp/blurred versions per-row — O(w*h) blend step, single blur pass.
     */
    fun tiltShift(src: Bitmap, bandCenter: Float, bandWidth: Float, blurRadius: Int): Bitmap {
        val w = src.width; val h = src.height
        val blurred = ConvolutionFilters.gaussianBlur(src, blurRadius)
        val sharpPx  = IntArray(w * h).also { src.getPixels(it, 0, w, 0, 0, w, h) }
        val blurPx   = IntArray(w * h).also { blurred.getPixels(it, 0, w, 0, 0, w, h) }
        blurred.recycle()
        val centerY = bandCenter.coerceIn(0f, 1f) * h
        val halfBand = (bandWidth.coerceIn(0.01f, 1f) * h) / 2f
        val out = IntArray(w * h) { i ->
            val y = (i / w).toFloat()
            val dist = abs(y - centerY)
            val t = ((dist - halfBand) / halfBand).coerceIn(0f, 1f)
            alphaBlend(sharpPx[i], blurPx[i], t)
        }
        return Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888).apply {
            setPixels(out, 0, w, 0, 0, w, h)
        }
    }

    // ─── Mirror ───────────────────────────────────────────────────────

    fun mirror(src: Bitmap, horizontal: Boolean, vertical: Boolean): Bitmap {
        val w  = src.width; val h = src.height
        val px = IntArray(w * h).also { src.getPixels(it, 0, w, 0, 0, w, h) }
        val out = IntArray(w * h) { i ->
            val x = i % w; val y = i / w
            val sx = if (horizontal && x >= w / 2) w - 1 - x else x
            val sy = if (vertical   && y >= h / 2) h - 1 - y else y
            px[sy * w + sx]
        }
        return Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888).apply {
            setPixels(out, 0, w, 0, 0, w, h)
        }
    }

    // ─── Glitch ───────────────────────────────────────────────────────

    /**
     * Horizontal slice displacement glitch effect.
     * Randomly shifts segments of horizontal rows by a random amount.
     */
    fun glitch(src: Bitmap, intensity: Float, seed: Long): Bitmap {
        val w   = src.width; val h = src.height
        val rng = Random(seed)
        val px  = IntArray(w * h).also { src.getPixels(it, 0, w, 0, 0, w, h) }
        val out = px.copyOf()
        val maxShift = (w * intensity.coerceIn(0f, 1f) * 0.3f).toInt()
        var y = 0
        while (y < h) {
            val sliceH = rng.nextInt(1, max(2, (h * 0.05f).toInt()))
            if (rng.nextFloat() < intensity) {
                val shift = rng.nextInt(-maxShift, maxShift + 1)
                for (dy in 0 until sliceH) {
                    val row = (y + dy).coerceIn(0, h - 1)
                    for (x in 0 until w) {
                        val srcX = (x - shift).coerceIn(0, w - 1)
                        out[row * w + x] = px[row * w + srcX]
                    }
                }
            }
            y += sliceH
        }
        return Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888).apply {
            setPixels(out, 0, w, 0, 0, w, h)
        }
    }

    // ─── Pencil Sketch ────────────────────────────────────────────────

    /**
     * Classic pencil-sketch: grayscale + inverted Gaussian blur blended (Dodge).
     * Algorithm: sketch = Gray / (1 - BlurGray)  (color dodge of inverted blur)
     */
    fun pencilSketch(src: Bitmap): Bitmap {
        val w  = src.width; val h = src.height
        // Convert to grayscale
        val gray = mapPixels(src) { c ->
            val l = luminance(c)
            (0xFF shl 24) or (l shl 16) or (l shl 8) or l
        }
        // Invert and blur
        val inverted = mapPixels(gray) { c ->
            val l = 255 - luminance(c)
            (0xFF shl 24) or (l shl 16) or (l shl 8) or l
        }
        val blurred = ConvolutionFilters.gaussianBlur(inverted, 10)
        inverted.recycle()
        val grayPx = IntArray(w * h).also { gray.getPixels(it, 0, w, 0, 0, w, h) }
        val blurPx = IntArray(w * h).also { blurred.getPixels(it, 0, w, 0, 0, w, h) }
        gray.recycle(); blurred.recycle()

        val out = IntArray(w * h) { i ->
            val gVal = luminance(grayPx[i]).toFloat()
            val bVal = luminance(blurPx[i]).toFloat()
            val v = if (bVal >= 255f) 255 else ((gVal / (1f - bVal / 255f)).toInt()).coerceIn(0, 255)
            (0xFF shl 24) or (v shl 16) or (v shl 8) or v
        }
        return Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888).apply {
            setPixels(out, 0, w, 0, 0, w, h)
        }
    }

    // ─── Watercolor ───────────────────────────────────────────────────

    /**
     * Approximates watercolor: bilateral-like smoothing (box blur) + edge enhancement +
     * slight desaturation + paper texture via subtle noise.
     *
     * Trade-off: True bilateral filter is O(r²) per pixel; we substitute a
     * two-pass box blur which is visually close enough for still images.
     */
    fun watercolor(src: Bitmap): Bitmap {
        val smoothed   = ConvolutionFilters.boxBlur(src, 4)
        val desaturated = applyColorMatrix(smoothed, ColorMatrixFilters.buildSaturationMatrix(0.7f))
        smoothed.recycle()
        val edged      = ConvolutionFilters.sharpen(desaturated)
        // Add subtle paper grain
        val result     = noise(edged, 12)
        desaturated.recycle(); edged.recycle()
        return result
    }

    // ─── Pixel Art ────────────────────────────────────────────────────

    /**
     * Downscales to a tiny size (dividing by [scale]), quantizes colors to [paletteSize]
     * per-channel steps, then scales back up with nearest-neighbor.
     *
     * Trade-off: no global palette clustering (k-means) — per-channel quantization
     * is O(1) and gives a convincing pixel-art look.
     */
    fun pixelArt(src: Bitmap, paletteSize: Int, scale: Int): Bitmap {
        val s   = scale.coerceIn(2, 16)
        val w   = src.width; val h = src.height
        val sw  = maxOf(1, w / s); val sh = maxOf(1, h / s)

        // Downscale
        val small = Bitmap.createScaledBitmap(src, sw, sh, true)
        // Quantize
        val quantized = mapPixels(small) { c ->
            val step = 255f / (paletteSize - 1)
            mapChannels(c) { ch -> (round(ch / step) * step).toInt().coerceIn(0, 255) }
        }
        small.recycle()
        // Upscale nearest-neighbor (Bitmap.FILTER_BITMAP flag = false)
        return Bitmap.createScaledBitmap(quantized, w, h, false).also { quantized.recycle() }
    }

    // ─── Gradient Map ─────────────────────────────────────────────────

    /**
     * Maps pixel luminance to a gradient defined by [colors] and [positions].
     * Common use: create duotone, tritone, or neon-heat gradients.
     */
    fun gradientMap(src: Bitmap, @ColorInt colors: IntArray, positions: FloatArray): Bitmap {
        require(colors.size == positions.size && colors.size >= 2)
        return mapPixels(src) { c ->
            val t = luminance(c) / 255f
            // Find the two surrounding stops
            val idx = positions.indexOfFirst { it >= t }.let { if (it < 0) colors.size - 1 else it }
            if (idx == 0) return@mapPixels colors[0]
            val lo = positions[idx - 1]; val hi = positions[idx]
            val blend = if (hi == lo) 1f else (t - lo) / (hi - lo)
            interpolateColor(colors[idx - 1], colors[idx], blend)
        }
    }

    // ─── Anaglyph 3D ─────────────────────────────────────────────────

    /** Red/cyan anaglyph for 3D glasses. */
    fun anaglyph(src: Bitmap): Bitmap {
        val w  = src.width; val h = src.height
        val px = IntArray(w * h).also { src.getPixels(it, 0, w, 0, 0, w, h) }
        val shift = (w * 0.02f).toInt()
        val out = IntArray(w * h) { i ->
            val x = i % w; val y = i / w
            val lx = (x - shift).coerceIn(0, w - 1)
            val rx = (x + shift).coerceIn(0, w - 1)
            val left  = px[y * w + lx]
            val right = px[y * w + rx]
            val r = (left  shr 16) and 0xFF   // left eye → red channel
            val g = (right shr  8) and 0xFF   // right eye → green
            val b =  right         and 0xFF   // right eye → blue
            (0xFF shl 24) or (r shl 16) or (g shl 8) or b
        }
        return Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888).apply {
            setPixels(out, 0, w, 0, 0, w, h)
        }
    }

    // ─── Comic ────────────────────────────────────────────────────────

    /**
     * Comic-book look: saturated posterize + Sobel edge outlines drawn in black.
     */
    fun comic(src: Bitmap): Bitmap {
        val saturated  = applyColorMatrix(src, ColorMatrixFilters.buildSaturationMatrix(2.0f))
        val posterized = posterize(saturated, 4); saturated.recycle()
        val edges      = ConvolutionFilters.sobel(src)
        val edgePx     = IntArray(posterized.width * posterized.height).also {
            edges.getPixels(it, 0, edges.width, 0, 0, edges.width, edges.height)
        }
        edges.recycle()
        val basePx = IntArray(posterized.width * posterized.height).also {
            posterized.getPixels(it, 0, posterized.width, 0, 0, posterized.width, posterized.height)
        }
        val out = IntArray(basePx.size) { i ->
            if (luminance(edgePx[i]) > 50) Color.BLACK else basePx[i]
        }
        posterized.recycle()
        return Bitmap.createBitmap(src.width, src.height, Bitmap.Config.ARGB_8888).apply {
            setPixels(out, 0, src.width, 0, 0, src.width, src.height)
        }
    }

    // ─── Oil Painting ─────────────────────────────────────────────────

    /**
     * Mode-filter oil-painting approximation (Boye 2007).
     * Divides the brightness range into [intensityLevels] buckets, finds the
     * most frequent bucket in a [radius]-radius neighborhood, and returns
     * the average color of that bucket.
     *
     * O(radius² × intensityLevels) per pixel — use small radii for real-time.
     */
    fun oilPainting(src: Bitmap, radius: Int, intensityLevels: Int): Bitmap {
        val r  = radius.coerceIn(1, 8)
        val il = intensityLevels.coerceIn(2, 30)
        val w  = src.width; val h = src.height
        val px = IntArray(w * h).also { src.getPixels(it, 0, w, 0, 0, w, h) }
        val out = IntArray(w * h)

        for (y in 0 until h) {
            for (x in 0 until w) {
                val bucketCount = IntArray(il)
                val rSum = IntArray(il); val gSum = IntArray(il); val bSum = IntArray(il)

                for (dy in -r..r) for (dx in -r..r) {
                    val c   = px[(y + dy).coerceIn(0, h - 1) * w + (x + dx).coerceIn(0, w - 1)]
                    val lum = luminance(c)
                    val bucket = ((lum.toFloat() / 255f) * (il - 1)).roundToInt().coerceIn(0, il - 1)
                    bucketCount[bucket]++
                    rSum[bucket] += (c shr 16) and 0xFF
                    gSum[bucket] += (c shr  8) and 0xFF
                    bSum[bucket] +=  c         and 0xFF
                }
                val maxBucket = bucketCount.indices.maxByOrNull { bucketCount[it] }!!
                val cnt = bucketCount[maxBucket].coerceAtLeast(1)
                out[y * w + x] = (0xFF shl 24) or
                    ((rSum[maxBucket] / cnt) shl 16) or
                    ((gSum[maxBucket] / cnt) shl  8) or
                    (bSum[maxBucket] / cnt)
            }
        }
        return Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888).apply {
            setPixels(out, 0, w, 0, 0, w, h)
        }
    }

    // ─── Helpers ─────────────────────────────────────────────────────

    /** Applies a [ColorMatrix] via Paint/Canvas (no pixel loop). */
    private fun applyColorMatrix(src: Bitmap, cm: android.graphics.ColorMatrix): Bitmap {
        val result = Bitmap.createBitmap(src.width, src.height, Bitmap.Config.ARGB_8888)
        Canvas(result).drawBitmap(src, 0f, 0f, Paint().apply {
            colorFilter = android.graphics.ColorMatrixColorFilter(cm)
        })
        return result
    }

    /** Transforms every pixel via [transform] without allocating extra arrays. */
    private inline fun mapPixels(src: Bitmap, transform: (Int) -> Int): Bitmap {
        val w = src.width; val h = src.height
        val px  = IntArray(w * h).also { src.getPixels(it, 0, w, 0, 0, w, h) }
        val out = IntArray(w * h) { i -> transform(px[i]) }
        return Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888).apply {
            setPixels(out, 0, w, 0, 0, w, h)
        }
    }

    /** Applies [transform] to R, G, B channels independently while preserving alpha. */
    private inline fun mapChannels(color: Int, transform: (Int) -> Int): Int {
        val a = (color shr 24) and 0xFF
        val r = transform((color shr 16) and 0xFF)
        val g = transform((color shr  8) and 0xFF)
        val b = transform(color           and 0xFF)
        return (a shl 24) or (r.coerceIn(0, 255) shl 16) or (g.coerceIn(0, 255) shl 8) or b.coerceIn(0, 255)
    }

    private fun luminance(argb: Int): Int {
        val r = (argb shr 16) and 0xFF
        val g = (argb shr  8) and 0xFF
        val b =  argb         and 0xFF
        return (0.299 * r + 0.587 * g + 0.114 * b).toInt()
    }

    private fun alphaBlend(a: Int, b: Int, t: Float): Int {
        val inv = 1f - t
        fun ch(shift: Int) = (((a shr shift) and 0xFF) * inv + ((b shr shift) and 0xFF) * t).toInt().coerceIn(0, 255)
        return (0xFF shl 24) or (ch(16) shl 16) or (ch(8) shl 8) or ch(0)
    }

    private fun interpolateColor(@ColorInt a: Int, @ColorInt b: Int, t: Float): Int {
        fun ch(shift: Int) = (((a shr shift) and 0xFF) * (1 - t) + ((b shr shift) and 0xFF) * t).toInt().coerceIn(0, 255)
        return (0xFF shl 24) or (ch(16) shl 16) or (ch(8) shl 8) or ch(0)
    }
}
