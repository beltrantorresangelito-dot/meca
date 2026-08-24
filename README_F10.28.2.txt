MECA F10.28.2 - AUDIO PROXY BOOTSTRAP FIX

OBJETIVO
Evitar que handleAudioProxyRequest se cree antes de que exista PYTHON_API_URL.

PROBLEMA DETECTADO
Después de F10.28, server.js creaba:
  createAudioProxyHandler({ baseUrl: PYTHON_API_URL, ... })

pero PYTHON_API_URL permanecía declarado más abajo.

Eso podía provocar ReferenceError al cargar server.js.

CORRECCIÓN
- PYTHON_API_URL se declara una sola vez.
- Se mueve antes de crear handleAudioProxyRequest.
- Se mantienen exactamente los fallbacks actuales:
  producción: http://10.4.240.68:5001
  desarrollo: http://localhost:5001
- process.env.PYTHON_API_URL sigue teniendo prioridad.

NO CAMBIA
- endpoints
- contratos HTTP
- AudioProxyService
- AudioProxyController
- AudioProxyRoutes
- autorización

AGREGA
- tests/audio-proxy.bootstrap.f10282.test.js

REEMPLAZA
- server.js

EJECUTAR
npm test

ESPERADO
0 fail.

SIGUIENTE
F10.29 - cleanup y validación funcional final Audio Proxy.
