const test = require('node:test');
const assert = require('node:assert/strict');

const {
  AgentsRepository,
  AgentsService,
  AgentsController,
  createAgentsHandler
} = require('../src/modules/agents');

test('AGMOD-001 index exporta las cuatro piezas', () => {
  assert.equal(typeof AgentsRepository, 'function');
  assert.equal(typeof AgentsService, 'function');
  assert.equal(typeof AgentsController, 'function');
  assert.equal(typeof createAgentsHandler, 'function');
});

test('AGMOD-002 handler devuelve false para ruta ajena', async () => {
  const handler = createAgentsHandler({
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

test('AGMOD-003 listado sin token conserva 401', async () => {
  const handler = createAgentsHandler({
    db: { query: async () => ({ rows: [] }) }
  });

  let status;
  let body;

  const res = {
    writeHead(code) { status = code; },
    end(payload) { body = JSON.parse(payload); }
  };

  await handler({
    ruta: '/api/agentes',
    metodo: 'GET',
    peticion: { headers: {} },
    respuesta: res,
    query: {}
  });

  assert.equal(status, 401);
  assert.deepEqual(body, { error: 'Token requerido' });
});

test('AGMOD-004 completo conserva contrato sin auth local', async () => {
  const handler = createAgentsHandler({
    db: {
      query: async sql => {
        assert.match(String(sql), /SELECT \* FROM agentes ORDER BY id/);
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

  await handler({
    ruta: '/api/agentes/completo',
    metodo: 'GET',
    peticion: { headers: {} },
    respuesta: res,
    query: {}
  });

  assert.equal(status, 200);
  assert.deepEqual(body, [{ id: 1 }]);
});

test('AGMOD-005 categorias con error conserva 500 []', async () => {
  const handler = createAgentsHandler({
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
    ruta: '/api/agentes/categorias',
    metodo: 'GET',
    peticion: {
      headers: { authorization: 'Bearer x' }
    },
    respuesta: res,
    query: {}
  });

  assert.equal(status, 500);
  assert.deepEqual(body, []);
});
