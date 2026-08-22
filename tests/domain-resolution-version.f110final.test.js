const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const sql = fs.readFileSync(
  path.resolve(__dirname, '../migrations/0008_domain_resolution_require_version.up.sql'),
  'utf8'
);

test('DOM008-001 valida existencia de versión aplicable', () => {
  assert.match(sql, /v_version_count/i);
  assert.match(sql, /fecha_vigencia\s*<=\s*p_fecha/i);
});

test('DOM008-002 lanza excepción si no existe versión aplicable', () => {
  assert.match(
    sql,
    /no existe una versión de matriz aplicable/i
  );
});

test('DOM008-003 mantiene casts explícitos corregidos en 0007', () => {
  assert.match(sql, /c\.id::BIGINT/i);
  assert.match(sql, /vm\.id::BIGINT/i);
});

test('DOM008-004 no modifica tablas ni datos', () => {
  assert.doesNotMatch(sql, /ALTER\s+TABLE/i);
  assert.doesNotMatch(sql, /UPDATE\s+/i);
  assert.doesNotMatch(sql, /DELETE\s+FROM/i);
});
