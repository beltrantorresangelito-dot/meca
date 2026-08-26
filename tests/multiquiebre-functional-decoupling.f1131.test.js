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

test('F1131-001 no quedan campañas T/ST/F predeterminadas', () => {
  assert.doesNotMatch(
    supervisor,
    /const\s+predeterminadas\s*=\s*\[/
  );

  assert.doesNotMatch(
    supervisor,
    /\{\s*codigo\s*:\s*['"]T['"]\s*,\s*descripcion\s*:\s*['"]Temprana['"]\s*\}/
  );

  assert.doesNotMatch(
    supervisor,
    /\{\s*codigo\s*:\s*['"]ST['"]\s*,\s*descripcion\s*:\s*['"]Super Temprana['"]\s*\}/
  );

  assert.doesNotMatch(
    supervisor,
    /\{\s*codigo\s*:\s*['"]F['"]\s*,\s*descripcion\s*:\s*['"]Fraccionamiento['"]\s*\}/
  );
});

test('F1131-002 campañas vacías no generan datos automáticamente', () => {
  assert.match(
    supervisor,
    /No hay campañas configuradas para el contexto actual/
  );

  assert.match(
    supervisor,
    /administración de campañas/
  );
});

test('F1131-003 branding fijo de Cobranzas eliminado', () => {
  assert.doesNotMatch(
    supervisor,
    /Auditoría Calidad Cobranzas/
  );

  assert.doesNotMatch(
    supervisor,
    /Mesa Calidad Cobranzas/
  );

  assert.doesNotMatch(
    supervisor,
    /Movistar Perú\s*-\s*Auditoría Calidad Cobranzas/
  );
});

test('F1131-004 branding neutral presente', () => {
  assert.match(
    supervisor,
    /Auditoría de Calidad/
  );

  assert.match(
    supervisor,
    /Mesa de Calidad/
  );

  assert.match(
    supervisor,
    /Movistar Perú - Auditoría de Calidad/
  );
});

test('F1131-005 placeholders específicos eliminados', () => {
  assert.doesNotMatch(
    dashboard,
    /Ej:\s*T,\s*ST,\s*F/
  );

  assert.doesNotMatch(
    dashboard,
    /Ej:\s*Temprana,\s*Super Temprana,\s*Fraccionamiento/
  );
});

test('F1131-006 placeholders genéricos presentes', () => {
  assert.match(
    dashboard,
    /placeholder="Ej: CAMP01"/
  );

  assert.match(
    dashboard,
    /placeholder="Ej: Campaña principal"/
  );
});

test('F1131-007 umbrales de auditor preservados', () => {
  assert.match(
    auditor,
    /if\s*\(\s*nota\s*>=\s*97\s*\)\s*return\s*['"]Q1['"]/
  );

  assert.match(
    auditor,
    /if\s*\(\s*nota\s*>=\s*90\s*\)\s*return\s*['"]Q2['"]/
  );

  assert.match(
    auditor,
    /if\s*\(\s*nota\s*>=\s*85\s*\)\s*return\s*['"]Q3['"]/
  );
});
