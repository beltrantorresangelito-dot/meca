MECA F10.51.2 - PARTIAL TEST RACE FIX

OBJETIVO
Corregir una condición de carrera del test:
HTTPSHELLMOD-007 partial reutiliza views/partials

PROBLEMA
El test esperaba:
setTimeout(..., 20)

En corrida completa, fs.readFile podía completar después de esos 20 ms.
Resultado:
status === undefined

CORRECCIÓN
El test ahora espera explícitamente a respuesta.end().
No depende de tiempos arbitrarios.

NO SE MODIFICA
- server.js
- src/modules/http-shell/http-static-views.js
- comportamiento productivo

AGREGA
tests/http-static-views.async-response.f10512.test.js

CRITERIO
npm test completo debe quedar en 0 fail.
