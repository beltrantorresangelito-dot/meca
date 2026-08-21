MECA F1.4-B - AUTORIZACION

Este paquete se aplica SOBRE un proyecto que ya tenga F1.4-A funcionando.

Copiar/reemplazar:
  server.js
  security/authorization.js
  tests/authorization.f14b.test.js
  F1.4B_AUTHORIZATION.md

No modifica .env, PostgreSQL ni archivos frontend.

Después ejecutar:
  npm test

Luego validar manualmente Supervisor y Auditor según F1.4B_AUTHORIZATION.md.
