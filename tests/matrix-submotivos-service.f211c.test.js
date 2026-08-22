const test = require('node:test');
const assert = require('node:assert/strict');
const MatrixService = require('../src/modules/matrix/matrix.service');

function repo(overrides = {}) {
  return {
    withTransaction: async work => work({}),
    getActiveVersionId: async () => 4,
    getAttributeInActiveVersion: async () => ({
      id: 43,
      frente_id: 10,
      nombre: 'PROTOCOLOS DE ATENCION',
      peso_maximo: '8.00',
      orden: 1,
      activo: true
    }),
    getSubReasonInActiveVersion: async () => ({
      id: 30,
      atributo_id: 43,
      codigo: 'Cumple_Speech',
      descripcion: 'Cumple con speech',
      peso_individual: '3.00',
      orden: 1,
      activo: true
    }),
    findSubReasonByCode: async () => null,
    sumActiveSubReasonWeights: async () => 4,
    insertSubReason: async (_c, data) => ({
      id: 90,
      atributo_id: data.attributeId,
      codigo: data.codigo,
      descripcion: data.descripcion,
      peso_individual: data.peso,
      orden: data.orden,
      activo: data.activo
    }),
    updateSubReason: async (_c, id, data) => ({
      id,
      atributo_id: data.attributeId,
      codigo: data.codigo,
      descripcion: data.descripcion,
      peso_individual: data.peso,
      orden: data.orden,
      activo: data.activo
    }),
    deleteSubReason: async () => ({
      id: 30,
      codigo: 'Cumple_Speech',
      descripcion: 'Cumple con speech'
    }),
    ...overrides
  };
}

test('SUBWRITE-001 create distingue faltante de peso inválido', async () => {
  const service = new MatrixService(repo());

  await assert.rejects(
    service.createSubReason({
      atributo_id: 43,
      codigo: 'X',
      descripcion: 'X'
    }),
    { message: 'Faltan campos obligatorios', status: 400 }
  );

  await assert.rejects(
    service.createSubReason({
      atributo_id: 43,
      codigo: 'X',
      descripcion: 'X',
      peso_individual: 0
    }),
    { message: 'El peso debe ser mayor a 0', status: 400 }
  );
});

test('SUBWRITE-002 create rechaza si supera peso del atributo', async () => {
  const service = new MatrixService(repo({
    sumActiveSubReasonWeights: async () => 7
  }));

  await assert.rejects(
    service.createSubReason({
      atributo_id: 43,
      codigo: 'NVO',
      descripcion: 'Nuevo',
      peso_individual: 2
    }),
    error => {
      assert.equal(error.status, 400);
      assert.equal(error.payload.suma_actual, 7);
      assert.equal(error.payload.nuevo_peso, 2);
      assert.equal(error.payload.peso_maximo_atributo, 8);
      assert.equal(error.payload.suma_total, 9);
      return true;
    }
  );
});

test('SUBWRITE-003 update exige submotivo en versión activa', async () => {
  const service = new MatrixService(repo({
    getSubReasonInActiveVersion: async () => null
  }));

  await assert.rejects(
    service.updateSubReason(999, {}),
    {
      message: 'Sub-motivo no encontrado en la versión activa',
      status: 404
    }
  );
});

test('SUBWRITE-004 delete devuelve contrato funcional', async () => {
  const service = new MatrixService(repo());
  const result = await service.deleteSubReason(30);

  assert.equal(result.success, true);
  assert.match(result.message, /Cumple_Speech/);
});
