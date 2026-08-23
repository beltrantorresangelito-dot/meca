MECA F2.13 - CIERRE SEGURO MATRIX

Base:
F2.12 + fix JSON snapshot.

Reemplaza:
- server.js
- src/modules/matrix/matrix.repository.js
- src/modules/matrix/matrix.service.js
- src/modules/matrix/matrix.controller.js
- src/modules/matrix/matrix.routes.js

Agrega:
- tests/matrix-safe-closure-service.f213.test.js
- tests/matrix-safe-closure-server.f213.test.js
- F2.13_MATRIX_SAFE_CLOSURE.md

No modifica BD ni frontend.

server.js antes F2.13: 5574
server.js después F2.13: 5260
reducción F2.13: 314 líneas


IMPORTANTE:
NO ejecutar /api/matriz/recalcular.

Pasos:
1. npm test
2. reiniciar MECA
3. probar /api/evaluacion/estructura
4. probar CRUD de reglas desde Supervisor
