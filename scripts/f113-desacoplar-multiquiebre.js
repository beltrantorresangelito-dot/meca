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

function mustRead(filePath) {
  if (!fs.existsSync(filePath)) {
    console.error('[F11.3] No existe:', filePath);
    process.exit(1);
  }

  return fs.readFileSync(filePath, 'utf8');
}

function replaceExact(source, from, to, label) {
  if (!source.includes(from)) {
    console.error(
      `[F11.3] No se encontró bloque esperado: ${label}`
    );
    process.exit(1);
  }

  return source.replace(from, to);
}

let supervisor = mustRead(supervisorPath);
const auditor = mustRead(auditorPath);
let dashboard = mustRead(dashboardPath);

// ======================================================
// 1. Eliminar autocreación T/ST/F en frontend.
// ======================================================
const defaultCampaignBlock = `    // 3. Verificar si existen campañas iniciales, si no, crear las predeterminadas
    setTimeout(async () => {
        const campanas = await obtenerCampanas();
        if (campanas.length === 0) {
            console.log('📌 No hay campañas registradas. Creando campañas predeterminadas...');

            const predeterminadas = [
                { codigo: 'T', descripcion: 'Temprana' },
                { codigo: 'ST', descripcion: 'Super Temprana' },
                { codigo: 'F', descripcion: 'Fraccionamiento' }
            ];

            for (const c of predeterminadas) {
                await crearCampana({ codigo: c.codigo, descripcion: c.descripcion, activa: true });
            }

            // Recargar selectores
            cargarSelectCampanas('filtroCampanaEscuchas');
            cargarSelectCampanas('selectCampanaEscucha');

            console.log('✅ Campañas predeterminadas creadas');
        }
    }, 1000);
`;

const neutralCampaignBlock = `    // 3. Las campañas provienen exclusivamente de la configuración persistida.
    // F11.3: el frontend ya no crea campañas específicas de Cobranzas.
    setTimeout(async () => {
        const campanas = await obtenerCampanas();

        if (campanas.length === 0) {
            console.warn(
                '⚠️ No hay campañas configuradas para el contexto actual. ' +
                'Regístrelas desde la administración de campañas.'
            );
        }
    }, 1000);
`;

supervisor = replaceExact(
  supervisor,
  defaultCampaignBlock,
  neutralCampaignBlock,
  'autocreación T/ST/F'
);

// ======================================================
// 2. Neutralizar branding específico de Cobranzas.
// ======================================================
const brandingReplacements = [
  [
    'Documento generado automáticamente por Sistema MECA - © Auditoría Calidad Cobranzas<br>',
    'Documento generado automáticamente por Sistema MECA - © Auditoría de Calidad<br>',
    'footer documento HTML PDA'
  ],
  [
    "║  👤 EMITIDO POR: Mesa Calidad Cobranzas${' '.repeat(29)}║",
    "║  👤 EMITIDO POR: Mesa de Calidad${' '.repeat(38)}║",
    'emisor documento texto PDA'
  ],
  [
    '║  © Auditoría Calidad Cobranzas - No requiere respuesta del gestor              ║',
    '║  © Auditoría de Calidad - No requiere respuesta del gestor                       ║',
    'footer documento texto PDA'
  ],
  [
    '<p>Movistar Perú - Auditoría Calidad Cobranzas | Generado: ${fecha}</p>',
    '<p>Movistar Perú - Auditoría de Calidad | Generado: ${fecha}</p>',
    'encabezado reporte consolidado PDA'
  ],
  [
    '© Auditoría Calidad Cobranzas - Todos los derechos reservados',
    '© Auditoría de Calidad - Todos los derechos reservados',
    'footer reporte consolidado PDA'
  ]
];

for (const [from, to, label] of brandingReplacements) {
  supervisor = replaceExact(
    supervisor,
    from,
    to,
    label
  );
}

// ======================================================
// 3. Neutralizar ejemplos de campañas.
// ======================================================
dashboard = replaceExact(
  dashboard,
  '<label style="font-size: 12px; font-weight: 600;">Código (ej: T, ST, F) *</label>',
  '<label style="font-size: 12px; font-weight: 600;">Código de campaña *</label>',
  'label código campaña'
);

dashboard = replaceExact(
  dashboard,
  'placeholder="Ej: T, ST, F"',
  'placeholder="Ej: CAMP01"',
  'placeholder código campaña'
);

dashboard = replaceExact(
  dashboard,
  'placeholder="Ej: Temprana, Super Temprana, Fraccionamiento"',
  'placeholder="Ej: Campaña principal"',
  'placeholder descripción campaña'
);

// ======================================================
// 4. Guardrail: umbrales actuales no se tocan en F11.3.
// ======================================================
const quartileBlock = `function obtenerCuartil(nota) {
    // F1.3 - Regla oficial vigente de Cobranzas.
    // En fases posteriores esta clasificación debe provenir de la configuración central.
    if (nota >= 97) return 'Q1';   // Excelente
    if (nota >= 90) return 'Q2';   // Bien
    if (nota >= 85) return 'Q3';   // Regular
    return 'Q4';                   // Bajo / Riesgo
}`;

if (!auditor.includes(quartileBlock)) {
  console.error(
    '[F11.3] El bloque de cuartiles cambió antes de esta fase. ' +
    'No se aplicarán cambios automáticamente.'
  );
  process.exit(1);
}

// Write only after all validations pass.
fs.writeFileSync(
  supervisorPath,
  supervisor,
  'utf8'
);

fs.writeFileSync(
  dashboardPath,
  dashboard,
  'utf8'
);

console.log('[F11.3] OK - supervisor.js actualizado.');
console.log('[F11.3] OK - dashboard.html actualizado.');
console.log('[F11.3] OK - auditor.js NO fue modificado.');
console.log('[F11.3] OK - umbrales 97/90/85 preservados.');
