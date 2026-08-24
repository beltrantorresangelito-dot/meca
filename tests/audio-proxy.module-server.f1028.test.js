const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');

const source=fs.readFileSync(
  path.resolve(__dirname,'../server.js'),
  'utf8'
);

test('AUDIOMOD-SERVER-001 server delega al módulo',()=>{
  assert.match(source,/createAudioProxyHandler/);
  assert.match(source,/handleAudioProxyRequest/);
});

test('AUDIOMOD-SERVER-002 endpoints ya no están inline',()=>{
  assert.doesNotMatch(
    source,
    /if \(ruta\.startsWith\('\/api\/audio\/reproducir\/'\)/
  );
  assert.doesNotMatch(
    source,
    /if \(ruta\.startsWith\('\/api\/audio\/verificar\/'\)/
  );
});

test('AUDIOMOD-SERVER-003 server no instancia capas internas',()=>{
  assert.doesNotMatch(source,/new AudioProxyService/);
  assert.doesNotMatch(source,/new AudioProxyController/);
});

test('AUDIOMOD-SERVER-004 módulos previos siguen modularizados',()=>{
  assert.match(source,/handleEvaluationsRequest/);
  assert.match(source,/handleSessionsRequest/);
  assert.match(source,/handleRequestsRequest/);
  assert.match(source,/handlePdaRequest/);
  assert.match(source,/handleQuartileCriteriaRequest/);
  assert.match(source,/handleVersionsRequest/);
  assert.match(source,/handleDatabaseStatusRequest/);
});
