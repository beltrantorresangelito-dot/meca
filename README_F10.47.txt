MECA F10.47 - GENERIC RPC FINALIZATION / CLEANUP

ARQUITECTURA FINAL
server.js
  -> GenericRpcRoutes
  -> GenericRpcController
  -> GenericRpcService
  -> GenericRpcRepository
  -> PostgreSQL

ENDPOINT
POST /api/rpc/:functionName

CERRADO
- endpoint fuera de server.js
- functionName fuera de server.js
- parsing fuera de server.js
- HTTP fuera de server.js
- selección de comportamiento fuera de server.js
- SQL fuera de server.js

RIESGOS PENDIENTES DOCUMENTADOS
- sin allowlist funcional de funciones.
- cerrar_mes conserva fallback admin.
- limpiar_sesiones_expiradas sigue siendo SQL especial.

server.js: 597 -> 597
variación cleanup: +0

SIGUIENTE
Si npm test y checklist quedan OK:
Generic RPC queda cerrado.
Luego se inventaría el siguiente residual de server.js,
incluyendo el bloque nodemailer detectado.
