MECA F10.9 - QUARTILE CRITERIA SERVICE

ARQUITECTURA
server.js
  -> QuartileCriteriaService
  -> QuartileCriteriaRepository
  -> PostgreSQL

AGREGA
- src/modules/quartile-criteria/quartile-criteria.service.js
- tests/quartile-criteria.service.f109.test.js

REEMPLAZA
- server.js
- tests/quartile-criteria.characterization.f107.test.js

MOVIDO AL SERVICE
- delegación de listados
- cálculo de fecha actual para criterios activos
- validación mínima de IDs/payloads
- flujo de desactivación lógica
- activación

PERMANECE EN server.js
- routing
- Token requerido
- parsing JSON
- respuestas HTTP
- logs y mensajes actuales

server.js: 1708 -> 1707
variación: -1

SIGUIENTE
F10.10 - QuartileCriteriaController.
