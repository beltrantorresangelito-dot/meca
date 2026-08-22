const test = require('node:test');
const assert = require('node:assert/strict');
const Repository = require('../src/modules/domain/legacy-matrix.repository');
const Service = require('../src/modules/domain/legacy-matrix.service');

test('LEGACYDATE-001 repository conserva SQL histórico por fecha', async () => {
  let sql = '';
  let params = null;
  const repository = new Repository({
    async query(q, p) {
      sql = q;
      params = p;
      return { rows: [{ id: 8, version: 'v8' }] };
    }
  });

  const row = await repository.getLegacyMatrixVersionByDate('2026-08-22');

  assert.equal(row.id, 8);
  assert.deepEqual(params, ['2026-08-22']);
  assert.match(sql, /SELECT\s+\*/i);
  assert.match(sql, /fecha_vigencia\s*<=\s*\$1/i);
  assert.match(sql, /ORDER\s+BY\s+fecha_vigencia\s+DESC/i);
  assert.match(sql, /LIMIT\s+1/i);
});

test('LEGACYDATE-002 devuelve null cuando no hay versión aplicable', async () => {
  const repository = new Repository({
    async query() { return { rows: [] }; }
  });
  assert.equal(await repository.getLegacyMatrixVersionByDate('1900-01-01'), null);
});

test('LEGACYDATE-003 service exige fecha', async () => {
  const service = new Service({
    getLegacyMatrixVersionByDate: async () => null
  });

  await assert.rejects(
    () => service.getVersionByDate(''),
    error => error.code === 'VALIDATION_ERROR' && /Fecha requerida/.test(error.message)
  );
});

test('LEGACYDATE-004 service delega fecha sin transformar resultado', async () => {
  const expected = { id: 3, version: 'v3' };
  let received = null;
  const service = new Service({
    getLegacyMatrixVersionByDate: async date => {
      received = date;
      return expected;
    }
  });

  assert.strictEqual(await service.getVersionByDate('2026-08-22'), expected);
  assert.equal(received, '2026-08-22');
});
