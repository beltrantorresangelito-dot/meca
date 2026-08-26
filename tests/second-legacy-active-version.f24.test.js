const test = require('node:test');
const assert = require('node:assert/strict');

const Repository =
  require('../src/modules/domain/legacy-matrix.repository');

const Service =
  require('../src/modules/domain/legacy-matrix.service');


test(
  'LEGACYMAT2-001 repository obtiene version activa de evaluacion por matriz',
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
            version: 'v2.1.0',
            activa: true
          }]
        };
      }
    });

    const row =
      await repository
        .getLegacyEvaluationActiveVersion(1);

    assert.equal(
      row.version,
      'v2.1.0'
    );

    assert.equal(
      row.matriz_id,
      1
    );

    assert.deepEqual(
      params,
      [1]
    );

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
  'LEGACYMAT2-002 service conserva fallback historico cuando matriz no tiene activa',
  async () => {

    let receivedMatrixId = null;

    const service =
      new Service({
        getLegacyEvaluationActiveVersion:
          async matrizId => {

            receivedMatrixId =
              matrizId;

            return null;
          }
      });

    const result =
      await service
        .getEvaluationActiveVersion(1);

    assert.equal(
      receivedMatrixId,
      1
    );

    assert.deepEqual(
      result,
      {
        version: 'default',
        activa: false,
        matriz_id: 1,
        message:
          'No hay versión activa configurada para la matriz'
      }
    );
  }
);


test(
  'LEGACYMAT2-003 service devuelve fila de la matriz sin transformarla',
  async () => {

    const expected = {
      id: 7,
      matriz_id: 1,
      version: 'v2.1.0',
      descripcion: 'Matriz vigente',
      activa: true,
      created_at: '2026-08-22'
    };

    let receivedMatrixId = null;

    const service =
      new Service({
        getLegacyEvaluationActiveVersion:
          async matrizId => {

            receivedMatrixId =
              matrizId;

            return expected;
          }
      });

    const result =
      await service
        .getEvaluationActiveVersion(1);

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