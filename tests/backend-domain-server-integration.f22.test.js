const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const server = fs.readFileSync(path.resolve(__dirname, '../server.js'), 'utf8');

test('DOMAPI-SERVER-001 server registra rutas de dominio mediante módulo', () => {
  assert.match(server, /registerDomainRoutes/);
  assert.match(server, /require\('\.\/src\/modules\/domain\/domain\.routes'\)/);
});

test('DOMAPI-SERVER-002 F2.2 no reemplaza endpoints legacy de matriz', () => {
  assert.match(server, /\/api\/matriz\/versiones\/activa/);
  assert.match(server, /\/api\/evaluacion\/version-activa/);
});
