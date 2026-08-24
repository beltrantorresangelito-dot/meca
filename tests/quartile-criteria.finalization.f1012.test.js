const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const server = fs.readFileSync(
  path.resolve(__dirname, '../server.js'),
  'utf8'
);

const routes = fs.readFileSync(
  path.resolve(
    __dirname,
    '../src/modules/quartile-criteria/quartile-criteria.routes.js'
  ),
  'utf8'
);

const controller = fs.readFileSync(
  path.resolve(
    __dirname,
    '../src/modules/quartile-criteria/quartile-criteria.controller.js'
  ),
  'utf8'
);

const service = fs.readFileSync(
  path.resolve(
    __dirname,
    '../src/modules/quartile-criteria/quartile-criteria.service.js'
  ),
  'utf8'
);

const repository = fs.readFileSync(
  path.resolve(
    __dirname,
    '../src/modules/quartile-criteria/quartile-criteria.repository.js'
  ),
  'utf8'
);

test('CQFINAL-001 único punto de entrada en server es handleQuartileCriteriaRequest', () => {
  assert.match(
    server,
    /await handleQuartileCriteriaRequest\(\{/
  );

  assert.doesNotMatch(
    server,
    /if \(ruta === '\/api\/criterios-cuartiles'/
  );

  assert.doesNotMatch(
    server,
    /if \(ruta\.match\(\/\^\\\/api\\\/criterios-cuartiles/
  );
});

test('CQFINAL-002 server ya no instancia capas internas', () => {
  assert.doesNotMatch(server, /new QuartileCriteriaRepository/);
  assert.doesNotMatch(server, /new QuartileCriteriaService/);
  assert.doesNotMatch(server, /new QuartileCriteriaController/);
});

test('CQFINAL-003 routes conserva seis contratos', () => {
  assert.ok(routes.includes('/api/criterios-cuartiles'));
  assert.ok(routes.includes('/api/criterios-cuartiles/activos'));
  assert.ok(routes.includes('^\\/api\\/criterios-cuartiles\\/(\\d+)$'));
  assert.ok(routes.includes('^\\/api\\/criterios-cuartiles\\/(\\d+)\\/activar$'));

  assert.ok(routes.includes("metodo === 'GET'"));
  assert.ok(routes.includes("metodo === 'POST'"));
  assert.ok(routes.includes("metodo === 'PUT'"));
  assert.ok(routes.includes("metodo === 'DELETE'"));
});

test('CQFINAL-004 Token y parsing permanecen en routes', () => {
  assert.match(routes, /function requireToken/);
  assert.match(routes, /Token requerido/);
  assert.match(routes, /function readJsonBody/);
  assert.match(routes, /JSON\.parse\(body\)/);
});

test('CQFINAL-005 HTTP de negocio vive en Controller', () => {
  assert.match(controller, /201/);
  assert.match(controller, /Criterio no encontrado/);
  assert.match(controller, /desactivado correctamente/);
  assert.match(controller, /success: false/);
});

test('CQFINAL-006 fecha vigente vive en Service', () => {
  assert.match(
    service,
    /new Date\(\)\.toISOString\(\)\.split\('T'\)\[0\]/
  );
  assert.match(service, /listActiveByDate\(hoy\)/);
});

test('CQFINAL-007 desactivación lógica vive en Service y Repository', () => {
  assert.match(service, /findBasicById/);
  assert.match(service, /repository\.deactivate/);

  assert.match(repository, /SET activo = false/);
  assert.doesNotMatch(repository, /DELETE FROM criterios_cuartiles/);
});

test('CQFINAL-008 SQL está encapsulado en Repository', () => {
  assert.match(repository, /SELECT \* FROM criterios_cuartiles/);
  assert.match(repository, /INSERT INTO criterios_cuartiles/);
  assert.match(repository, /UPDATE criterios_cuartiles/);

  assert.doesNotMatch(server, /SELECT \* FROM criterios_cuartiles/);
  assert.doesNotMatch(server, /INSERT INTO criterios_cuartiles/);
  assert.doesNotMatch(server, /UPDATE criterios_cuartiles/);
});

test('CQFINAL-009 legacy vigente está contenido en Repository', () => {
  assert.match(repository, /'admin'/);
  assert.match(repository, /activo !== false/);
  assert.match(repository, /fecha_vigencia_hasta \|\| null/);
});

test('CQFINAL-010 módulos cerrados siguen protegidos', () => {
  assert.match(server, /handleEvaluationsRequest/);
  assert.match(server, /handleSessionsRequest/);
  assert.match(server, /handleRequestsRequest/);
  assert.match(server, /handlePdaRequest/);
});

test('CQFINAL-011 autorización central precede dispatcher', () => {
  const authz = server.indexOf('authorizeRequest({');
  const criteria = server.indexOf('handleQuartileCriteriaRequest({');

  assert.ok(authz >= 0);
  assert.ok(criteria >= 0);
  assert.ok(authz < criteria);
});
