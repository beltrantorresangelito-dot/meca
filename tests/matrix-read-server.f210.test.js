const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const server = fs.readFileSync(path.resolve(__dirname, '../server.js'), 'utf8');

test('MATRIXREADSERVER-001 no quedan cuatro GET inline', () => {
  assert.doesNotMatch(server, /if \(ruta === '\/api\/matriz\/frentes' && metodo === 'GET'\)/);
  assert.doesNotMatch(server, /if \(ruta === '\/api\/matriz\/atributos' && metodo === 'GET'\)/);
  assert.doesNotMatch(server, /if \(ruta === '\/api\/matriz\/sub-motivos' && metodo === 'GET'\)/);
  assert.doesNotMatch(server, /if \(ruta === '\/api\/reglas-evaluacion' && metodo === 'GET'\)/);
});

test('MATRIXREADSERVER-002 escrituras Matrix permanecen inline para F2.11', () => {
  assert.match(server, /if \(ruta === '\/api\/matriz\/frentes' && metodo === 'POST'\)/);
  assert.match(server, /if \(ruta === '\/api\/matriz\/atributos' && metodo === 'POST'\)/);
  assert.match(server, /if \(ruta === '\/api\/matriz\/sub-motivos' && metodo === 'POST'\)/);
  assert.match(server, /if \(ruta === '\/api\/reglas-evaluacion' && metodo === 'POST'\)/);
});

test('MATRIXREADSERVER-003 dispatcher Matrix sigue antes del CRUD de reglas', () => {
  const dispatcher = server.indexOf('await handleMatrixReadRequest');
  const postRules = server.indexOf("if (ruta === '/api/reglas-evaluacion' && metodo === 'POST')");
  assert.ok(dispatcher > -1);
  assert.ok(postRules > dispatcher);
});
