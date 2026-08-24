const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const source=fs.readFileSync(
  path.resolve(__dirname,'../server.js'),
  'utf8'
);

test('HTTPSHELL-F1051-001 server registra HttpStaticViews handler',()=>{
  assert.match(source,/createHttpStaticViewsHandler/);
  assert.match(source,/handleHttpStaticViewsRequest/);
});

test('HTTPSHELL-F1051-002 helpers ya no existen inline',()=>{
  assert.doesNotMatch(source,/function servirArchivoEstatico/);
  assert.doesNotMatch(source,/function servirVista/);
});

test('HTTPSHELL-F1051-003 fs.readFile de estáticos/vistas salió del server',()=>{
  assert.doesNotMatch(source,/path\.join\(__dirname, 'public'/);
  assert.doesNotMatch(source,/path\.join\(__dirname, 'views'/);
});

test('HTTPSHELL-F1051-004 rutas HTML inline eliminadas',()=>{
  assert.doesNotMatch(source,/ruta === '\/login'/);
  assert.doesNotMatch(source,/ruta === '\/supervisor'/);
  assert.doesNotMatch(source,/ruta === '\/auditor'/);
});

test('HTTPSHELL-F1051-005 dispatcher HTTP shell aparece una vez',()=>{
  const matches=source.match(/handleHttpStaticViewsRequest\(\{/g)||[];
  assert.equal(matches.length,1);
});

test('HTTPSHELL-F1052-006 health ya está modularizado',()=>{
  assert.match(source,/createHealthHandler/);
  assert.match(source,/handleHealthRequest/);
  assert.doesNotMatch(source,/registrarRuta\('GET', '\/api\/health'/);
  assert.doesNotMatch(source,/pool\.query\('SELECT NOW\(\)'\)/);
});

test('HTTPSHELL-F1051-007 fallback 404 permanece',()=>{
  assert.match(source,/Ruta no encontrada/);
});

test('HTTPSHELL-F1051-008 módulos cerrados siguen registrados',()=>{
  for(const handler of [
    'handleGenericRpcRequest',
    'handleGenericQueryRequest',
    'handleMatrixRecalculationRequest',
    'handleAudioProxyRequest',
    'handleDatabaseStatusRequest',
    'handleVersionsRequest'
  ]){
    assert.match(source,new RegExp(handler));
  }
});
