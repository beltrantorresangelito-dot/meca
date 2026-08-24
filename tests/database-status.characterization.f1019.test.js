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
    '../src/modules/database-status/database-status.routes.js'
  ),
  'utf8'
);

test('DBSTAT-F1023-001 server registra dispatcher', () => {
  assert.match(
    server,
    /createDatabaseStatusHandler/
  );

  assert.match(
    server,
    /handleDatabaseStatusRequest/
  );
});

test('DBSTAT-F1023-002 dos contratos migraron a routes', () => {
  assert.ok(
    routes.includes('/api/estado-bd')
  );

  assert.ok(
    routes.includes('/api/estado-bd/tablas')
  );

  const gets =
    routes.match(/metodo === 'GET'/g) || [];

  assert.equal(gets.length, 2);
});

test('DBSTAT-F1023-003 Token requerido migró a routes', () => {
  assert.match(routes, /function requireToken/);
  assert.match(routes, /Token requerido/);
  assert.match(routes, /401/);
});

test('DBSTAT-F1023-004 server ya no conoce capas internas', () => {
  assert.doesNotMatch(
    server,
    /databaseStatusRepository\./
  );

  assert.doesNotMatch(
    server,
    /databaseStatusService\./
  );

  assert.doesNotMatch(
    server,
    /databaseStatusController\./
  );
});

test('DBSTAT-F1023-005 módulos previos permanecen protegidos', () => {
  assert.match(server, /handleEvaluationsRequest/);
  assert.match(server, /handleSessionsRequest/);
  assert.match(server, /handleRequestsRequest/);
  assert.match(server, /handlePdaRequest/);
  assert.match(server, /handleQuartileCriteriaRequest/);
  assert.match(server, /handleVersionsRequest/);
});
