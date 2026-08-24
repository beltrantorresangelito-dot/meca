const test = require('node:test');
const assert = require('node:assert/strict');
const EvaluationsController =
  require('../src/modules/evaluations/evaluations.controller');

function makeResponse() {
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
    result() {
      return { status, payload };
    }
  };
}

function service(overrides = {}) {
  return {
    list: async () => [],
    create: async () => ({ success: true }),
    delete: async () => ({ success: true }),
    validateTicket: async () => null,
    listDetails: async () => [],
    ...overrides
  };
}

test('EVALCTRL-001 list responde 200 array', async () => {
  let filters;
  const ctrl = new EvaluationsController(service({
    list: async f => {
      filters = f;
      return [{ id: 1 }];
    }
  }));

  const out = makeResponse();

  await ctrl.list(out.res, {
    agente: 'A',
    evaluador: 'E',
    ticket: 'T',
    limite: '5'
  });

  assert.deepEqual(filters, {
    agente: 'A',
    evaluador: 'E',
    ticket: 'T',
    limite: '5'
  });
  assert.deepEqual(out.result(), {
    status: 200,
    payload: [{ id: 1 }]
  });
});

test('EVALCTRL-002 create conserva 201', async () => {
  const ctrl = new EvaluationsController(service());
  const out = makeResponse();

  await ctrl.create(out.res, { id: 'E1' });

  assert.deepEqual(out.result(), {
    status: 201,
    payload: { success: true }
  });
});

test('EVALCTRL-003 errores del service respetan status', async () => {
  const ctrl = new EvaluationsController(service({
    delete: async () => {
      const error = new Error('ID inválido');
      error.status = 400;
      throw error;
    }
  }));

  const out = makeResponse();

  await ctrl.delete(out.res, '');

  assert.deepEqual(out.result(), {
    status: 400,
    payload: { error: 'ID inválido' }
  });
});

test('EVALCTRL-004 delete conserva 200', async () => {
  const ctrl = new EvaluationsController(service());
  const out = makeResponse();

  await ctrl.delete(out.res, 'E1');

  assert.deepEqual(out.result(), {
    status: 200,
    payload: { success: true }
  });
});

test('EVALCTRL-005 validateTicket conserva null', async () => {
  const ctrl = new EvaluationsController(service());
  const out = makeResponse();

  await ctrl.validateTicket(out.res, 'T1');

  assert.deepEqual(out.result(), {
    status: 200,
    payload: null
  });
});

test('EVALCTRL-006 listDetails conserva array', async () => {
  const ctrl = new EvaluationsController(service({
    listDetails: async id => [{ evaluacion_id: id }]
  }));

  const out = makeResponse();

  await ctrl.listDetails(out.res, 'E1');

  assert.deepEqual(out.result(), {
    status: 200,
    payload: [{ evaluacion_id: 'E1' }]
  });
});

test('EVALCTRL-007 error sin status cae en 500', async () => {
  const ctrl = new EvaluationsController(service({
    list: async () => {
      throw new Error('boom');
    }
  }));

  const out = makeResponse();

  await ctrl.list(out.res, {});

  assert.deepEqual(out.result(), {
    status: 500,
    payload: { error: 'boom' }
  });
});
