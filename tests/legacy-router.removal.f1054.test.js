const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(
  path.resolve(__dirname, '../server.js'),
  'utf8'
);

test('LEGROUTERREMOVE-001 routes legacy eliminado', () => {
  assert.doesNotMatch(
    source,
    /const routes\s*=\s*\{\}/
  );
});

test('LEGROUTERREMOVE-002 registrarRuta eliminado', () => {
  assert.doesNotMatch(
    source,
    /function registrarRuta\s*\(/
  );
});

test('LEGROUTERREMOVE-003 branch routes[ruta] eliminado', () => {
  assert.doesNotMatch(
    source,
    /routes\[ruta\]/
  );
});

test('LEGROUTERREMOVE-004 health sigue modularizado', () => {
  assert.match(
    source,
    /handleHealthRequest/
  );
});

test('LEGROUTERREMOVE-005 autorización central permanece', () => {
  assert.match(
    source,
    /authorizeRequest\(\{/
  );
});

test('LEGROUTERREMOVE-006 fallback 404 permanece', () => {
  assert.match(
    source,
    /Ruta no encontrada|Not Found|404/
  );
});

test('LEGROUTERREMOVE-007 handlers principales siguen registrados', () => {
  for (const handler of [
    'handleUsersRequest',
    'handleRolesRequest',
    'handleEvaluationsRequest',
    'handleSessionsRequest',
    'handleReportsRequest',
    'handleRequestsRequest',
    'handleGenericQueryRequest',
    'handleGenericRpcRequest',
    'handleHealthRequest',
    'handleHttpStaticViewsRequest'
  ]) {
    assert.match(source, new RegExp(handler));
  }
});
