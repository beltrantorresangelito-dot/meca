const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ReportsRepository = require('../src/modules/reports/reports.repository');

test('REPREPO-001 consultas simples conservan SQL legacy', async () => {
  const calls = [];
  const repository = new ReportsRepository({
    async query(sql, params) {
      calls.push({ sql: String(sql), params });
      return { rows: [] };
    }
  });

  await repository.listEvaluationsDesc();
  await repository.listEvaluationDates();
  await repository.listEvaluationsAsc();
  await repository.listFailedDetails();

  assert.match(calls[0].sql, /SELECT \* FROM evaluaciones ORDER BY timestamp DESC/);
  assert.match(calls[1].sql, /fecha_formateada/);
  assert.match(calls[2].sql, /timestamp ASC/);
  assert.match(calls[3].sql, /detalles_evaluacion WHERE cumple = false/);
});

test('REPREPO-002 errores auditor conserva filtros', async () => {
  let call;
  const repository = new ReportsRepository({
    async query(sql, params) {
      call = { sql: String(sql), params };
      return { rows: [] };
    }
  });

  await repository.listAuditorErrors({
    periodo: '30',
    auditor: 'auditor1'
  });

  assert.match(call.sql, /CURRENT_DATE - INTERVAL '30 days'/);
  assert.match(call.sql, /e\.evaluador = \$1/);
  assert.match(call.sql, /d\.cumple = false/);
  assert.deepEqual(call.params, ['auditor1']);
});

test('REPREPO-003 consulta nombre auditor conserva fallback null', async () => {
  const repository = new ReportsRepository({
    async query() {
      return { rows: [] };
    }
  });

  assert.equal(await repository.getUserFullName('x'), null);
});

test('REPREPO-004 evaluaciones con detalles mantiene N+1 disponible', async () => {
  let call;
  const repository = new ReportsRepository({
    async query(sql, params) {
      call = { sql: String(sql), params };
      return { rows: [{ id: 1 }] };
    }
  });

  const rows = await repository.listEvaluationDetails(7);
  assert.equal(rows.length, 1);
  assert.match(call.sql, /detalles_evaluacion WHERE evaluacion_id = \$1/);
  assert.deepEqual(call.params, [7]);
});

test('REPREPO-005 resúmenes conservan dimensiones y métricas', async () => {
  const sqls = [];
  const repository = new ReportsRepository({
    async query(sql) {
      sqls.push(String(sql));
      return { rows: [] };
    }
  });

  await repository.summaryByLeader();
  await repository.summaryByLocation();
  await repository.summaryByLocality();

  assert.match(sqls[0], /a\.lider_2026/);
  assert.match(sqls[1], /a\.ubicacion/);
  assert.match(sqls[2], /a\.localidad/);

  for (const sql of sqls) {
    assert.match(sql, /promedio_general/);
    assert.match(sql, /gestores_q4/);
    assert.match(sql, /pct_q4/);
  }
});


