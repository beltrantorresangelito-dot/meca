const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const server = fs.readFileSync(
  path.resolve(__dirname, '../server.js'),
  'utf8'
);

const routes = fs.readFileSync(
  path.resolve(
    __dirname,
    '../src/modules/matrix-recalculation/matrix-recalculation.routes.js'
  ),
  'utf8'
);

const controller = fs.readFileSync(
  path.resolve(
    __dirname,
    '../src/modules/matrix-recalculation/matrix-recalculation.controller.js'
  ),
  'utf8'
);

const service = fs.readFileSync(
  path.resolve(
    __dirname,
    '../src/modules/matrix-recalculation/matrix-recalculation.service.js'
  ),
  'utf8'
);

const repository = fs.readFileSync(
  path.resolve(
    __dirname,
    '../src/modules/matrix-recalculation/matrix-recalculation.repository.js'
  ),
  'utf8'
);

test('RECALCFINAL-001 único punto de entrada es handleMatrixRecalculationRequest', () => {
  assert.match(server, /await handleMatrixRecalculationRequest\(\{/);
  assert.doesNotMatch(
    server,
    /if \(ruta === '\/api\/matriz\/recalcular' && metodo === 'POST'\)/
  );
});

test('RECALCFINAL-002 server no instancia capas internas', () => {
  assert.doesNotMatch(server, /new MatrixRecalculationRepository/);
  assert.doesNotMatch(server, /new MatrixRecalculationService/);
  assert.doesNotMatch(server, /new MatrixRecalculationController/);
});

test('RECALCFINAL-003 routes conserva POST y Token requerido', () => {
  assert.match(routes, /\/api\/matriz\/recalcular/);
  assert.match(routes, /metodo === 'POST'/);
  assert.match(routes, /Token requerido/);
  assert.match(routes, /401/);
});

test('RECALCFINAL-004 Controller conserva HTTP 200 y error general', () => {
  assert.match(controller, /200/);
  assert.match(controller, /error\.status \|\| 500/);
  assert.match(controller, /Error en recalcular/);
});

test('RECALCFINAL-005 Service conserva tolerancia por detalle', () => {
  assert.match(service, /for \(const detalle of detalles\)/);
  assert.match(service, /errores\+\+/);
  assert.match(service, /Error en detalle \$\{detalle\.id\}/);
});

test('RECALCFINAL-006 Service conserva tolerancia por evaluación', () => {
  assert.match(service, /for \(const evaluacionId of evaluaciones\)/);
  assert.match(service, /Error en evaluación \$\{evaluacionId\}/);
});

test('RECALCFINAL-007 Service conserva contrato de salida', () => {
  for (const field of [
    'success',
    'detalles_actualizados',
    'evaluaciones_actualizadas',
    'errores',
    'resumen',
    'message'
  ]) {
    assert.match(service, new RegExp(field));
  }
});

test('RECALCFINAL-008 Repository concentra SQL del recálculo', () => {
  assert.match(repository, /FROM detalles_evaluacion d/);
  assert.match(repository, /FROM sub_motivos/);
  assert.match(repository, /UPDATE detalles_evaluacion/);
  assert.match(repository, /SELECT DISTINCT evaluacion_id/);
  assert.match(repository, /UPDATE evaluaciones/);
  assert.match(repository, /COUNT\(\*\) as total_evaluaciones/);

  // server.js solo debe registrar/delegar este dominio.
  assert.match(
    server,
    /handleMatrixRecalculationRequest/
  );
  assert.doesNotMatch(
    server,
    /matrixRecalculationRepository\./
  );
  assert.doesNotMatch(
    server,
    /matrixRecalculationService\./
  );
  assert.doesNotMatch(
    server,
    /matrixRecalculationController\./
  );
});

test('RECALCFINAL-009 cálculo conserva ENC ECUF ECN y nota_final', () => {
  assert.match(repository, /bloque = 'ENC'/);
  assert.match(repository, /bloque = 'ECUF'/);
  assert.match(repository, /bloque = 'ECN'/);
  assert.match(repository, /nota_final/);
  assert.match(repository, /cumple = true/);
});

test('RECALCFINAL-010 resumen conserva COUNT AVG MIN MAX', () => {
  assert.match(repository, /COUNT\(\*\) as total_evaluaciones/);
  assert.match(repository, /AVG\(nota_final\)/);
  assert.match(repository, /MIN\(nota_final\)/);
  assert.match(repository, /MAX\(nota_final\)/);
});

test('RECALCFINAL-011 módulos cerrados siguen registrados', () => {
  assert.match(server, /handleEvaluationsRequest/);
  assert.match(server, /handleSessionsRequest/);
  assert.match(server, /handleRequestsRequest/);
  assert.match(server, /handlePdaRequest/);
  assert.match(server, /handleQuartileCriteriaRequest/);
  assert.match(server, /handleVersionsRequest/);
  assert.match(server, /handleDatabaseStatusRequest/);
  assert.match(server, /handleAudioProxyRequest/);
});

test('RECALCFINAL-012 autorización central precede dispatcher', () => {
  const authz = server.indexOf('authorizeRequest({');
  const recalc = server.indexOf('handleMatrixRecalculationRequest({');

  assert.ok(authz >= 0);
  assert.ok(recalc >= 0);
  assert.ok(authz < recalc);
});
