MECA F10.34.1 - MATRIX LEGACY TESTS FIX

MOTIVO
F10.34 migró POST /api/matriz/recalcular fuera de server.js.

Dos pruebas históricas todavía exigían este código inline:
- MATRIXSAFE-SERVER-003 recalcular permanece aislado
- VERSERVER-002 recalcular permanece aislado para fase posterior

ESO YA NO REPRESENTA LA ARQUITECTURA CORRECTA.

NUEVO CONTRATO
1. server.js debe contener createMatrixRecalculationHandler.
2. server.js debe contener handleMatrixRecalculationRequest.
3. server.js NO debe volver a contener:
   if (ruta === '/api/matriz/recalcular' && metodo === 'POST')

ARCHIVOS QUE EL SCRIPT MODIFICA
- tests/matrix-safe-closure-server.f213.test.js
- tests/matrix-version-server.f212.test.js

NO MODIFICA PRODUCCIÓN.
NO MODIFICA server.js.
NO MODIFICA Repository / Service / Controller / Routes.

APLICACIÓN
Copiar scripts/fix-f1034-matrix-legacy-tests.js dentro de:
C:\MECA_ML\meca-app\scripts

Desde C:\MECA_ML\meca-app ejecutar:

node scripts\fix-f1034-matrix-legacy-tests.js

Debe mostrar:
OK: MATRIXSAFE-SERVER-003 recalcular permanece aislado
OK: VERSERVER-002 recalcular permanece aislado para fase posterior
F10.34.1 aplicada: solo se actualizaron tests legacy.

Luego ejecutar:

npm test

Resultado esperado:
749 tests
749 pass
0 fail

Después de recuperar 0 fail podemos avanzar con F10.35.
