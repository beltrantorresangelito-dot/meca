const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const scriptPath = path.resolve(
  __dirname,
  '../scripts/f112-caracterizar-residuos-multiquiebre.js'
);

test('F112-001 script existe', () => {
  assert.equal(fs.existsSync(scriptPath), true);
});

test('F112-002 cubre catálogo T ST F', () => {
  const source = fs.readFileSync(scriptPath, 'utf8');

  assert.match(source, /codigo:\\s\*'T'/);
  assert.match(source, /codigo:\\s\*'ST'/);
  assert.match(source, /codigo:\\s\*'F'/);
});

test('F112-003 cubre regla Cobranzas auditor', () => {
  const source = fs.readFileSync(scriptPath, 'utf8');

  assert.match(
    source,
    /Regla oficial vigente de Cobranzas/
  );
});

test('F112-004 cubre branding Cobranzas supervisor', () => {
  const source = fs.readFileSync(scriptPath, 'utf8');

  assert.match(source, /Auditoría Calidad Cobranzas/);
  assert.match(source, /Mesa Calidad Cobranzas/);
  assert.match(
    source,
    /Movistar Perú - Auditoría Calidad Cobranzas/
  );
});

test('F112-005 no modifica producción', () => {
  const source = fs.readFileSync(scriptPath, 'utf8');

  assert.doesNotMatch(
    source,
    /writeFileSync\([^)]*supervisor\.js/
  );

  assert.doesNotMatch(
    source,
    /writeFileSync\([^)]*auditor\.js/
  );
});
