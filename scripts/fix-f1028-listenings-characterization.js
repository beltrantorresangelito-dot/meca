const fs = require('fs');
const path = require('path');

const target = path.resolve(
  process.cwd(),
  'tests',
  'escuchas.characterization.f52.test.js'
);

if (!fs.existsSync(target)) {
  console.error(
    'No existe tests/escuchas.characterization.f52.test.js'
  );
  process.exit(1);
}

const original = fs.readFileSync(target, 'utf8');

const title =
  'LISTCHAR-F55-006 audio proxy no fue absorbido';

const start = original.indexOf(`test('${title}'`);

if (start < 0) {
  console.error(
    `No se encontró el test legacy: ${title}`
  );
  process.exit(1);
}

const nextTest = original.indexOf('\ntest(', start + 5);
const end = nextTest >= 0 ? nextTest : original.length;

const replacement = `test('${title}', () => {
  // F10.28.1:
  // Audio Proxy continúa separado del dominio Listenings,
  // pero desde F10.28 ya no debe permanecer inline en server.js.
  const fsLocal = require('fs');
  const pathLocal = require('path');

  const serverActual = fsLocal.readFileSync(
    pathLocal.resolve(__dirname, '../server.js'),
    'utf8'
  );

  const listeningsRoutes = fsLocal.readFileSync(
    pathLocal.resolve(
      __dirname,
      '../src/modules/listenings/listenings.routes.js'
    ),
    'utf8'
  );

  const audioRoutes = fsLocal.readFileSync(
    pathLocal.resolve(
      __dirname,
      '../src/modules/audio-proxy/audio-proxy.routes.js'
    ),
    'utf8'
  );

  // server.js debe delegar Audio Proxy a su módulo independiente.
  assert.match(
    serverActual,
    /createAudioProxyHandler/
  );

  assert.match(
    serverActual,
    /handleAudioProxyRequest/
  );

  // Listenings no debe absorber las rutas del proxy.
  assert.doesNotMatch(
    listeningsRoutes,
    /\\/api\\/audio\\/reproducir/
  );

  assert.doesNotMatch(
    listeningsRoutes,
    /\\/api\\/audio\\/verificar/
  );

  // Las rutas siguen existiendo, ahora en AudioProxyRoutes.
  assert.match(
    audioRoutes,
    /\\/api\\/audio\\/reproducir\\//
  );

  assert.match(
    audioRoutes,
    /\\/api\\/audio\\/verificar\\//
  );

  // No deben volver a quedar handlers inline en server.js.
  assert.doesNotMatch(
    serverActual,
    /if \\(ruta\\.startsWith\\('\\/api\\/audio\\/reproducir\\/'\\)/
  );

  assert.doesNotMatch(
    serverActual,
    /if \\(ruta\\.startsWith\\('\\/api\\/audio\\/verificar\\/'\\)/
  );
});
`;

const updated =
  original.slice(0, start) +
  replacement +
  (nextTest >= 0 ? original.slice(nextTest) : '\n');

fs.writeFileSync(target, updated, 'utf8');

console.log(
  'OK: LISTCHAR-F55-006 actualizado para la arquitectura F10.28.'
);
