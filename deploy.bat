@echo off
title Shadow Slave Life OS — Deploy
echo.
echo  =====================================================
echo    SHADOW SLAVE LIFE OS — Publicar Atualizacoes
echo  =====================================================
echo.
echo  Fazendo deploy para Firebase Hosting...
echo  URL final: https://shadow-slave-life-os.firebaseapp.com
echo.

set PATH=%PATH%;%APPDATA%\npm

cd /d "%~dp0"
firebase deploy --only hosting

echo.
echo  Deploy concluido! Pressione qualquer tecla para abrir no navegador.
pause >nul
start "" "https://shadow-slave-life-os.firebaseapp.com"
