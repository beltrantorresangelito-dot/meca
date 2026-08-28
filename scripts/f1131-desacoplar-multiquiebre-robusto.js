const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');

const supervisorPath = path.join(
  ROOT,
  'public',
  'js',
  'supervisor.js'
);

const auditorPath = path.join(
  ROOT,
  'public',
  'js',
  'auditor.js'
);

const dashboardPath = path.join(
  ROOT,
  'views',
  'supervisor',
  'dashboard.html'
);

function readRequired(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error('[F11.3.1] No existe:', filePath);
    process.exit(1);
  }

  return fs.readFileSync(filePath, 'utf8');
}

function write(filePath, content) {
  fs.writeFileSync(filePath, content, 'utf8');
}

let supervisor = readRequired(supervisorPath);
const auditorBefore = readRequired(auditorPath);
let dashboard = readRequired(dashboardPath);

// ======================================================
// 1. Eliminar bloque de autocreación T/ST/F por patrón.
// ======================================================
const defaultCampaignRegex =
  /(\s*\/\/\s*3\.\s*Verificar si existen campañas iniciales[\s\S]*?)setTimeout\s*\(\s*async\s*\(\)\s*=>\s*\{[\s\S]*?const\s+predeterminadas\s*=\s*\[[\s\S]*?\{[\s\S]*?codigo\s*:\s*['"]T['"][\s\S]*?Temprana[\s\S]*?\{[\s\S]*?codigo\s*:\s*['"]ST['"][\s\S]*?Super Temprana[\s\S]*?\{[\s\S]*?codigo\s*:\s*['"]F['"][\s\S]*?Fraccionamiento[\s\S]*?\][\s\S]*?for\s*\(\s*const\s+c\s+of\s+predeterminadas\s*\)[\s\S]*?\}\s*,\s*1000\s*\)\s*;/m;

if (!defaultCampaignRegex.test(supervisor)) {
  console.error(
    '[F11.3.1] No se encontró el bloque de autocreación T/ST/F.'
  );
  process.exit(1);
}

supervisor = supervisor.replace(
  defaultCampaignRegex,
  `
    // 3. Las campañas provienen exclusivamente de la configuración persistida.
    // F11.3.1: el frontend no crea campañas específicas de Cobranzas.
    setTimeout(async () => {
        const campanas = await obtenerCampanas();

        if (campanas.length === 0) {
            console.warn(
                '⚠️ No hay campañas configuradas para el contexto actual. ' +
                'Regístrelas desde la administración de campañas.'
            );
        }
    }, 1000);`
);

// ======================================================
// 2. Branding: reemplazos globales controlados.
// ======================================================
const brandingRules = [
  [
    /Auditoría Calidad Cobranzas/g,
    'Auditoría de Calidad'
  ],
  [
    /Mesa Calidad Cobranzas/g,
    'Mesa de Calidad'
  ],
  [
    /Movistar Perú\s*-\s*Auditoría Calidad Cobranzas/g,
    'Movistar Perú - Auditoría de Calidad'
  ]
];

for (const [regex, replacement] of brandingRules) {
  supervisor = supervisor.replace(
    regex,
    replacement
  );
}

// ======================================================
// 3. Placeholder/copy de campañas: tolerante a espacios.
// ======================================================
dashboard = dashboard
  .replace(
    /Código\s*\(ej:\s*T,\s*ST,\s*F\)\s*\*/gi,
    'Código de campaña *'
  )
  .replace(
    /placeholder\s*=\s*["']Ej:\s*T,\s*ST,\s*F["']/gi,
    'placeholder="Ej: CAMP01"'
  )
  .replace(
    /placeholder\s*=\s*["']Ej:\s*Temprana,\s*Super Temprana,\s*Fraccionamiento["']/gi,
    'placeholder="Ej: Campaña principal"'
  );

// ======================================================
// 4. Verificación: auditor.js NO debe cambiar.
// ======================================================
const auditorAfter = readRequired(auditorPath);

if (auditorAfter !== auditorBefore) {
  console.error(
    '[F11.3.1] ERROR: auditor.js cambió antes de aplicar el parche.'
  );
  process.exit(1);
}

const quartileChecks = [
  /if\s*\(\s*nota\s*>=\s*97\s*\)\s*return\s*['"]Q1['"]/,
  /if\s*\(\s*nota\s*>=\s*90\s*\)\s*return\s*['"]Q2['"]/,
  /if\s*\(\s*nota\s*>=\s*85\s*\)\s*return\s*['"]Q3['"]/
];

for (const check of quartileChecks) {
  if (!check.test(auditorBefore)) {
    console.error(
      '[F11.3.1] ERROR: no se encontraron los umbrales esperados en auditor.js.'
    );
    process.exit(1);
  }
}

// ======================================================
// 5. Verificación previa a escritura.
// ======================================================
const forbiddenSupervisor = [
  /Auditoría Calidad Cobranzas/i,
  /Mesa Calidad Cobranzas/i,
  /Movistar Perú\s*-\s*Auditoría Calidad Cobranzas/i,
  /const\s+predeterminadas\s*=\s*\[/i,
  /\{\s*codigo\s*:\s*['"]T['"]\s*,\s*descripcion\s*:\s*['"]Temprana['"]\s*\}/i,
  /\{\s*codigo\s*:\s*['"]ST['"]\s*,\s*descripcion\s*:\s*['"]Super Temprana['"]\s*\}/i,
  /\{\s*codigo\s*:\s*['"]F['"]\s*,\s*descripcion\s*:\s*['"]Fraccionamiento['"]\s*\}/i
];

for (const pattern of forbiddenSupervisor) {
  if (pattern.test(supervisor)) {
    console.error(
      '[F11.3.1] ERROR: quedó un residual en supervisor.js:',
      pattern
    );
    process.exit(1);
  }
}

if (!/Movistar Perú - Auditoría de Calidad/.test(supervisor)) {
  console.error(
    '[F11.3.1] ERROR: no quedó branding neutral esperado en supervisor.js.'
  );
  process.exit(1);
}

if (!/No hay campañas configuradas para el contexto actual/.test(supervisor)) {
  console.error(
    '[F11.3.1] ERROR: no quedó mensaje neutral para campañas vacías.'
  );
  process.exit(1);
}

const forbiddenDashboard = [
  /placeholder\s*=\s*["']Ej:\s*T,\s*ST,\s*F["']/i,
  /placeholder\s*=\s*["']Ej:\s*Temprana,\s*Super Temprana,\s*Fraccionamiento["']/i,
  /Código\s*\(ej:\s*T,\s*ST,\s*F\)/i
];

for (const pattern of forbiddenDashboard) {
  if (pattern.test(dashboard)) {
    console.error(
      '[F11.3.1] ERROR: quedó un residual en dashboard.html:',
      pattern
    );
    process.exit(1);
  }
}

if (!/placeholder="Ej: CAMP01"/.test(dashboard)) {
  console.error(
    '[F11.3.1] ERROR: no quedó placeholder genérico de código.'
  );
  process.exit(1);
}

if (!/placeholder="Ej: Campaña principal"/.test(dashboard)) {
  console.error(
    '[F11.3.1] ERROR: no quedó placeholder genérico de descripción.'
  );
  process.exit(1);
}

// ======================================================
// 6. Escritura final.
// ======================================================
write(supervisorPath, supervisor);
write(dashboardPath, dashboard);

console.log('[F11.3.1] OK - supervisor.js actualizado.');
console.log('[F11.3.1] OK - dashboard.html actualizado.');
console.log('[F11.3.1] OK - auditor.js sin cambios.');
console.log('[F11.3.1] OK - umbrales 97/90/85 preservados.');
console.log('[F11.3.1] OK - sin T/ST/F predeterminadas.');
console.log('[F11.3.1] OK - sin branding fijo de Cobranzas.');
