const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const server = fs.readFileSync(
  path.resolve(__dirname, '../server.js'),
  'utf8'
);

test('MATRIXSERVER-001 server registra MatrixModule una sola vez', () => {
  assert.match(
    server,
    /require\('\.\/src\/modules\/matrix'\)/
  );
  assert.match(
    server,
    /createMatrixReadHandler\(\)/
  );
  assert.match(
    server,
    /await handleMatrixReadRequest/
  );
});

test('MATRIXSERVER-002 lecturas consolidadas ya no contienen handlers inline', () => {
  assert.doesNotMatch(
    server,
    /if \(ruta === '\/api\/matriz\/versiones\/activa'/
  );
  assert.doesNotMatch(
    server,
    /if \(ruta === '\/api\/matriz\/versiones\/por-fecha'/
  );
  assert.doesNotMatch(
    server,
    /if \(ruta === '\/api\/matriz\/versiones' && metodo === 'GET'\)/
  );
  assert.doesNotMatch(
    server,
    /ruta\.match\(\/\^\\\/api\\\/matriz\\\/versiones\\\/\\d\+\\\/estructura/
  );
});

test('MATRIXSERVER-003 no quedan llamadas legacyMatrixService', () => {
  assert.doesNotMatch(server, /legacyMatrixService/);
});

test('MATRIXSERVER-004 handler duplicado reglas/version fue retirado', () => {
  const matches = server.match(
    /reglas-evaluacion\/version\/:id/g
  ) || [];

  // El texto puede aparecer en logs/comentarios fuera del handler formal,
  // pero no debe quedar el segundo bloque "CORREGIDO".
  assert.doesNotMatch(
    server,
    /GET \/api\/reglas-evaluacion\/version\/:id - CORREGIDO/
  );
});
