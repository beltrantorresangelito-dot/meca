MECA F1.5 - MIGRACIONES

Copiar el contenido de esta carpeta sobre la raíz de meca-app.

Archivos nuevos:
- scripts/migrations/cli.js
- scripts/migrations/lib.js
- migrations/0001_meca_v1_baseline.up.sql
- migrations/0001_meca_v1_baseline.down.sql
- tests/migrations.f15.test.js
- F1.5_MIGRATIONS.md

Archivo modificado:
- package.json (solo agrega db:migrate, db:status y db:rollback)

No modifica:
- server.js
- auditor.js
- supervisor.js
- modelos de negocio
- tablas funcionales

Después:
1. npm test
2. npm run db:status
3. npm run db:migrate
4. npm run db:status
