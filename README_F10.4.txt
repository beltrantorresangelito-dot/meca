MECA F10.4 - PDA CONTROLLER

ARQUITECTURA
server.js
  -> PdaController
  -> PdaService
  -> PdaRepository
  -> PostgreSQL

REEMPLAZA
- server.js
- tests/pda.characterization.f101.test.js

AGREGA
- src/modules/pda/pda.controller.js
- tests/pda.controller.f104.test.js

MOVIDO AL CONTROLLER
- respuestas HTTP de negocio
- listas vacías legacy
- 404 de PDA inexistente
- manejo de errores
- serialización JSON
- logs de error

PERMANECE EN server.js
- routing
- Token requerido
- extracción de pdaId

server.js: 1893 -> 1822
reducción: 71

NO SE ARRASTRA
- código legacy ajeno al dominio PDA.

SIGUIENTE
F10.5 - PdaRoutes.
