const test = require('node:test');
const assert = require('node:assert/strict');
const DomainService = require('../src/modules/domain/domain.service');

function repo(overrides = {}) {
  return {
    listBreaks: async () => [],
    getBreakById: async () => null,
    listCampaignsByBreak: async () => [],
    listMatricesByBreak: async () => [],
    listCampaignMatrixAssignments: async () => [],
    resolveEvaluationContext: async () => [],
    getDomainConsistency: async () => ({
      campanas_sin_quiebre: 0,
      versiones_sin_matriz: 0,
      relaciones_quiebre_cruzado: 0,
      campanas_sin_matriz_activa: 0
    }),
    ...overrides
  };
}

test('DOMMOD-001 valida IDs positivos', async () => {
  const s = new DomainService(repo());

  await assert.rejects(
    () => s.getBreak('abc'),
    error => error.code === 'VALIDATION_ERROR' && /entero positivo/.test(error.message)
  );

  await assert.rejects(
    () => s.listCampaigns(0),
    error => error.code === 'VALIDATION_ERROR' && /entero positivo/.test(error.message)
  );

  await assert.rejects(
    () => s.listMatrices(-1),
    error => error.code === 'VALIDATION_ERROR' && /entero positivo/.test(error.message)
  );
});

test('DOMMOD-002 valida fecha YYYY-MM-DD', async () => {
  const s = new DomainService(repo());
  await assert.rejects(
    () => s.resolveContext({ campaignId: 1, date: '21/08/2026' }),
    /YYYY-MM-DD/
  );
});

test('DOMMOD-003 getBreak devuelve NOT_FOUND', async () => {
  const s = new DomainService(repo());
  await assert.rejects(async () => {
    try { await s.getBreak(99); }
    catch (e) { assert.equal(e.code, 'NOT_FOUND'); throw e; }
  }, /no encontrado/);
});

test('DOMMOD-004 resolveContext exige una fila', async () => {
  const s = new DomainService(repo());
  await assert.rejects(async () => {
    try { await s.resolveContext({ campaignId: 1 }); }
    catch (e) { assert.equal(e.code, 'DOMAIN_CONFIGURATION_ERROR'); throw e; }
  }, /esperaba 1 resultado/);
});

test('DOMMOD-005 resolveContext devuelve contrato', async () => {
  const expected = {
    quiebre_codigo:'COBRANZAS',
    campana_codigo:'TEMPRANA',
    matriz_codigo:'MATRIZ_COBRANZAS',
    version:'1.0'
  };
  const s = new DomainService(repo({
    resolveEvaluationContext: async () => [expected]
  }));
  assert.deepEqual(
    await s.resolveContext({ campaignId: 2, date: '2026-08-22' }),
    expected
  );
});

test('DOMMOD-006 validateConsistency limpio', async () => {
  const s = new DomainService(repo());
  const result = await s.validateConsistency();
  assert.equal(result.ok, true);
  assert.deepEqual(result.violations, []);
});

test('DOMMOD-007 validateConsistency reporta anomalías', async () => {
  const s = new DomainService(repo({
    getDomainConsistency: async () => ({
      campanas_sin_quiebre: 0,
      versiones_sin_matriz: 1,
      relaciones_quiebre_cruzado: 0,
      campanas_sin_matriz_activa: 2
    })
  }));
  const result = await s.validateConsistency();
  assert.equal(result.ok, false);
  assert.equal(result.violations.length, 2);
});
