package com.yourapp.photofilters.filters

import androidx.annotation.ColorInt

/**
 * Sealed hierarchy representing every available photo filter.
 *
 * Filters fall into four families:
 *  - [ColorMatrix]  → GPU-friendly, applied via Android's ColorMatrixColorFilter
 *  - [Convolution]  → Kernel-based spatial filters (sharpen, emboss, edge…)
 *  - [Pixel]        → Direct pixel manipulation (vignette, duotone, pixelate…)
 *  - [Composite]    → Meta-filters that stack other filters
 */
sealed class PhotoFilter {

    // ─────────────────────────────────────────────────────────────────
    // COLOR MATRIX FILTERS  (fast, no pixel-by-pixel iteration)
    // ─────────────────────────────────────────────────────────────────

    /** Classic black & white conversion using luminance weights. */
    object Grayscale : PhotoFilter()

    /** Warm brownish tone reminiscent of old photographs. */
    object Sepia : PhotoFilter()

    /** Faded, slightly desaturated look of aged film. */
    object Vintage : PhotoFilter()

    /** Cold blue-shifted palette. */
    object CoolTone : PhotoFilter()

    /** Golden/amber warm palette. */
    object WarmTone : PhotoFilter()

    /** Inverts all channels (photo negative). */
    object Negative : PhotoFilter()

    /** Crushes blacks and lifts whites for a matte/faded look. */
    object Fade : PhotoFilter()

    /** Aggressive cross-processing: pushed greens and cyans, compressed reds. */
    object CrossProcess : PhotoFilter()

    /** High-contrast vignette-friendly Lomo film simulation. */
    object Lomo : PhotoFilter()

    /** Cold, desaturated moonlight effect with lifted shadows. */
    object Moonlight : PhotoFilter()

    /** Warm red-orange sunset palette. */
    object Sunset : PhotoFilter()

    /** Lush green forest / nature tint. */
    object Forest : PhotoFilter()

    /** Deep blue ocean / underwater tone. */
    object Ocean : PhotoFilter()

    /** Soft pink/rose tint often used in portrait photography. */
    object RoseTint : PhotoFilter()

    /** Over-exposed dreamy whites of a polaroid print. */
    object Polaroid : PhotoFilter()

    /** Cinematic teal-and-orange color grade. */
    object TealAndOrange : PhotoFilter()

    /** Desaturated with slight green-yellow tone (sci-fi / Matrix). */
    object Matrix : PhotoFilter()

    /** Faded purple / lavender dreamy look. */
    object Lavender : PhotoFilter()

    /** Hard high-contrast black & white (newspaper/graphic). */
    object Noir : PhotoFilter()

    /** Warm golden-hour film look. */
    object GoldenHour : PhotoFilter()

    /** Cyberpunk neon: boosted magentas & cyans, crushed blacks. */
    object Cyberpunk : PhotoFilter()

    /** 1970s Kodachrome-inspired saturated reds and warm tones. */
    object Kodachrome : PhotoFilter()

    /** Fujifilm Velvia inspired: ultra-saturated natural tones. */
    object Velvia : PhotoFilter()

    /** Lifted shadows & reduced contrast (Instagram fade style). */
    object FilmFade : PhotoFilter()

    // Parametric color-matrix filters
    /** @param amount  -255f … +255f  (0 = no change) */
    data class Brightness(val amount: Float = 0f) : PhotoFilter()

    /** @param amount  0f … 4f  (1f = original) */
    data class Contrast(val amount: Float = 1f) : PhotoFilter()

    /** @param amount  0f … 4f  (1f = original, 0f = grayscale) */
    data class Saturation(val amount: Float = 1f) : PhotoFilter()

    /** Rotates hue by [degrees] on the color wheel. */
    data class HueRotate(val degrees: Float = 0f) : PhotoFilter()

    /** Exposure compensation in stops. @param ev  -3f … +3f */
    data class Exposure(val ev: Float = 0f) : PhotoFilter()

    /**
     * White-balance shift.
     * @param kelvin  2000 (very warm) … 12000 (very cool)
     */
    data class WhiteBalance(val kelvin: Float = 6500f) : PhotoFilter()

    /** @param amount  0f … 2f  (1f = original shadows) */
    data class Shadows(val amount: Float = 1f) : PhotoFilter()

    /** @param amount  0f … 2f  (1f = original highlights) */
    data class Highlights(val amount: Float = 1f) : PhotoFilter()

    // ─────────────────────────────────────────────────────────────────
    // CONVOLUTION / KERNEL FILTERS
    // ─────────────────────────────────────────────────────────────────

    /** Unsharp-mask based sharpening. */
    object Sharpen : PhotoFilter()

    /** Strong relief / 3-D emboss effect. */
    object Emboss : PhotoFilter()

    /** Laplacian edge detection rendered on black canvas. */
    object EdgeDetect : PhotoFilter()

