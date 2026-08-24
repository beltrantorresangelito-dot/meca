const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const {
  createHttpStaticViewsHandler
} = require('../src/modules/http-shell/http-static-views');

test('HTTPSHELLSUPASYNC-001 supervisor aliases esperan res.end', async () => {
  const dir = fs.mkdtempSync(
    path.join(os.tmpdir(), 'meca-http-supervisor-')
  );

  fs.mkdirSync(
    path.join(dir, 'views', 'supervisor'),
    { recursive: true }
  );

  fs.writeFileSync(
    path.join(dir, 'views', 'supervisor', 'dashboard.html'),
    '<h1>supervisor</h1>'
  );

  const handler = createHttpStaticViewsHandler({
    baseDir: dir
  });

  for (const ruta of ['/supervisor', '/supervisor.html']) {
    let status;
    let resolveEnded;

    const ended = new Promise(resolve => {
      resolveEnded = resolve;
    });

    const handled = await handler({
      ruta,
      respuesta: {
        writeHead(code) {
          status = code;
        },
        end() {
          resolveEnded();
        }
      }
    });

    assert.equal(handled, true);

    await ended;

    assert.equal(status, 200);
  }
});
