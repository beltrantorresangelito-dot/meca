const test = require('node:test');
const assert = require('node:assert/strict');
const RequestsRepository =
  require('../src/modules/requests/requests.repository');

test('REQREPO-001 listByUser conserva filtro y orden', async () => {
  let call;
  const repo = new RequestsRepository({
    async query(sql, params) {
      call = { sql: String(sql), params };
      return { rows: [] };
    }
  });

  assert.deepEqual(await repo.listByUser(7), []);
  assert.match(call.sql, /WHERE solicitante_id = \$1/);
  assert.match(call.sql, /ORDER BY created_at DESC/);
  assert.deepEqual(call.params, [7]);
});

test('REQREPO-002 listAll conserva orden', async () => {
  let sql;
  const repo = new RequestsRepository({
    async query(q) {
      sql = String(q);
      return { rows: [] };
    }
  });

  await repo.listAll();
  assert.match(sql, /ORDER BY created_at DESC/);
});

test('REQREPO-003 createDynamic conserva contrato legacy', async () => {
  let call;
  const repo = new RequestsRepository({
    async query(sql, params) {
      call = { sql: String(sql), params };
      return { rows: [{ id: 1 }] };
    }
  });

  const created = await repo.createDynamic({
    solicitante_id: 9,
    asunto: 'Prueba'
  });

  assert.deepEqual(created, { id: 1 });
  assert.match(call.sql, /INSERT INTO solicitudes_requerimientos/);
  assert.match(call.sql, /solicitante_id, asunto/);
  assert.match(call.sql, /\$1, \$2/);
  assert.deepEqual(call.params, [9, 'Prueba']);
});

test('REQREPO-004 findById conserva null', async () => {
  const repo = new RequestsRepository({
    async query() {
      return { rows: [] };
    }
  });

  assert.equal(await repo.findById(99), null);
});

test('REQREPO-005 updateStatus conserva opcionales legacy', async () => {
  let call;
  const repo = new RequestsRepository({
    async query(sql, params) {
      call = { sql: String(sql), params };
      return { rowCount: 1 };
    }
  });

  const count = await repo.updateStatus(5, {
    estado: 'APROBADA',
    fecha_aprobacion: '2026-08-23',
    responsable_asignado: 'user',
    tiempo_estimado_horas: 4
  });

  assert.equal(count, 1);
  assert.match(call.sql, /estado = \$1/);
  assert.match(call.sql, /updated_at = NOW\(\)/);
  assert.match(call.sql, /fecha_aprobacion = \$2/);
  assert.match(call.sql, /responsable_asignado = \$3/);
  assert.match(call.sql, /tiempo_estimado_horas = \$4/);
  assert.match(call.sql, /WHERE id = \$5/);
  assert.deepEqual(
    call.params,
    ['APROBADA', '2026-08-23', 'user', 4, 5]
  );
});

test('REQREPO-006 updateStatus devuelve rowCount', async () => {
  const repo = new RequestsRepository({
    async query() {
      return { rowCount: 0 };
    }
  });

  assert.equal(
    await repo.updateStatus(1, { estado: 'X' }),
    0
  );
});
