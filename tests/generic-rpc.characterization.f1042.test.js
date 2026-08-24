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
    '../src/modules/generic-rpc/generic-rpc.routes.js'
  ),
  'utf8'
);

test('RPCHAR-F1046-001 server registra dispatcher',()=>{
  assert.match(server,/createGenericRpcHandler/);
  assert.match(server,/handleGenericRpcRequest/);
});

test('RPCHAR-F1046-002 contrato POST migró a routes',()=>{
  assert.match(routes,/\/api\/rpc/);
  assert.match(routes,/metodo === 'POST'/);
});

test('RPCHAR-F1046-003 functionName migró a routes',()=>{
  assert.match(routes,/ruta/);
  assert.match(routes,/split\('\/'\)/);
  assert.match(routes,/replace\(/);
});

test('RPCHAR-F1046-004 lectura body migró a routes',()=>{
  assert.match(routes,/req\.on\(/);
  assert.match(routes,/'data'/);
  assert.match(routes,/'end'/);
});

test('RPCHAR-F1046-005 JSON.parse migró a routes',()=>{
  assert.match(routes,/JSON\.parse\(body\)/);
});

test('RPCHAR-F1046-006 routes construye Repository Service Controller',()=>{
  assert.match(routes,/new GenericRpcRepository\(db\)/);
  assert.match(routes,/new GenericRpcService\(repository\)/);
  assert.match(routes,/new GenericRpcController\(service\)/);
});

test('RPCHAR-F1046-007 Generic Query permanece separado',()=>{
  assert.match(server,/handleGenericQueryRequest/);
  assert.match(server,/handleGenericRpcRequest/);
});
