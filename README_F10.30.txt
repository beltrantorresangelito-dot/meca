MECA F10.30 - CHARACTERIZATION MATRIX RECALCULATION

OBJETIVO
Congelar el comportamiento actual de POST /api/matriz/recalcular
antes de extraerlo de server.js.

ESTA FASE NO MODIFICA PRODUCCIÓN.

SE PROTEGE
- Token requerido.
- lectura de detalles_evaluacion con submotivo.
- búsqueda de peso_individual en sub_motivos activos.
- actualización individual del peso.
- tolerancia a error por detalle.
- listado de evaluaciones distintas.
- recálculo actual de ENC / ECUF / ECN / nota_final.
- actualización de evaluaciones.
- tolerancia a error por evaluación.
- resumen COUNT / AVG / MIN / MAX.
- contrato final de respuesta.
- error general status || 500.

NOTA TÉCNICA
El proceso actual ejecuta consultas dentro de bucles y puede ser costoso
para grandes volúmenes. En esta fase NO se optimiza: primero se preserva
exactamente el comportamiento. Cualquier optimización posterior se medirá
como cambio explícito.

SIGUIENTE
F10.31 - MatrixRecalculationRepository.
