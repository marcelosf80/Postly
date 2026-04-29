package com.yourapp.photofilters.filters

import android.graphics.ColorMatrix
import kotlin.math.*

/**
 * Builds [ColorMatrix] instances for every color-matrix-based [PhotoFilter].
 *
 * A 4×5 ColorMatrix transforms [R, G, B, A] via:
 *   R' = m[0]*R + m[1]*G + m[2]*B + m[3]*A + m[4]
 *   G' = m[5]*R + m[6]*G + m[7]*B + m[8]*A + m[9]
 *   B' = m[10]*R + m[11]*G + m[12]*B + m[13]*A + m[14]
 *   A' = m[15]*R + m[16]*G + m[17]*B + m[18]*A + m[19]
 *
 * All values in 0–255 input space. Android scales the offset column (m[4,9,14,19]) ÷ 255.
 */
object ColorMatrixFilters {

    // ─── Pre-built filter matrices ────────────────────────────────────

    val grayscale: ColorMatrix get() = ColorMatrix().apply { setSaturation(0f) }

    val sepia: ColorMatrix get() = colorMatrix(
        0.393f, 0.769f, 0.189f, 0f, 0f,
        0.349f, 0.686f, 0.168f, 0f, 0f,
        0.272f, 0.534f, 0.131f, 0f, 0f,
        0.000f, 0.000f, 0.000f, 1f, 0f
    )

    val vintage: ColorMatrix get() = colorMatrix(
        0.9f, 0.05f, 0.05f, 0f, 10f,
        0.0f, 0.80f, 0.05f, 0f,  5f,
        0.0f, 0.05f, 0.75f, 0f, -5f,
        0.0f, 0.00f, 0.00f, 1f,  0f
    )

    val coolTone: ColorMatrix get() = colorMatrix(
        0.85f, 0.00f, 0.15f, 0f, -10f,
        0.00f, 0.95f, 0.05f, 0f,   5f,
        0.15f, 0.05f, 1.05f, 0f,  15f,
        0.00f, 0.00f, 0.00f, 1f,   0f
    )

    val warmTone: ColorMatrix get() = colorMatrix(
        1.10f, 0.05f, 0.00f, 0f, 15f,
        0.00f, 0.95f, 0.00f, 0f,  5f,
        0.00f, 0.00f, 0.85f, 0f, -10f,
        0.00f, 0.00f, 0.00f, 1f,   0f
    )

    val negative: ColorMatrix get() = colorMatrix(
        -1f, 0f, 0f, 0f, 255f,
         0f,-1f, 0f, 0f, 255f,
         0f, 0f,-1f, 0f, 255f,
         0f, 0f, 0f, 1f,   0f
    )

    val fade: ColorMatrix get() = colorMatrix(
        0.9f, 0.0f, 0.0f, 0f, 25f,
        0.0f, 0.9f, 0.0f, 0f, 25f,
        0.0f, 0.0f, 0.9f, 0f, 25f,
        0.0f, 0.0f, 0.0f, 1f,  0f
    )

    val crossProcess: ColorMatrix get() = colorMatrix(
        1.00f,-0.15f, 0.10f, 0f,  5f,
       -0.15f, 1.10f,-0.05f, 0f, -5f,
        0.05f,-0.05f, 1.20f, 0f,-10f,
        0.00f, 0.00f, 0.00f, 1f,  0f
    )

    val lomo: ColorMatrix get() = buildSaturationMatrix(1.8f).apply {
        postConcat(buildContrastMatrix(1.3f))
    }

    val moonlight: ColorMatrix get() = colorMatrix(
        0.7f, 0.1f, 0.3f, 0f, -10f,
        0.1f, 0.7f, 0.3f, 0f, -15f,
        0.2f, 0.2f, 0.9f, 0f,  10f,
        0.0f, 0.0f, 0.0f, 1f,   0f
    )

    val sunset: ColorMatrix get() = colorMatrix(
        1.20f, 0.10f, 0.00f, 0f, 20f,
        0.00f, 0.90f, 0.00f, 0f, -5f,
        0.00f, 0.00f, 0.70f, 0f,-20f,
        0.00f, 0.00f, 0.00f, 1f,  0f
    )

    val forest: ColorMatrix get() = colorMatrix(
        0.80f, 0.00f, 0.00f, 0f, -10f,
        0.10f, 1.10f, 0.05f, 0f,  10f,
        0.00f, 0.05f, 0.70f, 0f, -15f,
        0.00f, 0.00f, 0.00f, 1f,   0f
    )

    val ocean: ColorMatrix get() = colorMatrix(
        0.70f, 0.05f, 0.10f, 0f, -10f,
        0.05f, 0.90f, 0.10f, 0f,   5f,
        0.10f, 0.10f, 1.20f, 0f,  20f,
        0.00f, 0.00f, 0.00f, 1f,   0f
    )

