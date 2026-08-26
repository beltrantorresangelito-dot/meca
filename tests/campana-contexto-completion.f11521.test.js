const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(
  path.resolve(__dirname, '../public/js/supervisor.js'),
  'utf8'
);

test('F11521-001 helper base existe', () => {
  assert.match(
    source,
    /async function resolverContextoEvaluacion\s*\(/
  );
});

test('F11521-002 helper actual existe', () => {
  assert.match(
    source,
    /async function resolverContextoEvaluacionActual\s*\(/
  );
});

test('F11521-003 contrato usa campanaId', () => {
  assert.match(
    source,
    /params\.set\(\s*'campanaId'/
  );

  assert.doesNotMatch(
    source,
    /contexto-evaluacion\?campana_id=/
  );
});

test('F11521-004 estado global de contexto presente', () => {
  assert.match(
    source,
    /window\.contextoEvaluacionActual/
  );
});

test('F11521-005 matriz y versión globales presentes', () => {
  assert.match(
    source,
    /window\.matrizActualId/
  );

  assert.match(
    source,
    /window\.versionMatrizActualId/
  );
});

test('F11521-006 helpers expuestos en window', () => {
  assert.match(
    source,
    /window\.resolverContextoEvaluacion\s*=/
  );

  assert.match(
    source,
    /window\.resolverContextoEvaluacionActual\s*=/
  );
});

test('F11521-007 endpoint correcto permanece', () => {
  assert.match(
    source,
    /\/api\/domain\/contexto-evaluacion\?/
  );
});
