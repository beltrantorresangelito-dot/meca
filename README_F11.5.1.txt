MECA F11.5.1 - QUIEBRE -> CAMPAÑAS

OBJETIVO
Agregar una vía oficial para obtener campañas filtradas por quiebre.

CAMBIO
Supervisor agrega:

obtenerCampanasPorQuiebre(quiebreId)

y:

cargarCampanasPorQuiebreEnSelect(quiebreId, selectId, options)

FUENTE DE VERDAD

GET /api/domain/campanas?quiebre_id=<ID>

NO SE ELIMINA TODAVÍA
obtenerCampanas()

Se conserva por compatibilidad porque existen flujos legacy que aún
pueden consumir todas las campañas. Las fases posteriores migrarán
esos consumidores gradualmente.

APLICACIÓN

Copiar:
scripts/f1151-quiebre-campanas.js
tests/quiebre-campanas.f1151.test.js

Ejecutar:

node --check scripts\f1151-quiebre-campanas.js
node scripts\f1151-quiebre-campanas.js
node --test tests\quiebre-campanas.f1151.test.js
npm test

VALIDACIÓN EN CONSOLA DEL NAVEGADOR

Con sesión Supervisor iniciada:

await obtenerCampanasPorQuiebre(1)

Debe devolver únicamente campañas del quiebre 1.

Luego probar un select real o temporal:

await cargarCampanasPorQuiebreEnSelect(
    1,
    'filtroCampanaEscuchas',
    { incluirTodos: true }
)

IMPORTANTE
F11.5.1 todavía no cambia automáticamente todos los selects.
Primero introduce y protege la vía parametrizada.

SIGUIENTE
F11.5.2 conectará Campaña -> contexto de evaluación.
