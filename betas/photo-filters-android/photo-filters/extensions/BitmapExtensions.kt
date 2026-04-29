package com.yourapp.photofilters.extensions

import android.graphics.Bitmap
import android.graphics.Color
import com.yourapp.photofilters.filters.PhotoFilter
import com.yourapp.photofilters.filters.PhotoFilterProcessor

/**
 * Kotlin extension functions on [Bitmap] for ergonomic filter chaining.
 *
 * Example:
 * ```kotlin
 * val result = bitmap
 *     .applyFilter(PhotoFilter.Grayscale)
 *     .applyFilter(PhotoFilter.Vignette(0.6f))
 *     .applyFilter(PhotoFilter.Noise(30))
 * ```
 */

/** Applies a single filter and returns a new bitmap. */
fun Bitmap.applyFilter(filter: PhotoFilter): Bitmap =
    PhotoFilterProcessor.apply(this, filter)

/** Chains multiple filters sequentially (equivalent to [PhotoFilter.Stack]). */
fun Bitmap.applyFilters(vararg filters: PhotoFilter): Bitmap =
    applyFilter(PhotoFilter.Stack(filters.toList()))

/** Convenience: apply grayscale. */
fun Bitmap.toGrayscale(): Bitmap = applyFilter(PhotoFilter.Grayscale)

/** Convenience: apply sepia. */
fun Bitmap.toSepia(): Bitmap = applyFilter(PhotoFilter.Sepia)

/** Convenience: blur with given radius. */
fun Bitmap.blur(radius: Int = 5): Bitmap = applyFilter(PhotoFilter.GaussianBlur(radius))

/** Convenience: pixelate with given block size. */
fun Bitmap.pixelate(blockSize: Int = 16): Bitmap = applyFilter(PhotoFilter.Pixelate(blockSize))

/** Convenience: add vignette. */
fun Bitmap.vignette(strength: Float = 0.5f): Bitmap = applyFilter(PhotoFilter.Vignette(strength))

/** Convenience: pencil sketch effect. */
fun Bitmap.toPencilSketch(): Bitmap = applyFilter(PhotoFilter.PencilSketch)

/** Convenience: oil painting effect. */
fun Bitmap.toOilPainting(radius: Int = 4): Bitmap = applyFilter(PhotoFilter.OilPainting(radius))

/** Convenience: watercolor effect. */
fun Bitmap.toWatercolor(): Bitmap = applyFilter(PhotoFilter.Watercolor)

/** Convenience: comic book effect. */
fun Bitmap.toComic(): Bitmap = applyFilter(PhotoFilter.Comic)

/** Convenience: glitch effect. */
fun Bitmap.glitch(intensity: Float = 0.3f): Bitmap = applyFilter(PhotoFilter.Glitch(intensity))

/**
 * Applies a filter with a preview-friendly scaled-down intermediate.
 * Use for expensive filters (OilPainting, Halftone) during live preview.
 * Final export should call [applyFilter] directly.
 *
 * @param previewScale fraction of original size (e.g. 0.5f = half resolution)
 */
fun Bitmap.applyFilterPreview(filter: PhotoFilter, previewScale: Float = 0.5f): Bitmap {
    val scale   = previewScale.coerceIn(0.1f, 1f)
    val preview = Bitmap.createScaledBitmap(this, (width * scale).toInt(), (height * scale).toInt(), true)
    val filtered = PhotoFilterProcessor.apply(preview, filter)
    preview.recycle()
    return Bitmap.createScaledBitmap(filtered, width, height, true).also { filtered.recycle() }
}

/**
 * Returns a [List] of all available preset filters applied to a thumbnail.
 * Useful for building a filter picker carousel.
 *
 * @param thumbnailSize side length of the square thumbnail in pixels
 */
fun Bitmap.generateFilterPreviews(thumbnailSize: Int = 120): List<Pair<String, Bitmap>> {
    val thumb = Bitmap.createScaledBitmap(this, thumbnailSize, thumbnailSize, true)
    return PRESET_FILTERS.map { (name, filter) ->
        name to PhotoFilterProcessor.apply(thumb, filter)
    }.also { thumb.recycle() }
}

// ─── Preset catalog ───────────────────────────────────────────────────────────

