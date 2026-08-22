const test = require('node:test');
const assert = require('node:assert/strict');
const MatrixRepository = require('../src/modules/matrix/matrix.repository');

test('SUBREPO-001 delete usa version_sub_motivos y no tabla legacy', async () => {
  const calls = [];
  const client = {
    async query(sql, params) {
      calls.push({ sql: String(sql), params });
      if (/SELECT[\s\S]*vsm\.id/i.test(String(sql))) {
        return {
          rows: [{
            id: 30,
            atributo_id: 43,
            codigo: 'Cumple_Speech',
            descripcion: 'Cumple',
            peso_individual: '3.00'
          }]
        };
      }
      return { rows: [] };
    }
  };

  const repository = new MatrixRepository(client);
  const deleted = await repository.deleteSubReason(client, 30, 4);

  assert.equal(deleted.codigo, 'Cumple_Speech');
  const allSql = calls.map(c => c.sql).join('\n');
  assert.match(allSql, /DELETE FROM version_sub_motivos/i);
  assert.doesNotMatch(allSql, /DELETE FROM sub_motivos\b/i);
});

test('SUBREPO-002 suma excluye ID en edición', async () => {
  let sql = '';
  let params;
  const repository = new MatrixRepository({
    async query(q, p) {
      sql = String(q);
      params = p;
      return { rows: [{ total: '5.00' }] };
    }
  });

  const total = await repository.sumActiveSubReasonWeights(
    repository.db, 4, 43, 30
  );

  assert.equal(total, 5);
  assert.match(sql, /vsm\.id != \$3/i);
  assert.deepEqual(params, [4, 43, 30]);
});
