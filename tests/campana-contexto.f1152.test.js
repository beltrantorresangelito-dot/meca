const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(
  path.resolve(__dirname, '../public/js/supervisor.js'),
  'utf8'
);

test('F1152-001 existe resolverContextoEvaluacion', () => {
  assert.match(
    source,
    /async function resolverContextoEvaluacion/
  );
});

test('F1152-002 usa endpoint contexto-evaluacion', () => {
  assert.match(
    source,
    /\/api\/domain\/contexto-evaluacion\?/
  );
});

test('F1152-003 usa contrato campanaId', () => {
  assert.match(
    source,
    /params\.set\(\s*'campanaId'/
  );

  assert.doesNotMatch(
    source,
    /contexto-evaluacion\?campana_id=/
  );
});

test('F1152-004 fecha es opcional', () => {
  assert.match(
    source,
    /params\.set\(\s*'fecha'/
  );
});

test('F1152-005 contexto se conserva globalmente', () => {
  assert.match(
    source,
    /window\.contextoEvaluacionActual/
  );
});

test('F1152-006 matriz y versión vienen del contexto', () => {
  assert.match(
    source,
    /window\.matrizActualId/
  );

  assert.match(
    source,
    /window\.versionMatrizActualId/
  );
});

test('F1152-007 helpers quedan expuestos', () => {
  assert.match(
    source,
    /window\.resolverContextoEvaluacion/
  );

  assert.match(
    source,
    /window\.resolverContextoEvaluacionActual/
  );
});
