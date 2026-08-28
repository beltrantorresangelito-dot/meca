MECA F11.5.1.2 - DOMAIN ROUTES COMPATIBILITY ADAPTER

PROBLEMA

Después de F11.5.1.1:
1016 tests
1009 pass
7 fail

Todos fallaban porque los tests históricos importan:

registerDomainRoutes

F11.5.1.1 reemplazó ese export por createDomainHandler.

DECISIÓN ARQUITECTÓNICA

NO volver a usar registerDomainRoutes en server.js.

En cambio:
domain.routes.js expone ambos contratos:

createDomainHandler
  -> PRODUCCIÓN / arquitectura actual

registerDomainRoutes
  -> ADAPTADOR DE COMPATIBILIDAD para tests y consumidores legacy

Esto conserva los contratos antiguos sin reintroducir:
- routes = {} en server.js
- registrarRuta()
- routes[ruta]
- mini-router legacy

APLICACIÓN

Copiar:
scripts/f11512-domain-routes-compat.js
tests/domain-routes-compat.f11512.test.js

Ejecutar:

node --check scripts\f11512-domain-routes-compat.js
node scripts\f11512-domain-routes-compat.js

node --check src\modules\domain\domain.routes.js
node --check server.js

node --test tests\backend-domain-endpoints.f22.test.js
node --test tests\backend-domain-module.smoke.f21.test.js
node --test tests\domain-routes-compat.f11512.test.js

npm test

DESPUÉS
Reiniciar Node y probar:

await obtenerCampanasPorQuiebre(1)

CRITERIO
- tests legacy Domain vuelven a pasar;
- server.js sigue sin registerDomainRoutes;
- /api/domain/campanas deja de devolver 404.
