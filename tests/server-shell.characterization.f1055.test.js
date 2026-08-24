const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(
  path.resolve(__dirname, '../server.js'),
  'utf8'
);

test('SHELL-F1055-001 no queda SQL directo en server', () => {
  assert.doesNotMatch(source, /pool\.query\s*\(/);
  assert.doesNotMatch(source, /pool\.connect\s*\(/);
});

test('SHELL-F1055-002 no quedan funciones declaradas inline', () => {
  assert.doesNotMatch(
    source,
    /^(?:async\s+)?function\s+[A-Za-z_$][\w$]*\s*\(/m
  );
});

test('SHELL-F1055-003 callback HTTP conserva CORS y OPTIONS', () => {
  assert.match(source, /applyCors\(peticion, respuesta\)/);
  assert.match(source, /peticion\.method === 'OPTIONS'/);
  assert.match(source, /respuesta\.writeHead\(204\)/);
});

test('SHELL-F1055-004 parsing URL central permanece', () => {
  assert.match(
    source,
    /url\.parse\(peticion\.url \|\| '', true\)/
  );
  assert.match(
    source,
    /const ruta = urlParseada\.pathname \|\| '\/'/
  );
});

test('SHELL-F1055-005 validación Bearer central permanece', () => {
  assert.match(source, /headers\['authorization'\]/);
  assert.match(source, /verifyToken\(bearer/);
  assert.match(source, /peticion\.auth = verification\.payload/);
});

test('SHELL-F1055-006 autorización central permanece', () => {
  assert.match(source, /authorizeRequest\(\{/);
  assert.match(source, /authorization\.allowed/);
});

test('SHELL-F1055-007 server es orquestador de handlers', () => {
  const handlers = [
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
  ];

  for (const handler of handlers) {
    assert.match(source, new RegExp(handler));
  }
});

test('SHELL-F1055-008 fallback 404 permanece', () => {
  assert.match(source, /error: 'Ruta no encontrada'/);
});

test('SHELL-F1055-009 listen permanece en bootstrap', () => {
  assert.match(source, /servidor\.listen\(PORT, HOST/);
});

test('SHELL-F1056-010 imports fs y path ya fueron eliminados', () => {
  assert.doesNotMatch(source, /require\('fs'\)/);
  assert.doesNotMatch(source, /require\('path'\)/);
});

test('SHELL-F1056-011 registerDomainRoutes ya fue eliminado', () => {
  assert.doesNotMatch(
    source,
    /\bregisterDomainRoutes\b/
  );
});

test('SHELL-F1055-012 no queda mini-router legacy', () => {
  assert.doesNotMatch(source, /const routes\s*=\s*\{\}/);
  assert.doesNotMatch(source, /function registrarRuta/);
  assert.doesNotMatch(source, /routes\[ruta\]/);
});
