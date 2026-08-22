const test = require('node:test');
const assert = require('node:assert/strict');
const MatrixRepository = require('../src/modules/matrix/matrix.repository');

test('ATTRREPO-001 CRUD usa tablas versionadas', async () => {
  const sqls = [];
  const client = {
    async query(sql) {
      sqls.push(String(sql));
      if (/SELECT[\s\S]*FROM version_atributos va[\s\S]*JOIN version_frentes/i.test(sql)) {
        return {
          rows: [{
            id: 43,
            frente_id: 10,
            nombre: 'PROTOCOLOS DE ATENCION',
            peso_maximo: '8.00'
          }]
        };
      }
      if (/COUNT\(\*\)/i.test(sql)) {
        return { rows: [{ total: 3 }] };
      }
      return { rows: [] };
    }
  };

  const repository = new MatrixRepository(client);
  await repository.deleteAttributeTree(client, 43, 4);

  const all = sqls.join('\n');
  assert.match(all, /version_atributos/i);
  assert.match(all, /version_sub_motivos/i);
  assert.match(all, /version_frentes/i);
  assert.doesNotMatch(all, /DELETE FROM atributos\b/i);
  assert.doesNotMatch(all, /DELETE FROM sub_motivos\b/i);
});

test('ATTRREPO-002 update retorna frente_id compatible con frontend', async () => {
  let sql = '';
  const client = {
    async query(q) {
      sql = String(q);
      return {
        rows: [{
          id: 43,
          frente_id: 10,
          nombre: 'X'
        }]
      };
    }
  };

  const repository = new MatrixRepository(client);
  await repository.updateAttribute(client, 43, {
    frontId: 10,
    nombre: 'X',
    pesoMaximo: 8,
    orden: 1,
    activo: true
  });

  assert.match(sql, /version_frente_id\s+AS\s+frente_id/i);
});
