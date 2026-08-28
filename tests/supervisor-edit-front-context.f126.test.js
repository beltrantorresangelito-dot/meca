const test =
    require('node:test');

const assert =
    require('node:assert/strict');

const fs =
    require('node:fs');

const path =
    require('node:path');


const source =
    fs.readFileSync(
        path.join(
            __dirname,
            '..',
            'public',
            'js',
            'supervisor.js'
        ),
        'utf8'
    );


test(
    'F126-FRONT-001 editar frente usa matriz contextual',
    () => {
        assert.match(
            source,
            /window\.matrizData\?\.frentes/
        );
    }
);


test(
    'F126-FRONT-002 editar frente usa matrizActualId',
    () => {
        assert.match(
            source,
            /window\.matrizActualId/
        );
    }
);


test(
    'F126-FRONT-003 editar frente usa versionMatrizActualId',
    () => {
        assert.match(
            source,
            /window\.versionMatrizActualId/
        );
    }
);