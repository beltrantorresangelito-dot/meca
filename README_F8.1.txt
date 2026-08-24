MECA F8.1 - CHARACTERIZATION TESTS SESSIONS + LOGIN HISTORY

NO MODIFICA PRODUCCIÓN.

AGREGAR:
- tests/sessions.characterization.f81.test.js

COBERTURA:
- POST /api/sesiones/crear
- GET /api/sesiones/usuarios/:id
- POST /api/sesiones/cerrar
- POST /api/sesiones/usuarios/:id/cerrar-todas
- POST /api/historial-login

CONTRATOS CONGELADOS:
- UPSERT de sesión por usuario_id.
- Filtro ?activas=true.
- Token requerido donde actualmente aplica.
- Orden fecha_inicio DESC.
- Cierre de sesión específica.
- Cierre masivo por usuario.
- Historial de login tolerante a fallos.

BUG CONOCIDO DOCUMENTADO:
POST /api/sesiones/cerrar crea `result`, pero luego responde usando
la variable `eliminados`, que no está declarada.

F8.1 NO corrige todavía ese bug.
La siguiente microfase debe corregirlo antes de extraer SessionsRepository.

EJECUTAR:
npm test

ESPERADO:
0 fail.
