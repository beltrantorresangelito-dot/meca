const test = require('node:test');
const assert = require('node:assert/strict');

const Controller =
  require('../src/modules/generic-query/generic-query.controller');

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

test('GENQCTRL-001 success devuelve 200 y resultado', async () => {
  const out = output();

  const controller = new Controller({
    async execute() {
      return {
        data: [{ id: 1 }],
        count: 1
      };
    }
  });

  await controller.execute(
    out.res,
    { table: 't', operation: 'select' }
  );

  assert.deepEqual(out.get(), {
    status: 200,
    payload: {
      data: [{ id: 1 }],
      count: 1
    }
  });
});

test('GENQCTRL-002 error status 400 se respeta', async () => {
  const out = output();

  const controller = new Controller({
    async execute() {
      const error = new Error('Tabla no especificada');
      error.status = 400;
      throw error;
    }
  });

  await controller.execute(out.res, {});

  assert.equal(out.get().status, 400);
  assert.equal(
    out.get().payload.error,
    'Tabla no especificada'
  );
});

test('GENQCTRL-003 error sin status cae en 500', async () => {
  const out = output();

  const controller = new Controller({
    async execute() {
      throw new Error('boom');
    }
  });

  await controller.execute(out.res, {});

  assert.equal(out.get().status, 500);
  assert.equal(out.get().payload.code, 'ERROR');
});

test('GENQCTRL-004 conserva payload PostgreSQL', async () => {
  const out = output();

  const controller = new Controller({
    async execute() {
      const error = new Error('db');
      error.code = '23505';
      error.detail = 'duplicate key';
      error.hint = 'use another value';
      throw error;
    }
  });

  await controller.execute(out.res, {});

  assert.deepEqual(out.get(), {
    status: 500,
    payload: {
      error: 'db',
      code: '23505',
      details: 'duplicate key',
      hint: 'use another value'
    }
  });
});

test('GENQCTRL-005 null query deja validación al Service', async () => {
  const out = output();

  const controller = new Controller({
    async execute(query) {
      assert.equal(query, null);
      const error = new Error('Payload inválido');
      error.status = 400;
      throw error;
    }
  });

  await controller.execute(out.res, null);

  assert.equal(out.get().status, 400);
});
