const test = require('node:test');
const assert = require('node:assert/strict');
const MatrixRepository = require('../src/modules/matrix/matrix.repository');

test('FRREPO-001 transacción hace COMMIT en éxito', async () => {
  const calls = [];
  const db = {
    async query(sql) {
      calls.push(sql);
      return { rows: [] };
    }
  };

  const repository = new MatrixRepository(db);
  const result = await repository.withTransaction(async () => 'OK');

  assert.equal(result, 'OK');
  assert.equal(calls[0], 'BEGIN');
  assert.equal(calls.at(-1), 'COMMIT');
});

test('FRREPO-002 transacción hace ROLLBACK ante fallo', async () => {
  const calls = [];
  const db = {
    async query(sql) {
      calls.push(sql);
      return { rows: [] };
    }
  };

  const repository = new MatrixRepository(db);

  await assert.rejects(
    () => repository.withTransaction(async () => {
      throw new Error('fallo');
    }),
    /fallo/
  );

  assert.ok(calls.includes('ROLLBACK'));
  assert.ok(!calls.includes('COMMIT'));
});

test('FRREPO-003 delete usa solo tablas versionadas y orden seguro', async () => {
  const calls = [];
  const client = {
    async query(sql, params) {
      calls.push({ sql: String(sql), params });
      if (/SELECT id, codigo, nombre/i.test(sql)) {
        return {
          rows: [{
            id: 10,
            codigo: 'ENC',
            nombre: 'Errores No Críticos',
            peso_maximo: '15.00'
          }]
        };
      }
      return { rows: [] };
    }
  };

  const repository = new MatrixRepository(client);
  const front = await repository.deleteFrontTree(client, 10, 4);

  assert.equal(front.id, 10);

  const allSql = calls.map(c => c.sql).join('\n');
  assert.match(allSql, /DELETE FROM version_sub_motivos/i);
  assert.match(allSql, /DELETE FROM version_atributos/i);
  assert.match(allSql, /DELETE FROM version_frentes/i);
  assert.doesNotMatch(allSql, /DELETE FROM frentes\b/i);
  assert.doesNotMatch(allSql, /DELETE FROM atributos\b/i);
  assert.doesNotMatch(allSql, /DELETE FROM sub_motivos\b/i);
});
