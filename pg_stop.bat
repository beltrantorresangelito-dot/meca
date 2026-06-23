@ECHO OFF
SET PG_PATH=%~dp0..\postgresql\bin
SET PGDATA=%~dp0..\postgresql\data
SET PGPORT=5433

ECHO ========================================
ECHO    Deteniendo PostgreSQL
ECHO ========================================
ECHO.

"%PG_PATH%\pg_ctl" -D "%PGDATA%" -o "-p %PGPORT%" stop

ECHO.
ECHO ✅ PostgreSQL detenido
PAUSE