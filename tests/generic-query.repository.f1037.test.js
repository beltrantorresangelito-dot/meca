const test = require('node:test');
const assert = require('node:assert/strict');
const Repository =
  require('../src/modules/generic-query/generic-query.repository');

test('GENQREPO-001 sanitiza identificadores', () => {
  assert.equal(
    Repository.sanitizeIdentifier('users;DROP'),
    'usersDROP'
  );
});

test('GENQREPO-002 sanitiza selectFields conservando wildcard y relaciones', () => {
  assert.equal(
    Repository.sanitizeSelectFields('*'),
    '*'
  );

  assert.equal(
    Repository.sanitizeSelectFields('id, nombre, rel(*)'),
    'id, nombre, rel(*)'
  );
});

test('GENQREPO-003 select eq + order + limit', async () => {
  let sql;
  let params;

  const repo = new Repository({
    async query(q, p) {
      sql = String(q);
      params = p;
      return {
        rows: [{ id: 1 }],
        rowCount: 1
      };
    }
  });

  const result = await repo.select({
    table: 'usuarios',
    filters: [{
      type: 'eq',
      column: 'activo',
      value: true
    }],
    orderBy: 'id',
    orderAscending: false,
    limit: 5
  });

  assert.match(sql, /SELECT \* FROM usuarios WHERE 1=1/);
  assert.match(sql, /activo = \$1/);
  assert.match(sql, /ORDER BY id DESC/);
  assert.match(sql, /LIMIT \$2/);
  assert.deepEqual(params, [true, 5]);
  assert.equal(result.count, 1);
});

test('GENQREPO-004 select head count devuelve data vacía', async () => {
  const repo = new Repository({
    async query(q) {
      assert.match(
        String(q),
        /SELECT COUNT\(\*\) as count FROM/
      );

      return {
        rows: [{ count: '9' }]
      };
    }
  });

  assert.deepEqual(
    await repo.select({
      table: 'x',
      isHead: true,
      countOption: 'exact'
    }),
    {
      data: [],
      count: 9
    }
  );
});

test('GENQREPO-005 select soporta not in contains is null', async () => {
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

  await repo.select({
    table: 'x',
    filters: [
      {
        type: 'not',
        operator: 'in',
        column: 'id',
        values: [1,2]
      },
      {
        type: 'contains',
        column: 'payload',
        value: { a: 1 }
      },
      {
        type: 'is',
        column: 'deleted_at',
        value: null
      }
    ]
  });

  assert.match(sql, /id NOT IN \(\$1, \$2\)/);
  assert.match(sql, /payload @> \$3/);
  assert.match(sql, /deleted_at IS NULL/);
  assert.deepEqual(
    params,
    [1,2,JSON.stringify({ a: 1 })]
  );
});

test('GENQREPO-006 insert objeto devuelve rows', async () => {
  let sql;
  let params;

  const repo = new Repository({
    async query(q,p) {
      sql = String(q);
      params = p;
      return {
        rows: [{ id: 1 }]
      };
    }
  });

  const result = await repo.insert({
    table: 't',
    data: {
      nombre: 'A'
    }
  });

  assert.match(sql, /INSERT INTO t \(nombre\) VALUES \(\$1\) RETURNING \*/);
  assert.deepEqual(params, ['A']);
  assert.equal(result.count, 1);
});

test('GENQREPO-007 update conserva filtros y RETURNING', async () => {
  let sql;
  let params;

  const repo = new Repository({
    async query(q,p) {
      sql = String(q);
      params = p;
      return {
        rows: [{ id: 3 }],
        rowCount: 1
      };
    }
  });

  await repo.update({
    table: 't',
    data: { nombre: 'B' },
    filters: [{
      type: 'eq',
      column: 'id',
      value: 3
    }]
  });

  assert.match(sql, /UPDATE t SET nombre = \$1 WHERE 1=1 AND id = \$2 RETURNING \*/);
  assert.deepEqual(params, ['B',3]);
});

test('GENQREPO-008 delete conserva in + RETURNING', async () => {
  let sql;
  let params;

  const repo = new Repository({
    async query(q,p) {
      sql = String(q);
      params = p;
      return {
        rows: [],
        rowCount: 0
      };
    }
  });

  await repo.delete({
    table: 't',
    filters: [{
      type: 'in',
      column: 'id',
      values: [1,2]
    }]
  });

  assert.match(sql, /DELETE FROM t WHERE 1=1 AND id IN \(\$1, \$2\) RETURNING \*/);
  assert.deepEqual(params,[1,2]);
});

test('GENQREPO-009 upsert éxito insert no ejecuta update', async () => {
  const calls = [];

  const repo = new Repository({
    async query(q,p) {
      calls.push([String(q),p]);
      return { rows: [] };
    }
  });

  const result = await repo.upsert({
    table: 't',
    data: { id: 1, nombre: 'A' },
    filters: [{
      column: 'id',
      value: 1
    }]
  });

  assert.equal(calls.length, 1);
  assert.equal(result.count, 1);
});

test('GENQREPO-010 upsert 23505 ejecuta fallback update', async () => {
  const calls = [];

  const repo = new Repository({
    async query(q,p) {
      calls.push([String(q),p]);

      if (calls.length === 1) {
        const error = new Error('dup');
        error.code = '23505';
        throw error;
      }

      return { rows: [] };
    }
  });

  const result = await repo.upsert({
    table: 't',
    data: { id: 1, nombre: 'B' },
    filters: [{
      column: 'id',
      value: 1
    }]
  });

  assert.equal(calls.length, 2);
  assert.match(calls[1][0], /UPDATE t SET/);
  assert.equal(result.count, 1);
});

test('GENQREPO-011 upsert error distinto se propaga', async () => {
  const repo = new Repository({
    async query() {
      const error = new Error('db');
      error.code = '22000';
      throw error;
    }
  });

  await assert.rejects(
    () => repo.upsert({
      table: 't',
      data: { id: 1 },
      filters: [{ column: 'id', value: 1 }]
    }),
    /db/
  );
});


test('GENQREPO-012 update/delete exigen filtros', async () => {
  const repo = new Repository({
    async query() {
      throw new Error('no debe ejecutarse');
    }
  });

  await assert.rejects(
    () => repo.update({
      table: 't',
      data: { activo: false },
      filters: []
    }),
    error => (
      error.status === 400 &&
      error.message === 'UPDATE requiere al menos un filtro'
    )
  );

  await assert.rejects(
    () => repo.delete({
      table: 't',
      filters: []
    }),
    error => (
      error.status === 400 &&
      error.message === 'DELETE requiere al menos un filtro'
    )
  );
});
