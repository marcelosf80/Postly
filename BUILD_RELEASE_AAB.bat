@echo off
echo ==========================================
echo    Postly - Generar AAB para Google Play Store
echo ==========================================
echo.

if "%JAVA_HOME%"=="" (
    if exist "C:\Program Files\Android\Android Studio\jbr" (
        set "JAVA_HOME=C:\Program Files\Android\Android Studio\jbr"
        set "PATH=%JAVA_HOME%\bin;%PATH%"
    )
) else (
    set "PATH=%JAVA_HOME%\bin;%PATH%"
)

echo [1/2] Sincronizando código frontend...
call npx cap sync android

echo [2/2] Compilando Android App Bundle (Release AAB)...
pushd android
call gradlew bundleRelease --stacktrace
popd

if %ERRORLEVEL% neq 0 (
    echo [X] Error en la compilación del paquete Release.
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo ==========================================
echo Archivo AAB para Play Store generado con éxito:
echo android\app\build\outputs\bundle\release\app-release.aab
echo ==========================================
echo.
pause
