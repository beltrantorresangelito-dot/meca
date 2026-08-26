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

test('F11555-001 INSERT evaluaciones contiene matriz_id', () => {
  assert.match(
    repo,
    /INSERT\s+INTO\s+evaluaciones\s*\([\s\S]*\bmatriz_id\b/im
  );
});

test('F11555-002 backend lee matriz_id del payload', () => {
  assert.match(
    repo,
    /evaluacion\.matriz_id/
  );
});

test('F11555-003 params insertan matriz antes de version', () => {
  assert.match(
    repo,
    /evaluacion\.matriz_id[\s\S]*evaluacion\.version_matriz_id/
  );
});
