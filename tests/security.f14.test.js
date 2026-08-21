process.env.AUTH_SECRET = process.env.AUTH_SECRET || 'test-secret-32-characters-minimum-123456';

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { hashPassword, verifyPassword } = require('../security/passwords');
const { signToken, verifyToken } = require('../security/tokens');


test('SEC-001: hash nuevo usa scrypt y no guarda password en claro', async () => {
  const hash = await hashPassword('ClaveSegura123');
  assert.match(hash, /^scrypt\$/);
  assert.notEqual(hash, 'ClaveSegura123');
  const result = await verifyPassword('ClaveSegura123', hash);
  assert.equal(result.valid, true);
  assert.equal(result.needsRehash, false);
});

test('SEC-002: SHA-256 legacy sigue autenticando y solicita rehash', async () => {
  const legacy = crypto.createHash('sha256').update('clave_test').digest('hex');
  const result = await verifyPassword('clave_test', legacy);
  assert.equal(result.valid, true);
  assert.equal(result.needsRehash, true);
  assert.equal(result.scheme, 'sha256-legacy');
});

test('SEC-003: contraseña incorrecta es rechazada para scrypt y legacy', async () => {
  const modern = await hashPassword('correcta123');
  const legacy = crypto.createHash('sha256').update('correcta123').digest('hex');
  assert.equal((await verifyPassword('incorrecta', modern)).valid, false);
  assert.equal((await verifyPassword('incorrecta', legacy)).valid, false);
});

test('SEC-004: token firmado válido conserva payload y propósito', () => {
  const token = signToken({ id: 7, rol_codigo: 'AUDITOR' });
  const result = verifyToken(token);
  assert.equal(result.valid, true);
  assert.equal(result.payload.id, 7);
  assert.equal(result.payload.purpose, 'access');
});

test('SEC-005: modificar payload invalida la firma', () => {
  const token = signToken({ id: 7 });
  const [header, payload, signature] = token.split('.');
  const altered = Buffer.from(JSON.stringify({ id: 999, purpose: 'access', exp: Math.floor(Date.now()/1000)+3600 })).toString('base64url');
  const result = verifyToken(`${header}.${altered}.${signature}`);
  assert.equal(result.valid, false);
});

test('SEC-006: token de cambio de password no sirve como token de acceso', () => {
  const token = signToken({ id: 7 }, { purpose: 'password_change', expiresInSeconds: 600 });
  assert.equal(verifyToken(token, { expectedPurpose: 'password_change' }).valid, true);
  assert.equal(verifyToken(token, { expectedPurpose: 'access' }).valid, false);
});

const fs = require('node:fs');
const path = require('node:path');

test('SEC-007: server.js no contiene firma-simple ni CORS wildcard', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../server.js'), 'utf8');
  assert.doesNotMatch(source, /firma-simple/);
  assert.doesNotMatch(source, /Access-Control-Allow-Origin['"],\s*['"]\*['"]/);
});

test('SEC-008: configuración PostgreSQL no contiene password fallback hardcodeado', () => {
  const source = fs.readFileSync(path.resolve(__dirname, '../models/database.js'), 'utf8');
  assert.doesNotMatch(source, /password:\s*process\.env\.DB_PASSWORD\s*\|\|/);
  assert.match(source, /DATABASE_URL/);
});
