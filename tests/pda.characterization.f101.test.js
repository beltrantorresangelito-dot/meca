const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const server = fs.readFileSync(path.resolve(__dirname, '../server.js'), 'utf8');
const routes = fs.readFileSync(path.resolve(__dirname, '../src/modules/pda/pda.routes.js'), 'utf8');

test('PDA-F105-001 server registra dispatcher', () => {
  assert.match(server, /createPdaHandler/);
  assert.match(server, /handlePdaRequest/);
});

test('PDA-F105-002 rutas migraron a pda.routes', () => {
  assert.ok(routes.includes('/api/pda/pendientes'));
  assert.ok(routes.includes('/api/pda/seguimiento'));
  assert.ok(routes.includes('/api/pda/historial'));
  assert.ok(routes.includes('/api/pda/exportar'));
  assert.ok(routes.includes('^\\/api\\/pda\\/(\\d+)$'));
});

test('PDA-F105-003 Token requerido migró a routes', () => {
  assert.match(routes, /function requireToken/);
  assert.match(routes, /Token requerido/);
  assert.match(routes, /401/);
});

test('PDA-F105-004 server ya no conoce capas internas PDA', () => {
  assert.doesNotMatch(server, /pdaRepository\./);
  assert.doesNotMatch(server, /pdaService\./);
  assert.doesNotMatch(server, /pdaController\./);
});

test('PDA-F105-005 F7 F8 F9 permanecen modularizados', () => {
  assert.match(server, /handleEvaluationsRequest/);
  assert.match(server, /handleSessionsRequest/);
  assert.match(server, /handleRequestsRequest/);
});
