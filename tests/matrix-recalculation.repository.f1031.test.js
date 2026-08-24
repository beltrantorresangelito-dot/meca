const test = require('node:test');
const assert = require('node:assert/strict');
const Repository = require('../src/modules/matrix-recalculation/matrix-recalculation.repository');

test('RECALCREPO-001 lista detalles con submotivo', async () => {
  let sql;
  const repo = new Repository({
    async query(q) {
      sql = String(q);
      return { rows: [{ id: 1, submotivo: 'A', evaluacion_id: 2 }] };
    }
  });

  const rows = await repo.listDetailsWithSubreason();

  assert.equal(rows.length, 1);
  assert.match(sql, /FROM detalles_evaluacion d/);
  assert.match(sql, /submotivo IS NOT NULL/);
});

test('RECALCREPO-002 busca peso activo y devuelve número', async () => {
  let params;
  const repo = new Repository({
    async query(q, p) {
      params = p;
      return { rows: [{ peso_individual: '15.5' }] };
    }
  });

  assert.equal(
    await repo.findActiveWeightBySubreasonCode('SM1'),
    15.5
  );

  assert.deepEqual(params, ['SM1']);
});

test('RECALCREPO-003 peso inexistente devuelve null', async () => {
  const repo = new Repository({
    async query() {
      return { rows: [] };
    }
  });

  assert.equal(
    await repo.findActiveWeightBySubreasonCode('X'),
    null
  );
});

test('RECALCREPO-004 actualiza peso por detalle', async () => {
  let sql;
  let params;

  const repo = new Repository({
    async query(q, p) {
      sql = String(q);
      params = p;
      return { rows: [] };
    }
  });

  await repo.updateDetailWeight(7, 20);

  assert.match(sql, /UPDATE detalles_evaluacion/);
  assert.deepEqual(params, [20, 7]);
});

test('RECALCREPO-005 lista ids de evaluaciones', async () => {
  const repo = new Repository({
    async query() {
      return {
        rows: [
          { evaluacion_id: 2 },
          { evaluacion_id: 5 }
        ]
      };
    }
  });

  assert.deepEqual(
    await repo.listDistinctEvaluationIds(),
    [2, 5]
  );
});

test('RECALCREPO-006 calcula totales actuales', async () => {
  let sql;
  let params;

  const repo = new Repository({
    async query(q, p) {
      sql = String(q);
      params = p;
      return {
        rows: [{
          total_enc: '10',
          total_ecuf: '20',
          total_ecn: '30',
          nota_final: '60'
        }]
      };
    }
  });

  const totals = await repo.calculateEvaluationTotals(9);

  assert.equal(totals.nota_final, '60');
  assert.deepEqual(params, [9]);
  assert.match(sql, /bloque = 'ENC'/);
  assert.match(sql, /bloque = 'ECUF'/);
  assert.match(sql, /bloque = 'ECN'/);
});

test('RECALCREPO-007 actualiza evaluación con cuatro totales', async () => {
  let params;
  const repo = new Repository({
    async query(q, p) {
      params = p;
      return { rows: [] };
    }
  });

  await repo.updateEvaluationTotals(3, {
    total_enc: 1,
    total_ecuf: 2,
    total_ecn: 3,
    nota_final: 6
  });

  assert.deepEqual(params, [1,2,3,6,3]);
});

test('RECALCREPO-008 resumen final conserva métricas', async () => {
  let sql;
  const repo = new Repository({
    async query(q) {
      sql = String(q);
      return {
        rows: [{
          total_evaluaciones: '10',
          promedio_notas: '75.2',
          nota_min: '20',
          nota_max: '100'
        }]
      };
    }
  });

  const summary = await repo.getFinalSummary();

  assert.equal(summary.total_evaluaciones, '10');
  assert.match(sql, /COUNT\(\*\) as total_evaluaciones/);
  assert.match(sql, /AVG\(nota_final\)/);
  assert.match(sql, /MIN\(nota_final\)/);
  assert.match(sql, /MAX\(nota_final\)/);
});
