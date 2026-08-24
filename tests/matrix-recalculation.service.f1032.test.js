const test = require('node:test');
const assert = require('node:assert/strict');
const Service = require('../src/modules/matrix-recalculation/matrix-recalculation.service');

function repo(overrides = {}) {
  return {
    listDetailsWithSubreason: async () => [],
    findActiveWeightBySubreasonCode: async () => null,
    updateDetailWeight: async () => {},
    listDistinctEvaluationIds: async () => [],
    calculateEvaluationTotals: async () => ({
      total_enc: 0,
      total_ecuf: 0,
      total_ecn: 0,
      nota_final: 0
    }),
    updateEvaluationTotals: async () => {},
    getFinalSummary: async () => ({
      total_evaluaciones: '0',
      promedio_notas: null,
      nota_min: null,
      nota_max: null
    }),
    ...overrides
  };
}

test('RECALCSVC-001 devuelve contrato base vacío', async () => {
  const result = await new Service(repo()).recalculate();

  assert.deepEqual(result, {
    success: true,
    detalles_actualizados: 0,
    evaluaciones_actualizadas: 0,
    errores: 0,
    resumen: {
      total_evaluaciones: '0',
      promedio_notas: null,
      nota_min: null,
      nota_max: null
    },
    message: '0 evaluaciones y 0 detalles actualizados'
  });
});

test('RECALCSVC-002 actualiza detalle cuando existe peso', async () => {
  const calls = [];

  const service = new Service(repo({
    listDetailsWithSubreason: async () => [{
      id: 7,
      submotivo: 'SM1'
    }],
    findActiveWeightBySubreasonCode: async () => 15,
    updateDetailWeight: async (id, weight) => {
      calls.push([id, weight]);
    }
  }));

  const result = await service.recalculate();

  assert.deepEqual(calls, [[7, 15]]);
  assert.equal(result.detalles_actualizados, 1);
});

test('RECALCSVC-003 submotivo inexistente no suma actualizado ni error', async () => {
  const service = new Service(repo({
    listDetailsWithSubreason: async () => [{
      id: 1,
      submotivo: 'X'
    }],
    findActiveWeightBySubreasonCode: async () => null
  }));

  const result = await service.recalculate();

  assert.equal(result.detalles_actualizados, 0);
  assert.equal(result.errores, 0);
});

test('RECALCSVC-004 error individual de detalle incrementa errores y continúa', async () => {
  let updated = false;

  const service = new Service(repo({
    listDetailsWithSubreason: async () => [
      { id: 1, submotivo: 'A' },
      { id: 2, submotivo: 'B' }
    ],
    findActiveWeightBySubreasonCode: async code => {
      if (code === 'A') throw new Error('boom');
      return 10;
    },
    updateDetailWeight: async () => {
      updated = true;
    }
  }));

  const result = await service.recalculate();

  assert.equal(result.errores, 1);
  assert.equal(result.detalles_actualizados, 1);
  assert.equal(updated, true);
});

test('RECALCSVC-005 recalcula y actualiza cada evaluación', async () => {
  const calls = [];

  const service = new Service(repo({
    listDistinctEvaluationIds: async () => [3, 4],
    calculateEvaluationTotals: async id => ({
      total_enc: id,
      total_ecuf: id,
      total_ecn: id,
      nota_final: id * 3
    }),
    updateEvaluationTotals: async (id, totals) => {
      calls.push([id, totals.nota_final]);
    }
  }));

  const result = await service.recalculate();

  assert.deepEqual(calls, [[3, 9], [4, 12]]);
  assert.equal(result.evaluaciones_actualizadas, 2);
});

test('RECALCSVC-006 error individual de evaluación no aborta las demás', async () => {
  const calls = [];

  const service = new Service(repo({
    listDistinctEvaluationIds: async () => [1, 2],
    calculateEvaluationTotals: async id => {
      if (id === 1) throw new Error('bad eval');
      return {
        total_enc: 1,
        total_ecuf: 2,
        total_ecn: 3,
        nota_final: 6
      };
    },
    updateEvaluationTotals: async id => {
      calls.push(id);
    }
  }));

  const result = await service.recalculate();

  assert.deepEqual(calls, [2]);
  assert.equal(result.evaluaciones_actualizadas, 1);
});

test('RECALCSVC-007 conserva resumen final del Repository', async () => {
  const summary = {
    total_evaluaciones: '8',
    promedio_notas: '75.25',
    nota_min: '10',
    nota_max: '100'
  };

  const result = await new Service(repo({
    getFinalSummary: async () => summary
  })).recalculate();

  assert.equal(result.resumen, summary);
});
