const test = require('node:test');
const assert = require('node:assert/strict');
const Repository = require('../src/modules/domain/legacy-matrix.repository');
const Service = require('../src/modules/domain/legacy-matrix.service');

test('LEGACYMAT2-001 repository conserva columnas exactas del endpoint evaluacion', async () => {
  let sql = '';
  const repository = new Repository({
    async query(q) {
      sql = q;
      return { rows: [{ id: 1, version: 'v1', activa: true }] };
    }
  });

  const row = await repository.getLegacyEvaluationActiveVersion();

  assert.equal(row.version, 'v1');
  assert.match(sql, /SELECT\s+id,\s*version,\s*descripcion,\s*activa,\s*created_at/i);
  assert.match(sql, /FROM\s+versiones_matriz/i);
  assert.match(sql, /activa\s*=\s*TRUE/i);
  assert.match(sql, /LIMIT\s+1/i);
});

test('LEGACYMAT2-002 service conserva fallback 200 histórico cuando no hay activa', async () => {
  const service = new Service({
    getLegacyEvaluationActiveVersion: async () => null
  });

  assert.deepEqual(await service.getEvaluationActiveVersion(), {
    version: 'default',
    activa: false,
    message: 'No hay versión activa configurada'
  });
});

test('LEGACYMAT2-003 service devuelve fila sin transformarla cuando existe', async () => {
  const expected = {
    id: 4,
    version: 'v2.0',
    descripcion: 'Matriz vigente',
    activa: true,
    created_at: '2026-08-01'
  };

  const service = new Service({
    getLegacyEvaluationActiveVersion: async () => expected
  });

  assert.strictEqual(await service.getEvaluationActiveVersion(), expected);
});
