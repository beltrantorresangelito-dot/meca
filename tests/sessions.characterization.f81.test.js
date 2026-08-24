const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const server=fs.readFileSync(path.resolve(__dirname,'../server.js'),'utf8');
const routes=fs.readFileSync(path.resolve(__dirname,'../src/modules/sessions/sessions.routes.js'),'utf8');

test('SESSCHAR-F85-001 server registra dispatcher',()=>{
  assert.match(server,/createSessionsHandler/);
  assert.match(server,/handleSessionsRequest/);
});
test('SESSCHAR-F85-002 rutas migraron',()=>{
  assert.match(routes,/\/api\/sesiones\/crear/);
  assert.match(routes,/\/api\/sesiones\/cerrar/);
  assert.match(routes,/cerrar-todas/);
  assert.match(routes,/\/api\/historial-login/);
});
test('SESSCHAR-F85-003 parsing migró a routes',()=>{
  assert.match(routes,/function readJsonBody/);
  assert.match(routes,/JSON\.parse\(body\)/);
});
test('SESSCHAR-F85-004 Token requerido preservado',()=>{
  assert.match(routes,/function requireToken/);
  assert.match(routes,/Token requerido/);
});
test('SESSCHAR-F85-005 server ya no conoce capas internas',()=>{
  assert.doesNotMatch(server,/sessionsRepository\./);
  assert.doesNotMatch(server,/sessionsService\./);
  assert.doesNotMatch(server,/sessionsController\./);
});
test('SESSCHAR-F85-006 F7 permanece modularizado',()=>{
  assert.match(server,/createEvaluationsHandler/);
  assert.match(server,/handleEvaluationsRequest/);
});
