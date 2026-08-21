MECA F1.9 - CAMPANA <-> MATRIZ + VIGENCIA

Copiar sobre la raíz de meca-app.

Archivos nuevos:
- migrations/0005_campana_matriz_vigencia.up.sql
- migrations/0005_campana_matriz_vigencia.down.sql
- tests/campana-matriz.f19.test.js
- F1.9_CAMPANA_MATRIZ.md

No reemplaza archivos productivos.

Secuencia:
1. npm test
2. npm run db:status
3. npm run db:migrate
4. npm run db:status
5. Ejecutar las 3 consultas de verificación del documento.
6. Arrancar MECA y validar campañas, matriz, evaluación y reportes.
7. Antes de F1.10: rollback + migrate una vez.
