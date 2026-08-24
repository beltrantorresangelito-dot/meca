const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const source=fs.readFileSync(
  path.resolve(__dirname,'../server.js'),
  'utf8'
);

test('RPCMOD-SERVER-001 server delega Generic RPC',()=>{
  assert.match(source,/createGenericRpcHandler/);
  assert.match(source,/handleGenericRpcRequest/);
});

test('RPCMOD-SERVER-002 endpoint ya no está inline',()=>{
  assert.doesNotMatch(
    source,
    /if \(ruta\.match\(\/\^\\\/api\\\/rpc/
  );
});

test('RPCMOD-SERVER-003 server no instancia capas internas',()=>{
  assert.doesNotMatch(source,/new GenericRpcRepository/);
  assert.doesNotMatch(source,/new GenericRpcService/);
  assert.doesNotMatch(source,/new GenericRpcController/);
});

test('RPCMOD-SERVER-004 parsing RPC salió del server',()=>{
  const marker =
    source.indexOf('handleGenericRpcRequest({');

  assert.ok(marker >= 0);

  const window =
    source.slice(
      Math.max(0, marker - 1000),
      marker + 1500
    );

  assert.doesNotMatch(window,/JSON\.parse\(body\)/);
  assert.doesNotMatch(window,/functionName = ruta\.split/);
});

test('RPCMOD-SERVER-005 Generic Query sigue modularizado',()=>{
  assert.match(source,/handleGenericQueryRequest/);
});

test('RPCMOD-SERVER-006 módulos previos siguen registrados',()=>{
  for(const handler of [
    'handleEvaluationsRequest',
    'handleSessionsRequest',
    'handleRequestsRequest',
    'handlePdaRequest',
    'handleQuartileCriteriaRequest',
    'handleVersionsRequest',
    'handleDatabaseStatusRequest',
    'handleAudioProxyRequest',
    'handleMatrixRecalculationRequest',
    'handleGenericQueryRequest'
  ]){
    assert.match(source,new RegExp(handler));
  }
});
