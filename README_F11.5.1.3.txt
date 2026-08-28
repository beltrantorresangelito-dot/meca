MECA F11.5.1.3 - DOMAIN QUERY CONTRACT FIX

SÍNTOMA

GET /api/domain/campanas?quiebre_id=1

respondía:

400
quiebreId debe ser un entero positivo

CAUSA

El contrato real del DomainController usa:

quiebreId

y no:

quiebre_id

La ruta ya funciona y está autenticada; el 400 demuestra que llegó
correctamente al controller y falló únicamente la validación del parámetro.

CORRECCIÓN

Supervisor cambia:

/api/domain/campanas?quiebre_id=1

por:

/api/domain/campanas?quiebreId=1

NO SE MODIFICA BACKEND.

APLICACIÓN

Copiar:
scripts/f11513-fix-domain-query-contract.js
tests/domain-query-contract.f11513.test.js

Ejecutar:

node --check scripts\f11513-fix-domain-query-contract.js
node scripts\f11513-fix-domain-query-contract.js

node --test tests\domain-query-contract.f11513.test.js
npm test

Reiniciar/recargar la página Supervisor y probar:

await obtenerCampanasPorQuiebre(1)

CRITERIO

Debe devolver un Array con las campañas del quiebre 1
y no responder 400/404.

NOTA PARA F11.5.2

El mismo principio debe respetarse para contexto-evaluacion:
usar exactamente los nombres de parámetros definidos por el
DomainController, sin convertirlos automáticamente a snake_case.
