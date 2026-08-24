const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const server=fs.readFileSync(
  path.resolve(__dirname,'../server.js'),
  'utf8'
);

const routes=fs.readFileSync(
  path.resolve(
    __dirname,
    '../src/modules/generic-query/generic-query.routes.js'
  ),
  'utf8'
);

test('GENQUERY-F1040-001 server registra dispatcher',()=>{
  assert.match(server,/createGenericQueryHandler/);
  assert.match(server,/handleGenericQueryRequest/);
});

test('GENQUERY-F1040-002 contrato POST migró a routes',()=>{
  assert.match(routes,/\/api\/query/);
  assert.match(routes,/metodo === 'POST'/);
});

test('GENQUERY-F1040-003 lectura body migró a routes',()=>{
  assert.match(routes,/req\.on\(/);
  assert.match(routes,/'data'/);
  assert.match(routes,/'end'/);
});

test('GENQUERY-F1040-004 JSON.parse migró a routes',()=>{
  assert.match(routes,/JSON\.parse\(body\)/);
  assert.doesNotMatch(
    server,
    /if \(ruta === '\/api\/query'[\s\S]*JSON\.parse\(body\)/
  );
});

test('GENQUERY-F1040-005 routes construye las tres capas',()=>{
  assert.match(routes,/new GenericQueryRepository\(db\)/);
  assert.match(routes,/new GenericQueryService\(repository\)/);
  assert.match(routes,/new GenericQueryController\(service\)/);
});

test('GENQUERY-F1040-006 módulos previos permanecen protegidos',()=>{
  for(const handler of [
    'handleEvaluationsRequest',
    'handleSessionsRequest',
    'handleRequestsRequest',
    'handlePdaRequest',
    'handleQuartileCriteriaRequest',
    'handleVersionsRequest',
    'handleDatabaseStatusRequest',
    'handleAudioProxyRequest',
    'handleMatrixRecalculationRequest'
  ]){
    assert.match(server,new RegExp(handler));
  }
});
