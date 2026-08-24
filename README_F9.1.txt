MECA F9.1 - CHARACTERIZATION TESTS SOLICITUDES / REQUERIMIENTOS

NO MODIFICA PRODUCCIÓN.

AGREGAR:
- tests/requests.characterization.f91.test.js

ENDPOINTS CONGELADOS:
- GET  /api/solicitudes/usuario/:id
- GET  /api/solicitudes
- POST /api/solicitudes
- GET  /api/solicitudes/:id
- PUT  /api/solicitudes/:id

CONTRATOS:
- Orden created_at DESC.
- POST devuelve 201 + solicitud.
- GET por ID devuelve 404 si no existe.
- GET por ID y PUT mantienen Token requerido local.
- PUT conserva campos opcionales actuales y 404 por rowCount=0.
- Se congela temporalmente la inserción dinámica legacy del POST.

IMPORTANTE:
La inserción dinámica del POST usa Object.keys/Object.values para construir
los nombres de columnas. En F9.1 solo se caracteriza; no se cambia todavía.
Si se endurece más adelante, debe hacerse como cambio explícito y probado.

PROTECCIÓN:
- F7 Evaluations debe permanecer modularizado.
- F8 Sessions debe permanecer modularizado.

EJECUTAR:
npm test

ESPERADO:
0 fail.

SIGUIENTE:
F9.2 - RequestsRepository.
