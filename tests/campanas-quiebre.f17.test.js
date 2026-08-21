const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const upSql = fs.readFileSync(
  path.resolve(__dirname, '../migrations/0003_campanas_quiebre.up.sql'),
  'utf8'
);
const downSql = fs.readFileSync(
  path.resolve(__dirname, '../migrations/0003_campanas_quiebre.down.sql'),
  'utf8'
);

test('CAMQ-001 agrega quiebre_id a campanas', () => {
  assert.match(upSql, /ALTER\s+TABLE\s+campanas[\s\S]*ADD\s+COLUMN\s+quiebre_id/i);
});

test('CAMQ-002 migra campañas existentes a COBRANZAS', () => {
  assert.match(upSql, /WHERE\s+codigo\s*=\s*'COBRANZAS'/i);
  assert.match(upSql, /UPDATE\s+campanas/i);
});

test('CAMQ-003 valida que no queden campañas huérfanas', () => {
  assert.match(upSql, /campanas[\s\S]*quiebre_id\s+IS\s+NULL/i);
  assert.match(upSql, /RAISE\s+EXCEPTION/i);
});

test('CAMQ-004 quiebre_id queda obligatorio', () => {
  assert.match(upSql, /ALTER\s+COLUMN\s+quiebre_id\s+SET\s+NOT\s+NULL/i);
});

test('CAMQ-005 agrega FK campanas -> quiebres', () => {
  assert.match(upSql, /FOREIGN\s+KEY\s*\(\s*quiebre_id\s*\)/i);
  assert.match(upSql, /REFERENCES\s+quiebres\s*\(\s*id\s*\)/i);
});

test('CAMQ-006 no modifica evaluaciones ni asignaciones_escucha', () => {
  assert.doesNotMatch(upSql, /ALTER\s+TABLE\s+evaluaciones/i);
  assert.doesNotMatch(upSql, /ALTER\s+TABLE\s+asignaciones_escucha/i);
});

test('CAMQ-007 rollback elimina solo la relación nueva', () => {
  assert.match(downSql, /DROP\s+COLUMN\s+IF\s+EXISTS\s+quiebre_id/i);
  assert.doesNotMatch(downSql, /DROP\s+TABLE\s+campanas/i);
  assert.doesNotMatch(downSql, /DROP\s+TABLE\s+quiebres/i);
});
