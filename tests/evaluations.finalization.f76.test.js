const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const server = fs.readFileSync(path.resolve(__dirname, '../server.js'), 'utf8');
const routes = fs.readFileSync(
  path.resolve(__dirname, '../src/modules/evaluations/evaluations.routes.js'),
  'utf8'
);

test('EVALFINAL-001 único punto de entrada es handleEvaluationsRequest', () => {
  assert.match(server, /await handleEvaluationsRequest\(\{/);
  assert.doesNotMatch(server, /if \(ruta === '\/api\/evaluaciones'/);
  assert.doesNotMatch(server, /ruta\.match\(\/\^\\\/api\\\/evaluaciones/);
});

test('EVALFINAL-002 server ya no contiene SQL principal de Evaluaciones', () => {
  for (const pattern of [
    /SELECT \* FROM evaluaciones WHERE 1=1/,
    /INSERT INTO evaluaciones \(/,
    /DELETE FROM evaluaciones WHERE id/,
    /DELETE FROM detalles_evaluacion WHERE evaluacion_id/,
    /SELECT \* FROM detalles_evaluacion WHERE evaluacion_id/
  ]) assert.doesNotMatch(server, pattern);
});

test('EVALFINAL-003 routes conserva contratos GET POST DELETE', () => {
  assert.match(routes, /ruta === '\/api\/evaluaciones' && metodo === 'GET'/);
  assert.match(routes, /ruta === '\/api\/evaluaciones' && metodo === 'POST'/);
  assert.match(routes, /validar-ticket/);
  assert.match(routes, /detalles/);
  assert.match(routes, /metodo === 'DELETE'/);
});

test('EVALFINAL-004 POST inválido conserva 400', () => {
  assert.match(routes, /function readJsonBody/);
  assert.match(routes, /JSON\.parse\(body\)/);
  assert.match(routes, /EvaluationsController\.json\(\s*respuesta,\s*400/);
});

test('EVALFINAL-005 autorización central ocurre antes del dispatcher', () => {
  const authz = server.indexOf('authorizeRequest({');
  const dispatcher = server.indexOf('handleEvaluationsRequest({');
  assert.ok(authz >= 0 && dispatcher >= 0 && authz < dispatcher);
});
