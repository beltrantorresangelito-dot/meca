const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const server = fs.readFileSync(
  path.resolve(__dirname, '../server.js'),
  'utf8'
);

test('legacy-matrix-versions-list-server.f27 compatibilidad: F2.9 conserva delegación Matrix modular', () => {
  assert.match(server, /handleMatrixReadRequest/);
  assert.match(server, /src\/modules\/matrix/);
  assert.doesNotMatch(server, /legacyMatrixService/);
});
