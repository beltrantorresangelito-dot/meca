MECA F10.25 - CHARACTERIZATION AUDIO PROXY

OBJETIVO
Congelar el comportamiento actual de los endpoints proxy de audio antes de extraerlos de server.js.

ENDPOINTS PROTEGIDOS
- GET /api/audio/reproducir/:ticketId
- GET /api/audio/verificar/:ticketId

SE PROTEGE
- validación numérica del ticketId en reproducir.
- delegación al servidor Python mediante PYTHON_API_URL.
- propagación del status HTTP devuelto por Python.
- detalle de error acotado.
- Content-Type devuelto por Python.
- Accept-Ranges: bytes.
- Cache-Control public max-age=86400.
- Content-Length.
- Content-Disposition cuando Python lo envía.
- conversión arrayBuffer -> Buffer.
- fallback 500 para error local.
- verificar devuelve JSON de Python.
- fallback verificar: { existe:false, error }.

IMPORTANTE
No se introduce todavía una nueva política de autenticación propia dentro del módulo.
La caracterización conserva el comportamiento y orden de autorización existente del servidor.

F10.25 NO modifica producción.

SIGUIENTE
F10.26 - AudioProxyService / gateway hacia Python.
