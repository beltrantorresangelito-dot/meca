const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const {
  createHttpStaticViewsHandler
} = require('../src/modules/http-shell/http-static-views');

test('HTTPSHELLASYNC-001 partial espera res.end en vez de timeout fijo', async () => {
  const dir = fs.mkdtempSync(
    path.join(os.tmpdir(), 'meca-http-shell-async-')
  );

  fs.mkdirSync(
    path.join(dir, 'views', 'partials'),
    { recursive: true }
  );

  fs.writeFileSync(
    path.join(dir, 'views', 'partials', 'x.html'),
    '<p>x</p>'
  );

  const handler =
    createHttpStaticViewsHandler({
      baseDir: dir
    });

  let status;
  let body;
  let resolveEnded;

  const ended = new Promise(resolve => {
    resolveEnded = resolve;
  });

  const handled = await handler({
    ruta: '/partials/x.html',
    respuesta: {
      writeHead(code) {
        status = code;
      },
      end(value) {
        body = value;
        resolveEnded();
      }
    }
  });

  assert.equal(handled, true);

  await ended;

  assert.equal(status, 200);
  assert.match(String(body), /x/);
});
