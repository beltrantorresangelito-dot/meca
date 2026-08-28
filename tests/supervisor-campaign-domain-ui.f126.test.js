const test =
    require('node:test');

const assert =
    require('node:assert/strict');

const fs =
    require('node:fs');

const path =
    require('node:path');


const js =
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


const html =
    fs.readFileSync(
        path.join(
            __dirname,
            '..',
            'views',
            'supervisor',
            'dashboard.html'
        ),
        'utf8'
    );


test(
    'F126-UI-001 campaña usa Domain GET',
    () => {
        assert.match(
            js,
            /\/api\/domain\/campanas/
        );
    }
);


test(
    'F126-UI-002 campaña usa POST Domain',
    () => {
        assert.match(
            js,
            /method:\s*['"]POST['"]/
        );

        assert.match(
            js,
            /\/api\/domain\/campanas/
        );
    }
);


test(
    'F126-UI-003 campaña usa PUT Domain',
    () => {
        assert.match(
            js,
            /api\/domain\/campanas\/\$\{id\}/
        );

        assert.match(
            js,
            /method:\s*['"]PUT['"]/
        );
    }
);


test(
    'F126-UI-004 desactivación usa PATCH',
    () => {
        assert.match(
            js,
            /campanas\/\$\{id\}\/estado/
        );

        assert.match(
            js,
            /method:\s*['"]PATCH['"]/
        );
    }
);


test(
    'F126-UI-005 modal contiene quiebre',
    () => {
        assert.match(
            html,
            /id=["']campanaQuiebre["']/
        );
    }
);


test(
    'F126-UI-006 guardar envía quiebreId',
    () => {
        assert.match(
            js,
            /quiebreId/
        );

        assert.match(
            js,
            /campanaQuiebre/
        );
    }
);