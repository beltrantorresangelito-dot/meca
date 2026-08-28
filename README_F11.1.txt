MECA F11.1 - DIAGNÓSTICO MULTI-QUIEBRE / MULTI-CAMPAÑA

OBJETIVO
Determinar cuánto del sistema sigue acoplado a Cobranzas,
campañas concretas o matrices legacy.

ESTA FASE NO MODIFICA PRODUCCIÓN.

COPIAR
scripts/f111-diagnostico-multiquiebre.js
tests/multiquiebre-diagnostic.f111.test.js

EJECUTAR DESDE LA RAÍZ DEL PROYECTO

node --check scripts\f111-diagnostico-multiquiebre.js
node --test tests\multiquiebre-diagnostic.f111.test.js
node scripts\f111-diagnostico-multiquiebre.js

EL ÚLTIMO COMANDO GENERARÁ EN LA RAÍZ:

F11.1_DIAGNOSTICO_MULTICOMPAÑA.txt
F11.1_DIAGNOSTICO_MULTICOMPAÑA.json

LUEGO
Compartir el contenido de F11.1_DIAGNOSTICO_MULTICOMPAÑA.txt.

IMPORTANTE
Un hallazgo HIGH no implica automáticamente un defecto.
Ejemplos:
- un dato semilla COBRANZAS puede ser válido;
- una etiqueta visible puede ser válida;
- un if que dependa de COBRANZAS para decidir lógica sí sería acoplamiento.

En F11.2 clasificaremos cada hallazgo antes de modificar código.
