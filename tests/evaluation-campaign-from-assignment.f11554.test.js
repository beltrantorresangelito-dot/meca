const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(
  path.resolve(__dirname, '../public/js/auditor.js'),
  'utf8'
);

test('F11554-001 existe resolver campaña por asignación', () => {
  assert.match(
    source,
    /async function resolverCampanaDesdeAsignacion\s*\(/
  );
});

test('F11554-002 consulta asignaciones reales', () => {
  assert.match(
    source,
    /\/api\/escuchas\/asignaciones/
  );
});

test('F11554-003 matching usa ticket', () => {
  assert.match(source, /item\?\.ticket/);
  assert.match(source, /ticketBuscado/);
});

test('F11554-004 obtiene campana_id de escucha', () => {
  assert.match(
    source,
    /escucha\.campana_id/
  );
});

test('F11554-005 enriquecedor usa resolución por ticket', () => {
  assert.match(
    source,
    /await\s+resolverCampanaDesdeAsignacion\s*\(\s*ticketPSI\s*\)/
  );
});

test('F11554-006 no depende de evalCampanaId', () => {
  const start = source.indexOf(
    'async function enriquecerEvaluacionConContexto'
  );
  const end = source.indexOf(
    'function validarContextoPersistenciaEvaluacion',
    start
  );
  const block = source.slice(start, end);

  assert.doesNotMatch(
    block,
    /evalCampanaId/
  );
});

test('F11554-007 guardado enriquecido permanece', () => {
  assert.match(
    source,
    /API\.guardarEvaluacion\s*\(\s*evaluacionConContexto\s*\)/
  );
});
