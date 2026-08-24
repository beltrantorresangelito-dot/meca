const test = require('node:test');
const assert = require('node:assert/strict');
const Controller =
  require('../src/modules/audio-proxy/audio-proxy.controller');

function response() {
  let status;
  let payload;
  let raw;
  const headers = {};

  return {
    res: {
      setHeader(name, value) {
        headers[name] = value;
      },
      writeHead(code) {
        status = code;
      },
      end(body) {
        raw = body;

        if (
          typeof body === 'string'
        ) {
          payload = JSON.parse(body);
        }
      }
    },
    get() {
      return {
        status,
        payload,
        raw,
        headers
      };
    }
  };
}

function service(overrides = {}) {
  return {
    reproducir: async () => ({
      status: 200,
      contentType: 'audio/wav',
      contentDisposition: null,
      data: Buffer.from([1,2,3])
    }),
    verificar: async () => ({
      status: 200,
      data: { existe: true }
    }),
    ...overrides
  };
}

test('AUDIOCTRL-001 ticket inválido devuelve 400', async () => {
  const out = response();

  await new Controller(service()).reproducir(
    out.res,
    'abc'
  );

  assert.equal(out.get().status, 400);
  assert.equal(
    out.get().payload.error,
    'Ticket ID inválido'
  );
});

test('AUDIOCTRL-002 reproducir conserva headers', async () => {
  const out = response();

  await new Controller(service()).reproducir(
    out.res,
    '7'
  );

  assert.equal(out.get().status, 200);
  assert.equal(
    out.get().headers['Content-Type'],
    'audio/wav'
  );
  assert.equal(
    out.get().headers['Accept-Ranges'],
    'bytes'
  );
  assert.equal(
    out.get().headers['Cache-Control'],
    'public, max-age=86400'
  );
  assert.equal(
    out.get().headers['Content-Length'],
    3
  );
});

test('AUDIOCTRL-003 conserva Content-Disposition', async () => {
  const out = response();

  await new Controller(service({
    reproducir: async () => ({
      status: 200,
      contentType: 'audio/mpeg',
      contentDisposition: 'inline',
      data: Buffer.from([1])
    })
  })).reproducir(out.res, '1');

  assert.equal(
    out.get().headers['Content-Disposition'],
    'inline'
  );
});

test('AUDIOCTRL-004 error Python conserva status message details', async () => {
  const out = response();

  await new Controller(service({
    reproducir: async () => {
      const error = new Error(
        'Error desde servidor de audio: 404'
      );
      error.status = 404;
      error.details = 'not found';
      throw error;
    }
  })).reproducir(out.res, '9');

  assert.deepEqual(
    {
      status: out.get().status,
      payload: out.get().payload
    },
    {
      status: 404,
      payload: {
        error: 'Error desde servidor de audio: 404',
        details: 'not found'
      }
    }
  );
});

test('AUDIOCTRL-005 error local conserva contrato 500', async () => {
  const out = response();

  await new Controller(service({
    reproducir: async () => {
      throw new Error('boom');
    }
  })).reproducir(out.res, '9');

  assert.deepEqual(
    {
      status: out.get().status,
      payload: out.get().payload
    },
    {
      status: 500,
      payload: {
        error: 'Error al obtener el audio',
        details: 'boom'
      }
    }
  );
});

test('AUDIOCTRL-006 verificar propaga status y json', async () => {
  const out = response();

  await new Controller(service({
    verificar: async () => ({
      status: 404,
      data: { existe: false }
    })
  })).verificar(out.res, '5');

  assert.deepEqual(
    {
      status: out.get().status,
      payload: out.get().payload
    },
    {
      status: 404,
      payload: { existe: false }
    }
  );
});

test('AUDIOCTRL-007 verificar error conserva fallback', async () => {
  const out = response();

  await new Controller(service({
    verificar: async () => {
      throw new Error('down');
    }
  })).verificar(out.res, '5');

  assert.deepEqual(
    {
      status: out.get().status,
      payload: out.get().payload
    },
    {
      status: 500,
      payload: {
        existe: false,
        error: 'down'
      }
    }
  );
});
