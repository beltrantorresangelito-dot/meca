const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const supervisor = fs.readFileSync(
  path.resolve(__dirname, '../public/js/supervisor.js'),
  'utf8'
);

test('F11513-001 campañas usa contrato quiebreId', () => {
  assert.match(
    supervisor,
    /\/api\/domain\/campanas\?quiebreId=/
  );
});

test('F11513-002 campañas no usa quiebre_id en query Domain', () => {
  assert.doesNotMatch(
    supervisor,
    /\/api\/domain\/campanas\?quiebre_id=/
  );
});

test('F11513-003 helper parametrizado permanece', () => {
  assert.match(
    supervisor,
    /async function obtenerCampanasPorQuiebre/
  );

  assert.match(
    supervisor,
    /encodeURIComponent\(quiebreId\)/
  );
});

test('F11513-004 no reaparecen campañas predeterminadas', () => {
  assert.doesNotMatch(
    supervisor,
    /const\s+predeterminadas\s*=\s*\[/
  );
});
