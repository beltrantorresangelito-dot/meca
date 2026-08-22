MECA F2.11-B - ESCRITURAS DE ATRIBUTOS

Aplicar sobre F2.11-A ya validado.

Reemplaza:
- server.js
- src/modules/matrix/matrix.repository.js
- src/modules/matrix/matrix.service.js
- src/modules/matrix/matrix.controller.js
- src/modules/matrix/matrix.routes.js
- tests/matrix-frentes-server.f211a.test.js

Agrega:
- tests/matrix-atributos-service.f211b.test.js
- tests/matrix-atributos-repository.f211b.test.js
- tests/matrix-atributos-server.f211b.test.js
- F2.11B_MATRIX_ATRIBUTOS_WRITES.md

No modifica BD ni frontend.

Después:
npm test
