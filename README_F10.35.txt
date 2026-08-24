MECA F10.35 - MATRIX RECALCULATION FINALIZATION / CLEANUP

ARQUITECTURA FINAL
server.js
  -> MatrixRecalculationRoutes
  -> MatrixRecalculationController
  -> MatrixRecalculationService
  -> MatrixRecalculationRepository
  -> PostgreSQL

ENDPOINT
POST /api/matriz/recalcular

CAMBIOS
- cleanup conservador.
- suite final del dominio.
- checklist funcional.

NO CAMBIA
- fórmula ENC/ECUF/ECN/nota_final.
- tolerancia a errores individuales.
- contrato HTTP.
- Token requerido.
- estrategia actual de consultas dentro de bucles.

server.js: 978 -> 978
variación: +0

Si npm test y checklist quedan OK:
Matrix Recalculation queda cerrado.
