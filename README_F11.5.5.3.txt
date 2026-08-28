MECA F11.5.5.3 - RESOLUCIÓN DE CAMPANA_ID EN GUARDADO

SÍNTOMA
Al guardar una evaluación real:

No se puede guardar la evaluación sin campana_id

CAUSA
El objeto evaluacion construido por finalizarAuditoria no trae
campana_id de forma explícita.

Sin embargo, Auditor ya conserva la campaña de la escucha en el
campo oculto evalCampanaId.

CORRECCIÓN
enriquecerEvaluacionConContexto() ahora busca campana_id en:

1. evaluacion.campana_id
2. evaluacion.campanaId
3. escucha.campana_id
4. escucha.campanaId
5. contextoAuditoriaActual.campana_id
6. contextoAuditoriaActual.campanaId
7. #evalCampanaId
8. #campanaId

Luego normaliza el ID y, si todavía no existe contexto, ejecuta:

aplicarContextoAuditoria(campanaIdNormalizado, fecha)

Esto obtiene matriz_id y version_matriz_id antes del guardado.

APLICACIÓN

node --check scripts\f11553-fix-campana-id-guardado.js
node scripts\f11553-fix-campana-id-guardado.js

node --test tests\evaluation-campaign-resolution.f11553.test.js
npm test

PRUEBA FUNCIONAL

Antes de guardar, en consola:

document.getElementById('evalCampanaId')?.value

Debe devolver:
"1"

Luego guardar normalmente.

Si aparece un error diferente, compartirlo completo.
