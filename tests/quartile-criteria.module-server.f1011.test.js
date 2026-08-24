const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(
  path.resolve(__dirname, '../server.js'),
  'utf8'
);

test('CQMOD-SERVER-001 server delega al módulo', () => {
  assert.match(source, /createQuartileCriteriaHandler/);
  assert.match(source, /handleQuartileCriteriaRequest/);
});

test('CQMOD-SERVER-002 handlers criterios ya no están inline', () => {
  assert.doesNotMatch(
    source,
    /if \(ruta === '\/api\/criterios-cuartiles'/
  );

  assert.doesNotMatch(
    source,
    /if \(ruta\.match\(\/\^\\\/api\\\/criterios-cuartiles/
  );
});

test('CQMOD-SERVER-003 server no instancia capas internas', () => {
  assert.doesNotMatch(source, /new QuartileCriteriaRepository/);
  assert.doesNotMatch(source, /new QuartileCriteriaService/);
  assert.doesNotMatch(source, /new QuartileCriteriaController/);
});

test('CQMOD-SERVER-004 módulos previos siguen modularizados', () => {
  assert.match(source, /handleEvaluationsRequest/);
  assert.match(source, /handleSessionsRequest/);
  assert.match(source, /handleRequestsRequest/);
  assert.match(source, /handlePdaRequest/);
});
