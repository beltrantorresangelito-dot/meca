const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const server = fs.readFileSync(path.resolve(__dirname, '../server.js'), 'utf8');
const routes = fs.readFileSync(path.resolve(__dirname, '../src/modules/database-status/database-status.routes.js'), 'utf8');
const controller = fs.readFileSync(path.resolve(__dirname, '../src/modules/database-status/database-status.controller.js'), 'utf8');
const service = fs.readFileSync(path.resolve(__dirname, '../src/modules/database-status/database-status.service.js'), 'utf8');
const repository = fs.readFileSync(path.resolve(__dirname, '../src/modules/database-status/database-status.repository.js'), 'utf8');

test('DBSTATFINAL-001 único punto de entrada es handleDatabaseStatusRequest', () => {
  assert.match(server, /await handleDatabaseStatusRequest\(\{/);
  assert.doesNotMatch(server, /if \(ruta === '\/api\/estado-bd'/);
});

test('DBSTATFINAL-002 server ya no instancia capas internas', () => {
  assert.doesNotMatch(server, /new DatabaseStatusRepository/);
  assert.doesNotMatch(server, /new DatabaseStatusService/);
  assert.doesNotMatch(server, /new DatabaseStatusController/);
});

test('DBSTATFINAL-003 routes conserva dos GET y Token', () => {
  assert.ok(routes.includes('/api/estado-bd'));
  assert.ok(routes.includes('/api/estado-bd/tablas'));
  assert.equal((routes.match(/metodo === 'GET'/g) || []).length, 2);
  assert.match(routes, /function requireToken/);
  assert.match(routes, /Token requerido/);
});

test('DBSTATFINAL-004 HTTP y contrato legacy viven en Controller', () => {
  assert.match(controller, /BD Size:/);
  assert.match(controller, /error: error\.message/);
  assert.match(controller, /error\.status \|\| 500/);
  assert.match(controller, /\[\]/);
});

test('DBSTATFINAL-005 cálculos viven en Service', () => {
  assert.match(service, /formatDatabaseSize/);
  assert.match(service, /formatTableSize/);
  assert.match(service, /totalRows/);
  assert.match(service, /totalTables/);
  assert.match(service, /tablas\.sort/);
});

test('DBSTATFINAL-006 tolerancia por tabla vive en Service', () => {
  assert.match(service, /Error procesando \$\{t\.tablename\}/);
  assert.match(service, /total_size_formatted: '0 B'/);
  assert.match(service, /row_count: 0/);
});

test('DBSTATFINAL-007 SQL específico de Estado BD vive en Repository', () => {
  assert.match(repository, /pg_database_size\(current_database\(\)\)/);
  assert.match(repository, /FROM pg_tables/);
  assert.match(repository, /SELECT COUNT\(\*\) as count/);

  assert.doesNotMatch(server, /pg_database_size\(current_database\(\)\)/);
  assert.doesNotMatch(server, /FROM pg_tables\s+WHERE schemaname = 'public'/);
  assert.doesNotMatch(server, /pg_total_relation_size\('public\.'/);
});

test('DBSTATFINAL-008 nombres dinámicos de tabla siguen escapados', () => {
  assert.match(repository, /replace\(\/"\/g, '""'\)/);
});

test('DBSTATFINAL-009 módulos cerrados siguen protegidos', () => {
  assert.match(server, /handleEvaluationsRequest/);
  assert.match(server, /handleSessionsRequest/);
  assert.match(server, /handleRequestsRequest/);
  assert.match(server, /handlePdaRequest/);
  assert.match(server, /handleQuartileCriteriaRequest/);
  assert.match(server, /handleVersionsRequest/);
});

test('DBSTATFINAL-010 autorización central precede dispatcher', () => {
  const authz = server.indexOf('authorizeRequest({');
  const dbStatus = server.indexOf('handleDatabaseStatusRequest({');
  assert.ok(authz >= 0);
  assert.ok(dbStatus >= 0);
  assert.ok(authz < dbStatus);
});
