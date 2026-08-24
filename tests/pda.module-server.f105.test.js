const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(path.resolve(__dirname, '../server.js'), 'utf8');

test('PDAMOD-SERVER-001 server delega al módulo', () => {
  assert.match(source, /createPdaHandler/);
  assert.match(source, /handlePdaRequest/);
});

test('PDAMOD-SERVER-002 handlers PDA ya no están inline', () => {
  assert.doesNotMatch(source, /if \(ruta === '\/api\/pda\/pendientes'/);
  assert.doesNotMatch(source, /if \(ruta === '\/api\/pda\/seguimiento'/);
  assert.doesNotMatch(source, /if \(ruta === '\/api\/pda\/historial'/);
  assert.doesNotMatch(source, /if \(ruta === '\/api\/pda\/exportar'/);
});

test('PDAMOD-SERVER-003 server no instancia capas internas', () => {
  assert.doesNotMatch(source, /new PdaRepository/);
  assert.doesNotMatch(source, /new PdaService/);
  assert.doesNotMatch(source, /new PdaController/);
});

test('PDAMOD-SERVER-004 F7 F8 F9 siguen modularizados', () => {
  assert.match(source, /handleEvaluationsRequest/);
  assert.match(source, /handleSessionsRequest/);
  assert.match(source, /handleRequestsRequest/);
});
