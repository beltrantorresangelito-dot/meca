const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const sql = fs.readFileSync(
  path.resolve(__dirname, '../migrations/0007_fix_domain_resolution_types.up.sql'),
  'utf8'
);

test('DOMFIX-001 castea campana.id a BIGINT', () => {
  assert.match(sql, /c\.id::BIGINT/i);
});

test('DOMFIX-002 castea version_matriz.id a BIGINT', () => {
  assert.match(sql, /vm\.id::BIGINT/i);
});

test('DOMFIX-003 castea códigos y versión al contrato VARCHAR', () => {
  assert.match(sql, /q\.codigo::VARCHAR/i);
  assert.match(sql, /c\.codigo::VARCHAR/i);
  assert.match(sql, /m\.codigo::VARCHAR/i);
  assert.match(sql, /vm\.version::VARCHAR/i);
});

test('DOMFIX-004 no altera tablas ni datos', () => {
  assert.doesNotMatch(sql, /ALTER\s+TABLE/i);
  assert.doesNotMatch(sql, /UPDATE\s+/i);
  assert.doesNotMatch(sql, /DELETE\s+FROM/i);
});
