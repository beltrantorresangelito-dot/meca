const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const server = fs.readFileSync(
  path.resolve(__dirname, '../server.js'),
  'utf8'
);

test('EVALMOD-SERVER-001 server delega al módulo', () => {
  assert.match(
    server,
    /createEvaluationsHandler/
  );

  assert.match(
    server,
    /handleEvaluationsRequest/
  );
});

test('EVALMOD-SERVER-002 server no contiene SQL de evaluaciones', () => {
  assert.doesNotMatch(
    server,
    /SELECT \* FROM evaluaciones WHERE 1=1/
  );
  assert.doesNotMatch(
    server,
    /INSERT INTO evaluaciones \(/
  );
  assert.doesNotMatch(
    server,
    /DELETE FROM detalles_evaluacion WHERE evaluacion_id/
  );
});

test('EVALMOD-SERVER-003 server no contiene handlers inline', () => {
  assert.doesNotMatch(
    server,
    /if \(ruta === '\/api\/evaluaciones'/
  );

  assert.doesNotMatch(
    server,
    /ruta\.match\(\/\^\\\/api\\\/evaluaciones/
  );
});
