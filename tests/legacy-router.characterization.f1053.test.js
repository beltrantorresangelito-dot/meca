const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const source = fs.readFileSync(
  path.resolve(__dirname, '../server.js'),
  'utf8'
);

test('LEGROUTER-F1054-001 routes legacy ya no existe', () => {
  assert.doesNotMatch(source, /const routes\s*=\s*\{\}/);
});

test('LEGROUTER-F1054-002 registrarRuta ya no existe', () => {
  assert.doesNotMatch(source, /function registrarRuta\s*\(/);
});

test('LEGROUTER-F1054-003 dispatcher routes[ruta] ya no existe', () => {
  assert.doesNotMatch(source, /routes\[ruta\]/);
});

test('LEGROUTER-F1054-004 health sigue fuera del mini-router', () => {
  assert.match(source, /handleHealthRequest/);
});

test('LEGROUTER-F1054-005 fallback de ruta no encontrada permanece', () => {
  assert.match(source, /Ruta no encontrada|Not Found|404/);
});
