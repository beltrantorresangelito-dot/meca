const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const testPath = path.join(
  projectRoot,
  'tests',
  'backend-domain-server-integration.f22.test.js'
);

if (!fs.existsSync(testPath)) {
  console.error('[F10.56.2] No se encontró:', testPath);
  process.exit(1);
}

let content = fs.readFileSync(testPath, 'utf8');

const marker = "test('DOMAPI-SERVER-001";
const start = content.indexOf(marker);

if (start < 0) {
  console.error('[F10.56.2] No se encontró DOMAPI-SERVER-001');
  process.exit(1);
}

const nextTest = content.indexOf(
  '\ntest(',
  start + marker.length
);

const end = nextTest >= 0 ? nextTest : content.length;

// Detecta la variable usada por el archivo para contener server.js.
// Priorizamos "server", luego "source".
let serverVar = null;

if (
  /\bconst\s+server\s*=\s*fs\.readFileSync/.test(content) ||
  /\blet\s+server\s*=\s*fs\.readFileSync/.test(content)
) {
  serverVar = 'server';
} else if (
  /\bconst\s+source\s*=\s*fs\.readFileSync/.test(content) ||
  /\blet\s+source\s*=\s*fs\.readFileSync/.test(content)
) {
  serverVar = 'source';
}

if (!serverVar) {
  console.error(
    '[F10.56.2] No se pudo detectar la variable que contiene server.js'
  );
  process.exit(1);
}

const replacement = `test('DOMAPI-SERVER-001 server ya no depende de registerDomainRoutes legacy',()=>{
  assert.doesNotMatch(
    ${serverVar},
    /registerDomainRoutes/
  );

  assert.doesNotMatch(
    ${serverVar},
    /const routes\\s*=\\s*\\{\\}/
  );

  assert.doesNotMatch(
    ${serverVar},
    /routes\\[ruta\\]/
  );

  assert.match(
    ${serverVar},
    /handleUsersRequest/
  );

  assert.match(
    ${serverVar},
    /handleRolesRequest/
  );

  assert.match(
    ${serverVar},
    /handleMatrixReadRequest/
  );

  assert.match(
    ${serverVar},
    /handleMatrixWriteRequest/
  );
});
`;

content =
  content.slice(0, start) +
  replacement +
  content.slice(end);

fs.writeFileSync(testPath, content, 'utf8');

console.log(
  `[F10.56.2] DOMAPI-SERVER-001 corregido usando variable: ${serverVar}`
);
