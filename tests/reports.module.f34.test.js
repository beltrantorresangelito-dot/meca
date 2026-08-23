const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');

const {
  ReportsRepository,
  ReportsService,
  ReportsController,
  createReportsHandler
} = require('../src/modules/reports');

test('REPMOD-001 index exporta las cuatro piezas', () => {
  assert.equal(typeof ReportsRepository, 'function');
  assert.equal(typeof ReportsService, 'function');
  assert.equal(typeof ReportsController, 'function');
  assert.equal(typeof createReportsHandler, 'function');
});

test('REPMOD-002 handler devuelve false para ruta ajena', async () => {
  const handler = createReportsHandler({
    db: { query: async () => ({ rows: [] }) }
  });

  const handled = await handler({
    ruta: '/api/otra-cosa',
    metodo: 'GET',
    peticion: { headers: {} },
    respuesta: {},
    query: {}
  });

  assert.equal(handled, false);
});

test('REPMOD-003 kpis responde 200 con filas', async () => {
  const handler = createReportsHandler({
    db: {
      query: async sql => {
        assert.match(
          String(sql),
          /SELECT \* FROM evaluaciones ORDER BY timestamp DESC/
        );
        return { rows: [{ id: 1 }] };
      }
    }
  });

  let status;
  let body;

  const res = {
    writeHead(code) { status = code; },
    end(payload) { body = JSON.parse(payload); }
  };

  const handled = await handler({
    ruta: '/api/reportes/kpis',
    metodo: 'GET',
    peticion: { headers: {} },
    respuesta: res,
    query: {}
  });

  assert.equal(handled, true);
  assert.equal(status, 200);
  assert.deepEqual(body, [{ id: 1 }]);
});

test('REPMOD-004 meses sin token conserva 401', async () => {
  const handler = createReportsHandler({
    db: { query: async () => ({ rows: [] }) }
  });

  let status;
  let body;

  const res = {
    writeHead(code) { status = code; },
    end(payload) { body = JSON.parse(payload); }
  };

  await handler({
    ruta: '/api/reportes/meses-disponibles',
    metodo: 'GET',
    peticion: { headers: {} },
    respuesta: res,
    query: {}
  });

  assert.equal(status, 401);
  assert.deepEqual(body, { error: 'Token requerido' });
});

test('REPMOD-005 meses con error conserva 200 []', async () => {
  const handler = createReportsHandler({
    db: {
      query: async () => {
        throw new Error('db down');
      }
    }
  });

  let status;
  let body;

  const res = {
    writeHead(code) { status = code; },
    end(payload) { body = JSON.parse(payload); }
  };

  await handler({
    ruta: '/api/reportes/meses-disponibles',
    metodo: 'GET',
    peticion: { headers: { authorization: 'Bearer x' } },
    respuesta: res,
    query: {}
  });

  assert.equal(status, 200);
  assert.deepEqual(body, []);
});
