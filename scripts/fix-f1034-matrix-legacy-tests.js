const fs = require('fs');
const path = require('path');

const targets = [
  {
    file: path.resolve(
      process.cwd(),
      'tests',
      'matrix-safe-closure-server.f213.test.js'
    ),
    title: 'MATRIXSAFE-SERVER-003 recalcular permanece aislado'
  },
  {
    file: path.resolve(
      process.cwd(),
      'tests',
      'matrix-version-server.f212.test.js'
    ),
    title: 'VERSERVER-002 recalcular permanece aislado para fase posterior'
  }
];

function findTestEnd(source, start) {
  const next = source.indexOf('\ntest(', start + 5);
  return next >= 0 ? next : source.length;
}

function replaceTest(source, title) {
  const marker = `test('${title}'`;
  const start = source.indexOf(marker);

  if (start < 0) {
    throw new Error(
      `No se encontró el test: ${title}`
    );
  }

  const end = findTestEnd(source, start);

  const replacement = `test('${title}', () => {
  // F10.34.1:
  // Matrix Recalculation continúa aislado,
  // pero desde F10.34 vive en su propio módulo.
  assert.match(
    source,
    /createMatrixRecalculationHandler/
  );

  assert.match(
    source,
    /handleMatrixRecalculationRequest/
  );

  assert.doesNotMatch(
    source,
    /if \\(ruta === '\\/api\\/matriz\\/recalcular' && metodo === 'POST'\\)/
  );
});
`;

  return (
    source.slice(0, start) +
    replacement +
    source.slice(end)
  );
}

for (const target of targets) {
  if (!fs.existsSync(target.file)) {
    console.error(
      `No existe: ${target.file}`
    );
    process.exit(1);
  }

  const original = fs.readFileSync(
    target.file,
    'utf8'
  );

  const updated = replaceTest(
    original,
    target.title
  );

  fs.writeFileSync(
    target.file,
    updated,
    'utf8'
  );

  console.log(
    `OK: ${target.title}`
  );
}

console.log(
  'F10.34.1 aplicada: solo se actualizaron tests legacy.'
);
