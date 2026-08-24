MECA F10.28 - AUDIO PROXY ROUTES / HANDLER

ARQUITECTURA
server.js
  -> AudioProxyRoutes
  -> AudioProxyController
  -> AudioProxyService
  -> Python Audio API

ENDPOINTS MIGRADOS
- GET /api/audio/reproducir/:ticketId
- GET /api/audio/verificar/:ticketId

MIGRADO A ROUTES
- routing
- extracción de ticketId

NO SE ARRASTRA
- handlers inline
- código legacy ajeno al dominio

server.js: 1131 -> 1113
reducción: 18

SIGUIENTE
F10.29 - limpieza + validación funcional Audio Proxy.
