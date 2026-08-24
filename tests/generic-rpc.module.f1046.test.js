const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');

const {
  GenericRpcRepository,
  GenericRpcService,
  GenericRpcController,
  createGenericRpcHandler
} = require('../src/modules/generic-rpc');

test('RPCMOD-001 index exporta cuatro piezas', () => {
  assert.equal(typeof GenericRpcRepository, 'function');
  assert.equal(typeof GenericRpcService, 'function');
  assert.equal(typeof GenericRpcController, 'function');
  assert.equal(typeof createGenericRpcHandler, 'function');
});

test('RPCMOD-002 ruta ajena devuelve false', async () => {
  const handler = createGenericRpcHandler({
    db: { query: async () => ({ rows: [] }) }
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

test('RPCMOD-003 fallback genérico responde 200', async () => {
  const handler = createGenericRpcHandler({
    db: {
      async query(sql, params) {
        assert.equal(
          String(sql),
          'SELECT * FROM mi_funcion($1)'
        );
        assert.deepEqual(params, [7]);

        return {
          rows: [{ ok: true }]
        };
      }
    }
  });

  const req = new EventEmitter();
  let status;
  let payload;

  const promise = handler({
    ruta: '/api/rpc/mi_funcion',
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
      id: 7
    }))
  );

  req.emit('end');

  const handled = await promise;

  assert.equal(handled, true);
  assert.equal(status, 200);
  assert.deepEqual(payload, {
    data: [{ ok: true }],
    error: null
  });
});

test('RPCMOD-004 body vacío se interpreta como {}', async () => {
  const handler = createGenericRpcHandler({
    db: {
      async query(sql) {
        assert.equal(
          String(sql),
          'SELECT * FROM mi_funcion()'
        );

        return {
          rows: []
        };
      }
    }
  });

  const req = new EventEmitter();
  let status;

  const promise = handler({
    ruta: '/api/rpc/mi_funcion',
    metodo: 'POST',
    peticion: req,
    respuesta: {
      writeHead(code) {
        status = code;
      },
      end() {}
    }
  });

  req.emit('end');
  await promise;

  assert.equal(status, 200);
});

test('RPCMOD-005 JSON inválido conserva fallback {} actual', async () => {
  const handler = createGenericRpcHandler({
    db: {
      async query(sql) {
        assert.equal(
          String(sql),
          'SELECT * FROM mi_funcion()'
        );

        return {
          rows: []
        };
      }
    }
  });

  const req = new EventEmitter();
  let status;

  const promise = handler({
    ruta: '/api/rpc/mi_funcion',
    metodo: 'POST',
    peticion: req,
    respuesta: {
      writeHead(code) {
        status = code;
      },
      end() {}
    }
  });

  req.emit('data', Buffer.from('{bad'));
  req.emit('end');

  await promise;

  assert.equal(status, 200);
});
