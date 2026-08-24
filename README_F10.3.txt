MECA F10.3 - PDA SERVICE

ARQUITECTURA
server.js
  -> PdaService
  -> PdaRepository
  -> PostgreSQL

REEMPLAZA
- server.js
- tests/pda.characterization.f101.test.js

AGREGA
- src/modules/pda/pda.service.js
- tests/pda.service.f103.test.js

MOVIDO AL SERVICE
- delegación de listados
- detalle PDA
- asociación de acciones
- cálculo de progreso
- delegación de exportación

PERMANECE EN server.js
- routing
- Token requerido
- respuestas HTTP
- tolerancia legacy de listas vacías y errores

server.js: 1901 -> 1893
variación: -8

NO SE ARRASTRA
- código legacy ajeno a PDA.

SIGUIENTE
F10.4 - PdaController.
