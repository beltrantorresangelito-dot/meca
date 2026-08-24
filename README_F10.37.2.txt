MECA F10.37.2 - GENERIC QUERY SAFETY FIXES

OBJETIVO
Corregir dos riesgos demostrados en F10.37.1.

CORRECCIÓN A
INSERT / UPSERT CON ARRAYS

ANTES
fila 1 -> VALUES ($1,$2)
fila 2 -> VALUES ($3,$4)
pero la segunda query recibía solo 2 params.

AHORA
cada query reinicia su índice:
fila 1 -> VALUES ($1,$2)
fila 2 -> VALUES ($1,$2)

CORRECCIÓN B
UPDATE / DELETE SIN FILTROS

ANTES
UPDATE ... WHERE 1=1
DELETE ... WHERE 1=1

AHORA
Repository lanza error status 400:
- UPDATE requiere al menos un filtro
- DELETE requiere al menos un filtro

IMPORTANTE
En F10.37.2 server.js todavía mantiene su catch general de /api/query
y actualmente convierte cualquier error del Repository a HTTP 500.

Por eso:
- la protección de datos ya existe;
- el contrato HTTP 400 será trasladado correctamente cuando saquemos
  HTTP a Service/Controller en F10.38/F10.39.

NO SE CAMBIA TODAVÍA
- isSingle
- isMaybeSingle
- allowlist de tablas
- fallback de filtros mutation desconocidos a igualdad

ARCHIVOS
REEMPLAZA:
- src/modules/generic-query/generic-query.repository.js
- tests/generic-query.safety-characterization.f10371.test.js
- tests/generic-query.repository.f1037.test.js

AGREGA:
- tests/generic-query.safety-fix.f10372.test.js

SIGUIENTE
F10.38 - GenericQueryService.