    val roseTint: ColorMatrix get() = colorMatrix(
        1.10f, 0.05f, 0.05f, 0f, 15f,
        0.05f, 0.85f, 0.05f, 0f, -5f,
        0.05f, 0.05f, 0.90f, 0f,  5f,
        0.00f, 0.00f, 0.00f, 1f,  0f
    )

    val polaroid: ColorMatrix get() = colorMatrix(
        1.44f, -0.14f,  0.07f, 0f, -14f,
       -0.14f,  1.32f, -0.14f, 0f,  10f,
       -0.07f, -0.07f,  1.16f, 0f,  20f,
        0.00f,  0.00f,  0.00f, 1f,   0f
    )

    // Teal-and-Orange: lifts shadows toward teal, pushes mids toward orange
    val tealAndOrange: ColorMatrix get() = colorMatrix(
        1.20f,-0.10f,-0.10f, 0f, 10f,
        0.00f, 0.90f,-0.10f, 0f,  0f,
       -0.20f, 0.10f, 1.10f, 0f,-10f,
        0.00f, 0.00f, 0.00f, 1f,  0f
    )

    // Sci-fi green-on-black Matrix terminal look
    val matrixFilter: ColorMatrix get() = colorMatrix(
        0.0f, 0.0f, 0.0f, 0f,  0f,
        0.5f, 0.7f, 0.3f, 0f,  0f,
        0.0f, 0.0f, 0.0f, 0f,  0f,
        0.0f, 0.0f, 0.0f, 1f,  0f
    )

    val lavender: ColorMatrix get() = colorMatrix(
        0.90f, 0.05f, 0.15f, 0f,  5f,
        0.00f, 0.80f, 0.05f, 0f, -5f,
        0.15f, 0.05f, 1.00f, 0f, 10f,
        0.00f, 0.00f, 0.00f, 1f,  0f
    )

    val noir: ColorMatrix get() = buildContrastMatrix(2.0f).apply {
        postConcat(ColorMatrix().apply { setSaturation(0f) })
    }

    val goldenHour: ColorMatrix get() = colorMatrix(
        1.30f, 0.10f, 0.00f, 0f, 20f,
        0.00f, 1.05f, 0.00f, 0f,  5f,
        0.00f, 0.00f, 0.80f, 0f,-15f,
        0.00f, 0.00f, 0.00f, 1f,  0f
    )

    val cyberpunk: ColorMatrix get() = colorMatrix(
        1.00f,-0.20f, 0.30f, 0f, 10f,
        0.00f, 0.90f, 0.20f, 0f,  0f,
        0.30f, 0.00f, 1.30f, 0f, 20f,
        0.00f, 0.00f, 0.00f, 1f,  0f
    )

    val kodachrome: ColorMatrix get() = colorMatrix(
        1.2185f, -0.0780f, -0.0620f, 0f,  0.0f,
       -0.0300f,  1.0500f, -0.0800f, 0f,  0.0f,
       -0.0300f, -0.0560f,  1.0500f, 0f,  0.0f,
        0.0000f,  0.0000f,  0.0000f, 1f,  0.0f
    ).apply { postConcat(buildSaturationMatrix(1.35f)) }

    val velvia: ColorMatrix get() = buildSaturationMatrix(1.8f).apply {
        postConcat(buildContrastMatrix(1.1f))
        postConcat(colorMatrix(
            1.05f, 0.0f, 0.0f, 0f, 0f,
            0.00f, 1.0f, 0.0f, 0f, 0f,
            0.00f, 0.0f, 0.95f, 0f, 0f,
            0.00f, 0.0f, 0.00f, 1f, 0f
        ))
    }

    val filmFade: ColorMatrix get() = colorMatrix(
        0.80f, 0.00f, 0.00f, 0f, 30f,
        0.00f, 0.80f, 0.00f, 0f, 30f,
        0.00f, 0.00f, 0.80f, 0f, 30f,
        0.00f, 0.00f, 0.00f, 1f,  0f
    ).apply { postConcat(buildSaturationMatrix(0.85f)) }

    // ─── Parametric builders ──────────────────────────────────────────

    fun brightness(amount: Float): ColorMatrix = colorMatrix(
        1f, 0f, 0f, 0f, amount,
        0f, 1f, 0f, 0f, amount,
        0f, 0f, 1f, 0f, amount,
        0f, 0f, 0f, 1f, 0f
    )

    fun buildContrastMatrix(contrast: Float): ColorMatrix {
        val offset = 127.5f * (1f - contrast)
        return colorMatrix(
            contrast, 0f, 0f, 0f, offset,
            0f, contrast, 0f, 0f, offset,
            0f, 0f, contrast, 0f, offset,
            0f, 0f, 0f, 1f, 0f
        )
    }

