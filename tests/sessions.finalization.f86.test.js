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
    '../src/modules/sessions/sessions.routes.js'
  ),
  'utf8'
);

test('SESSFINAL-001 único punto de entrada en server es handleSessionsRequest', () => {
  assert.match(server, /await handleSessionsRequest\(\{/);
  assert.doesNotMatch(server, /if \(ruta === '\/api\/sesiones\/crear'/);
  assert.doesNotMatch(server, /if \(ruta === '\/api\/sesiones\/cerrar'/);
  assert.doesNotMatch(server, /if \(ruta === '\/api\/historial-login'/);
});

test('SESSFINAL-002 server ya no instancia capas internas de Sessions', () => {
  assert.doesNotMatch(server, /new SessionsRepository/);
  assert.doesNotMatch(server, /new SessionsService/);
  assert.doesNotMatch(server, /new SessionsController/);
});

test('SESSFINAL-003 routes conserva cinco contratos principales', () => {
  assert.match(routes, /ruta === '\/api\/sesiones\/crear'/);
  assert.match(routes, /ruta\.match\(\/\^\\\/api\\\/sesiones\\\/usuarios\\\/\(\\d\+\)\$\//);
  assert.match(routes, /ruta === '\/api\/sesiones\/cerrar'/);
  assert.match(routes, /cerrar-todas/);
  assert.match(routes, /ruta === '\/api\/historial-login'/);
});

test('SESSFINAL-004 Token requerido sigue preservado', () => {
  assert.match(routes, /function requireToken/);
  assert.match(routes, /Token requerido/);
  assert.match(routes, /401/);
});

test('SESSFINAL-005 historial-login sigue tolerante a fallos', () => {
  assert.match(
    routes,
    /SessionsController\.json\(\s*respuesta,\s*200/
  );
});

test('SESSFINAL-006 F7 Evaluations continúa modularizado', () => {
  assert.match(server, /createEvaluationsHandler/);
  assert.match(server, /handleEvaluationsRequest/);
  assert.doesNotMatch(
    server,
    /SELECT \* FROM evaluaciones WHERE 1=1/
  );
});
