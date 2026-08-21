const crypto = require('crypto');

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('AUTH_SECRET debe existir y tener al menos 32 caracteres');
  }
  return secret;
}

function encodeJson(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function signRaw(data) {
  return crypto.createHmac('sha256', getSecret()).update(data).digest('base64url');
}

function signToken(payload, { expiresInSeconds = 8 * 60 * 60, purpose = 'access' } = {}) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'HS256', typ: 'JWT' };
  const fullPayload = { ...payload, purpose, iat: now, exp: now + expiresInSeconds };
  const headerEncoded = encodeJson(header);
  const payloadEncoded = encodeJson(fullPayload);
  const signature = signRaw(`${headerEncoded}.${payloadEncoded}`);
  return `${headerEncoded}.${payloadEncoded}.${signature}`;
}

function verifyToken(token, { expectedPurpose = 'access' } = {}) {
  try {
    if (!token || typeof token !== 'string') return { valid: false, error: 'Token requerido' };
    const parts = token.split('.');
    if (parts.length !== 3) return { valid: false, error: 'Token inválido' };
    const [headerEncoded, payloadEncoded, signature] = parts;
    const header = JSON.parse(Buffer.from(headerEncoded, 'base64url').toString('utf8'));
    if (header.alg !== 'HS256' || header.typ !== 'JWT') return { valid: false, error: 'Token inválido' };

    const expected = signRaw(`${headerEncoded}.${payloadEncoded}`);
    const sigBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
      return { valid: false, error: 'Firma de token inválida' };
    }

    const payload = JSON.parse(Buffer.from(payloadEncoded, 'base64url').toString('utf8'));
    const now = Math.floor(Date.now() / 1000);
    if (!payload.exp || payload.exp <= now) return { valid: false, error: 'Token expirado' };
    if (expectedPurpose && payload.purpose !== expectedPurpose) {
      return { valid: false, error: 'Token no autorizado para esta operación' };
    }
    return { valid: true, payload };
  } catch {
    return { valid: false, error: 'Token inválido' };
  }
}

module.exports = { signToken, verifyToken };
