package com.socialpulse.marketing

import android.content.Intent
import android.graphics.Bitmap
import android.graphics.BitmapFactory
import android.graphics.Canvas
import android.graphics.Paint
import android.graphics.ColorMatrixColorFilter
import android.os.Bundle
import android.util.Base64
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.Image
import androidx.compose.foundation.background
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyRow
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.filled.Close
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.ColorFilter
import androidx.compose.ui.graphics.ColorMatrix
import androidx.compose.ui.graphics.asImageBitmap
import androidx.compose.ui.layout.ContentScale
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.socialpulse.marketing.ui.theme.PostlyTheme
import java.io.ByteArrayOutputStream

class PhotoEditorActivity : ComponentActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        var originalBitmap: Bitmap? = null
        
        // Try reading from file path first (preferred - avoids TransactionTooLargeException)
        val imagePath = intent.getStringExtra("image_path")
        if (imagePath != null) {
            try {
                originalBitmap = BitmapFactory.decodeFile(imagePath)
            } catch (e: Exception) {
                e.printStackTrace()
            }
        }
        
        // Fallback: try reading base64 from intent extra (for small images)
        if (originalBitmap == null) {
            val imageBase64 = intent.getStringExtra("image")
            if (imageBase64 != null) {
                try {
                    val pureBase64 = if (imageBase64.contains(",")) imageBase64.split(",")[1] else imageBase64
                    val decodedString = Base64.decode(pureBase64, Base64.DEFAULT)
                    originalBitmap = BitmapFactory.decodeByteArray(decodedString, 0, decodedString.size)
                } catch (e: Exception) {
                    e.printStackTrace()
                }
            }
        }

        val finalBitmap = originalBitmap
        val thumbnailBitmap = finalBitmap?.let { 
            val scale = 200f / Math.max(it.width, it.height)
            if (scale < 1f) {
                Bitmap.createScaledBitmap(it, (it.width * scale).toInt(), (it.height * scale).toInt(), true)
            } else it
        }

        setContent {
            PostlyTheme {
                PhotoEditorScreen(
                    bitmap = finalBitmap,
                    thumbnail = thumbnailBitmap,
                    onCancel = { finish() },
                    onSave = { selectedFilterMatrix ->
                        if (finalBitmap != null) {
                            val result = applyFilterToBitmap(finalBitmap, selectedFilterMatrix)
                            
                            // Save result to a temp file to avoid TransactionTooLargeException
                            val resultFile = java.io.File(cacheDir, "editor_output.jpg")
                            val fos = java.io.FileOutputStream(resultFile)
                            result.compress(Bitmap.CompressFormat.JPEG, 90, fos)
                            fos.close()
                            
                            val resultIntent = Intent()
                            resultIntent.putExtra("result_path", resultFile.absolutePath)
                            setResult(RESULT_OK, resultIntent)
                        }
                        finish()
                    }
                )
            }
        }
    }

    private fun applyFilterToBitmap(src: Bitmap, matrix: ColorMatrix): Bitmap {
        val bitmap = Bitmap.createBitmap(src.width, src.height, Bitmap.Config.ARGB_8888)
        val canvas = Canvas(bitmap)
        val paint = Paint()
        paint.colorFilter = ColorMatrixColorFilter(matrix.values)
        canvas.drawBitmap(src, 0f, 0f, paint)
        return bitmap
    }

    private fun bitmapToBase64(bitmap: Bitmap): String {
        val byteArrayOutputStream = ByteArrayOutputStream()
        bitmap.compress(Bitmap.CompressFormat.JPEG, 90, byteArrayOutputStream)
        val byteArray = byteArrayOutputStream.toByteArray()
        return Base64.encodeToString(byteArray, Base64.NO_WRAP)
    }
}

