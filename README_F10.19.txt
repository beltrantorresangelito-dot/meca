MECA F10.19 - CHARACTERIZATION ESTADO DE BASE DE DATOS

OBJETIVO
Congelar el comportamiento actual de Estado BD antes de extraerlo de server.js.

ENDPOINTS PROTEGIDOS
- GET /api/estado-bd
- GET /api/estado-bd/tablas

SE PROTEGE
- Token requerido.
- tamaño total de la base con pg_database_size.
- tamaños total/tabla/índices por tabla.
- tablas del esquema public.
- conteo exacto COUNT(*) por tabla.
- formatos MB / GB / KB actuales.
- totalRows y totalTables.
- fila degradada en caso de error individual de una tabla.
- endpoint simple /tablas.
- contrato legacy de error /tablas: HTTP 500 + [].

IMPORTANTE
El COUNT(*) por cada tabla se caracteriza porque es el comportamiento actual.
Más adelante podremos optimizarlo si el costo en bases grandes lo justifica,
pero sería un cambio funcional/performance explícito y medido.

F10.19 NO modifica producción.

SIGUIENTE
F10.20 - DatabaseStatusRepository.
