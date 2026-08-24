MECA F10.11 - QUARTILE CRITERIA ROUTES / HANDLER

ARQUITECTURA
server.js
  -> QuartileCriteriaRoutes
  -> QuartileCriteriaController
  -> QuartileCriteriaService
  -> QuartileCriteriaRepository
  -> PostgreSQL

ENDPOINTS MIGRADOS
- GET    /api/criterios-cuartiles
- GET    /api/criterios-cuartiles/activos
- POST   /api/criterios-cuartiles
- PUT    /api/criterios-cuartiles/:id
- DELETE /api/criterios-cuartiles/:id
- POST   /api/criterios-cuartiles/:id/activar

MIGRADO A ROUTES
- Token requerido
- parsing JSON POST/PUT
- extracción de IDs
- routing

NO SE ARRASTRA
- handlers inline
- código legacy ajeno al dominio

server.js: 1635 -> 1501
reducción: 134

SIGUIENTE
F10.12 - limpieza + validación funcional Criterios de Cuartiles.
