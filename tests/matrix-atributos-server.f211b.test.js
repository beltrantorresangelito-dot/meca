const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const server = fs.readFileSync(path.resolve(__dirname, '../server.js'), 'utf8');

test('ATTRSERVER-001 Atributos ya no tiene POST/DELETE inline', () => {
  assert.doesNotMatch(
    server,
    /if \(ruta === '\/api\/matriz\/atributos' && metodo === 'POST'\)/
  );
  assert.doesNotMatch(
    server,
    /DELETE FROM atributos\b/
  );
});

test('ATTRSERVER-002 Submotivos permanece pendiente para F2.11-C', () => {
  assert.match(
    server,
    /if \(ruta === '\/api\/matriz\/sub-motivos' && metodo === 'POST'\)/
  );
});
