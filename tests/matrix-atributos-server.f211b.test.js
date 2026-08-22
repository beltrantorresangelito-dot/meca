const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const server = fs.readFileSync(path.resolve(__dirname, '../server.js'), 'utf8');

test('ATTRSERVER-001 Atributos ya no tiene escrituras inline', () => {
  assert.doesNotMatch(
    server,
    /if \(ruta === '\/api\/matriz\/atributos' && metodo === 'POST'\)/
  );
  assert.doesNotMatch(server, /DELETE FROM atributos\b/);
});

test('ATTRSERVER-002 F2.11-C también extrae Submotivos', () => {
  assert.doesNotMatch(
    server,
    /if \(ruta === '\/api\/matriz\/sub-motivos' && metodo === 'POST'\)/
  );
  assert.doesNotMatch(server, /DELETE FROM sub_motivos\b/);
});
