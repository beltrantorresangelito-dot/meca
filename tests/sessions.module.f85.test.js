const test = require('node:test');
const assert = require('node:assert/strict');
const { SessionsRepository, SessionsService, SessionsController, createSessionsHandler } =
  require('../src/modules/sessions');

test('SESSMOD-001 index exporta cuatro piezas', () => {
  assert.equal(typeof SessionsRepository, 'function');
  assert.equal(typeof SessionsService, 'function');
  assert.equal(typeof SessionsController, 'function');
  assert.equal(typeof createSessionsHandler, 'function');
});

test('SESSMOD-002 ruta ajena devuelve false', async () => {
  const handler = createSessionsHandler({ db: { query: async () => ({ rows: [] }) } });
  assert.equal(await handler({
    ruta: '/api/otra', metodo: 'GET',
    peticion: { headers: {} }, respuesta: {}, query: {}
  }), false);
});

test('SESSMOD-003 GET sin token devuelve 401', async () => {
  const handler = createSessionsHandler({ db: { query: async () => ({ rows: [] }) } });
  let status, payload;
  await handler({
    ruta: '/api/sesiones/usuarios/1', metodo: 'GET',
    peticion: { headers: {} },
    respuesta: {
      writeHead(code){ status = code; },
      end(body){ payload = JSON.parse(body); }
    }, query: {}
  });
  assert.equal(status, 401);
  assert.deepEqual(payload, { error: 'Token requerido' });
});

test('SESSMOD-004 historial inválido conserva 200', async () => {
  const handler = createSessionsHandler({ db: { query: async () => ({}) } });
  const req = { handlers:{}, headers:{}, on(e,f){ this.handlers[e]=f; } };
  let status, payload;
  const p = handler({
    ruta:'/api/historial-login', metodo:'POST',
    peticion:req,
    respuesta:{
      writeHead(code){ status=code; },
      end(body){ payload=JSON.parse(body); }
    }, query:{}
  });
  req.handlers.data('{'); req.handlers.end();
  await p;
  assert.equal(status, 200);
  assert.equal(payload.success, false);
});
