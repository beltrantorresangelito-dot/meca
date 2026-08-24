const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const server = fs.readFileSync(
  path.resolve(__dirname, '../server.js'),
  'utf8'
);

const routes = fs.readFileSync(
  path.resolve(__dirname, '../src/modules/listenings/listenings.routes.js'),
  'utf8'
);

const controller = fs.readFileSync(
  path.resolve(__dirname, '../src/modules/listenings/listenings.controller.js'),
  'utf8'
);

test('LISTCHAR-F55-001 server registra dispatcher Listenings', () => {
  assert.match(server, /createListeningsHandler/);
  assert.match(server, /handleListeningsRequest/);
});

test('LISTCHAR-F55-002 rutas Escuchas ya no están inline en server', () => {
  assert.doesNotMatch(
    server,
    /if \(ruta === '\/api\/escuchas\/asignaciones'/
  );
  assert.doesNotMatch(
    server,
    /ruta\.match\(\/\^\\\/api\\\/escuchas/
  );
});

test('LISTCHAR-F55-003 routes contiene contratos principales', () => {
  for (const endpoint of [
    '/api/escuchas/asignaciones',
    '/api/escuchas/tareas',
    '/api/escuchas/mis-escuchas',
    '/api/escuchas/reactivar'
  ]) {
    assert.match(routes, new RegExp(endpoint.replaceAll('/', '\\/')));
  }

  assert.match(routes, /lotes\\\/\(\\d\+\)\\\/tickets/);
});

test('LISTCHAR-F55-004 controller conserva Token requerido', () => {
  assert.match(controller, /Token requerido/);
  assert.match(controller, /this\.requireToken/);
});

test('LISTCHAR-F55-005 fallbacks legacy de listas permanecen', () => {
  assert.match(
    controller,
    /ListeningsController\.json\(res, 500, \[\]\)/
  );
});

test('LISTCHAR-F55-006 audio proxy no fue absorbido', () => {
  // F10.28.1:
  // Audio Proxy continúa separado del dominio Listenings,
  // pero desde F10.28 ya no debe permanecer inline en server.js.
  const fsLocal = require('fs');
  const pathLocal = require('path');

  const serverActual = fsLocal.readFileSync(
    pathLocal.resolve(__dirname, '../server.js'),
    'utf8'
  );

  const listeningsRoutes = fsLocal.readFileSync(
    pathLocal.resolve(
      __dirname,
      '../src/modules/listenings/listenings.routes.js'
    ),
    'utf8'
  );

  const audioRoutes = fsLocal.readFileSync(
    pathLocal.resolve(
      __dirname,
      '../src/modules/audio-proxy/audio-proxy.routes.js'
    ),
    'utf8'
  );

  // server.js debe delegar Audio Proxy a su módulo independiente.
  assert.match(
    serverActual,
    /createAudioProxyHandler/
  );

  assert.match(
    serverActual,
    /handleAudioProxyRequest/
  );

  // Listenings no debe absorber las rutas del proxy.
  assert.doesNotMatch(
    listeningsRoutes,
    /\/api\/audio\/reproducir/
  );

  assert.doesNotMatch(
    listeningsRoutes,
    /\/api\/audio\/verificar/
  );

  // Las rutas siguen existiendo, ahora en AudioProxyRoutes.
  assert.match(
    audioRoutes,
    /\/api\/audio\/reproducir\//
  );

  assert.match(
    audioRoutes,
    /\/api\/audio\/verificar\//
  );

  // No deben volver a quedar handlers inline en server.js.
  assert.doesNotMatch(
    serverActual,
    /if \(ruta\.startsWith\('\/api\/audio\/reproducir\/'\)/
  );

  assert.doesNotMatch(
    serverActual,
    /if \(ruta\.startsWith\('\/api\/audio\/verificar\/'\)/
  );
});

