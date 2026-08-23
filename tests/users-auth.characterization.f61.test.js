const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const server = fs.readFileSync(
  path.resolve(__dirname, '../server.js'),
  'utf8'
);

const routes = fs.readFileSync(
  path.resolve(__dirname, '../src/modules/users/users.routes.js'),
  'utf8'
);

const controller = fs.readFileSync(
  path.resolve(__dirname, '../src/modules/users/users.controller.js'),
  'utf8'
);

test('USRCHAR-F64-001 server registra Users/Auth dispatcher', () => {
  assert.match(server, /createUsersHandler/);
  assert.match(server, /handleUsersRequest/);
});

test('USRCHAR-F64-002 login/verify/change-password ya no tienen handlers inline', () => {
  assert.doesNotMatch(
    server,
    /if\s*\(\s*ruta === '\/api\/auth\/login'\s*&&\s*metodo === 'POST'\s*\)/
  );

  assert.doesNotMatch(
    server,
    /if\s*\(\s*ruta === '\/api\/auth\/verify'\s*&&\s*metodo === 'GET'\s*\)/
  );

  // La ruta cambiar-password DEBE seguir apareciendo en la validación
  // central de expectedPurpose. Aquí solo prohibimos el handler inline.
  assert.doesNotMatch(
    server,
    /if\s*\(\s*ruta === '\/api\/auth\/cambiar-password'\s*&&\s*metodo === 'POST'\s*\)/
  );
});

test('USRCHAR-F64-003 usuarios CRUD ya no está inline', () => {
  assert.doesNotMatch(server, /ruta === '\/api\/usuarios' && metodo === 'GET'/);
  assert.doesNotMatch(server, /ruta === '\/api\/usuarios' && metodo === 'POST'/);
  assert.doesNotMatch(server, /ruta === '\/api\/usuarios\/exportar'/);
  assert.doesNotMatch(server, /ruta\.match\(\/\^\\\/api\\\/usuarios/);
});

test('USRCHAR-F64-004 routes contiene contratos Users/Auth', () => {
  for (const endpoint of [
    '/api/auth/login',
    '/api/auth/verify',
    '/api/auth/cambiar-password',
    '/api/usuarios/auditores',
    '/api/usuarios/auditores-activos',
    '/api/usuarios',
    '/api/usuarios/exportar'
  ]) {
    assert.match(routes, new RegExp(endpoint.replaceAll('/', '\\/')));
  }
});

test('USRCHAR-F64-005 controller conserva Token requerido', () => {
  assert.match(controller, /Token requerido/);
  assert.match(controller, /this\.requireToken/);
});

test('USRCHAR-F64-006 CSV de usuarios sale de server y queda en controller', () => {
  assert.doesNotMatch(server, /usuarios_\$\{new Date\(\)/);
  assert.match(controller, /text\/csv; charset=utf-8/);
  assert.match(controller, /Content-Disposition/);
});

test('USRCHAR-F64-007 Auth redirect y Roles ya están delegados al RolesModule', () => {
  assert.match(
    server,
    /const \{ createRolesHandler \} = require\('\.\/src\/modules\/roles'\)/
  );
  assert.match(
    server,
    /const handleRolesRequest = createRolesHandler\(\{ db: pool \}\)/
  );
  assert.match(server, /await handleRolesRequest\(\{/);

  assert.doesNotMatch(
    server,
    /if \(ruta === '\/api\/auth\/redirect' && metodo === 'GET'\)/
  );
  assert.doesNotMatch(
    server,
    /if \(ruta === '\/api\/roles' && metodo === 'GET'\)/
  );
  assert.doesNotMatch(
    server,
    /if \(ruta === '\/api\/pestanas\/todas' && metodo === 'GET'\)/
  );
});
