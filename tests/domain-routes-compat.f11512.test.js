const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  createDomainHandler,
  registerDomainRoutes
} = require(
  '../src/modules/domain/domain.routes'
);

test('F11512-001 exporta contrato moderno y legacy', () => {
  assert.equal(
    typeof createDomainHandler,
    'function'
  );

  assert.equal(
    typeof registerDomainRoutes,
    'function'
  );
});

test('F11512-002 adapter legacy registra seis GET', () => {
  const routes = {};

  const service = {};

  const registered =
    registerDomainRoutes(
      routes,
      { service }
    );

  assert.equal(
    registered.length,
    6
  );

  for (const route of registered) {
    assert.equal(
      typeof routes[route].GET,
      'function'
    );
  }
});

test('F11512-003 adapter no elimina rutas preexistentes', () => {
  const routes = {
    '/existente': {
      GET() {}
    }
  };

  registerDomainRoutes(
    routes,
    { service: {} }
  );

  assert.equal(
    typeof routes['/existente'].GET,
    'function'
  );
});

test('F11512-004 server no usa registerDomainRoutes', () => {
  const server = fs.readFileSync(
    path.resolve(__dirname, '../server.js'),
    'utf8'
  );

  assert.doesNotMatch(
    server,
    /registerDomainRoutes/
  );

  assert.match(
    server,
    /createDomainHandler/
  );
});

test('F11512-005 mini-router legacy no vuelve al server', () => {
  const server = fs.readFileSync(
    path.resolve(__dirname, '../server.js'),
    'utf8'
  );

  assert.doesNotMatch(
    server,
    /const routes\s*=\s*\{\}/
  );

  assert.doesNotMatch(
    server,
    /routes\[ruta\]/
  );

  assert.doesNotMatch(
    server,
    /function registrarRuta/
  );
});
