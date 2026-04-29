package com.yourapp.photofilters.filters

import android.graphics.Bitmap
import android.graphics.Canvas
import android.graphics.ColorMatrixColorFilter
import android.graphics.Paint

/**
 * Main filter processor. Single entry-point that dispatches to the correct
 * implementation family based on the [PhotoFilter] type.
 *
 * Usage:
 * ```kotlin
 * val result = PhotoFilterProcessor.apply(bitmap, PhotoFilter.Sepia)
 * val stacked = PhotoFilterProcessor.apply(bitmap, PhotoFilter.Stack(listOf(
 *     PhotoFilter.Grayscale,
 *     PhotoFilter.Vignette(0.6f)
 * )))
 * ```
 *
 * Thread safety: Each call allocates a new output [Bitmap].
 * Run on [kotlinx.coroutines.Dispatchers.Default] for UI safety.
 */
object PhotoFilterProcessor {

    /**
     * Applies [filter] to [src] and returns a new [Bitmap].
     * The original [src] is never mutated.
     *
     * @throws IllegalArgumentException for invalid parametric values (propagated from sub-processors)
     */
    fun apply(src: Bitmap, filter: PhotoFilter): Bitmap = when (filter) {

        // ── Color Matrix ──────────────────────────────────────────────
        PhotoFilter.Grayscale     -> applyMatrix(src, ColorMatrixFilters.grayscale)
        PhotoFilter.Sepia         -> applyMatrix(src, ColorMatrixFilters.sepia)
        PhotoFilter.Vintage       -> applyMatrix(src, ColorMatrixFilters.vintage)
        PhotoFilter.CoolTone      -> applyMatrix(src, ColorMatrixFilters.coolTone)
        PhotoFilter.WarmTone      -> applyMatrix(src, ColorMatrixFilters.warmTone)
        PhotoFilter.Negative      -> applyMatrix(src, ColorMatrixFilters.negative)
        PhotoFilter.Fade          -> applyMatrix(src, ColorMatrixFilters.fade)
        PhotoFilter.CrossProcess  -> applyMatrix(src, ColorMatrixFilters.crossProcess)
        PhotoFilter.Lomo          -> applyMatrix(src, ColorMatrixFilters.lomo)
        PhotoFilter.Moonlight     -> applyMatrix(src, ColorMatrixFilters.moonlight)
        PhotoFilter.Sunset        -> applyMatrix(src, ColorMatrixFilters.sunset)
        PhotoFilter.Forest        -> applyMatrix(src, ColorMatrixFilters.forest)
        PhotoFilter.Ocean         -> applyMatrix(src, ColorMatrixFilters.ocean)
        PhotoFilter.RoseTint      -> applyMatrix(src, ColorMatrixFilters.roseTint)
        PhotoFilter.Polaroid      -> applyMatrix(src, ColorMatrixFilters.polaroid)
        PhotoFilter.TealAndOrange -> applyMatrix(src, ColorMatrixFilters.tealAndOrange)
        PhotoFilter.Matrix        -> applyMatrix(src, ColorMatrixFilters.matrixFilter)
        PhotoFilter.Lavender      -> applyMatrix(src, ColorMatrixFilters.lavender)
        PhotoFilter.Noir          -> applyMatrix(src, ColorMatrixFilters.noir)
        PhotoFilter.GoldenHour    -> applyMatrix(src, ColorMatrixFilters.goldenHour)
        PhotoFilter.Cyberpunk     -> applyMatrix(src, ColorMatrixFilters.cyberpunk)
        PhotoFilter.Kodachrome    -> applyMatrix(src, ColorMatrixFilters.kodachrome)
        PhotoFilter.Velvia        -> applyMatrix(src, ColorMatrixFilters.velvia)
        PhotoFilter.FilmFade      -> applyMatrix(src, ColorMatrixFilters.filmFade)

        is PhotoFilter.Brightness    -> applyMatrix(src, ColorMatrixFilters.brightness(filter.amount))
        is PhotoFilter.Contrast      -> applyMatrix(src, ColorMatrixFilters.buildContrastMatrix(filter.amount))
        is PhotoFilter.Saturation    -> applyMatrix(src, ColorMatrixFilters.buildSaturationMatrix(filter.amount))
        is PhotoFilter.HueRotate     -> applyMatrix(src, ColorMatrixFilters.hueRotate(filter.degrees))
        is PhotoFilter.Exposure      -> applyMatrix(src, ColorMatrixFilters.exposure(filter.ev))
        is PhotoFilter.WhiteBalance  -> applyMatrix(src, ColorMatrixFilters.whiteBalance(filter.kelvin))
        is PhotoFilter.Shadows       -> applyMatrix(src, ColorMatrixFilters.shadows(filter.amount))
        is PhotoFilter.Highlights    -> applyMatrix(src, ColorMatrixFilters.highlights(filter.amount))

        // ── Convolution ───────────────────────────────────────────────
        PhotoFilter.Sharpen          -> ConvolutionFilters.sharpen(src)
        PhotoFilter.Emboss           -> ConvolutionFilters.emboss(src)
        PhotoFilter.EdgeDetect       -> ConvolutionFilters.edgeDetect(src)
        PhotoFilter.Sobel            -> ConvolutionFilters.sobel(src)
        is PhotoFilter.GaussianBlur  -> ConvolutionFilters.gaussianBlur(src, filter.radius)
        is PhotoFilter.BoxBlur       -> ConvolutionFilters.boxBlur(src, filter.radius)
        is PhotoFilter.MotionBlur    -> ConvolutionFilters.motionBlur(src, filter.length, filter.angleDeg)
        is PhotoFilter.Bloom         -> ConvolutionFilters.bloom(src, filter.threshold, filter.blurRadius)

        // ── Pixel ──────────────────────────────────────────────────────
        is PhotoFilter.Vignette             -> PixelFilters.vignette(src, filter.strength, filter.radius)
        is PhotoFilter.Pixelate             -> PixelFilters.pixelate(src, filter.blockSize)
        is PhotoFilter.Duotone              -> PixelFilters.duotone(src, filter.shadowColor, filter.highlightColor)
        is PhotoFilter.Posterize            -> PixelFilters.posterize(src, filter.levels)
        is PhotoFilter.Threshold            -> PixelFilters.threshold(src, filter.threshold)
        PhotoFilter.Solarize                -> PixelFilters.solarize(src)
        is PhotoFilter.Noise                -> PixelFilters.noise(src, filter.intensity)
        is PhotoFilter.ChromaticAberration  -> PixelFilters.chromaticAberration(src, filter.offset)
        is PhotoFilter.Halftone             -> PixelFilters.halftone(src, filter.dotSize)
        is PhotoFilter.Swirl                -> PixelFilters.swirl(src, filter.strength)
        is PhotoFilter.LensDistortion       -> PixelFilters.lensDistortion(src, filter.amount)
        is PhotoFilter.TiltShift            -> PixelFilters.tiltShift(src, filter.bandCenter, filter.bandWidth, filter.blurRadius)
        is PhotoFilter.Mirror               -> PixelFilters.mirror(src, filter.horizontal, filter.vertical)
        is PhotoFilter.Glitch               -> PixelFilters.glitch(src, filter.intensity, filter.seed)
        PhotoFilter.PencilSketch            -> PixelFilters.pencilSketch(src)
        PhotoFilter.Watercolor              -> PixelFilters.watercolor(src)
        is PhotoFilter.PixelArt             -> PixelFilters.pixelArt(src, filter.paletteSize, filter.scale)
        is PhotoFilter.GradientMap          -> PixelFilters.gradientMap(src, filter.colors, filter.positions)
        PhotoFilter.Anaglyph                -> PixelFilters.anaglyph(src)
        PhotoFilter.Comic                   -> PixelFilters.comic(src)
        is PhotoFilter.OilPainting          -> PixelFilters.oilPainting(src, filter.radius, filter.intensityLevels)

        // ── Composite ──────────────────────────────────────────────────
        is PhotoFilter.Stack -> filter.filters.fold(src) { acc, f ->
            val result = apply(acc, f)
            // Recycle intermediate bitmaps (except the original src)
            if (acc !== src) acc.recycle()
            result
        }

        is PhotoFilter.Blend -> {
            val filtered = apply(src, filter.filter)
            blendBitmaps(src, filtered, filter.opacity).also { filtered.recycle() }
        }
    }

    // ─────────────────────────────────────────────────────────────────
    // Private helpers
    // ─────────────────────────────────────────────────────────────────

    private fun applyMatrix(src: Bitmap, cm: android.graphics.ColorMatrix): Bitmap {
        val result = Bitmap.createBitmap(src.width, src.height, Bitmap.Config.ARGB_8888)
        Canvas(result).drawBitmap(src, 0f, 0f, Paint().apply {
            colorFilter = ColorMatrixColorFilter(cm)
        })
        return result
    }

    /**
     * Linear alpha blend: (1-opacity)*base + opacity*overlay.
     * Trade-off: uses Canvas alpha rather than pixel loop — hardware accelerated.
     */
    private fun blendBitmaps(base: Bitmap, overlay: Bitmap, opacity: Float): Bitmap {
        val result = base.copy(Bitmap.Config.ARGB_8888, true)
        Canvas(result).drawBitmap(overlay, 0f, 0f, Paint().apply {
            alpha = (opacity.coerceIn(0f, 1f) * 255).toInt()
        })
        return result
    }
}
