const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const upSql = fs.readFileSync(
  path.resolve(__dirname, '../migrations/0005_campana_matriz_vigencia.up.sql'),
  'utf8'
);
const downSql = fs.readFileSync(
  path.resolve(__dirname, '../migrations/0005_campana_matriz_vigencia.down.sql'),
  'utf8'
);

test('CAMMAT-001 crea tabla de relación campana_matriz', () => {
  assert.match(upSql, /CREATE\s+TABLE\s+campana_matriz/i);
});

test('CAMMAT-002 relación usa campana_id y matriz_id', () => {
  assert.match(upSql, /campana_id\s+BIGINT\s+NOT\s+NULL/i);
  assert.match(upSql, /matriz_id\s+BIGINT\s+NOT\s+NULL/i);
  assert.match(upSql, /REFERENCES\s+campanas\s*\(\s*id\s*\)/i);
  assert.match(upSql, /REFERENCES\s+matrices\s*\(\s*id\s*\)/i);
});

test('CAMMAT-003 permite compartir una matriz entre múltiples campañas', () => {
  assert.doesNotMatch(upSql, /UNIQUE\s*\(\s*matriz_id\s*\)/i);
});

test('CAMMAT-004 incorpora vigencia temporal', () => {
  assert.match(upSql, /vigente_desde\s+DATE\s+NOT\s+NULL/i);
  assert.match(upSql, /vigente_hasta\s+DATE/i);
  assert.match(upSql, /vigente_hasta\s+IS\s+NULL\s+OR\s+vigente_hasta\s+>=\s+vigente_desde/i);
});

test('CAMMAT-005 valida que campaña y matriz sean del mismo Quiebre', () => {
  assert.match(upSql, /validar_campana_matriz/i);
  assert.match(upSql, /v_quiebre_campana\s*<>\s*v_quiebre_matriz/i);
});

test('CAMMAT-006 evita vigencias activas solapadas por campaña', () => {
  assert.match(upSql, /daterange/i);
  assert.match(upSql, /vigencia solapada/i);
});

test('CAMMAT-007 migra campañas actuales hacia MATRIZ_COBRANZAS', () => {
  assert.match(upSql, /'COBRANZAS'/);
  assert.match(upSql, /'MATRIZ_COBRANZAS'/);
  assert.match(upSql, /INSERT\s+INTO\s+campana_matriz/i);
});

test('CAMMAT-008 valida que no queden campañas sin matriz activa', () => {
  assert.match(upSql, /v_huerfanas/i);
  assert.match(upSql, /Migración incompleta/i);
});

test('CAMMAT-009 no altera evaluaciones ni versiones históricas', () => {
  assert.doesNotMatch(upSql, /ALTER\s+TABLE\s+evaluaciones/i);
  assert.doesNotMatch(upSql, /ALTER\s+TABLE\s+versiones_matriz/i);
});

test('CAMMAT-010 rollback elimina solo la relación nueva', () => {
  assert.match(downSql, /DROP\s+TABLE\s+IF\s+EXISTS\s+campana_matriz/i);
  assert.doesNotMatch(downSql, /DROP\s+TABLE\s+IF\s+EXISTS\s+campanas/i);
  assert.doesNotMatch(downSql, /DROP\s+TABLE\s+IF\s+EXISTS\s+matrices/i);
});
