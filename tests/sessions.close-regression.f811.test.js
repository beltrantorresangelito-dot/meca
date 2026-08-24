const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const routes=fs.readFileSync(path.resolve(__dirname,'../src/modules/sessions/sessions.routes.js'),'utf8');
const controller=fs.readFileSync(path.resolve(__dirname,'../src/modules/sessions/sessions.controller.js'),'utf8');

test('SESSFIX-811-001 closeSession delega controller',()=>{
  assert.match(routes,/controller\.closeSession\(\s*respuesta,\s*body\.sessionToken/);
});
test('SESSFIX-811-002 afectadas permanece en Controller',()=>{
  assert.match(controller,/\{ success: true, afectadas \}/);
  assert.doesNotMatch(controller,/\beliminados\b/);
});
test('SESSFIX-811-003 historial conserva 200 tolerante',()=>{
  assert.match(routes,/SessionsController\.json\(\s*respuesta,\s*200/);
});
