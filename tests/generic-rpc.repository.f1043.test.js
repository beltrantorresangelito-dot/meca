const test = require('node:test');
const assert = require('node:assert/strict');

const Repository =
  require('../src/modules/generic-rpc/generic-rpc.repository');

test('RPCREPO-001 closeMonth conserva SQL y fallbacks', async () => {
  let sql;
  let params;

  const repo = new Repository({
    async query(q,p) {
      sql = String(q);
      params = p;

      return {
        rows: [{
          resultado: {
            ok: true
          }
        }]
      };
    }
  });

  const result =
    await repo.closeMonth({
      p_anio: 2026,
      p_mes: 8
    });

  assert.match(
    sql,
    /SELECT cerrar_mes\(\$1, \$2, \$3\) as resultado/
  );

  assert.deepEqual(
    params,
    [2026, 8, 'admin']
  );

  assert.deepEqual(
    result,
    { ok: true }
  );
});

test('RPCREPO-002 closeMonth prefiere anio/mes directos', async () => {
  let params;

  const repo = new Repository({
    async query(q,p) {
      params = p;
      return {
        rows: [{ resultado: true }]
      };
    }
  });

  await repo.closeMonth({
    anio: 2025,
    mes: 12,
    p_anio: 2026,
    p_mes: 1,
    p_usuario: 'angel'
  });

  assert.deepEqual(
    params,
    [2025, 12, 'angel']
  );
});

test('RPCREPO-003 closeExpiredSessions conserva ventana 30 minutos', async () => {
  let sql;

  const repo = new Repository({
    async query(q) {
      sql = String(q);
      return {
        rowCount: 4
      };
    }
  });

  const result =
    await repo.closeExpiredSessions();

  assert.match(
    sql,
    /UPDATE sesiones_activas/
  );

  assert.match(
    sql,
    /ultima_actividad < NOW\(\) - INTERVAL '30 minutes'/
  );

  assert.deepEqual(
    result,
    { limpiadas: 4 }
  );
});

test('RPCREPO-004 callFunction con params genera placeholders', async () => {
  let sql;
  let params;

  const repo = new Repository({
    async query(q,p) {
      sql = String(q);
      params = p;

      return {
        rows: [{ ok: 1 }]
      };
    }
  });

  const rows =
    await repo.callFunction(
      'mi_funcion',
      {
        a: 1,
        b: 2
      }
    );

  assert.equal(
    sql,
    'SELECT * FROM mi_funcion($1, $2)'
  );

  assert.deepEqual(
    params,
    [1,2]
  );

  assert.deepEqual(
    rows,
    [{ ok: 1 }]
  );
});

test('RPCREPO-005 callFunction sin params usa parentesis vacíos', async () => {
  let sql;

  const repo = new Repository({
    async query(q) {
      sql = String(q);

      return {
        rows: []
      };
    }
  });

  await repo.callFunction(
    'mi_funcion'
  );

  assert.equal(
    sql,
    'SELECT * FROM mi_funcion()'
  );
});
