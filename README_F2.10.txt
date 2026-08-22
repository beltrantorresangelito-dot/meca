MECA F2.10 - BLOQUE DE LECTURAS MATRIX

Requiere F2.9 + fix de contrato real Matrix.

Reemplaza:
- server.js
- src/modules/matrix/matrix.repository.js
- src/modules/matrix/matrix.service.js
- src/modules/matrix/matrix.controller.js
- src/modules/matrix/matrix.routes.js

Agrega:
- tests/matrix-read-block.f210.test.js
- tests/matrix-read-routes.f210.test.js
- tests/matrix-read-server.f210.test.js
- F2.10_MATRIX_READ_BLOCK.md

No modifica BD ni frontend.
No mueve escrituras.

Ejecutar:
1. npm test
2. iniciar MECA
3. validar cuatro GET
4. validar Administrador de Matriz
5. validar Auditor
