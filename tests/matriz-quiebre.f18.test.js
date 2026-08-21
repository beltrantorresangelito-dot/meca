const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const upSql = fs.readFileSync(
  path.resolve(__dirname, '../migrations/0004_matrices_quiebre.up.sql'),
  'utf8'
);
const downSql = fs.readFileSync(
  path.resolve(__dirname, '../migrations/0004_matrices_quiebre.down.sql'),
  'utf8'
);

test('MATQ-001 crea entidad matrices', () => {
  assert.match(upSql, /CREATE\s+TABLE\s+matrices/i);
});

test('MATQ-002 matriz pertenece al quiebre y no a una campaña', () => {
  assert.match(upSql, /quiebre_id\s+BIGINT\s+NOT\s+NULL/i);
  assert.match(upSql, /REFERENCES\s+quiebres\s*\(\s*id\s*\)/i);
  assert.doesNotMatch(upSql, /campana_id/i);
});

test('MATQ-003 permite varias matrices dentro del mismo quiebre', () => {
  assert.match(upSql, /UNIQUE\s*\(\s*quiebre_id\s*,\s*codigo\s*\)/i);
});

test('MATQ-004 crea matriz inicial de COBRANZAS', () => {
  assert.match(upSql, /'MATRIZ_COBRANZAS'/);
  assert.match(upSql, /'Matriz de Cobranzas'/);
});

test('MATQ-005 versiones_matriz obtiene matriz_id', () => {
  assert.match(upSql, /ALTER\s+TABLE\s+versiones_matriz[\s\S]*ADD\s+COLUMN\s+matriz_id/i);
});

test('MATQ-006 migra todas las versiones existentes a la matriz de Cobranzas', () => {
  assert.match(upSql, /UPDATE\s+versiones_matriz/i);
  assert.match(upSql, /MATRIZ_COBRANZAS/);
});

test('MATQ-007 valida que no queden versiones huérfanas', () => {
  assert.match(upSql, /versiones_matriz[\s\S]*matriz_id\s+IS\s+NULL/i);
  assert.match(upSql, /RAISE\s+EXCEPTION/i);
});

test('MATQ-008 matriz_id queda obligatorio y protegido por FK', () => {
  assert.match(upSql, /ALTER\s+COLUMN\s+matriz_id\s+SET\s+NOT\s+NULL/i);
  assert.match(upSql, /FOREIGN\s+KEY\s*\(\s*matriz_id\s*\)/i);
  assert.match(upSql, /REFERENCES\s+matrices\s*\(\s*id\s*\)/i);
});

test('MATQ-009 no modifica campanas, evaluaciones ni detalles_evaluacion', () => {
  assert.doesNotMatch(upSql, /ALTER\s+TABLE\s+campanas/i);
  assert.doesNotMatch(upSql, /ALTER\s+TABLE\s+evaluaciones/i);
  assert.doesNotMatch(upSql, /ALTER\s+TABLE\s+detalles_evaluacion/i);
});

test('MATQ-010 rollback preserva versiones_matriz y elimina solo la nueva estructura', () => {
  assert.match(downSql, /DROP\s+COLUMN\s+IF\s+EXISTS\s+matriz_id/i);
  assert.match(downSql, /DROP\s+TABLE\s+IF\s+EXISTS\s+matrices/i);
  assert.doesNotMatch(downSql, /DROP\s+TABLE\s+IF\s+EXISTS\s+versiones_matriz/i);
});
