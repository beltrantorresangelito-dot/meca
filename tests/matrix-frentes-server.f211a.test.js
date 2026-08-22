const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const server = fs.readFileSync(path.resolve(__dirname, '../server.js'), 'utf8');

test('FRSERVER-001 server registra dispatcher de escritura Matrix', () => {
  assert.match(server, /createMatrixWriteHandler/);
  assert.match(server, /await handleMatrixWriteRequest/);
});

test('FRSERVER-002 no quedan escrituras Frentes inline', () => {
  assert.doesNotMatch(
    server,
    /if \(ruta === '\/api\/matriz\/frentes' && metodo === 'POST'\)/
  );
});

test('FRSERVER-003 F2.11-B también extrae Atributos y deja Submotivos pendiente', () => {
  assert.doesNotMatch(
    server,
    /if \(ruta === '\/api\/matriz\/atributos' && metodo === 'POST'\)/
  );
  assert.match(
    server,
    /if \(ruta === '\/api\/matriz\/sub-motivos' && metodo === 'POST'\)/
  );
});
