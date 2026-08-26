const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const supervisor = fs.readFileSync(
  path.resolve(__dirname, '../public/js/supervisor.js'),
  'utf8'
);

const auditor = fs.readFileSync(
  path.resolve(__dirname, '../public/js/auditor.js'),
  'utf8'
);

const dashboard = fs.readFileSync(
  path.resolve(__dirname, '../views/supervisor/dashboard.html'),
  'utf8'
);

test('F113-001 frontend no crea T/ST/F automáticamente', () => {
  assert.doesNotMatch(
    supervisor,
    /const predeterminadas\s*=\s*\[/
  );

  assert.doesNotMatch(
    supervisor,
    /\{\s*codigo:\s*'T',\s*descripcion:\s*'Temprana'\s*\}/
  );

  assert.doesNotMatch(
    supervisor,
    /\{\s*codigo:\s*'ST',\s*descripcion:\s*'Super Temprana'\s*\}/
  );

  assert.doesNotMatch(
    supervisor,
    /\{\s*codigo:\s*'F',\s*descripcion:\s*'Fraccionamiento'\s*\}/
  );
});

test('F113-002 frontend indica configuración cuando no hay campañas', () => {
  assert.match(
    supervisor,
    /No hay campañas configuradas para el contexto actual/
  );

  assert.match(
    supervisor,
    /administración de campañas/
  );
});

test('F113-003 branding activo ya no dice Calidad Cobranzas', () => {
  assert.doesNotMatch(
    supervisor,
    /Auditoría Calidad Cobranzas/
  );

  assert.doesNotMatch(
    supervisor,
    /Mesa Calidad Cobranzas/
  );
});

test('F113-004 reporte conserva marca corporativa pero no quiebre fijo', () => {
  assert.match(
    supervisor,
    /Movistar Perú - Auditoría de Calidad/
  );

  assert.doesNotMatch(
    supervisor,
    /Movistar Perú - Auditoría Calidad Cobranzas/
  );
});

test('F113-005 formulario usa ejemplos genéricos', () => {
  assert.match(
    dashboard,
    /placeholder="Ej: CAMP01"/
  );

  assert.match(
    dashboard,
    /placeholder="Ej: Campaña principal"/
  );

  assert.doesNotMatch(
    dashboard,
    /Temprana, Super Temprana, Fraccionamiento/
  );
});

test('F113-006 umbrales de cuartiles quedan intactos', () => {
  assert.match(auditor, /if \(nota >= 97\) return 'Q1'/);
  assert.match(auditor, /if \(nota >= 90\) return 'Q2'/);
  assert.match(auditor, /if \(nota >= 85\) return 'Q3'/);
});

test('F113-007 deuda de configuración central permanece explícita', () => {
  assert.match(
    auditor,
    /debe provenir de la configuración central/
  );
});
