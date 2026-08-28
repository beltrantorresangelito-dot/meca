MECA F11.3.1 - CORRECCIÓN ROBUSTA DESACOPLE MULTI-QUIEBRE

PROBLEMA
F11.3 fue demasiado dependiente del formato exacto del código real.
En la ejecución del proyecto siguieron apareciendo:
- Auditoría Calidad Cobranzas
- ausencia de Movistar Perú - Auditoría de Calidad
- ausencia de placeholder Ej: CAMP01

SOLUCIÓN
El nuevo parche:
- usa patrones tolerantes;
- reemplaza branding globalmente;
- elimina el bloque T/ST/F por estructura;
- neutraliza placeholders;
- verifica todo antes de escribir;
- aborta si queda cualquier residual;
- no toca auditor.js.

COPIAR
scripts/f1131-desacoplar-multiquiebre-robusto.js
scripts/f1131-verificar-desacople.js
tests/multiquiebre-functional-decoupling.f1131.test.js

EJECUTAR

node --check scripts\f1131-desacoplar-multiquiebre-robusto.js
node scripts\f1131-desacoplar-multiquiebre-robusto.js
node scripts\f1131-verificar-desacople.js
node --test tests\multiquiebre-functional-decoupling.f1131.test.js
npm test

CRITERIO
- verificador sin FAIL;
- test F11.3.1 en 0 fail;
- npm test completo en 0 fail.

VALIDACIÓN FUNCIONAL
Supervisor:
- campañas no se crean automáticamente;
- placeholders genéricos;
- reportes/documentos sin Calidad Cobranzas.

Auditor:
- cuartiles siguen 97/90/85 sin cambios.
