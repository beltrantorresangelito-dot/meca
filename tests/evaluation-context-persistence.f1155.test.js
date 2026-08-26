const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(
  path.resolve(__dirname, '../public/js/auditor.js'),
  'utf8'
);

test('F1155-001 existe enriquecedor de contexto', () => {
  assert.match(
    source,
    /async function enriquecerEvaluacionConContexto\s*\(/
  );
});

test('F1155-002 evaluación persiste campana_id', () => {
  assert.match(
    source,
    /campana_id:\s*campanaId/
  );
});

test('F1155-003 evaluación persiste matriz_id', () => {
  assert.match(
    source,
    /matriz_id:\s*matrizId/
  );
});

test('F1155-004 conserva contrato backend versionMatrizId', () => {
  assert.match(
    source,
    /versionMatrizId:\s*versionMatrizId/
  );
});

test('F1155-005 expone alias version_matriz_id', () => {
  assert.match(
    source,
    /version_matriz_id:\s*versionMatrizId/
  );
});

test('F1155-006 impide persistencia sin contexto completo', () => {
  assert.match(
    source,
    /No se puede guardar la evaluación sin campana_id/
  );

  assert.match(
    source,
    /No se puede guardar la evaluación sin matriz_id/
  );

  assert.match(
    source,
    /No se puede guardar la evaluación sin version_matriz_id/
  );
});

test('F1155-007 helpers quedan expuestos', () => {
  assert.match(
    source,
    /window\.enriquecerEvaluacionConContexto\s*=/
  );

  assert.match(
    source,
    /window\.validarContextoPersistenciaEvaluacion\s*=/
  );
});
