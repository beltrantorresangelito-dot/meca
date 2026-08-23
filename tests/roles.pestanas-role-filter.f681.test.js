const test = require('node:test');
const assert = require('node:assert/strict');

const RolesRepository =
  require('../src/modules/roles/roles.repository');
const RolesService =
  require('../src/modules/roles/roles.service');
const RolesController =
  require('../src/modules/roles/roles.controller');

test('ROLEFIX-681-001 repository obtiene rol solo de usuario activo', async () => {
  let call;
  const repo = new RolesRepository({
    async query(sql, params) {
      call = { sql: String(sql), params };
      return { rows: [{ rol_id: 1 }] };
    }
  });

  assert.equal(await repo.getActiveUserRole(9), 1);
  assert.match(call.sql, /FROM usuarios/);
  assert.match(call.sql, /activo = true/);
  assert.deepEqual(call.params, [9]);
});

test('ROLEFIX-681-002 pestañas visibles se filtran por rol_pestanas', async () => {
  let call;
  const repo = new RolesRepository({
    async query(sql, params) {
      call = { sql: String(sql), params };
      return { rows: [] };
    }
  });

  await repo.listVisibleTabs(1);

  assert.match(
    call.sql,
    /INNER JOIN rol_pestanas rp/
  );
  assert.match(
    call.sql,
    /p\.codigo = rp\.pestana_codigo/
  );
  assert.match(
    call.sql,
    /rp\.rol_id = \$1/
  );
  assert.match(
    call.sql,
    /p\.visible = true/
  );
  assert.deepEqual(call.params, [1]);
});

test('ROLEFIX-681-003 service devuelve 401 si usuario no está activo', async () => {
  const service = new RolesService({
    async getActiveUserRole() {
      return null;
    }
  });

  await assert.rejects(
    service.listVisibleTabs(99),
    {
      status: 401,
      message: 'Usuario no encontrado o inactivo'
    }
  );
});

test('ROLEFIX-681-004 service usa rol del usuario para listar pestañas', async () => {
  let receivedRole;
  const service = new RolesService({
    async getActiveUserRole(userId) {
      assert.equal(userId, 7);
      return 3;
    },
    async listVisibleTabs(roleId) {
      receivedRole = roleId;
      return [{ codigo: 'reportes' }];
    }
  });

  const rows = await service.listVisibleTabs(7);

  assert.equal(receivedRole, 3);
  assert.deepEqual(rows, [{ codigo: 'reportes' }]);
});

test('ROLEFIX-681-005 controller pasa req.auth.id al service', async () => {
  let receivedUserId;
  const controller = new RolesController({
    async listVisibleTabs(userId) {
      receivedUserId = userId;
      return [];
    }
  });

  let status;
  let payload;

  await controller.listVisibleTabs(
    {
      headers: { authorization: 'Bearer token' },
      auth: { id: 15, rol_codigo: 'AUDITOR' }
    },
    {
      writeHead(code) { status = code; },
      end(body) { payload = JSON.parse(body); }
    }
  );

  assert.equal(receivedUserId, 15);
  assert.equal(status, 200);
  assert.deepEqual(payload, []);
});
