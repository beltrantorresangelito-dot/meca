const test = require('node:test');
const assert = require('node:assert/strict');
const PdaController =
  require('../src/modules/pda/pda.controller');

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

function makeService(overrides = {}) {
  return {
    tableExists: async () => true,
    listPending: async () => [],
    listTracking: async () => [],
    listHistory: async () => [],
    getDetail: async id => ({ id }),
    exportRows: async () => [],
    ...overrides
  };
}

test('PDACTRL-001 pending sin tabla conserva 200 []', async () => {
  const ctrl = new PdaController(makeService({
    tableExists: async () => false
  }));

  const out = makeResponse();

  await ctrl.listPending(out.res);

  assert.deepEqual(out.result(), {
    status: 200,
    payload: []
  });
});

test('PDACTRL-002 pending error conserva 200 []', async () => {
  const ctrl = new PdaController(makeService({
    tableExists: async () => {
      throw new Error('db');
    }
  }));

  const out = makeResponse();

  await ctrl.listPending(out.res);

  assert.deepEqual(out.result(), {
    status: 200,
    payload: []
  });
});

test('PDACTRL-003 tracking devuelve filas', async () => {
  const ctrl = new PdaController(makeService({
    listTracking: async () => [{ id: 1 }]
  }));

  const out = makeResponse();

  await ctrl.listTracking(out.res);

  assert.deepEqual(out.result(), {
    status: 200,
    payload: [{ id: 1 }]
  });
});

test('PDACTRL-004 history sin tabla conserva 200 []', async () => {
  const ctrl = new PdaController(makeService({
    tableExists: async () => false
  }));

  const out = makeResponse();

  await ctrl.listHistory(out.res);

  assert.deepEqual(out.result(), {
    status: 200,
    payload: []
  });
});

test('PDACTRL-005 detalle inexistente conserva 404', async () => {
  const ctrl = new PdaController(makeService({
    getDetail: async () => null
  }));

  const out = makeResponse();

  await ctrl.getDetail(out.res, 99);

  assert.deepEqual(out.result(), {
    status: 404,
    payload: { error: 'PDA no encontrado' }
  });
});

test('PDACTRL-006 detalle válido devuelve 200', async () => {
  const ctrl = new PdaController(makeService({
    getDetail: async () => ({ id: 5, progreso: 50 })
  }));

  const out = makeResponse();

  await ctrl.getDetail(out.res, 5);

  assert.deepEqual(out.result(), {
    status: 200,
    payload: { id: 5, progreso: 50 }
  });
});

test('PDACTRL-007 respeta status del Service en detalle', async () => {
  const ctrl = new PdaController(makeService({
    getDetail: async () => {
      const error = new Error('ID inválido');
      error.status = 400;
      throw error;
    }
  }));

  const out = makeResponse();

  await ctrl.getDetail(out.res, null);

  assert.deepEqual(out.result(), {
    status: 400,
    payload: { error: 'ID inválido' }
  });
});

test('PDACTRL-008 export devuelve filas', async () => {
  const ctrl = new PdaController(makeService({
    exportRows: async () => [{ id: 7 }]
  }));

  const out = makeResponse();

  await ctrl.exportRows(out.res);

  assert.deepEqual(out.result(), {
    status: 200,
    payload: [{ id: 7 }]
  });
});

test('PDACTRL-009 export error conserva array vacío', async () => {
  const ctrl = new PdaController(makeService({
    exportRows: async () => {
      throw new Error('boom');
    }
  }));

  const out = makeResponse();

  await ctrl.exportRows(out.res);

  assert.deepEqual(out.result(), {
    status: 500,
    payload: []
  });
});
