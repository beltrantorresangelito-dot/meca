const test = require('node:test');
const assert = require('node:assert/strict');

const {
  UsersRepository,
  UsersService,
  UsersController,
  createUsersHandler
} = require('../src/modules/users');

test('USRMOD-001 index exporta cuatro piezas', () => {
  assert.equal(typeof UsersRepository, 'function');
  assert.equal(typeof UsersService, 'function');
  assert.equal(typeof UsersController, 'function');
  assert.equal(typeof createUsersHandler, 'function');
});

test('USRMOD-002 ruta ajena devuelve false', async () => {
  const handler = createUsersHandler({
    db: { query: async () => ({ rows: [] }) },
    hashPassword: async x => x,
    verifyPassword: async () => ({ valid: true, needsRehash: false }),
    signToken: () => 'token'
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

test('USRMOD-003 verify sin auth conserva 401', async () => {
  const handler = createUsersHandler({
    db: { query: async () => ({ rows: [] }) },
    hashPassword: async x => x,
    verifyPassword: async () => ({ valid: true, needsRehash: false }),
    signToken: () => 'token'
  });

  let status;
  let payload;

  await handler({
    ruta: '/api/auth/verify',
    metodo: 'GET',
    peticion: { headers: {} },
    respuesta: {
      writeHead(code) { status = code; },
      end(body) { payload = JSON.parse(body); }
    }
  });

  assert.equal(status, 401);
  assert.deepEqual(payload, {
    valid: false,
    error: 'Token requerido'
  });
});

test('USRMOD-004 usuarios sin token conserva 401', async () => {
  const handler = createUsersHandler({
    db: { query: async () => ({ rows: [] }) },
    hashPassword: async x => x,
    verifyPassword: async () => ({ valid: true, needsRehash: false }),
    signToken: () => 'token'
  });

  let status;
  let payload;

  await handler({
    ruta: '/api/usuarios',
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
