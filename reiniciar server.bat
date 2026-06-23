@echo off
REM ======================================================
REM REINICIAR SERVIDOR NODE.JS
REM (Sin tocar PostgreSQL)
REM ======================================================

set SCRIPT_DIR=%~dp0
set NODE_DIR=%SCRIPT_DIR%..\\nodejs

echo Reiniciando servidor MECA...
taskkill /F /IM node.exe 2>nul
timeout /t 2 /nobreak >nul

echo Iniciando servidor...
"%NODE_DIR%\node.exe" "%SCRIPT_DIR%server.js"
