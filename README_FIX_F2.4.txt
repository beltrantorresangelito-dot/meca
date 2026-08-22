MECA F2.4 - FIX TEST OBSOLETO DE F2.3

Reemplaza únicamente:
- tests/legacy-active-matrix-server.f23.test.js

Motivo:
F2.3 validaba que /api/evaluacion/version-activa todavía usara pool.query.
F2.4 migró intencionalmente ese endpoint al LegacyMatrixService, por lo que
esa expectativa dejó de ser válida.

No modifica código productivo, BD ni frontend.

Después:
npm test

Resultado esperado:
98 tests / 98 pass / 0 fail
