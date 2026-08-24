const fs = require('node:fs');
const path = require('node:path');

const projectRoot = path.resolve(__dirname, '..');
const testPath = path.join(
  projectRoot,
  'tests',
  'backend-domain-server-integration.f22.test.js'
);

if (!fs.existsSync(testPath)) {
  console.error(
    '[F10.56.1] No se encontró:',
    testPath
  );
  process.exit(1);
}

let source = fs.readFileSync(
  testPath,
  'utf8'
);

const marker =
  "test('DOMAPI-SERVER-001";

const start =
  source.indexOf(marker);

if (start < 0) {
  console.error(
    '[F10.56.1] No se encontró DOMAPI-SERVER-001'
  );
  process.exit(1);
}

const nextTest =
  source.indexOf(
    '\ntest(',
    start + marker.length
  );

const end =
  nextTest >= 0
    ? nextTest
    : source.length;

const replacement = `test('DOMAPI-SERVER-001 server ya no depende de registerDomainRoutes legacy',()=>{
  assert.doesNotMatch(
    source,
    /registerDomainRoutes/
  );

  assert.doesNotMatch(
    source,
    /const routes\\s*=\\s*\\{\\}/
  );

  assert.doesNotMatch(
    source,
    /routes\\[ruta\\]/
  );

  assert.match(
    source,
    /handleUsersRequest/
  );

  assert.match(
    source,
    /handleRolesRequest/
  );

  assert.match(
    source,
    /handleMatrixReadRequest/
  );

  assert.match(
    source,
    /handleMatrixWriteRequest/
  );
});
`;

source =
  source.slice(0, start) +
  replacement +
  source.slice(end);

fs.writeFileSync(
  testPath,
  source,
  'utf8'
);

console.log(
  '[F10.56.1] DOMAPI-SERVER-001 actualizado correctamente.'
);
