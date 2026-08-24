const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const server=fs.readFileSync(path.resolve(__dirname,'../server.js'),'utf8');
const routes=fs.readFileSync(
  path.resolve(__dirname,'../src/modules/audio-proxy/audio-proxy.routes.js'),
  'utf8'
);

test('AUDIO-F1028-001 server registra dispatcher',()=>{
  assert.match(server,/createAudioProxyHandler/);
  assert.match(server,/handleAudioProxyRequest/);
});

test('AUDIO-F1028-002 dos contratos migraron a routes',()=>{
  assert.ok(routes.includes('/api/audio/reproducir/'));
  assert.ok(routes.includes('/api/audio/verificar/'));
  assert.equal((routes.match(/metodo === 'GET'/g)||[]).length,2);
});

test('AUDIO-F1028-003 ticketId se extrae en routes',()=>{
  assert.equal(
    (routes.match(/ruta\.split\('\/'\)\.pop\(\)/g)||[]).length,
    2
  );
});

test('AUDIO-F1028-004 server ya no conoce capas internas',()=>{
  assert.doesNotMatch(server,/audioProxyService\./);
  assert.doesNotMatch(server,/audioProxyController\./);
});

test('AUDIO-F1028-005 static files permanecen después del dispatcher mediante HttpStaticViews',()=>{
  const audio=server.indexOf('handleAudioProxyRequest({');
  const staticViews=server.indexOf('handleHttpStaticViewsRequest({');
  assert.ok(audio>=0);
  assert.ok(staticViews>audio);
});

test('AUDIO-F1028-006 módulos previos permanecen protegidos',()=>{
  assert.match(server,/handleEvaluationsRequest/);
  assert.match(server,/handleSessionsRequest/);
  assert.match(server,/handleRequestsRequest/);
  assert.match(server,/handlePdaRequest/);
  assert.match(server,/handleQuartileCriteriaRequest/);
  assert.match(server,/handleVersionsRequest/);
  assert.match(server,/handleDatabaseStatusRequest/);
});
