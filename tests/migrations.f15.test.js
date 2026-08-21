const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const os = require('os');
const path = require('path');

const {
  checksum,
  parseMigrationFilename,
  discoverMigrations,
  validateMigrations
} = require('../scripts/migrations/lib');

test('MIG-001 reconoce nombres de migración válidos', () => {
  assert.deepEqual(
    parseMigrationFilename('0007_crear_quiebres.up.sql'),
    {
      version: 7,
      name: 'crear_quiebres',
      direction: 'up',
      filename: '0007_crear_quiebres.up.sql'
    }
  );
});

test('MIG-002 rechaza archivos que no respetan la convención', () => {
  assert.equal(parseMigrationFilename('crear_quiebres.sql'), null);
  assert.equal(parseMigrationFilename('7_quiebres.up.sql'), null);
});

test('MIG-003 checksum cambia si cambia el SQL', () => {
  assert.notEqual(checksum('SELECT 1;'), checksum('SELECT 2;'));
  assert.equal(checksum('SELECT 1;'), checksum('SELECT 1;'));
});

test('MIG-004 descubre y ordena migraciones por versión', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'meca-migrations-'));
  try {
    fs.writeFileSync(path.join(dir, '0002_segunda.up.sql'), 'SELECT 2;');
    fs.writeFileSync(path.join(dir, '0002_segunda.down.sql'), 'SELECT 2;');
    fs.writeFileSync(path.join(dir, '0001_primera.up.sql'), 'SELECT 1;');
    fs.writeFileSync(path.join(dir, '0001_primera.down.sql'), 'SELECT 1;');

    const migrations = discoverMigrations(dir);
    validateMigrations(migrations);
    assert.deepEqual(migrations.map(m => m.version), [1, 2]);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('MIG-005 exige UP y DOWN para cada versión', () => {
  assert.throws(
    () => validateMigrations([{ version: 1, name: 'x', up: { sql: '' }, down: null }]),
    /no tiene archivo \.down\.sql/
  );
});
