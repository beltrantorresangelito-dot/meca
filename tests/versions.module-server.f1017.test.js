const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(
  path.resolve(__dirname, '../server.js'),
  'utf8'
);

test('VERMOD-SERVER-001 server delega al módulo', () => {
  assert.match(source, /createVersionsHandler/);
  assert.match(source, /handleVersionsRequest/);
});

test('VERMOD-SERVER-002 handlers Versiones ya no están inline', () => {
  assert.doesNotMatch(
    source,
    /if \(ruta === '\/api\/versiones'/
  );

  assert.doesNotMatch(
    source,
    /if \(ruta\.match\(\/\^\\\/api\\\/versiones/
  );
});

test('VERMOD-SERVER-003 server no instancia capas internas', () => {
  assert.doesNotMatch(source, /new VersionsRepository/);
  assert.doesNotMatch(source, /new VersionsService/);
  assert.doesNotMatch(source, /new VersionsController/);
});

test('VERMOD-SERVER-004 módulos previos siguen modularizados', () => {
  assert.match(source, /handleEvaluationsRequest/);
  assert.match(source, /handleSessionsRequest/);
  assert.match(source, /handleRequestsRequest/);
  assert.match(source, /handlePdaRequest/);
  assert.match(source, /handleQuartileCriteriaRequest/);
});
