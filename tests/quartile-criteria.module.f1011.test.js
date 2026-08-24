const test = require('node:test');
const assert = require('node:assert/strict');

const {
  QuartileCriteriaRepository,
  QuartileCriteriaService,
  QuartileCriteriaController,
  createQuartileCriteriaHandler
} = require('../src/modules/quartile-criteria');

test('CQMOD-001 index exporta cuatro piezas', () => {
  assert.equal(typeof QuartileCriteriaRepository, 'function');
  assert.equal(typeof QuartileCriteriaService, 'function');
  assert.equal(typeof QuartileCriteriaController, 'function');
  assert.equal(typeof createQuartileCriteriaHandler, 'function');
});

test('CQMOD-002 ruta ajena devuelve false', async () => {
  const handler = createQuartileCriteriaHandler({
    db: { query: async () => ({ rows: [] }) }
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

test('CQMOD-003 GET sin token devuelve 401', async () => {
  const handler = createQuartileCriteriaHandler({
    db: { query: async () => ({ rows: [] }) }
  });

  let status;
  let payload;

  await handler({
    ruta: '/api/criterios-cuartiles',
    metodo: 'GET',
    peticion: { headers: {} },
    respuesta: {
      writeHead(code) { status = code; },
      end(body) { payload = JSON.parse(body); }
    }
  });

  assert.equal(status, 401);
  assert.deepEqual(payload, { error: 'Token requerido' });
});

test('CQMOD-004 POST JSON inválido devuelve 400', async () => {
  const handler = createQuartileCriteriaHandler({
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
    ruta: '/api/criterios-cuartiles',
    metodo: 'POST',
    peticion: req,
    respuesta: {
      writeHead(code) { status = code; },
      end(body) { payload = JSON.parse(body); }
    }
  });

  req.handlers.data('{');
  req.handlers.end();

  await promise;

  assert.equal(status, 400);
  assert.equal(payload.success, false);
  assert.ok(payload.error);
});

test('CQMOD-005 DELETE conserva desactivación lógica', async () => {
  const calls = [];

  const handler = createQuartileCriteriaHandler({
    db: {
      async query(sql, params) {
        calls.push({ sql: String(sql), params });

        if (String(sql).includes('SELECT id, nombre')) {
          return { rows: [{ id: 7, nombre: 'Uno' }] };
        }

        if (String(sql).includes('SET activo = false')) {
          return { rowCount: 1 };
        }

        return { rows: [] };
      }
    }
  });

  let status;

  await handler({
    ruta: '/api/criterios-cuartiles/7',
    metodo: 'DELETE',
    peticion: {
      headers: { authorization: 'Bearer token' }
    },
    respuesta: {
      writeHead(code) { status = code; },
      end() {}
    }
  });

  assert.equal(status, 200);
  assert.ok(calls.some(c => c.sql.includes('SET activo = false')));
  assert.ok(!calls.some(c => c.sql.includes('DELETE FROM')));
});

test('CQMOD-006 activar reconoce id de ruta', async () => {
  let params;

  const handler = createQuartileCriteriaHandler({
    db: {
      async query(sql, p) {
        params = p;
        return { rows: [{ id: 12, activo: true }] };
      }
    }
  });

  let status;

  await handler({
    ruta: '/api/criterios-cuartiles/12/activar',
    metodo: 'POST',
    peticion: {
      headers: { authorization: 'Bearer token' }
    },
    respuesta: {
      writeHead(code) { status = code; },
      end() {}
    }
  });

  assert.equal(status, 200);
  assert.deepEqual(params, [12]);
});
