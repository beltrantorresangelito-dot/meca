MECA F10.27 - AUDIO PROXY CONTROLLER

ARQUITECTURA
server.js
  -> AudioProxyController
  -> AudioProxyService
  -> Python Audio API

AGREGA
- src/modules/audio-proxy/audio-proxy.controller.js
- tests/audio-proxy.controller.f1027.test.js

REEMPLAZA
- server.js
- tests/audio-proxy.characterization.f1025.test.js

MOVIDO AL CONTROLLER
- validación Ticket ID
- headers de reproducción
- Content-Disposition
- 200/400/500
- propagación de errores Python
- fallback Error al obtener el audio
- fallback verificar existe:false
- logs

PERMANECE EN server.js
- routing
- extracción de ticketId

server.js: 1180 -> 1131
reducción: 49

SIGUIENTE
F10.28 - AudioProxyRoutes.
