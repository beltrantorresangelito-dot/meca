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
    '../src/modules/audio-proxy/audio-proxy.routes.js'
  ),
  'utf8'
);

const controller = fs.readFileSync(
  path.resolve(
    __dirname,
    '../src/modules/audio-proxy/audio-proxy.controller.js'
  ),
  'utf8'
);

const service = fs.readFileSync(
  path.resolve(
    __dirname,
    '../src/modules/audio-proxy/audio-proxy.service.js'
  ),
  'utf8'
);

test('AUDIOFINAL-001 server importa y crea AudioProxyHandler', () => {
  assert.match(server, /createAudioProxyHandler/);
  assert.match(server, /handleAudioProxyRequest/);
});

test('AUDIOFINAL-002 endpoints ya no están inline en server', () => {
  assert.doesNotMatch(
    server,
    /if \(ruta\.startsWith\('\/api\/audio\/reproducir\/'\)/
  );

  assert.doesNotMatch(
    server,
    /if \(ruta\.startsWith\('\/api\/audio\/verificar\/'\)/
  );
});

test('AUDIOFINAL-003 PYTHON_API_URL es único y se declara antes del handler', () => {
  assert.equal(
    (server.match(/const PYTHON_API_URL/g) || []).length,
    1
  );

  const config = server.indexOf('const PYTHON_API_URL');
  const handler = server.indexOf(
    'const handleAudioProxyRequest = createAudioProxyHandler'
  );

  assert.ok(config >= 0);
  assert.ok(handler >= 0);
  assert.ok(config < handler);
});

test('AUDIOFINAL-004 routes conserva dos GET y extracción ticketId', () => {
  assert.ok(routes.includes('/api/audio/reproducir/'));
  assert.ok(routes.includes('/api/audio/verificar/'));

  assert.equal(
    (routes.match(/metodo === 'GET'/g) || []).length,
    2
  );

  assert.equal(
    (routes.match(/ruta\.split\('\/'\)\.pop\(\)/g) || []).length,
    2
  );
});

test('AUDIOFINAL-005 HTTP de reproducción vive en Controller', () => {
  assert.match(controller, /Ticket ID inválido/);
  assert.match(controller, /Accept-Ranges/);
  assert.match(controller, /Cache-Control/);
  assert.match(controller, /Content-Length/);
  assert.match(controller, /Content-Disposition/);
  assert.match(controller, /Error al obtener el audio/);
});

test('AUDIOFINAL-006 fallback verificar vive en Controller', () => {
  assert.match(controller, /existe: false/);
  assert.match(controller, /error: error\.message/);
});

test('AUDIOFINAL-007 gateway hacia Python vive en Service', () => {
  assert.match(service, /\/api\/audio\/reproducir\//);
  assert.match(service, /\/api\/audio\/verificar\//);
  assert.match(service, /this\.fetch/);
  assert.match(service, /response\.arrayBuffer\(\)/);
  assert.match(service, /Buffer\.from\(buffer\)/);
  assert.match(service, /response\.json\(\)/);
});

test('AUDIOFINAL-008 error Python conserva status y máximo 300 chars', () => {
  assert.match(service, /proxyError\.status = response\.status/);
  assert.match(service, /substring\(0, 300\)/);
});

test('AUDIOFINAL-009 configuración conserva override y fallbacks', () => {
  assert.match(server, /process\.env\.PYTHON_API_URL/);
  assert.match(server, /process\.env\.NODE_ENV === 'production'/);
  assert.match(server, /http:\/\/10\.4\.240\.68:5001/);
  assert.match(server, /http:\/\/localhost:5001/);
});

test('AUDIOFINAL-010 módulos cerrados siguen registrados', () => {
  assert.match(server, /handleEvaluationsRequest/);
  assert.match(server, /handleSessionsRequest/);
  assert.match(server, /handleRequestsRequest/);
  assert.match(server, /handlePdaRequest/);
  assert.match(server, /handleQuartileCriteriaRequest/);
  assert.match(server, /handleVersionsRequest/);
  assert.match(server, /handleDatabaseStatusRequest/);
});
