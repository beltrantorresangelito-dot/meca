MECA F8.1.1 - RECONSTRUIDO SOBRE F7.6 ESTABLE

BASE:
- MECA_F7.6_evaluations_cleanup.zip

CAMBIO ÚNICO DE PRODUCCIÓN:
POST /api/sesiones/cerrar:
- eliminados -> result.rowCount

GARANTÍA:
Se preserva íntegramente la modularización de Evaluations de F7.6.

AGREGA:
- tests/sessions.characterization.f81.test.js
- tests/sessions.close-regression.f811.test.js

EJECUTAR:
npm test

ESPERADO:
0 fail.
