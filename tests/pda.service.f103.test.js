const test = require('node:test');
const assert = require('node:assert/strict');
const PdaService =
  require('../src/modules/pda/pda.service');

function makeRepo(overrides = {}) {
  return {
    tableExists: async () => true,
    listPending: async () => [],
    listTracking: async () => [],
    listHistory: async () => [],
    findHeaderById: async id => ({ id }),
    listActions: async () => [],
    exportRows: async () => [],
    ...overrides
  };
}

test('PDASVC-001 tableExists delega repository', async () => {
  const service = new PdaService(makeRepo());
  assert.equal(await service.tableExists(), true);
});

test('PDASVC-002 listPending delega repository', async () => {
  const service = new PdaService(makeRepo({
    listPending: async () => [{ id: 1 }]
  }));

  assert.deepEqual(
    await service.listPending(),
    [{ id: 1 }]
  );
});

test('PDASVC-003 listTracking delega repository', async () => {
  const service = new PdaService(makeRepo({
    listTracking: async () => [{ id: 2 }]
  }));

  assert.deepEqual(
    await service.listTracking(),
    [{ id: 2 }]
  );
});

test('PDASVC-004 listHistory delega repository', async () => {
  const service = new PdaService(makeRepo({
    listHistory: async () => [{ id: 3 }]
  }));

  assert.deepEqual(
    await service.listHistory(),
    [{ id: 3 }]
  );
});

test('PDASVC-005 getDetail valida id', async () => {
  const service = new PdaService(makeRepo());

  await assert.rejects(
    service.getDetail(null),
    {
      status: 400,
      message: 'ID de PDA requerido'
    }
  );
});

test('PDASVC-006 getDetail conserva null cuando no existe', async () => {
  const service = new PdaService(makeRepo({
    findHeaderById: async () => null
  }));

  assert.equal(
    await service.getDetail(99),
    null
  );
});

test('PDASVC-007 getDetail adjunta acciones', async () => {
  const service = new PdaService(makeRepo({
    findHeaderById: async id => ({ id, estado: 'pendiente' }),
    listActions: async () => [
      { id: 1, completado: false }
    ]
  }));

  const pda = await service.getDetail(5);

  assert.equal(pda.id, 5);
  assert.equal(pda.acciones.length, 1);
});

test('PDASVC-008 getDetail calcula progreso', async () => {
  const service = new PdaService(makeRepo({
    findHeaderById: async id => ({ id }),
    listActions: async () => [
      { id: 1, completado: true },
      { id: 2, completado: true },
      { id: 3, completado: false },
      { id: 4, completado: false }
    ]
  }));

  const pda = await service.getDetail(5);

  assert.equal(pda.progreso, 50);
});

test('PDASVC-009 progreso sin acciones es cero', async () => {
  const service = new PdaService(makeRepo({
    findHeaderById: async id => ({ id }),
    listActions: async () => []
  }));

  const pda = await service.getDetail(5);

  assert.equal(pda.progreso, 0);
});

test('PDASVC-010 exportRows delega repository', async () => {
  const service = new PdaService(makeRepo({
    exportRows: async () => [{ id: 8 }]
  }));

  assert.deepEqual(
    await service.exportRows(),
    [{ id: 8 }]
  );
});
