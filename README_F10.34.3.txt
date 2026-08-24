MECA F10.34.3 - FORCE FIX TESTS LEGACY MATRIX

PROBLEMA
Los dos tests siguen fallando porque dentro de sus bloques permanece:
source

Esto produce:
ReferenceError: source is not defined

ESTA VERSIÓN
- detecta la variable real usada por cada archivo para cargar server.js;
- reemplaza COMPLETAMENTE los dos tests problemáticos;
- vuelve a leer el archivo después de guardarlo;
- falla explícitamente si todavía encuentra la palabra source en el test;
- no toca producción.

ARCHIVOS AFECTADOS
tests/matrix-safe-closure-server.f213.test.js
tests/matrix-version-server.f212.test.js

PASOS
1. Copiar scripts/fix-f1034-matrix-legacy-force.js a:
   C:\MECA_ML\meca-app\scripts

2. Desde C:\MECA_ML\meca-app ejecutar:

   node scripts\fix-f1034-matrix-legacy-force.js

3. NO ejecutar npm test si el comando anterior muestra ERROR.

4. Si muestra:
   F10.34.3 aplicada y verificada correctamente.

   ejecutar:

   npm test

ESPERADO
749 tests
749 pass
0 fail
