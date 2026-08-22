MECA F1.10 - DOMAIN RESOLUTION

Archivos nuevos:
- migrations/0006_domain_resolution.up.sql
- migrations/0006_domain_resolution.down.sql
- scripts/domain/evaluation-context.js
- tests/domain-resolution.f110.test.js
- F1.10_DOMAIN_RESOLUTION.md

No reemplaza archivos productivos.

Secuencia:
1. npm test
2. npm run db:status
3. npm run db:migrate
4. npm run db:status
5. probar resolver_contexto_evaluacion() con una campaña real
6. probar rollback + migrate
7. arrancar MECA y validar operación
