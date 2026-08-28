MECA F11.5.5.4 - CAMPANA DESDE ASIGNACION REAL

HALLAZGO
#evalCampanaId no existe en el DOM.

Auditor ya usa /api/escuchas/asignaciones y relaciona escuchas
mediante ticket PSI.

SOLUCIÓN
Si evaluacion/contexto no traen campana_id:

ticketPSI
 -> GET /api/escuchas/asignaciones
 -> localizar escucha por ticket
 -> escucha.campana_id
 -> resolver contexto
 -> matriz/version
 -> guardar evaluación

NO DEPENDE DE UN HIDDEN INPUT.

APLICACIÓN

node --check scripts\f11554-campana-desde-asignacion.js
node scripts\f11554-campana-desde-asignacion.js

node --test tests\evaluation-campaign-from-assignment.f11554.test.js
npm test

PRUEBA FUNCIONAL EN AUDITOR

Después de recargar:

await window.resolverCampanaDesdeAsignacion(
  '<TICKET_PSI_DE_LA_ESCUCHA>'
)

Debe devolver algo como:

{
  campana_id: 1,
  escucha: { ... }
}

Después guardar una evaluación normalmente.

Si guarda, validar PostgreSQL:

SELECT
  id,
  campana_id,
  matriz_id,
  version_matriz_id
FROM evaluaciones
ORDER BY fecha_registro DESC
LIMIT 5;
