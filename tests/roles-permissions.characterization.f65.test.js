const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const server = fs.readFileSync(path.resolve(__dirname, '../server.js'), 'utf8');
const routes = fs.readFileSync(
  path.resolve(__dirname, '../src/modules/roles/roles.routes.js'),
  'utf8'
);
const controller = fs.readFileSync(
  path.resolve(__dirname, '../src/modules/roles/roles.controller.js'),
  'utf8'
);

test('ROLECHAR-F68-001 server registra Roles dispatcher', () => {
  assert.match(server, /createRolesHandler/);
  assert.match(server, /handleRolesRequest/);
});

test('ROLECHAR-F68-002 handlers Roles ya no están inline', () => {
  assert.doesNotMatch(server, /if \(ruta === '\/api\/roles'/);
  assert.doesNotMatch(server, /ruta\.match\(\/\^\\\/api\\\/roles/);
  assert.doesNotMatch(server, /ruta\.match\(\/\^\\\/api\\\/rol-pestanas/);
});

test('ROLECHAR-F68-003 auth redirect ya no está inline', () => {
  assert.doesNotMatch(
    server,
    /if \(ruta === '\/api\/auth\/redirect' && metodo === 'GET'\)/
  );
});

test('ROLECHAR-F68-004 routes contiene contratos', () => {
  for (const endpoint of [
    '/api/auth/redirect',
    '/api/roles',
    '/api/pestanas/todas',
    '/api/pestanas',
    '/api/rol-pestanas'
  ]) {
    assert.match(routes, new RegExp(endpoint.replaceAll('/', '\\/')));
  }
});

test('ROLECHAR-F68-005 controller conserva Token requerido', () => {
  assert.match(controller, /Token requerido/);
  assert.match(controller, /this\.requireToken/);
});

test('ROLECHAR-F68-006 autorización central permanece', () => {
  assert.match(server, /authorizeRequest/);
  assert.match(server, /verifyToken/);
});
