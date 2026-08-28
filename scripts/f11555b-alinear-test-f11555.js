const fs = require('node:fs');
const path = require('node:path');

const testPath = path.resolve(
  __dirname,
  '../tests/evaluation-matrix-persistence.f11555.test.js'
);

if (!fs.existsSync(testPath)) {
  console.log('[F11.5.5.5B] Test F11555 no existe; se omite alineación.');
  process.exit(0);
}

const updated = `
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const repo = fs.readFileSync(
  path.resolve(
    __dirname,
    '../src/modules/evaluations/evaluations.repository.js'
  ),
  'utf8'
);

test('F11555-001 INSERT evaluaciones contiene matriz_id', () => {
  assert.match(
    repo,
    /INSERT\\s+INTO\\s+evaluaciones\\s*\\([\\s\\S]*\\bmatriz_id\\b/im
  );
});

test('F11555-002 backend lee matriz_id del payload', () => {
  assert.match(
    repo,
    /evaluacion\\.matriz_id/
  );
});

test('F11555-003 params insertan matriz antes de version', () => {
  assert.match(
    repo,
    /evaluacion\\.matriz_id[\\s\\S]*evaluacion\\.version_matriz_id/
  );
});
`;

fs.writeFileSync(
  testPath,
  updated.trimStart(),
  'utf8'
);

console.log(
  '[F11.5.5.5B] OK - test F11555 alineado al módulo evaluations.'
);
