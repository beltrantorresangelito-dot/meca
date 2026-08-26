const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(
  path.resolve(__dirname, '../public/js/supervisor.js'),
  'utf8'
);

test('F1153-001 existe cargarMatrizDesdeContexto', () => {
  assert.match(
    source,
    /async function cargarMatrizDesdeContexto\s*\(/
  );
});

test('F1153-002 existe resolverYCargarMatrizDeCampana', () => {
  assert.match(
    source,
    /async function resolverYCargarMatrizDeCampana\s*\(/
  );
});

test('F1153-003 consume matriz_id desde contexto', () => {
  assert.match(
    source,
    /contexto\.matriz_id/
  );
});

test('F1153-004 consume versión desde contexto', () => {
  assert.match(
    source,
    /contexto\.matriz_version_id/
  );

  assert.match(
    source,
    /contexto\.version_matriz_id/
  );
});

test('F1153-005 actualiza estado global de matriz', () => {
  assert.match(
    source,
    /window\.matrizActualId\s*=/
  );

  assert.match(
    source,
    /window\.versionMatrizActualId\s*=/
  );
});

test('F1153-006 resuelve contexto antes de cargar', () => {
  const resolver =
    source.indexOf(
      'resolverContextoEvaluacionActual'
    );

  const cargar =
    source.indexOf(
      'cargarMatrizDesdeContexto'
    );

  assert.ok(resolver >= 0);
  assert.ok(cargar >= 0);
});

test('F1153-007 helpers expuestos', () => {
  assert.match(
    source,
    /window\.cargarMatrizDesdeContexto\s*=/
  );

  assert.match(
    source,
    /window\.resolverYCargarMatrizDeCampana\s*=/
  );
});

test(
  'F1153-008 carga de matriz usa contexto y no IDs fijos',
  () => {
    assert.doesNotMatch(
      source,
      /matrizActualId\s*=\s*1\b/
    );

    assert.doesNotMatch(
      source,
      /versionMatrizActualId\s*=\s*7\b/
    );
  }
);


test(
  'F1153-009 cambio de campaña resuelve contexto antes de reutilizar loader',
  () => {
    const bloque =
      source.slice(
        source.indexOf(
          'async function resolverYCargarMatrizDeCampana'
        )
      );

    const resolver =
      bloque.indexOf(
        'resolverContextoEvaluacionActual'
      );

    const cargar =
      bloque.indexOf(
        'cargarMatrizDesdeContexto'
      );

    assert.ok(
      resolver >= 0,
      'Debe resolver contexto de campaña'
    );

    assert.ok(
      cargar >= 0,
      'Debe cargar matriz desde el contexto'
    );

    assert.ok(
      resolver < cargar,
      'Debe resolver contexto antes de cargar matriz'
    );
  }
);