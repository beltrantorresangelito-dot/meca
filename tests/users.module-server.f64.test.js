const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const server = fs.readFileSync(
  path.resolve(__dirname, '../server.js'),
  'utf8'
);

test('USRMOD-SERVER-001 server solo delega Users/Auth', () => {
  assert.match(
    server,
    /const \{ createUsersHandler \} = require\('\.\/src\/modules\/users'\)/
  );

  assert.match(
    server,
    /const handleUsersRequest = createUsersHandler\(\{/
  );

  assert.match(
    server,
    /await handleUsersRequest\(\{/
  );
});

test('USRMOD-SERVER-002 server no conoce Repository/Service internos', () => {
  assert.doesNotMatch(server, /new UsersRepository/);
  assert.doesNotMatch(server, /new UsersService/);
});

test('USRMOD-SERVER-003 Roles permanecen separados de Users y delegados al RolesModule', () => {
  assert.match(
    server,
    /const \{ createRolesHandler \} = require\('\.\/src\/modules\/roles'\)/
  );
  assert.match(
    server,
    /const handleRolesRequest = createRolesHandler\(\{ db: pool \}\)/
  );
  assert.match(server, /await handleRolesRequest\(\{/);

  assert.doesNotMatch(server, /new RolesRepository/);
  assert.doesNotMatch(server, /new RolesService/);
});
