const test = require('node:test');
const assert = require('node:assert/strict');
const UsersService = require('../src/modules/users/users.service');

function repo(overrides = {}) {
  return {
    findLoginUserByUsername: async () => ({
      id: 1,
      usuario: 'admin',
      nombre_completo: 'Admin',
      contrasena: 'HASH',
      rol_id: 1,
      usuario_activo: true,
      rol_activo: true,
      rol_codigo: 'ADMIN',
      rol_nombre: 'Administrador',
      primer_login: false
    }),
    updatePasswordHash: async () => 1,
    touchLastLogin: async () => {},
    listLegacyAuditors: async () => [],
    listActiveAuditors: async () => [],
    listUsers: async () => [],
    userExistsByUsername: async () => false,
    roleExists: async () => true,
    nextUserId: async () => 9,
    insertUser: async data => ({ id: data.id, usuario: data.usuario }),
    userExistsById: async () => true,
    deleteUser: async () => 1,
    listUsersForExport: async () => [],
    getUserById: async id => ({ id }),
    updateUser: async () => 1,
    ...overrides
  };
}

function security(overrides = {}) {
  return {
    hashPassword: async value => `HASH:${value}`,
    verifyPassword: async () => ({
      valid: true,
      needsRehash: false
    }),
    signToken: (payload, options) =>
      JSON.stringify({ payload, options }),
    ...overrides
  };
}

test('USRSVC-001 login conserva errores legacy', async () => {
  const missing = new UsersService(
    repo({ findLoginUserByUsername: async () => null }),
    security()
  );

  assert.deepEqual(await missing.login('x', 'y'), {
    success: false,
    error: 'Usuario no encontrado'
  });

  const inactive = new UsersService(
    repo({
      findLoginUserByUsername: async () => ({
        usuario_activo: false
      })
    }),
    security()
  );

  assert.deepEqual(await inactive.login('x', 'y'), {
    success: false,
    error: 'Usuario desactivado'
  });
});

test('USRSVC-002 login hace rehash cuando corresponde', async () => {
  let saved;
  const service = new UsersService(
    repo({
      updatePasswordHash: async (id, hash) => {
        saved = { id, hash };
        return 1;
      }
    }),
    security({
      verifyPassword: async () => ({
        valid: true,
        needsRehash: true
      })
    })
  );

  const result = await service.login('admin', '123');

  assert.equal(result.success, true);
  assert.deepEqual(saved, {
    id: 1,
    hash: 'HASH:123'
  });
});

test('USRSVC-003 primer login emite token password_change', async () => {
  const service = new UsersService(
    repo({
      findLoginUserByUsername: async () => ({
        id: 1,
        usuario: 'admin',
        nombre_completo: 'Admin',
        contrasena: 'HASH',
        rol_id: 1,
        usuario_activo: true,
        rol_activo: true,
        rol_codigo: 'ADMIN',
        rol_nombre: 'Administrador',
        primer_login: true
      })
    }),
    security()
  );

  const result = await service.login('admin', '123');

  assert.equal(result.requiereCambioPassword, true);

  const token = JSON.parse(result.passwordChangeToken);
  assert.equal(token.options.purpose, 'password_change');
  assert.equal(token.options.expiresInSeconds, 600);
});

test('USRSVC-004 changePassword conserva 403', async () => {
  const service = new UsersService(repo(), security());

  await assert.rejects(
    service.changePassword({
      usuarioId: 2,
      nuevaPassword: 'x',
      auth: {
        id: 1,
        purpose: 'password_change'
      }
    }),
    {
      status: 403,
      message: 'Cambio de contraseña no autorizado'
    }
  );
});

test('USRSVC-005 createUser valida y crea', async () => {
  const service = new UsersService(repo(), security());

  await assert.rejects(
    service.createUser({}),
    {
      status: 400,
      message: 'Faltan campos requeridos'
    }
  );

  const result = await service.createUser({
    usuario: 'u1',
    nombre_completo: 'Usuario 1',
    contrasena: '123',
    rol_id: 2,
    activo: true
  });

  assert.equal(result.success, true);
  assert.equal(result.usuario.id, 9);
});

test('USRSVC-006 createUser conserva duplicado y rol inexistente', async () => {
  const duplicate = new UsersService(
    repo({
      userExistsByUsername: async () => true
    }),
    security()
  );

  await assert.rejects(
    duplicate.createUser({
      usuario: 'u',
      nombre_completo: 'U',
      contrasena: '1',
      rol_id: 1
    }),
    {
      status: 400,
      message: 'El usuario ya existe'
    }
  );

  const noRole = new UsersService(
    repo({
      roleExists: async () => false
    }),
    security()
  );

  await assert.rejects(
    noRole.createUser({
      usuario: 'u',
      nombre_completo: 'U',
      contrasena: '1',
      rol_id: 999
    }),
    {
      status: 400,
      message: 'El rol seleccionado no existe'
    }
  );
});

test('USRSVC-007 get/delete conservan 404', async () => {
  const service = new UsersService(
    repo({
      userExistsById: async () => false,
      getUserById: async () => null
    }),
    security()
  );

  await assert.rejects(
    service.deleteUser(5),
    {
      status: 404,
      message: 'Usuario no encontrado'
    }
  );

  await assert.rejects(
    service.getUserById(5),
    {
      status: 404,
      message: 'Usuario no encontrado'
    }
  );
});

test('USRSVC-008 updateUser valida rol y 404', async () => {
  const noRole = new UsersService(
    repo({ roleExists: async () => false }),
    security()
  );

  await assert.rejects(
    noRole.updateUser(1, { rol_id: 99 }),
    {
      status: 400,
      message: 'El rol seleccionado no existe'
    }
  );

  const missing = new UsersService(
    repo({ updateUser: async () => 0 }),
    security()
  );

  await assert.rejects(
    missing.updateUser(1, { usuario: 'x' }),
    {
      status: 404,
      message: 'Usuario no encontrado'
    }
  );
});

test('USRSVC-009 updateUserPassword valida password', async () => {
  const service = new UsersService(repo(), security());

  await assert.rejects(
    service.updateUserPassword(1, ''),
    {
      status: 400,
      message: 'La contraseña es requerida'
    }
  );

  assert.deepEqual(
    await service.updateUserPassword(1, 'abc'),
    {
      success: true,
      message: 'Contraseña actualizada correctamente'
    }
  );
});
