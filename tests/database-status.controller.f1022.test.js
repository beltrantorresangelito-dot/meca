const test = require('node:test');
const assert = require('node:assert/strict');
const Controller =
  require('../src/modules/database-status/database-status.controller');

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

function service(overrides = {}) {
  return {
    getStatus: async () => ({
      totalSizeMB: 10,
      totalSizeFormatted: '10.00 MB',
      totalSizeBytes: 10485760,
      totalRows: 25,
      totalTables: 1,
      tablas: []
    }),
    getTableSizes: async () => [],
    ...overrides
  };
}

test('DBSTATCTRL-001 getStatus devuelve contrato completo', async () => {
  const out = output();

  await new Controller(service()).getStatus(
    out.res
  );

  assert.equal(out.get().status, 200);
  assert.equal(
    out.get().payload.totalSizeFormatted,
    '10.00 MB'
  );
});

test('DBSTATCTRL-002 getStatus error conserva error message', async () => {
  const out = output();

  await new Controller(service({
    getStatus: async () => {
      throw new Error('db');
    }
  })).getStatus(out.res);

  assert.deepEqual(out.get(), {
    status: 500,
    payload: { error: 'db' }
  });
});

test('DBSTATCTRL-003 getStatus respeta status del Service', async () => {
  const out = output();

  await new Controller(service({
    getStatus: async () => {
      const error = new Error('bad');
      error.status = 400;
      throw error;
    }
  })).getStatus(out.res);

  assert.deepEqual(out.get(), {
    status: 400,
    payload: { error: 'bad' }
  });
});

test('DBSTATCTRL-004 getTableSizes devuelve array', async () => {
  const out = output();

  await new Controller(service({
    getTableSizes: async () => [{
      tablename: 'usuarios'
    }]
  })).getTableSizes(out.res);

  assert.deepEqual(out.get(), {
    status: 200,
    payload: [{ tablename: 'usuarios' }]
  });
});

test('DBSTATCTRL-005 getTableSizes error conserva 500 []', async () => {
  const out = output();

  await new Controller(service({
    getTableSizes: async () => {
      throw new Error('boom');
    }
  })).getTableSizes(out.res);

  assert.deepEqual(out.get(), {
    status: 500,
    payload: []
  });
});
