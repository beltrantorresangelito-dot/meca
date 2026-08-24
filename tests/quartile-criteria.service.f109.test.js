const test = require('node:test');
const assert = require('node:assert/strict');
const Service =
  require('../src/modules/quartile-criteria/quartile-criteria.service');

function repo(overrides = {}) {
  return {
    listAll: async () => [],
    listActiveByDate: async () => [],
    create: async data => ({ id: 1, ...data }),
    update: async (id, data) => ({ id, ...data }),
    findBasicById: async id => ({ id, nombre: 'Criterio' }),
    deactivate: async () => 1,
    activate: async id => ({ id, activo: true }),
    ...overrides
  };
}

test('CQSVC-001 listAll delega repository', async () => {
  const s = new Service(repo({
    listAll: async () => [{ id: 1 }]
  }));

  assert.deepEqual(await s.listAll(), [{ id: 1 }]);
});

test('CQSVC-002 listActive calcula fecha YYYY-MM-DD', async () => {
  let received;
  const s = new Service(repo({
    listActiveByDate: async fecha => {
      received = fecha;
      return [];
    }
  }));

  await s.listActive();

  assert.match(received, /^\d{4}-\d{2}-\d{2}$/);
});

test('CQSVC-003 create valida objeto', async () => {
  const s = new Service(repo());

  await assert.rejects(
    s.create(null),
    {
      status: 400,
      message: 'Criterio inválido'
    }
  );
});

test('CQSVC-004 create delega repository', async () => {
  let received;
  const s = new Service(repo({
    create: async data => {
      received = data;
      return { id: 10 };
    }
  }));

  const input = { nombre: 'X' };

  assert.deepEqual(await s.create(input), { id: 10 });
  assert.equal(received, input);
});

test('CQSVC-005 update valida id', async () => {
  const s = new Service(repo());

  await assert.rejects(
    s.update(null, {}),
    {
      status: 400,
      message: 'ID de criterio requerido'
    }
  );
});

test('CQSVC-006 update valida body', async () => {
  const s = new Service(repo());

  await assert.rejects(
    s.update(1, null),
    {
      status: 400,
      message: 'Criterio inválido'
    }
  );
});

test('CQSVC-007 deactivate conserva null si no existe', async () => {
  const s = new Service(repo({
    findBasicById: async () => null
  }));

  assert.equal(await s.deactivate(99), null);
});

test('CQSVC-008 deactivate devuelve identidad y delega', async () => {
  let deactivated;
  const s = new Service(repo({
    findBasicById: async id => ({ id, nombre: 'Uno' }),
    deactivate: async id => {
      deactivated = id;
      return 1;
    }
  }));

  assert.deepEqual(
    await s.deactivate(7),
    { id: 7, nombre: 'Uno' }
  );

  assert.equal(deactivated, 7);
});

test('CQSVC-009 activate valida id', async () => {
  const s = new Service(repo());

  await assert.rejects(
    s.activate(null),
    {
      status: 400,
      message: 'ID de criterio requerido'
    }
  );
});

test('CQSVC-010 activate delega repository', async () => {
  const s = new Service(repo());

  assert.deepEqual(
    await s.activate(5),
    { id: 5, activo: true }
  );
});
