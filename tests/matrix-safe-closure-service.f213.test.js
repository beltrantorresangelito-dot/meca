const test = require('node:test');
const assert = require('node:assert/strict');
const MatrixService = require('../src/modules/matrix/matrix.service');

function repo(overrides = {}) {
  return {
    withTransaction: async work => work({}),
    getActiveEvaluationStructure: async () => ({
      version: 'v2.1.0',
      frentes: [{ id: 10 }],
      reglas: [{ id: 4 }]
    }),
    createEvaluationRule: async (_c, data) => ({ id: 10, ...data }),
    updateEvaluationRule: async (_c, id, data) => ({ id, ...data }),
    deleteEvaluationRule: async (_c, id) => ({ id }),
    ...overrides
  };
}

test('MATRIXSAFE-001 estructura activa delega sin perder contrato', async () => {
  const service = new MatrixService(repo());
  const result = await service.getActiveEvaluationStructure();

  assert.equal(result.version, 'v2.1.0');
  assert.ok(Array.isArray(result.frentes));
  assert.ok(Array.isArray(result.reglas));
});

test('MATRIXSAFE-002 crear regla exige campos básicos', async () => {
  const service = new MatrixService(repo());

  await assert.rejects(
    service.createEvaluationRule({ version_id: 5 }),
    { status: 400, message: 'Faltan campos obligatorios' }
  );
});

test('MATRIXSAFE-003 actualizar regla conserva 404', async () => {
  const service = new MatrixService(repo({
    updateEvaluationRule: async () => null
  }));

  await assert.rejects(
    service.updateEvaluationRule(999, {}),
    { status: 404, message: 'Regla no encontrada' }
  );
});

test('MATRIXSAFE-004 eliminar regla conserva contrato', async () => {
  const service = new MatrixService(repo());
  const result = await service.deleteEvaluationRule(3);

  assert.deepEqual(result, {
    success: true,
    message: 'Regla eliminada correctamente',
    id: 3
  });
});
