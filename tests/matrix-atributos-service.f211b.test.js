const test = require('node:test');
const assert = require('node:assert/strict');
const MatrixService = require('../src/modules/matrix/matrix.service');

function repo(overrides = {}) {
  return {
    withTransaction: async work => work({}),
    getActiveVersionId: async () => 4,

    getActiveFront: async () => ({
      id: 10,
      codigo: 'ENC',
      nombre: 'Errores No Críticos',
      peso_maximo: '15.00',
      orden: 1,
      activo: true
    }),

    getAttributeInActiveVersion: async () => ({
      id: 43,
      frente_id: 10,
      nombre: 'PROTOCOLOS DE ATENCION',
      peso_maximo: '8.00',
      orden: 1,
      activo: true
    }),

    findAttributeByName: async () => null,

    sumActiveAttributeWeights: async () => 5,

    insertAttribute: async (_client, data) => ({
      id: 99,
      frente_id: data.frontId,
      nombre: data.nombre,
      peso_maximo: data.pesoMaximo,
      orden: data.orden,
      activo: data.activo
    }),

    updateAttribute: async (_client, id, data) => ({
      id,
      frente_id: data.frontId,
      nombre: data.nombre,
      peso_maximo: data.pesoMaximo,
      orden: data.orden,
      activo: data.activo
    }),

    deleteAttributeTree: async () => ({
      attribute: {
        id: 43,
        frente_id: 10,
        nombre: 'PROTOCOLOS DE ATENCION'
      },
      totalSubReasons: 3
    }),

    ...overrides
  };
}

test('ATTRWRITE-001 create valida obligatorios y peso', async () => {
  const service = new MatrixService(repo());

  await assert.rejects(
    service.createAttribute({
      nombre: 'X'
    }),
    {
      message: 'Faltan campos obligatorios',
      status: 400
    }
  );

  await assert.rejects(
    service.createAttribute({
      frente_id: 10,
      nombre: 'X',
      peso_maximo: 0
    }),
    {
      message: 'El peso debe ser mayor a 0',
      status: 400
    }
  );
});

test('ATTRWRITE-002 create rechaza si supera peso del frente', async () => {
  const service = new MatrixService(repo({
    sumActiveAttributeWeights: async () => 14
  }));

  await assert.rejects(
    service.createAttribute({
      frente_id: 10,
      nombre: 'Nuevo',
      peso_maximo: 2
    }),
    error => {
      assert.equal(error.status, 400);
      assert.equal(error.payload.suma_actual, 14);
      assert.equal(error.payload.nuevo_peso, 2);
      assert.equal(error.payload.peso_maximo_frente, 15);
      assert.equal(error.payload.suma_total, 16);
      return true;
    }
  );
});

test('ATTRWRITE-003 create inserta atributo en frente de versión activa', async () => {
  let inserted = null;

  const service = new MatrixService(repo({
    insertAttribute: async (_client, data) => {
      inserted = data;
      return {
        id: 50,
        frente_id: data.frontId,
        nombre: data.nombre
      };
    }
  }));

  const result = await service.createAttribute({
    frente_id: 10,
    nombre: 'NUEVO ATRIBUTO',
    peso_maximo: 2,
    orden: 6
  });

  assert.equal(result.id, 50);
  assert.equal(inserted.frontId, 10);
  assert.equal(inserted.pesoMaximo, 2);
  assert.equal(inserted.nombre, 'NUEVO ATRIBUTO');
});

test('ATTRWRITE-004 update exige atributo válido', async () => {
  const service = new MatrixService(repo({
    getAttributeInActiveVersion: async () => null
  }));

  await assert.rejects(
    service.updateAttribute(999, {}),
    {
      message: 'Atributo no encontrado en la versión activa',
      status: 404
    }
  );
});

test('ATTRWRITE-005 delete devuelve resultado funcional', async () => {
  const service = new MatrixService(repo());

  const result = await service.deleteAttribute(43);

  assert.equal(result.success, true);
  assert.match(result.message, /PROTOCOLOS DE ATENCION/);
  assert.match(result.message, /3 sub-motivos/);
});
