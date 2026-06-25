@echo off
REM ======================================================
REM INICIAR POSTGRESQL PORTABLE + SERVIDOR MECA + B2B
REM Estructura: C:\MECA_ML\{meca-app, nodejs, postgresql}
REM Puerto PG: 5433 (sin permisos admin)
REM Puerto MECA: 3000
REM Puerto B2B: 8081
REM ======================================================

REM Obtener la carpeta donde esta este script
set SCRIPT_DIR=%~dp0
set PG_DIR=%SCRIPT_DIR%..\postgresql
set NODE_DIR=%SCRIPT_DIR%..\nodejs
set B2B_DIR=%SCRIPT_DIR%b2b-arbol
set PGDATA=%PG_DIR%\data
set PGPORT=5433

echo ======================================================
echo  INICIANDO SISTEMA MECA + B2B
echo ======================================================
echo.

REM --------------------------------------------------
REM 1. Iniciar PostgreSQL portable
REM --------------------------------------------------
echo [1/3] Iniciando PostgreSQL portable...
echo  - Directorio PG: %PG_DIR%
echo  - Datos en: %PGDATA%
echo  - Puerto: %PGPORT%

if not exist "%PGDATA%" (
    echo  - Primera vez: inicializando base de datos...
    "%PG_DIR%\bin\initdb.exe" -D "%PGDATA%" -U postgres -A trust -E UTF8 -p 5433
    echo  - Base de datos inicializada
)

"%PG_DIR%\bin\pg_ctl.exe" start -D "%PGDATA%" -o "-p 5433" -l "%PG_DIR%\postgresql.log"
echo  ✅ PostgreSQL iniciado en puerto %PGPORT%
echo.

REM --------------------------------------------------
REM 2. Instalar dependencias de MECA si es necesario
REM --------------------------------------------------
echo [2/3] Verificando dependencias de MECA...
if not exist "%SCRIPT_DIR%node_modules" (
    echo  - Instalando dependencias de MECA...
    "%NODE_DIR%\npm.cmd" install --prefix "%SCRIPT_DIR%"
    echo  ✅ Dependencias de MECA instaladas
) else (
    echo  ✅ Dependencias de MECA ya instaladas
)
echo.

REM --------------------------------------------------
REM 3. Iniciar servidores (MECA + B2B)
REM --------------------------------------------------
echo [3/3] Iniciando servidores...
echo.
echo ======================================================
echo  🚀 SERVIDORES LISTOS
echo  - MECA: http://localhost:8080
echo  - B2B:  http://localhost:8081/b2b-api/status
echo  - BD:   localhost:%PGPORT%
echo ======================================================
echo.

REM Iniciar MECA en una ventana nueva
start "MECA" cmd /c "cd /d "%SCRIPT_DIR%" && "%NODE_DIR%\node.exe" server.js"

REM Esperar 2 segundos para que MECA se estabilice
timeout /t 2 /nobreak >nul

REM Iniciar B2B en una ventana nueva (SIN npm install)
echo 🌳 Iniciando B2B (sin dependencias)...
start "B2B-API" cmd /c "cd /d "%B2B_DIR%" && "%NODE_DIR%\node.exe" b2b-server.js"

echo.
echo ✅ Ambos servidores iniciados en ventanas separadas
echo.
echo 💡 Para ver los logs, revisa cada ventana
echo 💡 Para detener, cierra las ventanas o usa Ctrl+C
echo.

pause