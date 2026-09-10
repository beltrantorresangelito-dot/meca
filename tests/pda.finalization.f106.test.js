const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const server = fs.readFileSync(
  path.resolve(__dirname, '../server.js'),
  'utf8'
);

const routes = fs.readFileSync(
  path.resolve(__dirname, '../src/modules/pda/pda.routes.js'),
  'utf8'
);

const controller = fs.readFileSync(
  path.resolve(__dirname, '../src/modules/pda/pda.controller.js'),
  'utf8'
);

const service = fs.readFileSync(
  path.resolve(__dirname, '../src/modules/pda/pda.service.js'),
  'utf8'
);

const repository = fs.readFileSync(
  path.resolve(__dirname, '../src/modules/pda/pda.repository.js'),
  'utf8'
);

test('PDAFINAL-001 único punto de entrada en server es handlePdaRequest', () => {
  assert.match(server, /await handlePdaRequest\(\{/);

  assert.doesNotMatch(server, /if \(ruta === '\/api\/pda\/pendientes'/);
  assert.doesNotMatch(server, /if \(ruta === '\/api\/pda\/seguimiento'/);
  assert.doesNotMatch(server, /if \(ruta === '\/api\/pda\/historial'/);
  assert.doesNotMatch(server, /if \(ruta === '\/api\/pda\/exportar'/);
});

test('PDAFINAL-002 server ya no instancia capas internas PDA', () => {
  assert.doesNotMatch(server, /new PdaRepository/);
  assert.doesNotMatch(server, /new PdaService/);
  assert.doesNotMatch(server, /new PdaController/);
});

test('PDAFINAL-003 routes conserva los cinco endpoints GET', () => {
  assert.ok(
    routes.includes('/api/pda/pendientes')
  );

  assert.ok(
    routes.includes('/api/pda/seguimiento')
  );

  assert.ok(
    routes.includes('/api/pda/historial')
  );

  assert.ok(
    routes.includes('/api/pda/exportar')
  );

  assert.ok(
    routes.includes('^\\/api\\/pda\\/(\\d+)$')
  );
});

test('PDAFINAL-004 Token requerido permanece en routes', () => {
  assert.match(routes, /function requireToken/);
  assert.match(routes, /Token requerido/);
  assert.match(routes, /401/);
});

test('PDAFINAL-005 tolerancia legacy de listas vacías vive en Controller', () => {
  assert.match(controller, /Tabla pda_cabecera no existe/);
  assert.match(controller, /PdaController\.json\(res, 200, \[\]\)/);
});

test('PDAFINAL-006 404 de detalle vive en Controller', () => {
  assert.match(controller, /PDA no encontrado/);
  assert.match(controller, /404/);
});

test('PDAFINAL-007 progreso vive en Service', () => {
  assert.match(service, /const totalAcciones = acciones\.length/);
  assert.match(service, /const completadas = acciones\.filter/);
  assert.match(service, /Math\.round\(\(completadas \/ totalAcciones\) \* 100\)/);
});

test('PDAFINAL-008 SQL PDA está encapsulado en Repository', () => {
  assert.match(repository, /FROM pda_cabecera/);
  assert.match(repository, /FROM pda_acciones/);
  assert.match(repository, /LEFT JOIN pda_acciones/);

  assert.doesNotMatch(server, /FROM pda_cabecera/);
  assert.doesNotMatch(server, /FROM pda_acciones/);
  assert.doesNotMatch(server, /LEFT JOIN pda_acciones/);
});

test('PDAFINAL-009 F7 F8 F9 siguen modularizados', () => {
  assert.match(server, /handleEvaluationsRequest/);
  assert.match(server, /handleSessionsRequest/);
  assert.match(server, /handleRequestsRequest/);
});

test('PDAFINAL-010 autorización central precede dispatcher PDA', () => {
  const authz = server.indexOf('authorizeRequest({');
  const pda = server.indexOf('handlePdaRequest({');

  assert.ok(authz >= 0);
  assert.ok(pda >= 0);
  assert.ok(authz < pda);
});
