const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(
  path.resolve(__dirname, '../server.js'),
  'utf8'
);

test('F11511-SERVER-001 Domain está compuesto', () => {
  assert.match(source, /createDomainHandler/);
  assert.match(source, /handleDomainRequest/);
});

test('F11511-SERVER-002 Domain recibe query string', () => {
  assert.match(
    source,
    /query:\s*urlParseada\.query/
  );
});

test('F11511-SERVER-003 no revive mini-router legacy', () => {
  assert.doesNotMatch(source, /registerDomainRoutes/);
  assert.doesNotMatch(source, /const routes\s*=\s*\{\}/);
  assert.doesNotMatch(source, /routes\[ruta\]/);
});

test('F11511-SERVER-004 Domain queda después de auth', () => {
  const authz = source.indexOf('authorizeRequest({');
  const domain = source.indexOf('handleDomainRequest({');

  assert.ok(authz >= 0);
  assert.ok(domain > authz);
});
