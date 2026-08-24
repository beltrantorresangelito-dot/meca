const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const server = fs.readFileSync(
  path.resolve(__dirname, '../server.js'),
  'utf8'
);

const routes = fs.readFileSync(
  path.resolve(__dirname, '../src/modules/versions/versions.routes.js'),
  'utf8'
);

const controller = fs.readFileSync(
  path.resolve(__dirname, '../src/modules/versions/versions.controller.js'),
  'utf8'
);

const service = fs.readFileSync(
  path.resolve(__dirname, '../src/modules/versions/versions.service.js'),
  'utf8'
);

const repository = fs.readFileSync(
  path.resolve(__dirname, '../src/modules/versions/versions.repository.js'),
  'utf8'
);

test('VERFINAL-001 único punto de entrada en server es handleVersionsRequest', () => {
  assert.match(server, /await handleVersionsRequest\(\{/);

  assert.doesNotMatch(
    server,
    /if \(ruta === '\/api\/versiones'/
  );

  assert.doesNotMatch(
    server,
    /if \(ruta\.match\(\/\^\\\/api\\\/versiones/
  );
});

test('VERFINAL-002 server ya no instancia capas internas', () => {
  assert.doesNotMatch(server, /new VersionsRepository/);
  assert.doesNotMatch(server, /new VersionsService/);
  assert.doesNotMatch(server, /new VersionsController/);
});

test('VERFINAL-003 routes conserva cuatro contratos', () => {
  assert.ok(routes.includes('/api/versiones'));
  assert.ok(routes.includes('^\\/api\\/versiones\\/(\\d+)\\/activar$'));
  assert.ok(routes.includes('^\\/api\\/versiones\\/(\\d+)$'));

  assert.ok(routes.includes("metodo === 'GET'"));
  assert.ok(routes.includes("metodo === 'POST'"));
  assert.ok(routes.includes("metodo === 'PUT'"));
  assert.ok(routes.includes("metodo === 'DELETE'"));
});

test('VERFINAL-004 Token parsing y query tipo viven en routes', () => {
  assert.match(routes, /function requireToken/);
  assert.match(routes, /Token requerido/);
  assert.match(routes, /function readJsonBody/);
  assert.match(routes, /JSON\.parse\(body\)/);
  assert.match(routes, /urlParseada\?\.query\?\.tipo/);
});

test('VERFINAL-005 HTTP de negocio vive en Controller', () => {
  assert.match(controller, /201/);
  assert.match(controller, /Versión no encontrada/);
  assert.match(controller, /success: true/);
  assert.match(controller, /error: error\.message/);
});

test('VERFINAL-006 activación exclusiva vive en Service', () => {
  assert.match(service, /repository\.deactivateByType\(tipo\)/);
  assert.match(service, /repository\.activateById\(id\)/);
});

test('VERFINAL-007 SQL está encapsulado en Repository', () => {
  assert.match(repository, /SELECT \* FROM versiones_sistema/);
  assert.match(repository, /INSERT INTO versiones_sistema/);
  assert.match(repository, /UPDATE versiones_sistema/);
  assert.match(repository, /DELETE FROM versiones_sistema/);

  assert.doesNotMatch(server, /SELECT \* FROM versiones_sistema/);
  assert.doesNotMatch(server, /INSERT INTO versiones_sistema/);
  assert.doesNotMatch(server, /UPDATE versiones_sistema/);
  assert.doesNotMatch(server, /DELETE FROM versiones_sistema/);
});

test('VERFINAL-008 legacy vigente permanece encapsulado', () => {
  assert.match(repository, /contenido_html\.length/);
  assert.match(repository, /false/);
  assert.match(repository, /NOW\(\)/);
});

test('VERFINAL-009 DELETE físico actual permanece explícito', () => {
  assert.match(repository, /DELETE FROM versiones_sistema/);
});

test('VERFINAL-010 módulos cerrados siguen protegidos', () => {
  assert.match(server, /handleEvaluationsRequest/);
  assert.match(server, /handleSessionsRequest/);
  assert.match(server, /handleRequestsRequest/);
  assert.match(server, /handlePdaRequest/);
  assert.match(server, /handleQuartileCriteriaRequest/);
});

test('VERFINAL-011 autorización central precede dispatcher', () => {
  const authz = server.indexOf('authorizeRequest({');
  const versions = server.indexOf('handleVersionsRequest({');

  assert.ok(authz >= 0);
  assert.ok(versions >= 0);
  assert.ok(authz < versions);
});
