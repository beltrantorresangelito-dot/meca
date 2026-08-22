const test = require('node:test');
const assert = require('node:assert/strict');
const { createMatrixReadHandler } = require('../src/modules/matrix');

function fakeService(overrides = {}) {
  return {
    getEvaluationActiveVersion: async () => ({
      id: 4,
      version: 'v2.0.0',
      activa: true
    }),
    getActiveVersion: async () => ({
      id: 4,
      version: 'v2.0.0',
      activa: true
    }),
    getVersionByDate: async () => ({
      id: 4,
      version: 'v2.0.0'
    }),
    getStructure: async () => ({
      version: { id: 4, version: 'v2.0.0' },
      frentes: []
    }),
    listVersions: async () => [
      { id: 4, version: 'v2.0.0' }
    ],
    getEvaluationRulesByVersion: async () => [
      { id: 3, version_id: 4 }
    ],
    ...overrides
  };
}

function response() {
  return {
    status: null,
    body: null,
    writeHead(status) {
      this.status = status;
    },
    end(body) {
      this.body = body ? JSON.parse(body) : null;
    }
  };
}

const req = {
  headers: {
    authorization: 'Bearer test-token'
  }
};

test('MATRIXROUTE-001 rutas no Matrix no son capturadas', async () => {
  const handler = createMatrixReadHandler({
    service: fakeService()
  });

  const handled = await handler({
    ruta: '/api/usuarios',
    metodo: 'GET',
    peticion: req,
    respuesta: response(),
    query: {}
  });

  assert.equal(handled, false);
});

test('MATRIXROUTE-002 captura las seis lecturas consolidadas', async () => {
  const handler = createMatrixReadHandler({
    service: fakeService()
  });

  const cases = [
    ['/api/evaluacion/version-activa', {}],
    ['/api/matriz/versiones/activa', {}],
    ['/api/matriz/versiones/por-fecha', { fecha: '2026-08-22' }],
    ['/api/matriz/versiones/4/estructura', {}],
    ['/api/matriz/versiones', {}],
    ['/api/reglas-evaluacion/version/4', {}]
  ];

  for (const [ruta, query] of cases) {
    const res = response();
    const handled = await handler({
      ruta,
      metodo: 'GET',
      peticion: req,
      respuesta: res,
      query
    });

    assert.equal(handled, true, ruta);
    assert.equal(res.status, 200, ruta);
  }
});

test('MATRIXROUTE-003 conserva 401 sin token', async () => {
  const handler = createMatrixReadHandler({
    service: fakeService()
  });

  const res = response();

  await handler({
    ruta: '/api/matriz/versiones',
    metodo: 'GET',
    peticion: { headers: {} },
    respuesta: res,
    query: {}
  });

  assert.equal(res.status, 401);
  assert.equal(res.body.error, 'Token requerido');
});

test('MATRIXROUTE-004 conserva contratos especiales', async () => {
  const handler = createMatrixReadHandler({
    service: fakeService({
      getActiveVersion: async () => null,
      getVersionByDate: async () => null
    })
  });

  let res = response();
  await handler({
    ruta: '/api/matriz/versiones/activa',
    metodo: 'GET',
    peticion: req,
    respuesta: res,
    query: {}
  });
  assert.equal(res.status, 404);
  assert.equal(res.body.error, 'No hay versión activa');

  res = response();
  await handler({
    ruta: '/api/matriz/versiones/por-fecha',
    metodo: 'GET',
    peticion: req,
    respuesta: res,
    query: {}
  });
  assert.equal(res.status, 400);
  assert.equal(res.body.error, 'Fecha requerida');
});
