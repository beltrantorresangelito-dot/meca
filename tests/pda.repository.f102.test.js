const test = require('node:test');
const assert = require('node:assert/strict');
const PdaRepository =
  require('../src/modules/pda/pda.repository');

test('PDAREPO-001 tableExists devuelve boolean', async () => {
  const repo = new PdaRepository({
    async query() {
      return { rows: [{ exists: true }] };
    }
  });

  assert.equal(await repo.tableExists(), true);
});

test('PDAREPO-002 listPending conserva estados', async () => {
  let sql;

  const repo = new PdaRepository({
    async query(query) {
      sql = String(query);
      return { rows: [] };
    }
  });

  assert.deepEqual(await repo.listPending(), []);
  assert.match(
    sql,
    /estado IN \('pendiente', 'notificado', 'en_gestion'\)/
  );
  assert.match(sql, /ORDER BY created_at DESC/);
});

test('PDAREPO-003 listTracking conserva estado', async () => {
  let sql;

  const repo = new PdaRepository({
    async query(query) {
      sql = String(query);
      return { rows: [] };
    }
  });

  await repo.listTracking();

  assert.match(sql, /estado = 'en_seguimiento'/);
});

test('PDAREPO-004 listHistory conserva estados y límite', async () => {
  let sql;

  const repo = new PdaRepository({
    async query(query) {
      sql = String(query);
      return { rows: [] };
    }
  });

  await repo.listHistory();

  assert.match(
    sql,
    /estado IN \('completado', 'escalado', 'corregido'\)/
  );
  assert.match(sql, /LIMIT 50/);
});

test('PDAREPO-005 findHeaderById conserva null', async () => {
  const repo = new PdaRepository({
    async query() {
      return { rows: [] };
    }
  });

  assert.equal(await repo.findHeaderById(99), null);
});

test('PDAREPO-006 listActions conserva orden', async () => {
  let call;

  const repo = new PdaRepository({
    async query(sql, params) {
      call = { sql: String(sql), params };
      return { rows: [] };
    }
  });

  await repo.listActions(5);

  assert.match(
    call.sql,
    /WHERE pda_id = \$1 ORDER BY id/
  );
  assert.deepEqual(call.params, [5]);
});

test('PDAREPO-007 exportRows conserva agregación', async () => {
  let sql;

  const repo = new PdaRepository({
    async query(query) {
      sql = String(query);
      return { rows: [] };
    }
  });

  await repo.exportRows();

  assert.match(sql, /LEFT JOIN pda_acciones/);
  assert.match(sql, /COUNT\(pa\.id\) as total_acciones/);
  assert.match(
    sql,
    /SUM\(CASE WHEN pa\.completado = true THEN 1 ELSE 0 END\)/
  );
});
