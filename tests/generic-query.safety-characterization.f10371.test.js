const test = require('node:test');
const assert = require('node:assert/strict');

const Repository =
  require('../src/modules/generic-query/generic-query.repository');

test('GENQSAFE-001 insert array reinicia placeholders por fila', async () => {
  const calls = [];

  const repo = new Repository({
    async query(sql, params) {
      calls.push({
        sql: String(sql),
        params
      });

      return {
        rows: [{ ok: true }]
      };
    }
  });

  await repo.insert({
    table: 'demo',
    data: [
      { id: 1, nombre: 'A' },
      { id: 2, nombre: 'B' }
    ]
  });

  assert.equal(calls.length, 2);

  assert.match(
    calls[0].sql,
    /VALUES \(\$1, \$2\)/
  );

  assert.match(
    calls[1].sql,
    /VALUES \(\$1, \$2\)/
  );

  assert.deepEqual(
    calls[1].params,
    [2, 'B']
  );
});

test('GENQSAFE-002 upsert array reinicia placeholders por fila', async () => {
  const calls = [];

  const repo = new Repository({
    async query(sql, params) {
      calls.push({
        sql: String(sql),
        params
      });

      return { rows: [] };
    }
  });

  await repo.upsert({
    table: 'demo',
    data: [
      { id: 1, nombre: 'A' },
      { id: 2, nombre: 'B' }
    ],
    filters: [
      {
        column: 'id',
        value: 1
      }
    ]
  });

  assert.equal(calls.length, 2);

  assert.match(
    calls[0].sql,
    /VALUES \(\$1, \$2\)/
  );

  assert.match(
    calls[1].sql,
    /VALUES \(\$1, \$2\)/
  );

  assert.deepEqual(
    calls[1].params,
    [2, 'B']
  );
});

test('GENQSAFE-003 update sin filtros se bloquea con 400', async () => {
  const repo = new Repository({
    async query() {
      throw new Error('no debe ejecutarse');
    }
  });

  await assert.rejects(
    () => repo.update({
      table: 'usuarios',
      data: {
        activo: false
      },
      filters: []
    }),
    error => {
      assert.equal(error.status, 400);
      assert.equal(
        error.message,
        'UPDATE requiere al menos un filtro'
      );
      return true;
    }
  );
});

test('GENQSAFE-004 delete sin filtros se bloquea con 400', async () => {
  const repo = new Repository({
    async query() {
      throw new Error('no debe ejecutarse');
    }
  });

  await assert.rejects(
    () => repo.delete({
      table: 'usuarios',
      filters: []
    }),
    error => {
      assert.equal(error.status, 400);
      assert.equal(
        error.message,
        'DELETE requiere al menos un filtro'
      );
      return true;
    }
  );
});

test('GENQSAFE-005 isSingle no modifica respuesta actual', async () => {
  const repo = new Repository({
    async query() {
      return {
        rows: [
          { id: 1 },
          { id: 2 }
        ],
        rowCount: 2
      };
    }
  });

  const result = await repo.select({
    table: 'usuarios',
    isSingle: true
  });

  assert.deepEqual(
    result,
    {
      data: [
        { id: 1 },
        { id: 2 }
      ],
      count: 2
    }
  );
});

test('GENQSAFE-006 isMaybeSingle no modifica respuesta actual', async () => {
  const repo = new Repository({
    async query() {
      return {
        rows: [],
        rowCount: 0
      };
    }
  });

  const result = await repo.select({
    table: 'usuarios',
    isMaybeSingle: true
  });

  assert.deepEqual(
    result,
    {
      data: [],
      count: 0
    }
  );
});

test('GENQSAFE-007 tabla se sanitiza pero no se restringe por allowlist', async () => {
  let sql;

  const repo = new Repository({
    async query(q) {
      sql = String(q);

      return {
        rows: [],
        rowCount: 0
      };
    }
  });

  await repo.select({
    table: 'usuarios;DROP_TABLE',
  });

  assert.match(
    sql,
    /FROM usuariosDROP_TABLE/
  );
});

test('GENQSAFE-008 filtros mutation desconocidos caen a igualdad', async () => {
  let sql;
  let params;

  const repo = new Repository({
    async query(q, p) {
      sql = String(q);
      params = p;

      return {
        rows: [],
        rowCount: 0
      };
    }
  });

  await repo.update({
    table: 'usuarios',
    data: {
      activo: true
    },
    filters: [
      {
        type: 'gte',
        column: 'id',
        value: 10
      }
    ]
  });

  assert.match(
    sql,
    /AND id = \$2/
  );

  assert.deepEqual(
    params,
    [true, 10]
  );
});
