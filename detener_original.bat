@echo off
REM ======================================================
REM DETENER SERVIDOR NODE Y POSTGRESQL
REM Estructura: D:\MECA_ML\{meca-app, nodejs, postgresql}
REM ======================================================

set SCRIPT_DIR=%~dp0
set PG_DIR=%SCRIPT_DIR%..\\postgresql
set PGDATA=%PG_DIR%\data

echo Deteniendo servidor Node.js...
taskkill /F /IM node.exe 2>nul

echo Deteniendo PostgreSQL...
"%PG_DIR%\bin\pg_ctl.exe" stop -D "%PGDATA%" -m fast 2>nul

echo Sistema MECA detenido
pause