    /** Sobel gradient magnitude — good for sketch look. */
    object Sobel : PhotoFilter()

    /** Gaussian blur. @param radius  1 … 25 (clamped) */
    data class GaussianBlur(val radius: Int = 5) : PhotoFilter()

    /** Fast box blur (cheaper than Gaussian). @param radius 1 … 25 */
    data class BoxBlur(val radius: Int = 5) : PhotoFilter()

    /** Motion blur along a diagonal. @param length  5 … 40 */
    data class MotionBlur(val length: Int = 15, val angleDeg: Float = 45f) : PhotoFilter()

    /** Bloom glow: blurs highlights and blends back. */
    data class Bloom(val threshold: Int = 180, val blurRadius: Int = 10) : PhotoFilter()

    // ─────────────────────────────────────────────────────────────────
    // PIXEL-MANIPULATION FILTERS
    // ─────────────────────────────────────────────────────────────────

    /** Soft vignette darkening at image edges. @param strength 0f…1f */
    data class Vignette(val strength: Float = 0.5f, val radius: Float = 0.75f) : PhotoFilter()

    /** Block-pixel mosaic effect. @param blockSize 2…64 */
    data class Pixelate(val blockSize: Int = 16) : PhotoFilter()

    /** Maps pixel luminance to two colors. */
    data class Duotone(
        @ColorInt val shadowColor: Int,
        @ColorInt val highlightColor: Int
    ) : PhotoFilter()

    /** Reduces color depth. @param levels 2…8 */
    data class Posterize(val levels: Int = 4) : PhotoFilter()

    /** Clamps pixels to black or white. @param threshold 0…255 */
    data class Threshold(val threshold: Int = 128) : PhotoFilter()

    /** Inverts pixels above half-intensity (psychedelic). */
    object Solarize : PhotoFilter()

    /** Adds film grain / noise. @param intensity 0…150 */
    data class Noise(val intensity: Int = 40) : PhotoFilter()

    /**
     * Simulates lens chromatic aberration.
     * @param offset pixel shift between color channels (1…15)
     */
    data class ChromaticAberration(val offset: Int = 5) : PhotoFilter()

    /** Halftone dots pattern (newspaper print look). @param dotSize 4…20 */
    data class Halftone(val dotSize: Int = 8) : PhotoFilter()

    /** Swirls pixels around the image center. @param strength 0.5f…5f */
    data class Swirl(val strength: Float = 2f) : PhotoFilter()

    /** Barrel or pincushion lens distortion. @param amount -1f…+1f */
    data class LensDistortion(val amount: Float = 0.3f) : PhotoFilter()

    /** Tilt-shift: blurs top & bottom, keeps a horizontal band sharp. @param bandY 0f…1f center */
    data class TiltShift(val bandCenter: Float = 0.5f, val bandWidth: Float = 0.25f, val blurRadius: Int = 8) : PhotoFilter()

    /** Repeats the image in a kaleidoscope-like mirror grid. */
    data class Mirror(val horizontal: Boolean = true, val vertical: Boolean = false) : PhotoFilter()

    /** Glitch: randomly displaces horizontal slices. @param intensity 0f…1f */
    data class Glitch(val intensity: Float = 0.3f, val seed: Long = 42L) : PhotoFilter()

    /** Pencil-sketch look: grayscale edge lines on white. */
    object PencilSketch : PhotoFilter()

    /** Watercolor simulation: smoothed + edge-boosted + slightly desaturated. */
    object Watercolor : PhotoFilter()

    /** Pixel-art palette reduction + nearest-neighbor upscale. */
    data class PixelArt(val paletteSize: Int = 16, val scale: Int = 4) : PhotoFilter()

    /** Maps luminance to a custom gradient palette. */
    data class GradientMap(
        @ColorInt val colors: IntArray,
        val positions: FloatArray = FloatArray(colors.size) { it / (colors.size - 1f) }
    ) : PhotoFilter()

    /** Anaglyph 3D red/cyan glasses effect. */
    object Anaglyph : PhotoFilter()

    /** Comic-book style posterize + edge outlines. */
    object Comic : PhotoFilter()

    /** Oil-painting look via mode-filter approximation. @param radius 2…8 */
    data class OilPainting(val radius: Int = 4, val intensityLevels: Int = 20) : PhotoFilter()

    // ─────────────────────────────────────────────────────────────────
    // COMPOSITE / META FILTERS
    // ─────────────────────────────────────────────────────────────────

    /** Applies multiple filters in sequence. */
    data class Stack(val filters: List<PhotoFilter>) : PhotoFilter()

    /** Blends two bitmaps: original and a filtered version. @param opacity 0f…1f of filtered */
    data class Blend(val filter: PhotoFilter, val opacity: Float = 0.5f) : PhotoFilter()
}
