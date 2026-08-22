const test = require('node:test');
const assert = require('node:assert/strict');

test('DOMAINDB-001 importar DomainRepository no carga PostgreSQL', () => {
  const databasePath = require.resolve('../models/database');
  delete require.cache[databasePath];

  const repositoryPath = require.resolve(
    '../src/modules/domain/domain.repository'
  );
  delete require.cache[repositoryPath];

  require(repositoryPath);

  assert.equal(
    require.cache[databasePath],
    undefined,
    'DomainRepository no debe cargar PostgreSQL solo por ser importado'
  );
});

test('DOMAINDB-002 fake DB evita cargar PostgreSQL', async () => {
  const databasePath = require.resolve('../models/database');
  delete require.cache[databasePath];

  const Repository = require(
    '../src/modules/domain/domain.repository'
  );

  const repository = new Repository({
    async query() {
      return { rows: [{ id: 1, codigo: 'COBRANZAS' }] };
    }
  });

  const rows = await repository.listBreaks();

  assert.equal(rows[0].codigo, 'COBRANZAS');
  assert.equal(require.cache[databasePath], undefined);
});
