MECA F10.52 - HEALTH MODULE

CONTRATO REAL LEGACY PRESERVADO

GET /api/health siempre responde HTTP 200 incluso si PostgreSQL falla.

DB OK:
status: ok
message: Servidor MECA funcionando (PostgreSQL local)
version: 2.0.0
database: conectado (<ISO timestamp>)
timestamp: <ISO timestamp>

DB ERROR:
status: ok
database: error: <mensaje>

ARQUITECTURA
server.js
  -> HealthRoutes
  -> HealthController
  -> HealthService
  -> HealthRepository
  -> PostgreSQL

MOVIDO FUERA DE server.js
- registro /api/health
- SELECT NOW()
- construcción dbStatus
- payload JSON

IMPORTANTE
Se conserva la posición funcional después de autenticación/autorización
central, igual que cuando health vivía en routes[ruta].

server.js: 473 -> 462
reducción: 11

SIGUIENTE
Inventariar registrarRuta/routes legacy ahora que health salió.
