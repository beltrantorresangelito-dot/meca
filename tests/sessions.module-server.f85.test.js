const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.resolve(__dirname,'../server.js'),'utf8');

test('SESSMOD-SERVER-001 server delega al módulo',()=>{
  assert.match(source,/createSessionsHandler/);
  assert.match(source,/handleSessionsRequest/);
});
test('SESSMOD-SERVER-002 handlers ya no están inline',()=>{
  assert.doesNotMatch(source,/if \(ruta === '\/api\/sesiones\/crear'/);
  assert.doesNotMatch(source,/if \(ruta === '\/api\/sesiones\/cerrar'/);
  assert.doesNotMatch(source,/if \(ruta === '\/api\/historial-login'/);
});
test('SESSMOD-SERVER-003 server no instancia capas internas',()=>{
  assert.doesNotMatch(source,/new SessionsRepository/);
  assert.doesNotMatch(source,/new SessionsService/);
  assert.doesNotMatch(source,/new SessionsController/);
});
test('SESSMOD-SERVER-004 F7 sigue modularizado',()=>{
  assert.match(source,/createEvaluationsHandler/);
  assert.match(source,/handleEvaluationsRequest/);
});
