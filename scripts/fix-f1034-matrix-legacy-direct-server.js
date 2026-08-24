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

function findTestBounds(source, title) {
  const start = source.indexOf(`test('${title}'`);

  if (start < 0) {
    throw new Error(`No se encontró el test: ${title}`);
  }

  const next = source.indexOf('\ntest(', start + 5);

  return {
    start,
    end: next >= 0 ? next : source.length
  };
}

function buildReplacement(title) {
  return `test('${title}', () => {
  const fsLocal = require('fs');
  const pathLocal = require('path');

  const serverActual = fsLocal.readFileSync(
    pathLocal.resolve(__dirname, '../server.js'),
    'utf8'
  );

  assert.match(
    serverActual,
    /createMatrixRecalculationHandler/
  );

  assert.match(
    serverActual,
    /handleMatrixRecalculationRequest/
  );

  assert.doesNotMatch(
    serverActual,
    /if \\(ruta === '\\/api\\/matriz\\/recalcular' && metodo === 'POST'\\)/
  );
});
`;
}

function patchFile(target) {
  if (!fs.existsSync(target.file)) {
    throw new Error(`No existe: ${target.file}`);
  }

  let source = fs.readFileSync(target.file, 'utf8');

  const { start, end } = findTestBounds(
    source,
    target.title
  );

  source =
    source.slice(0, start) +
    buildReplacement(target.title) +
    source.slice(end);

  fs.writeFileSync(
    target.file,
    source,
    'utf8'
  );

  // Verificación posterior.
  const saved = fs.readFileSync(
    target.file,
    'utf8'
  );

  const bounds = findTestBounds(
    saved,
    target.title
  );

  const block = saved.slice(
    bounds.start,
    bounds.end
  );

  if (!block.includes("../server.js")) {
    throw new Error(
      `El test ${target.title} no quedó apuntando a ../server.js`
    );
  }

  if (!block.includes('serverActual')) {
    throw new Error(
      `El test ${target.title} no usa serverActual`
    );
  }

  console.log(
    `OK: ${target.title}`
  );
  console.log(
    '    lectura directa confirmada: ../server.js'
  );
}

try {
  for (const target of targets) {
    patchFile(target);
  }

  console.log('');
  console.log(
    'F10.34.4 aplicada correctamente.'
  );
} catch (error) {
  console.error('');
  console.error(
    'ERROR F10.34.4:',
    error.message
  );
  process.exit(1);
}
