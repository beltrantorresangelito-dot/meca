MECA F10.26 - AUDIO PROXY SERVICE

ARQUITECTURA TEMPORAL
server.js
  -> AudioProxyService
  -> Python Audio API

AGREGA
- src/modules/audio-proxy/audio-proxy.service.js
- tests/audio-proxy.service.f1026.test.js

REEMPLAZA
- server.js
- tests/audio-proxy.characterization.f1025.test.js

MOVIDO AL SERVICE
- fetch hacia PYTHON_API_URL
- construcción de URLs
- lectura del audio
- arrayBuffer -> Buffer
- lectura de content-type/content-disposition
- propagación de status de error Python
- detalle acotado a 300 caracteres
- JSON de verificar

PERMANECE EN server.js
- routing
- validación ticketId
- headers HTTP al navegador
- respuestas HTTP
- logs

server.js: 1201 -> 1180
variación: -21

SIGUIENTE
F10.27 - AudioProxyController.
