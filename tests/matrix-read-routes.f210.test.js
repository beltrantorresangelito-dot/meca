const test = require('node:test');
const assert = require('node:assert/strict');
const { createMatrixReadHandler } = require('../src/modules/matrix');

function service(overrides = {}) {
  return {
    listFrentes: async () => [{ id: 1, codigo: 'ENC' }],
    listAtributos: async () => [{ id: 2, frente_id: 1 }],
    listSubMotivos: async () => [{ id: 3, atributo_id: 2 }],
    listEvaluationRulesAdmin: async () => [{ id: 4 }],
    getEvaluationActiveVersion: async () => ({ version: 'v2.0.0', activa: true }),
    getActiveVersion: async () => ({ id: 4, version: 'v2.0.0' }),
    getVersionByDate: async () => ({ id: 4 }),
    getStructure: async () => ({ version: { version: 'v2.0.0' }, frentes: [] }),
    listVersions: async () => [],
    getEvaluationRulesByVersion: async () => [],
    ...overrides
  };
}

function res() {
  return {
    status: null,
    body: null,
    writeHead(status) { this.status = status; },
    end(body) { this.body = body ? JSON.parse(body) : null; }
  };
}

const req = { headers: { authorization: 'Bearer test' } };

test('MATRIXREADROUTE-001 captura cuatro lecturas nuevas', async () => {
  const handler = createMatrixReadHandler({ service: service() });

  for (const [ruta, query] of [
    ['/api/matriz/frentes', {}],
    ['/api/matriz/atributos', { frente_id: '1' }],
    ['/api/matriz/sub-motivos', { atributo_id: '2' }],
    ['/api/reglas-evaluacion', {}]
  ]) {
    const response = res();
    const handled = await handler({
      ruta,
      metodo: 'GET',
      peticion: req,
      respuesta: response,
      query
    });

    assert.equal(handled, true, ruta);
    assert.equal(response.status, 200, ruta);
    assert.ok(Array.isArray(response.body), ruta);
  }
});

test('MATRIXREADROUTE-002 atributos y submotivos pasan filtros al service', async () => {
  let frente = null;
  let atributo = null;

  const handler = createMatrixReadHandler({
    service: service({
      listAtributos: async id => { frente = id; return []; },
      listSubMotivos: async id => { atributo = id; return []; }
    })
  });

  await handler({
    ruta: '/api/matriz/atributos',
    metodo: 'GET',
    peticion: req,
    respuesta: res(),
    query: { frente_id: '10' }
  });

  await handler({
    ruta: '/api/matriz/sub-motivos',
    metodo: 'GET',
    peticion: req,
    respuesta: res(),
    query: { atributo_id: '20' }
  });

  assert.equal(frente, '10');
  assert.equal(atributo, '20');
});

test('MATRIXREADROUTE-003 reglas admin conserva 500 + [] ante error', async () => {
  const handler = createMatrixReadHandler({
    service: service({
      listEvaluationRulesAdmin: async () => {
        throw new Error('DB');
      }
    })
  });

  const response = res();

  await handler({
    ruta: '/api/reglas-evaluacion',
    metodo: 'GET',
    peticion: req,
    respuesta: response,
    query: {}
  });

  assert.equal(response.status, 500);
  assert.deepEqual(response.body, []);
});
