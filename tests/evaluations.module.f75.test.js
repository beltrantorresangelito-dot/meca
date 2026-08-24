const test = require('node:test');
const assert = require('node:assert/strict');

const {
  EvaluationsRepository,
  EvaluationsService,
  EvaluationsController,
  createEvaluationsHandler
} = require('../src/modules/evaluations');

test('EVALMOD-001 index exporta cuatro piezas', () => {
  assert.equal(typeof EvaluationsRepository, 'function');
  assert.equal(typeof EvaluationsService, 'function');
  assert.equal(typeof EvaluationsController, 'function');
  assert.equal(typeof createEvaluationsHandler, 'function');
});

test('EVALMOD-002 ruta ajena devuelve false', async () => {
  const handler = createEvaluationsHandler({
    db: { query: async () => ({ rows: [] }) }
  });

  assert.equal(
    await handler({
      ruta: '/api/otra',
      metodo: 'GET',
      peticion: { on() {} },
      respuesta: {},
      query: {}
    }),
    false
  );
});

test('EVALMOD-003 GET evaluaciones usa query params', async () => {
  let call;

  const handler = createEvaluationsHandler({
    db: {
      async query(sql, params) {
        call = {
          sql: String(sql),
          params
        };

        return { rows: [] };
      }
    }
  });

  let status;
  let payload;

  await handler({
    ruta: '/api/evaluaciones',
    metodo: 'GET',
    peticion: {},
    respuesta: {
      writeHead(code) {
        status = code;
      },
      end(body) {
        payload = JSON.parse(body);
      }
    },
    query: {
      agente: 'A',
      ticket: 'T'
    }
  });

  assert.equal(status, 200);
  assert.deepEqual(payload, []);
  assert.match(call.sql, /agente = \$1/);
  assert.match(call.sql, /ticket_psi = \$2/);
});

test('EVALMOD-004 validar-ticket conserva null', async () => {
  const handler = createEvaluationsHandler({
    db: {
      async query() {
        return { rows: [] };
      }
    }
  });

  let status;
  let payload;

  await handler({
    ruta: '/api/evaluaciones/validar-ticket',
    metodo: 'GET',
    peticion: {},
    respuesta: {
      writeHead(code) {
        status = code;
      },
      end(body) {
        payload = JSON.parse(body);
      }
    },
    query: { ticket: 'T1' }
  });

  assert.equal(status, 200);
  assert.equal(payload, null);
});

test('EVALMOD-005 POST JSON inválido devuelve 400', async () => {
  const handler = createEvaluationsHandler({
    db: {
      async connect() {
        throw new Error('no debería llegar');
      }
    }
  });

  let status;
  let payload;

  const req = {
    handlers: {},
    on(event, handlerFn) {
      this.handlers[event] = handlerFn;
    }
  };

  const promise = handler({
    ruta: '/api/evaluaciones',
    metodo: 'POST',
    peticion: req,
    respuesta: {
      writeHead(code) {
        status = code;
      },
      end(body) {
        payload = JSON.parse(body);
      }
    },
    query: {}
  });

  req.handlers.data('{');
  req.handlers.end();

  await promise;

  assert.equal(status, 400);
  assert.ok(payload.error);
});
