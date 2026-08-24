const test = require('node:test');
const assert = require('node:assert/strict');
const Service = require('../src/modules/audio-proxy/audio-proxy.service');

function headers(values = {}) {
  return {
    get(name) {
      return values[name.toLowerCase()] ?? null;
    }
  };
}

test('AUDIOSVC-001 requiere baseUrl', () => {
  assert.throws(
    () => new Service({ fetchImpl: async () => {} }),
    /requiere baseUrl/
  );
});

test('AUDIOSVC-002 reproducir construye URL correcta', async () => {
  let url;
  const service = new Service({
    baseUrl: 'http://localhost:5000/',
    fetchImpl: async u => {
      url = u;
      return {
        ok: true,
        status: 200,
        headers: headers({
          'content-type': 'audio/wav'
        }),
        arrayBuffer: async () =>
          Uint8Array.from([1,2,3]).buffer
      };
    }
  });

  await service.reproducir(7);

  assert.equal(
    url,
    'http://localhost:5000/api/audio/reproducir/7'
  );
});

test('AUDIOSVC-003 reproducir conserva content-type y disposition', async () => {
  const service = new Service({
    baseUrl: 'http://python',
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      headers: headers({
        'content-type': 'audio/mpeg',
        'content-disposition': 'inline'
      }),
      arrayBuffer: async () =>
        Uint8Array.from([1,2]).buffer
    })
  });

  const result = await service.reproducir(3);

  assert.equal(result.status, 200);
  assert.equal(result.contentType, 'audio/mpeg');
  assert.equal(result.contentDisposition, 'inline');
  assert.ok(Buffer.isBuffer(result.data));
});

test('AUDIOSVC-004 reproducir usa octet-stream si no hay content-type', async () => {
  const service = new Service({
    baseUrl: 'http://python',
    fetchImpl: async () => ({
      ok: true,
      status: 200,
      headers: headers(),
      arrayBuffer: async () =>
        new ArrayBuffer(0)
    })
  });

  const result = await service.reproducir(1);
  assert.equal(
    result.contentType,
    'application/octet-stream'
  );
});

test('AUDIOSVC-005 error Python propaga status y detalle 300 chars', async () => {
  const longText = 'x'.repeat(400);

  const service = new Service({
    baseUrl: 'http://python',
    fetchImpl: async () => ({
      ok: false,
      status: 404,
      text: async () => longText
    })
  });

  await assert.rejects(
    async () => service.reproducir(9),
    error => {
      assert.equal(error.status, 404);
      assert.equal(
        error.message,
        'Error desde servidor de audio: 404'
      );
      assert.equal(error.details.length, 300);
      return true;
    }
  );
});

test('AUDIOSVC-006 error al leer body usa fallback', async () => {
  const service = new Service({
    baseUrl: 'http://python',
    fetchImpl: async () => ({
      ok: false,
      status: 500,
      text: async () => {
        throw new Error('read');
      }
    })
  });

  await assert.rejects(
    async () => service.reproducir(9),
    error => {
      assert.equal(
        error.details,
        'Sin detalles adicionales'
      );
      return true;
    }
  );
});

test('AUDIOSVC-007 verificar conserva status y json', async () => {
  const service = new Service({
    baseUrl: 'http://python',
    fetchImpl: async () => ({
      status: 200,
      json: async () => ({
        existe: true
      })
    })
  });

  assert.deepEqual(
    await service.verificar(5),
    {
      status: 200,
      data: { existe: true }
    }
  );
});
