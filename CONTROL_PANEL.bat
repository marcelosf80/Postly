@echo off
title CONTROL CENTER - Launcher Maestro
color 0B
cls

echo ====================================================
    echo    🚀 INICIANDO CENTRO DE CONTROL MAESTRO
    echo ====================================================
    echo.
    echo    - Preparando entorno...
    
    cd system_launcher
    
    echo    - Iniciando Servidor de Panel...
    start /min "Launcher Backend" node server.js
    
    timeout /t 3 >nul
    
    echo    - Abriendo Dashboard en el navegador...
    start http://localhost:8888
    
    echo.
    echo    ¡Listo! Podés controlar todos tus servidores desde el navegador.
    echo    Mantené esta ventana abierta mientras uses el panel.
    echo.
    echo    Presioná cualquier tecla para cerrar este asistente...
    pause >nul
