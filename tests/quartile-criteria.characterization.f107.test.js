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

test('CQ-F1011-001 server registra dispatcher', () => {
  assert.match(server, /createQuartileCriteriaHandler/);
  assert.match(server, /handleQuartileCriteriaRequest/);
});

test('CQ-F1011-002 seis contratos migraron a routes', () => {
  assert.ok(routes.includes('/api/criterios-cuartiles'));
  assert.ok(routes.includes('/api/criterios-cuartiles/activos'));
  assert.ok(routes.includes('^\\/api\\/criterios-cuartiles\\/(\\d+)$'));
  assert.ok(routes.includes('^\\/api\\/criterios-cuartiles\\/(\\d+)\\/activar$'));

  assert.ok(routes.includes("metodo === 'GET'"));
  assert.ok(routes.includes("metodo === 'POST'"));
  assert.ok(routes.includes("metodo === 'PUT'"));
  assert.ok(routes.includes("metodo === 'DELETE'"));
});

test('CQ-F1011-003 Token requerido migró a routes', () => {
  assert.match(routes, /function requireToken/);
  assert.match(routes, /Token requerido/);
  assert.match(routes, /401/);
});

test('CQ-F1011-004 parsing JSON migró a routes', () => {
  assert.match(routes, /function readJsonBody/);
  assert.match(routes, /JSON\.parse\(body\)/);
});

test('CQ-F1011-005 server ya no conoce capas internas', () => {
  assert.doesNotMatch(server, /quartileCriteriaRepository\./);
  assert.doesNotMatch(server, /quartileCriteriaService\./);
  assert.doesNotMatch(server, /quartileCriteriaController\./);
});

test('CQ-F1011-006 módulos previos permanecen protegidos', () => {
  assert.match(server, /handleEvaluationsRequest/);
  assert.match(server, /handleSessionsRequest/);
  assert.match(server, /handleRequestsRequest/);
  assert.match(server, /handlePdaRequest/);
});
