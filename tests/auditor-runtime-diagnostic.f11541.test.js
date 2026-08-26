const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(
  path.resolve(
    __dirname,
    '../scripts/f11541-diagnosticar-runtime-auditor.js'
  ),
  'utf8'
);

test('F11541-001 inspecciona public/js/auditor.js', () => {
  assert.match(source, /public/);
  assert.match(source, /auditor\.js/);
});

test('F11541-002 busca helper runtime', () => {
  assert.match(source, /resolverContextoDesdeEscucha/);
  assert.match(source, /window\\\.resolverContextoDesdeEscucha/);
});

test('F11541-003 inspecciona script tags HTML', () => {
  assert.match(source, /<script\\b/);
  assert.match(source, /src\\s/);
});

test('F11541-004 no modifica producción', () => {
  assert.doesNotMatch(
    source,
    /writeFileSync\([^)]*auditor\.js/
  );
});
