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

function loginBlock() {
  const start = source.indexOf(
    "test('HTTPSHELLMOD-004 login devuelve vista'"
  );

  const end = source.indexOf(
    "test('HTTPSHELLMOD-005 auditor aliases funcionan'",
    start
  );

  assert.ok(start >= 0);
  assert.ok(end > start);

  return source.slice(start, end);
}

test('F11554B-001 login no usa timeout arbitrario', () => {
  assert.doesNotMatch(
    loginBlock(),
    /setTimeout/
  );
});

test('F11554B-002 login espera respuesta.end', () => {
  const block = loginBlock();

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

test('F11554B-003 login conserva status 200', () => {
  assert.match(
    loginBlock(),
    /assert\.equal\(status, 200\)/
  );
});
