const test = require('node:test');
const assert = require('node:assert/strict');
const Service =
  require('../src/modules/generic-query/generic-query.service');

function repo(overrides = {}) {
  return {
    select: async args => ({ op: 'select', args }),
    insert: async args => ({ op: 'insert', args }),
    update: async args => ({ op: 'update', args }),
    delete: async args => ({ op: 'delete', args }),
    upsert: async args => ({ op: 'upsert', args }),
    ...overrides
  };
}

test('GENQSVC-001 payload inválido devuelve 400', async () => {
  const service = new Service(repo());

  await assert.rejects(
    () => service.execute(null),
    error => (
      error.status === 400 &&
      error.message === 'Payload inválido'
    )
  );
});

test('GENQSVC-002 exige table', async () => {
  const service = new Service(repo());

  await assert.rejects(
    () => service.execute({
      operation: 'select'
    }),
    error => (
      error.status === 400 &&
      error.message === 'Tabla no especificada'
    )
  );
});

test('GENQSVC-003 select delega opciones completas', async () => {
  const service = new Service(repo());

  const result = await service.execute({
    table: 'usuarios',
    operation: 'select',
    selectFields: 'id',
    filters: [{ type: 'eq', column: 'id', value: 1 }],
    orderBy: 'id',
    orderAscending: false,
    limit: 10,
    isSingle: true,
    isMaybeSingle: false,
    isHead: false,
    countOption: 'exact'
  });

  assert.equal(result.op, 'select');
  assert.equal(result.args.table, 'usuarios');
  assert.equal(result.args.limit, 10);
  assert.equal(result.args.isSingle, true);
});

test('GENQSVC-004 insert exige data', async () => {
  const service = new Service(repo());

  await assert.rejects(
    () => service.execute({
      table: 't',
      operation: 'insert'
    }),
    /No hay datos para insertar/
  );
});

test('GENQSVC-005 update exige data', async () => {
  const service = new Service(repo());

  await assert.rejects(
    () => service.execute({
      table: 't',
      operation: 'update'
    }),
    /No hay datos para actualizar/
  );
});

test('GENQSVC-006 upsert exige data', async () => {
  const service = new Service(repo());

  await assert.rejects(
    () => service.execute({
      table: 't',
      operation: 'upsert'
    }),
    /No hay datos para upsert/
  );
});

test('GENQSVC-007 delete delega filters al Repository', async () => {
  const service = new Service(repo());

  const result = await service.execute({
    table: 't',
    operation: 'delete',
    filters: [{
      type: 'eq',
      column: 'id',
      value: 1
    }]
  });

  assert.equal(result.op, 'delete');
  assert.equal(result.args.filters.length, 1);
});

test('GENQSVC-008 operación desconocida devuelve 400', async () => {
  const service = new Service(repo());

  await assert.rejects(
    () => service.execute({
      table: 't',
      operation: 'truncate'
    }),
    error => (
      error.status === 400 &&
      error.message === 'Operacion no soportada: truncate'
    )
  );
});

test('GENQSVC-009 status 400 del Repository se preserva', async () => {
  const service = new Service(repo({
    update: async () => {
      const error = new Error(
        'UPDATE requiere al menos un filtro'
      );
      error.status = 400;
      throw error;
    }
  }));

  await assert.rejects(
    () => service.execute({
      table: 't',
      operation: 'update',
      data: { activo: false },
      filters: []
    }),
    error => (
      error.status === 400 &&
      error.message === 'UPDATE requiere al menos un filtro'
    )
  );
});
