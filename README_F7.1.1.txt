MECA F7.1.1 - FIX POST /api/evaluaciones

CAUSA
El POST actual guardaba correctamente la evaluación y sus detalles dentro
de una transacción, hacía COMMIT, pero luego ejecutaba:

respuesta.end(JSON.stringify(result));

La variable result no existía en ese scope, por lo que podía producir
ReferenceError después de haber persistido los datos.

CORRECCIÓN
Se reemplaza únicamente esa respuesta por:

respuesta.end(JSON.stringify({ success: true }));

REEMPLAZA:
- server.js
- tests/evaluations.characterization.f71.test.js

AGREGA:
- tests/evaluations.post-regression.f711.test.js

NO MODIFICA:
- estructura BD
- SQL de inserción
- BEGIN / COMMIT / ROLLBACK
- frontend
- otros módulos

EJECUTAR:
npm test

ESPERADO:
0 fail.

Luego:
F7.2 - EvaluationsRepository.
