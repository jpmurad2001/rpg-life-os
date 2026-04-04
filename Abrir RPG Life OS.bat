@echo off
title Shadow Slave Life OS
echo.
echo  =====================================================
echo    SHADOW SLAVE LIFE OS
echo  =====================================================
echo.
echo   [1] Abrir na nuvem (Firebase Hosting) - RECOMENDADO
echo   [2] Abrir localmente (servidor Python)
echo.
set /p choice="Escolha (1 ou 2): "

if "%choice%"=="1" (
    echo.
    echo  Abrindo: https://shadow-slave-life-os.firebaseapp.com
    start "" "https://shadow-slave-life-os.firebaseapp.com"
    goto :end
)

if "%choice%"=="2" (
    echo.
    echo  Iniciando servidor local em http://localhost:8765
    start "" timeout /t 2 /nobreak >nul && start "" "http://localhost:8765"
    cd /d "%~dp0"
    python -m http.server 8765
)

:end
pause
