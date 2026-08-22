const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const server = fs.readFileSync(path.resolve(__dirname, '../server.js'), 'utf8');

test('RULES-SERVER-001 GET reglas/version usa service y no SQL inline', () => {
  const start = server.indexOf("if (ruta.match(/^\\/api\\/reglas-evaluacion\\/version\\/\\d+$/)");
  const end = server.indexOf("// API - REGLAS DE EVALUACIÓN - CRUD", start);
  const block = server.slice(start, end);

  assert.match(block, /legacyMatrixService\.getEvaluationRulesByVersion\(versionId\)/);
  assert.doesNotMatch(block, /pool\.query/);
  assert.doesNotMatch(block, /information_schema/);
  assert.doesNotMatch(block, /FROM\s+reglas_evaluacion/i);
});

test('RULES-SERVER-002 conserva respuesta 200 incluso ante error', () => {
  const start = server.indexOf("if (ruta.match(/^\\/api\\/reglas-evaluacion\\/version\\/\\d+$/)");
  const end = server.indexOf("// API - REGLAS DE EVALUACIÓN - CRUD", start);
  const block = server.slice(start, end);

  const matches = block.match(/writeHead\(200/g) || [];
  assert.ok(matches.length >= 2);
  assert.match(block, /JSON\.stringify\(\[\]\)/);
});

test('RULES-SERVER-003 CRUD de reglas permanece inline', () => {
  const start = server.indexOf("if (ruta === '/api/reglas-evaluacion' && metodo === 'GET')");
  const end = server.indexOf("// POST - Crear nueva regla", start);
  const block = server.slice(start, end);

  assert.match(block, /pool\.query/);
  assert.match(block, /JOIN\s+versiones_matriz/i);
});
