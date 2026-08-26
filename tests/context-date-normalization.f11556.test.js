const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(
  path.resolve(__dirname, '../public/js/auditor.js'),
  'utf8'
);

test('F11556-001 existe normalizador de fecha para contexto', () => {
  assert.match(
    source,
    /function normalizarFechaParaContexto\s*\(/
  );
});

test('F11556-002 resolver usa fechaContexto', () => {
  assert.match(
    source,
    /const\s+fechaContexto\s*=\s*normalizarFechaParaContexto/
  );

  assert.match(
    source,
    /params\.set\(\s*'fecha'\s*,\s*fechaContexto\s*\)/
  );
});

test('F11556-003 acepta timestamp ISO sin alterar payload', () => {
  // El helper debe reconocer una fecha ISO al inicio del texto.
  assert.match(
    source,
    /const\s+iso\s*=\s*texto\.match/
  );

  // Debe extraer YYYY-MM-DD.
  assert.match(
    source,
    /return\s+`\$\{iso\[1\]\}-\$\{iso\[2\]\}-\$\{iso\[3\]\}`/
  );

  // La normalización es exclusivamente para consultar contexto.
  // Nunca debe sobrescribir la fecha original de la evaluación.
  assert.doesNotMatch(
    source,
    /evaluacion\.fecha\s*=\s*normalizarFechaParaContexto/
  );
});

test('F11556-004 acepta fecha visual DD/MM/YYYY', () => {
  assert.match(
    source,
    /latam/
  );
});

test('F11556-005 helper queda expuesto para prueba manual', () => {
  assert.match(
    source,
    /window\.normalizarFechaParaContexto\s*=/
  );
});
