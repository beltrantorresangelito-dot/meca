const test = require('node:test');
const assert = require('node:assert/strict');
const MatrixRepository = require('../src/modules/matrix/matrix.repository');
const MatrixService = require('../src/modules/matrix/matrix.service');

test('MATRIXLISTREAL-001 detecta tabla versiones_matriz', async () => {
  const repository = new MatrixRepository({
    async query(sql) {
      assert.match(sql, /information_schema\.tables/i);
      assert.match(sql, /versiones_matriz/i);
      return { rows: [{ exists: true }] };
    }
  });

  assert.equal(await repository.matrixVersionsTableExists(), true);
});

test('MATRIXLISTREAL-002 devuelve [] si la tabla no existe', async () => {
  let listCalled = false;
  const service = new MatrixService({
    matrixVersionsTableExists: async () => false,
    listLegacyMatrixVersions: async () => {
      listCalled = true;
      return [{ id: 1 }];
    }
  });

  assert.deepEqual(await service.listVersions(), []);
  assert.equal(listCalled, false);
});

test('MATRIXLISTREAL-003 devuelve [] ante error, preservando contrato real legacy', async () => {
  const service = new MatrixService({
    matrixVersionsTableExists: async () => true,
    listLegacyMatrixVersions: async () => {
      throw new Error('fallo DB');
    }
  });

  assert.deepEqual(await service.listVersions(), []);
});

test('MATRIXLISTREAL-004 devuelve versiones cuando la tabla existe', async () => {
  const expected = [{ id: 4, version: 'v2.0.0' }];
  const service = new MatrixService({
    matrixVersionsTableExists: async () => true,
    listLegacyMatrixVersions: async () => expected
  });

  assert.strictEqual(await service.listVersions(), expected);
});
