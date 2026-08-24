const test = require('node:test');
const assert = require('node:assert/strict');
const SessionsController =
  require('../src/modules/sessions/sessions.controller');

function makeResponse() {
  let status;
  let payload;

  return {
    res: {
      writeHead(code) {
        status = code;
      },
      end(body) {
        payload = JSON.parse(body);
      }
    },
    result() {
      return { status, payload };
    }
  };
}

function makeService(overrides = {}) {
  return {
    createSession: async () => ({ success: true }),
    listUserSessions: async () => [],
    closeSession: async () => 1,
    closeAllForUser: async () => 2,
    registerLoginHistory: async () => ({ success: true }),
    ...overrides
  };
}

test('SESSCTRL-001 createSession conserva 200 success true', async () => {
  const ctrl = new SessionsController(makeService());
  const out = makeResponse();

  await ctrl.createSession(out.res, {
    usuarioId: 1,
    tokenSesion: 't'
  });

  assert.deepEqual(out.result(), {
    status: 200,
    payload: { success: true }
  });
});

test('SESSCTRL-002 listUserSessions devuelve array', async () => {
  const ctrl = new SessionsController(makeService({
    listUserSessions: async () => [{ id: 1 }]
  }));

  const out = makeResponse();

  await ctrl.listUserSessions(
    out.res,
    1,
    { activas: 'true' }
  );

  assert.deepEqual(out.result(), {
    status: 200,
    payload: [{ id: 1 }]
  });
});

test('SESSCTRL-003 closeSession conserva afectadas', async () => {
  const ctrl = new SessionsController(makeService({
    closeSession: async () => 3
  }));

  const out = makeResponse();

  await ctrl.closeSession(out.res, 'tok');

  assert.deepEqual(out.result(), {
    status: 200,
    payload: {
      success: true,
      afectadas: 3
    }
  });
});

test('SESSCTRL-004 closeAll conserva cerradas', async () => {
  const ctrl = new SessionsController(makeService({
    closeAllForUser: async () => 4
  }));

  const out = makeResponse();

  await ctrl.closeAllForUser(out.res, 1);

  assert.deepEqual(out.result(), {
    status: 200,
    payload: {
      success: true,
      cerradas: 4
    }
  });
});

test('SESSCTRL-005 status de error del Service se respeta', async () => {
  const ctrl = new SessionsController(makeService({
    closeSession: async () => {
      const error = new Error('Token requerido');
      error.status = 400;
      throw error;
    }
  }));

  const out = makeResponse();

  await ctrl.closeSession(out.res, '');

  assert.deepEqual(out.result(), {
    status: 400,
    payload: {
      success: false,
      error: 'Token requerido'
    }
  });
});

test('SESSCTRL-006 historial conserva 200 aun con error', async () => {
  const ctrl = new SessionsController(makeService({
    registerLoginHistory: async () => {
      throw new Error('historial down');
    }
  }));

  const out = makeResponse();

  await ctrl.registerLoginHistory(out.res, {});

  assert.deepEqual(out.result(), {
    status: 200,
    payload: {
      success: false,
      error: 'historial down'
    }
  });
});

test('SESSCTRL-007 error sin status cae en 500', async () => {
  const ctrl = new SessionsController(makeService({
    listUserSessions: async () => {
      throw new Error('boom');
    }
  }));

  const out = makeResponse();

  await ctrl.listUserSessions(out.res, 1);

  assert.deepEqual(out.result(), {
    status: 500,
    payload: { error: 'boom' }
  });
});
