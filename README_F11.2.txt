MECA F11.2 - CARACTERIZACIÓN DE RESIDUOS FUNCIONALES MULTI-QUIEBRE

OBJETIVO
Inspeccionar el contexto real de los hallazgos funcionalmente relevantes
detectados en F11.1.

NO MODIFICA PRODUCCIÓN.

COPIAR
scripts/f112-caracterizar-residuos-multiquiebre.js
tests/multiquiebre-residual-characterization.f112.test.js

EJECUTAR

node --check scripts\f112-caracterizar-residuos-multiquiebre.js
node --test tests\multiquiebre-residual-characterization.f112.test.js
node scripts\f112-caracterizar-residuos-multiquiebre.js

SE GENERARÁN
F11.2_RESIDUOS_MULTICOMPAÑA.txt
F11.2_RESIDUOS_MULTICOMPAÑA.json

COMPARTIR
F11.2_RESIDUOS_MULTICOMPAÑA.txt

ANALIZAREMOS
- catálogo T/ST/F en supervisor.js;
- regla Cobranzas en auditor.js;
- branding fijo de Cobranzas;
- placeholder de campañas.

No aplicar correcciones todavía.
