const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(
  path.resolve(__dirname, '../server.js'),
  'utf8'
);

test('HEALTHSERVER-001 server delega health', () => {
  assert.match(source, /createHealthHandler/);
  assert.match(source, /handleHealthRequest/);
});

test('HEALTHSERVER-002 health ya no usa registrarRuta', () => {
  assert.doesNotMatch(
    source,
    /registrarRuta\('GET', '\/api\/health'/
  );
});

test('HEALTHSERVER-003 SELECT NOW salió de server', () => {
  assert.doesNotMatch(
    source,
    /pool\.query\('SELECT NOW\(\)'\)/
  );
});

test('HEALTHSERVER-004 health conserva auth y authz previos', () => {
  const authz = source.indexOf('authorizeRequest({');
  const health = source.indexOf('handleHealthRequest({');

  assert.ok(authz >= 0);
  assert.ok(health >= 0);
  assert.ok(authz < health);
});

test('HEALTHSERVER-005 módulos previos siguen registrados', () => {
  for (const handler of [
    'handleHttpStaticViewsRequest',
    'handleGenericRpcRequest',
    'handleGenericQueryRequest',
    'handleMatrixRecalculationRequest'
  ]) {
    assert.match(source, new RegExp(handler));
  }
});
