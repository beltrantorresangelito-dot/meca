MECA F10.34.4 - MATRIX LEGACY DIRECT SERVER FIX

CAUSA REAL
Los dos tests problemáticos no estaban validando server.js.
Después de las correcciones previas, terminaban usando una variable
que contenía matrix.repository.js.

Por eso fallaban buscando:
createMatrixRecalculationHandler

aunque F10.34 estuviera correctamente aplicado en server.js.

SOLUCIÓN DEFINITIVA
Cada uno de los dos tests ahora:
1. carga explícitamente ../server.js;
2. usa una variable local llamada serverActual;
3. valida createMatrixRecalculationHandler;
4. valida handleMatrixRecalculationRequest;
5. valida que el handler inline legacy NO haya regresado.

ARCHIVOS MODIFICADOS
- tests/matrix-safe-closure-server.f213.test.js
- tests/matrix-version-server.f212.test.js

NO MODIFICA PRODUCCIÓN
- no toca server.js;
- no toca Repository;
- no toca Service;
- no toca Controller;
- no toca Routes.

PASOS
Desde C:\MECA_ML\meca-app:

node scripts\fix-f1034-matrix-legacy-direct-server.js

Debe mostrar:
OK: MATRIXSAFE-SERVER-003 recalcular permanece aislado
    lectura directa confirmada: ../server.js
OK: VERSERVER-002 recalcular permanece aislado para fase posterior
    lectura directa confirmada: ../server.js
F10.34.4 aplicada correctamente.

Luego:
npm test

ESPERADO
749 tests
749 pass
0 fail
