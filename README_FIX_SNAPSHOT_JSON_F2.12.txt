MECA F2.12 - FIX SNAPSHOT REGLAS JSON

Síntoma:
POST /api/matriz/versiones/congelar
HTTP 500
"sintaxis de entrada no válida para tipo json"

Causa:
submotivos_afectados y excepciones se leen desde PostgreSQL como arrays
JavaScript. node-postgres serializa un Array como array PostgreSQL:

  {"A","B"}

pero una columna JSON/JSONB espera JSON:

  ["A","B"]

Solución:
Antes de insertar la regla duplicada:

  JSON.stringify(rule.submotivos_afectados)
  JSON.stringify(rule.excepciones)

Los valores null se preservan como null.

Reemplaza únicamente:
- src/modules/matrix/matrix.repository.js

Agrega:
- tests/matrix-snapshot-json.f212fix.test.js

No modifica:
- server.js
- matrix.service.js
- matrix.controller.js
- matrix.routes.js
- BD
- frontend
- versión activa

Pasos:
1. copiar archivos
2. npm test
3. reiniciar MECA
4. intentar nuevamente crear el snapshot v2.1.0
