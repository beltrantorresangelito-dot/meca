const test = require('node:test');
const assert = require('node:assert/strict');
const { registerDomainRoutes } = require('../src/modules/domain/domain.routes');

function service(overrides = {}) {
  return {
    listBreaks: async () => [{ id: 1, codigo: 'COBRANZAS' }],
    listCampaigns: async () => [{ id: 2, codigo: 'TEMPRANA' }],
    listMatrices: async () => [{ id: 3, codigo: 'MATRIZ_COBRANZAS' }],
    getCampaignMatrixHistory: async () => [],
    resolveContext: async () => ({ quiebre_codigo: 'COBRANZAS' }),
    validateConsistency: async () => ({ ok: true, checks: {}, violations: [] }),
    ...overrides
  };
}

function response() {
  return {
    status: null,
    headers: null,
    body: null,
    writeHead(status, headers) {
      this.status = status;
      this.headers = headers;
    },
    end(body) {
      this.body = body ? JSON.parse(body) : null;
    }
  };
}

test('DOMAPI-001 registra seis endpoints GET sin tocar rutas existentes', () => {
  const routes = { '/api/legacy': { GET: () => {} } };
  const paths = registerDomainRoutes(routes, { service: service() });

  assert.equal(paths.length, 6);
  assert.equal(typeof routes['/api/domain/quiebres'].GET, 'function');
  assert.equal(typeof routes['/api/domain/contexto-evaluacion'].GET, 'function');
  assert.equal(typeof routes['/api/legacy'].GET, 'function');
});

test('DOMAPI-002 exige autenticación en endpoints de dominio', async () => {
  const routes = {};
  registerDomainRoutes(routes, { service: service() });
  const res = response();

  await routes['/api/domain/quiebres'].GET({}, res, {});

  assert.equal(res.status, 401);
  assert.equal(res.body.error, 'Token requerido');
});

test('DOMAPI-003 lista quiebres con contrato JSON 200', async () => {
  const routes = {};
  registerDomainRoutes(routes, { service: service() });
  const res = response();

  await routes['/api/domain/quiebres'].GET({ auth: { id: 1 } }, res, {});

  assert.equal(res.status, 200);
  assert.deepEqual(res.body, [{ id: 1, codigo: 'COBRANZAS' }]);
});

test('DOMAPI-004 campanas exige quiebreId y traduce validación a 400', async () => {
  const routes = {};
  registerDomainRoutes(routes, {
    service: service({
      listCampaigns: async (id) => {
        if (!id) {
          const e = new Error('quiebreId debe ser un entero positivo');
          e.code = 'VALIDATION_ERROR';
          throw e;
        }
        return [];
      }
    })
  });
  const res = response();

  await routes['/api/domain/campanas'].GET({ auth: { id: 1 } }, res, {});

  assert.equal(res.status, 400);
  assert.equal(res.body.code, 'VALIDATION_ERROR');
});

test('DOMAPI-005 contexto pasa campanaId y fecha al Service', async () => {
  let received = null;
  const routes = {};
  registerDomainRoutes(routes, {
    service: service({
      resolveContext: async (input) => {
        received = input;
        return { ok: true };
      }
    })
  });
  const res = response();

  await routes['/api/domain/contexto-evaluacion'].GET(
    { auth: { id: 1 } },
    res,
    { campanaId: '7', fecha: '2026-08-22' }
  );

  assert.equal(res.status, 200);
  assert.deepEqual(received, { campaignId: '7', date: '2026-08-22' });
});

test('DOMAPI-006 consistencia devuelve 409 si hay violaciones', async () => {
  const routes = {};
  registerDomainRoutes(routes, {
    service: service({
      validateConsistency: async () => ({
        ok: false,
        checks: { versiones_sin_matriz: 1 },
        violations: [{ check: 'versiones_sin_matriz', count: 1 }]
      })
    })
  });
  const res = response();

  await routes['/api/domain/consistencia'].GET({ auth: { id: 1 } }, res, {});

  assert.equal(res.status, 409);
  assert.equal(res.body.ok, false);
});
