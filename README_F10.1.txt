MECA F10.1 - PDA CHARACTERIZATION

Objetivo: congelar el comportamiento actual de PDA antes de extraerlo de server.js.

Se protegen:
- GET /api/pda/pendientes
- GET /api/pda/seguimiento
- GET /api/pda/historial
- GET /api/pda/:id
- GET /api/pda/exportar
- Token requerido
- estados legacy
- historial LIMIT 50
- tolerancia a tabla pda_cabecera inexistente
- acciones + cálculo de progreso
- agregación de exportación

F10.1 no modifica server.js ni comportamiento productivo.

Se eligió PDA antes de /api/query porque es un dominio delimitado y de menor riesgo transversal.

Siguiente: F10.2 - PdaRepository.
