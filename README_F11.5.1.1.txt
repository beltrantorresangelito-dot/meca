MECA F11.5.1.1 - RECONEXIÓN DOMAIN ROUTES

CAUSA DEL 404
F10.54 eliminó correctamente el mini-router routes/registerDomainRoutes
de server.js.

Pero src/modules/domain/domain.routes.js conservó el contrato antiguo:

registerDomainRoutes(routes)

Por ello los endpoints existían en código, pero ya no estaban conectados
al HTTP shell.

CORRECCIÓN
domain.routes.js pasa al patrón moderno:

createDomainHandler()

y server.js compone:

handleDomainRequest

sin reintroducir:
- routes = {}
- registrarRuta()
- registerDomainRoutes
- routes[ruta]

ENDPOINTS RECONECTADOS
GET /api/domain/quiebres
GET /api/domain/campanas
GET /api/domain/matrices
GET /api/domain/campana-matriz
GET /api/domain/contexto-evaluacion
GET /api/domain/consistencia

APLICACIÓN

Copiar:
scripts/f11511-reconectar-domain-routes.js
tests/domain-handler.f11511.test.js
tests/domain-server-reconnect.f11511.test.js

Ejecutar:

node --check scripts\f11511-reconectar-domain-routes.js
node scripts\f11511-reconectar-domain-routes.js

node --check server.js
node --check src\modules\domain\domain.routes.js

node --test tests\domain-handler.f11511.test.js
node --test tests\domain-server-reconnect.f11511.test.js
npm test

REINICIAR NODE DESPUÉS DEL CAMBIO.

PRUEBAS HTTP/CONSOLA

await obtenerCampanasPorQuiebre(1)

También:

fetch('/api/domain/quiebres', {
  headers: {
    Authorization: 'Bearer ' + localStorage.getItem('meca_token')
  }
}).then(r => r.json())

CRITERIO
- /api/domain/campanas deja de devolver 404.
- suite completa = 0 fail.
