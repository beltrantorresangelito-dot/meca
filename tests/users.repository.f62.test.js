const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const UsersRepository =
  require('../src/modules/users/users.repository');

test('USRREPO-001 login conserva JOIN de roles', async () => {
  let call;
  const repo = new UsersRepository({
    async query(sql, params) {
      call = { sql: String(sql), params };
      return { rows: [{ id: 1, usuario: 'admin' }] };
    }
  });

  const user = await repo.findLoginUserByUsername('admin');

  assert.equal(user.id, 1);
  assert.match(call.sql, /LEFT JOIN roles r ON u\.rol_id = r\.id/);
  assert.match(call.sql, /WHERE u\.usuario = \$1/);
  assert.deepEqual(call.params, ['admin']);
});

test('USRREPO-002 password hash puede limpiar primer_login', async () => {
  let sql;
  const repo = new UsersRepository({
    async query(q) {
      sql = String(q);
      return { rowCount: 1 };
    }
  });

  assert.equal(
    await repo.updatePasswordHash(7, 'HASH', { clearFirstLogin: true }),
    1
  );

  assert.match(sql, /primer_login = false/);
  assert.match(sql, /updated_at = NOW\(\)/);
});

test('USRREPO-003 auditores activos usa rol AUDITOR', async () => {
  let sql;
  const repo = new UsersRepository({
    async query(q) {
      sql = String(q);
      return { rows: [] };
    }
  });

  await repo.listActiveAuditors();

  assert.match(sql, /INNER JOIN roles r ON u\.rol_id = r\.id/);
  assert.match(sql, /r\.codigo = 'AUDITOR'/);
  assert.match(sql, /u\.activo = true/);
});

test('USRREPO-004 alta conserva siguiente ID y rol_id', async () => {
  const calls = [];
  const repo = new UsersRepository({
    async query(sql, params) {
      calls.push({ sql: String(sql), params });
      if (String(sql).includes('MAX(id)')) {
        return { rows: [{ next_id: 9 }] };
      }
      return { rows: [{ id: 9 }] };
    }
  });

  assert.equal(await repo.nextUserId(), 9);

  await repo.insertUser({
    id: 9,
    usuario: 'u',
    nombreCompleto: 'Usuario',
    passwordHash: 'HASH',
    rolId: 2,
    activo: true
  });

  assert.match(calls[1].sql, /INSERT INTO usuarios/);
  assert.match(calls[1].sql, /rol_id/);
  assert.deepEqual(calls[1].params, [9, 'u', 'Usuario', 'HASH', 2, true]);
});

test('USRREPO-005 export conserva fechas legacy', async () => {
  let sql;
  const repo = new UsersRepository({
    async query(q) {
      sql = String(q);
      return { rows: [] };
    }
  });

  await repo.listUsersForExport();

  assert.match(sql, /TO_CHAR\(u\.created_at, 'DD\/MM\/YYYY'\)/);
  assert.match(sql, /TO_CHAR\(u\.ultimo_login, 'DD\/MM\/YYYY HH24:MI'\)/);
});

test('USRREPO-006 getById devuelve null si no existe', async () => {
  const repo = new UsersRepository({
    async query() { return { rows: [] }; }
  });

  assert.equal(await repo.getUserById(999), null);
});

test('USRREPO-007 updateUser genera SQL parametrizado', async () => {
  let call;
  const repo = new UsersRepository({
    async query(sql, params) {
      call = { sql: String(sql), params };
      return { rowCount: 1 };
    }
  });

  const count = await repo.updateUser(4, {
    usuario: 'nuevo',
    rol_id: 3,
    passwordHash: 'HASH'
  });

  assert.equal(count, 1);
  assert.match(call.sql, /usuario = \$1/);
  assert.match(call.sql, /rol_id = \$2/);
  assert.match(call.sql, /contrasena = \$3/);
  assert.match(call.sql, /updated_at = NOW\(\)/);
  assert.match(call.sql, /WHERE id = \$4/);
  assert.deepEqual(call.params, ['nuevo', 3, 'HASH', 4]);
});

test('USRREPO-008 repository queda encapsulado por UsersModule en F6.4', () => {
  const indexSource = fs.readFileSync(
    path.resolve(__dirname, '../src/modules/users/index.js'),
    'utf8'
  );

  const serverSource = fs.readFileSync(
    path.resolve(__dirname, '../server.js'),
    'utf8'
  );

  assert.match(indexSource, /UsersRepository/);
  assert.match(indexSource, /createUsersHandler/);
  assert.match(serverSource, /createUsersHandler/);
  assert.doesNotMatch(serverSource, /new UsersRepository/);
});
