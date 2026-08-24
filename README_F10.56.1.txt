MECA F10.56.1 - DOMAIN LEGACY TEST FIX

PROBLEMA
npm test completo:
948 tests
947 pass
1 fail

Falla:
DOMAPI-SERVER-001

CAUSA
El test histórico todavía exige registerDomainRoutes en server.js.
Ese mecanismo fue eliminado correctamente en F10.54 después de
confirmar que el mini-router ya no tenía rutas activas.

IMPORTANTE
NO volver a agregar registerDomainRoutes a server.js.

COMO APLICAR

1. Copiar:
   scripts/f10561-fix-domain-legacy-test.js
   a la carpeta scripts del proyecto.

2. Copiar:
   tests/domain-server-legacy-regression.f10561.test.js
   a tests.

3. Desde C:\MECA_ML\meca-app ejecutar:

   node scripts/f10561-fix-domain-legacy-test.js

4. Ejecutar:

   node --test tests/backend-domain-server-integration.f22.test.js
   node --test tests/domain-server-legacy-regression.f10561.test.js
   npm test

EL SCRIPT SOLO MODIFICA:
tests/backend-domain-server-integration.f22.test.js

NO MODIFICA:
server.js
src/
BD
configuración
seguridad

NUEVO CONTRATO
DOMAPI-SERVER-001 verifica que:
- registerDomainRoutes NO exista;
- routes legacy NO exista;
- handlers modulares permanezcan.
