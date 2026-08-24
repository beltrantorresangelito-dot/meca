MECA F10.10 - QUARTILE CRITERIA CONTROLLER

ARQUITECTURA
server.js
  -> QuartileCriteriaController
  -> QuartileCriteriaService
  -> QuartileCriteriaRepository
  -> PostgreSQL

AGREGA
- src/modules/quartile-criteria/quartile-criteria.controller.js
- tests/quartile-criteria.controller.f1010.test.js

REEMPLAZA
- server.js
- tests/quartile-criteria.characterization.f107.test.js

MOVIDO AL CONTROLLER
- respuestas HTTP de negocio
- serialización JSON
- 201 create
- 404 IDs inexistentes
- errores del Service
- logs y mensaje de desactivación

PERMANECE EN server.js
- routing
- Token requerido
- parsing JSON de POST/PUT
- extracción de IDs

server.js: 1707 -> 1635
reducción: 72

SIGUIENTE
F10.11 - QuartileCriteriaRoutes.