@OptIn(ExperimentalMaterial3Api::class)
@Composable
fun PhotoEditorScreen(bitmap: Bitmap?, thumbnail: Bitmap?, onCancel: () -> Unit, onSave: (ColorMatrix) -> Unit) {
    var selectedFilter by remember { mutableStateOf("Original") }
    
    val filters = listOf(
        FilterItem("Original", ColorMatrix()),
        FilterItem("B&N", ColorMatrix().apply { setToSaturation(0f) }),
        FilterItem("Sepia", ColorMatrix(floatArrayOf(
            0.393f, 0.769f, 0.189f, 0f, 0f,
            0.349f, 0.686f, 0.168f, 0f, 0f,
            0.272f, 0.534f, 0.131f, 0f, 0f,
            0f, 0f, 0f, 1f, 0f
        ))),
        FilterItem("Cálido", ColorMatrix(floatArrayOf(
            1.2f, 0.1f, 0f, 0f, 0f,
            0f, 1.1f, 0f, 0f, 0f,
            0f, 0f, 0.8f, 0f, 0f,
            0f, 0f, 0f, 1f, 0f
        ))),
        FilterItem("Frío", ColorMatrix(floatArrayOf(
            0.8f, 0f, 0f, 0f, 0f,
            0f, 1.1f, 0.1f, 0f, 0f,
            0f, 0.1f, 1.4f, 0f, 0f,
            0f, 0f, 0f, 1f, 0f
        ))),
        FilterItem("Invertir", ColorMatrix(floatArrayOf(
            -1f,  0f,  0f, 0f, 255f,
             0f, -1f,  0f, 0f, 255f,
             0f,  0f, -1f, 0f, 255f,
             0f,  0f,  0f, 1f, 0f
        )))
    )

    Scaffold(
        topBar = {
            TopAppBar(
                title = { Text("Filtros Postly", fontWeight = FontWeight.ExtraBold) },
                navigationIcon = {
                    IconButton(onClick = onCancel) {
                        Icon(Icons.Default.Close, contentDescription = "Cancelar")
                    }
                },
                actions = {
                    Button(
                        onClick = { 
                            val current = filters.find { it.name == selectedFilter }?.matrix ?: ColorMatrix()
                            onSave(current) 
                        },
                        shape = RoundedCornerShape(12.dp)
                    ) {
                        Text("Aplicar", fontWeight = FontWeight.Bold)
                    }
                },
                colors = TopAppBarDefaults.topAppBarColors(
                    containerColor = MaterialTheme.colorScheme.surface.copy(alpha = 0.95f)
                )
            )
        },
        containerColor = MaterialTheme.colorScheme.background
    ) { padding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(padding),
            horizontalAlignment = Alignment.CenterHorizontally
        ) {
            Box(
                modifier = Modifier
                    .weight(1f)
                    .fillMaxWidth()
                    .padding(16.dp),
                contentAlignment = Alignment.Center
            ) {
                if (bitmap != null) {
                    val currentFilter = filters.find { it.name == selectedFilter }?.matrix ?: ColorMatrix()
                    Image(
                        bitmap = bitmap.asImageBitmap(),
                        contentDescription = "Preview",
                        modifier = Modifier
                            .fillMaxSize()
                            .clip(RoundedCornerShape(16.dp)),
                        contentScale = ContentScale.Fit,
                        colorFilter = ColorFilter.colorMatrix(currentFilter)
                    )
                }
            }

            // Filter Selector
            Surface(
                tonalElevation = 8.dp,
                modifier = Modifier.fillMaxWidth()
            ) {
                LazyRow(
                    modifier = Modifier
                        .fillMaxWidth()
                        .height(140.dp)
                        .padding(vertical = 16.dp),
                    contentPadding = PaddingValues(horizontal = 20.dp),
                    horizontalArrangement = Arrangement.spacedBy(16.dp)
                ) {
                    items(filters) { filter ->
                        FilterThumbnail(
                            filter = filter,
                            bitmap = thumbnail,
                            isSelected = selectedFilter == filter.name,
                            onClick = { selectedFilter = filter.name }
                        )
                    }
                }
            }
        }
    }
}

@Composable
fun FilterThumbnail(filter: FilterItem, bitmap: Bitmap?, isSelected: Boolean, onClick: () -> Unit) {
    Column(
        horizontalAlignment = Alignment.CenterHorizontally,
        modifier = Modifier.clickable { onClick() }
    ) {
        Box(
            modifier = Modifier
                .size(70.dp)
                .clip(RoundedCornerShape(14.dp))
                .background(if (isSelected) MaterialTheme.colorScheme.primary else Color.Transparent)
                .padding(if (isSelected) 3.dp else 0.dp)
        ) {
            if (bitmap != null) {
                Image(
                    bitmap = bitmap.asImageBitmap(),
                    contentDescription = filter.name,
                    contentScale = ContentScale.Crop,
                    modifier = Modifier.fillMaxSize().clip(RoundedCornerShape(12.dp)),
                    colorFilter = ColorFilter.colorMatrix(filter.matrix)
                )
            }
        }
        Spacer(modifier = Modifier.height(6.dp))
        Text(
            text = filter.name,
            fontSize = 11.sp,
            color = if (isSelected) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.onSurface,
            fontWeight = if (isSelected) FontWeight.Bold else FontWeight.Medium
        )
    }
}

data class FilterItem(val name: String, val matrix: ColorMatrix)
