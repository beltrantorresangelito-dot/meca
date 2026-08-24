const test = require('node:test');
const assert = require('node:assert/strict');

const Controller =
  require('../src/modules/generic-rpc/generic-rpc.controller');

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
      return {
        status,
        payload
      };
    }
  };
}

test('RPCCTRL-001 success direct devuelve 200', async () => {
  const out = output();

  const controller = new Controller({
    async execute() {
      return {
        type: 'direct',
        payload: {
          ok: true
        }
      };
    }
  });

  await controller.execute(
    out.res,
    'cerrar_mes',
    {}
  );

  assert.deepEqual(
    out.get(),
    {
      status: 200,
      payload: {
        ok: true
      }
    }
  );
});

test('RPCCTRL-002 success wrapped devuelve 200', async () => {
  const out = output();

  const controller = new Controller({
    async execute() {
      return {
        type: 'wrapped',
        payload: {
          data: [{ id: 1 }],
          error: null
        }
      };
    }
  });

  await controller.execute(
    out.res,
    'mi_funcion',
    {}
  );

  assert.equal(
    out.get().status,
    200
  );

  assert.deepEqual(
    out.get().payload,
    {
      data: [{ id: 1 }],
      error: null
    }
  );
});

test('RPCCTRL-003 error devuelve 500 y code', async () => {
  const out = output();

  const controller = new Controller({
    async execute() {
      const error =
        new Error('db');

      error.code = '42883';
      throw error;
    }
  });

  await controller.execute(
    out.res,
    'funcion_x',
    {}
  );

  assert.deepEqual(
    out.get(),
    {
      status: 500,
      payload: {
        error: 'db',
        code: '42883'
      }
    }
  );
});

test('RPCCTRL-004 error sin code usa ERROR', async () => {
  const out = output();

  const controller = new Controller({
    async execute() {
      throw new Error('boom');
    }
  });

  await controller.execute(
    out.res,
    'x',
    {}
  );

  assert.equal(
    out.get().payload.code,
    'ERROR'
  );
});
