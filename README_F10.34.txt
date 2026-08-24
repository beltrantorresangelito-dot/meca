MECA F10.34 - MATRIX RECALCULATION ROUTES / HANDLER

ARQUITECTURA
server.js
  -> MatrixRecalculationRoutes
  -> MatrixRecalculationController
  -> MatrixRecalculationService
  -> MatrixRecalculationRepository
  -> PostgreSQL

ENDPOINT MIGRADO
- POST /api/matriz/recalcular

MIGRADO A ROUTES
- routing
- Token requerido

server.js: 988 -> 978
reducción: 10

SIGUIENTE
F10.35 - limpieza + validación funcional final Matrix Recalculation.
