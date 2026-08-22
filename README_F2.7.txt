MECA F2.7 - LISTADO VERSIONES MATRIZ

Requiere F2.6 + fix lazy DomainRepository.

Reemplaza:
- server.js
- src/modules/domain/legacy-matrix.repository.js
- src/modules/domain/legacy-matrix.service.js

Agrega:
- tests/legacy-matrix-versions-list.f27.test.js
- tests/legacy-matrix-versions-list-server.f27.test.js
- F2.7_LEGACY_MATRIX_VERSIONS_LIST.md

No modifica BD ni frontend.

Después:
1. npm test
2. iniciar MECA
3. validar selector/listado de versiones
4. validar estructura de matriz
5. validar evaluación
