const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const scriptPath = path.resolve(
  __dirname,
  '../scripts/f111-diagnostico-multiquiebre.js'
);

test('F111-DIAG-001 script de diagnóstico existe', () => {
  assert.equal(
    fs.existsSync(scriptPath),
    true
  );
});

test('F111-DIAG-002 diagnóstico no modifica server.js', () => {
  const source =
    fs.readFileSync(
      scriptPath,
      'utf8'
    );

  assert.doesNotMatch(
    source,
    /writeFileSync\([^)]*server\.js/
  );
});

test('F111-DIAG-003 cubre quiebre y campaña hardcodeados', () => {
  const source =
    fs.readFileSync(
      scriptPath,
      'utf8'
    );

  assert.match(source, /COBRANZAS/);
  assert.match(source, /quiebre_id/);
  assert.match(source, /campana_id/);
  assert.match(source, /FRACCIONAMIENTO/);
});

test('F111-DIAG-004 cubre señales positivas multi-contexto', () => {
  const source =
    fs.readFileSync(
      scriptPath,
      'utf8'
    );

  assert.match(
    source,
    /resolver_contexto_evaluacion/
  );

  assert.match(
    source,
    /domain\\\/quiebres/
  );

  assert.match(
    source,
    /domain\\\/campanas/
  );
});
