const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const Repository =
  require('../src/modules/generic-query/generic-query.repository');

test('GENQFIX-001 insert array usa placeholders locales por query', async () => {
  const calls = [];

  const repo = new Repository({
    async query(sql, params) {
      calls.push([String(sql), params]);
      return { rows: [{ ok: true }] };
    }
  });

  await repo.insert({
    table: 't',
    data: [
      { a: 1, b: 2 },
      { a: 3, b: 4 },
      { a: 5, b: 6 }
    ]
  });

  assert.equal(calls.length, 3);

  for (const [sql, params] of calls) {
    assert.match(sql, /VALUES \(\$1, \$2\)/);
    assert.equal(params.length, 2);
  }
});

test('GENQFIX-002 upsert array usa placeholders locales por query', async () => {
  const calls = [];

  const repo = new Repository({
    async query(sql, params) {
      calls.push([String(sql), params]);
      return { rows: [] };
    }
  });

  await repo.upsert({
    table: 't',
    data: [
      { a: 1, b: 2 },
      { a: 3, b: 4 }
    ],
    filters: [
      {
        column: 'a',
        value: 1
      }
    ]
  });

  assert.equal(calls.length, 2);

  for (const [sql, params] of calls) {
    assert.match(sql, /VALUES \(\$1, \$2\)/);
    assert.equal(params.length, 2);
  }
});

test('GENQFIX-003 update null filters también se bloquea', async () => {
  const repo = new Repository({
    async query() {
      throw new Error('no');
    }
  });

  await assert.rejects(
    () => repo.update({
      table: 't',
      data: { a: 1 },
      filters: null
    }),
    error => error.status === 400
  );
});

test('GENQFIX-004 delete undefined filters también se bloquea', async () => {
  const repo = new Repository({
    async query() {
      throw new Error('no');
    }
  });

  await assert.rejects(
    () => repo.delete({
      table: 't'
    }),
    error => error.status === 400
  );
});

test('GENQFIX-005 Controller respeta status 400 del Service/Repository', () => {
  const controller = fs.readFileSync(
    path.resolve(
      __dirname,
      '../src/modules/generic-query/generic-query.controller.js'
    ),
    'utf8'
  );

  assert.match(
    controller,
    /error\.status \|\| 500/
  );

  assert.match(
    controller,
    /code: error\.code \|\| 'ERROR'/
  );

  assert.doesNotMatch(
    fs.readFileSync(
      path.resolve(__dirname, '../server.js'),
      'utf8'
    ),
    /error\.status \|\| 500/
  );
});
