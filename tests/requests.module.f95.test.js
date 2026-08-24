const test = require('node:test');
const assert = require('node:assert/strict');
const {
  RequestsRepository,
  RequestsService,
  RequestsController,
  createRequestsHandler
} = require('../src/modules/requests');

test('REQMOD-001 index exporta cuatro piezas', () => {
  assert.equal(typeof RequestsRepository, 'function');
  assert.equal(typeof RequestsService, 'function');
  assert.equal(typeof RequestsController, 'function');
  assert.equal(typeof createRequestsHandler, 'function');
});

test('REQMOD-002 ruta ajena devuelve false', async () => {
  const handler = createRequestsHandler({
    db: { query: async () => ({ rows: [] }) }
  });

  assert.equal(await handler({
    ruta: '/api/otra',
    metodo: 'GET',
    peticion: { headers: {} },
    respuesta: {},
    query: {}
  }), false);
});

test('REQMOD-003 GET por id sin token devuelve 401', async () => {
  const handler = createRequestsHandler({
    db: { query: async () => ({ rows: [] }) }
  });

  let status;
  let payload;

  await handler({
    ruta: '/api/solicitudes/1',
    metodo: 'GET',
    peticion: { headers: {} },
    respuesta: {
      writeHead(code) { status = code; },
      end(body) { payload = JSON.parse(body); }
    },
    query: {}
  });

  assert.equal(status, 401);
  assert.deepEqual(payload, { error: 'Token requerido' });
});

test('REQMOD-004 POST JSON inválido devuelve 400', async () => {
  const handler = createRequestsHandler({
    db: { query: async () => ({}) }
  });

  const req = {
    handlers: {},
    headers: {},
    on(event, fn) {
      this.handlers[event] = fn;
    }
  };

  let status;
  let payload;

  const promise = handler({
    ruta: '/api/solicitudes',
    metodo: 'POST',
    peticion: req,
    respuesta: {
      writeHead(code) { status = code; },
      end(body) { payload = JSON.parse(body); }
    },
    query: {}
  });

  req.handlers.data('{');
  req.handlers.end();

  await promise;

  assert.equal(status, 400);
  assert.ok(payload.error);
});
