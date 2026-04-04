@echo off
title RPG Life OS - Servidor Local
echo.
echo  =======================================
echo   RPG LIFE OS - Iniciando servidor...
echo  =======================================
echo.
echo  Acesse: http://localhost:8765
echo  Feche esta janela para encerrar o app.
echo.

:: Abre o navegador apos 1.5 segundos
start "" timeout /t 2 /nobreak >nul && start "" "http://localhost:8765"

:: Inicia o servidor Python na pasta do projeto
cd /d "%~dp0"
python -m http.server 8765

pause
