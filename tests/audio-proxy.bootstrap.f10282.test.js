const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(
  path.resolve(__dirname, '../server.js'),
  'utf8'
);

test('AUDIOBOOT-001 PYTHON_API_URL se declara una sola vez', () => {
  const matches = source.match(/const PYTHON_API_URL/g) || [];
  assert.equal(matches.length, 1);
});

test('AUDIOBOOT-002 PYTHON_API_URL se inicializa antes de crear handler', () => {
  const config = source.indexOf('const PYTHON_API_URL');
  const handler = source.indexOf(
    'const handleAudioProxyRequest = createAudioProxyHandler'
  );

  assert.ok(config >= 0, 'Falta PYTHON_API_URL');
  assert.ok(handler >= 0, 'Falta handleAudioProxyRequest');
  assert.ok(
    config < handler,
    'PYTHON_API_URL debe existir antes de crear AudioProxyHandler'
  );
});

test('AUDIOBOOT-003 conserva override por variable de entorno', () => {
  assert.match(
    source,
    /process\.env\.PYTHON_API_URL/
  );
});

test('AUDIOBOOT-004 conserva fallback desarrollo y producción', () => {
  assert.match(source, /process\.env\.NODE_ENV === 'production'/);
  assert.match(source, /http:\/\/10\.4\.240\.68:5001/);
  assert.match(source, /http:\/\/localhost:5001/);
});

test('AUDIOBOOT-005 Audio Proxy sigue modularizado', () => {
  assert.match(source, /createAudioProxyHandler/);
  assert.match(source, /handleAudioProxyRequest/);
  assert.doesNotMatch(
    source,
    /if \(ruta\.startsWith\('\/api\/audio\/reproducir\/'\)/
  );
});