    fun buildSaturationMatrix(saturation: Float): ColorMatrix =
        ColorMatrix().apply { setSaturation(saturation) }

    /**
     * Hue rotation using a rodrigues-style rotation in RGB space.
     * Trade-off: cheaper than HSL round-trip, imperceptibly different results.
     */
    fun hueRotate(degrees: Float): ColorMatrix {
        val rad = Math.toRadians(degrees.toDouble()).toFloat()
        val cos = cos(rad)
        val sin = sin(rad)
        // Rodrigues rotation projected onto luminance-preserving axis [0.213, 0.715, 0.072]
        return colorMatrix(
            0.213f + cos * 0.787f - sin * 0.213f,
            0.715f - cos * 0.715f - sin * 0.715f,
            0.072f - cos * 0.072f + sin * 0.928f,
            0f, 0f,
            0.213f - cos * 0.213f + sin * 0.143f,
            0.715f + cos * 0.285f + sin * 0.140f,
            0.072f - cos * 0.072f - sin * 0.283f,
            0f, 0f,
            0.213f - cos * 0.213f - sin * 0.787f,
            0.715f - cos * 0.715f + sin * 0.715f,
            0.072f + cos * 0.928f + sin * 0.072f,
            0f, 0f,
            0f, 0f, 0f, 1f, 0f
        )
    }

    /**
     * Exposure in stops: each stop doubles/halves pixel brightness.
     * Multiplicative — perceptually closer to real camera exposure than additive brightness.
     */
    fun exposure(ev: Float): ColorMatrix {
        val multiplier = 2f.pow(ev)
        return colorMatrix(
            multiplier, 0f, 0f, 0f, 0f,
            0f, multiplier, 0f, 0f, 0f,
            0f, 0f, multiplier, 0f, 0f,
            0f, 0f, 0f, 1f, 0f
        )
    }

    /**
     * White-balance by approximating Planckian locus.
     * Maps color temperature (Kelvin) to an RGB multiplier triplet.
     *
     * Trade-off: polynomial approximation (Tanner Helland, 2012) — not physically exact,
     * but perceptually convincing and allocation-free.
     */
    fun whiteBalance(kelvin: Float): ColorMatrix {
        val k = kelvin / 100f
        val r: Float
        val g: Float
        val b: Float

        r = if (k <= 66f) 1f
        else (329.698727446f * (k - 60f).pow(-0.1332047592f)) / 255f

        g = when {
            k <= 66f -> (99.4708025861f * ln(k.toDouble()).toFloat() - 161.1195681661f) / 255f
            else     -> (288.1221695283f * (k - 60f).pow(-0.0755148492f)) / 255f
        }

        b = when {
            k >= 66f -> 1f
            k <= 19f -> 0f
            else     -> (138.5177312231f * ln((k - 10).toDouble()).toFloat() - 305.0447927307f) / 255f
        }

        return colorMatrix(
            r.coerceIn(0f, 1f), 0f, 0f, 0f, 0f,
            0f, g.coerceIn(0f, 1f), 0f, 0f, 0f,
            0f, 0f, b.coerceIn(0f, 1f), 0f, 0f,
            0f, 0f, 0f, 1f, 0f
        )
    }

    fun shadows(amount: Float): ColorMatrix {
        // Lifts shadow (dark end) while leaving highlights untouched
        val lift = (1f - amount) * 40f
        return colorMatrix(
            amount, 0f, 0f, 0f, lift,
            0f, amount, 0f, 0f, lift,
            0f, 0f, amount, 0f, lift,
            0f, 0f, 0f, 1f, 0f
        )
    }

    fun highlights(amount: Float): ColorMatrix {
        // Pulls down highlights while leaving shadows roughly in place
        val scale = amount.coerceIn(0f, 2f)
        val offset = if (scale < 1f) (1f - scale) * -30f else 0f
        return colorMatrix(
            scale, 0f, 0f, 0f, offset,
            0f, scale, 0f, 0f, offset,
            0f, 0f, scale, 0f, offset,
            0f, 0f, 0f, 1f, 0f
        )
    }

    // ─── Helpers ──────────────────────────────────────────────────────

    /** Concise 4×5 ColorMatrix constructor from row-major values. */
    fun colorMatrix(
        r0: Float, r1: Float, r2: Float, r3: Float, r4: Float,
        g0: Float, g1: Float, g2: Float, g3: Float, g4: Float,
        b0: Float, b1: Float, b2: Float, b3: Float, b4: Float,
        a0: Float, a1: Float, a2: Float, a3: Float, a4: Float
    ): ColorMatrix = ColorMatrix(floatArrayOf(
        r0, r1, r2, r3, r4,
        g0, g1, g2, g3, g4,
        b0, b1, b2, b3, b4,
        a0, a1, a2, a3, a4
    ))
}
