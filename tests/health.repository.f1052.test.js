const test = require('node:test');
const assert = require('node:assert/strict');

const Repository =
  require('../src/modules/health/health.repository');

test('HEALTHREPO-001 conserva SELECT NOW()', async () => {
  let sql;
  const date = new Date('2026-08-24T17:54:25.327Z');

  const repo = new Repository({
    async query(q) {
      sql = String(q);
      return {
        rows: [{ now: date }]
      };
    }
  });

  const result = await repo.now();

  assert.equal(sql, 'SELECT NOW()');
  assert.equal(result, date);
});
