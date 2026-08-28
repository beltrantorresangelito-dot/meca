const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');

const testPath = path.join(
  ROOT,
  'tests',
  'http-static-views.module.f1051.test.js'
);

if (!fs.existsSync(testPath)) {
  console.error(
    '[F11.5.5.1] No existe http-static-views.module.f1051.test.js'
  );
  process.exit(1);
}

let source = fs.readFileSync(
  testPath,
  'utf8'
);

const oldBlock = `test('HTTPSHELLMOD-005 auditor aliases funcionan', async () => {
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
});`;

const newBlock = `test('HTTPSHELLMOD-005 auditor aliases funcionan', async () => {
  const dir = fixture();

  for (const ruta of ['/auditor', '/auditor.html']) {
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
});`;

if (source.includes(oldBlock)) {
  source = source.replace(
    oldBlock,
    newBlock
  );
} else if (source.includes(newBlock)) {
  console.log(
    '[F11.5.5.1] El test Auditor ya estaba corregido.'
  );
} else {
  console.error(
    '[F11.5.5.1] No se encontró el bloque esperado de HTTPSHELLMOD-005.'
  );
  process.exit(1);
}

if (
  /HTTPSHELLMOD-005[\s\S]*setTimeout\(r => setTimeout\(r, 20\)\)/.test(source)
) {
  console.error(
    '[F11.5.5.1] ERROR: Auditor sigue usando timeout.'
  );
  process.exit(1);
}

if (
  !/HTTPSHELLMOD-005[\s\S]*await ended;[\s\S]*assert\.equal\(status, 200\)/.test(source)
) {
  console.error(
    '[F11.5.5.1] ERROR: no quedó espera determinista.'
  );
  process.exit(1);
}

fs.writeFileSync(
  testPath,
  source,
  'utf8'
);

console.log(
  '[F11.5.5.1] OK - race de Auditor eliminada.'
);
console.log(
  '[F11.5.5.1] OK - producción NO modificada.'
);
