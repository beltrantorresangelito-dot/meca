const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const server = fs.readFileSync(path.resolve(__dirname, '../server.js'), 'utf8');

function extractBlock(route, nextMarker) {
  const start = server.indexOf(`if (ruta === '${route}'`);
  const end = server.indexOf(nextMarker, start);
  return server.slice(start, end);
}

test('LEGACYMAT-SERVER-001 endpoint matriz/versiones/activa usa servicio extraído', () => {
  const block = extractBlock(
    '/api/matriz/versiones/activa',
    '// ---------- OBTENER VERSIÓN POR FECHA ----------'
  );

  assert.match(block, /legacyMatrixService\.getActiveVersion\(\)/);
  assert.doesNotMatch(block, /pool\.query/);
});

test('LEGACYMAT-SERVER-002 matriz/versiones/activa mantiene contrato 404 legacy', () => {
  const block = extractBlock(
    '/api/matriz/versiones/activa',
    '// ---------- OBTENER VERSIÓN POR FECHA ----------'
  );

  assert.match(block, /writeHead\(404/);
  assert.match(block, /No hay versión activa/);
});

test('LEGACYMAT-SERVER-003 evaluacion/version-activa ya está migrado en F2.4 y conserva contrato 200', () => {
  const block = extractBlock(
    '/api/evaluacion/version-activa',
    '// ======================================================'
  );

  assert.match(block, /legacyMatrixService\.getEvaluationActiveVersion\(\)/);
  assert.doesNotMatch(block, /pool\.query/);
  assert.match(block, /writeHead\(200/);
});
