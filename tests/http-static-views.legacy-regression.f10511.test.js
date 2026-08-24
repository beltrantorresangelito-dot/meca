const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const server = fs.readFileSync(
  path.resolve(__dirname, '../server.js'),
  'utf8'
);

test('HTTPSHELLLEGACY-001 Audio Proxy sigue antes de Static Views', () => {
  const audioPos =
    server.indexOf('handleAudioProxyRequest({');

  const staticViewsPos =
    server.indexOf('handleHttpStaticViewsRequest({');

  assert.ok(audioPos >= 0);
  assert.ok(staticViewsPos >= 0);
  assert.ok(audioPos < staticViewsPos);
});

test('HTTPSHELLLEGACY-002 vistas están delegadas y no inline', () => {
  assert.match(server, /createHttpStaticViewsHandler/);
  assert.match(server, /handleHttpStaticViewsRequest/);
  assert.doesNotMatch(server, /function servirVista/);
});
