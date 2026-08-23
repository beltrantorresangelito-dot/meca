const test = require('node:test');
const assert = require('node:assert/strict');
const ReportsService = require('../src/modules/reports/reports.service');

function repository(overrides = {}) {
  return {
    listEvaluationsDesc: async () => [{ id: 2 }, { id: 1 }],
    listEvaluationDates: async () => [],
    listEvaluationsAsc: async () => [{ id: 1 }, { id: 2 }],
    listFailedDetails: async () => [{ id: 9, cumple: false }],
    listAuditorErrors: async () => [],
    getUserFullName: async () => null,
    listEvaluationDetails: async id => [{ id: id * 10 }],
    listLeaders: async () => [{ lider_2026: 'L1' }, { lider_2026: 'L2' }],
    summaryByLeader: async () => [],
    summaryByLocation: async () => [],
    summaryByLocality: async () => [],
    ...overrides
  };
}

test('REPSVC-001 kpis y ranking conservan dataset DESC', async () => {
  let calls = 0;
  const service = new ReportsService(repository({
    listEvaluationsDesc: async () => {
      calls++;
      return [{ id: 3 }];
    }
  }));

  assert.deepEqual(await service.getKpis(), [{ id: 3 }]);
  assert.deepEqual(await service.getRanking(), [{ id: 3 }]);
  assert.equal(calls, 2);
});

test('REPSVC-002 meses disponibles normaliza, deduplica y ordena', async () => {
  const service = new ReportsService(repository({
    listEvaluationDates: async () => [
      { fecha_formateada: '15/08/2026' },
      { fecha_formateada: '02/08/2026' },
      { fecha_formateada: '01/07/2026' },
      { fecha_formateada: 'texto' },
      { fecha_formateada: null }
    ]
  }));

  assert.deepEqual(await service.getAvailableMonths(), [
    { anio: 2026, mes: 8, valor: '2026-08', label: 'Agosto 2026' },
    { anio: 2026, mes: 7, valor: '2026-07', label: 'Julio 2026' }
  ]);
});

test('REPSVC-003 evolutivo conserva periodo sin alterar consulta', async () => {
  let called = 0;
  const service = new ReportsService(repository({
    listEvaluationsAsc: async () => {
      called++;
      return [{ id: 1 }];
    }
  }));

  assert.deepEqual(await service.getEvolution('mes'), [{ id: 1 }]);
  assert.equal(called, 1);
});

test('REPSVC-004 normaliza fechas legacy', () => {
  assert.equal(ReportsService.normalizeDate('22/08/2026'), '22/08/2026');
  assert.equal(ReportsService.normalizeDate('2026-08-22'), '22/08/2026');
  assert.equal(
    ReportsService.normalizeDate('2026-08-22 10:20:00'),
    '22/08/2026'
  );
  assert.equal(ReportsService.normalizeDate(null), null);
});

test('REPSVC-005 errores por auditor conserva forma agregada', async () => {
  const service = new ReportsService(repository({
    listAuditorErrors: async () => [
      {
        evaluador: 'aud1',
        fecha_formateada: '2026-08-22',
        agente: 'Agente A',
        bloque: 'ENC',
        atributo: 'PROTOCOLO',
        submotivo: 'Saludo',
        peso: '2.00',
        detalle_id: 10
      },
      {
        evaluador: 'aud1',
        fecha_formateada: '22/08/2026',
        agente: 'Agente B',
        bloque: null,
        atributo: null,
        submotivo: null,
        peso: null,
        detalle_id: 11
      }
    ],
    getUserFullName: async usuario =>
      usuario === 'aud1' ? 'Auditor Uno' : null
  }));

  const result = await service.getAuditorErrors({
    periodo: '30',
    auditor: 'aud1'
  });

  assert.equal(result.success, true);
  assert.deepEqual(result.fechasOrdenadas, ['22/08/2026']);
  assert.deepEqual(result.auditores, [
    { usuario: 'aud1', nombre: 'Auditor Uno' }
  ]);
  assert.equal(result.erroresPorAuditorPorFecha.aud1['22/08/2026'], 2);
  assert.equal(
    result.detallesPorAuditorPorFecha.aud1['22/08/2026'][1].bloque,
    'Sin bloque'
  );
});

test('REPSVC-006 fallo al resolver nombre no rompe reporte', async () => {
  const service = new ReportsService(repository({
    listAuditorErrors: async () => [{
      evaluador: 'aud1',
      fecha_formateada: '22/08/2026'
    }],
    getUserFullName: async () => {
      throw new Error('usuarios no disponible');
    }
  }));

  const result = await service.getAuditorErrors();

  assert.deepEqual(result.auditores, [
    { usuario: 'aud1', nombre: 'aud1' }
  ]);
});

test('REPSVC-007 evaluaciones con detalles preserva N+1', async () => {
  const detailCalls = [];
  const service = new ReportsService(repository({
    listEvaluationsDesc: async () => [{ id: 2 }, { id: 1 }],
    listEvaluationDetails: async id => {
      detailCalls.push(id);
      return [{ evaluacion_id: id }];
    }
  }));

  const result = await service.getEvaluationsWithDetails();

  assert.deepEqual(detailCalls, [2, 1]);
  assert.deepEqual(result[0].detalles_evaluacion, [{ evaluacion_id: 2 }]);
});

test('REPSVC-008 líderes se transforma a array de strings', async () => {
  const service = new ReportsService(repository());

  assert.deepEqual(await service.getLeaders(), ['L1', 'L2']);
});

test('REPSVC-009 mapeo de resumen conserva camelCase y números', async () => {
  const rows = [{
    nombre: 'L1',
    total_agentes: '12',
    total_eval: '30',
    promedio_general: '92.5',
    promedio_enc: '14.0',
    promedio_ecuf: '13.5',
    promedio_ecn: '65.0',
    pct_quiebres: '10.0',
    gestores_q4: '2',
    pct_q4: '16.7'
  }];

  const mapped = ReportsService.mapSummaryRows(rows);

  assert.deepEqual(mapped[0], {
    nombre: 'L1',
    totalAgentes: 12,
    totalEval: 30,
    promedioGeneral: 92.5,
    promedioENC: 14,
    promedioECUF: 13.5,
    promedioECN: 65,
    pctQuiebres: 10,
    gestoresQ4: 2,
    pctQ4: 16.7
  });
});
