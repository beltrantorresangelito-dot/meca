MECA F10.5 - PDA ROUTES / HANDLER

Arquitectura:
server.js -> PdaRoutes -> PdaController -> PdaService -> PdaRepository -> PostgreSQL

Endpoints migrados:
- GET /api/pda/pendientes
- GET /api/pda/seguimiento
- GET /api/pda/historial
- GET /api/pda/:id
- GET /api/pda/exportar

Código anterior mantenido solo por vínculo:
- requireToken, ahora dentro de pda.routes.js.
- Controller, Service y Repository de F10.2-F10.4.

No se arrastra código legacy ajeno al dominio.

server.js: 1822 -> 1744
reducción: 78

Siguiente:
F10.6 - limpieza + validación funcional PDA.
