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
    'F127-UI-001 existe bloque funcional de asignación',
    () => {
        assert.match(
            html,
            /id=["']asignacionQuiebre["']/
        );

        assert.match(
            html,
            /id=["']asignacionCampana["']/
        );

        assert.match(
            html,
            /id=["']asignacionMatrizActualCard["']/
        );

        assert.match(
            html,
            /id=["']formAsignacionMatriz["']/
        );

        assert.match(
            html,
            /id=["']tablaHistorialCampanaMatriz["']/
        );
    }
);


test(
    'F127-UI-002 existen selectores',
    () => {
        assert.match(
            html,
            /id=["']asignacionQuiebre["']/
        );

        assert.match(
            html,
            /id=["']asignacionCampana["']/
        );

        assert.match(
            html,
            /id=["']asignacionMatriz["']/
        );
    }
);


test(
    'F127-UI-003 existe historial',
    () => {
        assert.match(
            html,
            /id=["']tablaHistorialCampanaMatriz["']/
        );
    }
);


test(
    'F127-UI-004 usa API campana-matriz',
    () => {
        assert.match(
            js,
            /\/api\/domain\/campana-matriz/
        );
    }
);


test(
    'F127-UI-005 guarda con POST',
    () => {
        assert.match(
            js,
            /guardarAsignacionCampanaMatriz/
        );

        assert.match(
            js,
            /method:\s*['"]POST['"]/
        );
    }
);


test(
    'F127-UI-006 conserva historial con PUT',
    () => {
        assert.match(
            js,
            /fechaAnteriorAsignacion/
        );

        assert.match(
            js,
            /method:\s*['"]PUT['"]/
        );
    }
);


test(
    'F127-UI-007 permite baja lógica',
    () => {
        assert.match(
            js,
            /desactivarAsignacionCampanaMatriz/
        );

        assert.match(
            js,
            /method:\s*['"]PATCH['"]/
        );
    }
);


test(
    'F127-UI-008 permite matrices multi-quiebre',
    () => {
        assert.match(
            js,
            /cargarMatricesAsignables/
        );

        assert.match(
            js,
            /Promise\.all/
        );
    }
);


test(
    'F127-UI-009 carga al entrar a campañas',
    () => {
        assert.match(
            js,
            /inicializarAsignacionCampanaMatriz/
        );

        assert.match(
            js,
            /cargarCampanasPestana/
        );
    }
);