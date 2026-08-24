MECA F10.31 - MATRIX RECALCULATION REPOSITORY

ARQUITECTURA TEMPORAL
server.js
  -> MatrixRecalculationRepository
  -> PostgreSQL

AGREGA
- src/modules/matrix-recalculation/matrix-recalculation.repository.js
- tests/matrix-recalculation.repository.f1031.test.js

REEMPLAZA
- server.js
- tests/matrix-recalculation.characterization.f1030.test.js

MOVIDO FUERA DE server.js
- lectura de detalles con submotivo
- consulta de peso activo
- actualización de peso por detalle
- evaluaciones distintas
- cálculo ENC/ECUF/ECN/nota_final
- actualización de evaluación
- resumen COUNT/AVG/MIN/MAX

PERMANECE EN server.js
- routing
- Token requerido
- bucles
- tolerancia a errores individuales
- contadores
- logs
- respuesta HTTP

server.js: 1114 -> 1089
reducción: 25

SIGUIENTE
F10.32 - MatrixRecalculationService.
