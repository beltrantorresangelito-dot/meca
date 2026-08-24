MECA F10.37.1 - GENERIC QUERY SAFETY CHARACTERIZATION

OBJETIVO
Documentar riesgos silenciosos del comportamiento actual de /api/query
antes de continuar con Service/Controller/Routes.

ESTA FASE NO MODIFICA PRODUCCIÓN.

HALLAZGOS PROTEGIDOS POR TESTS

1. INSERT ARRAY
   El índice de placeholders continúa entre queries.
   Ejemplo actual:
   fila 1 -> $1,$2
   fila 2 -> $3,$4
   pero cada pool.query recibe solo los params de esa fila.

   Riesgo:
   PostgreSQL puede rechazar la segunda query por placeholders sin parámetros.

2. UPSERT ARRAY
   Presenta el mismo patrón acumulativo.

3. UPDATE SIN FILTERS
   SQL actual:
   UPDATE tabla SET ... WHERE 1=1 RETURNING *
   Puede afectar todas las filas.

4. DELETE SIN FILTERS
   SQL actual:
   DELETE FROM tabla WHERE 1=1 RETURNING *
   Puede eliminar todas las filas.

5. isSingle
   Actualmente se recibe pero no transforma la respuesta.

6. isMaybeSingle
   Actualmente se recibe pero no transforma la respuesta.

7. TABLE
   Se sanitiza para reducir riesgo de inyección,
   pero no existe allowlist funcional de tablas.

8. FILTROS UPDATE/DELETE
   Tipos no reconocidos caen actualmente a igualdad.

RECOMENDACIÓN
Antes de F10.38 conviene corregir explícitamente:
- placeholders arrays
- protección contra update/delete global involuntario

isSingle/isMaybeSingle y allowlist pueden tratarse en una fase de hardening
posterior si requieren compatibilidad con frontend.

SIGUIENTE PROPUESTO
F10.37.2 - Generic Query Safety Fixes:
A) reset de placeholders por fila en insert/upsert.
B) rechazar update/delete sin filters con error 400 controlado.

Después:
F10.38 - GenericQueryService.
