const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(
  path.resolve(__dirname, '../public/js/auditor.js'),
  'utf8'
);

test('F1154-001 existe resolverContextoAuditoria', () => {
  assert.match(
    source,
    /async function resolverContextoAuditoria\s*\(/
  );
});

test('F1154-002 Auditor usa contexto-evaluacion', () => {
  assert.match(
    source,
    /\/api\/domain\/contexto-evaluacion\?/
  );
});

test('F1154-003 contrato usa campanaId', () => {
  assert.match(
    source,
    /params\.set\(\s*'campanaId'/
  );
});

test('F1154-004 contexto actualiza matriz y versión', () => {
  assert.match(
    source,
    /window\.matrizActualId/
  );

  assert.match(
    source,
    /window\.versionMatrizActualId/
  );
});

test('F1154-005 existe resolución desde escucha', () => {
  assert.match(
    source,
    /async function resolverContextoDesdeEscucha\s*\(/
  );

  assert.match(
    source,
    /escucha\.campana_id/
  );
});

test('F1154-006 helpers quedan expuestos', () => {
  assert.match(
    source,
    /window\.resolverContextoAuditoria\s*=/
  );

  assert.match(
    source,
    /window\.aplicarContextoAuditoria\s*=/
  );

  assert.match(
    source,
    /window\.resolverContextoDesdeEscucha\s*=/
  );
});

test('F1154-007 cuartiles permanecen intactos', () => {
  assert.match(
    source,
    /if\s*\(\s*nota\s*>=\s*97\s*\)\s*return\s*['"]Q1['"]/
  );

  assert.match(
    source,
    /if\s*\(\s*nota\s*>=\s*90\s*\)\s*return\s*['"]Q2['"]/
  );

  assert.match(
    source,
    /if\s*\(\s*nota\s*>=\s*85\s*\)\s*return\s*['"]Q3['"]/
  );
});

test(
  'F1154-008 recálculo de formulario usa frentes dinámicos',
  () => {
    assert.match(
      source,
      /recalcularTodosLosFrentes\s*\(/
    );

    assert.match(
      source,
      /function\s+recalcularTodosLosFrentes\s*\(/
    );
  }
);


test(
  'F1154-009 no conserva llamada legacy recalcularTotalENC',
  () => {
    /*
     * Puede seguir existiendo lógica histórica relacionada con ENC,
     * pero no debe existir una invocación directa a la función
     * eliminada recalcularTotalENC().
     */
    assert.doesNotMatch(
      source,
      /\brecalcularTotalENC\s*\(/
    );
  }
);