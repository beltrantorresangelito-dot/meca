MECA F11.5.5.2 - FIX EXACTO DEL GUARDADO REAL

HALLAZGO
El flujo real de Auditor es:

const evaluacion = { ... }
await API.guardarEvaluacion(evaluacion)

Por eso F11.5.5.1 falló: buscaba JSON.stringify/fetch directamente
dentro de auditor.js, pero la serialización pertenece al wrapper API.

CORRECCIÓN REAL

const evaluacionConContexto =
  await enriquecerEvaluacionConContexto(evaluacion);

validarContextoPersistenciaEvaluacion(evaluacionConContexto);

await API.guardarEvaluacion(evaluacionConContexto);

NO SE MODIFICA
- wrapper API
- endpoint backend
- serialización interna del API
- lógica de cálculo

APLICACIÓN

Copiar:
scripts/f11552-fix-guardado-real-exacto.js
scripts/f11552-alinear-test-f11551.js
tests/evaluation-real-save-context.f11552.test.js

Ejecutar:

node --check scripts\f11552-fix-guardado-real-exacto.js
node scripts\f11552-fix-guardado-real-exacto.js

node scripts\f11552-alinear-test-f11551.js

node --test tests\evaluation-real-save-context.f11551.test.js
node --test tests\evaluation-real-save-context.f11552.test.js
npm test

DESPUÉS DE 0 FAIL

Hacer una evaluación real de prueba y consultar:

SELECT
  id,
  campana_id,
  matriz_id,
  version_matriz_id
FROM evaluaciones
ORDER BY fecha_registro DESC
LIMIT 5;

Si matriz_id no existe físicamente, compartir el error.
En ese caso la siguiente fase será migración backend/BD controlada.
