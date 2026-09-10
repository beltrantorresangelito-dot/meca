const test = require('node:test');
const assert = require('node:assert/strict');

const { pool } = require('../models/database');
const EvaluationsRepository =
  require('../src/modules/evaluations/evaluations.repository');

test(
  'EVALATOMIC-DB-001 rollback real si escucha no existe',
  async () => {
    const repo = new EvaluationsRepository(pool);

    /*
     * IDs exclusivos para esta prueba.
     * escucha_id se envía como string porque BIGINT de PostgreSQL
     * puede superar el rango seguro de Number en JavaScript.
     */
    const evaluacionId =
      String(9900000000000n + BigInt(Date.now()));

    const ticket =
      `ATOMIC-ROLLBACK-${Date.now()}`;

    const escuchaInexistente =
      '9223372036854775000';

    const estructuraResult =
      await pool.query(`
        SELECT
          frente_id,
          atributo_id,
          criterio_id
        FROM detalles_evaluacion
        WHERE frente_id IS NOT NULL
          AND atributo_id IS NOT NULL
          AND criterio_id IS NOT NULL
        ORDER BY id DESC
        LIMIT 1
      `);

    assert.equal(
      estructuraResult.rowCount,
      1,
      'Debe existir al menos un detalle con identidad estructural válida'
    );

    const estructura =
      estructuraResult.rows[0];

    const evaluacion = {
      id: evaluacionId,
      timestamp: Date.now(),

      fecha: '2026-09-01T12:00:00',
      fechaFormateada: '01/09/2026 12:00:00',

      ticketPSI: ticket,
      agente: 'TEST ATOMIC',
      evaluador: 'TEST ATOMIC',

      idLlamada: `CALL-${Date.now()}`,
      fechaDescarga: null,

      totalENC: 0,
      totalECUF: 0,
      totalECN: 0,

      notaFinal: 100,
      rango: 'Excelente',

      tiempoAuditoria: 10,
      tiempoAuditoriaFormateado: '10s',

      fechaRegistro:
        new Date().toLocaleString('es-PE'),

      /*
       * No necesitamos contexto de negocio para probar
       * exclusivamente la atomicidad.
       */
      campana_id: null,
      matriz_id: null,
      version_matriz_id: null,

      detalles: [
        {
          bloque: 'TEST',
          atributo: 'ATRIBUTO TEST',
          submotivo: 'SUBMOTIVO TEST',

          frente_id:
            Number(estructura.frente_id),

          atributo_id:
            Number(estructura.atributo_id),

          criterio_id:
            Number(estructura.criterio_id),

          peso: 1,
          cumple: true
        }
      ],

      /*
       * Debe ser inexistente para que markManaged()
       * lance error antes del COMMIT.
       */
      escucha_id: escuchaInexistente
    };

    /*
     * Limpieza preventiva por si se reutilizara
     * accidentalmente algún identificador.
     */
    await pool.query(
      `
        DELETE FROM detalles_evaluacion
        WHERE evaluacion_id = $1
      `,
      [evaluacionId]
    );

    await pool.query(
      `
        DELETE FROM evaluaciones
        WHERE id = $1
      `,
      [evaluacionId]
    );

    try {
      /*
       * La operación DEBE fallar porque la escucha
       * indicada no existe.
       */
      await assert.rejects(
        repo.saveWithDetails(evaluacion),
        /Escucha .* no encontrada/
      );

      /*
       * Verificación REAL en PostgreSQL:
       * la cabecera insertada antes del fallo
       * debe haber desaparecido por ROLLBACK.
       */
      const evaluacionDb = await pool.query(
        `
          SELECT id
          FROM evaluaciones
          WHERE id = $1
        `,
        [evaluacionId]
      );

      assert.equal(
        evaluacionDb.rowCount,
        0,
        'La evaluación no debe persistir después del rollback'
      );

      /*
       * Los detalles también fueron insertados
       * antes de intentar gestionar la escucha.
       * Tampoco deben existir.
       */
      const detallesDb = await pool.query(
        `
          SELECT evaluacion_id
          FROM detalles_evaluacion
          WHERE evaluacion_id = $1
        `,
        [evaluacionId]
      );

      assert.equal(
        detallesDb.rowCount,
        0,
        'Los detalles no deben persistir después del rollback'
      );
    } finally {
      /*
       * Limpieza defensiva.
       * Si la atomicidad está correcta, estos DELETE
       * simplemente afectarán 0 filas.
       */
      await pool.query(
        `
          DELETE FROM detalles_evaluacion
          WHERE evaluacion_id = $1
        `,
        [evaluacionId]
      );

      await pool.query(
        `
          DELETE FROM evaluaciones
          WHERE id = $1
        `,
        [evaluacionId]
      );


    }
  }
);

