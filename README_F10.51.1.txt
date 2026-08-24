MECA F10.51.1 - LEGACY TESTS FIX

OBJETIVO
Actualizar dos pruebas históricas que quedaron desalineadas
después de F10.51. No se modifica código productivo.

CORRECCIÓN 1
tests/audio-proxy.characterization.f1025.test.js

ANTES
Esperaba encontrar:
ruta.startsWith('/css/')
directamente en server.js.

AHORA
Verifica el contrato equivalente:
handleAudioProxyRequest
aparece antes que
handleHttpStaticViewsRequest.

CORRECCIÓN 2
tests/mail-residual.characterization.f1048.test.js

ANTES
Esperaba el comentario:
 // VISTAS HTML

AHORA
Valida que las vistas siguen expuestas mediante:
createHttpStaticViewsHandler
handleHttpStaticViewsRequest

AGREGA
tests/http-static-views.legacy-regression.f10511.test.js

NO CAMBIA
- server.js
- src/
- comportamiento productivo

CRITERIO
npm test completo debe quedar en 0 fail.
