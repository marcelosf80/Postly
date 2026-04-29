package com.yourapp.photofilters.utils

import android.graphics.Bitmap
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import com.yourapp.photofilters.extensions.PRESET_FILTERS
import com.yourapp.photofilters.extensions.generateFilterPreviews
import com.yourapp.photofilters.filters.PhotoFilter
import com.yourapp.photofilters.filters.PhotoFilterProcessor
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

/**
 * ViewModel that keeps filter state and offloads heavy bitmap processing
 * to [Dispatchers.Default], posting results back to [Dispatchers.Main].
 *
 * Testing strategy:
 * - Unit test [applyFilter] by injecting a 1×1 Bitmap and asserting pixel values.
 * - Use a TestCoroutineDispatcher to control coroutine execution in tests.
 * - Each public function emits to a [StateFlow], so tests can `collect` synchronously.
 */
class FilterViewModel : ViewModel() {

    sealed class FilterState {
        object Idle : FilterState()
        object Loading : FilterState()
        data class Success(val bitmap: Bitmap) : FilterState()
        data class Error(val message: String) : FilterState()
    }

    data class PreviewItem(val name: String, val thumbnail: Bitmap)

    private val _filterState   = MutableStateFlow<FilterState>(FilterState.Idle)
    val filterState: StateFlow<FilterState> = _filterState.asStateFlow()

    private val _previews      = MutableStateFlow<List<PreviewItem>>(emptyList())
    val previews: StateFlow<List<PreviewItem>> = _previews.asStateFlow()

    private val _activeFilter  = MutableStateFlow<PhotoFilter?>(null)
    val activeFilter: StateFlow<PhotoFilter?> = _activeFilter.asStateFlow()

    private var originalBitmap: Bitmap? = null

    /** Call once when the user picks an image. Generates all thumbnail previews. */
    fun setSourceBitmap(bitmap: Bitmap) {
        originalBitmap = bitmap
        viewModelScope.launch {
            val items = withContext(Dispatchers.Default) {
                bitmap.generateFilterPreviews(thumbnailSize = 100)
                    .map { (name, thumb) -> PreviewItem(name, thumb) }
            }
            _previews.value = items
        }
    }

    /** Applies [filter] to the original bitmap on a background thread. */
    fun applyFilter(filter: PhotoFilter) {
        val src = originalBitmap ?: return
        _activeFilter.value = filter
        _filterState.value  = FilterState.Loading
        viewModelScope.launch {
            val result = runCatching {
                withContext(Dispatchers.Default) {
                    PhotoFilterProcessor.apply(src, filter)
                }
            }
            _filterState.value = result.fold(
                onSuccess = { FilterState.Success(it) },
                onFailure = { FilterState.Error(it.message ?: "Unknown error") }
            )
        }
    }

    /** Applies multiple filters in sequence via [PhotoFilter.Stack]. */
    fun applyStack(vararg filters: PhotoFilter) = applyFilter(PhotoFilter.Stack(filters.toList()))

    /** Resets to the unfiltered original. */
    fun resetToOriginal() {
        val src = originalBitmap ?: return
        _activeFilter.value = null
        _filterState.value  = FilterState.Success(src)
    }

    override fun onCleared() {
        // Recycle preview thumbnails when ViewModel is destroyed
        _previews.value.forEach { it.thumbnail.recycle() }
        super.onCleared()
    }
}
