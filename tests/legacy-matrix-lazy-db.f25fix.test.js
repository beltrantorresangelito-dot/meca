const test = require('node:test');
const assert = require('node:assert/strict');

test('LEGACYDB-001 importar Repository no carga models/database', () => {
  const databasePath = require.resolve('../models/database');
  delete require.cache[databasePath];

  const repositoryPath = require.resolve(
    '../src/modules/domain/legacy-matrix.repository'
  );
  delete require.cache[repositoryPath];

  require(repositoryPath);

  assert.equal(
    require.cache[databasePath],
    undefined,
    'El Repository no debe abrir/cargar PostgreSQL solo por ser importado'
  );
});

test('LEGACYDB-002 fake DB evita cargar PostgreSQL', async () => {
  const databasePath = require.resolve('../models/database');
  delete require.cache[databasePath];

  const Repository = require(
    '../src/modules/domain/legacy-matrix.repository'
  );

  const repository = new Repository({
    async query() {
      return { rows: [{ id: 1, version: 'v1' }] };
    }
  });

  const result = await repository.getLegacyActiveMatrixVersion();

  assert.equal(result.id, 1);
  assert.equal(require.cache[databasePath], undefined);
});
