MECA F10.2 - PDA REPOSITORY

ARQUITECTURA TEMPORAL
server.js -> PdaRepository -> PostgreSQL

REEMPLAZA
- server.js
- tests/pda.characterization.f101.test.js

AGREGA
- src/modules/pda/pda.repository.js
- tests/pda.repository.f102.test.js

MOVIDO FUERA DE server.js
- verificación de existencia pda_cabecera
- listado pendientes
- listado seguimiento
- historial
- cabecera por id
- acciones por PDA
- consulta de exportación

PERMANECE EN server.js
- routing
- Token requerido
- respuestas HTTP
- tolerancia legacy de listas vacías
- cálculo de progreso del detalle

server.js: 1948 -> 1901
reducción: 47

NO SE ARRASTRA
- código legacy ajeno a PDA.

SIGUIENTE
F10.3 - PdaService.
