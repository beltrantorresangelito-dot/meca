MECA F10.32 - MATRIX RECALCULATION SERVICE

ARQUITECTURA
server.js
  -> MatrixRecalculationService
  -> MatrixRecalculationRepository
  -> PostgreSQL

AGREGA
- src/modules/matrix-recalculation/matrix-recalculation.service.js
- tests/matrix-recalculation.service.f1032.test.js

REEMPLAZA
- server.js
- tests/matrix-recalculation.characterization.f1030.test.js

MOVIDO AL SERVICE
- bucle de detalles
- búsqueda/aplicación de pesos
- tolerancia a error por detalle
- contadores de detalles y errores
- bucle de evaluaciones
- cálculo/actualización de totales
- tolerancia a error por evaluación
- contador de evaluaciones
- logs de progreso
- resumen final
- armado del resultado

PERMANECE EN server.js
- routing
- Token requerido
- respuesta HTTP
- error general

server.js: 1089 -> 995
reducción: 94

SIGUIENTE
F10.33 - MatrixRecalculationController.
