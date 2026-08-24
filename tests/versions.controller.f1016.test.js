const test = require('node:test');
const assert = require('node:assert/strict');
const Controller = require('../src/modules/versions/versions.controller');

function output() {
  let status;
  let payload;

  return {
    res: {
      writeHead(code) { status = code; },
      end(body) { payload = JSON.parse(body); }
    },
    get() { return { status, payload }; }
  };
}

function service(overrides = {}) {
  return {
    list: async () => [],
    publish: async () => 1,
    activate: async id => id,
    delete: async id => id,
    ...overrides
  };
}

test('VERCTRL-001 list conserva array directo', async () => {
  const out = output();

  await new Controller(service({
    list: async () => [{ id: 1 }]
  })).list(out.res, 'frontend');

  assert.deepEqual(out.get(), {
    status: 200,
    payload: [{ id: 1 }]
  });
});

test('VERCTRL-002 publish conserva 201 success id', async () => {
  const out = output();

  await new Controller(service({
    publish: async () => 8
  })).publish(out.res, {
    version: '1.0'
  });

  assert.deepEqual(out.get(), {
    status: 201,
    payload: { success: true, id: 8 }
  });
});

test('VERCTRL-003 activate inexistente conserva 404', async () => {
  const out = output();

  await new Controller(service({
    activate: async () => null
  })).activate(out.res, 9, 'frontend');

  assert.deepEqual(out.get(), {
    status: 404,
    payload: { error: 'Versión no encontrada' }
  });
});

test('VERCTRL-004 activate válido conserva success true', async () => {
  const out = output();

  await new Controller(service()).activate(
    out.res,
    4,
    'frontend'
  );

  assert.deepEqual(out.get(), {
    status: 200,
    payload: { success: true }
  });
});

test('VERCTRL-005 delete inexistente conserva 404', async () => {
  const out = output();

  await new Controller(service({
    delete: async () => null
  })).delete(out.res, 6);

  assert.deepEqual(out.get(), {
    status: 404,
    payload: { error: 'Versión no encontrada' }
  });
});

test('VERCTRL-006 delete válido conserva success true', async () => {
  const out = output();

  await new Controller(service()).delete(out.res, 6);

  assert.deepEqual(out.get(), {
    status: 200,
    payload: { success: true }
  });
});

test('VERCTRL-007 error Service conserva status', async () => {
  const out = output();

  await new Controller(service({
    list: async () => {
      const error = new Error('bad');
      error.status = 400;
      throw error;
    }
  })).list(out.res);

  assert.deepEqual(out.get(), {
    status: 400,
    payload: { error: 'bad' }
  });
});
