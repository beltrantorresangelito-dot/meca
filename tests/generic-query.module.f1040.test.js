const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');

const {
  GenericQueryRepository,
  GenericQueryService,
  GenericQueryController,
  createGenericQueryHandler
} = require('../src/modules/generic-query');

test('GENQMOD-001 index exporta cuatro piezas', () => {
  assert.equal(typeof GenericQueryRepository, 'function');
  assert.equal(typeof GenericQueryService, 'function');
  assert.equal(typeof GenericQueryController, 'function');
  assert.equal(typeof createGenericQueryHandler, 'function');
});

test('GENQMOD-002 ruta ajena devuelve false', async () => {
  const handler = createGenericQueryHandler({
    db: {
      query: async () => ({
        rows: [],
        rowCount: 0
      })
    }
  });

  assert.equal(
    await handler({
      ruta: '/api/otra',
      metodo: 'POST',
      peticion: {},
      respuesta: {}
    }),
    false
  );
});

test('GENQMOD-003 POST select válido devuelve 200', async () => {
  const handler = createGenericQueryHandler({
    db: {
      async query() {
        return {
          rows: [{ id: 1 }],
          rowCount: 1
        };
      }
    }
  });

  const req = new EventEmitter();
  let status;
  let payload;

  const promise = handler({
    ruta: '/api/query',
    metodo: 'POST',
    peticion: req,
    respuesta: {
      writeHead(code) {
        status = code;
      },
      end(body) {
        payload = JSON.parse(body);
      }
    }
  });

  req.emit(
    'data',
    Buffer.from(JSON.stringify({
      table: 'usuarios',
      operation: 'select'
    }))
  );

  req.emit('end');

  const handled = await promise;

  assert.equal(handled, true);
  assert.equal(status, 200);
  assert.deepEqual(payload, {
    data: [{ id: 1 }],
    count: 1
  });
});

test('GENQMOD-004 JSON inválido devuelve 400 Payload inválido', async () => {
  const handler = createGenericQueryHandler({
    db: {
      query: async () => ({
        rows: [],
        rowCount: 0
      })
    }
  });

  const req = new EventEmitter();
  let status;
  let payload;

  const promise = handler({
    ruta: '/api/query',
    metodo: 'POST',
    peticion: req,
    respuesta: {
      writeHead(code) {
        status = code;
      },
      end(body) {
        payload = JSON.parse(body);
      }
    }
  });

  req.emit('data', Buffer.from('{bad'));
  req.emit('end');

  await promise;

  assert.equal(status, 400);
  assert.equal(payload.error, 'Payload inválido');
});

test('GENQMOD-005 update sin filtros devuelve 400', async () => {
  const handler = createGenericQueryHandler({
    db: {
      query: async () => ({
        rows: [],
        rowCount: 0
      })
    }
  });

  const req = new EventEmitter();
  let status;
  let payload;

  const promise = handler({
    ruta: '/api/query',
    metodo: 'POST',
    peticion: req,
    respuesta: {
      writeHead(code) {
        status = code;
      },
      end(body) {
        payload = JSON.parse(body);
      }
    }
  });

  req.emit(
    'data',
    Buffer.from(JSON.stringify({
      table: 'usuarios',
      operation: 'update',
      data: {
        activo: false
      },
      filters: []
    }))
  );

  req.emit('end');
  await promise;

  assert.equal(status, 400);
  assert.equal(
    payload.error,
    'UPDATE requiere al menos un filtro'
  );
});
