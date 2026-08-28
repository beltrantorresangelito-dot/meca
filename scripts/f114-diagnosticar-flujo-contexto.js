const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');

const TARGET_FILES = [
  'public/js/auditor.js',
  'public/js/supervisor.js',
  'src/modules/domain/domain.routes.js',
  'src/modules/domain/domain.service.js',
  'src/modules/domain/domain.repository.js',
  'src/modules/matrix/matrix.routes.js',
  'src/modules/matrix/matrix.service.js',
  'src/modules/matrix/matrix.repository.js',
  'server.js'
];

const SIGNALS = [
  {
    id: 'CTX-001',
    label: 'API quiebres',
    regex: /\/api\/domain\/quiebres|\/api\/quiebres/i
  },
  {
    id: 'CTX-002',
    label: 'API campañas',
    regex: /\/api\/domain\/campanas|\/api\/campanas/i
  },
  {
    id: 'CTX-003',
    label: 'API contexto',
    regex: /\/api\/domain\/contexto|\/api\/contexto/i
  },
  {
    id: 'CTX-004',
    label: 'quiebre_id',
    regex: /\bquiebre_id\b/i
  },
  {
    id: 'CTX-005',
    label: 'campana_id',
    regex: /\bcampana_id\b/i
  },
  {
    id: 'CTX-006',
    label: 'quiebre_codigo',
    regex: /\bquiebre_codigo\b/i
  },
  {
    id: 'CTX-007',
    label: 'campana_codigo',
    regex: /\bcampana_codigo\b/i
  },
  {
    id: 'CTX-008',
    label: 'resolver_contexto_evaluacion',
    regex: /\bresolver_contexto_evaluacion\b/i
  },
  {
    id: 'CTX-009',
    label: 'matriz_id',
    regex: /\bmatriz_id\b/i
  },
  {
    id: 'CTX-010',
    label: 'matriz_version_id',
    regex: /\bmatriz_version_id\b/i
  },
  {
    id: 'CTX-011',
    label: 'vigencia matriz',
    regex: /\bvigencia\b|vigente|fecha_desde|fecha_hasta/i
  },
  {
    id: 'CTX-012',
    label: 'contexto persistido frontend',
    regex: /contexto.*(actual|seleccionado)|campana.*seleccionad|quiebre.*seleccionad/i
  }
];

function excerpt(lines, index, radius = 15) {
  const start = Math.max(0, index - radius);
  const end = Math.min(lines.length, index + radius + 1);

  return {
    start_line: start + 1,
    end_line: end,
    text: lines.slice(start, end)
      .map((line, i) => {
        const n = String(start + i + 1).padStart(6, ' ');
        return `${n}: ${line}`;
      })
      .join('\n')
  };
}

function inspectFile(rel) {
  const full = path.join(ROOT, rel);

  if (!fs.existsSync(full)) {
    return {
      file: rel,
      exists: false,
      signals: []
    };
  }

  const text = fs.readFileSync(full, 'utf8');
  const lines = text.split(/\r?\n/);
  const signals = [];

  for (const signal of SIGNALS) {
    for (let i = 0; i < lines.length; i++) {
      if (signal.regex.test(lines[i])) {
        signals.push({
          id: signal.id,
          label: signal.label,
          line: i + 1,
          sample: lines[i].trim().slice(0, 240),
          excerpt: excerpt(lines, i)
        });
      }
    }
  }

  return {
    file: rel,
    exists: true,
    signals
  };
}

const results = TARGET_FILES.map(inspectFile);

const report = [];
report.push('===========================================================');
report.push(' MECA F11.4 - FLUJO QUIEBRE -> CAMPAÑA -> MATRIZ');
report.push('===========================================================');
report.push('');

for (const result of results) {
  report.push(`[ARCHIVO] ${result.file}`);
  report.push(`Existe: ${result.exists ? 'SI' : 'NO'}`);

  if (!result.exists) {
    report.push('');
    continue;
  }

  report.push(`Señales detectadas: ${result.signals.length}`);

  for (const signal of result.signals) {
    report.push('');
    report.push(
      `${signal.id} | ${signal.label} | línea ${signal.line}`
    );
    report.push(signal.sample);
    report.push('--- CONTEXTO ---');
    report.push(signal.excerpt.text);
    report.push('--- FIN CONTEXTO ---');
  }

  report.push('');
}

report.push('===========================================================');
report.push(' CHECKLIST DE VALIDACIÓN MANUAL');
report.push('===========================================================');
report.push('');
report.push('A. SUPERVISOR');
report.push('1. ¿Carga quiebres desde API?');
report.push('2. ¿Al elegir quiebre filtra campañas?');
report.push('3. ¿Guarda quiebre_id/campana_id reales?');
report.push('4. ¿La matriz se resuelve por contexto y no por ID fijo?');
report.push('');
report.push('B. AUDITOR');
report.push('1. ¿Obtiene contexto de evaluación?');
report.push('2. ¿Usa campana_id/quiebre_id de la escucha/evaluación?');
report.push('3. ¿Solicita estructura de matriz vigente para ese contexto?');
report.push('4. ¿Evita asumir COBRANZAS/T/ST/F?');
report.push('');
report.push('C. BACKEND');
report.push('1. ¿Existe /api/domain/contexto?');
report.push('2. ¿resolver_contexto_evaluacion determina la matriz vigente?');
report.push('3. ¿La vigencia se resuelve por fecha?');
report.push('4. ¿Dos campañas pueden compartir matriz sin duplicarla?');
report.push('');
report.push('CLASIFICACIÓN ESPERADA');
report.push('- OK_PARAMETRIZADO');
report.push('- PARCIAL');
report.push('- ACOPLADO');
report.push('- NO_ENCONTRADO');
report.push('');

const txtPath = path.join(
  ROOT,
  'F11.4_FLUJO_CONTEXTO_MULTQUIEBRE.txt'
);

const jsonPath = path.join(
  ROOT,
  'F11.4_FLUJO_CONTEXTO_MULTQUIEBRE.json'
);

fs.writeFileSync(
  txtPath,
  report.join('\n'),
  'utf8'
);

fs.writeFileSync(
  jsonPath,
  JSON.stringify(
    {
      generated_at: new Date().toISOString(),
      targets: results
    },
    null,
    2
  ),
  'utf8'
);

console.log(report.join('\n'));
console.log('');
console.log('Generados:');
console.log(path.basename(txtPath));
console.log(path.basename(jsonPath));
