const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const server = fs.readFileSync(path.resolve(__dirname, '../server.js'), 'utf8');

function blockFor(route, nextMarker) {
  const start = server.indexOf(`if (ruta === '${route}'`);
  const end = server.indexOf(nextMarker, start);
  return server.slice(start, end);
}

test('LEGACYMAT2-SERVER-001 evaluacion/version-activa usa service y no SQL inline', () => {
  const block = blockFor(
    '/api/evaluacion/version-activa',
    '// ======================================================'
  );

  assert.match(block, /legacyMatrixService\.getEvaluationActiveVersion\(\)/);
  assert.doesNotMatch(block, /pool\.query/);
});

test('LEGACYMAT2-SERVER-002 endpoint sigue respondiendo 200', () => {
  const block = blockFor(
    '/api/evaluacion/version-activa',
    '// ======================================================'
  );

  assert.match(block, /writeHead\(200/);
  assert.match(block, /JSON\.stringify\(versionActiva\)/);
});

test('LEGACYMAT2-SERVER-003 endpoint F2.3 permanece delegado al service', () => {
  const block = blockFor(
    '/api/matriz/versiones/activa',
    '// ---------- OBTENER VERSIÓN POR FECHA ----------'
  );

  assert.match(block, /legacyMatrixService\.getActiveVersion\(\)/);
  assert.doesNotMatch(block, /pool\.query/);
});
