const test = require('node:test');
const assert = require('node:assert/strict');

const {
  AudioProxyService,
  AudioProxyController,
  createAudioProxyHandler
} = require('../src/modules/audio-proxy');

test('AUDIOMOD-001 index exporta tres piezas', () => {
  assert.equal(typeof AudioProxyService, 'function');
  assert.equal(typeof AudioProxyController, 'function');
  assert.equal(typeof createAudioProxyHandler, 'function');
});

test('AUDIOMOD-002 ruta ajena devuelve false', async () => {
  const handler = createAudioProxyHandler({
    baseUrl: 'http://python',
    fetchImpl: async () => ({})
  });

  assert.equal(
    await handler({
      ruta: '/api/otra',
      metodo: 'GET',
      respuesta: {}
    }),
    false
  );
});

test('AUDIOMOD-003 reproducir extrae ticketId', async () => {
  let url;
  const handler = createAudioProxyHandler({
    baseUrl: 'http://python',
    fetchImpl: async u => {
      url = u;
      return {
        ok: true,
        status: 200,
        headers: {
          get(name) {
            if (name === 'content-type') return 'audio/wav';
            return null;
          }
        },
        arrayBuffer: async () => Uint8Array.from([1]).buffer
      };
    }
  });

  let status;
  await handler({
    ruta: '/api/audio/reproducir/77',
    metodo: 'GET',
    respuesta: {
      setHeader() {},
      writeHead(code) { status = code; },
      end() {}
    }
  });

  assert.equal(status, 200);
  assert.equal(
    url,
    'http://python/api/audio/reproducir/77'
  );
});

test('AUDIOMOD-004 reproducir inválido conserva 400', async () => {
  const handler = createAudioProxyHandler({
    baseUrl: 'http://python',
    fetchImpl: async () => ({})
  });

  let status;
  let payload;

  await handler({
    ruta: '/api/audio/reproducir/abc',
    metodo: 'GET',
    respuesta: {
      setHeader() {},
      writeHead(code) { status = code; },
      end(body) {
        if (body) payload = JSON.parse(body);
      }
    }
  });

  assert.equal(status, 400);
  assert.equal(payload.error, 'Ticket ID inválido');
});

test('AUDIOMOD-005 verificar extrae ticketId', async () => {
  let url;
  const handler = createAudioProxyHandler({
    baseUrl: 'http://python',
    fetchImpl: async u => {
      url = u;
      return {
        status: 200,
        json: async () => ({ existe: true })
      };
    }
  });

  let status;
  let payload;

  await handler({
    ruta: '/api/audio/verificar/55',
    metodo: 'GET',
    respuesta: {
      writeHead(code) { status = code; },
      end(body) { payload = JSON.parse(body); }
    }
  });

  assert.equal(status, 200);
  assert.deepEqual(payload, { existe: true });
  assert.equal(
    url,
    'http://python/api/audio/verificar/55'
  );
});
