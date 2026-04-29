package com.yourapp.photofilters.filters

import android.graphics.Bitmap
import kotlin.math.*

/**
 * Kernel-based (convolution) filters that operate in the spatial domain.
 *
 * Design notes:
 * - Every filter works on a copy of the pixel array to avoid in-place artifacts.
 * - We use IntArray pixel buffers (ARGB packed) and bit-shift extraction for speed.
 * - All filters preserve the alpha channel.
 * - Edge pixels are clamped (replicate-pad strategy) — simpler than mirror-pad
 *   and produces no visible ringing for standard kernel sizes.
 *
 * Trade-off: Pure Kotlin/JVM — straightforward and debuggable.
 * For production at large resolutions consider RenderScript / Vulkan compute.
 */
object ConvolutionFilters {

    // ─────────────────────────────────────────────────────────────────
    // Predefined kernels
    // ─────────────────────────────────────────────────────────────────

    private val KERNEL_SHARPEN = floatArrayOf(
         0f, -1f,  0f,
        -1f,  5f, -1f,
         0f, -1f,  0f
    )

    private val KERNEL_SHARPEN_STRONG = floatArrayOf(
        -1f, -1f, -1f,
        -1f,  9f, -1f,
        -1f, -1f, -1f
    )

    private val KERNEL_EMBOSS = floatArrayOf(
        -2f, -1f,  0f,
        -1f,  1f,  1f,
         0f,  1f,  2f
    )

    private val KERNEL_EDGE_LAPLACIAN = floatArrayOf(
         0f, -1f,  0f,
        -1f,  4f, -1f,
         0f, -1f,  0f
    )

    private val KERNEL_SOBEL_X = floatArrayOf(
        -1f, 0f, 1f,
        -2f, 0f, 2f,
        -1f, 0f, 1f
    )

    private val KERNEL_SOBEL_Y = floatArrayOf(
        -1f, -2f, -1f,
         0f,  0f,  0f,
         1f,  2f,  1f
    )

    // ─────────────────────────────────────────────────────────────────
    // Public filter entry-points
    // ─────────────────────────────────────────────────────────────────

    fun sharpen(src: Bitmap): Bitmap = convolve(src, KERNEL_SHARPEN, 3)

    fun sharpenStrong(src: Bitmap): Bitmap = convolve(src, KERNEL_SHARPEN_STRONG, 3)

    fun emboss(src: Bitmap): Bitmap = convolve(src, KERNEL_EMBOSS, 3, bias = 128f)

    fun edgeDetect(src: Bitmap): Bitmap = convolve(src, KERNEL_EDGE_LAPLACIAN, 3, bias = 0f)

