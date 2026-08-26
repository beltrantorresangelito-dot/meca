const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(
  path.resolve(__dirname, '../public/js/supervisor.js'),
  'utf8'
);

test('F1151-001 existe helper campañas por quiebre', () => {
  assert.match(
    source,
    /async function obtenerCampanasPorQuiebre/
  );
});

test('F1151-002 consume API domain campanas con quiebreId', () => {
    assert.match(
        source,
        /\/api\/domain\/campanas\?quiebreId=/
    );
});

test('F1151-003 helper de select conserva quiebre_id', () => {
  assert.match(
    source,
    /async function cargarCampanasPorQuiebreEnSelect/
  );

  assert.match(
    source,
    /option\.dataset\.quiebreId/
  );
});

test('F1151-004 helpers quedan expuestos globalmente', () => {
  assert.match(
    source,
    /window\.obtenerCampanasPorQuiebre/
  );

  assert.match(
    source,
    /window\.cargarCampanasPorQuiebreEnSelect/
  );
});

test('F1151-005 no reaparecen campañas T ST F predeterminadas', () => {
  assert.doesNotMatch(
    source,
    /const\s+predeterminadas\s*=\s*\[/
  );

  assert.doesNotMatch(
    source,
    /\{\s*codigo:\s*['"]T['"]\s*,\s*descripcion:\s*['"]Temprana['"]/
  );
});

test('F1151-006 obtenerCampanas legacy permanece por compatibilidad', () => {
  assert.match(
    source,
    /async function obtenerCampanas\s*\(/
  );
});
