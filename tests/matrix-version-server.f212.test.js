const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repoSource = fs.readFileSync(
  path.resolve(__dirname, '../src/modules/matrix/matrix.repository.js'),
  'utf8'
);
const serverSource = fs.readFileSync(
  path.resolve(__dirname, '../server.js'),
  'utf8'
);

test('VERREPO-001 snapshot conserva matriz_id y clasificacion', () => {
  assert.match(repoSource, /matriz_id/);
  assert.match(repoSource, /clasificacion/);
  assert.match(repoSource, /reglas_evaluacion/);
});

test('VERREPO-002 activación usa UPDATEs dentro del repository', () => {
  assert.match(repoSource, /UPDATE versiones_matriz SET activa = FALSE/i);
  assert.match(repoSource, /SET activa = TRUE/i);
});

test('VERSERVER-001 lifecycle ya no está inline en server.js', () => {
  // El endpoint de congelado ya no debe implementarse inline.
  assert.doesNotMatch(
    serverSource,
    /if\s*\(\s*ruta\s*===\s*['"]\/api\/matriz\/versiones\/congelar['"]/
  );

  // La activación ya no debe contener su implementación SQL legacy inline.
  assert.doesNotMatch(
    serverSource,
    /UPDATE\s+versiones_matriz\s+SET\s+activa\s*=\s*FALSE\s+WHERE\s+activa\s*=\s*TRUE/i
  );

  // Los validadores ya no deben implementarse inline.
  assert.doesNotMatch(
    serverSource,
    /if\s*\(\s*ruta\s*===\s*['"]\/api\/matriz\/validar\/frentes['"]/
  );

  assert.doesNotMatch(
    serverSource,
    /if\s*\(\s*ruta\s*===\s*['"]\/api\/matriz\/validar\/atributos['"]/
  );

  assert.doesNotMatch(
    serverSource,
    /if\s*\(\s*ruta\s*===\s*['"]\/api\/matriz\/validar\/sub-motivos['"]/
  );
});

test('VERSERVER-002 recalcular permanece aislado para fase posterior', () => {
  const fsLocal = require('fs');
  const pathLocal = require('path');

  const serverActual = fsLocal.readFileSync(
    pathLocal.resolve(__dirname, '../server.js'),
    'utf8'
  );

  assert.match(
    serverActual,
    /createMatrixRecalculationHandler/
  );

  assert.match(
    serverActual,
    /handleMatrixRecalculationRequest/
  );

  assert.doesNotMatch(
    serverActual,
    /if \(ruta === '\/api\/matriz\/recalcular' && metodo === 'POST'\)/
  );
});
