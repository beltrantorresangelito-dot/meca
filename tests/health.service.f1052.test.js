const test = require('node:test');
const assert = require('node:assert/strict');

const Service =
  require('../src/modules/health/health.service');

test('HEALTHSVC-001 conectado conserva texto legacy', async () => {
  const date = new Date('2026-08-24T17:54:25.327Z');

  const service = new Service({
    async now() {
      return date;
    }
  });

  const result = await service.getStatus();

  assert.equal(result.status, 'ok');
  assert.equal(
    result.message,
    'Servidor MECA funcionando (PostgreSQL local)'
  );
  assert.equal(result.version, '2.0.0');
  assert.equal(
    result.database,
    'conectado (2026-08-24T17:54:25.327Z)'
  );
  assert.ok(result.timestamp);
});

test('HEALTHSVC-002 error DB conserva HTTP-semántica legacy ok', async () => {
  const service = new Service({
    async now() {
      throw new Error('db down');
    }
  });

  const result = await service.getStatus();

  assert.equal(result.status, 'ok');
  assert.equal(
    result.database,
    'error: db down'
  );
});
