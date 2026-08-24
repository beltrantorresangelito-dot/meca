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
    '../src/modules/versions/versions.routes.js'
  ),
  'utf8'
);

test('VER-F1017-001 server registra dispatcher', () => {
  assert.match(server, /createVersionsHandler/);
  assert.match(server, /handleVersionsRequest/);
});

test('VER-F1017-002 cuatro contratos migraron a routes', () => {
  assert.ok(routes.includes('/api/versiones'));
  assert.ok(routes.includes('^\\/api\\/versiones\\/(\\d+)\\/activar$'));
  assert.ok(routes.includes('^\\/api\\/versiones\\/(\\d+)$'));

  assert.ok(routes.includes("metodo === 'GET'"));
  assert.ok(routes.includes("metodo === 'POST'"));
  assert.ok(routes.includes("metodo === 'PUT'"));
  assert.ok(routes.includes("metodo === 'DELETE'"));
});

test('VER-F1017-003 Token requerido migró a routes', () => {
  assert.match(routes, /function requireToken/);
  assert.match(routes, /Token requerido/);
  assert.match(routes, /401/);
});

test('VER-F1017-004 parsing JSON migró a routes', () => {
  assert.match(routes, /function readJsonBody/);
  assert.match(routes, /JSON\.parse\(body\)/);
});

test('VER-F1017-005 query tipo migró a routes', () => {
  assert.match(routes, /urlParseada\?\.query\?\.tipo/);
});

test('VER-F1017-006 server ya no conoce capas internas', () => {
  assert.doesNotMatch(server, /versionsRepository\./);
  assert.doesNotMatch(server, /versionsService\./);
  assert.doesNotMatch(server, /versionsController\./);
});

test('VER-F1017-007 módulos previos permanecen protegidos', () => {
  assert.match(server, /handleEvaluationsRequest/);
  assert.match(server, /handleSessionsRequest/);
  assert.match(server, /handleRequestsRequest/);
  assert.match(server, /handlePdaRequest/);
  assert.match(server, /handleQuartileCriteriaRequest/);
});
