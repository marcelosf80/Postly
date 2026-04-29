# 📷 PhotoFilters — Android Filter Library

Comprehensive photo filter library for Android in pure Kotlin.
**50+ filters** across three implementation families.

---

## 📁 File Structure

```
photo-filters/
├── filters/
│   ├── PhotoFilter.kt           ← Sealed class: all filter types
│   ├── ColorMatrixFilters.kt    ← Fast GPU-friendly ColorMatrix filters
│   ├── ConvolutionFilters.kt    ← Kernel-based spatial filters
│   ├── PixelFilters.kt          ← Pixel manipulation filters
│   └── PhotoFilterProcessor.kt ← Main dispatcher (entry-point)
├── extensions/
│   └── BitmapExtensions.kt     ← Kotlin extension functions + PRESET_FILTERS list
├── utils/
│   ├── FilterViewModel.kt       ← Coroutine-safe ViewModel
│   └── FilterPickerComposable.kt ← Jetpack Compose filter picker UI
└── PhotoFilterTest.kt           ← Unit tests (Robolectric / androidTest)
```

---

## 🚀 Quick Start

### 1. Copy files into your module
Place all `.kt` files under `app/src/main/java/com/yourapp/photofilters/`.  
Adjust the package name at the top of each file.

### 2. Apply a single filter
```kotlin
import com.yourapp.photofilters.filters.PhotoFilter
import com.yourapp.photofilters.filters.PhotoFilterProcessor

val filtered: Bitmap = PhotoFilterProcessor.apply(originalBitmap, PhotoFilter.Sepia)
```

### 3. Chain filters with Stack
```kotlin
val result = PhotoFilterProcessor.apply(bitmap, PhotoFilter.Stack(listOf(
    PhotoFilter.Grayscale,
    PhotoFilter.Vignette(0.6f),
    PhotoFilter.Noise(25)
)))
```

### 4. Use extension functions
```kotlin
import com.yourapp.photofilters.extensions.*

val result = bitmap
    .applyFilter(PhotoFilter.CoolTone)
    .vignette(0.5f)
    .blur(4)
```

### 5. Use with ViewModel (recommended)
```kotlin
// In your Activity/Fragment:
val viewModel: FilterViewModel by viewModels()

lifecycleScope.launch {
    viewModel.filterState.collect { state ->
        when (state) {
            is FilterViewModel.FilterState.Success -> imageView.setImageBitmap(state.bitmap)
            is FilterViewModel.FilterState.Loading -> showProgressBar()
            else -> {}
        }
    }
}

viewModel.setSourceBitmap(bitmap)           // generates previews
viewModel.applyFilter(PhotoFilter.Sunset)   // apply any filter
```

### 6. Jetpack Compose UI
```kotlin
// In your Composable:
FilterEditorScreen(viewModel = viewModel)

// Or embed just the picker row:
FilterPickerRow(
    previews         = previews,
    selectedFilter   = activeFilter,
    onFilterSelected = { viewModel.applyFilter(it) }
)
```

---

## 🎨 All Available Filters

### Color Matrix (fast, hardware accelerated)
| Filter | Description |
|--------|-------------|
| `Grayscale` | B&W via luminance weights |
| `Sepia` | Classic warm brownish tone |
| `Vintage` | Faded aged-photo look |
| `CoolTone` | Cold blue palette |
| `WarmTone` | Golden/amber palette |
| `Negative` | Photo negative (all channels inverted) |
| `Fade` | Lifted, matte / faded look |
| `CrossProcess` | Pushed greens & compressed reds |
| `Lomo` | High saturation + contrast |
| `Moonlight` | Cold desaturated with lifted shadows |
| `Sunset` | Red-orange warm palette |
| `Forest` | Lush green nature tint |
| `Ocean` | Deep blue underwater tone |
| `RoseTint` | Soft pink portrait tint |
| `Polaroid` | Over-exposed dreamy whites |
| `TealAndOrange` | Cinematic color grade |
| `Matrix` | Sci-fi green terminal look |
| `Lavender` | Soft purple dreamy tone |
| `Noir` | Hard high-contrast B&W |
| `GoldenHour` | Warm golden-hour look |
| `Cyberpunk` | Neon magentas & cyans |
| `Kodachrome` | Saturated warm reds (film sim) |
| `Velvia` | Ultra-saturated natural tones |
| `FilmFade` | Lifted shadows + slight desaturation |
| `Brightness(amount)` | -255 … +255 |
| `Contrast(amount)` | 0 … 4 (1 = normal) |
| `Saturation(amount)` | 0 … 4 (1 = normal) |
| `HueRotate(degrees)` | 0 … 360 |
| `Exposure(ev)` | -3 … +3 stops |
| `WhiteBalance(kelvin)` | 2000 … 12000 K |
| `Shadows(amount)` | 0 … 2 (1 = normal) |
| `Highlights(amount)` | 0 … 2 (1 = normal) |

