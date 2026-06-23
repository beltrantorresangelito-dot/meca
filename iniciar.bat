@ECHO OFF
SET SCRIPT_DIR=%~dp0

:: Node.js
SET NODEJS_PATH=%SCRIPT_DIR%..\nodejs
SET PATH=%NODEJS_PATH%;%PATH%

:: PostgreSQL
SET PG_PATH=%SCRIPT_DIR%..\postgresql\bin
SET PGDATA=%SCRIPT_DIR%..\postgresql\data
SET PGPORT=5433
SET PATH=%PG_PATH%;%PATH%

CD /D %SCRIPT_DIR%

CLS
ECHO ========================================
ECHO    ✅ Entorno MECA Activado
ECHO ========================================
ECHO.
ECHO 📁 Node.js: %NODEJS_PATH%
ECHO 📁 PostgreSQL: %PG_PATH% (Puerto: %PGPORT%)
ECHO.
:: Iniciar PostgreSQL directamente (sin ventana nueva, sin PAUSE)
"%PG_PATH%\pg_ctl" -D "%PGDATA%" -o "-p %PGPORT%" -l "%SCRIPT_DIR%..\postgresql\postgres.log" start

:: Esperar a que arranque
timeout /t 3 /nobreak >nul

:: Verificar estado
ECHO.
"%PG_PATH%\pg_isready" -U postgres -h localhost -p %PGPORT%
ECHO.

npm run dev

node --version
npm --version
pg_ctl --version
ECHO.
ECHO ========================================
ECHO    🚀 Iniciando PostgreSQL...
ECHO ========================================
ECHO.
ECHO ========================================
ECHO    📦 Comandos disponibles:
ECHO ========================================
ECHO    npm start        → Iniciar servidor
ECHO    npm run dev      → Modo desarrollo (nodemon)
ECHO    pg_start         → Iniciar PostgreSQL
ECHO    pg_stop          → Detener PostgreSQL
ECHO ========================================

CMD /K