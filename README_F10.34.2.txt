MECA F10.34.2 - MATRIX LEGACY TEST VARIABLE FIX

PROBLEMA
F10.34.1 actualizó correctamente el contrato esperado de dos tests legacy,
pero asumió que ambos archivos llamaban "source" a la variable que contiene server.js.

En el proyecto real esa variable tiene otro nombre, provocando:
ReferenceError: source is not defined

ESTA CORRECCIÓN
- detecta automáticamente la variable real que contiene server.js;
- reemplaza solo los dos tests legacy;
- mantiene el contrato modular correcto de F10.34.

ARCHIVOS QUE MODIFICA
- tests/matrix-safe-closure-server.f213.test.js
- tests/matrix-version-server.f212.test.js

NO MODIFICA
- server.js
- Repository
- Service
- Controller
- Routes
- lógica de producción

APLICACIÓN
Copiar:
scripts/fix-f1034-matrix-legacy-variable.js

a:
C:\MECA_ML\meca-app\scripts

Luego ejecutar desde C:\MECA_ML\meca-app:

node scripts\fix-f1034-matrix-legacy-variable.js
npm test

ESPERADO
749 tests
749 pass
0 fail
