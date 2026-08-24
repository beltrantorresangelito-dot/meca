const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(
  path.resolve(__dirname, '../server.js'),
  'utf8'
);

test('REQMOD-SERVER-001 server delega al módulo', () => {
  assert.match(source, /createRequestsHandler/);
  assert.match(source, /handleRequestsRequest/);
});

test('REQMOD-SERVER-002 handlers Requests ya no están inline', () => {
  assert.doesNotMatch(source, /if \(ruta === '\/api\/solicitudes'/);
  assert.doesNotMatch(source, /if \(ruta\.match\(\/\^\\\/api\\\/solicitudes/);
});

test('REQMOD-SERVER-003 server no instancia capas internas', () => {
  assert.doesNotMatch(source, /new RequestsRepository/);
  assert.doesNotMatch(source, /new RequestsService/);
  assert.doesNotMatch(source, /new RequestsController/);
});

test('REQMOD-SERVER-004 F7 y F8 siguen modularizados', () => {
  assert.match(source, /createEvaluationsHandler/);
  assert.match(source, /handleEvaluationsRequest/);
  assert.match(source, /createSessionsHandler/);
  assert.match(source, /handleSessionsRequest/);
});
