MECA F10.36 - CHARACTERIZATION GENERIC QUERY

OBJETIVO
Congelar el comportamiento actual de:
POST /api/query

ANTES de extraer sus ~341 líneas fuera de server.js.

ESTA FASE NO MODIFICA PRODUCCIÓN.

OPERACIONES PROTEGIDAS
- select
- insert
- update
- delete
- upsert

SELECT
- sanitización de table y columnas
- selectFields / wildcard
- filtros eq, neq, gt, gte, lt, lte
- like, ilike, in, is, not, contains
- ORDER BY ASC/DESC
- LIMIT
- head + count
- data + rowCount

INSERT
- data obligatorio
- objeto o array
- columnas sanitizadas
- RETURNING *

UPDATE
- data obligatorio
- filtros eq, neq, in
- fallback actual de otros filtros a igualdad
- RETURNING *

DELETE
- filtros eq, neq, in
- fallback actual
- RETURNING *

UPSERT
- data obligatorio
- objeto o array
- INSERT inicial
- fallback UPDATE solo ante PostgreSQL 23505
- usa filters como WHERE
- respuesta data:[] + count de entrada

ERRORES
- table obligatorio
- operación desconocida -> 400
- error general -> 500 con:
  error, code, details, hint

RIESGO / NOTA
/api/query es una capa genérica y transversal de acceso a datos.
F10.36 solo congela el comportamiento existente.
No se amplían permisos, operaciones ni capacidades.

SIGUIENTE
F10.37 - GenericQueryRepository / SQL builder encapsulado.
