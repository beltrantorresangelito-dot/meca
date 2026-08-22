const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const upSql = fs.readFileSync(
  path.resolve(__dirname, '../migrations/0006_domain_resolution.up.sql'),
  'utf8'
);

test('DOM-001 crea resolver_contexto_evaluacion', () => {
  assert.match(upSql, /CREATE\s+OR\s+REPLACE\s+FUNCTION\s+resolver_contexto_evaluacion/i);
});

test('DOM-002 resolver usa campana_matriz y vigencia', () => {
  assert.match(upSql, /campana_matriz/i);
  assert.match(upSql, /vigente_desde\s*<=\s*p_fecha/i);
  assert.match(upSql, /vigente_hasta\s+IS\s+NULL/i);
});

test('DOM-003 resolver obliga a una sola matriz vigente', () => {
  assert.match(upSql, /v_count\s*=\s*0/i);
  assert.match(upSql, /v_count\s*>\s*1/i);
  assert.match(upSql, /RAISE\s+EXCEPTION/i);
});

test('DOM-004 resolver selecciona la última versión vigente por fecha', () => {
  assert.match(upSql, /versiones_matriz/i);
  assert.match(upSql, /fecha_vigencia\s*<=\s*p_fecha/i);
  assert.match(upSql, /ORDER\s+BY\s+vm2\.fecha_vigencia\s+DESC/i);
  assert.match(upSql, /LIMIT\s+1/i);
});

test('DOM-005 no modifica evaluaciones ni datos históricos', () => {
  assert.doesNotMatch(upSql, /ALTER\s+TABLE\s+evaluaciones/i);
  assert.doesNotMatch(upSql, /UPDATE\s+evaluaciones/i);
  assert.doesNotMatch(upSql, /DELETE\s+FROM\s+evaluaciones/i);
});
