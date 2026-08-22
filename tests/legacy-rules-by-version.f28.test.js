const test = require('node:test');
const assert = require('node:assert/strict');
const Repository = require('../src/modules/domain/legacy-matrix.repository');
const Service = require('../src/modules/domain/legacy-matrix.service');

test('RULES-001 repository devuelve [] si tabla reglas_evaluacion no existe', async () => {
  let calls = 0;
  const repository = new Repository({
    async query(sql) {
      calls++;
      assert.match(sql, /information_schema\.tables/i);
      return { rows: [{ exists: false }] };
    }
  });

  assert.deepEqual(await repository.getLegacyEvaluationRulesByVersion(4), []);
  assert.equal(calls, 1);
});

test('RULES-002 repository conserva columnas y filtro legacy', async () => {
  const calls = [];
  const expected = [{ id: 1, version_id: 4, accion_tipo: 'marcar_no_aplica' }];

  const repository = new Repository({
    async query(sql, params) {
      calls.push({ sql, params });
      if (/information_schema\.tables/i.test(sql)) {
        return { rows: [{ exists: true }] };
      }
      return { rows: expected };
    }
  });

  assert.strictEqual(await repository.getLegacyEvaluationRulesByVersion(4), expected);
  assert.equal(calls.length, 2);
  assert.deepEqual(calls[1].params, [4]);
  assert.match(calls[1].sql, /FROM\s+reglas_evaluacion/i);
  assert.match(calls[1].sql, /version_id\s*=\s*\$1/i);
  assert.match(calls[1].sql, /activo\s*=\s*TRUE/i);
  assert.match(calls[1].sql, /ORDER\s+BY\s+orden/i);
});

test('RULES-003 service valida ID positivo', async () => {
  const service = new Service({
    getLegacyEvaluationRulesByVersion: async () => []
  });

  await assert.rejects(
    () => service.getEvaluationRulesByVersion(0),
    error => error.code === 'VALIDATION_ERROR'
  );
});

test('RULES-004 service mantiene resiliencia legacy y devuelve [] ante error repository', async () => {
  const service = new Service({
    getLegacyEvaluationRulesByVersion: async () => {
      throw new Error('tabla dañada');
    }
  });

  assert.deepEqual(await service.getEvaluationRulesByVersion(4), []);
});
