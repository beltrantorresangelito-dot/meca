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

function obtenerBloqueEnriquecedor() {
    const inicio = source.indexOf(
        'async function enriquecerEvaluacionConContexto'
    );

    const fin = source.indexOf(
        'function validarContextoPersistenciaEvaluacion',
        inicio
    );

    assert.ok(
        inicio >= 0,
        'No existe enriquecerEvaluacionConContexto'
    );

    assert.ok(
        fin > inicio,
        'No se pudo aislar enriquecerEvaluacionConContexto'
    );

    return source.slice(
        inicio,
        fin
    );
}

test(
    'F11553-001 enriquecedor usa campana de evaluacion o escucha real',
    () => {
        const block =
            obtenerBloqueEnriquecedor();

        assert.match(
            block,
            /evaluacion\.campana_id/
        );

        assert.match(
            block,
            /escucha\?\.campana_id/
        );
    }
);

test(
    'F11553-002 enriquecedor ya no depende de evalCampanaId',
    () => {
        const block =
            obtenerBloqueEnriquecedor();

        assert.doesNotMatch(
            block,
            /evalCampanaId/
        );
    }
);

test(
    'F11553-003 campana se normaliza antes de resolver contexto',
    () => {
        const block =
            obtenerBloqueEnriquecedor();

        assert.match(
            block,
            /campanaIdNormalizado/
        );

        assert.match(
            block,
            /aplicarContextoAuditoria\s*\(\s*campanaIdNormalizado/
        );
    }
);

test(
    'F11553-004 payload persiste campana normalizada',
    () => {
        const block =
            obtenerBloqueEnriquecedor();

        assert.match(
            block,
            /campana_id:\s*campanaIdNormalizado/
        );
    }
);