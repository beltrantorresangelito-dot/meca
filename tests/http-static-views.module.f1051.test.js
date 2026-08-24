const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

const {
  createHttpStaticViewsHandler
} = require('../src/modules/http-shell/http-static-views');

function output() {
  let status;
  let headers;
  let body;

  return {
    res: {
      writeHead(code, h) {
        status = code;
        headers = h;
      },
      end(value) {
        body = value;
      }
    },
    get() {
      return { status, headers, body };
    }
  };
}

function fixture() {
  const dir = fs.mkdtempSync(
    path.join(os.tmpdir(), 'meca-http-shell-')
  );

  fs.mkdirSync(path.join(dir, 'public', 'css'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'views', 'auditor'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'views', 'supervisor'), { recursive: true });
  fs.mkdirSync(path.join(dir, 'views', 'partials'), { recursive: true });

  fs.writeFileSync(path.join(dir, 'public', 'css', 'app.css'), 'body{}');
  fs.writeFileSync(path.join(dir, 'views', 'login.html'), '<h1>login</h1>');
  fs.writeFileSync(path.join(dir, 'views', 'auditor', 'dashboard.html'), '<h1>auditor</h1>');
  fs.writeFileSync(path.join(dir, 'views', 'supervisor', 'dashboard.html'), '<h1>supervisor</h1>');
  fs.writeFileSync(path.join(dir, 'views', 'partials', 'x.html'), '<p>x</p>');

  return dir;
}

test('HTTPSHELLMOD-001 ruta ajena devuelve false', async () => {
  const handler = createHttpStaticViewsHandler({ baseDir: fixture() });

  assert.equal(
    await handler({
      ruta: '/api/x',
      respuesta: {}
    }),
    false
  );
});

test('HTTPSHELLMOD-002 css devuelve 200 text/css', async () => {
  const out = output();
  const handler = createHttpStaticViewsHandler({ baseDir: fixture() });

  await handler({
    ruta: '/css/app.css',
    respuesta: out.res
  });

  await new Promise(r => setTimeout(r, 20));

  assert.equal(out.get().status, 200);
  assert.equal(out.get().headers['Content-Type'], 'text/css');
});

test('HTTPSHELLMOD-003 estático inexistente devuelve 404', async () => {
  const out = output();
  const handler = createHttpStaticViewsHandler({ baseDir: fixture() });

  await handler({
    ruta: '/css/no.css',
    respuesta: out.res
  });

  await new Promise(r => setTimeout(r, 20));

  assert.equal(out.get().status, 404);
});

test('HTTPSHELLMOD-004 login devuelve vista', async () => {
  const out = output();
  const handler = createHttpStaticViewsHandler({ baseDir: fixture() });

  await handler({
    ruta: '/login',
    respuesta: out.res
  });

  await new Promise(r => setTimeout(r, 20));

  assert.equal(out.get().status, 200);
  assert.match(String(out.get().body), /login/);
});

test('HTTPSHELLMOD-005 auditor aliases funcionan', async () => {
  const dir = fixture();

  for (const ruta of ['/auditor', '/auditor.html']) {
    const out = output();
    const handler = createHttpStaticViewsHandler({ baseDir: dir });

    await handler({
      ruta,
      respuesta: out.res
    });

    await new Promise(r => setTimeout(r, 20));

    assert.equal(out.get().status, 200);
  }
});

test('HTTPSHELLMOD-006 supervisor aliases funcionan', async () => {
  const dir = fixture();

  for (const ruta of ['/supervisor', '/supervisor.html']) {
    let status;
    let resolveEnded;

    const ended = new Promise(resolve => {
      resolveEnded = resolve;
    });

    const handler = createHttpStaticViewsHandler({
      baseDir: dir
    });

    await handler({
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

    await ended;

    assert.equal(status, 200);
  }
});

test('HTTPSHELLMOD-007 partial reutiliza views/partials', async () => {
  const dir = fixture();

  let status;
  let body;
  let resolveEnded;

  const ended = new Promise(resolve => {
    resolveEnded = resolve;
  });

  const handler = createHttpStaticViewsHandler({
    baseDir: dir
  });

  await handler({
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

  await ended;

  assert.equal(status, 200);
  assert.match(String(body), /x/);
});
