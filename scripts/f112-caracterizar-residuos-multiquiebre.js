const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');

const TARGETS = [
  {
    id: 'F112-SUP-CATALOG',
    file: path.join(ROOT, 'public', 'js', 'supervisor.js'),
    patterns: [
      /{ codigo:\s*'T',\s*descripcion:\s*'Temprana' }/,
      /{ codigo:\s*'ST',\s*descripcion:\s*'Super Temprana' }/,
      /{ codigo:\s*'F',\s*descripcion:\s*'Fraccionamiento' }/
    ],
    radius: 35
  },
  {
    id: 'F112-AUD-RULE',
    file: path.join(ROOT, 'public', 'js', 'auditor.js'),
    patterns: [
      /Regla oficial vigente de Cobranzas/i
    ],
    radius: 45
  },
  {
    id: 'F112-SUP-BRANDING',
    file: path.join(ROOT, 'public', 'js', 'supervisor.js'),
    patterns: [
      /Auditoría Calidad Cobranzas/i,
      /Mesa Calidad Cobranzas/i,
      /Movistar Perú - Auditoría Calidad Cobranzas/i
    ],
    radius: 20
  },
  {
    id: 'F112-VIEW-PLACEHOLDER',
    file: path.join(ROOT, 'views', 'supervisor', 'dashboard.html'),
    patterns: [
      /Temprana,\s*Super Temprana,\s*Fraccionamiento/i
    ],
    radius: 12
  }
];

function excerpt(lines, lineIndex, radius) {
  const start = Math.max(0, lineIndex - radius);
  const end = Math.min(lines.length, lineIndex + radius + 1);

  return {
    start_line: start + 1,
    end_line: end,
    text: lines
      .slice(start, end)
      .map((line, i) => {
        const n = String(start + i + 1).padStart(6, ' ');
        return `${n}: ${line}`;
      })
      .join('\n')
  };
}

const results = [];

for (const target of TARGETS) {
  if (!fs.existsSync(target.file)) {
    results.push({
      id: target.id,
      file: path.relative(ROOT, target.file),
      error: 'FILE_NOT_FOUND'
    });
    continue;
  }

  const text = fs.readFileSync(target.file, 'utf8');
  const lines = text.split(/\r?\n/);
  const matches = [];

  target.patterns.forEach((pattern, patternIndex) => {
    lines.forEach((line, lineIndex) => {
      if (pattern.test(line)) {
        matches.push({
          pattern_index: patternIndex,
          line: lineIndex + 1,
          sample: line.trim(),
          excerpt: excerpt(lines, lineIndex, target.radius)
        });
      }
    });
  });

  results.push({
    id: target.id,
    file: path.relative(ROOT, target.file),
    matches
  });
}

const output = {
  generated_at: new Date().toISOString(),
  results
};

const jsonPath = path.join(
  ROOT,
  'F11.2_RESIDUOS_MULTICOMPAÑA.json'
);

fs.writeFileSync(
  jsonPath,
  JSON.stringify(output, null, 2),
  'utf8'
);

const report = [];

report.push('======================================================');
report.push(' MECA F11.2 - CARACTERIZACIÓN RESIDUOS MULTI-QUIEBRE');
report.push('======================================================');
report.push('');

for (const result of results) {
  report.push(`[${result.id}] ${result.file}`);

  if (result.error) {
    report.push(`ERROR: ${result.error}`);
    report.push('');
    continue;
  }

  report.push(`Coincidencias: ${result.matches.length}`);

  for (const match of result.matches) {
    report.push('');
    report.push(`Línea ${match.line}: ${match.sample}`);
    report.push('--- CONTEXTO ---');
    report.push(match.excerpt.text);
    report.push('--- FIN CONTEXTO ---');
  }

  report.push('');
}

report.push('CLASIFICACIÓN MANUAL ESPERADA');
report.push('-----------------------------');
report.push('1. SUP-CATALOG');
report.push('   Determinar si T/ST/F alimenta lógica real o solo fallback/demo.');
report.push('   Buscar llamadas API cercanas, renderizado y persistencia.');
report.push('');
report.push('2. AUD-RULE');
report.push('   Determinar si la regla Cobranzas cambia cálculos o solo documenta.');
report.push('');
report.push('3. SUP-BRANDING');
report.push('   Determinar si los textos son exclusivamente presentación/exportación.');
report.push('');
report.push('4. VIEW-PLACEHOLDER');
report.push('   Confirmar si es solo ayuda visual.');
report.push('');

const txtPath = path.join(
  ROOT,
  'F11.2_RESIDUOS_MULTICOMPAÑA.txt'
);

fs.writeFileSync(
  txtPath,
  report.join('\n'),
  'utf8'
);

console.log(report.join('\n'));
console.log('');
console.log('Generados:');
console.log(path.basename(txtPath));
console.log(path.basename(jsonPath));
