MECA F2.4 - SEGUNDA LECTURA LEGACY

Requiere F2.3.

Reemplaza:
- server.js
- src/modules/domain/legacy-matrix.repository.js
- src/modules/domain/legacy-matrix.service.js

Agrega:
- tests/second-legacy-active-version.f24.test.js
- tests/second-legacy-active-version-server.f24.test.js
- F2.4_SECOND_LEGACY_READ.md

No modifica BD ni frontend.

Después:
1. npm test
2. iniciar MECA
3. probar /api/evaluacion/version-activa
4. registrar/editar evaluación
5. comprobar Administrador de Matriz
