const test = require('node:test');
const assert = require('node:assert/strict');
const MatrixService = require('../src/modules/matrix/matrix.service');

function repo(overrides = {}) {
  return {
    withTransaction: async work => work({}),
    getActiveVersionSource: async () => ({ id: 4, matriz_id: 1, version: 'v2.0.0' }),
    findVersionByName: async () => null,
    insertVersion: async (_c, data) => ({ id: 5, ...data }),
    copyVersionTree: async () => ({
      frentes: 3, atributos: 12, sub_motivos: 30, reglas: 1
    }),
    getVersionIntegrity: async () => ({
      ok: true, version_id: 5, total_frentes: 100, violations: []
    }),
    activateVersion: async () => ({ id: 5, activa: true }),
    validateFrontWeight: async () => ({ total: 100, max: 100 }),
    validateAttributeWeight: async () => ({ total: 15, max: 15 }),
    validateSubReasonWeight: async () => ({ total: 8, max: 8 }),
    ...overrides
  };
}

test('VERLIFE-001 snapshot hereda matriz_id y queda inactivo', async () => {
  let inserted = null;
  const service = new MatrixService(repo({
    insertVersion: async (_c, data) => {
      inserted = data;
      return { id: 5 };
    }
  }));

  const result = await service.freezeVersion({
    matriz_id: 1,
    version: 'v3.0.0',
    fecha_vigencia: '2026-09-01',
    descripcion: 'Snapshot'
  });

  assert.equal(inserted.matrizId, 1);
  assert.equal(inserted.activa, false);
  assert.equal(result.version_id, 5);
  assert.equal(result.resumen.reglas, 1);
});

test('VERLIFE-002 snapshot rechaza nombre duplicado', async () => {
  const service = new MatrixService(repo({
    findVersionByName: async () => ({ id: 9 })
  }));

  await assert.rejects(
    service.freezeVersion({
      matriz_id: 1,
      version: 'v2.0.0',
      fecha_vigencia: '2026-09-01'
    }),
    { status: 409, message: 'La versión "v2.0.0" ya existe en esta matriz' }
  );
});

test('VERLIFE-003 activación exige integridad', async () => {
  let activated = false;
  const service = new MatrixService(repo({
    getVersionIntegrity: async () => ({
      ok: false,
      version_id: 5,
      violations: [{ nivel: 'frentes' }]
    }),
    activateVersion: async () => {
      activated = true;
      return {};
    }
  }));

  await assert.rejects(
    service.activateVersion(5),
    e => {
      assert.equal(e.status, 400);
      assert.equal(e.payload.integrity.ok, false);
      return true;
    }
  );
  assert.equal(activated, false);
});

test('VERLIFE-004 activación válida delega en repository', async () => {
  const service = new MatrixService(repo());
  const result = await service.activateVersion(5);
  assert.equal(result.success, true);
  assert.equal(result.version.id, 5);
});

test('VERLIFE-005 validadores respetan máximos', async () => {
  const service = new MatrixService(repo());

  assert.deepEqual(
    await service.validateFrontWeight({ nuevo_peso: 0 }),
    { valid: true, total: 100, peso_maximo: 100 }
  );

  await assert.rejects(
    new MatrixService(repo({
      validateAttributeWeight: async () => ({ total: 16, max: 15 })
    })).validateAttributeWeight({
      frente_id: 10,
      nuevo_peso: 2
    }),
    e => e.status === 400 && e.payload.total_actual === 16
  );
});
