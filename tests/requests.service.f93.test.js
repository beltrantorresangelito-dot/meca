const test = require('node:test');
const assert = require('node:assert/strict');
const RequestsService =
  require('../src/modules/requests/requests.service');

function makeRepo(overrides = {}) {
  return {
    listByUser: async id => [{ solicitante_id: id }],
    listAll: async () => [],
    createDynamic: async data => ({ id: 1, ...data }),
    findById: async id => ({ id }),
    updateStatus: async () => 1,
    ...overrides
  };
}

test('REQSVC-001 listByUser valida id', async () => {
  const service = new RequestsService(makeRepo());

  await assert.rejects(
    service.listByUser(null),
    {
      status: 400,
      message: 'ID de usuario requerido'
    }
  );
});

test('REQSVC-002 listByUser delega repository', async () => {
  let received;

  const service = new RequestsService(makeRepo({
    listByUser: async id => {
      received = id;
      return [];
    }
  }));

  assert.deepEqual(await service.listByUser(7), []);
  assert.equal(received, 7);
});

test('REQSVC-003 listAll delega repository', async () => {
  const service = new RequestsService(makeRepo({
    listAll: async () => [{ id: 1 }]
  }));

  assert.deepEqual(
    await service.listAll(),
    [{ id: 1 }]
  );
});

test('REQSVC-004 create valida objeto', async () => {
  const service = new RequestsService(makeRepo());

  await assert.rejects(
    service.create(null),
    {
      status: 400,
      message: 'Solicitud inválida'
    }
  );
});

test('REQSVC-005 create conserva contrato dinámico', async () => {
  let received;

  const service = new RequestsService(makeRepo({
    createDynamic: async data => {
      received = data;
      return { id: 10 };
    }
  }));

  const input = {
    solicitante_id: 1,
    asunto: 'Prueba'
  };

  assert.deepEqual(
    await service.create(input),
    { id: 10 }
  );
  assert.equal(received, input);
});

test('REQSVC-006 getById valida id', async () => {
  const service = new RequestsService(makeRepo());

  await assert.rejects(
    service.getById(''),
    {
      status: 400,
      message: 'ID de solicitud requerido'
    }
  );
});

test('REQSVC-007 getById delega repository', async () => {
  const service = new RequestsService(makeRepo());

  assert.deepEqual(
    await service.getById(4),
    { id: 4 }
  );
});

test('REQSVC-008 updateStatus valida id', async () => {
  const service = new RequestsService(makeRepo());

  await assert.rejects(
    service.updateStatus(null, {}),
    {
      status: 400,
      message: 'ID de solicitud requerido'
    }
  );
});

test('REQSVC-009 updateStatus valida body', async () => {
  const service = new RequestsService(makeRepo());

  await assert.rejects(
    service.updateStatus(1, null),
    {
      status: 400,
      message: 'Datos de actualización inválidos'
    }
  );
});

test('REQSVC-010 updateStatus delega repository', async () => {
  let received;

  const service = new RequestsService(makeRepo({
    updateStatus: async (id, data) => {
      received = { id, data };
      return 1;
    }
  }));

  const data = { estado: 'APROBADA' };

  assert.equal(
    await service.updateStatus(5, data),
    1
  );

  assert.deepEqual(received, {
    id: 5,
    data
  });
});
