const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const server = fs.readFileSync(path.resolve(__dirname, '../server.js'), 'utf8');

test('MATRIXREADSERVER-001 no quedan GET Matrix inline', () => {
  for (const route of ['frentes', 'atributos', 'sub-motivos']) {
    assert.doesNotMatch(
      server,
      new RegExp(`if \\(ruta === '/api/matriz/${route}' && metodo === 'GET'\\)`)
    );
  }
});

test('MATRIXREADSERVER-002 F2.11-C extrae Frentes, Atributos y Submotivos', () => {
  assert.match(server, /createMatrixWriteHandler/);
  for (const route of ['frentes', 'atributos', 'sub-motivos']) {
    assert.doesNotMatch(
      server,
      new RegExp(`if \\(ruta === '/api/matriz/${route}' && metodo === 'POST'\\)`)
    );
  }
});

test('MATRIXREADSERVER-003 dispatchers Matrix están registrados', () => {
  assert.ok(server.includes('handleMatrixReadRequest'));
  assert.ok(server.includes('handleMatrixWriteRequest'));
});
