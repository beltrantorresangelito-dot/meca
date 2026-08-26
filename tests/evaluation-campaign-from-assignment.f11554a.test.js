const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(
  path.resolve(__dirname, '../public/js/auditor.js'),
  'utf8'
);

function enricher() {
  const start = source.indexOf(
    'async function enriquecerEvaluacionConContexto('
  );
  const end = source.indexOf(
    'function validarContextoPersistenciaEvaluacion(',
    start
  );

  assert.ok(start >= 0);
  assert.ok(end > start);

  return source.slice(start, end);
}

test('F11554A-001 existe helper por asignacion', () => {
  assert.match(
    source,
    /async function resolverCampanaDesdeAsignacion\s*\(/
  );
});

test('F11554A-002 usa escucha.campana_id', () => {
  assert.match(
    source,
    /escucha\.campana_id/
  );
});

test('F11554A-003 enriquecedor resuelve por ticket', () => {
  assert.match(
    enricher(),
    /await\s+resolverCampanaDesdeAsignacion\s*\(\s*ticketPSI\s*\)/
  );
});

test('F11554A-004 enriquecedor no depende de evalCampanaId', () => {
  assert.doesNotMatch(
    enricher(),
    /evalCampanaId/
  );
});

test('F11554A-005 preserva guardado enriquecido', () => {
  assert.match(
    source,
    /API\.guardarEvaluacion\s*\(\s*evaluacionConContexto\s*\)/
  );
});
