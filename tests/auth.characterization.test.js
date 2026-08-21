process.env.AUTH_SECRET = process.env.AUTH_SECRET || 'test-secret-32-characters-minimum-123456';
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { signToken } = require('../security/tokens');
const { loadAuthController, createResponseRecorder } = require('./helpers/load-auth-controller');

test('AUTH-001: rechaza login sin usuario o contraseña', async () => {
  const { controller, restore } = loadAuthController();
  const res = createResponseRecorder();
  try {
    await controller.login({}, res, { usuario: 'auditor_test' });
    assert.equal(res.statusCode, 400);
    assert.match(res.json().error, /requeridos/i);
  } finally {
    restore();
  }
});

test('AUTH-002: rechaza usuario inexistente', async () => {
  const { controller, restore } = loadAuthController({ user: null });
  const res = createResponseRecorder();
  try {
    await controller.login({}, res, { usuario: 'no_existe', contrasena: 'x' });
    assert.equal(res.statusCode, 401);
    assert.match(res.json().error, /no encontrado/i);
  } finally {
    restore();
  }
});

test('AUTH-003: rechaza usuario inactivo', async () => {
  const { controller, restore } = loadAuthController({
    user: { id: 1, usuario: 'inactivo', contrasena: 'x', activo: false },
  });
  const res = createResponseRecorder();
  try {
    await controller.login({}, res, { usuario: 'inactivo', contrasena: 'x' });
    assert.equal(res.statusCode, 401);
    assert.match(res.json().error, /inactivo/i);
  } finally {
    restore();
  }
});

test('AUTH-004: acepta contraseña SHA-256 válida de la baseline', async () => {
  const password = 'clave_test';
  const hash = crypto.createHash('sha256').update(password).digest('hex');
  const { controller, restore } = loadAuthController({
    user: {
      id: 7,
      usuario: 'auditor_test',
      nombre_completo: 'Auditor Test',
      rol: 'AUDITOR',
      contrasena: hash,
      activo: true,
    },
  });
  const res = createResponseRecorder();
  try {
    await controller.login({}, res, { usuario: 'auditor_test', contrasena: password });
    assert.equal(res.statusCode, 200);
    const body = res.json();
    assert.equal(body.success, true);
    assert.equal(body.usuario.rol, 'AUDITOR');
    assert.equal(typeof body.token, 'string');
    assert.equal(body.token.split('.').length, 3);
  } finally {
    restore();
  }
});

test('AUTH-005: token expirado es rechazado', () => {
  const { controller, restore } = loadAuthController();
  const res = createResponseRecorder();
  try {
    const token = signToken({ usuario: 'x' }, { expiresInSeconds: -1 });
    const result = controller.verificarToken({}, res, null, null, token);
    assert.equal(result, false);
    assert.equal(res.statusCode, 401);
    assert.match(res.json().error, /expirado/i);
  } finally {
    restore();
  }
});
