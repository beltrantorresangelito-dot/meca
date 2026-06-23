@ECHO OFF
"%~dp0..\postgresql\bin\psql.exe" -U postgres -h localhost -p 5433 %*