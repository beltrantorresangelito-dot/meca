MECA F11.5.5 - PERSISTENCIA DEL CONTEXTO EN LA EVALUACIÓN

OBJETIVO
Garantizar que cada evaluación conserve el contexto exacto usado al auditar.

SE PERSISTE
- campana_id
- matriz_id
- version_matriz_id

COMPATIBILIDAD
El payload conserva también:

versionMatrizId

porque el backend histórico ya utiliza ese nombre para insertar
version_matriz_id.

NUEVOS HELPERS

enriquecerEvaluacionConContexto(evaluacion, escucha)

validarContextoPersistenciaEvaluacion(evaluacion)

APLICACIÓN

Copiar:
scripts/f1155-persistir-contexto-evaluacion.js
tests/evaluation-context-persistence.f1155.test.js

Ejecutar:

node --check scripts\f1155-persistir-contexto-evaluacion.js
node scripts\f1155-persistir-contexto-evaluacion.js

node --test tests\evaluation-context-persistence.f1155.test.js
npm test

PRUEBA FUNCIONAL EN AUDITOR

const evalBase = {
  id: 'TEST-CONTEXTO',
  campana_id: 1,
  fecha: '2026-08-24'
};

const evalConContexto =
    await enriquecerEvaluacionConContexto(evalBase);

evalConContexto

Luego:

validarContextoPersistenciaEvaluacion(evalConContexto)

ESPERADO

{
  ok: true,
  campana_id: 1,
  matriz_id: 1,
  version_matriz_id: 7
}

IMPORTANTE
Esta fase prepara y protege el payload.
No crea todavía una evaluación real de prueba en BD.

SIGUIENTE
F11.5.5.1 revisará el punto exacto de guardado para insertar el
enriquecimiento inmediatamente antes del POST/UPDATE real.
