const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const IGNORE_DIRS = new Set(['.git','node_modules','coverage','dist','build','.vscode']);
const EXTENSIONS = new Set(['.js','.cjs','.mjs','.sql','.html','.json','.md','.txt']);
const matches = [];

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (IGNORE_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      walk(full);
      continue;
    }

    if (!EXTENSIONS.has(path.extname(entry.name).toLowerCase())) continue;

    const rel = path.relative(ROOT, full).replaceAll('\\', '/');
    if (rel.includes('F11.5.6')) continue;

    let source;
    try {
      source = fs.readFileSync(full, 'utf8');
    } catch {
      continue;
    }

    const lines = source.split(/\r?\n/);

    lines.forEach((line, index) => {
      if (!/\bcampana(?:_id|Id)?\b/i.test(line)) return;

      let tipo = 'REVISAR';

      if (/\bcampana_id\b|\bcampanaId\b/.test(line)) tipo = 'ID_DOMINIO';

      if (/\bcampana\b/.test(line) && !/\bcampana_id\b|\bcampanaId\b/.test(line)) {
        tipo = 'TEXTO_LEGACY_O_UI';
      }

      if (/select|insert|update|delete|from|join|where/i.test(line) && /campana/i.test(line)) {
        tipo = 'SQL';
      }

      if (/console\.|diagn[oó]stico|log\(/i.test(line)) tipo = 'DIAGNOSTICO';

      if (/getElementById|textContent|innerHTML|\.value|label|option/i.test(line)) {
        tipo = 'UI';
      }

      if (/test\(|assert\.|describe\(|it\(/i.test(line)) tipo = 'TEST';

      matches.push({
        archivo: rel,
        linea: index + 1,
        tipo,
        codigo: line.trim()
      });
    });
  }
}

walk(ROOT);

const resumen = matches.reduce((acc, item) => {
  acc[item.tipo] = (acc[item.tipo] || 0) + 1;
  return acc;
}, {});

const archivos = [...new Set(matches.map(x => x.archivo))];

const suspiciousEvaluationText = matches.filter(x =>
  /evaluaci/i.test(x.archivo + ' ' + x.codigo) &&
  /\bcampana\b/.test(x.codigo) &&
  !/\bcampana_id\b|\bcampanaId\b/.test(x.codigo)
);

const report = {
  fase: 'F11.5.6',
  generado: new Date().toISOString(),
  total_referencias: matches.length,
  total_archivos: archivos.length,
  resumen_por_tipo: resumen,
  referencias_evaluacion_campana_textual: suspiciousEvaluationText,
  referencias: matches
};

fs.writeFileSync(
  path.join(ROOT, 'F11.5.6_INVENTARIO_CAMPANA.json'),
  JSON.stringify(report, null, 2),
  'utf8'
);

const md = [];
md.push('# MECA F11.5.6 - Inventario de campana');
md.push('');
md.push(`Referencias: **${matches.length}**`);
md.push(`Archivos: **${archivos.length}**`);
md.push('');
md.push('## Resumen');
md.push('');

for (const [tipo, cantidad] of Object.entries(resumen).sort()) {
  md.push(`- ${tipo}: ${cantidad}`);
}

md.push('');
md.push('## Referencias de campana textual asociadas a evaluaciones');
md.push('');

if (suspiciousEvaluationText.length === 0) {
  md.push('No se detectaron referencias candidatas.');
} else {
  for (const item of suspiciousEvaluationText) {
    md.push(`- \`${item.archivo}:${item.linea}\` — \`${item.codigo.replaceAll('`', '\\`')}\``);
  }
}

md.push('');
md.push('## Criterio de migración');
md.push('');
md.push('- `campana_id`: fuente de verdad persistente.');
md.push('- `campana`: solo debe sobrevivir como dato derivado para presentación.');
md.push('- No eliminar columnas ni propiedades hasta revisar todas las referencias.');
md.push('- Reportes y vistas deben resolver código/nombre mediante la relación con `campanas`.');

fs.writeFileSync(
  path.join(ROOT, 'F11.5.6_INVENTARIO_CAMPANA.md'),
  md.join('\n'),
  'utf8'
);

console.log('==============================================');
console.log('MECA F11.5.6 - INVENTARIO CAMPANA');
console.log('==============================================');
console.log('Referencias:', matches.length);
console.log('Archivos:', archivos.length);
console.log('Resumen:', resumen);
console.log('Campana textual ligada a evaluaciones:', suspiciousEvaluationText.length);
console.log('');
console.log('Generados:');
console.log('- F11.5.6_INVENTARIO_CAMPANA.json');
console.log('- F11.5.6_INVENTARIO_CAMPANA.md');
