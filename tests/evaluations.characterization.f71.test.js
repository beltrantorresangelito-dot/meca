const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const server = fs.readFileSync(
  path.resolve(__dirname, '../server.js'),
  'utf8'
);

const routes = fs.readFileSync(
  path.resolve(__dirname, '../src/modules/evaluations/evaluations.routes.js'),
  'utf8'
);

test('EVALCHAR-F75-001 server registra dispatcher', () => {
  assert.match(
    server,
    /const \{ createEvaluationsHandler \} = require\('\.\/src\/modules\/evaluations'\)/
  );
  assert.match(
    server,
    /const handleEvaluationsRequest = createEvaluationsHandler\(\{ db: pool \}\)/
  );
  assert.match(
    server,
    /await handleEvaluationsRequest\(\{/
  );
});

test('EVALCHAR-F75-002 handlers ya no están inline', () => {
  assert.doesNotMatch(
    server,
    /if \(ruta === '\/api\/evaluaciones' && metodo === 'GET'\)/
  );
  assert.doesNotMatch(
    server,
    /if \(ruta === '\/api\/evaluaciones' && metodo === 'POST'\)/
  );
  assert.doesNotMatch(
    server,
    /if \(ruta === '\/api\/evaluaciones\/validar-ticket'/
  );
  assert.doesNotMatch(
    server,
    /ruta\.match\(\/\^\\\/api\\\/evaluaciones/
  );
});

test('EVALCHAR-F75-003 routes contiene cinco contratos', () => {
  assert.match(routes, /\/api\/evaluaciones/);
  assert.match(routes, /validar-ticket/);
  assert.match(routes, /detalles/);
  assert.match(routes, /metodo === 'GET'/);
  assert.match(routes, /metodo === 'POST'/);
  assert.match(routes, /metodo === 'DELETE'/);
});

test('EVALCHAR-F75-004 parsing POST migró a routes', () => {
  assert.match(routes, /function readJsonBody/);
  assert.match(routes, /JSON\.parse\(body\)/);
  assert.match(routes, /EvaluationsController\.json\(/);
  assert.match(routes, /400/);
});

test('EVALCHAR-F75-005 server no conoce capas internas', () => {
  assert.doesNotMatch(server, /new EvaluationsRepository/);
  assert.doesNotMatch(server, /new EvaluationsService/);
  assert.doesNotMatch(server, /new EvaluationsController/);
});
