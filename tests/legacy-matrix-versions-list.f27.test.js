const test = require('node:test');
const assert = require('node:assert/strict');
const Repository = require('../src/modules/domain/legacy-matrix.repository');
const Service = require('../src/modules/domain/legacy-matrix.service');

test('VERSIONS-001 repository conserva columnas y orden legacy', async () => {
  let sql = '';
  const expected = [
    { id: 2, version: 'v2' },
    { id: 1, version: 'v1' }
  ];

  const repository = new Repository({
    async query(q) {
      sql = q;
      return { rows: expected };
    }
  });

  assert.strictEqual(await repository.listLegacyMatrixVersions(), expected);
  assert.match(sql, /id[\s\S]*version[\s\S]*descripcion[\s\S]*fecha_vigencia/i);
  assert.match(sql, /creado_por[\s\S]*creado_en[\s\S]*publicado_por[\s\S]*publicado_en/i);
  assert.match(sql, /FROM\s+versiones_matriz/i);
  assert.match(sql, /ORDER\s+BY\s+creado_en\s+DESC/i);
});

test('VERSIONS-002 repository devuelve array vacío sin versiones', async () => {
  const repository = new Repository({
    async query() { return { rows: [] }; }
  });

  assert.deepEqual(await repository.listLegacyMatrixVersions(), []);
});

test('VERSIONS-003 service delega sin transformar array', async () => {
  const expected = [{ id: 3, version: 'v3' }];
  const service = new Service({
    listLegacyMatrixVersions: async () => expected
  });

  assert.strictEqual(await service.listVersions(), expected);
});
