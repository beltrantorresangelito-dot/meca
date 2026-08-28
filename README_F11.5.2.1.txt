MECA F11.5.2.1 - COMPLETAR INTEGRACIÓN DE CONTEXTO

PROBLEMA
La suite mostró que F11.5.2 quedó aplicada parcialmente.

Fallos observados:
- no se encuentra window.contextoEvaluacionActual;
- no se encuentra window.matrizActualId;
- no se encuentra window.resolverContextoEvaluacion.

SOLUCIÓN
Script idempotente:
- agrega resolverContextoEvaluacion si falta;
- agrega resolverContextoEvaluacionActual si falta;
- agrega exposiciones window si faltan;
- no duplica funciones ya existentes;
- valida contexto, matriz y versión;
- conserva contrato campanaId.

APLICACIÓN

Copiar:
scripts/f11521-completar-contexto.js
tests/campana-contexto-completion.f11521.test.js

Ejecutar:

node --check scripts\f11521-completar-contexto.js
node scripts\f11521-completar-contexto.js

node --test tests\campana-contexto.f1152.test.js
node --test tests\campana-contexto-completion.f11521.test.js
npm test

NO avanzar si npm test no queda en 0 fail.

DESPUÉS DE 0 FAIL
Recargar Supervisor y probar:

const ctx = await resolverContextoEvaluacionActual(1)
ctx

console.log(window.contextoEvaluacionActual)
console.log(window.matrizActualId)
console.log(window.versionMatrizActualId)
