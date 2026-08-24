const test = require('node:test');
const assert = require('node:assert/strict');
const SessionsRepository = require('../src/modules/sessions/sessions.repository');

test('SESSREPO-001 upsert conserva ON CONFLICT', async () => {
  let call;
  const repo = new SessionsRepository({ async query(sql, params) {
    call = { sql: String(sql), params }; return { rowCount: 1 };
  }});
  assert.deepEqual(await repo.upsertSession({
    usuarioId: 1, tokenSesion: 'tok', ip: '127.0.0.1', dispositivo: 'Chrome'
  }), { success: true });
  assert.match(call.sql, /ON CONFLICT \(usuario_id\) DO UPDATE/);
  assert.deepEqual(call.params, [1, 'tok', '127.0.0.1', 'Chrome']);
});

test('SESSREPO-002 listado conserva columnas y filtro', async () => {
  let call;
  const repo = new SessionsRepository({ async query(sql, params) {
    call = { sql: String(sql), params }; return { rows: [] };
  }});
  await repo.listUserSessions(7, { activas: 'true' });
  assert.match(call.sql, /session_token/);
  assert.match(call.sql, /ip_address/);
  assert.match(call.sql, /user_agent/);
  assert.match(call.sql, /AND estado = 'activa'/);
  assert.match(call.sql, /ORDER BY fecha_inicio DESC/);
  assert.deepEqual(call.params, [7]);
});

test('SESSREPO-003 closeSession devuelve rowCount', async () => {
  const repo = new SessionsRepository({ async query() { return { rowCount: 2 }; }});
  assert.equal(await repo.closeSession('abc'), 2);
});

test('SESSREPO-004 closeAllForUser devuelve rowCount', async () => {
  const repo = new SessionsRepository({ async query() { return { rowCount: 3 }; }});
  assert.equal(await repo.closeAllForUser(9), 3);
});

test('SESSREPO-005 historial conserva NOW', async () => {
  let call;
  const repo = new SessionsRepository({ async query(sql, params) {
    call = { sql: String(sql), params }; return { rowCount: 1 };
  }});
  assert.deepEqual(await repo.insertLoginHistory({
    usuarioId: 1, usuario: 'u', tipo: 'login', ip: 'x', dispositivo: 'Chrome'
  }), { success: true });
  assert.match(call.sql, /INSERT INTO historial_login/);
  assert.match(call.sql, /NOW\(\)/);
});
