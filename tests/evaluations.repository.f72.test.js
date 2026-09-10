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

          frente_id: 1,
          atributo_id: 1,
          criterio_id: 1,

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

test(
  'EVALREPO-008 rollback si falla gestión de escucha',
  async () => {
    const calls = [];
    let released = false;

    const client = {
      async query(sql, params) {
        const text = String(sql);

        calls.push({
          sql: text,
          params
        });

        return {
          rowCount: 1,
          rows: [{ id: '1' }]
        };
      },

      release() {
        released = true;
      }
    };

    const db = {
      async connect() {
        return client;
      }
    };

    const repo = new EvaluationsRepository(db);

    /*
     * La escucha existe y pertenece al mismo ticket.
     * También verificamos que se utilice exactamente
     * el mismo client de la transacción.
     */
    repo.listeningsRepository.getAssignmentById =
      async (id, executor) => {
        assert.equal(id, '999');
        assert.equal(executor, client);

        return {
          id: '999',
          ticket: 'T-1',
          estado: 'en_proceso'
        };
      };

    /*
     * Simulamos que la gestión de la escucha falla
     * después de haber insertado evaluación y detalles.
     */
    repo.listeningsRepository.markManaged =
      async (id, executor) => {
        assert.equal(id, '999');
        assert.equal(executor, client);

        throw new Error(
          'Escucha 999 no encontrada'
        );
      };

    const evaluacion = {
      id: '1001',
      timestamp: Date.now(),

      fecha: '2026-09-01',
      fechaFormateada: '01/09/2026',

      ticketPSI: 'T-1',
      agente: 'AGENTE TEST',
      evaluador: 'AUDITOR TEST',

      idLlamada: 'CALL-1',
      fechaDescarga: null,

      totalENC: 0,
      totalECUF: 0,
      totalECN: 0,

      notaFinal: 100,
      rango: 'Excelente',

      tiempoAuditoria: 10,
      tiempoAuditoriaFormateado: '00:00:10',

      fechaRegistro: '01/09/2026',

      campana_id: 1,
      matriz_id: 1,
      version_matriz_id: 7,

      escucha_id: '999',

      detalles: [
          {
              bloque: 'BLOQUE TEST',
              atributo: 'ATRIBUTO TEST',
              submotivo: 'SUBMOTIVO TEST',

              frente_id: 1,
              atributo_id: 1,
              criterio_id: 1,

              peso: 1,
              cumple: true
          }
      ]
    };

    await assert.rejects(
      repo.saveWithDetails(evaluacion),
      /Escucha 999 no encontrada/
    );

    const sqls =
      calls.map(call => call.sql);

    assert.equal(
      sqls[0],
      'BEGIN'
    );

    assert.match(
      sqls[1],
      /INSERT INTO evaluaciones/
    );

    assert.match(
      sqls[2],
      /INSERT INTO detalles_evaluacion/
    );

    assert.equal(
      sqls[3],
      'ROLLBACK'
    );

    assert.equal(
      sqls.includes('COMMIT'),
      false
    );

    assert.equal(
      released,
      true
    );
  }
);

test(
  'EVALREPO-009 rechaza escucha de ticket diferente y hace rollback',
  async () => {
    const calls = [];
    let released = false;
    let markManagedCalled = false;

    const client = {
      async query(sql, params) {
        const text = String(sql);

        calls.push({
          sql: text,
          params
        });

        return {
          rowCount: 1,
          rows: [{ id: '1' }]
        };
      },

      release() {
        released = true;
      }
    };

    const db = {
      async connect() {
        return client;
      }
    };

    const repo = new EvaluationsRepository(db);

    /*
     * La escucha existe, pero pertenece a OTRO ticket.
     */
    repo.listeningsRepository.getAssignmentById =
      async (id, executor) => {
        assert.equal(id, '999');
        assert.equal(executor, client);

        return {
          id: '999',
          ticket: 'TICKET-B',
          estado: 'en_proceso'
        };
      };

    /*
     * Nunca debería ejecutarse.
     */
    repo.listeningsRepository.markManaged =
      async () => {
        markManagedCalled = true;
      };

    const evaluacion = {
      id: '1002',
      timestamp: Date.now(),

      fecha: '2026-09-01',
      fechaFormateada: '01/09/2026',

      ticketPSI: 'TICKET-A',

      agente: 'AGENTE TEST',
      evaluador: 'AUDITOR TEST',

      idLlamada: 'CALL-2',
      fechaDescarga: null,

      totalENC: 0,
      totalECUF: 0,
      totalECN: 0,

      notaFinal: 100,
      rango: 'Excelente',

      tiempoAuditoria: 10,
      tiempoAuditoriaFormateado: '00:00:10',

      fechaRegistro: '01/09/2026',

      campana_id: 1,
      matriz_id: 1,
      version_matriz_id: 7,

      escucha_id: '999',

      detalles: [
          {
              bloque: 'BLOQUE TEST',
              atributo: 'ATRIBUTO TEST',
              submotivo: 'SUBMOTIVO TEST',

              frente_id: 1,
              atributo_id: 1,
              criterio_id: 1,

              peso: 1,
              cumple: true
          }
      ]
    };

    let capturedError = null;

    try {
      await repo.saveWithDetails(evaluacion);
    } catch (error) {
      capturedError = error;
    }

    /*
     * Debe rechazarse la operación.
     */
    assert.ok(capturedError);

    assert.equal(
      capturedError.code,
      'EVALUATION_LISTENING_MISMATCH'
    );

    assert.equal(
      capturedError.status,
      409
    );

    assert.match(
      capturedError.message,
      /no corresponde al ticket/
    );

    /*
     * Nunca debe marcarse la escucha B como gestionada.
     */
    assert.equal(
      markManagedCalled,
      false
    );

    const sqls =
      calls.map(call => call.sql);

    /*
     * La evaluación y su detalle alcanzaron a insertarse
     * dentro de la transacción...
     */
    assert.equal(
      sqls[0],
      'BEGIN'
    );

    assert.match(
      sqls[1],
      /INSERT INTO evaluaciones/
    );

    assert.match(
      sqls[2],
      /INSERT INTO detalles_evaluacion/
    );

    /*
     * ...pero el mismatch obliga a ROLLBACK.
     */
    assert.equal(
      sqls[3],
      'ROLLBACK'
    );

    assert.equal(
      sqls.includes('COMMIT'),
      false
    );

    assert.equal(
      released,
      true
    );
  }
);

