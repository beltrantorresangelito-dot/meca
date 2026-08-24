const test = require('node:test');
const assert = require('node:assert/strict');
const SessionsService =
  require('../src/modules/sessions/sessions.service');

function makeRepo(overrides = {}) {
  return {
    upsertSession: async data => ({ success: true, data }),
    listUserSessions: async (id, options) => [{ id, options }],
    closeSession: async token => token === 'x' ? 1 : 0,
    closeAllForUser: async id => id ? 2 : 0,
    insertLoginHistory: async data => ({ success: true, data }),
    ...overrides
  };
}

test('SESSSVC-001 createSession valida objeto', async () => {
  const service = new SessionsService(makeRepo());

  await assert.rejects(
    service.createSession(null),
    {
      status: 400,
      message: 'Datos de sesión inválidos'
    }
  );
});

test('SESSSVC-002 createSession exige usuarioId y tokenSesion', async () => {
  const service = new SessionsService(makeRepo());

  await assert.rejects(
    service.createSession({ usuarioId: 1 }),
    {
      status: 400,
      message: 'usuarioId y tokenSesion son requeridos'
    }
  );
});

test('SESSSVC-003 createSession delega al repository', async () => {
  let received;

  const service = new SessionsService(makeRepo({
    upsertSession: async data => {
      received = data;
      return { success: true };
    }
  }));

  const input = {
    usuarioId: 1,
    tokenSesion: 'tok',
    ip: '127.0.0.1',
    dispositivo: 'Chrome'
  };

  assert.deepEqual(
    await service.createSession(input),
    { success: true }
  );

  assert.deepEqual(received, input);
});

test('SESSSVC-004 listUserSessions valida id', async () => {
  const service = new SessionsService(makeRepo());

  await assert.rejects(
    service.listUserSessions(null),
    {
      status: 400,
      message: 'ID de usuario requerido'
    }
  );
});

test('SESSSVC-005 listUserSessions delega opciones', async () => {
  let received;

  const service = new SessionsService(makeRepo({
    listUserSessions: async (id, options) => {
      received = { id, options };
      return [];
    }
  }));

  await service.listUserSessions(7, { activas: 'true' });

  assert.deepEqual(received, {
    id: 7,
    options: { activas: 'true' }
  });
});

test('SESSSVC-006 closeSession valida token', async () => {
  const service = new SessionsService(makeRepo());

  await assert.rejects(
    service.closeSession(''),
    {
      status: 400,
      message: 'Token de sesión requerido'
    }
  );
});

test('SESSSVC-007 closeSession delega repository', async () => {
  const service = new SessionsService(makeRepo());
  assert.equal(await service.closeSession('x'), 1);
});

test('SESSSVC-008 closeAllForUser valida id', async () => {
  const service = new SessionsService(makeRepo());

  await assert.rejects(
    service.closeAllForUser(null),
    {
      status: 400,
      message: 'ID de usuario requerido'
    }
  );
});

test('SESSSVC-009 registerLoginHistory delega repository', async () => {
  let received;
  const service = new SessionsService(makeRepo({
    insertLoginHistory: async data => {
      received = data;
      return { success: true };
    }
  }));

  const data = {
    usuarioId: 1,
    usuario: 'user',
    tipo: 'login',
    ip: 'x',
    dispositivo: 'Chrome'
  };

  assert.deepEqual(
    await service.registerLoginHistory(data),
    { success: true }
  );

  assert.deepEqual(received, data);
});
