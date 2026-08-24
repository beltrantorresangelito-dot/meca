const test = require('node:test');
const assert = require('node:assert/strict');

const {
  DatabaseStatusRepository,
  DatabaseStatusService,
  DatabaseStatusController,
  createDatabaseStatusHandler
} = require('../src/modules/database-status');

test('DBSTATMOD-001 index exporta cuatro piezas', () => {
  assert.equal(
    typeof DatabaseStatusRepository,
    'function'
  );

  assert.equal(
    typeof DatabaseStatusService,
    'function'
  );

  assert.equal(
    typeof DatabaseStatusController,
    'function'
  );

  assert.equal(
    typeof createDatabaseStatusHandler,
    'function'
  );
});

test('DBSTATMOD-002 ruta ajena devuelve false', async () => {
  const handler = createDatabaseStatusHandler({
    db: {
      query: async () => ({ rows: [] })
    }
  });

  assert.equal(
    await handler({
      ruta: '/api/otra',
      metodo: 'GET',
      peticion: { headers: {} },
      respuesta: {}
    }),
    false
  );
});

test('DBSTATMOD-003 estado sin token devuelve 401', async () => {
  const handler = createDatabaseStatusHandler({
    db: {
      query: async () => ({ rows: [] })
    }
  });

  let status;
  let payload;

  await handler({
    ruta: '/api/estado-bd',
    metodo: 'GET',
    peticion: {
      headers: {}
    },
    respuesta: {
      writeHead(code) {
        status = code;
      },
      end(body) {
        payload = JSON.parse(body);
      }
    }
  });

  assert.equal(status, 401);
  assert.deepEqual(
    payload,
    { error: 'Token requerido' }
  );
});

test('DBSTATMOD-004 tablas sin token devuelve 401', async () => {
  const handler = createDatabaseStatusHandler({
    db: {
      query: async () => ({ rows: [] })
    }
  });

  let status;

  await handler({
    ruta: '/api/estado-bd/tablas',
    metodo: 'GET',
    peticion: {
      headers: {}
    },
    respuesta: {
      writeHead(code) {
        status = code;
      },
      end() {}
    }
  });

  assert.equal(status, 401);
});

test('DBSTATMOD-005 estado general conserva 200', async () => {
  const handler = createDatabaseStatusHandler({
    db: {
      async query(sql) {
        const q = String(sql);

        if (q.includes('pg_database_size')) {
          return {
            rows: [{ size_bytes: '1048576' }]
          };
        }

        if (q.includes('FROM pg_tables')) {
          return { rows: [] };
        }

        return { rows: [] };
      }
    }
  });

  let status;
  let payload;

  await handler({
    ruta: '/api/estado-bd',
    metodo: 'GET',
    peticion: {
      headers: {
        authorization: 'Bearer token'
      }
    },
    respuesta: {
      writeHead(code) {
        status = code;
      },
      end(body) {
        payload = JSON.parse(body);
      }
    }
  });

  assert.equal(status, 200);
  assert.equal(payload.totalSizeMB, 1);
});

test('DBSTATMOD-006 tablas conserva array simple', async () => {
  const handler = createDatabaseStatusHandler({
    db: {
      async query() {
        return {
          rows: [{
            tablename: 'usuarios',
            total_bytes: 1048576
          }]
        };
      }
    }
  });

  let status;
  let payload;

  await handler({
    ruta: '/api/estado-bd/tablas',
    metodo: 'GET',
    peticion: {
      headers: {
        authorization: 'Bearer token'
      }
    },
    respuesta: {
      writeHead(code) {
        status = code;
      },
      end(body) {
        payload = JSON.parse(body);
      }
    }
  });

  assert.equal(status, 200);
  assert.deepEqual(payload, [{
    tablename: 'usuarios',
    total_size_mb: 1,
    total_size_bytes: 1048576
  }]);
});
