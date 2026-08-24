const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const source=fs.readFileSync(
  path.resolve(__dirname,'../server.js'),
  'utf8'
);

test('GENQMOD-SERVER-001 server delega Generic Query',()=>{
  assert.match(
    source,
    /createGenericQueryHandler/
  );

  assert.match(
    source,
    /handleGenericQueryRequest/
  );
});

test('GENQMOD-SERVER-002 endpoint ya no está inline',()=>{
  assert.doesNotMatch(
    source,
    /if \(ruta === '\/api\/query' && metodo === 'POST'\)/
  );
});

test('GENQMOD-SERVER-003 server no instancia capas internas',()=>{
  assert.doesNotMatch(source,/new GenericQueryRepository/);
  assert.doesNotMatch(source,/new GenericQueryService/);
  assert.doesNotMatch(source,/new GenericQueryController/);
});

test('GENQMOD-SERVER-004 body parsing salió del server',()=>{
  const rpc = source.indexOf(
    "if (ruta.match(/^\\/api\\/rpc\\/[\\w_]+$/)"
  );

  const beforeRpc = source.slice(
    Math.max(0, rpc - 2500),
    rpc
  );

  assert.doesNotMatch(
    beforeRpc,
    /JSON\.parse\(body\)/
  );
});

test('GENQMOD-SERVER-005 módulos previos siguen modularizados',()=>{
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
    assert.match(source,new RegExp(handler));
  }
});
