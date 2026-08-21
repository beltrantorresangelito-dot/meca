MECA F1.8 - MATRIZ -> QUIEBRE

Copiar sobre la raíz de meca-app.

Archivos nuevos:
- migrations/0004_matrices_quiebre.up.sql
- migrations/0004_matrices_quiebre.down.sql
- tests/matriz-quiebre.f18.test.js
- F1.8_MATRIZ_QUIEBRE.md

No reemplaza archivos productivos.

Secuencia:
1. npm test
2. npm run db:status
3. npm run db:migrate
4. npm run db:status
5. Ejecutar consultas de verificación.
6. Probar matriz + registro/edición de evaluación + histórico.
7. Antes de la relación Campaña↔Matriz: rollback + migrate una vez.
