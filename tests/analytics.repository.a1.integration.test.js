const test = require('node:test');
const assert = require('node:assert/strict');

const AnalyticsRepository =
  require('../src/modules/analytics/analytics.repository');

const { pool } = require('../models/database');


test(
  'ANAREPO-A1-INT-001 población directa conserva quiebre y campaña NULL',
  async () => {
    const repository =
      new AnalyticsRepository(pool)

    const rows =
      await repository.listPopulation({
        quiebreId: 1,

        campana: {
          modo: 'SIN_CAMPANA',
          id: null
        },

        gestor: null,
        auditor: null,
        lider: null,
        matrizId: null,
        fechaDesde: null,
        fechaHasta: null
      });

    assert.ok(
      rows.length > 0,
      'Debe existir al menos una evaluación directa para el quiebre 1'
    );

    const evaluation =
      rows.find(
        row =>
          String(row.ticket_psi) ===
          'E9949494'
      );

    assert.ok(
      evaluation,
      'La población directa debe contener la evaluación E9949494'
    );

    assert.equal(
      Number(evaluation.quiebre_id),
      1
    );

    assert.equal(
      evaluation.campana_id,
      null
    );

    assert.equal(
      Number(evaluation.matriz_id),
      1
    );

    assert.equal(
      Number(evaluation.version_matriz_id),
      7
    );
  }
);


test(
  'ANAREPO-A1-INT-002 población con campaña deriva quiebre cuando evaluación no lo almacena',
  async () => {
    const repository =
      new AnalyticsRepository(pool);

    /*
     * Buscamos una evaluación REAL que tenga campaña
     * asociada a un quiebre.
     *
     * El propio test pondrá temporalmente quiebre_id
     * en NULL para reproducir el escenario histórico.
     */
    const result =
      await pool.query(`
        SELECT
          e.id,
          e.quiebre_id AS quiebre_id_original,
          e.campana_id,
          c.quiebre_id AS quiebre_id_campana
        FROM evaluaciones e
        INNER JOIN campanas c
          ON c.id = e.campana_id
        WHERE e.campana_id IS NOT NULL
          AND c.quiebre_id IS NOT NULL
        ORDER BY e.timestamp DESC
        LIMIT 1
      `);

    assert.ok(
      result.rows.length > 0,
      'Debe existir al menos una evaluación con campaña para ejecutar la prueba'
    );

    const historical =
      result.rows[0];

    try {
      /*
       * Simulamos una evaluación histórica:
       * conserva campana_id pero no almacena quiebre_id.
       */
      await pool.query(
        `
          UPDATE evaluaciones
          SET quiebre_id = NULL
          WHERE id = $1
        `,
        [historical.id]
      );

      const rows =
        await repository.listPopulation({
          quiebreId:
            Number(
              historical.quiebre_id_campana
            ),

          campana: {
            modo: 'ESPECIFICA',
            id: Number(
              historical.campana_id
            )
          },

          gestor: null,
          auditor: null,
          lider: null,
          matrizId: null,
          fechaDesde: null,
          fechaHasta: null
        });

      const evaluation =
        rows.find(
          row =>
            String(row.id) ===
            String(historical.id)
        );

      assert.ok(
        evaluation,
        'La población debe contener la evaluación seleccionada'
      );

      /*
       * Aunque evaluaciones.quiebre_id sea NULL,
       * Analytics debe derivarlo desde la campaña.
       */
      assert.equal(
        Number(evaluation.quiebre_id),
        Number(
          historical.quiebre_id_campana
        )
      );

      assert.equal(
        Number(evaluation.campana_id),
        Number(historical.campana_id)
      );
    } finally {
      /*
       * Restauramos siempre el dato original,
       * incluso si alguna aserción falla.
       */
      await pool.query(
        `
          UPDATE evaluaciones
          SET quiebre_id = $1
          WHERE id = $2
        `,
        [
          historical.quiebre_id_original,
          historical.id
        ]
      );
    }
  }
);