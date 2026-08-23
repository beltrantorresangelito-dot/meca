const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const server = fs.readFileSync(
  path.resolve(__dirname, '../server.js'),
  'utf8'
);

const routes = fs.readFileSync(
  path.resolve(__dirname, '../src/modules/listenings/listenings.routes.js'),
  'utf8'
);

const controller = fs.readFileSync(
  path.resolve(__dirname, '../src/modules/listenings/listenings.controller.js'),
  'utf8'
);

test('LISTCHAR-F55-001 server registra dispatcher Listenings', () => {
  assert.match(server, /createListeningsHandler/);
  assert.match(server, /handleListeningsRequest/);
});

test('LISTCHAR-F55-002 rutas Escuchas ya no están inline en server', () => {
  assert.doesNotMatch(
    server,
    /if \(ruta === '\/api\/escuchas\/asignaciones'/
  );
  assert.doesNotMatch(
    server,
    /ruta\.match\(\/\^\\\/api\\\/escuchas/
  );
});

test('LISTCHAR-F55-003 routes contiene contratos principales', () => {
  for (const endpoint of [
    '/api/escuchas/asignaciones',
    '/api/escuchas/tareas',
    '/api/escuchas/mis-escuchas',
    '/api/escuchas/reactivar'
  ]) {
    assert.match(routes, new RegExp(endpoint.replaceAll('/', '\\/')));
  }

  assert.match(routes, /lotes\\\/\(\\d\+\)\\\/tickets/);
});

test('LISTCHAR-F55-004 controller conserva Token requerido', () => {
  assert.match(controller, /Token requerido/);
  assert.match(controller, /this\.requireToken/);
});

test('LISTCHAR-F55-005 fallbacks legacy de listas permanecen', () => {
  assert.match(
    controller,
    /ListeningsController\.json\(res, 500, \[\]\)/
  );
});

test('LISTCHAR-F55-006 audio proxy no fue absorbido', () => {
  assert.match(server, /\/api\/audio\/reproducir/);
  assert.match(server, /\/api\/audio\/verificar/);
});
