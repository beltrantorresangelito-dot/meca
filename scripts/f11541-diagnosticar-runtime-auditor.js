const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');

const auditorJs = path.join(
  ROOT,
  'public',
  'js',
  'auditor.js'
);

function read(file) {
  return fs.existsSync(file)
    ? fs.readFileSync(file, 'utf8')
    : null;
}

const source = read(auditorJs);

const result = {
  auditor_js_exists: !!source,
  helper_base:
    !!source &&
    /async function resolverContextoAuditoria\s*\(/.test(source),
  helper_apply:
    !!source &&
    /async function aplicarContextoAuditoria\s*\(/.test(source),
  helper_from_listen:
    !!source &&
    /async function resolverContextoDesdeEscucha\s*\(/.test(source),
  exposure_base:
    !!source &&
    /window\.resolverContextoAuditoria\s*=/.test(source),
  exposure_apply:
    !!source &&
    /window\.aplicarContextoAuditoria\s*=/.test(source),
  exposure_from_listen:
    !!source &&
    /window\.resolverContextoDesdeEscucha\s*=/.test(source),
  html_refs: []
};

const roots = [
  path.join(ROOT, 'views'),
  path.join(ROOT, 'public')
];

function walk(dir) {
  if (!fs.existsSync(dir)) return [];

  const out = [];

  for (const entry of fs.readdirSync(dir, {
    withFileTypes: true
  })) {
    const full = path.join(dir, entry.name);

    if (entry.isDirectory()) {
      out.push(...walk(full));
      continue;
    }

    if (
      entry.isFile() &&
      /\.html?$/i.test(entry.name)
    ) {
      out.push(full);
    }
  }

  return out;
}

for (const base of roots) {
  for (const file of walk(base)) {
    const html = read(file);

    if (!html) continue;

    const scriptTags = [
      ...html.matchAll(
        /<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi
      )
    ];

    for (const match of scriptTags) {
      const src = match[1];

      if (/auditor/i.test(src)) {
        result.html_refs.push({
          file: path.relative(ROOT, file),
          src
        });
      }
    }
  }
}

console.log('==============================================');
console.log('MECA F11.5.4.1 - DIAGNOSTICO RUNTIME AUDITOR');
console.log('==============================================');
console.log('');
console.log('public/js/auditor.js existe:', result.auditor_js_exists);
console.log('resolverContextoAuditoria:', result.helper_base);
console.log('aplicarContextoAuditoria:', result.helper_apply);
console.log('resolverContextoDesdeEscucha:', result.helper_from_listen);
console.log('window.resolverContextoAuditoria:', result.exposure_base);
console.log('window.aplicarContextoAuditoria:', result.exposure_apply);
console.log('window.resolverContextoDesdeEscucha:', result.exposure_from_listen);
console.log('');
console.log('Referencias HTML a scripts auditor*:');

if (!result.html_refs.length) {
  console.log('NINGUNA');
} else {
  for (const ref of result.html_refs) {
    console.log(`- ${ref.file} -> ${ref.src}`);
  }
}

const outputPath = path.join(
  ROOT,
  'F11.5.4.1_DIAGNOSTICO_RUNTIME_AUDITOR.json'
);

fs.writeFileSync(
  outputPath,
  JSON.stringify(result, null, 2),
  'utf8'
);

console.log('');
console.log('Generado:', path.basename(outputPath));
