@echo off
REM ======================================================
REM INICIAR POSTGRESQL PORTABLE + SERVIDOR MECA
REM Estructura: C:\MECA_ML\{meca-app, nodejs, postgresql}
REM Puerto PG: 5433 (sin permisos admin)
REM ======================================================

REM Obtener la carpeta donde esta este script
set SCRIPT_DIR=%~dp0
set PG_DIR=%SCRIPT_DIR%..\\postgresql
set NODE_DIR=%SCRIPT_DIR%..\\nodejs
set PGDATA=%PG_DIR%\data
set PGPORT=5433

echo ======================================================
echo  INICIANDO SISTEMA MECA (PostgreSQL Local)
echo ======================================================
echo.

REM --------------------------------------------------
REM 1. Iniciar PostgreSQL portable
REM --------------------------------------------------
echo [1/3] Iniciando PostgreSQL portable...
echo  - Directorio PG: %PG_DIR%
echo  - Datos en: %PGDATA%
echo  - Puerto: %PGPORT%

REM Verificar si es la primera vez
if not exist "%PGDATA%" (
    echo  - Primera vez: inicializando base de datos...
    "%PG_DIR%\bin\initdb.exe" -D "%PGDATA%" -U postgres -A trust -E UTF8 --pport=5433
    echo  - Base de datos inicializada
)

REM Iniciar PostgreSQL
"%PG_DIR%\bin\pg_ctl.exe" start -D "%PGDATA%" -o "-p 5433" -l "%PG_DIR%\postgresql.log"

echo  - PostgreSQL iniciado en puerto %PGPORT%
echo.

REM --------------------------------------------------
REM 2. Instalar dependencias si es necesario
REM --------------------------------------------------
echo [2/3] Verificando dependencias...
if not exist "%SCRIPT_DIR%node_modules" (
    echo  - Instalando dependencias...
    "%NODE_DIR%\npm.cmd" install --prefix "%SCRIPT_DIR%"
    echo  - Dependencias instaladas
) else (
    echo  - Dependencias ya instaladas
)
echo.

REM --------------------------------------------------
REM 3. Iniciar servidor Node.js
REM --------------------------------------------------
echo [3/3] Iniciando servidor MECA...
echo.
echo ======================================================
echo  SERVIDOR MECA LISTO
echo  - App: http://localhost:8080
echo  - BD:  localhost:%PGPORT%
echo ======================================================
echo.

"%NODE_DIR%\node.exe" "%SCRIPT_DIR%server.js"
