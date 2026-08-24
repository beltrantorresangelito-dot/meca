MECA F10.56.3 - DOMAIN TEST HARD FIX

PROBLEMA
DOMAPI-SERVER-001 sigue fallando con:
ReferenceError: source is not defined

DIAGNÓSTICO
El bloque que está ejecutando Node todavía contiene "source".
Por eso esta fase deja de intentar detectar variables y fuerza
el contrato correcto usando "server".

APLICACIÓN

1. Copiar a scripts:
   f10563-hard-fix-domain-test.js
   f10563-verify-domain-test.js

2. Copiar a tests:
   domain-server-legacy-regression.f10563.test.js

3. Desde la raíz del proyecto ejecutar:

   node scripts\f10563-hard-fix-domain-test.js

   Debe mostrar:
   DOMAPI-SERVER-001 corregido definitivamente usando "server".
   Verificación OK: no queda "source" dentro del test.

4. Verificar visualmente el bloque real:

   node scripts\f10563-verify-domain-test.js

5. Ejecutar:

   node --test tests\backend-domain-server-integration.f22.test.js
   node --test tests\domain-server-legacy-regression.f10563.test.js
   npm test

NO MODIFICA PRODUCCIÓN.
Solo modifica:
tests/backend-domain-server-integration.f22.test.js
