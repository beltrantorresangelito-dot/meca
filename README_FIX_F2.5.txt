MECA F2.5 - FIX CARGA PEREZOSA DE POSTGRESQL

Reemplaza:
- src/modules/domain/legacy-matrix.repository.js

Agrega:
- tests/legacy-matrix-lazy-db.f25fix.test.js

Problema:
Los tests unitarios inyectaban un fake DB, pero el Repository hacía:
require('../../../models/database')
al cargar el archivo. Eso abría PostgreSQL innecesariamente dentro del proceso
de test y podía provocar el fallo del archivo aunque sus subtests pasaran.

Solución:
El pool real se carga solamente en el constructor cuando NO se entrega un db.

Producción:
new DomainRepository()
→ carga pool PostgreSQL normalmente.

Tests:
new DomainRepository(fakeDb)
→ no carga PostgreSQL.

Después:
npm test

Esperado:
0 fail y el archivo legacy-active-matrix.f23.test.js ya no debe abrir una
conexión PostgreSQL por sí mismo.
