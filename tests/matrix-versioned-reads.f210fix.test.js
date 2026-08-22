const test = require('node:test');
const assert = require('node:assert/strict');
const MatrixRepository = require('../src/modules/matrix/matrix.repository');

test('MATRIXVERREAD-001 frentes consulta version_frentes de versión activa', async () => {
  let sql = '';
  const repository = new MatrixRepository({
    async query(q) {
      sql = q;
      return { rows: [{ id: 1, codigo: 'ENC' }] };
    }
  });

  await repository.listLegacyFrentes();

  assert.match(sql, /FROM\s+version_frentes\s+vf/i);
  assert.match(sql, /JOIN\s+versiones_matriz\s+vm/i);
  assert.match(sql, /vm\.activa\s*=\s*TRUE/i);
  assert.doesNotMatch(sql, /FROM\s+frentes\b/i);
});

test('MATRIXVERREAD-002 atributos usa version_atributos y alias frente_id', async () => {
  let sql = '';
  let params = null;
  const repository = new MatrixRepository({
    async query(q, p) {
      sql = q;
      params = p;
      return { rows: [] };
    }
  });

  await repository.listLegacyAtributos('7');

  assert.match(sql, /FROM\s+version_atributos\s+va/i);
  assert.match(sql, /va\.version_frente_id\s+AS\s+frente_id/i);
  assert.match(sql, /vm\.activa\s*=\s*TRUE/i);
  assert.match(sql, /va\.version_frente_id\s*=\s*\$1/i);
  assert.deepEqual(params, ['7']);
  assert.doesNotMatch(sql, /FROM\s+atributos\b/i);
});

test('MATRIXVERREAD-003 submotivos usa version_sub_motivos y alias atributo_id', async () => {
  let sql = '';
  let params = null;
  const repository = new MatrixRepository({
    async query(q, p) {
      sql = q;
      params = p;
      return { rows: [] };
    }
  });

  await repository.listLegacySubMotivos('9');

  assert.match(sql, /FROM\s+version_sub_motivos\s+vsm/i);
  assert.match(sql, /vsm\.version_atributo_id\s+AS\s+atributo_id/i);
  assert.match(sql, /vm\.activa\s*=\s*TRUE/i);
  assert.match(sql, /vsm\.version_atributo_id\s*=\s*\$1/i);
  assert.deepEqual(params, ['9']);
  assert.doesNotMatch(sql, /FROM\s+sub_motivos\b/i);
});

test('MATRIXVERREAD-004 sin filtro mantiene orden jerárquico', async () => {
  const calls = [];
  const repository = new MatrixRepository({
    async query(q, p) {
      calls.push({ q, p });
      return { rows: [] };
    }
  });

  await repository.listLegacyAtributos();
  await repository.listLegacySubMotivos();

  assert.match(calls[0].q, /ORDER\s+BY\s+va\.version_frente_id,\s*va\.orden/i);
  assert.match(calls[1].q, /ORDER\s+BY\s+vsm\.version_atributo_id,\s*vsm\.orden/i);
});
