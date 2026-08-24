const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const testPath = path.join(
  projectRoot,
  'tests',
  'backend-domain-server-integration.f22.test.js'
);

if (!fs.existsSync(testPath)) {
  console.error('[F10.56.3] No se encontró:', testPath);
  process.exit(1);
}

let content = fs.readFileSync(testPath, 'utf8');

const marker = "test('DOMAPI-SERVER-001";
const start = content.indexOf(marker);

if (start < 0) {
  console.error('[F10.56.3] No se encontró DOMAPI-SERVER-001');
  process.exit(1);
}

const nextTest = content.indexOf(
  '\ntest(',
  start + marker.length
);

const end = nextTest >= 0 ? nextTest : content.length;

const replacement = `test('DOMAPI-SERVER-001 server ya no depende de registerDomainRoutes legacy',()=>{
  assert.doesNotMatch(
    server,
    /registerDomainRoutes/
  );

  assert.doesNotMatch(
    server,
    /const routes\\s*=\\s*\\{\\}/
  );

  assert.doesNotMatch(
    server,
    /routes\\[ruta\\]/
  );

  assert.match(
    server,
    /handleUsersRequest/
  );

  assert.match(
    server,
    /handleRolesRequest/
  );

  assert.match(
    server,
    /handleMatrixReadRequest/
  );

  assert.match(
    server,
    /handleMatrixWriteRequest/
  );
});
`;

content =
  content.slice(0, start) +
  replacement +
  content.slice(end);

fs.writeFileSync(testPath, content, 'utf8');

// Verificación inmediata del bloque recién escrito.
const updated = fs.readFileSync(testPath, 'utf8');
const verifyStart = updated.indexOf(marker);
const verifyNext = updated.indexOf(
  '\ntest(',
  verifyStart + marker.length
);
const verifyEnd = verifyNext >= 0 ? verifyNext : updated.length;
const block = updated.slice(verifyStart, verifyEnd);

if (/\bsource\b/.test(block)) {
  console.error(
    '[F10.56.3] ERROR: todavía existe "source" dentro de DOMAPI-SERVER-001'
  );
  console.error(block);
  process.exit(1);
}

if (!/\bserver\b/.test(block)) {
  console.error(
    '[F10.56.3] ERROR: DOMAPI-SERVER-001 no está usando "server"'
  );
  process.exit(1);
}

console.log(
  '[F10.56.3] DOMAPI-SERVER-001 corregido definitivamente usando "server".'
);
console.log(
  '[F10.56.3] Verificación OK: no queda "source" dentro del test.'
);
