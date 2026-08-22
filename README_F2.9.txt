MECA F2.9 - CONSOLIDACIÓN MATRIX MODULE

Requiere F2.8 aplicado.

Nuevos:
- src/modules/matrix/matrix.repository.js
- src/modules/matrix/matrix.service.js
- src/modules/matrix/matrix.controller.js
- src/modules/matrix/matrix.routes.js
- src/modules/matrix/index.js
- tests/matrix-module.f29.test.js
- tests/matrix-routes.f29.test.js
- tests/matrix-server-consolidation.f29.test.js
- F2.9_MATRIX_MODULE_CONSOLIDATION.md

Reemplaza:
- server.js
- src/modules/domain/legacy-matrix.repository.js
- src/modules/domain/legacy-matrix.service.js
- tests server-shape F2.3 a F2.8 (porque el diseño esperado cambió).

No modifica BD ni frontend.

Ejecutar:
1. npm test
2. iniciar MECA
3. validar Supervisor > Matriz
4. validar Auditor > evaluación
5. probar listado, estructura y reglas.
