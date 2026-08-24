MECA F10.52.1 - SUPERVISOR TEST RACE FIX

OBJETIVO
Eliminar la condición de carrera de:
HTTPSHELLMOD-006 supervisor aliases funcionan

PROBLEMA
El test esperaba 20 ms para fs.readFile.
En la suite completa, a veces el callback terminaba después.

CORRECCIÓN
Ahora el test espera explícitamente a respuesta.end()
para:
- /supervisor
- /supervisor.html

NO SE MODIFICA PRODUCCIÓN.
Solo cambian tests.

AGREGA
tests/http-static-views.supervisor-async.f10521.test.js

CRITERIO
npm test completo debe quedar en 0 fail.
