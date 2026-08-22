MECA F2.11-C - ESCRITURAS SUBMOTIVOS

Requiere F2.11-B y el ajuste de validación de createAttribute ya confirmado.

Reemplaza:
- server.js
- src/modules/matrix/matrix.repository.js
- src/modules/matrix/matrix.service.js
- src/modules/matrix/matrix.controller.js
- src/modules/matrix/matrix.routes.js
- tests/matrix-read-server.f210.test.js
- tests/matrix-atributos-server.f211b.test.js
- tests/matrix-frentes-server.f211a.test.js

Agrega:
- tests/matrix-submotivos-service.f211c.test.js
- tests/matrix-submotivos-repository.f211c.test.js
- tests/matrix-submotivos-server.f211c.test.js
- F2.11C_MATRIX_SUBMOTIVOS_WRITES.md

No modifica BD ni frontend.

Después:
1. npm test
2. validar editar un submotivo existente
3. crear/eliminar uno temporal solo si es seguro
