const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ListeningsRepository =
  require('../src/modules/listenings/listenings.repository');

test('LISTREPO-001 duplicado usa ticket+tarea', async () => {
  let call;
  const repo = new ListeningsRepository({
    async query(sql, params) {
      call = { sql: String(sql), params };
      return { rows: [{ id: 1 }] };
    }
  });

  assert.equal(await repo.assignmentExists('T1', 7), true);
  assert.match(call.sql, /ticket = \$1 AND tarea_id = \$2/);
  assert.deepEqual(call.params, ['T1', 7]);
});

test('LISTREPO-002 insert assignment conserva estado pendiente', async () => {
  let params;
  const repo = new ListeningsRepository({
    async query(_sql, p) {
      params = p;
      return { rows: [{ id: 'A1' }] };
    }
  });

  await repo.insertAssignment({ id: 'A1', tarea_id: 2, ticket: 'T' });
  assert.equal(params[16], 'pendiente');
});

test('LISTREPO-003 lote reciente conserva ventana 5 minutos', async () => {
  let sql;
  const repo = new ListeningsRepository({
    async query(q) {
      sql = String(q);
      return { rows: [] };
    }
  });

  await repo.findRecentTaskByFilename('x.xlsx');
  assert.match(sql, /INTERVAL '5 minutes'/);
  assert.match(sql, /LIMIT 1/);
});

test('LISTREPO-004 transacción hace commit', async () => {
  const calls = [];
  let released = false;
  const client = {
    async query(sql) {
      calls.push(String(sql));
      return { rows: [] };
    },
    release() { released = true; }
  };
  const repo = new ListeningsRepository({
    async connect() { return client; }
  });

  assert.equal(await repo.withTransaction(async () => 9), 9);
  assert.deepEqual(calls, ['BEGIN', 'COMMIT']);
  assert.equal(released, true);
});

test('LISTREPO-005 transacción hace rollback', async () => {
  const calls = [];
  const client = {
    async query(sql) {
      calls.push(String(sql));
      return { rows: [] };
    },
    release() {}
  };
  const repo = new ListeningsRepository({
    async connect() { return client; }
  });

  await assert.rejects(
    repo.withTransaction(async () => {
      throw new Error('boom');
    }),
    /boom/
  );

  assert.deepEqual(calls, ['BEGIN', 'ROLLBACK']);
});

test('LISTREPO-006 mis escuchas conserva filtros', async () => {
  let sql;
  const repo = new ListeningsRepository({
    async query(q) {
      sql = String(q);
      return { rows: [] };
    }
  });

  await repo.listMyListenings('aud1');
  assert.match(sql, /audio_disponible = true/);
  assert.match(sql, /estado IN \('pendiente', 'en_proceso'\)/);
});

test('LISTREPO-007 estados legacy permanecen', async () => {
  const sqls = [];
  const repo = new ListeningsRepository({
    async query(q) {
      sqls.push(String(q));
      return { rows: [] };
    }
  });

  await repo.startListening('1');
  await repo.markManaged('1');
  await repo.cancelManagement('1');
  await repo.reactivateByTicket('T');

  assert.match(sqls[0], /en_proceso/);
  assert.match(sqls[1], /gestionado/);
  assert.match(sqls[2], /pendiente/);
  assert.match(sqls[3], /pendiente/);
});

test('LISTREPO-008 incidencia conserva audio y fecha', async () => {
  let sql;
  const repo = new ListeningsRepository({
    async query(q) {
      sql = String(q);
      return { rows: [] };
    }
  });

  await repo.reportIncident('1', 'sin audio');
  assert.match(sql, /audio_disponible = false/);
  assert.match(sql, /fecha_incidencia = NOW\(\)/);
});

test('LISTREPO-009 tickets por lote usa tarea_id y orden DESC', async () => {
  let call;
  const repo = new ListeningsRepository({
    async query(sql, params) {
      call = { sql: String(sql), params };
      return { rows: [] };
    }
  });

  await repo.listTicketsByTask(99);
  assert.match(call.sql, /WHERE tarea_id = \$1/);
  assert.match(call.sql, /ORDER BY id DESC/);
  assert.deepEqual(call.params, [99]);
});

test('LISTREPO-010 repository queda encapsulado por ListeningsModule en F5.5', () => {
  const indexSource = fs.readFileSync(
    path.resolve(__dirname, '../src/modules/listenings/index.js'),
    'utf8'
  );

  const serverSource = fs.readFileSync(
    path.resolve(__dirname, '../server.js'),
    'utf8'
  );

  assert.match(indexSource, /ListeningsRepository/);
  assert.match(indexSource, /createListeningsHandler/);
  assert.match(serverSource, /createListeningsHandler/);
  assert.doesNotMatch(serverSource, /new ListeningsRepository/);
});
