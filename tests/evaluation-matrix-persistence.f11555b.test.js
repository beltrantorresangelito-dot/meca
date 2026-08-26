const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repo = fs.readFileSync(
  path.resolve(
    __dirname,
    '../src/modules/evaluations/evaluations.repository.js'
  ),
  'utf8'
);

test('F11555B-001 INSERT contiene campana_id', () => {
  assert.match(
    repo,
    /INSERT INTO evaluaciones[\s\S]*campana_id/
  );
});

test('F11555B-002 INSERT contiene matriz_id', () => {
  assert.match(
    repo,
    /INSERT INTO evaluaciones[\s\S]*matriz_id/
  );
});

test('F11555B-003 INSERT conserva version_matriz_id', () => {
  assert.match(
    repo,
    /INSERT INTO evaluaciones[\s\S]*version_matriz_id/
  );
});

test('F11555B-004 usa veinte placeholders', () => {
  assert.match(
    repo,
    /\$18,\$19,\$20/
  );
});

test('F11555B-005 parámetros incluyen campaña y matriz', () => {
  assert.match(
    repo,
    /evaluacion\.campana_id/
  );

  assert.match(
    repo,
    /evaluacion\.matriz_id/
  );

  assert.match(
    repo,
    /evaluacion\.version_matriz_id/
  );
});
