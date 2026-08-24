const test = require('node:test');
const assert = require('node:assert/strict');

const Service =
  require('../src/modules/generic-rpc/generic-rpc.service');

function repo(overrides = {}) {
  return {
    closeMonth: async params => ({
      cerrado: true,
      params
    }),
    closeExpiredSessions: async () => ({
      limpiadas: 3
    }),
    callFunction: async (name, params) => ([
      { name, params }
    ]),
    ...overrides
  };
}

test('RPCSVC-001 cerrar_mes usa contrato direct', async () => {
  const service = new Service(repo());

  const result = await service.execute(
    'cerrar_mes',
    { anio: 2026, mes: 8 }
  );

  assert.equal(result.type, 'direct');
  assert.equal(result.payload.cerrado, true);
});

test('RPCSVC-002 limpiar sesiones usa contrato wrapped', async () => {
  const service = new Service(repo());

  const result = await service.execute(
    'limpiar_sesiones_expiradas',
    {}
  );

  assert.deepEqual(result, {
    type: 'wrapped',
    payload: {
      data: {
        limpiadas: 3
      },
      error: null
    }
  });
});

test('RPCSVC-003 fallback llama función genérica', async () => {
  let called;

  const service = new Service(repo({
    callFunction: async (name, params) => {
      called = [name, params];
      return [{ ok: true }];
    }
  }));

  const result = await service.execute(
    'mi_funcion',
    { a: 1 }
  );

  assert.deepEqual(
    called,
    ['mi_funcion', { a: 1 }]
  );

  assert.deepEqual(result, {
    type: 'wrapped',
    payload: {
      data: [{ ok: true }],
      error: null
    }
  });
});

test('RPCSVC-004 error Repository se propaga', async () => {
  const service = new Service(repo({
    callFunction: async () => {
      const error = new Error('db');
      error.code = '42883';
      throw error;
    }
  }));

  await assert.rejects(
    () => service.execute(
      'funcion_inexistente',
      {}
    ),
    error => (
      error.message === 'db' &&
      error.code === '42883'
    )
  );
});

test('RPCSVC-005 params default es objeto vacío', async () => {
  let received;

  const service = new Service(repo({
    callFunction: async (name, params) => {
      received = params;
      return [];
    }
  }));

  await service.execute('x');

  assert.deepEqual(received, {});
});
