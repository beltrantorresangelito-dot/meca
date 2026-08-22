MECA F2.8 - REGLAS POR VERSION

Requiere F2.7.

Reemplaza:
- server.js
- src/modules/domain/legacy-matrix.repository.js
- src/modules/domain/legacy-matrix.service.js

Agrega:
- tests/legacy-rules-by-version.f28.test.js
- tests/legacy-rules-by-version-server.f28.test.js
- F2.8_LEGACY_RULES_BY_VERSION.md

No modifica BD ni frontend.
No toca CRUD de reglas.

Después:
1. npm test
2. iniciar MECA
3. probar GET /api/reglas-evaluacion/version/:id
4. probar evaluación y comportamiento NA
5. comprobar administrador de reglas
