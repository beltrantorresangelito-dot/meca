const test = require('node:test');
const assert = require('node:assert/strict');
const EvaluationsService =
  require('../src/modules/evaluations/evaluations.service');

function repo(overrides = {}) {
  return {
    list: async filters => [{ filters }],
    saveWithDetails: async evaluation => ({ success: true, evaluation }),
    deleteById: async id => ({ success: true, id }),
    findByTicket: async ticket => ({ ticket_psi: ticket }),
    listDetails: async id => [{ evaluacion_id: id }],
    ...overrides
  };
}

test('EVALSVC-001 list delega filtros', async () => {
  let received;
  const service = new EvaluationsService(repo({
    list: async filters => {
      received = filters;
      return [];
    }
  }));

  const filters = { agente: 'A', ticket: 'T' };
  await service.list(filters);
  assert.deepEqual(received, filters);
});

test('EVALSVC-002 create valida input', async () => {
  const service = new EvaluationsService(repo());

  await assert.rejects(
    service.create(null),
    { status: 400, message: 'Evaluación inválida' }
  );
});

test('EVALSVC-003 create delega repository', async () => {
  let received;
  const service = new EvaluationsService(repo({
    saveWithDetails: async evaluation => {
      received = evaluation;
      return { success: true };
    }
  }));

  const evaluation = { id: 'E1' };
  assert.deepEqual(
    await service.create(evaluation),
    { success: true }
  );
  assert.equal(received, evaluation);
});

test('EVALSVC-004 delete valida id', async () => {
  const service = new EvaluationsService(repo());

  await assert.rejects(
    service.delete(''),
    { status: 400, message: 'ID de evaluación requerido' }
  );
});

test('EVALSVC-005 delete delega repository', async () => {
  const service = new EvaluationsService(repo());

  assert.deepEqual(
    await service.delete('E1'),
    { success: true, id: 'E1' }
  );
});

test('EVALSVC-006 validateTicket vacío conserva null', async () => {
  let called = false;
  const service = new EvaluationsService(repo({
    findByTicket: async () => {
      called = true;
      return {};
    }
  }));

  assert.equal(await service.validateTicket(''), null);
  assert.equal(called, false);
});

test('EVALSVC-007 validateTicket delega repository', async () => {
  const service = new EvaluationsService(repo());

  assert.deepEqual(
    await service.validateTicket('T1'),
    { ticket_psi: 'T1' }
  );
});

test('EVALSVC-008 listDetails valida y delega', async () => {
  const service = new EvaluationsService(repo());

  await assert.rejects(
    service.listDetails(null),
    { status: 400, message: 'ID de evaluación requerido' }
  );

  assert.deepEqual(
    await service.listDetails('E1'),
    [{ evaluacion_id: 'E1' }]
  );
});
