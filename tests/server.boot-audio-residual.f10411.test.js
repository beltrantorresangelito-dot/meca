const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(
  path.resolve(__dirname, '../server.js'),
  'utf8'
);

test('BOOTRES-001 no existe fragmento ON_API_URL huérfano', () => {
  assert.doesNotMatch(
    source,
    /(^|\n)\s*ON_API_URL\s*\|\|/
  );
});

test('BOOTRES-002 PYTHON_API_URL existe una sola vez', () => {
  const matches =
    source.match(/const PYTHON_API_URL/g) || [];

  assert.equal(matches.length, 1);
});

test('BOOTRES-003 configuración Python precede AudioProxyHandler', () => {
  const config =
    source.indexOf('const PYTHON_API_URL');

  const handler =
    source.indexOf(
      'const handleAudioProxyRequest = createAudioProxyHandler'
    );

  assert.ok(config >= 0);
  assert.ok(handler >= 0);
  assert.ok(config < handler);
});

test('BOOTRES-004 no queda configuración Python duplicada dentro del request', () => {
  const createServer =
    source.indexOf('http.createServer');

  const requestPart =
    source.slice(createServer);

  assert.doesNotMatch(
    requestPart,
    /process\.env\.NODE_ENV === 'production'[\s\S]{0,250}localhost:5001/
  );
});
