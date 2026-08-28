MECA F11.5.5.4A - FIX DEL PATCH DE CAMPAÑA POR ASIGNACIÓN

CAUSA
El script F11.5.5.4 se abortaba por este guardrail incorrecto:

/item?.campana_id/

El código real correcto obtiene la campaña desde:

escucha.campana_id

Al abortarse antes del writeFileSync, auditor.js quedaba sin modificar.

CORRECCIÓN
- guardrail corregido;
- reemplazo completo del enriquecedor;
- elimina dependencia de #evalCampanaId;
- intenta primero misEscuchasData;
- usa /api/escuchas/asignaciones como fallback;
- localiza la escucha por ticket PSI;
- obtiene escucha.campana_id;
- resuelve contexto;
- guarda payload enriquecido.

APLICACIÓN

node --check scripts\f11554a-fix-patch-campana-asignacion.js
node scripts\f11554a-fix-patch-campana-asignacion.js

node --test tests\evaluation-campaign-from-assignment.f11554.test.js
node --test tests\evaluation-campaign-from-assignment.f11554a.test.js

npm test

PRUEBA FUNCIONAL
Después de recargar Auditor:

typeof window.resolverCampanaDesdeAsignacion

Debe devolver:
"function"

Luego:

await window.resolverCampanaDesdeAsignacion('TICKET_REAL')

Debe devolver:
{
  campana_id: 1,
  escucha: {...}
}

Después guardar la evaluación normalmente.
