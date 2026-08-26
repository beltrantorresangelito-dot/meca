const test = require('node:test');
const assert = require('node:assert/strict');

const Repository =
  require('../src/modules/domain/legacy-matrix.repository');

const Service =
  require('../src/modules/domain/legacy-matrix.service');


test(
  'LEGACYDATE-001 repository obtiene version por matriz y fecha',
  async () => {

    let sql = '';
    let params = null;

    const repository = new Repository({
      async query(q, p) {

        sql = q;
        params = p;

        return {
          rows: [{
            id: 7,
            matriz_id: 1,
            version: 'v2.1.0'
          }]
        };
      }
    });

    const row =
      await repository
        .getLegacyMatrixVersionByDate(
          1,
          '2026-08-22'
        );

    assert.equal(
      row.id,
      7
    );

    assert.deepEqual(
      params,
      [1, '2026-08-22']
    );

    assert.match(
      sql,
      /matriz_id\s*=\s*\$1/i
    );

    assert.match(
      sql,
      /fecha_vigencia\s*<=\s*\$2/i
    );

    assert.match(
      sql,
      /ORDER\s+BY\s+fecha_vigencia\s+DESC/i
    );

    assert.match(
      sql,
      /LIMIT\s+1/i
    );
  }
);


test(
  'LEGACYDATE-002 devuelve null cuando matriz no tiene version aplicable',
  async () => {

    const repository =
      new Repository({
        async query() {
          return {
            rows: []
          };
        }
      });

    assert.equal(
      await repository
        .getLegacyMatrixVersionByDate(
          1,
          '1900-01-01'
        ),
      null
    );
  }
);


test(
  'LEGACYDATE-003 service exige fecha',
  async () => {

    const service =
      new Service({
        getLegacyMatrixVersionByDate:
          async () => null
      });

    await assert.rejects(
      () =>
        service.getVersionByDate(
          1,
          ''
        ),
      error =>
        error.code ===
          'VALIDATION_ERROR' &&
        /Fecha requerida/.test(
          error.message
        )
    );
  }
);


test(
  'LEGACYDATE-004 service delega matriz y fecha sin transformar resultado',
  async () => {

    const expected = {
      id: 7,
      matriz_id: 1,
      version: 'v2.1.0'
    };

    let receivedMatrixId = null;
    let receivedDate = null;

    const service =
      new Service({
        getLegacyMatrixVersionByDate:
          async (
            matrizId,
            date
          ) => {

            receivedMatrixId =
              matrizId;

            receivedDate =
              date;

            return expected;
          }
      });

    const result =
      await service
        .getVersionByDate(
          1,
          '2026-08-22'
        );

    assert.strictEqual(
      result,
      expected
    );

    assert.equal(
      receivedMatrixId,
      1
    );

    assert.equal(
      receivedDate,
      '2026-08-22'
    );
  }
);