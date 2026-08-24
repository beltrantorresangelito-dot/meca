MECA F10.56.2 - DOMAIN TEST VARIABLE FIX

PROBLEMA
DOMAPI-SERVER-001 fallaba con:
ReferenceError: source is not defined

CAUSA
El archivo histórico backend-domain-server-integration.f22.test.js
usa una variable distinta para cargar server.js (normalmente "server"),
pero F10.56.1 insertó el nuevo test usando "source".

CORRECCIÓN
El nuevo script detecta automáticamente si el archivo usa:
- server
- source

y reconstruye solamente DOMAPI-SERVER-001 usando la variable correcta.

NO MODIFICA PRODUCCIÓN.
No toca:
- server.js
- src/
- base de datos
- configuración

PASOS
1. Copiar scripts/f10562-fix-domain-test-variable.js a scripts/
2. Copiar tests/domain-server-legacy-regression.f10562.test.js a tests/
3. Ejecutar:
   node scripts/f10562-fix-domain-test-variable.js
4. Ejecutar:
   node --test tests\backend-domain-server-integration.f22.test.js
   node --test tests\domain-server-legacy-regression.f10562.test.js
   npm test

CRITERIO
0 fail.
