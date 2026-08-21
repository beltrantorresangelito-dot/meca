const crypto = require('crypto');
const { promisify } = require('util');

const scryptAsync = promisify(crypto.scrypt);
const DEFAULT_N = 16384;
const DEFAULT_R = 8;
const DEFAULT_P = 1;
const KEYLEN = 32;

function sha256Legacy(password) {
  return crypto.createHash('sha256').update(String(password)).digest('hex');
}

function safeEqualHex(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false;
  try {
    return crypto.timingSafeEqual(Buffer.from(a, 'hex'), Buffer.from(b, 'hex'));
  } catch {
    return false;
  }
}

async function hashPassword(password) {
  if (!password || String(password).length < 6) {
    throw new Error('La contraseña debe tener al menos 6 caracteres');
  }
  const salt = crypto.randomBytes(16);
  const derived = await scryptAsync(String(password), salt, KEYLEN, {
    N: DEFAULT_N,
    r: DEFAULT_R,
    p: DEFAULT_P,
    maxmem: 64 * 1024 * 1024,
  });
  return `scrypt$${DEFAULT_N}$${DEFAULT_R}$${DEFAULT_P}$${salt.toString('hex')}$${derived.toString('hex')}`;
}

async function verifyPassword(password, storedHash) {
  if (typeof storedHash !== 'string' || !storedHash) {
    return { valid: false, needsRehash: false, scheme: 'unknown' };
  }

  if (/^[a-f0-9]{64}$/i.test(storedHash)) {
    const candidate = sha256Legacy(password);
    return {
      valid: safeEqualHex(candidate, storedHash),
      needsRehash: safeEqualHex(candidate, storedHash),
      scheme: 'sha256-legacy',
    };
  }

  const parts = storedHash.split('$');
  if (parts.length === 6 && parts[0] === 'scrypt') {
    const [, n, r, p, saltHex, hashHex] = parts;
    const salt = Buffer.from(saltHex, 'hex');
    const expected = Buffer.from(hashHex, 'hex');
    const derived = await scryptAsync(String(password), salt, expected.length, {
      N: Number(n),
      r: Number(r),
      p: Number(p),
      maxmem: 64 * 1024 * 1024,
    });
    const valid = expected.length === derived.length && crypto.timingSafeEqual(expected, derived);
    return { valid, needsRehash: false, scheme: 'scrypt' };
  }

  return { valid: false, needsRehash: false, scheme: 'unknown' };
}

module.exports = { hashPassword, verifyPassword, sha256Legacy };
