const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.resolve(__dirname,'../server.js'),'utf8');

test('SHELLARCH-F1057-001 sin SQL directo',()=>{
  assert.doesNotMatch(source,/pool\.query\s*\(/);
  assert.doesNotMatch(source,/pool\.connect\s*\(/);
});

test('SHELLARCH-F1057-002 sin funciones de negocio inline',()=>{
  assert.doesNotMatch(source,/^(?:async\s+)?function\s+[A-Za-z_$][\w$]*\s*\(/m);
});

test('SHELLARCH-F1057-003 seguridad transversal centralizada',()=>{
  assert.match(source,/applyCors\(peticion, respuesta\)/);
  assert.match(source,/verifyToken\(bearer/);
  assert.match(source,/authorizeRequest\(\{/);
});

test('SHELLARCH-F1057-004 handlers están preparados antes de createServer',()=>{
  const createServerAt=source.indexOf('http.createServer');
  for(const handler of [
    'handleUsersRequest',
    'handleRolesRequest',
    'handleEvaluationsRequest',
    'handleMatrixReadRequest',
    'handleMatrixWriteRequest'
  ]){
    const first=source.indexOf(handler);
    assert.ok(first>=0,`${handler} no encontrado`);
    assert.ok(first<createServerAt,`${handler} no está compuesto antes de createServer`);
  }
});

test('SHELLARCH-F1057-005 pipeline secuencial explícito',()=>{
  const authz=source.indexOf('authorizeRequest({');
  const health=source.indexOf('handleHealthRequest({');
  const users=source.indexOf('handleUsersRequest({',source.indexOf('http.createServer'));
  const query=source.indexOf('handleGenericQueryRequest({');
  const write=source.indexOf('handleMatrixWriteRequest({',source.indexOf('http.createServer'));
  const fallback=source.indexOf("error: 'Ruta no encontrada'");
  assert.ok(authz>=0);
  assert.ok(health>authz);
  assert.ok(users>health);
  assert.ok(query>users);
  assert.ok(write>query);
  assert.ok(fallback>write);
});

test('SHELLARCH-F1057-006 bootstrap y listen permanecen',()=>{
  assert.match(source,/http\.createServer/);
  assert.match(source,/servidor\.listen\(PORT, HOST/);
});

test('SHELLARCH-F1057-007 sin infraestructura legacy',()=>{
  assert.doesNotMatch(source,/registerDomainRoutes/);
  assert.doesNotMatch(source,/const routes\s*=\s*\{\}/);
  assert.doesNotMatch(source,/routes\[ruta\]/);
});

test('SHELLARCH-F1057-008 tamaño preventivo acotado',()=>{
  const lines=source.split(/\r?\n/).length;
  assert.ok(lines<450,`server.js volvió a crecer: ${lines} líneas`);
});
