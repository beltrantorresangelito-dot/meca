const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

const supervisor = fs.readFileSync(
  path.join(root, 'public', 'js', 'supervisor.js'),
  'utf8'
);

const dashboard = fs.readFileSync(
  path.join(root, 'views', 'supervisor', 'dashboard.html'),
  'utf8'
);

const checks = [
  ['Auditoría Calidad Cobranzas', /Auditoría Calidad Cobranzas/i, supervisor],
  ['Mesa Calidad Cobranzas', /Mesa Calidad Cobranzas/i, supervisor],
  ['T/ST/F predeterminadas', /const\s+predeterminadas\s*=\s*\[/i, supervisor],
  ['placeholder T/ST/F', /Ej:\s*T,\s*ST,\s*F/i, dashboard],
  ['placeholder campañas históricas', /Ej:\s*Temprana,\s*Super Temprana,\s*Fraccionamiento/i, dashboard]
];

let failed = false;

for (const [name, regex, text] of checks) {
  const found = regex.test(text);
  console.log(`${found ? 'FAIL' : 'OK'} - ${name}`);

  if (found) {
    failed = true;
  }
}

if (failed) {
  process.exit(1);
}

console.log('OK - F11.3.1 sin residuos funcionales esperados.');
