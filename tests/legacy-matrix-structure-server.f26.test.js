const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const server = fs.readFileSync(path.resolve(__dirname, '../server.js'), 'utf8');

test('STRUCT-SERVER-001 endpoint estructura usa service y no SQL inline', () => {
  const start = server.indexOf("// ---------- OBTENER ESTRUCTURA COMPLETA DE UNA VERSIÓN ----------");
  const end = server.indexOf("// ---------- OBTENER VERSIONES DE MATRIZ ----------", start);
  const block = server.slice(start, end);

  assert.match(block, /legacyMatrixService\.getStructure\(versionId\)/);
  assert.doesNotMatch(block, /pool\.query/);
  assert.doesNotMatch(block, /version_frentes/);
  assert.doesNotMatch(block, /version_atributos/);
  assert.doesNotMatch(block, /version_sub_motivos/);
});

test('STRUCT-SERVER-002 conserva 400 y 404 legacy', () => {
  const start = server.indexOf("// ---------- OBTENER ESTRUCTURA COMPLETA DE UNA VERSIÓN ----------");
  const end = server.indexOf("// ---------- OBTENER VERSIONES DE MATRIZ ----------", start);
  const block = server.slice(start, end);

  assert.match(block, /writeHead\(400/);
  assert.match(block, /ID de versión inválido/);
  assert.match(block, /writeHead\(404/);
  assert.match(block, /Versión no encontrada/);
});

test('STRUCT-SERVER-003 endpoints F2.3-F2.5 siguen delegados', () => {
  assert.match(server, /legacyMatrixService\.getActiveVersion\(\)/);
  assert.match(server, /legacyMatrixService\.getEvaluationActiveVersion\(\)/);
  assert.match(server, /legacyMatrixService\.getVersionByDate\(fecha\)/);
});