test(
  'EVALATOMIC-DB-002 rollback real si escucha pertenece a otro ticket',
  async () => {
    const repo = new EvaluationsRepository(pool);

    const evaluacionId =
      String(9901000000000n + BigInt(Date.now()));

    /*
     * Tomamos una escucha REAL existente,
     * sin modificarla previamente.
     */
    const escuchaResult = await pool.query(`
      SELECT
        id,
        ticket,
        estado,
        fecha_gestion,
        updated_at
      FROM asignaciones_escucha
      ORDER BY id DESC
      LIMIT 1
    `);

    assert.equal(
      escuchaResult.rowCount,
      1,
      'Debe existir al menos una escucha para ejecutar esta prueba'
    );

    const escucha = escuchaResult.rows[0];

    /*
     * Creamos deliberadamente un ticket distinto.
     */
    const ticketEvaluacion =
      `MISMATCH-${Date.now()}`;

    assert.notEqual(
      ticketEvaluacion,
      escucha.ticket
    );

    const estructuraResult =
      await pool.query(`
        SELECT
          frente_id,
          atributo_id,
          criterio_id
        FROM detalles_evaluacion
        WHERE frente_id IS NOT NULL
          AND atributo_id IS NOT NULL
          AND criterio_id IS NOT NULL
        ORDER BY id DESC
        LIMIT 1
      `);

    assert.equal(
      estructuraResult.rowCount,
      1,
      'Debe existir al menos un detalle con identidad estructural válida'
    );

    const estructura =
      estructuraResult.rows[0];

    const evaluacion = {
      id: evaluacionId,
      timestamp: Date.now(),

      fecha: '2026-09-01T12:00:00',
      fechaFormateada: '01/09/2026 12:00:00',

      ticketPSI: ticketEvaluacion,

      agente: 'TEST ATOMIC',
      evaluador: 'TEST ATOMIC',

      idLlamada: `CALL-MISMATCH-${Date.now()}`,
      fechaDescarga: null,

      totalENC: 0,
      totalECUF: 0,
      totalECN: 0,

      notaFinal: 100,
      rango: 'Excelente',

      tiempoAuditoria: 10,
      tiempoAuditoriaFormateado: '10s',

      fechaRegistro:
        new Date().toLocaleString('es-PE'),

      campana_id: null,
      matriz_id: null,
      version_matriz_id: null,

      escucha_id: escucha.id,

      detalles: [
          {
            bloque: 'TEST',
            atributo: 'ATRIBUTO TEST',
            submotivo: 'SUBMOTIVO TEST',

            frente_id:
              Number(estructura.frente_id),

            atributo_id:
              Number(estructura.atributo_id),

            criterio_id:
              Number(estructura.criterio_id),

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
     * Debe detectar el cruce.
     */
    assert.ok(
      capturedError,
      'La operación debería haber sido rechazada'
    );

    assert.equal(
      capturedError.code,
      'EVALUATION_LISTENING_MISMATCH'
    );

    assert.equal(
      capturedError.status,
      409
    );

    /*
     * La evaluación debe haber desaparecido
     * por efecto del ROLLBACK.
     */
    const evaluacionDb = await pool.query(
      `
        SELECT id
        FROM evaluaciones
        WHERE id = $1
      `,
      [evaluacionId]
    );

    assert.equal(
      evaluacionDb.rowCount,
      0,
      'La evaluación no debe persistir'
    );

    /*
     * Tampoco sus detalles.
     */
    const detallesDb = await pool.query(
      `
        SELECT evaluacion_id
        FROM detalles_evaluacion
        WHERE evaluacion_id = $1
      `,
      [evaluacionId]
    );

    assert.equal(
      detallesDb.rowCount,
      0,
      'Los detalles no deben persistir'
    );

    /*
     * Comprobamos que la escucha real
     * tampoco haya sido modificada.
     */
    const escuchaDespuesResult = await pool.query(
      `
        SELECT
          id,
          ticket,
          estado,
          fecha_gestion,
          updated_at
        FROM asignaciones_escucha
        WHERE id = $1
      `,
      [escucha.id]
    );

    assert.equal(
      escuchaDespuesResult.rowCount,
      1
    );

    const escuchaDespues =
      escuchaDespuesResult.rows[0];

    assert.equal(
      escuchaDespues.ticket,
      escucha.ticket
    );

    assert.equal(
      escuchaDespues.estado,
      escucha.estado
    );

    assert.deepEqual(
      escuchaDespues.fecha_gestion,
      escucha.fecha_gestion
    );

    assert.deepEqual(
      escuchaDespues.updated_at,
      escucha.updated_at
    );

    /*
     * Limpieza defensiva.
     * En condiciones normales no habrá nada
     * porque la transacción hizo rollback.
     */
    await pool.query(
      `
        DELETE FROM detalles_evaluacion
        WHERE evaluacion_id = $1
      `,
      [evaluacionId]
    );

    await pool.query(
      `
        DELETE FROM evaluaciones
        WHERE id = $1
      `,
      [evaluacionId]
    );
  }
);