const test = require('node:test');
const assert = require('node:assert/strict');
const MatrixRepository = require('../src/modules/matrix/matrix.repository');

test('MATRIXREAD-001 frentes usa estructura versionada activa', async () => {
  let sql = '';
  const repository = new MatrixRepository({
    async query(q) {
      sql = q;
      return { rows: [{ id: 1, codigo: 'ENC' }] };
    }
  });

  const rows = await repository.listLegacyFrentes();
  assert.equal(rows[0].codigo, 'ENC');
  assert.match(sql, /version_frentes/i);
  assert.match(sql, /versiones_matriz/i);
});

test('MATRIXREAD-002 atributos conserva frente_id como contrato externo', async () => {
  let sql = '';
  const repository = new MatrixRepository({
    async query(q) {
      sql = q;
      return { rows: [] };
    }
  });

  await repository.listLegacyAtributos('7');
  assert.match(sql, /version_frente_id\s+AS\s+frente_id/i);
});

test('MATRIXREAD-003 submotivos conserva atributo_id como contrato externo', async () => {
  let sql = '';
  const repository = new MatrixRepository({
    async query(q) {
      sql = q;
      return { rows: [] };
    }
  });

  await repository.listLegacySubMotivos('9');
  assert.match(sql, /version_atributo_id\s+AS\s+atributo_id/i);
});

test('MATRIXREAD-004 reglas administrativas conserva join y orden legacy', async () => {
  let sql = '';
  const repository = new MatrixRepository({
    async query(q) {
      sql = q;
      return { rows: [{ id: 3, version_nombre: 'v2.0.0' }] };
    }
  });

  const rows = await repository.listLegacyEvaluationRulesAdmin();
  assert.equal(rows[0].id, 3);
  assert.match(sql, /FROM\s+reglas_evaluacion\s+re/i);
  assert.match(sql, /JOIN\s+versiones_matriz\s+vm/i);
  assert.match(sql, /ORDER\s+BY\s+vm\.id,\s*re\.orden/i);
});
