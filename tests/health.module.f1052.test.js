const test = require('node:test');
const assert = require('node:assert/strict');

const {
  createHealthHandler
} = require('../src/modules/health');

function output() {
  let status;
  let payload;

  return {
    res: {
      writeHead(code) {
        status = code;
      },
      end(body) {
        payload = JSON.parse(body);
      }
    },
    get() {
      return { status, payload };
    }
  };
}

test('HEALTHMOD-001 ruta ajena devuelve false', async () => {
  const handler = createHealthHandler({
    db: {
      query: async () => ({ rows: [] })
    }
  });

  assert.equal(
    await handler({
      ruta: '/api/x',
      metodo: 'GET',
      respuesta: {}
    }),
    false
  );
});

test('HEALTHMOD-002 éxito conserva contrato legacy', async () => {
  const out = output();
  const date = new Date('2026-08-24T17:54:25.327Z');

  const handler = createHealthHandler({
    db: {
      async query() {
        return {
          rows: [{ now: date }]
        };
      }
    }
  });

  const handled = await handler({
    ruta: '/api/health',
    metodo: 'GET',
    respuesta: out.res
  });

  assert.equal(handled, true);
  assert.equal(out.get().status, 200);
  assert.deepEqual(
    {
      status: out.get().payload.status,
      message: out.get().payload.message,
      version: out.get().payload.version,
      database: out.get().payload.database
    },
    {
      status: 'ok',
      message: 'Servidor MECA funcionando (PostgreSQL local)',
      version: '2.0.0',
      database: 'conectado (2026-08-24T17:54:25.327Z)'
    }
  );
  assert.ok(out.get().payload.timestamp);
});

test('HEALTHMOD-003 error DB sigue devolviendo 200', async () => {
  const out = output();

  const handler = createHealthHandler({
    db: {
      async query() {
        throw new Error('db down');
      }
    }
  });

  await handler({
    ruta: '/api/health',
    metodo: 'GET',
    respuesta: out.res
  });

  assert.equal(out.get().status, 200);
  assert.equal(out.get().payload.status, 'ok');
  assert.equal(
    out.get().payload.database,
    'error: db down'
  );
});
