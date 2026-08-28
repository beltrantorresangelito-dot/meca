MECA F11.5.5.1 - INTEGRACIÓN DEL CONTEXTO EN EL GUARDADO REAL

OBJETIVO
Conectar el enriquecimiento de contexto al payload real que Auditor
envía al backend.

FLUJO

payload evaluación
  -> enriquecerEvaluacionConContexto()
  -> validarContextoPersistenciaEvaluacion()
  -> JSON.stringify(payloadConContexto)
  -> POST/UPDATE
  -> PostgreSQL

GARANTIZA
- campana_id
- matriz_id
- version_matriz_id
- versionMatrizId compatible con backend histórico

APLICACIÓN

Copiar:
scripts/f11551-integrar-contexto-guardado-real.js
tests/evaluation-real-save-context.f11551.test.js

Ejecutar:

node --check scripts\f11551-integrar-contexto-guardado-real.js
node scripts\f11551-integrar-contexto-guardado-real.js

node --test tests\evaluation-real-save-context.f11551.test.js
npm test

VALIDACIÓN FUNCIONAL
1. Abrir Auditor.
2. Cargar una escucha real de campaña 1.
3. Completar una evaluación de prueba.
4. Guardarla normalmente.
5. Verificar en BD:

SELECT
  id,
  campana_id,
  matriz_id,
  version_matriz_id
FROM evaluaciones
ORDER BY fecha_registro DESC
LIMIT 5;

ESPERADO PARA EL CONTEXTO VALIDADO
campana_id = 1
matriz_id = 1
version_matriz_id = 7

IMPORTANTE
Si la tabla evaluaciones todavía no tiene matriz_id, el INSERT puede
fallar. En ese caso no improvisar: compartir el error y haremos
F11.5.5.2 con migración/ajuste backend controlado.
