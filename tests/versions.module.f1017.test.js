const test = require('node:test');
const assert = require('node:assert/strict');

const {
  VersionsRepository,
  VersionsService,
  VersionsController,
  createVersionsHandler
} = require('../src/modules/versions');

test('VERMOD-001 index exporta cuatro piezas', () => {
  assert.equal(typeof VersionsRepository, 'function');
  assert.equal(typeof VersionsService, 'function');
  assert.equal(typeof VersionsController, 'function');
  assert.equal(typeof createVersionsHandler, 'function');
});

test('VERMOD-002 ruta ajena devuelve false', async () => {
  const handler = createVersionsHandler({
    db: { query: async () => ({ rows: [] }) }
  });

  assert.equal(
    await handler({
      ruta: '/api/otra',
      metodo: 'GET',
      peticion: { headers: {} },
      respuesta: {},
      urlParseada: { query: {} }
    }),
    false
  );
});

test('VERMOD-003 GET sin token devuelve 401', async () => {
  const handler = createVersionsHandler({
    db: { query: async () => ({ rows: [] }) }
  });

  let status;
  let payload;

  await handler({
    ruta: '/api/versiones',
    metodo: 'GET',
    peticion: { headers: {} },
    respuesta: {
      writeHead(code) { status = code; },
      end(body) { payload = JSON.parse(body); }
    },
    urlParseada: { query: {} }
  });

  assert.equal(status, 401);
  assert.deepEqual(payload, { error: 'Token requerido' });
});

test('VERMOD-004 GET conserva query tipo', async () => {
  let params;

  const handler = createVersionsHandler({
    db: {
      async query(sql, p) {
        params = p;
        return { rows: [] };
      }
    }
  });

  let status;

  await handler({
    ruta: '/api/versiones',
    metodo: 'GET',
    peticion: {
      headers: { authorization: 'Bearer token' }
    },
    respuesta: {
      writeHead(code) { status = code; },
      end() {}
    },
    urlParseada: {
      query: { tipo: 'frontend' }
    }
  });

  assert.equal(status, 200);
  assert.deepEqual(params, ['frontend']);
});

test('VERMOD-005 POST JSON inválido devuelve 400', async () => {
  const handler = createVersionsHandler({
    db: { query: async () => ({ rows: [] }) }
  });

  const req = {
    handlers: {},
    headers: {
      authorization: 'Bearer token'
    },
    on(event, fn) {
      this.handlers[event] = fn;
    }
  };

  let status;
  let payload;

  const promise = handler({
    ruta: '/api/versiones',
    metodo: 'POST',
    peticion: req,
    respuesta: {
      writeHead(code) { status = code; },
      end(body) { payload = JSON.parse(body); }
    },
    urlParseada: { query: {} }
  });

  req.handlers.data('{');
  req.handlers.end();

  await promise;

  assert.equal(status, 400);
  assert.ok(payload.error);
});

test('VERMOD-006 activar conserva id y tipo', async () => {
  const calls = [];

  const handler = createVersionsHandler({
    db: {
      async query(sql, params) {
        calls.push({ sql: String(sql), params });

        if (String(sql).includes('SET es_activo = true')) {
          return { rows: [{ id: 7 }] };
        }

        return { rowCount: 1, rows: [] };
      }
    }
  });

  let status;

  await handler({
    ruta: '/api/versiones/7/activar',
    metodo: 'PUT',
    peticion: {
      headers: { authorization: 'Bearer token' }
    },
    respuesta: {
      writeHead(code) { status = code; },
      end() {}
    },
    urlParseada: {
      query: { tipo: 'frontend' }
    }
  });

  assert.equal(status, 200);
  assert.ok(
    calls.some(c =>
      c.sql.includes('SET es_activo = false') &&
      c.params[0] === 'frontend'
    )
  );
  assert.ok(
    calls.some(c =>
      c.sql.includes('SET es_activo = true') &&
      c.params[0] === 7
    )
  );
});

test('VERMOD-007 DELETE conserva borrado físico', async () => {
  let sql;

  const handler = createVersionsHandler({
    db: {
      async query(q) {
        sql = String(q);
        return { rows: [{ id: 9 }] };
      }
    }
  });

  let status;

  await handler({
    ruta: '/api/versiones/9',
    metodo: 'DELETE',
    peticion: {
      headers: { authorization: 'Bearer token' }
    },
    respuesta: {
      writeHead(code) { status = code; },
      end() {}
    },
    urlParseada: { query: {} }
  });

  assert.equal(status, 200);
  assert.match(sql, /DELETE FROM versiones_sistema/);
});
