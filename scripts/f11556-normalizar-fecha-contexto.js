const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const auditorPath = path.join(ROOT, 'public', 'js', 'auditor.js');

if (!fs.existsSync(auditorPath)) {
  console.error('[F11.5.5.6] No existe auditor.js');
  process.exit(1);
}

let source = fs.readFileSync(auditorPath, 'utf8');

if (!/async function resolverContextoAuditoria\s*\(/.test(source)) {
  console.error('[F11.5.5.6] Falta resolverContextoAuditoria.');
  process.exit(1);
}

// ------------------------------------------------------
// 1. Helper para convertir SOLO la fecha usada por contexto.
// ------------------------------------------------------
if (!/function normalizarFechaParaContexto\s*\(/.test(source)) {
  const helper = `
function normalizarFechaParaContexto(
    valor
) {
    if (
        valor === null ||
        valor === undefined ||
        valor === ''
    ) {
        return null;
    }

    if (valor instanceof Date) {
        if (Number.isNaN(valor.getTime())) {
            return null;
        }

        const y = valor.getFullYear();
        const m = String(
            valor.getMonth() + 1
        ).padStart(2, '0');
        const d = String(
            valor.getDate()
        ).padStart(2, '0');

        return \`\${y}-\${m}-\${d}\`;
    }

    const texto =
        String(valor).trim();

    // ISO / timestamp:
    // 2026-08-24
    // 2026-08-24T18:35:42
    // 2026-08-24 18:35:42
    const iso =
        texto.match(
            /^(\\d{4})-(\\d{2})-(\\d{2})/
        );

    if (iso) {
        return \`\${iso[1]}-\${iso[2]}-\${iso[3]}\`;
    }

    // Formato visual habitual:
    // 24/08/2026
    // 24/08/2026 18:35:42
    const latam =
        texto.match(
            /^(\\d{2})\\/(\\d{2})\\/(\\d{4})/
        );

    if (latam) {
        return \`\${latam[3]}-\${latam[2]}-\${latam[1]}\`;
    }

    return null;
}

`;

  const anchor =
    'async function resolverContextoAuditoria(';

  source = source.replace(
    anchor,
    helper + anchor
  );
}

// ------------------------------------------------------
// 2. En resolverContextoAuditoria, normalizar solo el query.
// ------------------------------------------------------
const start = source.indexOf(
  'async function resolverContextoAuditoria('
);

const nextFnCandidates = [
  source.indexOf(
    'async function aplicarContextoAuditoria(',
    start
  ),
  source.indexOf(
    'async function resolverContextoDesdeEscucha(',
    start
  )
].filter(i => i > start);

const end = nextFnCandidates.length
  ? Math.min(...nextFnCandidates)
  : -1;

if (start < 0 || end < 0) {
  console.error(
    '[F11.5.5.6] No se pudo aislar resolverContextoAuditoria.'
  );
  process.exit(1);
}

let block = source.slice(start, end);

// Insert normalized context date after params creation, if absent.
if (!/const\s+fechaContexto\s*=\s*normalizarFechaParaContexto/.test(block)) {
  const paramsAnchor =
    '    const params = new URLSearchParams();';

  if (!block.includes(paramsAnchor)) {
    console.error(
      '[F11.5.5.6] No se encontró URLSearchParams.'
    );
    process.exit(1);
  }

  block = block.replace(
    paramsAnchor,
`${paramsAnchor}

    const fechaContexto =
        normalizarFechaParaContexto(
            fecha
        );`
  );
}

// Replace query set fecha with normalized value.
block = block.replace(
  /if\s*\(\s*fecha\s*\)\s*\{\s*params\.set\(\s*'fecha'\s*,\s*String\(fecha\)\s*\);\s*\}/m,
`if (fechaContexto) {
        params.set(
            'fecha',
            fechaContexto
        );
    }`
);

// Alternative multiline form from previous phases.
block = block.replace(
  /if\s*\(\s*fecha\s*\)\s*\{\s*params\.set\(\s*'fecha'\s*,\s*String\(\s*fecha\s*\)\s*\);\s*\}/m,
`if (fechaContexto) {
        params.set(
            'fecha',
            fechaContexto
        );
    }`
);

source =
  source.slice(0, start) +
  block +
  source.slice(end);

// ------------------------------------------------------
// 3. Expose helper only for diagnostic/manual testing.
// ------------------------------------------------------
if (!/window\.normalizarFechaParaContexto\s*=/.test(source)) {
  source += `
window.normalizarFechaParaContexto =
    normalizarFechaParaContexto;
`;
}

// ------------------------------------------------------
// 4. Guardrails.
// ------------------------------------------------------
const resolverStart = source.indexOf(
  'async function resolverContextoAuditoria('
);
const resolverEnd = source.indexOf(
  'async function aplicarContextoAuditoria(',
  resolverStart
);
const resolverBlock = source.slice(
  resolverStart,
  resolverEnd
);

const required = [
  /function normalizarFechaParaContexto\s*\(/,
  /const\s+fechaContexto\s*=\s*normalizarFechaParaContexto/,
  /params\.set\(\s*'fecha'\s*,\s*fechaContexto\s*\)/m,
  /window\.normalizarFechaParaContexto\s*=/
];

for (const rule of required) {
  if (!rule.test(source)) {
    console.error('[F11.5.5.6] Validación falló:', rule);
    process.exit(1);
  }
}

// Critical: resolver must not send String(fecha) anymore.
if (
  /params\.set\(\s*'fecha'\s*,\s*String\(\s*fecha\s*\)/m.test(
    resolverBlock
  )
) {
  console.error(
    '[F11.5.5.6] ERROR: resolver aún envía fecha completa al endpoint.'
  );
  process.exit(1);
}

fs.writeFileSync(
  auditorPath,
  source,
  'utf8'
);

console.log(
  '[F11.5.5.6] OK - contexto usa solo YYYY-MM-DD.'
);
console.log(
  '[F11.5.5.6] OK - payload de evaluación NO se trunca.'
);
