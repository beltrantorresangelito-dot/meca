MECA F2.9 - FIX DE CONSOLIDACIÓN MATRIX

Problemas detectados:
1. F2.2 todavía esperaba URLs Matrix inline en server.js.
2. Quedó un GET /api/matriz/versiones anterior al dispatcher F2.9.
3. Ese handler tenía el contrato real más tolerante:
   - tabla ausente -> HTTP 200 + []
   - error DB -> HTTP 200 + []
   - éxito -> HTTP 200 + array

Este fix:
- elimina únicamente el GET duplicado;
- conserva POST /api/matriz/versiones y demás escrituras;
- traslada la tolerancia real a MatrixService;
- actualiza el test F2.2;
- agrega tests de regresión.

Reemplaza:
- server.js
- src/modules/matrix/matrix.repository.js
- src/modules/matrix/matrix.service.js
- tests/backend-domain-server-integration.f22.test.js

Agrega:
- tests/matrix-list-real-contract.f29fix.test.js

No modifica BD ni frontend.

Ejecutar:
npm test
