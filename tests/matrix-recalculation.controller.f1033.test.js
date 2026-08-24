const test = require('node:test');
const assert = require('node:assert/strict');
const Controller =
  require('../src/modules/matrix-recalculation/matrix-recalculation.controller');

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

test('RECALCCTRL-001 devuelve 200 con resultado', async () => {
  const out = output();

  const controller = new Controller({
    async recalculate() {
      return {
        success: true,
        detalles_actualizados: 1,
        evaluaciones_actualizadas: 2,
        errores: 0,
        resumen: {},
        message: 'ok'
      };
    }
  });

  await controller.recalculate(out.res);

  assert.equal(out.get().status, 200);
  assert.equal(out.get().payload.success, true);
});

test('RECALCCTRL-002 error general conserva status o 500', async () => {
  const out = output();

  const controller = new Controller({
    async recalculate() {
      const error = new Error('boom');
      error.status = 409;
      throw error;
    }
  });

  await controller.recalculate(out.res);

  assert.deepEqual(out.get(), {
    status: 409,
    payload: { error: 'boom' }
  });
});

test('RECALCCTRL-003 error sin status devuelve 500', async () => {
  const out = output();

  const controller = new Controller({
    async recalculate() {
      throw new Error('db');
    }
  });

  await controller.recalculate(out.res);

  assert.deepEqual(out.get(), {
    status: 500,
    payload: { error: 'db' }
  });
});
