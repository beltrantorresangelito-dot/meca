const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const testPath = path.join(
  ROOT,
  'tests',
  'http-static-views.module.f1051.test.js'
);

if (!fs.existsSync(testPath)) {
  console.error('[F11.5.5.4B] No existe http-static-views.module.f1051.test.js');
  process.exit(1);
}

let source = fs.readFileSync(testPath, 'utf8');

const start = source.indexOf(
  "test('HTTPSHELLMOD-004 login devuelve vista'"
);

const end = source.indexOf(
  "test('HTTPSHELLMOD-005 auditor aliases funcionan'",
  start
);

if (start < 0 || end < 0) {
  console.error(
    '[F11.5.5.4B] No se encontró el bloque HTTPSHELLMOD-004.'
  );
  process.exit(1);
}

const currentBlock = source.slice(start, end);

const newBlock = `test('HTTPSHELLMOD-004 login devuelve vista', async () => {
  const dir = fixture();

  let status;
  let resolveEnded;

  const ended = new Promise(resolve => {
    resolveEnded = resolve;
  });

  const handler = createHttpStaticViewsHandler({
    baseDir: dir
  });

  await handler({
    ruta: '/login',
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
});

`;

source =
  source.slice(0, start) +
  newBlock +
  source.slice(end);

// Guardrails.
const updatedStart = source.indexOf(
  "test('HTTPSHELLMOD-004 login devuelve vista'"
);

const updatedEnd = source.indexOf(
  "test('HTTPSHELLMOD-005 auditor aliases funcionan'",
  updatedStart
);

const block = source.slice(
  updatedStart,
  updatedEnd
);

if (/setTimeout/.test(block)) {
  console.error(
    '[F11.5.5.4B] ERROR: login sigue usando timeout arbitrario.'
  );
  process.exit(1);
}

if (!/await ended/.test(block)) {
  console.error(
    '[F11.5.5.4B] ERROR: login no espera respuesta.end().'
  );
  process.exit(1);
}

if (!/assert\.equal\(status, 200\)/.test(block)) {
  console.error(
    '[F11.5.5.4B] ERROR: falta assert de status 200.'
  );
  process.exit(1);
}

fs.writeFileSync(
  testPath,
  source,
  'utf8'
);

console.log(
  '[F11.5.5.4B] OK - race de login eliminada.'
);
console.log(
  '[F11.5.5.4B] OK - producción NO modificada.'
);
