MECA F2.6 - FIX DOMAIN REPOSITORY LAZY DB

Reemplaza:
- src/modules/domain/domain.repository.js

Agrega:
- tests/domain-repository-lazy-db.f26fix.test.js

Problema observado:
Los archivos:
- backend-domain-endpoints.f22.test.js
- backend-domain-module.f21.test.js
- backend-domain-module.smoke.f21.test.js

fallaban a nivel del worker de node --test con:
"Unable to deserialize cloned data due to invalid or unsupported version"

Sus asserts no estaban fallando. Los tres importan DomainRepository/DomainService.

Causa:
domain.repository.js cargaba models/database al importar el módulo:
const { pool } = require('../../../models/database');

Eso podía abrir PostgreSQL dentro de workers unitarios y dejar handles/estado
innecesario en procesos de test.

Solución:
El pool real se carga solo cuando se construye Repository SIN fake DB.

Producción:
new DomainRepository()
-> usa PostgreSQL real.

Tests:
new DomainRepository(fakeDb)
-> no carga PostgreSQL.

Después:
npm test

Esperado:
0 fail.
