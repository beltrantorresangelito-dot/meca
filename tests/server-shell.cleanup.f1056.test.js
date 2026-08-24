const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(
  path.resolve(__dirname, '../server.js'),
  'utf8'
);

test('SHELLCLEAN-F1056-001 imports muertos eliminados', () => {
  assert.doesNotMatch(source, /require\('fs'\)/);
  assert.doesNotMatch(source, /require\('path'\)/);
  assert.doesNotMatch(source, /registerDomainRoutes/);
});

test('SHELLCLEAN-F1056-002 seguridad central intacta', () => {
  assert.match(source, /applyCors\(peticion, respuesta\)/);
  assert.match(source, /verifyToken\(bearer/);
  assert.match(source, /authorizeRequest\(\{/);
});

test('SHELLCLEAN-F1056-003 orden crítico preservado', () => {
  const authz = source.indexOf('authorizeRequest({');
  const health = source.indexOf('handleHealthRequest({');
  const users = source.indexOf('handleUsersRequest({');
  const staticViews = source.indexOf('handleHttpStaticViewsRequest({');
  const fallback = source.indexOf("error: 'Ruta no encontrada'");

  assert.ok(authz >= 0);
  assert.ok(health > authz);
  assert.ok(users > health);
  assert.ok(staticViews > users);
  assert.ok(fallback > staticViews);
});

test('SHELLCLEAN-F1056-004 todos los handlers permanecen', () => {
  for (const handler of [
    'handleHealthRequest',
    'handleUsersRequest',
    'handleRolesRequest',
    'handleAudioProxyRequest',
    'handleHttpStaticViewsRequest',
    'handleRequestsRequest',
    'handleEvaluationsRequest',
    'handleAgentsRequest',
    'handleListeningsRequest',
    'handleReportsRequest',
    'handlePdaRequest',
    'handleSessionsRequest',
    'handleMatrixRecalculationRequest',
    'handleGenericQueryRequest',
    'handleGenericRpcRequest',
    'handleDatabaseStatusRequest',
    'handleVersionsRequest',
    'handleMatrixReadRequest',
    'handleMatrixWriteRequest',
    'handleQuartileCriteriaRequest'
  ]) {
    assert.match(source, new RegExp(handler));
  }
});

test('SHELLCLEAN-F1056-005 fallback y listen permanecen', () => {
  assert.match(source, /Ruta no encontrada/);
  assert.match(source, /servidor\.listen\(PORT, HOST/);
});
