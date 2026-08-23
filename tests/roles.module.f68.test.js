const test = require('node:test');
const assert = require('node:assert/strict');

const {
  RolesRepository,
  RolesService,
  RolesController,
  createRolesHandler
} = require('../src/modules/roles');

test('ROLEMOD-001 index exporta cuatro piezas', () => {
  assert.equal(typeof RolesRepository, 'function');
  assert.equal(typeof RolesService, 'function');
  assert.equal(typeof RolesController, 'function');
  assert.equal(typeof createRolesHandler, 'function');
});

test('ROLEMOD-002 ruta ajena devuelve false', async () => {
  const handler = createRolesHandler({
    db: { query: async () => ({ rows: [] }) }
  });

  assert.equal(await handler({
    ruta: '/api/otra',
    metodo: 'GET',
    peticion: { headers: {} },
    respuesta: {}
  }), false);
});

test('ROLEMOD-003 roles sin token conserva 401', async () => {
  const handler = createRolesHandler({
    db: { query: async () => ({ rows: [] }) }
  });

  let status;
  let payload;

  await handler({
    ruta: '/api/roles',
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

test('ROLEMOD-004 redirect sin token conserva 401', async () => {
  const handler = createRolesHandler({
    db: { query: async () => ({ rows: [] }) }
  });

  let status;
  let payload;

  await handler({
    ruta: '/api/auth/redirect',
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
