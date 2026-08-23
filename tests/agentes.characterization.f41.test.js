const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const server = fs.readFileSync(
  path.resolve(__dirname, '../server.js'),
  'utf8'
);

const routes = fs.readFileSync(
  path.resolve(__dirname, '../src/modules/agents/agents.routes.js'),
  'utf8'
);

const controller = fs.readFileSync(
  path.resolve(__dirname, '../src/modules/agents/agents.controller.js'),
  'utf8'
);

test('AGCHAR-F44-001 server registra dispatcher Agents', () => {
  assert.match(server, /createAgentsHandler/);
  assert.match(server, /handleAgentsRequest/);
});

test('AGCHAR-F44-002 rutas Agentes ya no están inline en server', () => {
  assert.doesNotMatch(
    server,
    /if \(ruta === '\/api\/agentes' && metodo === 'GET'\)/
  );
  assert.doesNotMatch(
    server,
    /ruta\.match\(\/\^\\\/api\\\/agentes/
  );
});

test('AGCHAR-F44-003 routes contiene los contratos de Agentes', () => {
  for (const endpoint of [
    '/api/agentes',
    '/api/agentes/categorias',
    '/api/agentes/completo',
    '/api/agentes/exportar'
  ]) {
    assert.match(routes, new RegExp(endpoint.replaceAll('/', '\\/')));
  }

  assert.match(routes, /\^\\\/api\\\/agentes\\\/\(\\d\+\)\$/);
});

test('AGCHAR-F44-004 controller conserva Token requerido donde correspondía', () => {
  assert.match(controller, /Token requerido/);

  const completeStart = controller.indexOf('async complete');
  const exportStart = controller.indexOf('async exportCsv', completeStart);
  const block = controller.slice(completeStart, exportStart);

  // Importante: ignorar comentarios y comprobar la llamada real.
  assert.doesNotMatch(block, /this\.requireToken\s*\(/);
});

test('AGCHAR-F44-005 categorias conserva error 500 []', () => {
  const start = controller.indexOf('async categories');
  const end = controller.indexOf('async complete', start);
  const block = controller.slice(start, end);

  assert.match(block, /AgentsController\.json\(res, 500, \[\]\)/);
});

test('AGCHAR-F44-006 exportar conserva headers CSV', () => {
  const start = controller.indexOf('async exportCsv');
  const block = controller.slice(start);

  assert.match(block, /text\/csv; charset=utf-8/);
  assert.match(block, /Content-Disposition/);
  assert.match(
    block,
    /agentes_\$\{new Date\(\)\.toISOString\(\)\.slice\(0, 10\)\}\.csv/
  );
});
