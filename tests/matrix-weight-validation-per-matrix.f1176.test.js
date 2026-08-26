const test = require('node:test');
const assert = require('node:assert/strict');

const MatrixService =
  require('../src/modules/matrix/matrix.service');


function createRepository() {
  const calls = [];

  const repository = {
    calls,

    async withTransaction(work) {
      const client = {
        async query() {
          return { rows: [] };
        }
      };

      return work(client);
    },

    async validateFrontWeight(client, input) {
      calls.push({
        method: 'validateFrontWeight',
        input
      });

      return {
        total: 90,
        max: 100
      };
    },

    async validateAttributeWeight(client, input) {
      calls.push({
        method: 'validateAttributeWeight',
        input
      });

      return {
        total: 40,
        max: 50
      };
    },

    async validateSubReasonWeight(client, input) {
      calls.push({
        method: 'validateSubReasonWeight',
        input
      });

      return {
        total: 20,
        max: 25
      };
    }
  };

  return repository;
}


test(
  'WEIGHTMAT-001 frente usa version_matriz_id explícita',
  async () => {

    const repository = createRepository();

    const service =
      new MatrixService(repository);

    service.resolveWriteVersion =
      async (
        client,
        matrizId,
        versionId
      ) => {

        assert.equal(matrizId, 2);
        assert.equal(versionId, 20);

        return {
          matrizId: 2,
          versionId: 20,
          version: 'v2.0.0',
          legacy: false
        };
      };

    const result =
      await service.validateFrontWeight({
        matriz_id: 2,
        version_matriz_id: 20,
        frente_id: 5,
        nuevo_peso: 10
      });

    assert.deepEqual(
      result,
      {
        valid: true,
        total: 90,
        peso_maximo: 100
      }
    );

    const call =
      repository.calls.find(
        c => c.method === 'validateFrontWeight'
      );

    assert.ok(call);

    assert.equal(
      call.input.versionId,
      20
    );
  }
);


test(
  'WEIGHTMAT-002 atributo usa la versión indicada y no una global',
  async () => {

    const repository = createRepository();

    const service =
      new MatrixService(repository);

    let resolved = false;

    service.resolveWriteVersion =
      async (
        client,
        matrizId,
        versionId
      ) => {

        resolved = true;

        assert.equal(matrizId, 3);
        assert.equal(versionId, 30);

        return {
          matrizId: 3,
          versionId: 30,
          version: 'v3.0.0',
          legacy: false
        };
      };

    await service.validateAttributeWeight({
      matriz_id: 3,
      version_matriz_id: 30,
      frente_id: 7,
      atributo_id: 8,
      nuevo_peso: 5
    });

    assert.equal(
      resolved,
      true
    );

    const call =
      repository.calls.find(
        c =>
          c.method ===
          'validateAttributeWeight'
      );

    assert.ok(call);

    assert.equal(
      call.input.versionId,
      30
    );
  }
);


test(
  'WEIGHTMAT-003 submotivo conserva fallback legacy sin contexto',
  async () => {

    const repository = createRepository();

    const service =
      new MatrixService(repository);

    service.resolveWriteVersion =
      async () => {
        throw new Error(
          'No debe resolver contexto explícito'
        );
      };

    const result =
      await service.validateSubReasonWeight({
        atributo_id: 10,
        nuevo_peso: 5
      });

    assert.deepEqual(
      result,
      {
        valid: true,
        total: 20,
        peso_maximo: 25
      }
    );

    const call =
      repository.calls.find(
        c =>
          c.method ===
          'validateSubReasonWeight'
      );

    assert.ok(call);

    assert.equal(
      call.input.versionId,
      null
    );
  }
);