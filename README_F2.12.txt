MECA F2.12 - CICLO DE VIDA DE VERSIONES

Base: F2.11-C.

Reemplaza:
- server.js
- src/modules/matrix/matrix.repository.js
- src/modules/matrix/matrix.service.js
- src/modules/matrix/matrix.controller.js
- src/modules/matrix/matrix.routes.js

Agrega:
- tests/matrix-version-lifecycle.f212.test.js
- tests/matrix-version-server.f212.test.js
- F2.12_MATRIX_VERSION_LIFECYCLE.md

No modifica BD ni frontend.

IMPORTANTE:
No se migra /api/matriz/recalcular todavía.

Ejecutar:
1. npm test
2. reiniciar MECA
3. probar GET /api/matriz/versiones/4/integridad
4. probar creación de snapshot sin activarlo