### Convolution / Kernel
| Filter | Description |
|--------|-------------|
| `Sharpen` | Unsharp-mask sharpening |
| `Emboss` | 3-D relief effect |
| `EdgeDetect` | Laplacian edge on black canvas |
| `Sobel` | Gradient magnitude (sketch look) |
| `GaussianBlur(radius)` | Smooth blur, radius 1–25 |
| `BoxBlur(radius)` | Faster blur, radius 1–25 |
| `MotionBlur(length, angle)` | Directional streak blur |
| `Bloom(threshold, radius)` | Glow on bright highlights |

### Pixel Manipulation
| Filter | Description |
|--------|-------------|
| `Vignette(strength, radius)` | Radial edge darkening |
| `Pixelate(blockSize)` | Mosaic / pixel effect |
| `Duotone(shadow, highlight)` | Two-color tonal map |
| `Posterize(levels)` | Color depth reduction 2–8 |
| `Threshold(value)` | Black & white cutoff |
| `Solarize` | Psychedelic Sabattier effect |
| `Noise(intensity)` | Film grain |
| `ChromaticAberration(offset)` | RGB channel shift |
| `Halftone(dotSize)` | Newspaper dot print look |
| `Swirl(strength)` | Pixel vortex around center |
| `LensDistortion(amount)` | Barrel / pincushion |
| `TiltShift(center, width, blur)` | Miniature / focus effect |
| `Mirror(horizontal, vertical)` | Reflection axes |
| `Glitch(intensity, seed)` | Slice displacement glitch |
| `PencilSketch` | Grayscale pencil lines |
| `Watercolor` | Painterly smooth + edges |
| `PixelArt(palette, scale)` | Retro pixel-art look |
| `GradientMap(colors, positions)` | Luminance → color gradient |
| `Anaglyph` | Red/cyan 3D glasses effect |
| `Comic` | Posterize + Sobel outlines |
| `OilPainting(radius, levels)` | Mode-filter oil look |

### Composite
| Filter | Description |
|--------|-------------|
| `Stack(listOf(...))` | Apply multiple filters in sequence |
| `Blend(filter, opacity)` | Alpha-blend filtered over original |

---

## ⚙️ Performance Notes

- **ColorMatrix filters**: O(1) — rendered by GPU via `ColorMatrixColorFilter + Canvas`.
- **Convolution filters**: O(w × h × kernel²) — use separable passes for Gaussian/Box.
- **Pixel filters**: O(w × h) — run on `Dispatchers.Default`.
- **OilPainting**: O(w × h × radius²) — heavy; use `applyFilterPreview()` for live preview.
- **For images > 8 MP**: consider downscaling to ~2 MP for preview, then apply at full res on export.

---

## 🔧 Dependencies

```kotlin
// build.gradle.kts (app)
dependencies {
    implementation("androidx.lifecycle:lifecycle-viewmodel-ktx:2.8.x")
    implementation("androidx.compose.material3:material3:1.3.x")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.8.x")

    // Tests
    testImplementation("junit:junit:4.13.2")
    testImplementation("org.robolectric:robolectric:4.12.x")
}
```

No third-party image processing libraries required.

---

## 🧪 Testing

Run unit tests with Robolectric (no device needed):
```bash
./gradlew test
```

Run instrumented tests on device:
```bash
./gradlew connectedAndroidTest
```
