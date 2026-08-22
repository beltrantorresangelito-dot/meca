const test = require('node:test');
const assert = require('node:assert/strict');
const Repository = require('../src/modules/domain/legacy-matrix.repository');
const Service = require('../src/modules/domain/legacy-matrix.service');

test('STRUCT-001 repository arma estructura jerárquica legacy completa', async () => {
  const calls = [];

  const fakeDb = {
    async query(sql, params) {
      calls.push({ sql, params });

      if (/FROM versiones_matriz/i.test(sql)) {
        return { rows: [{ id: 7, version: 'v7', activa: true }] };
      }
      if (/FROM version_frentes/i.test(sql)) {
        return { rows: [{ id: 11, codigo: 'ENC', nombre: 'Cliente', peso_maximo: 15, orden: 1 }] };
      }
      if (/FROM version_atributos/i.test(sql)) {
        return { rows: [{ id: 21, nombre: 'Atributo A', peso_maximo: 15, orden: 1 }] };
      }
      if (/FROM version_sub_motivos/i.test(sql)) {
        return { rows: [{ id: 31, codigo: 'SUB1', descripcion: 'Sub motivo', peso_individual: 15, orden: 1 }] };
      }
      throw new Error('SQL inesperado');
    }
  };

  const repository = new Repository(fakeDb);
  const result = await repository.getLegacyMatrixStructure(7);

  assert.equal(result.version.id, 7);
  assert.equal(result.frentes.length, 1);
  assert.equal(result.frentes[0].atributos.length, 1);
  assert.equal(result.frentes[0].atributos[0].sub_motivos.length, 1);
  assert.equal(result.frentes[0].atributos[0].sub_motivos[0].codigo, 'SUB1');
  assert.equal(calls.length, 4);
});

test('STRUCT-002 repository devuelve null si versión no existe', async () => {
  const repository = new Repository({
    async query(sql) {
      assert.match(sql, /versiones_matriz/i);
      return { rows: [] };
    }
  });

  assert.equal(await repository.getLegacyMatrixStructure(999), null);
});

test('STRUCT-003 service valida versionId positivo', async () => {
  const service = new Service({
    getLegacyMatrixStructure: async () => null
  });

  await assert.rejects(
    () => service.getStructure(0),
    error => error.code === 'VALIDATION_ERROR' && /ID de versión inválido/.test(error.message)
  );
});

test('STRUCT-004 service delega ID normalizado al repository', async () => {
  let received = null;
  const expected = { version: { id: 3 }, frentes: [] };
  const service = new Service({
    getLegacyMatrixStructure: async id => {
      received = id;
      return expected;
    }
  });

  assert.strictEqual(await service.getStructure('3'), expected);
  assert.equal(received, 3);
});
