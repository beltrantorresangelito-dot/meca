const fs = require('node:fs');
const path = require('node:path');

const testPath = path.resolve(
  __dirname,
  '../tests/evaluation-real-save-context.f11551.test.js'
);

if (!fs.existsSync(testPath)) {
  console.log('[F11.5.5.2] Test F11551 no existe; se omite actualización.');
  process.exit(0);
}

let source = fs.readFileSync(testPath, 'utf8');

source = source.replace(
  /test\('F11551-003 payload enviado es el enriquecido'[\s\S]*?\n\}\);/m,
`test('F11551-003 payload enviado es el enriquecido', () => {
  assert.match(
    source,
    /API\\.guardarEvaluacion\\(\\s*[A-Za-z_$][\\w$]*ConContexto\\s*\\)/
  );
});`
);

fs.writeFileSync(testPath, source, 'utf8');
console.log('[F11.5.5.2] OK - test F11551 alineado al wrapper API real.');
