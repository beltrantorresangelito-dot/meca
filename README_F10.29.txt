MECA F10.29 - AUDIO PROXY FINALIZATION / CLEANUP

OBJETIVO
Cerrar Audio Proxy después de F10.28.2.

ARQUITECTURA FINAL
server.js
  -> AudioProxyRoutes
  -> AudioProxyController
  -> AudioProxyService
  -> Python Audio API

CAMBIOS
- cleanup conservador de comentarios legacy
- suite final centrada exclusivamente en contratos Audio Proxy
- checklist funcional

NOTA
La suite final no depende de que paquetes históricos parciales contengan
todos los archivos de otros dominios. La regresión completa del proyecto
continúa siendo npm test en el entorno real.

server.js: 1114 -> 1114
reducción por cleanup: 0

SIGUIENTE
Si npm test y checklist quedan OK:
Audio Proxy queda cerrado y continuamos con el siguiente residual.
