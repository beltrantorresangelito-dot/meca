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

const repository = fs.readFileSync(
  path.resolve(
    __dirname,
    '../src/modules/requests/requests.repository.js'
  ),
  'utf8'
);

test('REQFINAL-001 único punto de entrada en server es handleRequestsRequest', () => {
  assert.match(server, /await handleRequestsRequest\(\{/);

  assert.doesNotMatch(
    server,
    /if \(ruta === '\/api\/solicitudes'/
  );

  assert.doesNotMatch(
    server,
    /if \(ruta\.match\(\/\^\\\/api\\\/solicitudes/
  );
});

test('REQFINAL-002 server ya no instancia capas internas de Requests', () => {
  assert.doesNotMatch(server, /new RequestsRepository/);
  assert.doesNotMatch(server, /new RequestsService/);
  assert.doesNotMatch(server, /new RequestsController/);
});

test('REQFINAL-003 routes conserva cinco contratos principales', () => {
  assert.ok(routes.includes('solicitudes\\/usuario'));
  assert.ok(routes.includes("ruta === '/api/solicitudes'"));
  assert.ok(routes.includes("metodo === 'GET'"));
  assert.ok(routes.includes("metodo === 'POST'"));
  assert.ok(routes.includes("metodo === 'PUT'"));
});

test('REQFINAL-004 Token requerido permanece solo donde corresponde', () => {
  assert.match(routes, /function requireToken/);
  assert.match(routes, /Token requerido/);
  assert.match(routes, /401/);
});

test('REQFINAL-005 parsing JSON permanece ligado a POST y PUT', () => {
  assert.match(routes, /function readJsonBody/);
  assert.match(routes, /JSON\.parse\(body\)/);
});

test('REQFINAL-006 creación dinámica legacy sigue encapsulada en Repository', () => {
  assert.match(repository, /Object\.keys\(data\)/);
  assert.match(repository, /Object\.values\(data\)/);
  assert.match(repository, /INSERT INTO solicitudes_requerimientos/);

  assert.doesNotMatch(server, /Object\.keys\(nueva\)/);
  assert.doesNotMatch(server, /INSERT INTO solicitudes_requerimientos/);
});

test('REQFINAL-007 F7 y F8 continúan modularizados', () => {
  assert.match(server, /createEvaluationsHandler/);
  assert.match(server, /handleEvaluationsRequest/);
  assert.match(server, /createSessionsHandler/);
  assert.match(server, /handleSessionsRequest/);
});

test('REQFINAL-008 autorización central permanece antes del dispatcher Requests', () => {
  const authz = server.indexOf('authorizeRequest({');
  const requests = server.indexOf('handleRequestsRequest({');

  assert.ok(authz >= 0);
  assert.ok(requests >= 0);
  assert.ok(authz < requests);
});
