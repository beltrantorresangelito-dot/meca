const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const server = fs.readFileSync(
  path.resolve(__dirname, '../server.js'),
  'utf8'
);
const routes = fs.readFileSync(
  path.resolve(__dirname, '../src/modules/reports/reports.routes.js'),
  'utf8'
);
const controller = fs.readFileSync(
  path.resolve(__dirname, '../src/modules/reports/reports.controller.js'),
  'utf8'
);

test('REPCHAR-F34-001 server registra dispatcher Reports', () => {
  assert.match(server, /createReportsHandler/);
  assert.match(server, /handleReportsRequest/);
});

test('REPCHAR-F34-002 los 11 endpoints ya no están inline en server', () => {
  const endpoints = [
    'kpis',
    'ranking',
    'meses-disponibles',
    'evolutivo',
    'top-fallas',
    'errores-auditores',
    'evaluaciones-con-detalles',
    'lideres',
    'resumen-por-lider',
    'resumen-por-ubicacion',
    'resumen-por-localidad'
  ];

  for (const endpoint of endpoints) {
    assert.doesNotMatch(
      server,
      new RegExp(
        `if \\(ruta === '\\/api\\/reportes\\/${endpoint}' && metodo === 'GET'\\)`
      )
    );

    assert.match(routes, new RegExp(`/api/reportes/${endpoint}`));
  }
});

test('REPCHAR-F34-003 controller conserva comportamientos legacy', () => {
  assert.match(controller, /Token requerido/);
  assert.match(controller, /ReportsController\.json\(res, 200, \[\]\)/);
  assert.match(controller, /success: false/);
  assert.match(controller, /detallesPorAuditorPorFecha: \{\}/);
});

test('REPCHAR-F34-004 meses-disponibles conserva error 200 []', () => {
  const start = controller.indexOf('async getAvailableMonths');
  const end = controller.indexOf('async getEvolution', start);
  const block = controller.slice(start, end);

  assert.match(block, /ReportsController\.json\(res, 200, \[\]\)/);
});

test('REPCHAR-F34-005 resúmenes conservan error 500 []', () => {
  for (const method of [
    'getSummaryByLeader',
    'getSummaryByLocation',
    'getSummaryByLocality'
  ]) {
    const start = controller.indexOf(`async ${method}`);
    assert.ok(start > -1);
    const next = controller.indexOf('\n  async ', start + 10);
    const block = controller.slice(
      start,
      next === -1 ? controller.length : next
    );

    assert.match(block, /ReportsController\.json\(res, 500, \[\]\)/);
  }
});
