const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(
  path.resolve(__dirname, '../public/js/auditor.js'),
  'utf8'
);

test('F11551-001 guardado real usa enriquecimiento', () => {
  assert.match(
    source,
    /await\s+enriquecerEvaluacionConContexto\s*\(/
  );
});

test('F11551-002 guardado valida contexto', () => {
  assert.match(
    source,
    /validarContextoPersistenciaEvaluacion\s*\(/
  );

  assert.match(
    source,
    /Contexto de evaluación inválido/
  );
});

test('F11551-003 payload enviado es el enriquecido', () => {
  assert.match(
    source,
    /API\.guardarEvaluacion\(\s*[A-Za-z_$][\w$]*ConContexto\s*\)/
  );
});

test('F11551-004 contexto histórico sigue disponible', () => {
  assert.match(
    source,
    /campana_id:\s*campanaId/
  );

  assert.match(
    source,
    /matriz_id:\s*matrizId/
  );

  assert.match(
    source,
    /version_matriz_id:\s*versionMatrizId/
  );
});
