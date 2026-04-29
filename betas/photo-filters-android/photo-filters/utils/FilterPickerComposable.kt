package com.yourapp.photofilters.utils

import android.graphics.Bitmap
import androidx.compose.animation.animateColorAsState
import androidx.compose.animation.core.tween
import androidx.compose.foundation.BorderStroke
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.Card
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.Text
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.style.TextAlign
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.yourapp.photofilters.filters.PhotoFilter

/**
 * Composable filter picker carousel.
 *
 * Displays a [LazyRow] of filter thumbnail chips.
 * Selected filter is highlighted and calls [onFilterSelected].
 *
 * Usage:
 * ```kotlin
 * FilterPickerRow(
 *     previews = viewModel.previews.collectAsState().value,
 *     selectedFilter = viewModel.activeFilter.collectAsState().value,
 *     onFilterSelected = { filter -> viewModel.applyFilter(filter) }
 * )
 * ```
 */
@Composable
fun FilterPickerRow(
    previews: List<FilterViewModel.PreviewItem>,
    selectedFilter: PhotoFilter?,
    onFilterSelected: (PhotoFilter) -> Unit,
    modifier: Modifier = Modifier
) {
    val presetFilters = com.yourapp.photofilters.extensions.PRESET_FILTERS

    LazyRow(
        modifier           = modifier.fillMaxWidth(),
        contentPadding     = PaddingValues(horizontal = 12.dp),
        horizontalArrangement = Arrangement.spacedBy(8.dp)
    ) {
        items(
            items = previews.zip(presetFilters),
            key   = { (_, preset) -> preset.first }
        ) { (item, preset) ->
            val (name, filter) = preset
            val isSelected     = selectedFilter == filter

            FilterChip(
                name       = name,
                thumbnail  = item.thumbnail,
                isSelected = isSelected,
                onClick    = { onFilterSelected(filter) }
            )
        }
    }
}

@Composable
private fun FilterChip(
    name: String,
    thumbnail: Bitmap,
    isSelected: Boolean,
    onClick: () -> Unit
) {
    val borderColor by animateColorAsState(
        targetValue = if (isSelected) MaterialTheme.colorScheme.primary else Color.Transparent,
        animationSpec = tween(200)
    )

    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier.width(80.dp)
    ) {
        Card(
            modifier = Modifier
                .size(72.dp)
                .clickable(onClick = onClick),
            shape = RoundedCornerShape(12.dp),
            border = BorderStroke(2.dp, borderColor),
            elevation = CardDefaults.cardElevation(if (isSelected) 6.dp else 2.dp)
        ) {
            Image(
                bitmap       = thumbnail.asImageBitmap(),
                contentDescription = name,
                contentScale = ContentScale.Crop,
                modifier     = Modifier.fillMaxSize()
            )
        }
        Spacer(Modifier.height(4.dp))
        Text(
            text      = name,
            fontSize  = 10.sp,
            maxLines  = 1,
            overflow  = TextOverflow.Ellipsis,
            textAlign = TextAlign.Center,
            color     = if (isSelected) MaterialTheme.colorScheme.primary
                        else MaterialTheme.colorScheme.onBackground
        )
    }
}

/**
 * Full-screen composable that integrates [FilterViewModel] with an image preview
 * and the [FilterPickerRow]. Drop this into your Activity/Fragment NavHost.
 */
@Composable
fun FilterEditorScreen(viewModel: FilterViewModel) {
    val filterState by viewModel.filterState.collectAsState()
    val previews    by viewModel.previews.collectAsState()
    val active      by viewModel.activeFilter.collectAsState()

    Column(
        modifier = Modifier
            .fillMaxSize()
            .background(Color.Black)
    ) {
        // ── Image Preview ───────────────────────────────────────────
        Box(
            modifier          = Modifier
                .weight(1f)
                .fillMaxWidth(),
            contentAlignment  = Alignment.Center
        ) {
            when (val state = filterState) {
                is FilterViewModel.FilterState.Loading -> CircularProgressIndicator(color = Color.White)
                is FilterViewModel.FilterState.Success ->
                    Image(
                        bitmap           = state.bitmap.asImageBitmap(),
                        contentDescription = "Filtered image",
                        contentScale     = ContentScale.Fit,
                        modifier         = Modifier
                            .fillMaxSize()
                            .padding(8.dp)
                    )
                is FilterViewModel.FilterState.Error ->
                    Text(text = state.message, color = Color.Red)
                else -> {}
            }
        }

        // ── Filter Picker ───────────────────────────────────────────
        Box(
            modifier = Modifier
                .fillMaxWidth()
                .background(Color(0xFF1A1A1A))
                .padding(vertical = 12.dp)
        ) {
            if (previews.isEmpty()) {
                CircularProgressIndicator(
                    modifier = Modifier.align(Alignment.Center),
                    color    = Color.White
                )
            } else {
                FilterPickerRow(
                    previews         = previews,
                    selectedFilter   = active,
                    onFilterSelected = { viewModel.applyFilter(it) }
                )
            }
        }
    }
}