    /** Sobel gradient magnitude — luminance of the derivative. */
    fun sobel(src: Bitmap): Bitmap {
        val w = src.width
        val h = src.height
        val pixels = IntArray(w * h).also { src.getPixels(it, 0, w, 0, 0, w, h) }
        val out    = IntArray(w * h)

        // Pre-convert to grayscale luminance
        val lum = IntArray(w * h) { i ->
            val c = pixels[i]
            val r = (c shr 16) and 0xFF
            val g = (c shr  8) and 0xFF
            val b =  c         and 0xFF
            (0.299 * r + 0.587 * g + 0.114 * b).toInt()
        }

        for (y in 0 until h) {
            for (x in 0 until w) {
                var gx = 0f; var gy = 0f
                for (ky in -1..1) for (kx in -1..1) {
                    val px = (x + kx).coerceIn(0, w - 1)
                    val py = (y + ky).coerceIn(0, h - 1)
                    val li = lum[py * w + px].toFloat()
                    val ki = (ky + 1) * 3 + (kx + 1)
                    gx += KERNEL_SOBEL_X[ki] * li
                    gy += KERNEL_SOBEL_Y[ki] * li
                }
                val mag = sqrt(gx * gx + gy * gy).toInt().coerceIn(0, 255)
                out[y * w + x] = (0xFF shl 24) or (mag shl 16) or (mag shl 8) or mag
            }
        }
        return Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888).apply {
            setPixels(out, 0, w, 0, 0, w, h)
        }
    }

    /** Gaussian blur with arbitrary radius (1…25). Separable two-pass for O(r) per pixel. */
    fun gaussianBlur(src: Bitmap, radius: Int): Bitmap {
        val r = radius.coerceIn(1, 25)
        val kernel = buildGaussianKernel1D(r)
        return convolve1D(convolve1D(src, kernel, horizontal = true), kernel, horizontal = false)
    }

    /** Box blur: faster than Gaussian with visually similar results for larger radii. */
    fun boxBlur(src: Bitmap, radius: Int): Bitmap {
        val r = radius.coerceIn(1, 25)
        val size = r * 2 + 1
        val kernel = FloatArray(size) { 1f / size }
        return convolve1D(convolve1D(src, kernel, horizontal = true), kernel, horizontal = false)
    }

    /**
     * Motion blur via a 1-D directional kernel at [angleDeg].
     * Trade-off: we rotate via pixel-walk rather than rotating the bitmap —
     * fewer allocations, acceptable quality for angles that are multiples of small angles.
     */
    fun motionBlur(src: Bitmap, length: Int, angleDeg: Float): Bitmap {
        val len = length.coerceIn(3, 40)
        val rad = Math.toRadians(angleDeg.toDouble())
        val dx  = cos(rad).toFloat()
        val dy  = sin(rad).toFloat()
        val w = src.width
        val h = src.height
        val pixels = IntArray(w * h).also { src.getPixels(it, 0, w, 0, 0, w, h) }
        val out    = IntArray(w * h)

        for (y in 0 until h) {
            for (x in 0 until w) {
                var r = 0f; var g = 0f; var b = 0f; var count = 0
                for (s in -(len / 2)..(len / 2)) {
                    val px = (x + (dx * s).roundToInt()).coerceIn(0, w - 1)
                    val py = (y + (dy * s).roundToInt()).coerceIn(0, h - 1)
                    val c  = pixels[py * w + px]
                    r += (c shr 16) and 0xFF
                    g += (c shr  8) and 0xFF
                    b +=  c         and 0xFF
                    count++
                }
                val alpha = (pixels[y * w + x] shr 24) and 0xFF
                out[y * w + x] = (alpha shl 24) or
                    ((r / count).toInt() shl 16) or
                    ((g / count).toInt() shl 8)  or
                    (b / count).toInt()
            }
        }
        return Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888).apply {
            setPixels(out, 0, w, 0, 0, w, h)
        }
    }

    /**
     * Bloom: blurs highlights and adds them back as a glow overlay.
     * [threshold] controls which bright pixels contribute (0…255).
     */
    fun bloom(src: Bitmap, threshold: Int, blurRadius: Int): Bitmap {
        val w = src.width
        val h = src.height
        val srcPixels = IntArray(w * h).also { src.getPixels(it, 0, w, 0, 0, w, h) }

        // 1. Isolate highlights above threshold
        val highlight = Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888).apply {
            setPixels(IntArray(w * h) { i ->
                val c = srcPixels[i]
                val lum = luminance(c)
                if (lum >= threshold) c else (0xFF shl 24) // transparent black
            }, 0, w, 0, 0, w, h)
        }

        // 2. Blur the highlights
        val blurred = gaussianBlur(highlight, blurRadius)
        val blurPx  = IntArray(w * h).also { blurred.getPixels(it, 0, w, 0, 0, w, h) }
        blurred.recycle()
        highlight.recycle()

        // 3. Screen-blend blurred highlights back onto original
        val out = IntArray(w * h) { i ->
            val base = srcPixels[i]
            val glow = blurPx[i]
            screenBlend(base, glow)
        }
        return Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888).apply {
            setPixels(out, 0, w, 0, 0, w, h)
        }
    }

    // ─────────────────────────────────────────────────────────────────
    // Private helpers
    // ─────────────────────────────────────────────────────────────────

    /**
     * Generic 2-D convolution with a square kernel of [size]×[size].
     * [bias] is added to each channel output before clamping (useful for emboss).
     */
    private fun convolve(src: Bitmap, kernel: FloatArray, size: Int, bias: Float = 0f): Bitmap {
        val w = src.width
        val h = src.height
        val half = size / 2
        val pixels = IntArray(w * h).also { src.getPixels(it, 0, w, 0, 0, w, h) }
        val out    = IntArray(w * h)

        for (y in 0 until h) {
            for (x in 0 until w) {
                var rAcc = bias; var gAcc = bias; var bAcc = bias
                for (ky in 0 until size) for (kx in 0 until size) {
                    val px = (x + kx - half).coerceIn(0, w - 1)
                    val py = (y + ky - half).coerceIn(0, h - 1)
                    val c  = pixels[py * w + px]
                    val k  = kernel[ky * size + kx]
                    rAcc += ((c shr 16) and 0xFF) * k
                    gAcc += ((c shr  8) and 0xFF) * k
                    bAcc +=  (c         and 0xFF) * k
                }
                val a = (pixels[y * w + x] shr 24) and 0xFF
                out[y * w + x] = (a shl 24) or
                    (rAcc.toInt().coerceIn(0, 255) shl 16) or
                    (gAcc.toInt().coerceIn(0, 255) shl  8) or
                    bAcc.toInt().coerceIn(0, 255)
            }
        }
        return Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888).apply {
            setPixels(out, 0, w, 0, 0, w, h)
        }
    }

    /** Separable 1-D convolution pass (horizontal or vertical). */
    private fun convolve1D(src: Bitmap, kernel: FloatArray, horizontal: Boolean): Bitmap {
        val w = src.width
        val h = src.height
        val half = kernel.size / 2
        val pixels = IntArray(w * h).also { src.getPixels(it, 0, w, 0, 0, w, h) }
        val out    = IntArray(w * h)

        for (y in 0 until h) {
            for (x in 0 until w) {
                var rAcc = 0f; var gAcc = 0f; var bAcc = 0f
                for (k in kernel.indices) {
                    val offset = k - half
                    val px = if (horizontal) (x + offset).coerceIn(0, w - 1) else x
                    val py = if (!horizontal) (y + offset).coerceIn(0, h - 1) else y
                    val c  = pixels[py * w + px]
                    rAcc += ((c shr 16) and 0xFF) * kernel[k]
                    gAcc += ((c shr  8) and 0xFF) * kernel[k]
                    bAcc +=  (c         and 0xFF) * kernel[k]
                }
                val a = (pixels[y * w + x] shr 24) and 0xFF
                out[y * w + x] = (a shl 24) or
                    (rAcc.toInt().coerceIn(0, 255) shl 16) or
                    (gAcc.toInt().coerceIn(0, 255) shl  8) or
                    rAcc.toInt().coerceIn(0, 255).let { bAcc.toInt().coerceIn(0, 255) }
            }
        }
        return Bitmap.createBitmap(w, h, Bitmap.Config.ARGB_8888).apply {
            setPixels(out, 0, w, 0, 0, w, h)
        }
    }

    private fun buildGaussianKernel1D(radius: Int): FloatArray {
        val size   = radius * 2 + 1
        val sigma  = radius / 3.0
        val kernel = FloatArray(size) { i ->
            val x = (i - radius).toDouble()
            exp(-(x * x) / (2 * sigma * sigma)).toFloat()
        }
        val sum = kernel.sum()
        return FloatArray(size) { kernel[it] / sum }
    }

    private fun luminance(argb: Int): Int {
        val r = (argb shr 16) and 0xFF
        val g = (argb shr  8) and 0xFF
        val b =  argb         and 0xFF
        return (0.299 * r + 0.587 * g + 0.114 * b).toInt()
    }

    /** Screen blend mode: C = 1 - (1-A)*(1-B) */
    private fun screenBlend(base: Int, glow: Int): Int {
        val a = (base shr 24) and 0xFF
        fun ch(shift: Int): Int {
            val b = ((base shr shift) and 0xFF) / 255f
            val g = ((glow shr shift) and 0xFF) / 255f
            return ((1f - (1f - b) * (1f - g)) * 255f).toInt().coerceIn(0, 255)
        }
        return (a shl 24) or (ch(16) shl 16) or (ch(8) shl 8) or ch(0)
    }
}
