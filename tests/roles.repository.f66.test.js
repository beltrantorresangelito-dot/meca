const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const RolesRepository = require('../src/modules/roles/roles.repository');

test('ROLEREPO-001 redirect activo conserva SQL', async () => {
  let call;
  const repo = new RolesRepository({
    async query(sql, params) {
      call = { sql: String(sql), params };
      return { rows: [{ nombre: 'Auditor' }] };
    }
  });
  await repo.findActiveRoleByCode('AUDITOR');
  assert.match(call.sql, /redirect_url/);
  assert.match(call.sql, /activo = true/);
  assert.deepEqual(call.params, ['AUDITOR']);
});

test('ROLEREPO-002 permisos se insertan parametrizados', async () => {
  let call;
  const repo = new RolesRepository({
    async query(sql, params) {
      call = { sql: String(sql), params };
      return { rowCount: 2 };
    }
  });
  assert.equal(await repo.insertRolePermissions(7, ['A', 'B']), 2);
  assert.match(call.sql, /\(\$1, \$2\), \(\$3, \$4\)/);
  assert.deepEqual(call.params, [7, 'A', 7, 'B']);
});

test('ROLEREPO-003 permisos POST conserva ON CONFLICT', async () => {
  let sql;
  const repo = new RolesRepository({
    async query(q) {
      sql = String(q);
      return { rowCount: 1 };
    }
  });
  await repo.insertRolePermissions(1, ['A'], { ignoreConflicts: true });
  assert.match(sql, /ON CONFLICT DO NOTHING/);
});

test('ROLEREPO-004 conteo usuarios por rol', async () => {
  const repo = new RolesRepository({
    async query() { return { rows: [{ total: '3' }] }; }
  });
  assert.equal(await repo.countUsersByRole(1), 3);
});

test('ROLEREPO-005 repository queda encapsulado por RolesModule en F6.8', () => {
  const indexSource = fs.readFileSync(
    path.resolve(__dirname, '../src/modules/roles/index.js'),
    'utf8'
  );
  const serverSource = fs.readFileSync(
    path.resolve(__dirname, '../server.js'),
    'utf8'
  );

  assert.match(indexSource, /RolesRepository/);
  assert.match(indexSource, /createRolesHandler/);
  assert.match(serverSource, /createRolesHandler/);
  assert.doesNotMatch(serverSource, /new RolesRepository/);
});
