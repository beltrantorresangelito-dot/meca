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

function detectServerVariable(source) {
  const regex =
    /const\s+([A-Za-z_$][\w$]*)\s*=\s*fs\.readFileSync\([\s\S]*?server\.js[\s\S]*?\);/;

  const match = source.match(regex);

  if (!match) {
    throw new Error(
      'No se pudo detectar la variable que contiene server.js'
    );
  }

  return match[1];
}

function getTestBounds(source, title) {
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

function fixFile(target) {
  if (!fs.existsSync(target.file)) {
    throw new Error(`No existe: ${target.file}`);
  }

  let source = fs.readFileSync(target.file, 'utf8');

  const serverVar = detectServerVariable(source);
  const { start, end } = getTestBounds(
    source,
    target.title
  );

  const replacement = `test('${target.title}', () => {
  assert.match(
    ${serverVar},
    /createMatrixRecalculationHandler/
  );

  assert.match(
    ${serverVar},
    /handleMatrixRecalculationRequest/
  );

  assert.doesNotMatch(
    ${serverVar},
    /if \\(ruta === '\\/api\\/matriz\\/recalcular' && metodo === 'POST'\\)/
  );
});
`;

  source =
    source.slice(0, start) +
    replacement +
    source.slice(end);

  fs.writeFileSync(
    target.file,
    source,
    'utf8'
  );

  const after = fs.readFileSync(
    target.file,
    'utf8'
  );

  const boundsAfter = getTestBounds(
    after,
    target.title
  );

  const blockAfter = after.slice(
    boundsAfter.start,
    boundsAfter.end
  );

  if (/\bsource\b/.test(blockAfter)) {
    throw new Error(
      `Persistió la variable source en ${target.title}`
    );
  }

  if (!blockAfter.includes(serverVar)) {
    throw new Error(
      `No se insertó ${serverVar} en ${target.title}`
    );
  }

  console.log(
    `OK: ${target.title}`
  );
  console.log(
    `    variable real detectada: ${serverVar}`
  );
  console.log(
    '    verificación: source eliminado del test'
  );
}

try {
  for (const target of targets) {
    fixFile(target);
  }

  console.log('');
  console.log(
    'F10.34.3 aplicada y verificada correctamente.'
  );
} catch (error) {
  console.error('');
  console.error(
    'ERROR F10.34.3:',
    error.message
  );
  process.exit(1);
}
