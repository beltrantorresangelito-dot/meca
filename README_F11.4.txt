MECA F11.4 - VALIDACIÓN DEL FLUJO QUIEBRE -> CAMPAÑA -> MATRIZ

OBJETIVO
Determinar el flujo real de contexto en Supervisor, Auditor y backend.

NO MODIFICA PRODUCCIÓN.

COPIAR
scripts/f114-diagnosticar-flujo-contexto.js
tests/context-flow-diagnostic.f114.test.js

EJECUTAR

node --check scripts\f114-diagnosticar-flujo-contexto.js
node --test tests\context-flow-diagnostic.f114.test.js
node scripts\f114-diagnosticar-flujo-contexto.js

SE GENERARÁN
F11.4_FLUJO_CONTEXTO_MULTQUIEBRE.txt
F11.4_FLUJO_CONTEXTO_MULTQUIEBRE.json

COMPARTIR
F11.4_FLUJO_CONTEXTO_MULTQUIEBRE.txt

QUÉ BUSCA
- APIs /domain/quiebres, /campanas y /contexto;
- propagación quiebre_id/campana_id;
- quiebre_codigo/campana_codigo;
- resolver_contexto_evaluacion;
- matriz_id / matriz_version_id;
- vigencia de matriz;
- estado/contexto seleccionado en frontend.

NO CORREGIR NADA TODAVÍA.
F11.5 clasificará el flujo real y propondrá cambios mínimos.
