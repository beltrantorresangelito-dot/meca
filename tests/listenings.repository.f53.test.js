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
  assert.match(call.sql,/ticket = \$1\s+AND tarea_id = \$2/);
  assert.deepEqual(call.params, ['T1', 7]);
});

test(
  'LISTREPO-002 insert assignment conserva estado pendiente',
  async () => {
    let call;

    const repo = new ListeningsRepository({
      async query(sql, params) {
        call = {
          sql: String(sql),
          params
        };

        return {
          rows: [{ id: 'A1' }]
        };
      }
    });

    await repo.insertAssignment({
      id: 'A1',
      tarea_id: 2,
      ticket: 'T',
      estado: 'pendiente'
    });

    assert.match(
      call.sql,
      /estado/
    );

    assert.ok(
      call.params.includes('pendiente'),
      'El INSERT debe conservar el estado pendiente'
    );
  }
);

test(
  'LISTREPO-003 lote reciente conserva ventana 5 minutos y versión de plantilla',
  async () => {
    let call;

    const repo = new ListeningsRepository({
      async query(sql, params) {
        call = {
          sql: String(sql),
          params
        };

        return {
          rows: []
        };
      }
    });

    await repo.findRecentTaskByFilename(
      'x.xlsx',
      1
    );

    assert.match(
      call.sql,
      /INTERVAL '5 minutes'/
    );

    assert.match(
      call.sql,
      /version_plantilla_carga_id = \$2/
    );

    assert.match(
      call.sql,
      /LIMIT 1/
    );

    assert.deepEqual(
      call.params,
      ['x.xlsx', 1]
    );
  }
);

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
      const sql = String(q);
      sqls.push(sql);

      if (/UPDATE asignaciones_escucha/i.test(sql)) {
        return {
          rowCount: 1,
          rows: [{ id: '1' }]
        };
      }

      return {
        rowCount: 0,
        rows: []
      };
    }
  });

  await repo.startListening('1');
  await repo.markManaged('1');
  await repo.cancelManagement('1');
  await repo.reactivateByTicket('T');

  assert.match(
    sqls[0],
    /en_proceso/
  );

  assert.match(
    sqls[1],
    /gestionado/
  );

  assert.match(
    sqls[2],
    /pendiente/
  );

  assert.match(
    sqls[3],
    /pendiente/
  );
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

test(
  'LISTREPO-011 obtiene escucha exacta por id con executor',
  async () => {
    let llamada = null;

    const executor = {
      async query(sql, params) {
        llamada = {
          sql: String(sql),
          params
        };

        return {
          rows: [
            {
              id: '123',
              ticket: 'TICKET-123',
              campana_id: 1,
              quiebre_id: 1,
              auditor_asignado: 'AUDITOR TEST',
              estado: 'en_proceso'
            }
          ]
        };
      }
    };

    const repo = new ListeningsRepository({
      async query() {
        throw new Error(
          'No debe utilizar db.query'
        );
      }
    });

    const resultado =
      await repo.getAssignmentById(
        '123',
        executor
      );

    assert.equal(
      resultado.id,
      '123'
    );

    assert.equal(
      resultado.ticket,
      'TICKET-123'
    );

    assert.match(
      llamada.sql,
      /FROM asignaciones_escucha/
    );

    assert.match(
      llamada.sql,
      /WHERE id = \$1/
    );

    assert.deepEqual(
      llamada.params,
      ['123']
    );
  }
);

test(
  'LISTREPO-012 resuelve dominio con campaña usando resolver campaña',
  async () => {
    let llamada = null;

    const repo = new ListeningsRepository({
      async query(sql, params) {
        llamada = {
          sql: String(sql),
          params
        };

        return {
          rows: [
            {
              quiebre_id: 1,
              quiebre_codigo: 'COBRANZAS',
              quiebre_nombre: 'Cobranzas',
              campana_id: 2,
              campana_codigo: 'ST',
              campana_descripcion: 'Super Temprana'
            }
          ]
        };
      }
    });

    const resultado =
      await repo.resolveListeningDomain(
        'COBRANZAS',
        'ST'
      );

    assert.match(
      llamada.sql,
      /resolver_contexto_carga_escucha\(\$1,\s*\$2\)/
    );

    assert.doesNotMatch(
      llamada.sql,
      /resolver_contexto_carga_escucha_quiebre/
    );

    assert.deepEqual(
      llamada.params,
      ['COBRANZAS', 'ST']
    );

    assert.equal(
      resultado.quiebre_id,
      1
    );

    assert.equal(
      resultado.campana_id,
      2
    );
  }
);

test(
  'LISTREPO-013 resuelve dominio directo por quiebre cuando campaña está vacía',
  async () => {
    let llamada = null;

    const repo = new ListeningsRepository({
      async query(sql, params) {
        llamada = {
          sql: String(sql),
          params
        };

        return {
          rows: [
            {
              quiebre_id: 1,
              quiebre_codigo: 'COBRANZAS',
              quiebre_nombre: 'Cobranzas',
              campana_id: null,
              campana_codigo: null,
              campana_descripcion: null
            }
          ]
        };
      }
    });

    const resultado =
      await repo.resolveListeningDomain(
        'COBRANZAS',
        ''
      );

    assert.match(
      llamada.sql,
      /resolver_contexto_carga_escucha_quiebre\(\$1\)/
    );

    assert.doesNotMatch(
      llamada.sql,
      /resolver_contexto_carga_escucha\(\$1,\s*\$2\)/
    );

    assert.deepEqual(
      llamada.params,
      ['COBRANZAS']
    );

    assert.equal(
      resultado.quiebre_id,
      1
    );

    assert.equal(
      resultado.campana_id,
      null
    );

    assert.equal(
      resultado.campana_codigo,
      null
    );
  }
);