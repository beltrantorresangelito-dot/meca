const test = require('node:test');
const assert = require('node:assert/strict');
const MatrixService = require('../src/modules/matrix/matrix.service');

function repo(overrides = {}) {
  return {
    withTransaction: async work => work({}),
    getActiveVersionId: async () => 4,
    findFrontByCode: async () => null,
    sumActiveFrontWeights: async () => 70,
    insertFront: async (_client, data) => ({
      id: 99,
      codigo: data.codigo,
      nombre: data.nombre,
      peso_maximo: data.pesoMaximo,
      orden: data.orden,
      activo: data.activo
    }),
    getFrontByIdAndVersion: async () => ({
      id: 10,
      codigo: 'ENC',
      nombre: 'Errores No Críticos',
      peso_maximo: '15.00',
      orden: 1,
      activo: true
    }),
    updateFront: async (_client, id, data) => ({
      id,
      codigo: data.codigo,
      nombre: data.nombre,
      peso_maximo: data.pesoMaximo,
      orden: data.orden,
      activo: data.activo
    }),
    deleteFrontTree: async () => ({
      id: 10,
      nombre: 'Errores No Críticos'
    }),
    ...overrides
  };
}

test('FRWRITE-001 create valida obligatorios y peso', async () => {
  const service = new MatrixService(repo());

  await assert.rejects(
    () => service.createFront({ codigo: 'X' }),
    e => e.status === 400 && /Faltan campos/.test(e.message)
  );

  await assert.rejects(
    () => service.createFront({
      codigo: 'X', nombre: 'X', peso_maximo: 101
    }),
    e => e.status === 400 && /peso debe/.test(e.message)
  );
});

test('FRWRITE-002 create conserva validación suma <= 100', async () => {
  const service = new MatrixService(repo({
    sumActiveFrontWeights: async () => 95
  }));

  await assert.rejects(
    () => service.createFront({
      codigo: 'X', nombre: 'X', peso_maximo: 10
    }),
    e => e.status === 400 &&
         e.payload.suma_actual === 95 &&
         e.payload.suma_total === 105
  );
});

test('FRWRITE-003 create inserta en versión activa', async () => {
  let inserted = null;
  const service = new MatrixService(repo({
    sumActiveFrontWeights: async () => 80,
    insertFront: async (_c, data) => {
      inserted = data;
      return { id: 20, codigo: data.codigo };
    }
  }));

  const result = await service.createFront({
    codigo: 'NVO',
    nombre: 'Nuevo',
    peso_maximo: 5,
    orden: 4
  });

  assert.equal(result.id, 20);
  assert.equal(inserted.versionId, 4);
  assert.equal(inserted.pesoMaximo, 5);
});

test('FRWRITE-004 update exige frente en versión activa', async () => {
  const service = new MatrixService(repo({
    getFrontByIdAndVersion: async () => null
  }));

  await assert.rejects(
    () => service.updateFront(999, {}),
    e => e.status === 404 &&
         /Frente no encontrado en la versión activa/.test(e.message)
  );
});

test('FRWRITE-005 delete devuelve mismo mensaje funcional', async () => {
  const service = new MatrixService(repo());
  const result = await service.deleteFront(10);

  assert.equal(result.success, true);
  assert.match(result.message, /Errores No Críticos/);
});
