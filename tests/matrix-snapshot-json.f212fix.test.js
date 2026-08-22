const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(
  path.resolve(__dirname, '../src/modules/matrix/matrix.repository.js'),
  'utf8'
);

test('SNAPJSON-001 snapshot serializa arrays JSON antes de INSERT', () => {
  assert.match(
    source,
    /JSON\.stringify\(rule\.submotivos_afectados\)/
  );

  assert.match(
    source,
    /JSON\.stringify\(rule\.excepciones\)/
  );
});

test('SNAPJSON-002 snapshot preserva null en campos JSON opcionales', () => {
  assert.match(
    source,
    /rule\.submotivos_afectados\s*==\s*null\s*\?\s*null/
  );

  assert.match(
    source,
    /rule\.excepciones\s*==\s*null\s*\?\s*null/
  );
});
