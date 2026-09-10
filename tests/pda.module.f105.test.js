const test = require('node:test');
const assert = require('node:assert/strict');
const {
  PdaRepository,
  PdaService,
  PdaController,
  createPdaHandler
} = require('../src/modules/pda');

test('PDAMOD-001 index exporta cuatro piezas', () => {
  assert.equal(typeof PdaRepository, 'function');
  assert.equal(typeof PdaService, 'function');
  assert.equal(typeof PdaController, 'function');
  assert.equal(typeof createPdaHandler, 'function');
});

test('PDAMOD-002 ruta ajena devuelve false', async () => {
  const handler = createPdaHandler({
    db: { query: async () => ({ rows: [] }) }
  });

  assert.equal(await handler({
    ruta: '/api/otra',
    metodo: 'GET',
    peticion: { headers: {} },
    respuesta: {}
  }), false);
});

test('PDAMOD-003 pendientes sin token devuelve 401', async () => {
  const handler = createPdaHandler({
    db: { query: async () => ({ rows: [] }) }
  });

  let status;
  let payload;

  await handler({
    ruta: '/api/pda/pendientes',
    metodo: 'GET',
    peticion: { headers: {} },
    respuesta: {
      writeHead(code) { status = code; },
      end(body) { payload = JSON.parse(body); }
    }
  });

  assert.equal(status, 401);
  assert.deepEqual(payload, { error: 'Token requerido' });
});

test('PDAMOD-004 detalle conserva id de ruta', async () => {
  const seen = [];

  const handler = createPdaHandler({
    db: {
      async query(sql, params) {
        seen.push(params || []);

        const normalizedSql =
          String(sql)
            .replace(/\s+/g, ' ')
            .trim();

        if (
          normalizedSql.includes(
            'FROM pda_cabecera WHERE id = $1'
          )
        ) {
          return {
            rows: [
              {
                id: '15'
              }
            ]
          };
        }

        if (
          normalizedSql.includes(
            'FROM pda_acciones WHERE pda_id = $1'
          )
        ) {
          return {
            rows: []
          };
        }

        if (
          normalizedSql.includes(
            'FROM pda_ciclos_evaluacion'
          )
        ) {
          return {
            rows: []
          };
        }

        if (
          normalizedSql.includes(
            'FROM pda_documentos'
          )
        ) {
          return {
            rows: []
          };
        }

        return { rows: [] };
      }
    }
  });

  let status;

  await handler({
    ruta: '/api/pda/15',
    metodo: 'GET',
    peticion: {
      headers: { authorization: 'Bearer token' }
    },
    respuesta: {
      writeHead(code) { status = code; },
      end() { }
    }
  });

  assert.equal(status, 200);
  assert.ok(seen.some(params => params[0] === '15'));
});

test('PDAMOD-005 exportar conserva 200', async () => {
  const handler = createPdaHandler({
    db: { async query() { return { rows: [] }; } }
  });

  let status;

  const handled = await handler({
    ruta: '/api/pda/exportar',
    metodo: 'GET',
    peticion: {
      headers: { authorization: 'Bearer token' }
    },
    respuesta: {
      writeHead(code) { status = code; },
      end() { }
    }
  });

  assert.equal(handled, true);
  assert.equal(status, 200);
});
