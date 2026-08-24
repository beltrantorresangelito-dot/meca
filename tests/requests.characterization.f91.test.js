const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const server = fs.readFileSync(
  path.resolve(__dirname, '../server.js'),
  'utf8'
);

const routes = fs.readFileSync(
  path.resolve(
    __dirname,
    '../src/modules/requests/requests.routes.js'
  ),
  'utf8'
);

test('REQCHAR-F95-001 server registra dispatcher', () => {
  assert.match(server, /createRequestsHandler/);
  assert.match(server, /handleRequestsRequest/);
});

test('REQCHAR-F95-002 rutas migraron a requests.routes', () => {
  assert.ok(routes.includes('/api/solicitudes'));
  assert.ok(routes.includes('solicitudes\\/usuario'));
  assert.ok(routes.includes("metodo === 'GET'"));
  assert.ok(routes.includes("metodo === 'POST'"));
  assert.ok(routes.includes("metodo === 'PUT'"));
});

test('REQCHAR-F95-003 parsing JSON migró a routes', () => {
  assert.match(routes, /function readJsonBody/);
  assert.match(routes, /JSON\.parse\(body\)/);
});

test('REQCHAR-F95-004 Token requerido preservado', () => {
  assert.match(routes, /function requireToken/);
  assert.match(routes, /Token requerido/);
  assert.match(routes, /401/);
});

test('REQCHAR-F95-005 server ya no conoce capas internas Requests', () => {
  assert.doesNotMatch(server, /requestsRepository\./);
  assert.doesNotMatch(server, /requestsService\./);
  assert.doesNotMatch(server, /requestsController\./);
});

test('REQCHAR-F95-006 F7 y F8 permanecen modularizados', () => {
  assert.match(server, /createEvaluationsHandler/);
  assert.match(server, /handleEvaluationsRequest/);
  assert.match(server, /createSessionsHandler/);
  assert.match(server, /handleSessionsRequest/);
});
