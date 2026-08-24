MECA F10.7 - CHARACTERIZATION CRITERIOS DE CUARTILES

OBJETIVO
Congelar el comportamiento actual del CRUD de criterios antes de extraerlo de server.js.

NO MODIFICA PRODUCCIÓN.

ENDPOINTS PROTEGIDOS
- GET    /api/criterios-cuartiles
- GET    /api/criterios-cuartiles/activos
- POST   /api/criterios-cuartiles
- PUT    /api/criterios-cuartiles/:id
- DELETE /api/criterios-cuartiles/:id
- POST   /api/criterios-cuartiles/:id/activar

CONTRATOS PROTEGIDOS
- Token requerido.
- Orden de criterios.
- Vigencia por fechas.
- Campos actuales de creación/actualización.
- fecha_vigencia_hasta nullable.
- activo !== false.
- creado_por legacy = 'admin'.
- DELETE lógico: activo=false.
- Activación: activo=true.
- 404 para IDs inexistentes.
- respuestas success/data actuales.

IMPORTANTE
El valor creado_por='admin' se caracteriza porque forma parte del comportamiento actual.
No implica que deba permanecer para siempre; cualquier corrección será un cambio funcional explícito posterior.

SIGUIENTE
F10.8 - QuartileCriteriaRepository.
