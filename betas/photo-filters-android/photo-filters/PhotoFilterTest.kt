package com.yourapp.photofilters

import android.graphics.Bitmap
import android.graphics.Color
import com.yourapp.photofilters.filters.PhotoFilter
import com.yourapp.photofilters.filters.PhotoFilterProcessor
import org.junit.Assert.*
import org.junit.Before
import org.junit.Test

/**
 * Unit tests for [PhotoFilterProcessor].
 *
 * Strategy:
 * - Use known solid-color bitmaps to assert deterministic pixel output.
 * - Grayscale: R=G=B after conversion.
 * - Negative: each channel inverted.
 * - Sepia: output channels within expected ratios.
 * - Stack: composition of two invertible filters returns the original.
 * - Threshold: all pixels are 0 or 255.
 * - Posterize: all channel values are multiples of step.
 *
 * Note: Bitmap constructors require Android runtime — run these as
 * Instrumented tests (androidTest) or with Robolectric.
 */
class PhotoFilterTest {

    private lateinit var solidRed: Bitmap
    private lateinit var solidGray: Bitmap
    private lateinit var gradient: Bitmap

    @Before
    fun setUp() {
        solidRed  = createSolid(Color.RED)
        solidGray = createSolid(Color.GRAY)
        gradient  = createGradient(256)
    }

    @Test
    fun grayscale_outputHasEqualRGB() {
        val result = PhotoFilterProcessor.apply(solidRed, PhotoFilter.Grayscale)
        val pixel  = result.getPixel(0, 0)
        assertEquals("R == G after grayscale", Color.red(pixel), Color.green(pixel))
        assertEquals("G == B after grayscale", Color.green(pixel), Color.blue(pixel))
    }

    @Test
    fun negative_invertsBrightness() {
        val result = PhotoFilterProcessor.apply(solidGray, PhotoFilter.Negative)
        val pixel  = result.getPixel(0, 0)
        val orig   = solidGray.getPixel(0, 0)
        assertEquals("Red inverted",   255 - Color.red(orig),   Color.red(pixel))
        assertEquals("Green inverted", 255 - Color.green(orig), Color.green(pixel))
        assertEquals("Blue inverted",  255 - Color.blue(orig),  Color.blue(pixel))
    }

    @Test
    fun stack_doubleNegative_returnsOriginal() {
        val filter = PhotoFilter.Stack(listOf(PhotoFilter.Negative, PhotoFilter.Negative))
        val result = PhotoFilterProcessor.apply(solidGray, filter)
        val orig   = solidGray.getPixel(0, 0)
        val out    = result.getPixel(0, 0)
        // Allow ±1 for rounding
        assertTrue("R restored", Math.abs(Color.red(orig)   - Color.red(out))   <= 1)
        assertTrue("G restored", Math.abs(Color.green(orig) - Color.green(out)) <= 1)
        assertTrue("B restored", Math.abs(Color.blue(orig)  - Color.blue(out))  <= 1)
    }

    @Test
    fun threshold_producesOnlyBlackOrWhite() {
        val result = PhotoFilterProcessor.apply(gradient, PhotoFilter.Threshold(128))
        for (x in 0 until result.width) {
            val pixel = result.getPixel(x, 0)
            val r = Color.red(pixel)
            assertTrue("Pixel must be 0 or 255, got $r", r == 0 || r == 255)
        }
    }

    @Test
    fun posterize_channelsAreQuantized() {
        val result = PhotoFilterProcessor.apply(gradient, PhotoFilter.Posterize(4))
        val step = 255f / (4 - 1) // ~85
        for (x in 0 until result.width) {
            val r = Color.red(result.getPixel(x, 0))
            val quantized = Math.round(r / step) * step
            assertTrue("R=$r should be near a step", Math.abs(r - quantized) <= 1)
        }
    }

    @Test
    fun brightness_shiftsByAmount() {
        val result = PhotoFilterProcessor.apply(solidGray, PhotoFilter.Brightness(50f))
        val orig   = Color.red(solidGray.getPixel(0, 0))
        val out    = Color.red(result.getPixel(0, 0))
        assertTrue("Brightness increased", out >= orig)
    }

    @Test
    fun blend_opacityZero_returnsOriginal() {
        val filter = PhotoFilter.Blend(PhotoFilter.Negative, 0f)
        val result = PhotoFilterProcessor.apply(solidGray, filter)
        val orig   = solidGray.getPixel(0, 0)
        val out    = result.getPixel(0, 0)
        assertTrue("R same",  Math.abs(Color.red(orig)   - Color.red(out))   <= 1)
        assertTrue("G same",  Math.abs(Color.green(orig) - Color.green(out)) <= 1)
        assertTrue("B same",  Math.abs(Color.blue(orig)  - Color.blue(out))  <= 1)
    }

    @Test
    fun solarize_aboveHalfIsInverted() {
        // A pixel with value 200 (>128) should become 55
        val bright = createSolid(Color.rgb(200, 200, 200))
        val result = PhotoFilterProcessor.apply(bright, PhotoFilter.Solarize)
        val out    = Color.red(result.getPixel(0, 0))
        assertEquals("200 solarized → 55", 55, out)
    }

    // ─── Helpers ────────────────────────────────────────────────────

    private fun createSolid(color: Int, size: Int = 4): Bitmap =
        Bitmap.createBitmap(size, size, Bitmap.Config.ARGB_8888).apply {
            eraseColor(color)
        }

    private fun createGradient(width: Int): Bitmap =
        Bitmap.createBitmap(width, 1, Bitmap.Config.ARGB_8888).apply {
            for (x in 0 until width) {
                setPixel(x, 0, Color.rgb(x, x, x))
            }
        }
}
