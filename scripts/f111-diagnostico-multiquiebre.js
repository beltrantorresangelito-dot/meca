const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');

const EXCLUDED_DIRS = new Set([
  '.git',
  'node_modules',
  'coverage',
  'dist',
  'build',
  '.next'
]);

const EXCLUDED_NAME_PATTERNS = [
  /\.bak$/i,
  /\.backup$/i,
  /\.old$/i,
  /\.tmp$/i
];

const INCLUDED_EXTENSIONS = new Set([
  '.js', '.cjs', '.mjs',
  '.json', '.sql',
  '.html', '.css',
  '.py'
]);

const findings = [];
const positives = [];

const rules = [
  {
    id: 'F11-HARD-001',
    severity: 'HIGH',
    title: 'Código de quiebre COBRANZAS hardcodeado',
    regex: /\bCOBRANZAS\b/i
  },
  {
    id: 'F11-HARD-002',
    severity: 'HIGH',
    title: 'Campaña Temprana hardcodeada',
    regex: /\bTEMPRAN(?:A|AS)\b/i
  },
  {
    id: 'F11-HARD-003',
    severity: 'HIGH',
    title: 'Campaña Super Temprana hardcodeada',
    regex: /SUPER[\s_-]*TEMPRAN/i
  },
  {
    id: 'F11-HARD-004',
    severity: 'MEDIUM',
    title: 'Campaña Fraccionamiento hardcodeada',
    regex: /\bFRACCIONAMIENTO\b/i
  },
  {
    id: 'F11-HARD-005',
    severity: 'HIGH',
    title: 'quiebre_id fijado a 1',
    regex: /\bquiebre_id\s*[:=]\s*['"]?1['"]?/i
  },
  {
    id: 'F11-HARD-006',
    severity: 'HIGH',
    title: 'campana_id fijado a 1',
    regex: /\bcampana_id\s*[:=]\s*['"]?1['"]?/i
  },
  {
    id: 'F11-HARD-007',
    severity: 'MEDIUM',
    title: 'campana_codigo T fijado directamente',
    regex: /\bcampana_codigo\s*[:=]\s*['"]T['"]/i
  },
  {
    id: 'F11-HARD-008',
    severity: 'HIGH',
    title: 'Referencia explícita a matriz legacy',
    regex: /legacy.{0,30}matriz|matriz.{0,30}legacy/i
  },
  {
    id: 'F11-HARD-009',
    severity: 'MEDIUM',
    title: 'Nombre de matriz de evaluación acoplado',
    regex: /\bmatriz_evaluacion\b/i
  }
];

const positiveRules = [
  {
    id: 'F11-POS-001',
    title: 'Uso de quiebre_id',
    regex: /\bquiebre_id\b/i
  },
  {
    id: 'F11-POS-002',
    title: 'Uso de campana_id',
    regex: /\bcampana_id\b/i
  },
  {
    id: 'F11-POS-003',
    title: 'Resolver contexto de evaluación',
    regex: /\bresolver_contexto_evaluacion\b/i
  },
  {
    id: 'F11-POS-004',
    title: 'Endpoint/API de quiebres',
    regex: /\/api\/domain\/quiebres|\/api\/quiebres/i
  },
  {
    id: 'F11-POS-005',
    title: 'Endpoint/API de campañas',
    regex: /\/api\/domain\/campanas|\/api\/campanas/i
  },
  {
    id: 'F11-POS-006',
    title: 'Concepto de versión de matriz',
    regex: /matriz.{0,20}version|version.{0,20}matriz/i
  }
];

function shouldSkip(filePath) {
  const rel = path.relative(ROOT, filePath);
  const parts = rel.split(path.sep);

  if (parts.some(p => EXCLUDED_DIRS.has(p))) return true;
  if (parts.includes('tests')) return true;

  const name = path.basename(filePath);

  return EXCLUDED_NAME_PATTERNS.some(r => r.test(name));
}

function walk(dir, files = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      if (!EXCLUDED_DIRS.has(entry.name)) {
        walk(full, files);
      }
      continue;
    }

    if (!entry.isFile()) continue;
    if (shouldSkip(full)) continue;
    if (!INCLUDED_EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      continue;
    }

    files.push(full);
  }

  return files;
}

function scanFile(filePath) {
  let text;

  try {
    text = fs.readFileSync(filePath, 'utf8');
  } catch {
    return;
  }

  const rel = path.relative(ROOT, filePath);
  const lines = text.split(/\r?\n/);

  lines.forEach((line, index) => {
    for (const rule of rules) {
      if (rule.regex.test(line)) {
        findings.push({
          id: rule.id,
          severity: rule.severity,
          title: rule.title,
          file: rel,
          line: index + 1,
          sample: line.trim().slice(0, 220)
        });
      }
    }

    for (const rule of positiveRules) {
      if (rule.regex.test(line)) {
        positives.push({
          id: rule.id,
          title: rule.title,
          file: rel,
          line: index + 1
        });
      }
    }
  });
}

const files = walk(ROOT);
files.forEach(scanFile);

const uniquePositive = new Map();

for (const item of positives) {
  if (!uniquePositive.has(item.id)) {
    uniquePositive.set(item.id, item);
  }
}

const severityRank = {
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3
};

findings.sort((a, b) => {
  const sev =
    severityRank[a.severity] -
    severityRank[b.severity];

  if (sev !== 0) return sev;

  return (
    a.file.localeCompare(b.file) ||
    a.line - b.line
  );
});

const summary = {
  generated_at: new Date().toISOString(),
  project_root: ROOT,
  files_scanned: files.length,
  findings_total: findings.length,
  high: findings.filter(x => x.severity === 'HIGH').length,
  medium: findings.filter(x => x.severity === 'MEDIUM').length,
  positive_signals: uniquePositive.size
};

const jsonPath = path.join(
  ROOT,
  'F11.1_DIAGNOSTICO_MULTICOMPAÑA.json'
);

fs.writeFileSync(
  jsonPath,
  JSON.stringify(
    {
      summary,
      positive_signals: [...uniquePositive.values()],
      findings
    },
    null,
    2
  ),
  'utf8'
);

const report = [];

report.push('======================================================');
report.push(' MECA F11.1 - DIAGNÓSTICO MULTI-QUIEBRE / MULTI-CAMPAÑA');
report.push('======================================================');
report.push('');
report.push(`Archivos analizados : ${summary.files_scanned}`);
report.push(`Hallazgos totales   : ${summary.findings_total}`);
report.push(`Alta prioridad      : ${summary.high}`);
report.push(`Prioridad media     : ${summary.medium}`);
report.push(`Señales positivas   : ${summary.positive_signals}`);
report.push('');

report.push('SEÑALES DE PARAMETRIZACIÓN ENCONTRADAS');
report.push('--------------------------------------');

if (!uniquePositive.size) {
  report.push('- No detectadas por búsqueda estática.');
} else {
  for (const item of uniquePositive.values()) {
    report.push(
      `- ${item.id}: ${item.title} -> ${item.file}:${item.line}`
    );
  }
}

report.push('');
report.push('HALLAZGOS A REVISAR');
report.push('-------------------');

if (!findings.length) {
  report.push(
    '- No se detectaron hardcodes con las reglas actuales.'
  );
} else {
  for (const item of findings) {
    report.push('');
    report.push(
      `[${item.severity}] ${item.id} - ${item.title}`
    );
    report.push(
      `  ${item.file}:${item.line}`
    );
    report.push(
      `  ${item.sample}`
    );
  }
}

report.push('');
report.push('INTERPRETACIÓN');
report.push('--------------');
report.push(
  'HIGH no significa automáticamente bug: requiere revisión funcional.'
);
report.push(
  'Los textos de UI o datos semilla pueden ser legítimos; un valor usado'
);
report.push(
  'para decidir comportamiento sí representa acoplamiento a corregir.'
);
report.push('');
report.push(
  'No modificar nada hasta clasificar cada hallazgo como:'
);
report.push(
  'DATO / UI / SEED / TEST / LEGACY / LOGICA_ACOPLADA.'
);

const txtPath = path.join(
  ROOT,
  'F11.1_DIAGNOSTICO_MULTICOMPAÑA.txt'
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
