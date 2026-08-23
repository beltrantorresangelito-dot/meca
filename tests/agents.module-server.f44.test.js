const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');

const server = fs.readFileSync(
  path.resolve(__dirname, '../server.js'),
  'utf8'
);

test('AGMOD-SERVER-001 server solo delega Agents', () => {
  assert.match(
    server,
    /const \{ createAgentsHandler \} = require\('\.\/src\/modules\/agents'\)/
  );

  assert.match(
    server,
    /const handleAgentsRequest = createAgentsHandler\(\{ db: pool \}\)/
  );

  assert.match(server, /await handleAgentsRequest\(\{/);
});

test('AGMOD-SERVER-002 server no conoce AgentsRepository ni AgentsService', () => {
  assert.doesNotMatch(server, /AgentsRepository/);
  assert.doesNotMatch(server, /AgentsService/);
});

test('AGMOD-SERVER-003 no quedan handlers Agentes inline', () => {
  assert.doesNotMatch(
    server,
    /if \(ruta === '\/api\/agentes/
  );
});
