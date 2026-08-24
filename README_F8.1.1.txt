MECA F8.1.1 - FIX POST /api/sesiones/cerrar

CAUSA
El endpoint ejecutaba correctamente el UPDATE y almacenaba el resultado
en la variable `result`, pero luego usaba `eliminados`, variable inexistente.

CORRECCIÓN
Se reemplaza:
- ${eliminados}
- afectadas: eliminados

por:
- ${result.rowCount}
- afectadas: result.rowCount

REEMPLAZA:
- server.js
- tests/sessions.characterization.f81.test.js

AGREGA:
- tests/sessions.close-regression.f811.test.js
- README_F8.1.1.txt

NO MODIFICA:
- SQL del UPDATE
- BD
- frontend
- rutas
- autenticación

EJECUTAR:
npm test

ESPERADO:
0 fail.

SIGUIENTE:
F8.2 - SessionsRepository.
