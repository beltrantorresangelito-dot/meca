const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const server=fs.readFileSync(path.resolve(__dirname,'../server.js'),'utf8');
const routes=fs.readFileSync(
  path.resolve(
    __dirname,
    '../src/modules/matrix-recalculation/matrix-recalculation.routes.js'
  ),
  'utf8'
);

test('RECALC-F1034-001 server registra dispatcher',()=>{
  assert.match(server,/createMatrixRecalculationHandler/);
  assert.match(server,/handleMatrixRecalculationRequest/);
});

test('RECALC-F1034-002 contrato POST migró a routes',()=>{
  assert.ok(routes.includes('/api/matriz/recalcular'));
  assert.match(routes,/metodo === 'POST'/);
});

test('RECALC-F1034-003 Token requerido migró a routes',()=>{
  assert.match(routes,/function requireToken/);
  assert.match(routes,/Token requerido/);
  assert.match(routes,/401/);
});

test('RECALC-F1034-004 server ya no conoce capas internas',()=>{
  assert.doesNotMatch(server,/matrixRecalculationRepository\./);
  assert.doesNotMatch(server,/matrixRecalculationService\./);
  assert.doesNotMatch(server,/matrixRecalculationController\./);
});

test('RECALC-F1034-005 módulos previos permanecen protegidos',()=>{
  assert.match(server,/handleEvaluationsRequest/);
  assert.match(server,/handleSessionsRequest/);
  assert.match(server,/handleRequestsRequest/);
  assert.match(server,/handlePdaRequest/);
  assert.match(server,/handleQuartileCriteriaRequest/);
  assert.match(server,/handleVersionsRequest/);
  assert.match(server,/handleDatabaseStatusRequest/);
  assert.match(server,/handleAudioProxyRequest/);
});
