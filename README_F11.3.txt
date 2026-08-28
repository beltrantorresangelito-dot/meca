MECA F11.3 - DESACOPLE FUNCIONAL MULTI-QUIEBRE

OBJETIVO
Cerrar los residuos funcionales confirmados en F11.2.

CAMBIOS
1. El frontend deja de autocrear:
   T / Temprana
   ST / Super Temprana
   F / Fraccionamiento

2. Si no existen campañas, solo informa que deben configurarse.

3. Branding fijo:
   Auditoría Calidad Cobranzas
   Mesa Calidad Cobranzas
se reemplaza por branding neutral:
   Auditoría de Calidad
   Mesa de Calidad

4. Formulario de campañas usa ejemplos genéricos.

NO SE TOCA
public/js/auditor.js

Los umbrales:
97 / 90 / 85
permanecen exactamente iguales.

MOTIVO
Esos umbrales son lógica real de clasificación y corresponden al
futuro motor configurable. F11.3 no debe introducir una solución
parcial o duplicada.

APLICACIÓN

Copiar:
scripts/f113-desacoplar-multiquiebre.js
tests/multiquiebre-functional-decoupling.f113.test.js

Ejecutar:

node --check scripts\f113-desacoplar-multiquiebre.js
node scripts\f113-desacoplar-multiquiebre.js
node --test tests\multiquiebre-functional-decoupling.f113.test.js
npm test

VALIDACIÓN FUNCIONAL
1. Abrir Supervisor.
2. Gestión de campañas:
   - confirmar ejemplos genéricos;
   - confirmar que no se crean T/ST/F automáticamente.
3. Generar documento/reporte PDA:
   - confirmar que no aparece "Calidad Cobranzas".
4. Auditor:
   - confirmar cálculo/cuatriles sin cambios.

Si todo queda OK:
F11.4 revisará el flujo real de selección/contexto quiebre-campaña
en Supervisor y Auditor.
