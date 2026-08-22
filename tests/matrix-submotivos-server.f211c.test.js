const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const server = fs.readFileSync(path.resolve(__dirname, '../server.js'), 'utf8');

test('SUBSERVER-001 Submotivos ya no tiene POST/DELETE inline', () => {
  assert.doesNotMatch(
    server,
    /if \(ruta === '\/api\/matriz\/sub-motivos' && metodo === 'POST'\)/
  );
  assert.doesNotMatch(server, /DELETE FROM sub_motivos\b/);
});

test('SUBSERVER-002 MatrixWriteHandler sigue registrado', () => {
  assert.match(server, /createMatrixWriteHandler/);
  assert.match(server, /handleMatrixWriteRequest/);
});
