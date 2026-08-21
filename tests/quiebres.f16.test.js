const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const upSql = fs.readFileSync(
  path.resolve(__dirname, '../migrations/0002_create_quiebres.up.sql'),
  'utf8'
);
const downSql = fs.readFileSync(
  path.resolve(__dirname, '../migrations/0002_create_quiebres.down.sql'),
  'utf8'
);

test('QUI-001 migración crea tabla quiebres', () => {
  assert.match(upSql, /CREATE\s+TABLE\s+quiebres/i);
});

test('QUI-002 código de quiebre es único', () => {
  assert.match(upSql, /UNIQUE\s*\(\s*codigo\s*\)/i);
});

test('QUI-003 registra COBRANZAS como quiebre inicial', () => {
  assert.match(upSql, /'COBRANZAS'/);
  assert.match(upSql, /'Cobranzas'/);
});

test('QUI-004 no altera todavía campanas, evaluaciones ni matrices', () => {
  assert.doesNotMatch(upSql, /ALTER\s+TABLE\s+campanas/i);
  assert.doesNotMatch(upSql, /ALTER\s+TABLE\s+evaluaciones/i);
  assert.doesNotMatch(upSql, /ALTER\s+TABLE\s+versiones_matriz/i);
});

test('QUI-005 rollback elimina únicamente quiebres', () => {
  assert.match(downSql, /DROP\s+TABLE\s+IF\s+EXISTS\s+quiebres/i);
});
