const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const server = fs.readFileSync(
  path.resolve(__dirname, '../server.js'),
  'utf8'
);

test('LISTMOD-SERVER-001 server solo delega Listenings', () => {
  assert.match(
    server,
    /const \{ createListeningsHandler \} = require\('\.\/src\/modules\/listenings'\)/
  );

  assert.match(
    server,
    /const handleListeningsRequest = createListeningsHandler\(\{ db: pool \}\)/
  );

  assert.match(server, /await handleListeningsRequest\(\{/);
});

test('LISTMOD-SERVER-002 server no conoce repository/service internos', () => {
  assert.doesNotMatch(server, /ListeningsRepository/);
  assert.doesNotMatch(server, /ListeningsService/);
});

test('LISTMOD-SERVER-003 no quedan handlers Escuchas inline', () => {
  assert.doesNotMatch(
    server,
    /if \(ruta === '\/api\/escuchas\//
  );
});
