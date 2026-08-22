MECA F2.11-A - ESCRITURAS DE FRENTES

Base:
F2.10 + fix lecturas versionadas.

Reemplaza:
- server.js
- src/modules/matrix/matrix.repository.js
- src/modules/matrix/matrix.service.js
- src/modules/matrix/matrix.controller.js
- src/modules/matrix/matrix.routes.js
- src/modules/matrix/index.js

Agrega:
- tests/matrix-frentes-service.f211a.test.js
- tests/matrix-frentes-repository.f211a.test.js
- tests/matrix-frentes-server.f211a.test.js
- F2.11A_MATRIX_FRENTES_WRITES.md

No modifica BD ni frontend.

Ejecutar:
1. npm test
2. iniciar MECA
3. probar edición de un frente
4. si es seguro, crear/eliminar frente temporal
