const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const source=fs.readFileSync(
  path.resolve(__dirname,'../server.js'),
  'utf8'
);

test('RECALCMOD-SERVER-001 server delega al módulo',()=>{
  assert.match(source,/createMatrixRecalculationHandler/);
  assert.match(source,/handleMatrixRecalculationRequest/);
});

test('RECALCMOD-SERVER-002 endpoint ya no está inline',()=>{
  assert.doesNotMatch(
    source,
    /if \(ruta === '\/api\/matriz\/recalcular'/
  );
});

test('RECALCMOD-SERVER-003 server no instancia capas internas',()=>{
  assert.doesNotMatch(source,/new MatrixRecalculationRepository/);
  assert.doesNotMatch(source,/new MatrixRecalculationService/);
  assert.doesNotMatch(source,/new MatrixRecalculationController/);
});

test('RECALCMOD-SERVER-004 módulos previos siguen modularizados',()=>{
  assert.match(source,/handleEvaluationsRequest/);
  assert.match(source,/handleSessionsRequest/);
  assert.match(source,/handleRequestsRequest/);
  assert.match(source,/handlePdaRequest/);
  assert.match(source,/handleQuartileCriteriaRequest/);
  assert.match(source,/handleVersionsRequest/);
  assert.match(source,/handleDatabaseStatusRequest/);
  assert.match(source,/handleAudioProxyRequest/);
});