/** Ordered list of (label → filter) pairs for display in filter pickers. */
val PRESET_FILTERS: List<Pair<String, PhotoFilter>> = listOf(
    "Original"       to PhotoFilter.Stack(emptyList()),
    "Grayscale"      to PhotoFilter.Grayscale,
    "Sepia"          to PhotoFilter.Sepia,
    "Vintage"        to PhotoFilter.Vintage,
    "Cool"           to PhotoFilter.CoolTone,
    "Warm"           to PhotoFilter.WarmTone,
    "Negative"       to PhotoFilter.Negative,
    "Fade"           to PhotoFilter.Fade,
    "Cross Process"  to PhotoFilter.CrossProcess,
    "Lomo"           to PhotoFilter.Lomo,
    "Moonlight"      to PhotoFilter.Moonlight,
    "Sunset"         to PhotoFilter.Sunset,
    "Forest"         to PhotoFilter.Forest,
    "Ocean"          to PhotoFilter.Ocean,
    "Rose"           to PhotoFilter.RoseTint,
    "Polaroid"       to PhotoFilter.Polaroid,
    "Teal & Orange"  to PhotoFilter.TealAndOrange,
    "Matrix"         to PhotoFilter.Matrix,
    "Lavender"       to PhotoFilter.Lavender,
    "Noir"           to PhotoFilter.Noir,
    "Golden Hour"    to PhotoFilter.GoldenHour,
    "Cyberpunk"      to PhotoFilter.Cyberpunk,
    "Kodachrome"     to PhotoFilter.Kodachrome,
    "Velvia"         to PhotoFilter.Velvia,
    "Film Fade"      to PhotoFilter.FilmFade,
    "Sharpen"        to PhotoFilter.Sharpen,
    "Emboss"         to PhotoFilter.Emboss,
    "Edge Detect"    to PhotoFilter.EdgeDetect,
    "Sketch"         to PhotoFilter.Sobel,
    "Blur"           to PhotoFilter.GaussianBlur(8),
    "Motion Blur"    to PhotoFilter.MotionBlur(20, 0f),
    "Bloom"          to PhotoFilter.Bloom(160, 12),
    "Vignette"       to PhotoFilter.Vignette(0.6f),
    "Pixelate"       to PhotoFilter.Pixelate(12),
    "Halftone"       to PhotoFilter.Halftone(8),
    "Posterize"      to PhotoFilter.Posterize(4),
    "Threshold"      to PhotoFilter.Threshold(128),
    "Solarize"       to PhotoFilter.Solarize,
    "Noise/Grain"    to PhotoFilter.Noise(35),
    "Aberration"     to PhotoFilter.ChromaticAberration(6),
    "Swirl"          to PhotoFilter.Swirl(2.5f),
    "Lens Distort"   to PhotoFilter.LensDistortion(0.4f),
    "Tilt Shift"     to PhotoFilter.TiltShift(0.5f, 0.2f, 8),
    "Mirror H"       to PhotoFilter.Mirror(horizontal = true),
    "Glitch"         to PhotoFilter.Glitch(0.4f),
    "Pencil Sketch"  to PhotoFilter.PencilSketch,
    "Watercolor"     to PhotoFilter.Watercolor,
    "Pixel Art"      to PhotoFilter.PixelArt(16, 6),
    "Anaglyph 3D"    to PhotoFilter.Anaglyph,
    "Comic"          to PhotoFilter.Comic,
    "Oil Painting"   to PhotoFilter.OilPainting(4),
    "Duotone Blue"   to PhotoFilter.Duotone(Color.parseColor("#1a237e"), Color.parseColor("#80deea")),
    "Duotone Red"    to PhotoFilter.Duotone(Color.parseColor("#b71c1c"), Color.parseColor("#fff9c4")),
    "Gradient Heat"  to PhotoFilter.GradientMap(
        intArrayOf(Color.BLACK, Color.RED, Color.YELLOW, Color.WHITE),
        floatArrayOf(0f, 0.33f, 0.67f, 1f)
    ),
    // Compound presets
    "Lomo + Vignette" to PhotoFilter.Stack(listOf(PhotoFilter.Lomo, PhotoFilter.Vignette(0.7f))),
    "Vintage Film"    to PhotoFilter.Stack(listOf(
        PhotoFilter.Sepia, PhotoFilter.Noise(20), PhotoFilter.Vignette(0.5f)
    )),
    "Neon Cyberpunk"  to PhotoFilter.Stack(listOf(
        PhotoFilter.Cyberpunk, PhotoFilter.Bloom(150, 8), PhotoFilter.Vignette(0.4f)
    )),
    "Moonlight Sketch" to PhotoFilter.Stack(listOf(PhotoFilter.Moonlight, PhotoFilter.Sobel)),
    "Warm Portrait"   to PhotoFilter.Stack(listOf(
        PhotoFilter.WarmTone, PhotoFilter.Saturation(1.2f), PhotoFilter.Vignette(0.4f)
    )),
)
