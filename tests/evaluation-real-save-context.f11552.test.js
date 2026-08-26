const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(
    path.resolve(
        __dirname,
        '../public/js/auditor.js'
    ),
    'utf8'
);

test(
    'F11552-001 guardado real enriquece evaluacion con escucha actual',
    () => {
        assert.match(
            source,
            /const\s+evaluacionConContexto\s*=\s*[\s\S]*?await\s+enriquecerEvaluacionConContexto\s*\(\s*evaluacion\s*,\s*escuchaActual\s*\)/
        );
    }
);

test(
    'F11552-002 valida contexto antes de guardar',
    () => {
        assert.match(
            source,
            /validarContextoPersistenciaEvaluacion\s*\(\s*evaluacionConContexto\s*\)/
        );
    }
);

test(
    'F11552-003 API recibe evaluacion enriquecida',
    () => {
        assert.match(
            source,
            /API\.guardarEvaluacion\s*\(\s*evaluacionConContexto\s*\)/
        );
    }
);

test(
    'F11552-004 escucha real se resuelve desde misEscuchasData por ticket',
    () => {
        assert.match(
            source,
            /misEscuchasData\.find/
        );

        assert.match(
            source,
            /escucha\.ticket/
        );

        assert.match(
            source,
            /ticketPSI/
        );
    }
);