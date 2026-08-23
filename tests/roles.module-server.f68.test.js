const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const server = fs.readFileSync(path.resolve(__dirname, '../server.js'), 'utf8');

test('ROLEMOD-SERVER-001 server delega Roles', () => {
  assert.match(
    server,
    /const \{ createRolesHandler \} = require\('\.\/src\/modules\/roles'\)/
  );
  assert.match(
    server,
    /const handleRolesRequest = createRolesHandler\(\{ db: pool \}\)/
  );
  assert.match(server, /await handleRolesRequest\(\{/);
});

test('ROLEMOD-SERVER-002 server no conoce repository/service', () => {
  assert.doesNotMatch(server, /new RolesRepository/);
  assert.doesNotMatch(server, /new RolesService/);
  assert.doesNotMatch(server, /rolesRepository\./);
  assert.doesNotMatch(server, /rolesService\./);
});

test('ROLEMOD-SERVER-003 no quedan handlers inline', () => {
  assert.doesNotMatch(server, /if \(ruta === '\/api\/roles/);
  assert.doesNotMatch(server, /if \(ruta === '\/api\/rol-pestanas/);
  assert.doesNotMatch(server, /if \(ruta === '\/api\/pestanas/);
});
