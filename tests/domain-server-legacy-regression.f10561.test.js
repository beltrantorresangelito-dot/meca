const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(
  path.resolve(__dirname, '../server.js'),
  'utf8'
);

test('DOMLEGACY-F10561-001 no reaparece registerDomainRoutes', () => {
  assert.doesNotMatch(
    source,
    /registerDomainRoutes/
  );
});

test('DOMLEGACY-F10561-002 no reaparece mini-router routes', () => {
  assert.doesNotMatch(
    source,
    /const routes\s*=\s*\{\}/
  );

  assert.doesNotMatch(
    source,
    /routes\[ruta\]/
  );
});

test('DOMLEGACY-F10561-003 composition root modular permanece', () => {
  for (const handler of [
    'handleUsersRequest',
    'handleRolesRequest',
    'handleEvaluationsRequest',
    'handleMatrixReadRequest',
    'handleMatrixWriteRequest',
    'handleGenericQueryRequest',
    'handleGenericRpcRequest'
  ]) {
    assert.match(
      source,
      new RegExp(handler)
    );
  }
});
