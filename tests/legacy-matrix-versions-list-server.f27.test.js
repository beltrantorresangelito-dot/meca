const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const server = fs.readFileSync(path.resolve(__dirname, '../server.js'), 'utf8');

test('VERSIONS-SERVER-001 listado usa service y no SQL inline', () => {
  const start = server.indexOf("// ---------- OBTENER VERSIONES DE MATRIZ ----------");
  const end = server.indexOf("// API - REGLAS DE EVALUACIÓN POR VERSIÓN", start);
  const block = server.slice(start, end);

  assert.match(block, /legacyMatrixService\.listVersions\(\)/);
  assert.doesNotMatch(block, /pool\.query/);
  assert.doesNotMatch(block, /FROM\s+versiones_matriz/i);
});

test('VERSIONS-SERVER-002 conserva respuesta 200 y JSON array', () => {
  const start = server.indexOf("// ---------- OBTENER VERSIONES DE MATRIZ ----------");
  const end = server.indexOf("// API - REGLAS DE EVALUACIÓN POR VERSIÓN", start);
  const block = server.slice(start, end);

  assert.match(block, /writeHead\(200/);
  assert.match(block, /JSON\.stringify\(versiones\)/);
});

test('VERSIONS-SERVER-003 migraciones anteriores siguen delegadas', () => {
  assert.match(server, /legacyMatrixService\.getActiveVersion\(\)/);
  assert.match(server, /legacyMatrixService\.getEvaluationActiveVersion\(\)/);
  assert.match(server, /legacyMatrixService\.getVersionByDate\(fecha\)/);
  assert.match(server, /legacyMatrixService\.getStructure\(versionId\)/);
});
