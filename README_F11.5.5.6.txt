MECA F11.5.5.6 - NORMALIZACIÓN DE FECHA PARA CONTEXTO

PROBLEMA
La evaluación necesita conservar fecha + hora + minutos + segundos.

Pero /api/domain/contexto-evaluacion usa una fecha calendario para
determinar qué versión de matriz era vigente:

YYYY-MM-DD

La fecha completa estaba llegando al endpoint de contexto y éste
respondía:

fecha debe tener formato YYYY-MM-DD

SOLUCIÓN
NO se trunca evaluacion.fecha ni timestamp ni fechaRegistro.

Solo se crea:

fechaContexto = normalizarFechaParaContexto(fecha)

y el endpoint recibe:

fecha=YYYY-MM-DD

EJEMPLOS

2026-08-24T18:35:42
 -> contexto: 2026-08-24
 -> evaluación: permanece 2026-08-24T18:35:42

2026-08-24 18:35:42
 -> contexto: 2026-08-24
 -> evaluación: permanece completa

24/08/2026 18:35:42
 -> contexto: 2026-08-24
 -> evaluación: permanece completa

APLICACIÓN

node --check scripts\f11556-normalizar-fecha-contexto.js
node scripts\f11556-normalizar-fecha-contexto.js

node --test tests\context-date-normalization.f11556.test.js
npm test

PRUEBA MANUAL EN AUDITOR

window.normalizarFechaParaContexto(
  '2026-08-24T18:35:42'
)

Debe devolver:

'2026-08-24'

Luego guardar una evaluación normalmente.

Después validar PostgreSQL:
SELECT
    id,
    timestamp,
    fecha,
    fecha_registro,
    campana_id,
    matriz_id,
    version_matriz_id
FROM evaluaciones
ORDER BY id DESC
LIMIT 5;

La evaluación debe conservar sus campos temporales completos según
el contrato existente, mientras contexto usa solo YYYY-MM-DD.
