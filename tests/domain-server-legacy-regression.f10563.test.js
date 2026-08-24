const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const server = fs.readFileSync(
  path.resolve(__dirname, '../server.js'),
  'utf8'
);

test('DOMLEGACY-F10563-001 arquitectura actual no usa registerDomainRoutes', () => {
  assert.doesNotMatch(server, /registerDomainRoutes/);
  assert.doesNotMatch(server, /const routes\s*=\s*\{\}/);
  assert.doesNotMatch(server, /routes\[ruta\]/);
});

test('DOMLEGACY-F10563-002 handlers modulares siguen presentes', () => {
  for (const handler of [
    'handleUsersRequest',
    'handleRolesRequest',
    'handleMatrixReadRequest',
    'handleMatrixWriteRequest'
  ]) {
    assert.match(server, new RegExp(handler));
  }
});
