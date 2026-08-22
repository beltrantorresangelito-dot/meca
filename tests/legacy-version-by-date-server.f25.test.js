const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const server = fs.readFileSync(path.resolve(__dirname, '../server.js'), 'utf8');

test('LEGACYDATE-SERVER-001 por-fecha usa service y no pool.query inline', () => {
  const start = server.indexOf("if (ruta === '/api/matriz/versiones/por-fecha'");
  const end = server.indexOf("// ---------- OBTENER ESTRUCTURA COMPLETA", start);
  const block = server.slice(start, end);

  assert.match(block, /legacyMatrixService\.getVersionByDate\(fecha\)/);
  assert.doesNotMatch(block, /pool\.query/);
});

test('LEGACYDATE-SERVER-002 conserva contratos 400 y 404', () => {
  const start = server.indexOf("if (ruta === '/api/matriz/versiones/por-fecha'");
  const end = server.indexOf("// ---------- OBTENER ESTRUCTURA COMPLETA", start);
  const block = server.slice(start, end);

  assert.match(block, /writeHead\(400/);
  assert.match(block, /Fecha requerida/);
  assert.match(block, /writeHead\(404/);
  assert.match(block, /No hay versión para esta fecha/);
});

test('LEGACYDATE-SERVER-003 endpoints F2.3/F2.4 continúan delegados', () => {
  assert.match(server, /legacyMatrixService\.getActiveVersion\(\)/);
  assert.match(server, /legacyMatrixService\.getEvaluationActiveVersion\(\)/);
});
