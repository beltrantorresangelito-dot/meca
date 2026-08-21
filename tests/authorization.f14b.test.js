'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const {
  getRoleCode,
  isAdminManagementRoute,
  authorizeRequest
} = require('../security/authorization');

test('AUTHZ-001 normaliza rol desde rol_codigo', () => {
  assert.equal(getRoleCode({ rol_codigo: 'auditor' }), 'AUDITOR');
});

test('AUTHZ-002 identifica rutas administrativas sensibles', () => {
  assert.equal(isAdminManagementRoute('/api/usuarios', 'POST'), true);
  assert.equal(isAdminManagementRoute('/api/roles/3', 'PUT'), true);
  assert.equal(isAdminManagementRoute('/api/rol-pestanas/2', 'DELETE'), true);
  assert.equal(isAdminManagementRoute('/api/pestanas/todas', 'GET'), true);
});

test('AUTHZ-003 no bloquea rutas operativas del auditor', () => {
  assert.equal(isAdminManagementRoute('/api/usuarios/auditores-activos', 'GET'), false);
  assert.equal(isAdminManagementRoute('/api/evaluaciones', 'POST'), false);
  assert.equal(isAdminManagementRoute('/api/escuchas/mis-escuchas', 'GET'), false);
});

test('AUTHZ-004 ruta administrativa sin autenticación devuelve 401', () => {
  const r = authorizeRequest({ auth: null, route: '/api/usuarios', method: 'POST' });
  assert.equal(r.allowed, false);
  assert.equal(r.status, 401);
});

test('AUTHZ-005 AUDITOR no puede administrar usuarios', () => {
  const r = authorizeRequest({ auth: { rol_codigo: 'AUDITOR' }, route: '/api/usuarios', method: 'POST' });
  assert.equal(r.allowed, false);
  assert.equal(r.status, 403);
});

test('AUTHZ-006 rol supervisor/no-auditor conserva acceso administrativo legacy', () => {
  const r = authorizeRequest({ auth: { rol_codigo: 'SUPERVISOR' }, route: '/api/usuarios', method: 'POST' });
  assert.equal(r.allowed, true);
});

test('AUTHZ-007 AUDITOR conserva acceso a rutas no administrativas', () => {
  const r = authorizeRequest({ auth: { rol_codigo: 'AUDITOR' }, route: '/api/evaluaciones', method: 'POST' });
  assert.equal(r.allowed, true);
});
