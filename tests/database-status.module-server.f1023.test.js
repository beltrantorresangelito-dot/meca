const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(
  path.resolve(__dirname, '../server.js'),
  'utf8'
);

test('DBSTATMOD-SERVER-001 server delega al módulo', () => {
  assert.match(
    source,
    /createDatabaseStatusHandler/
  );

  assert.match(
    source,
    /handleDatabaseStatusRequest/
  );
});

test('DBSTATMOD-SERVER-002 handlers Estado BD ya no están inline', () => {
  assert.doesNotMatch(
    source,
    /if \(ruta === '\/api\/estado-bd'/
  );

  assert.doesNotMatch(
    source,
    /if \(ruta === '\/api\/estado-bd\/tablas'/
  );
});

test('DBSTATMOD-SERVER-003 server no instancia capas internas', () => {
  assert.doesNotMatch(
    source,
    /new DatabaseStatusRepository/
  );

  assert.doesNotMatch(
    source,
    /new DatabaseStatusService/
  );

  assert.doesNotMatch(
    source,
    /new DatabaseStatusController/
  );
});

test('DBSTATMOD-SERVER-004 módulos previos siguen modularizados', () => {
  assert.match(source, /handleEvaluationsRequest/);
  assert.match(source, /handleSessionsRequest/);
  assert.match(source, /handleRequestsRequest/);
  assert.match(source, /handlePdaRequest/);
  assert.match(source, /handleQuartileCriteriaRequest/);
  assert.match(source, /handleVersionsRequest/);
});
