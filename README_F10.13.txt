MECA F10.13 - CHARACTERIZATION VERSIONES DEL SISTEMA

OBJETIVO
Congelar el comportamiento real del bloque /api/versiones antes de extraerlo de server.js.

ACLARACIÓN
Este bloque NO maneja versiones de matriz.
Maneja la tabla versiones_sistema y publica/versiona contenido del sistema por tipo.

ENDPOINTS PROTEGIDOS
- GET    /api/versiones
- POST   /api/versiones
- PUT    /api/versiones/:id/activar
- DELETE /api/versiones/:id

CONTRATOS PROTEGIDOS
- Token requerido.
- filtro opcional ?tipo=.
- tipo='todos' devuelve todas.
- orden por fecha_publicacion DESC.
- publicación con version, tipo, descripcion, publicado_por,
  contenido_html y nombre_archivo.
- tamano_bytes = contenido_html.length.
- nuevas versiones nacen es_activo=false.
- activación exclusiva por tipo.
- 404 para IDs inexistentes.
- DELETE físico actual.
- contratos de respuesta actuales.

F10.13 NO modifica producción.

SIGUIENTE
F10.14 - VersionsRepository.
