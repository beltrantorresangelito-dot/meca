const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const server = fs.readFileSync(
  path.resolve(__dirname, '../server.js'),
  'utf8'
);

test('REPMOD-SERVER-001 server solo delega Reportes', () => {
  assert.match(
    server,
    /const \{ createReportsHandler \} = require\('\.\/src\/modules\/reports'\)/
  );
  assert.match(
    server,
    /const handleReportsRequest = createReportsHandler\(\{ db: pool \}\)/
  );
  assert.match(server, /await handleReportsRequest\(\{/);
});

test('REPMOD-SERVER-002 server no conoce ReportsRepository ni ReportsService', () => {
  assert.doesNotMatch(server, /ReportsRepository/);
  assert.doesNotMatch(server, /ReportsService/);
});

test('REPMOD-SERVER-003 no quedan rutas Reportes inline', () => {
  assert.doesNotMatch(
    server,
    /if \(ruta === '\/api\/reportes\//
  );
});
