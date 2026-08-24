MECA F10.8 - QUARTILE CRITERIA REPOSITORY

server.js -> QuartileCriteriaRepository -> PostgreSQL

Movido:
- listados general/activos
- create/update
- lookup básico
- deactivate/activate

Permanece en server.js:
- routing
- token
- parsing JSON
- HTTP/404/logs

Legacy vinculado preservado:
- creado_por='admin'
- activo !== false
- fecha_vigencia_hasta nullable
- DELETE lógico

server.js: 1744 -> 1708
reducción: 36

Siguiente: F10.9 QuartileCriteriaService.
