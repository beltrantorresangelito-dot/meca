MECA F1.7 - CAMPANA -> QUIEBRE

Copiar sobre la raíz de meca-app.

Archivos nuevos:
- migrations/0003_campanas_quiebre.up.sql
- migrations/0003_campanas_quiebre.down.sql
- tests/campanas-quiebre.f17.test.js
- F1.7_CAMPANA_QUIEBRE.md

No reemplaza archivos productivos.

Secuencia:
1. npm test
2. npm run db:status
3. npm run db:migrate
4. npm run db:status
5. Ejecutar las consultas de verificación del documento.
6. Probar Auditor/Supervisor.
7. Antes de F1.8: rollback + migrate para validar reversibilidad.
