@echo off
REM ======================================================
REM DETENER POSTGRESQL + SERVIDORES MECA y B2B
REM Estructura: C:\MECA_ML\{meca-app, nodejs, postgresql}
REM Puerto MECA: 3000
REM Puerto B2B: 8081
REM ======================================================

set SCRIPT_DIR=%~dp0
set PG_DIR=%SCRIPT_DIR%..\postgresql
set PGDATA=%PG_DIR%\data

echo ======================================================
echo  DETENIENDO SISTEMA MECA + B2B
echo ======================================================
echo.

REM --------------------------------------------------
REM 1. Detener servidores Node.js (MECA + B2B)
REM --------------------------------------------------
echo [1/3] Deteniendo servidores Node.js...

REM Detener procesos Node.js que estén usando los puertos 3000 y 8081
echo  - Buscando procesos en puerto 3000 (MECA)...
for /f "tokens=5" %%a in ('netstat -aon ^| find ":3000" ^| find "LISTENING"') do (
    echo    ✅ Deteniendo PID %%a (puerto 3000)
    taskkill /F /PID %%a 2>nul
)

echo  - Buscando procesos en puerto 8081 (B2B)...
for /f "tokens=5" %%a in ('netstat -aon ^| find ":8081" ^| find "LISTENING"') do (
    echo    ✅ Deteniendo PID %%a (puerto 8081)
    taskkill /F /PID %%a 2>nul
)

REM Fallback: matar cualquier proceso Node.js que quede
taskkill /F /IM node.exe 2>nul
echo  ✅ Servidores Node.js detenidos
echo.

REM --------------------------------------------------
REM 2. Detener PostgreSQL
REM --------------------------------------------------
echo [2/3] Deteniendo PostgreSQL...
"%PG_DIR%\bin\pg_ctl.exe" stop -D "%PGDATA%" -m fast 2>nul
echo  ✅ PostgreSQL detenido
echo.

REM --------------------------------------------------
REM 3. Cerrar ventanas de CMD (opcional)
REM --------------------------------------------------
echo [3/3] Cerrando ventanas de terminal...
taskkill /F /FI "WINDOWTITLE eq MECA*" 2>nul
taskkill /F /FI "WINDOWTITLE eq B2B-API*" 2>nul
echo  ✅ Ventanas cerradas
echo.

echo ======================================================
echo  ✅ SISTEMA COMPLETO DETENIDO
echo ======================================================
echo.
echo  📋 Resumen:
echo  - MECA (puerto 3000): Detenido
echo  - B2B  (puerto 8081): Detenido
echo  - PostgreSQL: Detenido
echo.

pause