const test = require('node:test');
const assert = require('node:assert/strict');

const LegacyMatrixService =
  require('../src/modules/domain/legacy-matrix.service');

const Repository =
  require('../src/modules/domain/legacy-matrix.repository');


test(
  'LEGACYMAT-001 repository obtiene version activa de la matriz solicitada',
  async () => {

    let sql = '';
    let params = null;

    const repository = new Repository({
      async query(q, p) {
        sql = q;
        params = p;

        return {
          rows: [
            {
              id: 7,
              matriz_id: 1,
              version: 'v2.1.0',
              activa: true
            }
          ]
        };
      }
    });

    const row =
      await repository.getLegacyActiveMatrixVersion(1);

    assert.equal(row.id, 7);
    assert.equal(row.matriz_id, 1);

    assert.deepEqual(params, [1]);

    assert.match(
      sql,
      /FROM\s+versiones_matriz/i
    );

    assert.match(
      sql,
      /matriz_id\s*=\s*\$1/i
    );

    assert.match(
      sql,
      /activa\s*=\s*TRUE/i
    );

    assert.match(
      sql,
      /LIMIT\s+1/i
    );
  }
);


test(
  'LEGACYMAT-002 repository devuelve null cuando la matriz no tiene version activa',
  async () => {

    const repository = new Repository({
      async query() {
        return {
          rows: []
        };
      }
    });

    assert.equal(
      await repository.getLegacyActiveMatrixVersion(99),
      null
    );
  }
);


test(
  'LEGACYMAT-003 service delega matrizId sin transformar contrato',
  async () => {

    const expected = {
      id: 7,
      matriz_id: 1,
      version: 'v2.1.0',
      activa: true
    };

    let receivedMatrixId = null;

    const service =
      new LegacyMatrixService({
        getLegacyActiveMatrixVersion:
          async matrizId => {

            receivedMatrixId =
              matrizId;

            return expected;
          }
      });

    const result =
      await service.getActiveVersion(1);

    assert.strictEqual(
      result,
      expected
    );

    assert.equal(
      receivedMatrixId,
      1
    );
  }
);