@echo off
chcp 65001 >nul
echo ============================================================
echo   RPG Life OS - Firebase Firestore Rules Deploy
echo ============================================================
echo.

REM --- Passo 1: Verificar/Instalar Firebase CLI ---
echo [1/4] Verificando Firebase CLI...
where firebase >nul 2>&1
IF %ERRORLEVEL% NEQ 0 (
    echo Firebase CLI nao encontrado. Instalando via npm...
    npm install -g firebase-tools
    IF %ERRORLEVEL% NEQ 0 (
        echo ERRO: Falha ao instalar firebase-tools. Verifique se o Node.js esta instalado.
        pause
        exit /b 1
    )
    echo Firebase CLI instalado com sucesso!
) ELSE (
    echo Firebase CLI ja esta instalado.
)
echo.

REM --- Passo 2: Login no Firebase ---
echo [2/4] Fazendo login no Firebase...
echo (Uma janela do navegador sera aberta para autenticacao)
firebase login
IF %ERRORLEVEL% NEQ 0 (
    echo ERRO: Falha no login. Tente novamente.
    pause
    exit /b 1
)
echo.

REM --- Passo 3: Selecionar o Projeto ---
echo [3/4] Selecione o projeto Firebase...
echo.
set /p PROJECT_ID="Digite o ID do seu projeto Firebase (ex: rpg-life-os-12345): "
firebase use %PROJECT_ID%
IF %ERRORLEVEL% NEQ 0 (
    echo ERRO: Projeto nao encontrado. Verifique o ID e tente novamente.
    pause
    exit /b 1
)
echo.

REM --- Passo 4: Deploy das Regras ---
echo [4/4] Fazendo deploy das regras do Firestore...
firebase deploy --only firestore:rules
IF %ERRORLEVEL% NEQ 0 (
    echo ERRO: Falha no deploy. Verifique os logs acima.
    pause
    exit /b 1
)

echo.
echo ============================================================
echo   SUCESSO! Regras do Firestore atualizadas ate 31/12/2026
echo ============================================================
echo.
pause
