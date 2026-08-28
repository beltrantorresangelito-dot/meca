MECA F11.5.4.1 - DIAGNOSTICO RUNTIME AUDITOR

PROBLEMA
En navegador:
resolverContextoDesdeEscucha is not defined

y:
window.contextoAuditoriaActual = undefined
window.matrizActualId = undefined
window.versionMatrizActualId = undefined

OBJETIVO
Determinar si:
A) F11.5.4 no quedó escrito en public/js/auditor.js
B) la vista Auditor carga otro JS
C) el HTML no referencia ningún auditor.js

NO MODIFICA PRODUCCIÓN.

COPIAR
scripts/f11541-diagnosticar-runtime-auditor.js
tests/auditor-runtime-diagnostic.f11541.test.js

EJECUTAR

node --check scripts\f11541-diagnosticar-runtime-auditor.js
node --test tests\auditor-runtime-diagnostic.f11541.test.js
node scripts\f11541-diagnosticar-runtime-auditor.js

COMPARTIR LA SALIDA COMPLETA.

NO avanzar a F11.5.5 todavía.
