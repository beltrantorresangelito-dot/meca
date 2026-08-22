MECA F2.6 - ESTRUCTURA MATRIZ

Requiere F2.5 + fix lazy DB.

Reemplaza:
- server.js
- src/modules/domain/legacy-matrix.repository.js
- src/modules/domain/legacy-matrix.service.js

Agrega:
- tests/legacy-matrix-structure.f26.test.js
- tests/legacy-matrix-structure-server.f26.test.js
- F2.6_LEGACY_MATRIX_STRUCTURE.md

No modifica:
- BD
- frontend
- escrituras
- audio

Después:
1. npm test
2. iniciar MECA
3. validar Administrador de Matriz completo
4. validar evaluación
5. probar endpoint estructura
