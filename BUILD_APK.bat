@echo off
echo ==========================================
echo    Postly - Generar APK Android (MODO LOG)
echo    (Fuente: Carpeta /Postly_V2_Web)
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

echo [1/3] Sincronizando interfaz (V2 Web -> Android)...
set "LOG_PATH=%~dp0build_log.txt"
echo Inciando sincronizacion... > "%LOG_PATH%" 2>&1
call npx cap sync android >> "%LOG_PATH%" 2>&1
if %ERRORLEVEL% neq 0 (
    echo.
    echo [X] ERROR: La sincronizacion de Capacitor fallo. 
    echo Revisa "build_log.txt" para ver los detalles.
    pause
    exit /b %ERRORLEVEL%
)

echo [2/3] Compilando sistema nativo (DEBUG MODE)...
echo El proceso esta en marcha. Revisa build_log.txt para ver el progreso real.
if exist "gradlew" (
    echo [!] Ya en carpeta android.
    call gradlew clean >> "%LOG_PATH%" 2>&1
    call gradlew assembleDebug --stacktrace --info >> "%LOG_PATH%" 2>&1
) else (
    pushd android
    call gradlew clean >> "%LOG_PATH%" 2>&1
    call gradlew assembleDebug --stacktrace --info >> "%LOG_PATH%" 2>&1
    popd
)

if %ERRORLEVEL% neq 0 (
    echo.
    echo [X] ERROR: La compilacion fallo. 
    echo Revisa el archivo "build_log.txt" que se acaba de crear en la carpeta raiz.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [!] Key Hash para Facebook (Configurar en developers.facebook.com):
echo U/n2omheGKUYkVuyUyATNfzvqQs=

echo.
echo ==========================================
echo APK LISTA en: android\app\build\outputs\apk\debug\app-debug.apk
echo ==========================================
echo.
pause
