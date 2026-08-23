const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repo = fs.readFileSync(
  path.resolve(__dirname, '../src/modules/matrix/matrix.repository.js'),
  'utf8'
);
const server = fs.readFileSync(
  path.resolve(__dirname, '../server.js'),
  'utf8'
);

test('MATRIXSAFE-REPO-001 reglas serializan campos JSON', () => {
  assert.match(repo, /JSON\.stringify\(data\.submotivos_afectados\)/);
  assert.match(repo, /JSON\.stringify\(data\.excepciones\)/);
  assert.match(repo, /\$8::jsonb/);
  assert.match(repo, /\$9::jsonb/);
});

test('MATRIXSAFE-REPO-002 estructura usa árbol versionado existente', () => {
  assert.match(repo, /getLegacyMatrixStructure\(active\.id\)/);
  assert.match(repo, /getLegacyEvaluationRulesByVersion\(active\.id\)/);
});

test('MATRIXSAFE-SERVER-001 estructura ya no está inline', () => {
  assert.doesNotMatch(
    server,
    /if \(ruta === '\/api\/evaluacion\/estructura' && metodo === 'GET'\)/
  );
});

test('MATRIXSAFE-SERVER-002 reglas CRUD ya no están inline', () => {
  assert.doesNotMatch(
    server,
    /if \(ruta === '\/api\/reglas-evaluacion' && metodo === 'POST'\)/
  );

  assert.doesNotMatch(
    server,
    /ruta\.match\(\/\^\\\/api\\\/reglas-evaluacion/
  );
});

test('MATRIXSAFE-SERVER-003 recalcular permanece aislado', () => {
  assert.match(
    server,
    /if \(ruta === '\/api\/matriz\/recalcular' && metodo === 'POST'\)/
  );
});
