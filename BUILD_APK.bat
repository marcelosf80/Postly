@echo off
echo ==========================================
echo    Postly - Generar APK Android (MODO LOG)
echo    (Fuente: Carpeta /public/mobile)
echo ==========================================
echo.

:: --- CONFIGURACIÓN DE JAVA (AUTO-DETECCIÓN) ---
if "%JAVA_HOME%"=="" (
    if exist "C:\Program Files\Android\Android Studio\jbr" (
        set "JAVA_HOME=C:\Program Files\Android\Android Studio\jbr"
        set "PATH=%JAVA_HOME%\bin;%PATH%"
    ) else (
        echo [!] ADVERTENCIA: No se detectó JAVA_HOME.
    )
) else (
    set "PATH=%JAVA_HOME%\bin;%PATH%"
)

echo [1/3] Sincronizando interfaz (Mobile -> Android)...
call npx cap sync android
if %ERRORLEVEL% neq 0 (
    echo.
    echo [X] ERROR: La sincronizacion de Capacitor fallo. 
    echo Asegurate de tener instalado Node.js y haber ejecutado "npm install".
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [2/3] Compilando sistema nativo (DEBUG MODE)...
echo El proceso esta en marcha. Revisa build_log.txt para ver el progreso real.
if exist "gradlew" (
    echo [!] Ya en carpeta android.
    call gradlew clean
    call gradlew assembleDebug --stacktrace --info
) else (
    cd android
    call gradlew clean
    call gradlew assembleDebug --stacktrace --info
)

if %ERRORLEVEL% neq 0 (
    echo.
    echo [X] ERROR: La compilacion fallo. 
    echo Revisa el archivo "build_log.txt" que se acaba de crear en la carpeta raiz.
    cd ..
    pause
    exit /b %ERRORLEVEL%
)
cd ..

echo.
echo [3/3] Generando Key Hash para Facebook...
keytool -exportcert -alias androiddebugkey -keystore "%USERPROFILE%\.android\debug.keystore" -storepass android 2>nul | openssl dgst -sha1 -binary 2>nul | openssl base64 2>nul

echo.
echo ==========================================
echo APK LISTA en: android\app\build\outputs\apk\debug\app-debug.apk
echo ==========================================
echo.
pause
