MECA F11.5.2 - CAMPAÑA -> CONTEXTO DE EVALUACIÓN

OBJETIVO
Resolver matriz y versión vigente a partir de:
- campanaId
- fecha opcional

ENDPOINT

GET /api/domain/contexto-evaluacion?campanaId=<ID>&fecha=<YYYY-MM-DD>

IMPORTANTE
Se respeta el contrato camelCase del DomainController.

NUEVOS HELPERS

resolverContextoEvaluacion(campanaId, fecha)

resolverContextoEvaluacionActual(campanaId, fecha)

El segundo además mantiene:

window.contextoEvaluacionActual
window.matrizActualId
window.versionMatrizActualId

APLICACIÓN

Copiar:
scripts/f1152-campana-contexto.js
tests/campana-contexto.f1152.test.js

Ejecutar:

node --check scripts\f1152-campana-contexto.js
node scripts\f1152-campana-contexto.js

node --test tests\campana-contexto.f1152.test.js
npm test

PRUEBA EN SUPERVISOR

const ctx = await resolverContextoEvaluacionActual(1)
ctx

También probar con fecha:

await resolverContextoEvaluacionActual(
    1,
    '2026-08-24'
)

RESULTADO ESPERADO

Un objeto de contexto que incluya, según el contrato actual:
- campaña
- quiebre
- matriz
- versión vigente

y que actualice:

window.matrizActualId
window.versionMatrizActualId

SIGUIENTE
F11.5.3 conectará este contexto con la carga efectiva de matriz.
