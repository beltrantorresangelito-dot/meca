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
  const candidates = [
    /const\s+([A-Za-z_$][\w$]*)\s*=\s*fs\.readFileSync\([^;]*server\.js[^;]*\)/s,
    /let\s+([A-Za-z_$][\w$]*)\s*=\s*fs\.readFileSync\([^;]*server\.js[^;]*\)/s,
    /var\s+([A-Za-z_$][\w$]*)\s*=\s*fs\.readFileSync\([^;]*server\.js[^;]*\)/s
  ];

  for (const regex of candidates) {
    const match = source.match(regex);
    if (match) return match[1];
  }

  throw new Error(
    'No se pudo detectar la variable que contiene server.js'
  );
}

function replaceTest(source, title, serverVar) {
  const marker = `test('${title}'`;
  const start = source.indexOf(marker);

  if (start < 0) {
    throw new Error(`No se encontró el test: ${title}`);
  }

  const next = source.indexOf('\ntest(', start + 5);
  const end = next >= 0 ? next : source.length;

  const replacement = `test('${title}', () => {
  // F10.34.2:
  // Matrix Recalculation continúa aislado,
  // ahora mediante su módulo dedicado.
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

  return (
    source.slice(0, start) +
    replacement +
    source.slice(end)
  );
}

for (const target of targets) {
  if (!fs.existsSync(target.file)) {
    console.error(`No existe: ${target.file}`);
    process.exit(1);
  }

  const original = fs.readFileSync(
    target.file,
    'utf8'
  );

  const serverVar =
    detectServerVariable(original);

  const updated =
    replaceTest(
      original,
      target.title,
      serverVar
    );

  fs.writeFileSync(
    target.file,
    updated,
    'utf8'
  );

  console.log(
    `OK: ${target.title} [variable=${serverVar}]`
  );
}

console.log(
  'F10.34.2 aplicada: tests legacy corregidos sin tocar producción.'
);
