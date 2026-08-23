const test = require('node:test');
const assert = require('node:assert/strict');
const RolesService = require('../src/modules/roles/roles.service');

function repo(overrides = {}) {
  return {
    findActiveRoleByCode: async () => ({
      nombre: 'Auditor',
      redirect_url: '/auditor'
    }),
    updateRedirect: async id => ({ id, nombre: 'X', redirect_url: '/x' }),
    listAllRoles: async () => [],
    roleExists: async () => true,
    findRoleById: async id => ({ id, nombre: 'Rol X', activo: false }),
    findRoleByCodeExcludingId: async () => null,
    updateRole: async id => ({ id, codigo: 'X', nombre: 'X', activo: true }),
    deleteRolePermissions: async () => 1,
    insertRolePermissions: async () => 1,
    createRole: async () => ({ id: 1, codigo: 'X', nombre: 'X', activo: true }),
    roleExistsByCode: async () => false,
    setRoleActive: async id => ({ id, activo: true }),
    reactivateRole: async id => ({ id, activo: true }),
    countUsersByRole: async () => 0,
    deleteRole: async () => 1,
    listAllTabs: async () => [],
    listRoleTabs: async () => [],
    listVisibleTabs: async () => [],
    ...overrides
  };
}

test('ROLESVC-001 redirect conserva fallback', async () => {
  const service = new RolesService(
    repo({
      findActiveRoleByCode: async () => null
    })
  );

  assert.deepEqual(
    await service.resolveRedirect('AUDITOR'),
    {
      redirectUrl: '/auditor',
      rol: 'AUDITOR',
      rolNombre: 'AUDITOR'
    }
  );
});

test('ROLESVC-002 updateRedirect valida formato y 404', async () => {
  const service = new RolesService(repo());

  await assert.rejects(
    service.updateRedirect(1, ''),
    { status: 400, message: 'redirect_url es requerido' }
  );

  await assert.rejects(
    service.updateRedirect(1, 'supervisor'),
    { status: 400, message: 'redirect_url debe comenzar con /' }
  );

  const missing = new RolesService(
    repo({ updateRedirect: async () => null })
  );

  await assert.rejects(
    missing.updateRedirect(1, '/x'),
    { status: 404, message: 'Rol no encontrado' }
  );
});

test('ROLESVC-003 createRole conserva duplicado', async () => {
  const service = new RolesService(
    repo({ roleExistsByCode: async () => true })
  );

  await assert.rejects(
    service.createRole({
      codigo: 'ADM',
      nombre: 'Admin'
    }),
    {
      status: 400,
      message: 'El código de rol ya existe'
    }
  );
});

test('ROLESVC-004 updateRole reemplaza permisos', async () => {
  const calls = [];
  const service = new RolesService(
    repo({
      deleteRolePermissions: async id => {
        calls.push(['delete', id]);
        return 1;
      },
      insertRolePermissions: async (id, tabs) => {
        calls.push(['insert', id, tabs]);
        return tabs.length;
      }
    })
  );

  const result = await service.updateRole(
    1,
    {
      codigo: 'adm',
      nombre: 'Administrador',
      activo: true,
      pestanas: ['A', 'B']
    }
  );

  assert.equal(result.success, true);
  assert.deepEqual(calls, [
    ['delete', 1],
    ['insert', 1, ['A', 'B']]
  ]);
});

test('ROLESVC-005 reactivate conserva ya activo', async () => {
  const service = new RolesService(
    repo({
      findRoleById: async () => ({
        id: 1,
        nombre: 'Admin',
        activo: true
      })
    })
  );

  await assert.rejects(
    service.reactivateRole(1),
    {
      status: 400,
      message: 'El rol "Admin" ya está activo'
    }
  );
});

test('ROLESVC-006 deleteRole bloquea usuarios asignados', async () => {
  const service = new RolesService(
    repo({
      countUsersByRole: async () => 2
    })
  );

  await assert.rejects(
    service.deleteRole(1),
    {
      status: 400,
      message:
        'No se puede eliminar el rol "Rol X" porque tiene 2 usuario(s) asignado(s)'
    }
  );
});

test('ROLESVC-007 replaceRoleTabs conserva respuesta', async () => {
  const service = new RolesService(repo());

  assert.deepEqual(
    await service.replaceRoleTabs(2, ['A', 'B']),
    {
      success: true,
      insertados: 2
    }
  );
});
