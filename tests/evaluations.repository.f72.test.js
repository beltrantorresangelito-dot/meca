const test = require('node:test');
const assert = require('node:assert/strict');
const EvaluationsRepository =
  require('../src/modules/evaluations/evaluations.repository');

test('EVALREPO-001 list conserva filtros y orden', async () => {
  let call;
  const repo = new EvaluationsRepository({
    async query(sql, params) {
      call = { sql: String(sql), params };
      return { rows: [] };
    }
  });

  await repo.list({
    agente: 'A',
    evaluador: 'E',
    ticket: 'T',
    limite: '10'
  });

  assert.match(call.sql, /FROM evaluaciones WHERE 1=1/);
  assert.match(call.sql, /agente = \$1/);
  assert.match(call.sql, /evaluador = \$2/);
  assert.match(call.sql, /ticket_psi = \$3/);
  assert.match(call.sql, /ORDER BY timestamp DESC/);
  assert.match(call.sql, /LIMIT \$4/);
  assert.deepEqual(call.params, ['A', 'E', 'T', 10]);
});

test('EVALREPO-002 saveWithDetails conserva BEGIN COMMIT release', async () => {
  const calls = [];

  const client = {
    async query(sql) {
      calls.push(String(sql).trim());
      return { rows: [], rowCount: 1 };
    },
    release() {
      calls.push('RELEASE');
    }
  };

  const repo = new EvaluationsRepository({
    async connect() {
      return client;
    }
  });

  const result = await repo.saveWithDetails({
    id: '1',
    timestamp: 1,
    fecha: '2026-01-01',
    fechaFormateada: '01/01/2026',
    ticketPSI: 'T1',
    agente: 'A',
    evaluador: 'E',
    idLlamada: 'L',
    totalENC: 1,
    totalECUF: 2,
    totalECN: 3,
    notaFinal: 6,
    rango: 'X',
    tiempoAuditoria: 10,
    tiempoAuditoriaFormateado: '00:10',
    fechaRegistro: '2026-01-01',
    detalles: [
      {
        bloque: 'ENC',
        atributo: 'ATR',
        submotivo: 'SUB',
        peso: 1,
        cumple: true
      }
    ]
  });

  assert.deepEqual(result, { success: true });
  assert.equal(calls[0], 'BEGIN');
  assert.ok(calls.some(x => /INSERT INTO evaluaciones/.test(x)));
  assert.ok(calls.some(x => /INSERT INTO detalles_evaluacion/.test(x)));
  assert.ok(calls.includes('COMMIT'));
  assert.equal(calls.at(-1), 'RELEASE');
});

test('EVALREPO-003 saveWithDetails hace ROLLBACK ante error', async () => {
  const calls = [];

  const client = {
    async query(sql) {
      const text = String(sql).trim();
      calls.push(text);

      if (/INSERT INTO evaluaciones/.test(text)) {
        throw new Error('boom');
      }

      return { rows: [] };
    },
    release() {
      calls.push('RELEASE');
    }
  };

  const repo = new EvaluationsRepository({
    async connect() {
      return client;
    }
  });

  await assert.rejects(
    repo.saveWithDetails({ id: '1' }),
    /boom/
  );

  assert.ok(calls.includes('ROLLBACK'));
  assert.equal(calls.at(-1), 'RELEASE');
});

test('EVALREPO-004 detalle sin submotivo se omite', async () => {
  let called = false;

  const repo = new EvaluationsRepository({});

  const inserted = await repo.insertDetail(
    {
      async query() {
        called = true;
      }
    },
    'E1',
    { submotivo: '' }
  );

  assert.equal(inserted, false);
  assert.equal(called, false);
});

test('EVALREPO-005 delete conserva orden detalle antes que cabecera', async () => {
  const calls = [];

  const client = {
    async query(sql) {
      calls.push(String(sql).trim());
      return { rowCount: 1 };
    },
    release() {
      calls.push('RELEASE');
    }
  };

  const repo = new EvaluationsRepository({
    async connect() {
      return client;
    }
  });

  await repo.deleteById('E1');

  const detail = calls.findIndex(x =>
    x.includes('DELETE FROM detalles_evaluacion')
  );
  const header = calls.findIndex(x =>
    x.includes('DELETE FROM evaluaciones')
  );

  assert.ok(detail >= 0);
  assert.ok(header >= 0);
  assert.ok(detail < header);
});

test('EVALREPO-006 findByTicket conserva contrato', async () => {
  let call;

  const repo = new EvaluationsRepository({
    async query(sql, params) {
      call = { sql: String(sql), params };
      return {
        rows: [{
          id: '1',
          ticket_psi: 'T1'
        }]
      };
    }
  });

  const row = await repo.findByTicket('T1');

  assert.equal(row.ticket_psi, 'T1');
  assert.match(call.sql, /LIMIT 1/);
  assert.deepEqual(call.params, ['T1']);
});

test('EVALREPO-007 listDetails filtra por evaluacion_id', async () => {
  let call;

  const repo = new EvaluationsRepository({
    async query(sql, params) {
      call = { sql: String(sql), params };
      return { rows: [] };
    }
  });

  await repo.listDetails('E1');

  assert.match(
    call.sql,
    /detalles_evaluacion WHERE evaluacion_id = \$1/
  );
  assert.deepEqual(call.params, ['E1']);
});
