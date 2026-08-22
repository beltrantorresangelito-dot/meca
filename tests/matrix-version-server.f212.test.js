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
  assert.doesNotMatch(
    serverSource,
    /if \(ruta === '\/api\/matriz\/versiones\/congelar'/
  );
  assert.doesNotMatch(
    serverSource,
    /versiones\\\/\\d\+\\\/activar/
  );
  assert.doesNotMatch(
    serverSource,
    /if \(ruta === '\/api\/matriz\/validar\/frentes'/
  );
});

test('VERSERVER-002 recalcular permanece aislado para fase posterior', () => {
  assert.match(
    serverSource,
    /if \(ruta === '\/api\/matriz\/recalcular' && metodo === 'POST'\)/
  );
});
