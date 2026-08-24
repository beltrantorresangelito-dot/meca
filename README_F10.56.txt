MECA F10.56 - SERVER SHELL CLEANUP

OBJETIVO
Limpiar el composition root sin cambiar comportamiento.

ELIMINADO
- require('fs')
- require('path')
- import registerDomainRoutes
- comentarios legacy vacíos/redundantes

NO CAMBIA
- CORS
- OPTIONS
- URL parsing
- Bearer verification
- authorization
- orden de handlers
- fallback 404
- listen/bootstrap

server.js: 436 -> 358
reducción: 78

CRITERIO
npm test completo debe quedar en 0 fail.

SIGUIENTE
Evaluar si extraer RequestPipeline aporta valor real o si server.js
ya debe considerarse un composition root sano.
