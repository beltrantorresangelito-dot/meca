const test = require('node:test');
const assert = require('node:assert/strict');

const {
  MatrixRecalculationRepository,
  MatrixRecalculationService,
  MatrixRecalculationController,
  createMatrixRecalculationHandler
} = require('../src/modules/matrix-recalculation');

test('RECALCMOD-001 index exporta cuatro piezas', () => {
  assert.equal(typeof MatrixRecalculationRepository, 'function');
  assert.equal(typeof MatrixRecalculationService, 'function');
  assert.equal(typeof MatrixRecalculationController, 'function');
  assert.equal(typeof createMatrixRecalculationHandler, 'function');
});

test('RECALCMOD-002 ruta ajena devuelve false', async () => {
  const handler = createMatrixRecalculationHandler({
    db: { query: async () => ({ rows: [] }) }
  });

  const result = await handler({
    ruta: '/api/otra',
    metodo: 'POST',
    peticion: { headers: {} },
    respuesta: {}
  });

  assert.equal(result, false);
});

test('RECALCMOD-003 sin token devuelve 401', async () => {
  const handler = createMatrixRecalculationHandler({
    db: { query: async () => ({ rows: [] }) }
  });

  let status;
  let payload;

  await handler({
    ruta: '/api/matriz/recalcular',
    metodo: 'POST',
    peticion: { headers: {} },
    respuesta: {
      writeHead(code) { status = code; },
      end(body) { payload = JSON.parse(body); }
    }
  });

  assert.equal(status, 401);
  assert.deepEqual(payload, { error: 'Token requerido' });
});

test('RECALCMOD-004 con token ejecuta recálculo y devuelve 200', async () => {
  const db = {
    async query(sql) {
      const q = String(sql);

      if (q.includes('SELECT d.id')) return { rows: [] };
      if (q.includes('SELECT DISTINCT evaluacion_id')) return { rows: [] };
      if (q.includes('COUNT(*) as total_evaluaciones')) {
        return {
          rows: [{
            total_evaluaciones: '0',
            promedio_notas: null,
            nota_min: null,
            nota_max: null
          }]
        };
      }

      return { rows: [] };
    }
  };

  const handler = createMatrixRecalculationHandler({ db });

  let status;
  let payload;

  await handler({
    ruta: '/api/matriz/recalcular',
    metodo: 'POST',
    peticion: {
      headers: {
        authorization: 'Bearer token'
      }
    },
    respuesta: {
      writeHead(code) { status = code; },
      end(body) { payload = JSON.parse(body); }
    }
  });

  assert.equal(status, 200);
  assert.equal(payload.success, true);
});
