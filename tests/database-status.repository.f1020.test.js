const test = require('node:test');
const assert = require('node:assert/strict');
const Repository = require('../src/modules/database-status/database-status.repository');

test('DBSTATREPO-001 getDatabaseSizeBytes conserva pg_database_size', async () => {
  let sql;
  const repo = new Repository({
    async query(q) {
      sql = String(q);
      return { rows: [{ size_bytes: '1048576' }] };
    }
  });

  assert.equal(await repo.getDatabaseSizeBytes(), 1048576);
  assert.match(sql, /pg_database_size\(current_database\(\)\)/);
});

test('DBSTATREPO-002 listPublicTablesWithSizes conserva tamaños', async () => {
  let sql;
  const repo = new Repository({
    async query(q) {
      sql = String(q);
      return { rows: [] };
    }
  });

  assert.deepEqual(await repo.listPublicTablesWithSizes(), []);
  assert.match(sql, /pg_total_relation_size/);
  assert.match(sql, /pg_table_size/);
  assert.match(sql, /pg_indexes_size/);
  assert.match(sql, /WHERE schemaname = 'public'/);
  assert.match(sql, /ORDER BY total_bytes DESC/);
});

test('DBSTATREPO-003 countRows conserva COUNT exacto', async () => {
  let sql;
  const repo = new Repository({
    async query(q) {
      sql = String(q);
      return { rows: [{ count: '25' }] };
    }
  });

  assert.equal(await repo.countRows('usuarios'), 25);
  assert.match(sql, /SELECT COUNT\(\*\) as count FROM "usuarios"/);
});

test('DBSTATREPO-004 countRows escapa comillas', async () => {
  let sql;
  const repo = new Repository({
    async query(q) {
      sql = String(q);
      return { rows: [{ count: '0' }] };
    }
  });

  await repo.countRows('a"b');
  assert.match(sql, /FROM "a""b"/);
});

test('DBSTATREPO-005 listPublicTableTotalSizes conserva endpoint simple', async () => {
  let sql;
  const repo = new Repository({
    async query(q) {
      sql = String(q);
      return { rows: [] };
    }
  });

  assert.deepEqual(await repo.listPublicTableTotalSizes(), []);
  assert.match(sql, /pg_total_relation_size/);
  assert.doesNotMatch(sql, /pg_table_size/);
  assert.doesNotMatch(sql, /pg_indexes_size/);
});
