const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const server = fs.readFileSync(path.resolve(__dirname, '../server.js'), 'utf8');

test('DOMAPI-SERVER-001 server registra rutas de dominio mediante módulo', () => {
  assert.match(server, /registerDomainRoutes/);
  assert.match(server, /require\('\.\/src\/modules\/domain\/domain\.routes'\)/);
});

test('DOMAPI-SERVER-002 F2.9 conserva Matrix mediante módulo formal', () => {
  assert.match(server, /require\('\.\/src\/modules\/matrix'\)/);
  assert.match(server, /createMatrixReadHandler\(\)/);
  assert.match(server, /handleMatrixReadRequest/);

  assert.doesNotMatch(
    server,
    /if \(ruta === '\/api\/matriz\/versiones\/activa'/
  );
  assert.doesNotMatch(
    server,
    /if \(ruta === '\/api\/evaluacion\/version-activa'/
  );
});
