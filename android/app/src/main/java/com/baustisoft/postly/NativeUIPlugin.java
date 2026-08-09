package com.baustisoft.postly;

import android.content.Intent;
import android.util.Base64;
import android.util.Log;
import android.Manifest;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.net.Uri;
import android.os.Build;
import android.os.Environment;
import android.provider.MediaStore;
import androidx.activity.result.ActivityResult;
import com.getcapacitor.JSObject;
import com.getcapacitor.PermissionState;
import com.getcapacitor.Plugin;
import com.getcapacitor.PluginCall;
import com.getcapacitor.PluginMethod;
import com.getcapacitor.annotation.ActivityCallback;
import com.getcapacitor.annotation.CapacitorPlugin;
import com.getcapacitor.annotation.Permission;
import com.getcapacitor.annotation.PermissionCallback;
import java.io.File;
import java.io.FileOutputStream;
import java.io.IOException;
import java.io.OutputStream;

@CapacitorPlugin(
    name = "NativeUI",
    permissions = {
        @Permission(
            alias = "storage",
            strings = {
                Manifest.permission.READ_EXTERNAL_STORAGE,
                Manifest.permission.WRITE_EXTERNAL_STORAGE
            }
        )
    }
)
public class NativeUIPlugin extends Plugin {
    private static final String TAG = "NativeUIPlugin";

    @PluginMethod
    public void openPhotoEditor(PluginCall call) {
        String imageBase64 = call.getString("image");
        if (imageBase64 == null) {
            call.reject("Imagen no proporcionada");
            return;
        }

        try {
            // Decodificar Base64 con menos presión de memoria si es posible
            String pureBase64 = imageBase64.contains(",") ? imageBase64.split(",")[1] : imageBase64;
            byte[] imageBytes = Base64.decode(pureBase64, Base64.DEFAULT);
            
            // Si la imagen es muy grande, podríamos redimensionarla aquí antes de guardarla
            // Pero por ahora, guardamos a archivo para evitar TransactionTooLargeException
            File tempFile = new File(getContext().getCacheDir(), "editor_input.jpg");
            FileOutputStream fos = new FileOutputStream(tempFile);
            fos.write(imageBytes);
            fos.close();

            Intent intent = new Intent(getContext(), PhotoEditorActivity.class);
            intent.putExtra("image_path", tempFile.getAbsolutePath());
            
            saveCall(call);
            startActivityForResult(call, intent, "photoEditorResult");
        } catch (OutOfMemoryError oom) {
            Log.e(TAG, "OOM decoding image: " + oom.getMessage());
            call.reject("Imagen demasiado grande para procesar");
        } catch (IOException e) {
            Log.e(TAG, "Error saving temp image: " + e.getMessage());
            call.reject("Error al preparar la imagen: " + e.getMessage());
        }
    }

    @PluginMethod
    public void openDashboard(PluginCall call) {
        Intent intent = new Intent(getContext(), DashboardActivity.class);
        startActivityForResult(call, intent, "genericResult");
    }

    @PluginMethod
    public void saveToGallery(PluginCall call) {
        if (getPermissionState("storage") != PermissionState.GRANTED) {
            requestPermissionForAlias("storage", call, "storagePermissionCallback");
        } else {
            executeSaveToGallery(call);
        }
    }

    @PermissionCallback
    private void storagePermissionCallback(PluginCall call) {
        if (getPermissionState("storage") == PermissionState.GRANTED) {
            executeSaveToGallery(call);
        } else {
            call.reject("Permiso de almacenamiento denegado");
        }
    }

    private void executeSaveToGallery(PluginCall call) {
        String imageBase64 = call.getString("image");
        if (imageBase64 == null) {
            call.reject("No hay imagen para guardar");
            return;
        }

        try {
            String pureBase64 = imageBase64.contains(",") ? imageBase64.split(",")[1] : imageBase64;
            byte[] bytes = Base64.decode(pureBase64, Base64.DEFAULT);

            String filename = "Postly_" + System.currentTimeMillis() + ".jpg";
            OutputStream fos;
            Uri imageUri = null;

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                ContentResolver resolver = getContext().getContentResolver();
                ContentValues contentValues = new ContentValues();
                contentValues.put(MediaStore.MediaColumns.DISPLAY_NAME, filename);
                contentValues.put(MediaStore.MediaColumns.MIME_TYPE, "image/jpeg");
                contentValues.put(MediaStore.MediaColumns.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + "/Postly");
                imageUri = resolver.insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, contentValues);
                fos = resolver.openOutputStream(imageUri);
            } else {
                File imagesDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_PICTURES);
                File postlyDir = new File(imagesDir, "Postly");
                if (!postlyDir.exists()) postlyDir.mkdirs();
                File image = new File(postlyDir, filename);
                imageUri = Uri.fromFile(image);
                fos = new FileOutputStream(image);
            }

            fos.write(bytes);
            fos.close();

            JSObject ret = new JSObject();
            ret.put("uri", imageUri.toString());
            call.resolve(ret);
        } catch (Exception e) {
            call.reject("Error al guardar en galería: " + e.getMessage());
        }
    }

    @PluginMethod
    public void deleteFromGallery(PluginCall call) {
        String uriString = call.getString("uri");
        if (uriString == null) {
            call.reject("URI no proporcionada");
            return;
        }

        try {
            Uri uri = Uri.parse(uriString);
            getContext().getContentResolver().delete(uri, null, null);
            call.resolve();
        } catch (Exception e) {
            call.reject("Error al eliminar de galería: " + e.getMessage());
        }
    }

    @ActivityCallback
    private void photoEditorResult(PluginCall call, ActivityResult result) {
        if (result.getResultCode() == android.app.Activity.RESULT_OK) {
            Intent data = result.getData();
            if (data != null) {
                // Read the result from a temp file instead of Intent extra
                String resultPath = data.getStringExtra("result_path");
                if (resultPath != null) {
                    try {
                        File resultFile = new File(resultPath);
                        byte[] bytes = java.nio.file.Files.readAllBytes(resultFile.toPath());
                        String base64Result = "data:image/jpeg;base64," + Base64.encodeToString(bytes, Base64.NO_WRAP);
                        
                        JSObject ret = new JSObject();
                        ret.put("image", base64Result);
                        call.resolve(ret);
                        
                        // Cleanup
                        resultFile.delete();
                        return;
                    } catch (Exception e) {
                        Log.e(TAG, "Error reading result file: " + e.getMessage());
                    }
                }
            }
            call.reject("No se recibió imagen editada");
        } else {
            call.reject("Edición cancelada");
        }
    }

    @ActivityCallback
    private void genericResult(PluginCall call, ActivityResult result) {
        call.resolve();
    }
}
