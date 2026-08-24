MECA F8.5 - SESSIONS ROUTES

server.js -> SessionsRoutes -> SessionsController -> SessionsService -> SessionsRepository

Endpoints migrados:
- POST /api/sesiones/crear
- GET /api/sesiones/usuarios/:id
- POST /api/sesiones/cerrar
- POST /api/sesiones/usuarios/:id/cerrar-todas
- POST /api/historial-login

server.js: 2280 -> 2119
reducción: 161

Ejecutar: npm test
Esperado: 0 fail.
Siguiente: F8.6 limpieza + validación funcional.
