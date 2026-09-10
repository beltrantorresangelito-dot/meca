class AnalyticsRepository {
  constructor(db) {
    if (!db) {
      throw new Error('AnalyticsRepository requiere db');
    }

    this.db = db;
  }

  static buildPopulationFilter(filters = {}) {
    const where = [];
    const params = [];

    const pushParam = value => {
      params.push(value);
      return `$${params.length}`;
    };

    if (filters.fechaDesde) {
      const p = pushParam(filters.fechaDesde);

      where.push(
        `e.fecha::date >= ${p}::date`
      );
    }

    if (filters.fechaHasta) {
      const p = pushParam(filters.fechaHasta);

      where.push(
        `e.fecha::date <= ${p}::date`
      );
    }

    if (
      filters.quiebreId !== null &&
      filters.quiebreId !== undefined
    ) {
      const p = pushParam(filters.quiebreId);

      where.push(
        `COALESCE(e.quiebre_id, c.quiebre_id) = ${p}`
      );
    }

    if (
      filters.campana?.modo === 'ESPECIFICA'
    ) {
      const p =
        pushParam(filters.campana.id);

      where.push(
        `e.campana_id = ${p}`
      );
    }

    if (
      filters.campana?.modo === 'SIN_CAMPANA'
    ) {
      where.push(
        `e.campana_id IS NULL
     AND COALESCE(
       e.quiebre_id,
       c.quiebre_id
     ) IS NOT NULL`
      );
    }

    if (
      filters.matrizId !== null &&
      filters.matrizId !== undefined
    ) {
      const p = pushParam(filters.matrizId);

      where.push(
        `e.matriz_id = ${p}`
      );
    }

    if (filters.lider) {
      const p = pushParam(filters.lider);

      where.push(
        `a.lider_2026 = ${p}`
      );
    }

    if (filters.gestor) {
      const p = pushParam(filters.gestor);

      where.push(
        `e.agente = ${p}`
      );
    }

    if (filters.auditor) {
      const p = pushParam(filters.auditor);

      where.push(
        `e.evaluador = ${p}`
      );
    }

    return {
      sql:
        where.length > 0
          ? `WHERE ${where.join('\n  AND ')}`
          : '',
      params
    };
  }

  async listPopulation(filters = {}) {
    const {
      sql: whereSql,
      params
    } =
      AnalyticsRepository
        .buildPopulationFilter(filters);

    const result =
      await this.db.query(
        `
          SELECT
            e.id,
            e.fecha,
            e.fecha_formateada,

            e.ticket_psi,
            e.agente,
            e.evaluador,

            e.nota_final,
            e.total_enc,
            e.total_ecuf,
            e.total_ecn,
            e.rango,

            e.campana_id,

            COALESCE(
              e.quiebre_id,
              c.quiebre_id
            ) AS quiebre_id,

            e.matriz_id,
            e.version_matriz_id,

            a.lider_2026 AS lider,
            a.ubicacion,
            a.localidad

          FROM evaluaciones e

          LEFT JOIN campanas c
            ON c.id = e.campana_id

          LEFT JOIN agentes a
            ON a.nombre = e.agente

          ${whereSql}

          ORDER BY
            e.timestamp DESC
        `,
        params
      );

    return result.rows;
  }
  async getExecutiveSummary(filters = {}) {
    const {
      sql: whereSql,
      params
    } =
      AnalyticsRepository.buildPopulationFilter(
        filters
      );

    const result =
      await this.db.query(
        `
        SELECT
          COUNT(*)::int
            AS evaluaciones,

          COUNT(DISTINCT e.agente)::int
            AS gestores,

          COUNT(DISTINCT e.evaluador)::int
            AS auditores,

          ROUND(
            AVG(e.nota_final)::numeric,
            2
          )
            AS nota_promedio,

          MIN(e.nota_final)
            AS nota_minima,

          MAX(e.nota_final)
            AS nota_maxima,

          COALESCE(
            SUM(e.total_enc),
            0
          )
            AS total_enc,

          COALESCE(
            SUM(e.total_ecuf),
            0
          )
            AS total_ecuf,

          COALESCE(
            SUM(e.total_ecn),
            0
          )
            AS total_ecn

        FROM evaluaciones e

        LEFT JOIN campanas c
          ON c.id = e.campana_id

        LEFT JOIN agentes a
          ON a.nombre = e.agente

        ${whereSql}
      `,
        params
      );

    return result.rows[0];
  }
  async listRangeDistribution(filters = {}) {
    const {
      sql: whereSql,
      params
    } =
      AnalyticsRepository.buildPopulationFilter(
        filters
      );

    const result =
      await this.db.query(
        `
        SELECT
          e.rango,
          COUNT(*)::int AS cantidad

        FROM evaluaciones e

        LEFT JOIN campanas c
          ON c.id = e.campana_id

        LEFT JOIN agentes a
          ON a.nombre = e.agente

        ${whereSql}

        GROUP BY e.rango

        ORDER BY
          CASE e.rango
            WHEN 'Excelente' THEN 1
            WHEN 'Bien' THEN 2
            WHEN 'Regular' THEN 3
            WHEN 'Bajo' THEN 4
            ELSE 5
          END,
          e.rango
      `,
        params
      );

    return result.rows;
  }
  async listBreakDimensions(filters = {}) {
    const {
      sql: whereSql,
      params
    } =
      AnalyticsRepository.buildPopulationFilter(
        filters
      );

    const result =
      await this.db.query(
        `
        SELECT
          COALESCE(
            e.quiebre_id,
            c.quiebre_id
          ) AS quiebre_id,

          q.codigo AS quiebre_codigo,
          q.descripcion AS quiebre_descripcion,

          COUNT(*)::int AS evaluaciones

        FROM evaluaciones e

        LEFT JOIN campanas c
          ON c.id = e.campana_id

        LEFT JOIN quiebres q
          ON q.id = COALESCE(
            e.quiebre_id,
            c.quiebre_id
          )

        LEFT JOIN agentes a
          ON a.nombre = e.agente

        ${whereSql}

        GROUP BY
          COALESCE(
            e.quiebre_id,
            c.quiebre_id
          ),
          q.codigo,
          q.descripcion

        ORDER BY
          CASE
            WHEN COALESCE(
              e.quiebre_id,
              c.quiebre_id
            ) IS NULL
              THEN 1
            ELSE 0
          END,
          q.codigo
      `,
        params
      );

    return result.rows;
  }
  async listCampaignDimensions(filters = {}) {
    const {
      sql: whereSql,
      params
    } =
      AnalyticsRepository.buildPopulationFilter(
        filters
      );

    const result =
      await this.db.query(
        `
        SELECT
          COALESCE(
            e.quiebre_id,
            c.quiebre_id
          ) AS quiebre_id,

          e.campana_id,
          c.codigo AS campana_codigo,
          c.descripcion AS campana_descripcion,

          COUNT(*)::int AS evaluaciones

        FROM evaluaciones e

        LEFT JOIN campanas c
          ON c.id = e.campana_id

        LEFT JOIN agentes a
          ON a.nombre = e.agente

        ${whereSql}

        GROUP BY
          COALESCE(
            e.quiebre_id,
            c.quiebre_id
          ),
          e.campana_id,
          c.codigo,
          c.descripcion

        ORDER BY
          COALESCE(
            e.quiebre_id,
            c.quiebre_id
          ) NULLS LAST,

          CASE
            WHEN e.campana_id IS NULL
              THEN 1
            ELSE 0
          END,

          c.descripcion,
          e.campana_id
      `,
        params
      );

    return result.rows;
  }
  async listMatrixDimensions(filters = {}) {
    const {
      sql: whereSql,
      params
    } =
      AnalyticsRepository.buildPopulationFilter(
        filters
      );

    const result =
      await this.db.query(
        `
        SELECT
          e.matriz_id,
          m.codigo AS matriz_codigo,

          COUNT(*)::int AS evaluaciones

        FROM evaluaciones e

        LEFT JOIN campanas c
          ON c.id = e.campana_id

        LEFT JOIN matrices m
          ON m.id = e.matriz_id

        LEFT JOIN agentes a
          ON a.nombre = e.agente

        ${whereSql}

        GROUP BY
          e.matriz_id,
          m.codigo

        ORDER BY
          CASE
            WHEN e.matriz_id IS NULL
              THEN 1
            ELSE 0
          END,
          m.codigo,
          e.matriz_id
      `,
        params
      );

    return result.rows;
  }
  async listHumanDimension(filters = {}, dimension) {
    const dimensions = {
      lider: {
        expression: 'a.lider_2026',
        alias: 'lider'
      },

      gestor: {
        expression: 'e.agente',
        alias: 'gestor'
      },

      auditor: {
        expression: 'e.evaluador',
        alias: 'auditor'
      }
    };

    const config = dimensions[dimension];

    if (!config) {
      throw new Error(
        `Dimensión humana Analytics inválida: ${dimension}`
      );
    }

    const {
      sql: whereSql,
      params
    } =
      AnalyticsRepository.buildPopulationFilter(
        filters
      );

    const result =
      await this.db.query(
        `
        SELECT
          ${config.expression} AS ${config.alias},
          COUNT(*)::int AS evaluaciones

        FROM evaluaciones e

        LEFT JOIN campanas c
          ON c.id = e.campana_id

        LEFT JOIN agentes a
          ON a.nombre = e.agente

        ${whereSql}

        AND ${config.expression} IS NOT NULL
        AND BTRIM(
          ${config.expression}
        ) <> ''

        GROUP BY
          ${config.expression}

        ORDER BY
          ${config.expression}
      `,
        params
      );

    return result.rows;
  }


  async listLeaderDimensions(filters = {}) {
    return this.listHumanDimension(
      filters,
      'lider'
    );
  }


  async listManagerDimensions(filters = {}) {
    return this.listHumanDimension(
      filters,
      'gestor'
    );
  }


  async listAuditorDimensions(filters = {}) {
    return this.listHumanDimension(
      filters,
      'auditor'
    );
  }
  async listEvolution(
    filters = {},
    granularity = 'month'
  ) {
    const granularities = {
      day: {
        expression:
          "date_trunc('day', e.fecha::date)::date",
        label: 'día'
      },

      week: {
        expression:
          "date_trunc('week', e.fecha::date)::date",
        label: 'semana'
      },

      month: {
        expression:
          "date_trunc('month', e.fecha::date)::date",
        label: 'mes'
      }
    };
    const config =
      granularities[granularity];

    if (!config) {
      throw new Error(
        `Granularidad Analytics inválida: ${granularity}`
      );
    }

    const {
      sql: whereSql,
      params
    } =
      AnalyticsRepository
        .buildPopulationFilter(filters);

    const result =
      await this.db.query(
        `
        SELECT
          ${config.expression} AS periodo,

          COUNT(*)::int AS evaluaciones,

          ROUND(
            AVG(e.nota_final)::numeric,
            2
          ) AS nota_promedio,

          COUNT(
            DISTINCT e.agente
          )::int AS gestores,

          COUNT(
            DISTINCT e.evaluador
          )::int AS auditores,

          COUNT(*) FILTER (
            WHERE e.rango = 'Excelente'
          )::int AS excelente,

          COUNT(*) FILTER (
            WHERE e.rango = 'Bien'
          )::int AS bien,

          COUNT(*) FILTER (
            WHERE e.rango = 'Regular'
          )::int AS regular,

          COUNT(*) FILTER (
            WHERE e.rango = 'Bajo'
          )::int AS bajo

        FROM evaluaciones e

        LEFT JOIN campanas c
          ON c.id = e.campana_id

        LEFT JOIN agentes a
          ON a.nombre = e.agente

        ${whereSql}

        GROUP BY
          ${config.expression}

        ORDER BY
          ${config.expression}
      `,
        params
      );

    return result.rows;
  }

  async listConcentration(filters = {}) {
    const {
      sql: whereSql,
      params
    } =
      AnalyticsRepository
        .buildPopulationFilter(filters);

    const result =
      await this.db.query(
        `
      WITH poblacion AS (
        SELECT
          e.id,

          COALESCE(
            NULLIF(
              BTRIM(a.lider_2026),
              ''
            ),
            'Sin líder'
          ) AS lider,

          COALESCE(
            NULLIF(
              BTRIM(e.agente),
              ''
            ),
            'Sin gestor'
          ) AS gestor,

          COALESCE(
            NULLIF(
              BTRIM(e.evaluador),
              ''
            ),
            'Sin auditor'
          ) AS auditor

        FROM evaluaciones e

        LEFT JOIN campanas c
          ON c.id = e.campana_id

        LEFT JOIN agentes a
          ON a.nombre = e.agente

        ${whereSql}
      ),

      concentracion AS (
        SELECT
          p.lider,
          p.gestor,
          p.auditor,

          COUNT(
            DISTINCT p.id
          )::int AS evaluaciones,

          COUNT(*) FILTER (
            WHERE
              d.valor_respuesta = '0'
          )::int AS incumplimientos

        FROM poblacion p

        LEFT JOIN detalles_evaluacion d
          ON d.evaluacion_id = p.id

        GROUP BY
          p.lider,
          p.gestor,
          p.auditor
      )

      SELECT
        lider,
        gestor,
        auditor,
        evaluaciones,
        incumplimientos

      FROM concentracion

      ORDER BY
        incumplimientos DESC,
        lider,
        gestor,
        auditor
      `,
        params
      );

    return result.rows;
  }

  async listEvolutionMatrixContext(
    filters = {},
    granularity = 'month'
  ) {
    const granularities = {
      day: {
        expression:
          "date_trunc('day', e.fecha::date)::date"
      },

      week: {
        expression:
          "date_trunc('week', e.fecha::date)::date"
      },

      month: {
        expression:
          "date_trunc('month', e.fecha::date)::date"
      }
    };

    const config =
      granularities[granularity];

    if (!config) {
      throw new Error(
        `Granularidad Analytics inválida: ${granularity}`
      );
    }

    const {
      sql: whereSql,
      params
    } =
      AnalyticsRepository
        .buildPopulationFilter(filters);

    const result =
      await this.db.query(
        `
        SELECT
          ${config.expression} AS periodo,

          e.matriz_id,
          m.codigo AS matriz_codigo,

          e.version_matriz_id,
          vm.version AS version_matriz,

          COUNT(*)::int AS auditorias,

          ROUND(
            AVG(e.nota_final)::numeric,
            2
          ) AS nota_promedio,

          MIN(e.fecha::date)
            AS primera_auditoria,

          MAX(e.fecha::date)
            AS ultima_auditoria

        FROM evaluaciones e

        LEFT JOIN campanas c
          ON c.id = e.campana_id

        LEFT JOIN agentes a
          ON a.nombre = e.agente

        LEFT JOIN matrices m
          ON m.id = e.matriz_id

        LEFT JOIN versiones_matriz vm
          ON vm.id = e.version_matriz_id

        ${whereSql}

        GROUP BY
          ${config.expression},
          e.matriz_id,
          m.codigo,
          e.version_matriz_id,
          vm.version

        ORDER BY
          ${config.expression},
          e.matriz_id NULLS LAST,
          e.version_matriz_id NULLS LAST
      `,
        params
      );

    return result.rows;
  }
  async listDiagnosticPareto(
    filters = {}
  ) {
    const {
      sql: whereSql,
      params
    } =
      AnalyticsRepository
        .buildPopulationFilter(filters);


    const result =
      await this.db.query(
        `
        WITH poblacion AS (
          SELECT
            e.id
          FROM evaluaciones e

          LEFT JOIN campanas c
            ON c.id = e.campana_id

          LEFT JOIN agentes a
            ON a.nombre = e.agente

          ${whereSql}
        ),

        criterios AS (
          SELECT
            d.bloque,
            d.atributo,
            d.submotivo,

            COUNT(*)::int
              AS registros,

            COUNT(*) FILTER (
              WHERE
                d.valor_respuesta = '0'
            )::int
              AS incumplimientos,

            COUNT(*) FILTER (
              WHERE
                d.valor_respuesta = '1'
            )::int
              AS cumplimientos,

            COUNT(*) FILTER (
              WHERE
                d.valor_respuesta = 'NA'
            )::int
              AS no_aplica,

            COUNT(*) FILTER (
              WHERE
                d.valor_respuesta IS NULL
            )::int
              AS sin_respuesta,

            COUNT(*) FILTER (
              WHERE
                d.valor_respuesta
                  IN ('0', '1')
            )::int
              AS respuestas_aplicables_explicitas,

            COUNT(*) FILTER (
              WHERE
                d.valor_respuesta
                  IN ('0', '1', 'NA')
            )::int
              AS respuestas_triestado

          FROM poblacion p

          INNER JOIN detalles_evaluacion d
            ON d.evaluacion_id = p.id

          WHERE
            d.submotivo IS NOT NULL
            AND BTRIM(d.submotivo) <> ''

          GROUP BY
            d.bloque,
            d.atributo,
            d.submotivo
        ),

        calculado AS (
          SELECT
            *,

            ROUND(
              CASE
                WHEN
                  respuestas_aplicables_explicitas > 0
                THEN
                  incumplimientos::numeric /
                  respuestas_aplicables_explicitas *
                  100
                ELSE NULL
              END,
              2
            )
              AS tasa_incumplimiento_explicita_pct,

            ROUND(
              CASE
                WHEN registros > 0
                THEN
                  respuestas_triestado::numeric /
                  registros *
                  100
                ELSE 0
              END,
              2
            )
              AS cobertura_triestado_pct,

            ROUND(
              CASE
                WHEN
                  SUM(incumplimientos)
                    OVER () > 0
                THEN
                  incumplimientos::numeric /
                  SUM(incumplimientos)
                    OVER () *
                  100
                ELSE 0
              END,
              2
            )
              AS participacion_fallas_pct

          FROM criterios
        ),

        pareto AS (
          SELECT
            *,

            ROUND(
              SUM(
                participacion_fallas_pct
              )
              OVER (
                ORDER BY
                  incumplimientos DESC,
                  bloque,
                  atributo,
                  submotivo
              ),
              2
            )
              AS pareto_acumulado_pct

          FROM calculado
        )

        SELECT
          bloque,
          atributo,
          submotivo,

          registros,
          incumplimientos,
          cumplimientos,
          no_aplica,
          sin_respuesta,

          respuestas_aplicables_explicitas,
          respuestas_triestado,

          tasa_incumplimiento_explicita_pct,
          cobertura_triestado_pct,
          participacion_fallas_pct,
          pareto_acumulado_pct

        FROM pareto

        WHERE incumplimientos > 0

        ORDER BY
          incumplimientos DESC,
          bloque,
          atributo,
          submotivo
      `,
        params
      );


    return result.rows;
  }

  async listFindingEvaluations(
  filters = {},
  finding = null
) {
  const {
    sql: populationWhereSql,
    params: populationParams
  } =
    AnalyticsRepository
      .buildPopulationFilter(
        filters
      );


  const params = [
    ...populationParams
  ];


  const pushParam = value => {
    params.push(value);

    return `$${params.length}`;
  };


  let detalleJoinSql = '';

  let detalleSelectSql = `
    NULL::text AS frente,
    NULL::text AS atributo,
    NULL::text AS criterio,
    NULL::text AS valor_respuesta
  `;


  if (finding) {
    const frenteParam =
      pushParam(
        finding.frente
      );

    const atributoParam =
      pushParam(
        finding.atributo
      );

    const criterioParam =
      pushParam(
        finding.criterio
      );


    detalleJoinSql = `
      INNER JOIN detalles_evaluacion d
        ON d.evaluacion_id = p.id

       AND d.bloque =
         ${frenteParam}

       AND d.atributo =
         ${atributoParam}

       AND d.submotivo =
         ${criterioParam}

       AND d.valor_respuesta = '0'
    `;


    detalleSelectSql = `
      d.bloque
        AS frente,

      d.atributo,

      d.submotivo
        AS criterio,

      d.valor_respuesta
    `;
  }


  const result =
    await this.db.query(
      `
      WITH poblacion AS (
        SELECT
          e.id,
          e.fecha,
          e.ticket_psi,

          e.agente,
          e.evaluador,

          e.nota_final,
          e.rango,

          e.campana_id,

          COALESCE(
            e.quiebre_id,
            c.quiebre_id
          ) AS quiebre_id,

          e.matriz_id,
          e.version_matriz_id,

          a.lider_2026
            AS lider

        FROM evaluaciones e

        LEFT JOIN campanas c
          ON c.id = e.campana_id

        LEFT JOIN agentes a
          ON a.nombre = e.agente

        ${populationWhereSql}
      )


      SELECT
        p.id
          AS evaluacion_id,

        p.fecha,

        p.ticket_psi,

        p.agente
          AS gestor,

        p.lider,

        p.evaluador
          AS auditor,

        p.nota_final,

        p.rango,

        p.campana_id,

        p.quiebre_id,

        p.matriz_id,

        p.version_matriz_id,

        COALESCE(
          errores.total_errores,
          0
        )::int AS total_errores,

        COALESCE(
          evidencias.evidencias,
          '[]'::json
        ) AS evidencias,

        ae.id
          AS asignacion_id,

        ae.estado
          AS estado_escucha,

        ae.fecha_asignacion,

        ae.fecha_gestion,

        ae.peticion,

        ae.motivo_call,

        ae.motivos
          AS motivos_escucha,

        ae.submotivos
          AS submotivos_escucha,


        ${detalleSelectSql}


      FROM poblacion p


      ${detalleJoinSql}

      LEFT JOIN LATERAL (
        SELECT
          COUNT(*)::int
            AS total_errores

        FROM detalles_evaluacion de_error

        WHERE
          de_error.evaluacion_id =
            p.id

          AND de_error.valor_respuesta = '0'
      ) errores
        ON TRUE

      LEFT JOIN LATERAL (
        SELECT
          json_agg(
            json_build_object(
              'frente',
                de_evidencia.bloque,

              'atributo',
                de_evidencia.atributo,

              'criterio',
                de_evidencia.submotivo,

              'valorRespuesta',
                de_evidencia.valor_respuesta
            )

            ORDER BY
              de_evidencia.bloque,
              de_evidencia.atributo,
              de_evidencia.submotivo
          ) AS evidencias

        FROM detalles_evaluacion de_evidencia

        WHERE
          de_evidencia.evaluacion_id =
            p.id

          AND de_evidencia.valor_respuesta = '0'
      ) evidencias
        ON TRUE

      LEFT JOIN LATERAL (
        SELECT
          ae0.id,
          ae0.estado,
          ae0.fecha_asignacion,
          ae0.fecha_gestion,
          ae0.peticion,
          ae0.motivo_call,
          ae0.motivos,
          ae0.submotivos

        FROM asignaciones_escucha ae0

        WHERE
          ae0.ticket =
          p.ticket_psi

        ORDER BY
          ae0.fecha_gestion
            DESC NULLS LAST,

          ae0.fecha_asignacion
            DESC NULLS LAST,

          ae0.id DESC

        LIMIT 1
      ) ae
        ON TRUE


      ORDER BY
        p.fecha DESC,
        p.id DESC
      `,
      params
    );


  return result.rows;
}
static buildPdaFilter(filters = {}) {
  const conditions = [];
  const params = [];

  const pushParam = value => {
    params.push(value);
    return `$${params.length}`;
  };

  if (filters.fechaDesde) {
    const param = pushParam(filters.fechaDesde);

    conditions.push(
      `p.fecha_deteccion >= ${param}::date`
    );
  }

  if (filters.fechaHasta) {
    const param = pushParam(filters.fechaHasta);

    conditions.push(
      `p.fecha_deteccion <= ${param}::date`
    );
  }

  if (filters.quiebreId) {
    const param = pushParam(filters.quiebreId);

    conditions.push(
      `p.quiebre_id = ${param}`
    );
  }

  if (filters.campanaId) {
    const param = pushParam(filters.campanaId);

    conditions.push(
      `p.campana_id = ${param}`
    );
  }

  if (filters.campaignMode === 'SIN_CAMPANA') {
    conditions.push(
      `p.campana_id IS NULL`
    );
  }

  if (filters.matrizId) {
    const param = pushParam(filters.matrizId);

    conditions.push(
      `p.matriz_id = ${param}`
    );
  }

  if (filters.gestor) {
    const param = pushParam(filters.gestor);

    conditions.push(
      `LOWER(BTRIM(p.agente)) =
       LOWER(BTRIM(${param}))`
    );
  }

  const sql =
    conditions.length > 0
      ? `WHERE ${conditions.join(' AND ')}`
      : '';

  return {
    sql,
    params
  };
}


async getInterventionOverview(
  filters = {}
) {
  const {
    sql: whereSql,
    params
  } =
    AnalyticsRepository
      .buildPdaFilter(filters);


  const resumenResult =
    await this.db.query(
      `
        WITH pda_filtrados AS (
          SELECT
            p.*
          FROM pda_cabecera p
          ${whereSql}
        ),

        seguimiento AS (
          SELECT DISTINCT ON (
            c.pda_origen_id
          )
            c.pda_origen_id,
            c.id
              AS ciclo_id,
            c.tipo_ciclo,
            c.ciclo_numero,
            c.fecha_inicio,
            c.fecha_fin,
            c.total_evaluaciones,
            c.promedio_nota,
            c.cuartil,
            c.mejora_detectada

          FROM pda_ciclos_evaluacion c

          INNER JOIN pda_filtrados p
            ON p.id =
               c.pda_origen_id

          WHERE
            LOWER(
              BTRIM(c.tipo_ciclo)
            ) <> 'basal'

          ORDER BY
            c.pda_origen_id,
            c.ciclo_numero
              DESC NULLS LAST,
            c.fecha_fin
              DESC NULLS LAST,
            c.id DESC
        )

        SELECT
          COUNT(*)::int
            AS pda_generados,

          COUNT(
            DISTINCT p.agente
          )::int
            AS gestores_intervenidos,

          COUNT(*) FILTER (
            WHERE
              s.ciclo_id IS NOT NULL
          )::int
            AS pda_evaluables,

          COUNT(*) FILTER (
            WHERE
              s.mejora_detectada IS TRUE
          )::int
            AS mejoraron,

          COUNT(*) FILTER (
            WHERE
              s.mejora_detectada IS FALSE
          )::int
            AS persisten,

          COUNT(*) FILTER (
            WHERE
              s.ciclo_id IS NULL
          )::int
            AS pendientes_medicion,

          COUNT(*) FILTER (
            WHERE
              p.fecha_feedback IS NOT NULL
          )::int
            AS feedback_realizados,

          COUNT(*) FILTER (
            WHERE
              p.fecha_envio_capacitacion
                IS NOT NULL
          )::int
            AS capacitacion_derivados,

          COUNT(*) FILTER (
            WHERE
              p.fecha_capacitacion
                IS NOT NULL
          )::int
            AS capacitacion_realizados

        FROM pda_filtrados p

        LEFT JOIN seguimiento s
          ON s.pda_origen_id = p.id
      `,
      params
    );


  const estadosResult =
    await this.db.query(
      `
        WITH pda_filtrados AS (
          SELECT
            p.*
          FROM pda_cabecera p
          ${whereSql}
        )

        SELECT
          COALESCE(
            NULLIF(
              BTRIM(estado),
              ''
            ),
            'sin_estado'
          ) AS estado,

          COUNT(*)::int
            AS cantidad

        FROM pda_filtrados

        GROUP BY
          COALESCE(
            NULLIF(
              BTRIM(estado),
              ''
            ),
            'sin_estado'
          )

        ORDER BY
          cantidad DESC,
          estado
      `,
      params
    );


  return {
    resumen:
      resumenResult.rows[0] || {},

    estados:
      estadosResult.rows || []
  };
}
async getInterventionEffectiveness(
  filters = {}
) {
  const {
    sql: whereSql,
    params
  } =
    AnalyticsRepository
      .buildPdaFilter(filters);

  const result =
    await this.db.query(
      `
        WITH pda_filtrados AS (
          SELECT
            p.*
          FROM pda_cabecera p
          ${whereSql}
        ),

        ultimo_seguimiento AS (
          SELECT DISTINCT ON (
            c.pda_origen_id
          )
            c.pda_origen_id,
            c.id
              AS ciclo_id,
            c.tipo_ciclo,
            c.ciclo_numero,
            c.fecha_inicio,
            c.fecha_fin,
            c.mejora_detectada

          FROM pda_ciclos_evaluacion c

          INNER JOIN pda_filtrados p
            ON p.id =
               c.pda_origen_id

          WHERE
            LOWER(
              BTRIM(c.tipo_ciclo)
            ) <> 'basal'

          ORDER BY
            c.pda_origen_id,
            c.ciclo_numero
              DESC NULLS LAST,
            c.fecha_fin
              DESC NULLS LAST,
            c.id DESC
        )

        SELECT

          COUNT(*) FILTER (
            WHERE
              p.fecha_feedback
                IS NOT NULL
              AND s.ciclo_id
                IS NOT NULL
              AND p.fecha_envio_capacitacion
                IS NULL
          )::int
            AS feedback_evaluables,

          COUNT(*) FILTER (
            WHERE
              p.fecha_feedback
                IS NOT NULL
              AND s.mejora_detectada
                IS TRUE
              AND p.fecha_envio_capacitacion
                IS NULL
          )::int
            AS feedback_mejoraron,

          COUNT(*) FILTER (
            WHERE
              p.fecha_feedback
                IS NOT NULL
              AND s.mejora_detectada
                IS FALSE
              AND p.fecha_envio_capacitacion
                IS NULL
          )::int
            AS feedback_persisten,


          COUNT(*) FILTER (
            WHERE
              p.fecha_envio_capacitacion
                IS NOT NULL
              AND s.ciclo_id
                IS NOT NULL
          )::int
            AS capacitacion_evaluables,

          COUNT(*) FILTER (
            WHERE
              p.fecha_envio_capacitacion
                IS NOT NULL
              AND s.mejora_detectada
                IS TRUE
          )::int
            AS capacitacion_mejoraron,

          COUNT(*) FILTER (
            WHERE
              p.fecha_envio_capacitacion
                IS NOT NULL
              AND s.mejora_detectada
                IS FALSE
          )::int
            AS capacitacion_persisten,


          COUNT(*) FILTER (
            WHERE
              p.fecha_feedback
                IS NOT NULL
              AND p.fecha_envio_capacitacion
                IS NULL
              AND s.mejora_detectada
                IS TRUE
          )::int
            AS feedback_suficiente,

          COUNT(*) FILTER (
            WHERE
              p.fecha_envio_capacitacion
                IS NOT NULL
          )::int
            AS requirio_capacitacion,

          COUNT(*) FILTER (
            WHERE
              p.estado = 'en_seguimiento'
              AND s.ciclo_id
                IS NULL
          )::int
            AS continua_seguimiento,

          COUNT(*) FILTER (
            WHERE
              p.fecha_escalamiento
                IS NOT NULL
          )::int
            AS escalados

        FROM pda_filtrados p

        LEFT JOIN ultimo_seguimiento s
          ON s.pda_origen_id =
             p.id
      `,
      params
    );

  return result.rows[0] || {};
}


async listInterventionEvolution(
  filters = {}
) {
  const {
    sql: whereSql,
    params
  } =
    AnalyticsRepository
      .buildPdaFilter(filters);

  const result =
    await this.db.query(
      `
        WITH pda_filtrados AS (
          SELECT
            p.*
          FROM pda_cabecera p
          ${whereSql}
        ),

        ultimo_seguimiento AS (
          SELECT DISTINCT ON (
            c.pda_origen_id
          )
            c.pda_origen_id,
            c.id
              AS ciclo_id,
            c.mejora_detectada

          FROM pda_ciclos_evaluacion c

          INNER JOIN pda_filtrados p
            ON p.id =
               c.pda_origen_id

          WHERE
            LOWER(
              BTRIM(c.tipo_ciclo)
            ) <> 'basal'

          ORDER BY
            c.pda_origen_id,
            c.ciclo_numero
              DESC NULLS LAST,
            c.fecha_fin
              DESC NULLS LAST,
            c.id DESC
        )

        SELECT
          TO_CHAR(
            DATE_TRUNC(
              'month',
              p.fecha_deteccion
            ),
            'YYYY-MM'
          ) AS periodo,

          COUNT(*)::int
            AS generados,

          COUNT(*) FILTER (
            WHERE
              s.ciclo_id
                IS NOT NULL
          )::int
            AS evaluables,

          COUNT(*) FILTER (
            WHERE
              s.mejora_detectada
                IS TRUE
          )::int
            AS mejoraron,

          COUNT(*) FILTER (
            WHERE
              p.fecha_fin_gestion
                IS NOT NULL
          )::int
            AS cerrados

        FROM pda_filtrados p

        LEFT JOIN ultimo_seguimiento s
          ON s.pda_origen_id =
             p.id

        GROUP BY
          DATE_TRUNC(
            'month',
            p.fecha_deteccion
          )

        ORDER BY
          DATE_TRUNC(
            'month',
            p.fecha_deteccion
          )
      `,
      params
    );

  return result.rows;
}
async listInterventionConcentration(
  filters = {}
) {
  const {
    sql: whereSql,
    params
  } =
    AnalyticsRepository
      .buildPdaFilter(filters);

  const result =
    await this.db.query(
      `
        WITH pda_filtrados AS (
          SELECT
            p.*
          FROM pda_cabecera p
          ${whereSql}
        ),

        acciones AS (
          SELECT
            a.pda_id,

            a.frente_id,
            a.atributo_id,
            a.criterio_id,

            COALESCE(
              NULLIF(
                BTRIM(a.frente),
                ''
              ),
              'SIN FRENTE'
            ) AS frente,

            COALESCE(
              NULLIF(
                BTRIM(a.atributo),
                ''
              ),
              'SIN ATRIBUTO'
            ) AS atributo,

            COALESCE(
              NULLIF(
                BTRIM(a.criterio),
                ''
              ),
              NULLIF(
                BTRIM(a.submotivo),
                ''
              ),
              'SIN CRITERIO'
            ) AS criterio

          FROM pda_acciones a

          INNER JOIN pda_filtrados p
            ON p.id = a.pda_id
        )

        SELECT
          'FRENTE'::text
            AS nivel,

          frente_id
            AS id,

          frente
            AS nombre,

          NULL::bigint
            AS padre_id,

          COUNT(
            DISTINCT pda_id
          )::int
            AS pda,

          COUNT(*)::int
            AS acciones

        FROM acciones

        GROUP BY
          frente_id,
          frente


        UNION ALL


        SELECT
          'ATRIBUTO'::text
            AS nivel,

          atributo_id
            AS id,

          atributo
            AS nombre,

          frente_id
            AS padre_id,

          COUNT(
            DISTINCT pda_id
          )::int
            AS pda,

          COUNT(*)::int
            AS acciones

        FROM acciones

        GROUP BY
          frente_id,
          atributo_id,
          atributo


        UNION ALL


        SELECT
          'CRITERIO'::text
            AS nivel,

          criterio_id
            AS id,

          criterio
            AS nombre,

          atributo_id
            AS padre_id,

          COUNT(
            DISTINCT pda_id
          )::int
            AS pda,

          COUNT(*)::int
            AS acciones

        FROM acciones

        GROUP BY
          atributo_id,
          criterio_id,
          criterio

        ORDER BY
          nivel,
          pda DESC,
          acciones DESC,
          nombre
      `,
      params
    );

  return result.rows;
}
}

module.exports = AnalyticsRepository;