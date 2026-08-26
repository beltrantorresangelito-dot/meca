const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const scriptPath = path.resolve(
  __dirname,
  '../scripts/f114-diagnosticar-flujo-contexto.js'
);

const source = fs.readFileSync(
  scriptPath,
  'utf8'
);

test('F114-001 cubre quiebre y campaña', () => {
  assert.match(source, /quiebre_id/);
  assert.match(source, /campana_id/);
  assert.match(source, /quiebre_codigo/);
  assert.match(source, /campana_codigo/);
});

test('F114-002 cubre APIs de dominio', () => {
  assert.match(source, /domain\\\/quiebres/);
  assert.match(source, /domain\\\/campanas/);
  assert.match(source, /domain\\\/contexto/);
});

test('F114-003 cubre resolución de matriz', () => {
  assert.match(
    source,
    /resolver_contexto_evaluacion/
  );

  assert.match(source, /matriz_id/);
  assert.match(source, /matriz_version_id/);
  assert.match(source, /vigencia/);
});

test('F114-004 inspecciona Supervisor y Auditor', () => {
  assert.match(source, /public\/js\/supervisor\.js/);
  assert.match(source, /public\/js\/auditor\.js/);
});

test('F114-005 no modifica producción', () => {
  assert.doesNotMatch(
    source,
    /writeFileSync\([^)]*supervisor\.js/
  );

  assert.doesNotMatch(
    source,
    /writeFileSync\([^)]*auditor\.js/
  );

  assert.doesNotMatch(
    source,
    /writeFileSync\([^)]*server\.js/
  );
});
