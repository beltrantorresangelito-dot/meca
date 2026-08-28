MECA F11.5.5.4B - LOGIN STATIC VIEW TEST RACE FIX

SÍNTOMA
HTTPSHELLMOD-004 login devuelve vista
fallaba con:

undefined !== 200

CAUSA
El test de /login todavía dependía de una espera temporal/arbitraria.
El módulo sirve vistas mediante I/O asíncrono, así que bajo carga de
la suite completa el status podía seguir undefined cuando se hacía
el assert.

CORRECCIÓN
Se usa el mismo patrón ya aplicado a Auditor y Supervisor:

handler(...)
 -> writeHead(status)
 -> end()
 -> resolveEnded()
 -> await ended
 -> assert status === 200

PRODUCCIÓN NO SE MODIFICA.

APLICACIÓN

node --check scripts\f11554b-fix-login-static-test-race.js
node scripts\f11554b-fix-login-static-test-race.js

node --test tests\http-static-views.module.f1051.test.js
node --test tests\login-static-test-race.f11554b.test.js

npm test

CRITERIO
Suite completa en 0 fail.

Después retomamos la prueba funcional de F11.5.5.4A.