test(
  'EVALREPO-010 conserva respuesta NA sin perder compatibilidad booleana',
  async () => {
    let insertDetalle = null;

    const client = {
      async query(sql, params) {
        const text = String(sql);

        if (/INSERT INTO detalles_evaluacion/i.test(text)) {
          insertDetalle = {
            sql: text,
            params
          };
        }

        return {
          rowCount: 1,
          rows: [{ id: '1' }]
        };
      },

      release() {}
    };

    const db = {
      async connect() {
        return client;
      }
    };

    const repo = new EvaluationsRepository(db);

    await repo.insertDetail(
        client,
        '1001',
        {
            bloque: 'ECN',
            atributo: 'ATRIBUTO TEST',
            submotivo: 'SUBMOTIVO TEST',

            frente_id: 1,
            atributo_id: 1,
            criterio_id: 1,

            peso: 3,
            cumple: false,

            /*
            * Deliberadamente contradice cumple=false
            * para verificar que valor_respuesta
            * sea la fuente de verdad.
            */
            valor_respuesta: 'NA'
        }
    );

    assert.ok(insertDetalle);

    assert.match(
      insertDetalle.sql,
      /valor_respuesta/
    );

    assert.deepEqual(
        insertDetalle.params,
        [
            '1001',
            'ECN',
            'ATRIBUTO TEST',
            'SUBMOTIVO TEST',
            1,
            1,
            1,
            3,
            false,
            'NA'
        ]
    );
  }
);

test(
  'EVALREPO-011 updateWithDetails hace ROLLBACK si falla la reinserción de detalles',
  async () => {
    const calls = [];

    const client = {
      async query(sql) {
        const text = String(sql).trim();
        calls.push(text);

        if (/UPDATE evaluaciones/i.test(text)) {
          return {
            rowCount: 1,
            rows: [
              {
                id: 'EVAL-1',
                veces_editado: 2
              }
            ]
          };
        }

        if (/DELETE FROM detalles_evaluacion/i.test(text)) {
          return {
            rowCount: 2,
            rows: []
          };
        }

        return {
          rowCount: 0,
          rows: []
        };
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

    repo.insertDetail = async () => {
      throw new Error('fallo inserción detalle');
    };

    await assert.rejects(
      repo.updateWithDetails(
        'EVAL-1',
        {
          totalENC: 0,
          totalECUF: 0,
          totalECN: 0,
          notaFinal: '98.0',
          rango: 'Excelente',
          fecha: '2026-09-01T10:00',
          fechaFormateada: '01/09/2026 10:00',
          detalles: [
            {
              bloque: 'ENC',
              atributo: 'ATR',
              submotivo: 'SUB',
              peso: 1,
              cumple: true,
              valor_respuesta: 'NA'
            }
          ]
        }
      ),
      /fallo inserción detalle/
    );

    assert.ok(
      calls.some(x =>
        /UPDATE evaluaciones/i.test(x)
      )
    );

    assert.ok(
      calls.some(x =>
        /DELETE FROM detalles_evaluacion/i.test(x)
      )
    );

    assert.ok(
      calls.includes('ROLLBACK')
    );

    assert.ok(
      !calls.includes('COMMIT')
    );

    assert.equal(
      calls.at(-1),
      'RELEASE'
    );
  }
);