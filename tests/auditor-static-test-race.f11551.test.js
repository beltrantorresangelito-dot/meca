const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(
  path.resolve(
    __dirname,
    'http-static-views.module.f1051.test.js'
  ),
  'utf8'
);

function auditorBlock() {
  const start = source.indexOf(
    "test('HTTPSHELLMOD-005 auditor aliases funcionan'"
  );

  const end = source.indexOf(
    "test('HTTPSHELLMOD-006 supervisor aliases funcionan'"
  );

  assert.ok(start >= 0);
  assert.ok(end > start);

  return source.slice(start, end);
}

test('F11551-001 Auditor no espera con timeout arbitrario', () => {
  const block = auditorBlock();

  assert.doesNotMatch(
    block,
    /setTimeout/
  );
});

test('F11551-002 Auditor espera respuesta.end', () => {
  const block = auditorBlock();

  assert.match(
    block,
    /const ended = new Promise/
  );

  assert.match(
    block,
    /resolveEnded\(\)/
  );

  assert.match(
    block,
    /await ended/
  );
});

test('F11551-003 ambos aliases siguen cubiertos', () => {
  const block = auditorBlock();

  assert.match(block, /'\/auditor'/);
  assert.match(block, /'\/auditor\.html'/);
});
