class PdaRepository {
  constructor(db) {
    this.db = db;
  }


  // ======================================================
  // TRANSACCIONES
  // ======================================================

  async withTransaction(work) {
    /*
     * Producción:
     * PostgreSQL Pool -> connect()
     *
     * Tests:
     * si el fake no implementa connect(),
     * utilizamos directamente la dependencia recibida.
     */

    const client =
      typeof this.db.connect === 'function'
        ? await this.db.connect()
        : this.db;

    const shouldRelease =
      client !== this.db &&
      typeof client.release === 'function';


    try {
      await client.query('BEGIN');

      const result =
        await work(client);

      await client.query('COMMIT');

      return result;

    } catch (error) {
      try {
        await client.query('ROLLBACK');
      } catch (_) {
        /*
         * No ocultamos el error original
         * si el rollback también falla.
         */
      }

      throw error;

    } finally {
      if (shouldRelease) {
        client.release();
      }
    }
  }


  // ======================================================
  // VALIDACIÓN DE TABLA
  // ======================================================

  async tableExists() {
    const result =
      await this.db.query(`
        SELECT EXISTS (
          SELECT
          FROM information_schema.tables
          WHERE table_schema = 'public'
            AND table_name = 'pda_cabecera'
        );
      `);

    return Boolean(
      result.rows?.[0]?.exists
    );
  }


  // ======================================================
  // LISTADOS
  // ======================================================

  async listPending() {
    const result = await this.db.query(`
    SELECT *
    FROM pda_cabecera
    WHERE estado IN ('pendiente', 'notificado', 'en_gestion')
    ORDER BY created_at DESC
  `);

    return result.rows || [];
  }


  async listTracking() {
    const result =
      await this.db.query(`
        SELECT *
        FROM pda_cabecera
        WHERE estado = 'en_seguimiento'
        ORDER BY created_at DESC
      `);

    return result.rows || [];
  }


  async listHistory() {
    const result = await this.db.query(`
    SELECT *
    FROM pda_cabecera
    WHERE estado IN ('completado', 'escalado', 'corregido')
    ORDER BY created_at DESC
    LIMIT 50
  `);

    return result.rows || [];
  }


  // ======================================================
  // DETALLE PDA
  // ======================================================

  async findHeaderById(pdaId) {
    const result =
      await this.db.query(
        `
          SELECT *
          FROM pda_cabecera
          WHERE id = $1
        `,
        [pdaId]
      );

    return result.rows?.[0] || null;
  }


  async listActions(pdaId) {
    const result = await this.db.query(
      'SELECT * FROM pda_acciones WHERE pda_id = $1 ORDER BY id',
      [pdaId]
    );

    return result.rows || [];
  }

  async listFeedbackItems(
    pdaId
  ) {
    const result =
      await this.db.query(
        `
        SELECT
          pfi.*,

          pa.frente_id,
          pa.atributo_id,

          pa.frente,
          pa.atributo,

          pa.criterio,
          pa.submotivo,
          pa.tipo_accion

        FROM pda_feedback_items pfi

        JOIN pda_acciones pa
          ON pa.id = pfi.accion_id

        WHERE pfi.pda_id = $1

        ORDER BY
          pa.frente,
          pa.atributo,
          pa.criterio,
          pa.id
      `,
        [
          pdaId
        ]
      );


    return result.rows || [];
  }

  async listEvaluationDetailsByIds(
    evaluationIds
  ) {
    const ids =
      (
        Array.isArray(
          evaluationIds
        )
          ? evaluationIds
          : []
      )
        .map(
          value =>
            Number(value)
        )
        .filter(
          value =>
            Number.isInteger(value) &&
            value > 0
        );


    if (
      ids.length === 0
    ) {
      return [];
    }


    const result =
      await this.db.query(
        `
        SELECT
          d.*,

          e.id AS evaluacion_id_real,
          e.agente,
          e.nota_final,

          e.fecha,
          e.id_llamada,
          e.ticket_psi,
          e.evaluador,

          e.quiebre_id,
          e.campana_id,
          e.version_matriz_id

        FROM detalles_evaluacion d

        JOIN evaluaciones e
          ON e.id = d.evaluacion_id

        WHERE d.evaluacion_id =
          ANY($1::bigint[])

        ORDER BY
          d.evaluacion_id,
          d.id
      `,
        [
          ids
        ]
      );


    return result.rows || [];
  }

  async findLatestTrackingCycle(
    pdaId
  ) {
    const result =
      await this.db.query(
        `
        SELECT *
        FROM pda_ciclos_evaluacion

        WHERE pda_origen_id = $1
          AND tipo_ciclo = 'seguimiento'

        ORDER BY
          ciclo_numero DESC NULLS LAST,
          fecha_fin DESC NULLS LAST,
          id DESC

        LIMIT 1
      `,
        [
          pdaId
        ]
      );


    return result.rows?.[0] ||
      null;
  }


  async findBasalCycleByPdaId(
    pdaId
  ) {
    const result =
      await this.db.query(
        `
          SELECT *
          FROM pda_ciclos_evaluacion
          WHERE pda_origen_id = $1
            AND tipo_ciclo = 'basal'
          ORDER BY created_at DESC, id DESC
          LIMIT 1
        `,
        [pdaId]
      );

    return result.rows?.[0] || null;
  }

  async listCyclesByPdaId(
    pdaId
  ) {
    const result =
      await this.db.query(
        `
            SELECT *
            FROM pda_ciclos_evaluacion
            WHERE pda_origen_id = $1
            ORDER BY
                COALESCE(
                    ciclo_numero,
                    0
                ),
                fecha_inicio,
                id
            `,
        [
          pdaId
        ]
      );


    return result.rows || [];
  }

  async findActiveByAgentAndBreak(
    agente,
    quiebreId
  ) {
    const result =
      await this.db.query(
        `
            SELECT *
            FROM pda_cabecera
            WHERE agente = $1
              AND quiebre_id = $2
              AND estado NOT IN (
                    'completado',
                    'corregido',
                    'escalado'
              )
            ORDER BY
                created_at DESC,
                id DESC
            LIMIT 1
            `,
        [
          agente,
          quiebreId
        ]
      );


    return result.rows?.[0] ||
      null;
  }

  async saveTrackingCycle(
    pdaId,
    ciclo
  ) {
    const evaluacionesIds =
      Array.isArray(
        ciclo.evaluaciones_ids
      )
        ? ciclo.evaluaciones_ids
        : [];


    const result =
      await this.db.query(
        `
            INSERT INTO pda_ciclos_evaluacion (
                agente,
                tipo_ciclo,
                pda_origen_id,

                ciclo_numero,

                fecha_inicio,
                fecha_fin,

                total_evaluaciones,
                promedio_nota,
                cuartil,
                mejora_detectada,

                quiebre_id,
                contexto_snapshot,
                evaluaciones_ids,

                created_at,
                updated_at
            )
            VALUES (
                $1,
                'seguimiento',
                $2,

                $3,

                $4,
                $5,

                $6,
                $7,
                $8,
                $9,

                $10,
                $11::jsonb,
                $12::jsonb,

                NOW(),
                NOW()
            )

            ON CONFLICT (
                pda_origen_id,
                ciclo_numero
            )
            WHERE ciclo_numero IS NOT NULL

            DO UPDATE SET
                fecha_inicio =
                    EXCLUDED.fecha_inicio,

                fecha_fin =
                    EXCLUDED.fecha_fin,

                total_evaluaciones =
                    EXCLUDED.total_evaluaciones,

                promedio_nota =
                    EXCLUDED.promedio_nota,

                cuartil =
                    EXCLUDED.cuartil,

                mejora_detectada =
                    EXCLUDED.mejora_detectada,

                quiebre_id =
                    EXCLUDED.quiebre_id,

                contexto_snapshot =
                    EXCLUDED.contexto_snapshot,

                evaluaciones_ids =
                    EXCLUDED.evaluaciones_ids,

                updated_at =
                    NOW()

            RETURNING *
            `,
        [
          ciclo.agente,
          pdaId,

          ciclo.ciclo_numero,

          ciclo.fecha_inicio,
          ciclo.fecha_fin,

          ciclo.total_evaluaciones ??
          evaluacionesIds.length,

          ciclo.promedio_nota ??
          null,

          ciclo.cuartil ??
          null,

          ciclo.mejora_detectada ??
          null,

          ciclo.quiebre_id ??
          null,

          JSON.stringify(
            ciclo.contexto_snapshot ||
            {}
          ),

          JSON.stringify(
            evaluacionesIds
          )
        ]
      );


    return result.rows?.[0] ||
      null;
  }

  async findDocumentByPdaId(
    pdaId
  ) {
    const result =
      await this.db.query(
        `
          SELECT *
          FROM pda_documentos
          WHERE pda_id = $1
          ORDER BY created_at DESC, id DESC
          LIMIT 1
        `,
        [pdaId]
      );

    return result.rows?.[0] || null;
  }


  // ======================================================
  // CREACIÓN COMPLETA PDA
  // ======================================================

  async createComplete({
    cabecera,
    acciones = [],
    ciclo = null,
    documento = null
  }) {
    return this.withTransaction(
      async client => {

        // ==================================================
        // 1. CABECERA
        // ==================================================

        const headerResult =
          await client.query(
            `
              INSERT INTO pda_cabecera (
                agente,
                fecha_deteccion,
                fecha_inicio_ciclo_basal,
                fecha_fin_ciclo_basal,
                cuartil_basal,
                promedio_basal,
                estado,
                ciclo_basal_numero,

                campana,
                campanas,

                quiebre_id,
                campana_id,
                matriz_id,
                version_matriz_id,
                contexto_snapshot,

                created_at,
                updated_at
              )
              VALUES (
                $1,
                $2,
                $3,
                $4,
                $5,
                $6,
                $7,
                $8,

                $9,
                $10,

                $11,
                $12,
                $13,
                $14,
                $15,

                NOW(),
                NOW()
              )
              RETURNING *
            `,
            [
              cabecera.agente,
              cabecera.fecha_deteccion,

              cabecera.fecha_inicio_ciclo_basal ||
              null,

              cabecera.fecha_fin_ciclo_basal ||
              null,

              cabecera.cuartil_basal ||
              'Q4',

              cabecera.promedio_basal ??
              null,

              cabecera.estado ||
              'pendiente',

              cabecera.ciclo_basal_numero ??
              null,

              /*
               * Columnas legacy.
               * Se conservan temporalmente para
               * compatibilidad con código histórico.
               */
              cabecera.campana ||
              'Sin campaña',

              PdaRepository.toJsonb(
                cabecera.campanas,
                []
              ),

              /*
               * Nuevo contexto MECA.
               */
              cabecera.quiebre_id,
              cabecera.campana_id ?? null,
              cabecera.matriz_id,
              cabecera.version_matriz_id,

              PdaRepository.toJsonb(
                cabecera.contexto_snapshot,
                {}
              )
            ]
          );


        const pda =
          headerResult.rows?.[0];


        if (!pda) {
          throw new Error(
            'No se pudo crear la cabecera del PDA'
          );
        }


        const pdaId =
          pda.id;


        // ==================================================
        // 2. ACCIONES / HALLAZGOS
        // ==================================================

        const accionesInsertadas =
          [];


        for (
          const accion
          of acciones
        ) {
          const actionResult =
            await client.query(
              `
                INSERT INTO pda_acciones (
                  pda_id,

                  atributo,
                  submotivo,
                  tipo_accion,
                  descripcion,
                  requiere_codigo,

                  codigo_gescot,
                  observaciones,
                  completado,

                  frente_id,
                  atributo_id,
                  criterio_id,

                  frente,
                  criterio,

                  evaluacion_id,
                  contexto_snapshot,

                  created_at,
                  updated_at
                )
                VALUES (
                  $1,

                  $2,
                  $3,
                  $4,
                  $5,
                  $6,

                  $7,
                  $8,
                  $9,

                  $10,
                  $11,
                  $12,

                  $13,
                  $14,

                  $15,
                  $16,

                  NOW(),
                  NOW()
                )
                RETURNING *
              `,
              [
                pdaId,

                /*
                 * Los campos legacy siguen siendo
                 * obligatorios en la BD.
                 */
                accion.atributo ||
                'Sin atributo',

                accion.submotivo ||
                accion.criterio ||
                'Sin criterio',

                accion.tipo_accion ||
                'proceso',

                accion.descripcion ||
                null,

                accion.requiere_codigo ??
                false,

                accion.codigo_gescot ||
                null,

                accion.observaciones ||
                null,

                accion.completado ??
                false,

                /*
                 * Nueva identidad real de matriz.
                 */
                accion.frente_id ??
                null,

                accion.atributo_id ??
                null,

                accion.criterio_id ??
                null,

                accion.frente ||
                null,

                accion.criterio ||
                accion.submotivo ||
                null,

                accion.evaluacion_id ??
                null,

                PdaRepository.toJsonb(
                  accion.contexto_snapshot,
                  {}
                )
              ]
            );


          if (
            actionResult.rows?.[0]
          ) {
            accionesInsertadas.push(
              actionResult.rows[0]
            );
          }
        }


        // ==================================================
        // 3. CICLO BASAL
        // ==================================================

        let cicloInsertado =
          null;


        if (ciclo) {

          const evaluacionesIds =
            Array.isArray(
              ciclo.evaluaciones_ids
            )
              ? ciclo.evaluaciones_ids
              : [];


          const cycleResult =
            await client.query(
              `
                INSERT INTO pda_ciclos_evaluacion (
                  agente,
                  tipo_ciclo,
                  pda_origen_id,

                  ciclo_numero,

                  fecha_inicio,
                  fecha_fin,

                  total_evaluaciones,
                  promedio_nota,
                  cuartil,
                  mejora_detectada,

                  quiebre_id,
                  contexto_snapshot,
                  evaluaciones_ids,

                  created_at,
                  updated_at
                )
                VALUES (
                  $1,
                  'basal',
                  $2,

                  $3,

                  $4,
                  $5,

                  $6,
                  $7,
                  $8,
                  $9,

                  $10,
                  $11::jsonb,
                  $12::jsonb,

                  NOW(),
                  NOW()
                )
                RETURNING *
              `,
              [
                cabecera.agente,
                pdaId,

                ciclo.ciclo_numero ??
                cabecera.ciclo_basal_numero ??
                null,

                ciclo.fecha_inicio,
                ciclo.fecha_fin,

                ciclo.total_evaluaciones ??
                evaluacionesIds.length,

                ciclo.promedio_nota ??
                null,

                ciclo.cuartil ||
                cabecera.cuartil_basal ||
                'Q4',

                ciclo.mejora_detectada ??
                false,

                ciclo.quiebre_id ??
                cabecera.quiebre_id ??
                null,

                PdaRepository.toJsonb(
                  ciclo.contexto_snapshot ||
                  cabecera.contexto_snapshot,
                  {}
                ),

                PdaRepository.toJsonb(
                  evaluacionesIds,
                  []
                )
              ]
            );


          cicloInsertado =
            cycleResult.rows?.[0] ||
            null;
        }

        // ==================================================
        // 4. DOCUMENTO
        // ==================================================

        let documentoInsertado =
          null;


        if (documento) {
          const documentResult =
            await client.query(
              `
                INSERT INTO pda_documentos (
                  pda_id,

                  documento_id,
                  agente,
                  fecha_emision,

                  periodo_desde,
                  periodo_hasta,

                  total_evaluaciones,
                  promedio_final,
                  cuartil,

                  items_fallados,

                  fecha_proxima_evaluacion,
                  estado,

                  campana,
                  campanas,

                  contenido_html,
                  contenido_texto,
                  contexto_snapshot,

                  created_at,
                  updated_at
                )
                VALUES (
                  $1,

                  $2,
                  $3,
                  $4,

                  $5,
                  $6,

                  $7,
                  $8,
                  $9,

                  $10,

                  $11,
                  $12,

                  $13,
                  $14,

                  $15,
                  $16,
                  $17,

                  NOW(),
                  NOW()
                )
                RETURNING *
              `,
              [
                pdaId,

                documento.documento_id,
                cabecera.agente,

                documento.fecha_emision,

                documento.periodo_desde ||
                ciclo?.fecha_inicio ||
                null,

                documento.periodo_hasta ||
                ciclo?.fecha_fin ||
                null,

                documento.total_evaluaciones ??
                ciclo?.total_evaluaciones ??
                0,

                documento.promedio_final ??
                ciclo?.promedio_nota ??
                cabecera.promedio_basal ??
                null,

                documento.cuartil ||
                ciclo?.cuartil ||
                cabecera.cuartil_basal ||
                'Q4',

                PdaRepository.toJsonb(
                  documento.items_fallados,
                  []
                ),

                documento.fecha_proxima_evaluacion ||
                null,

                documento.estado ||
                'pendiente',

                /*
                 * Legacy.
                 */
                documento.campana ||
                cabecera.campana ||
                'Sin campaña',

                PdaRepository.toJsonb(
                  documento.campanas,
                  []
                ),

                /*
                 * Documento persistido.
                 */
                documento.contenido_html ||
                null,

                documento.contenido_texto ||
                null,

                PdaRepository.toJsonb(
                  documento.contexto_snapshot,
                  {}
                )
              ]
            );


          documentoInsertado =
            documentResult.rows?.[0] ||
            null;
        }


        // ==================================================
        // 5. RESULTADO TRANSACCIONAL
        // ==================================================

        return {
          ...pda,

          acciones:
            accionesInsertadas,

          ciclo:
            cicloInsertado,

          documento:
            documentoInsertado
        };
      }
    );
  }


  // ======================================================
  // EXPORTACIÓN
  // ======================================================

  async exportRows() {
    const result =
      await this.db.query(`
        SELECT
          pc.id,
          pc.agente,
          pc.fecha_deteccion,
          pc.estado,

          pc.promedio_basal,
          pc.cuartil_basal,

          pc.quiebre_id,
          pc.campana_id,
          pc.matriz_id,
          pc.version_matriz_id,

          COUNT(pa.id) as total_acciones,

          COUNT(pa.id) as total_acciones,
          SUM(CASE WHEN pa.completado = true THEN 1 ELSE 0 END) as acciones_completadasacciones_completadas

        FROM pda_cabecera pc

        LEFT JOIN pda_acciones pa
          ON pc.id = pa.pda_id

        GROUP BY
          pc.id,
          pc.agente,
          pc.fecha_deteccion,
          pc.estado,
          pc.promedio_basal,
          pc.cuartil_basal,
          pc.quiebre_id,
          pc.campana_id,
          pc.matriz_id,
          pc.version_matriz_id

        ORDER BY pc.created_at DESC
      `);

    return result.rows || [];
  }

  static toJsonb(
    value,
    fallback = null
  ) {
    if (
      value === undefined ||
      value === null
    ) {
      return fallback === null
        ? null
        : JSON.stringify(
          fallback
        );
    }

    return JSON.stringify(
      value
    );
  }

  async sendToTraining(
    pdaId,
    {
      enviado_por,
      motivo = null
    } = {}
  ) {
    const result =
      await this.db.query(
        `
        UPDATE pda_cabecera

        SET
          estado =
            'requiere_capacitacion',

          fecha_envio_capacitacion =
            CURRENT_DATE,

          enviado_por =
            $2,

          updated_at =
            NOW()

        WHERE id = $1

        RETURNING *
      `,
        [
          pdaId,
          enviado_por
        ]
      );


    return result.rows?.[0] ||
      null;
  }

  async sendToTraining(
    pdaId,
    {
      enviado_por
    } = {}
  ) {
    const result =
      await this.db.query(
        `
        UPDATE pda_cabecera

        SET
          estado =
            'requiere_capacitacion',

          fecha_envio_capacitacion =
            CURRENT_DATE,

          enviado_por =
            $2,

          updated_at =
            NOW()

        WHERE id = $1

        RETURNING *
      `,
        [
          pdaId,
          enviado_por
        ]
      );


    return result.rows?.[0] ||
      null;
  }

  async saveFeedback(
    pdaId,
    data
  ) {
    const client =
      await this.db.connect();

    try {
      await client.query(
        'BEGIN'
      );


      // ==============================================
      // 1. ACTUALIZAR CABECERA
      // ==============================================

      const cabeceraResult =
        await client.query(
          `
                UPDATE pda_cabecera

                SET
                    estado = 'en_seguimiento',
                    gescot_reunion = $2,
                    fecha_feedback = $3,
                    feedback_por = $4,
                    observaciones_feedback = $5,
                    fecha_inicio_seguimiento = NOW(),
                    updated_at = NOW()

                WHERE id = $1

                RETURNING *
                `,
          [
            pdaId,
            data.gescot,
            data.fecha_feedback,
            data.supervisor,
            data.observaciones || null
          ]
        );


      if (
        cabeceraResult.rows.length ===
        0
      ) {
        const error =
          new Error(
            'PDA no encontrado'
          );

        error.status =
          404;

        throw error;
      }


      // ==============================================
      // 2. GUARDAR DETALLE DE TEMAS TRABAJADOS
      // ==============================================

      const items =
        Array.isArray(
          data.items
        )
          ? data.items
          : [];


      for (
        const item
        of items
      ) {
        await client.query(
          `
                INSERT INTO pda_feedback_items (
                    pda_id,
                    accion_id,
                    criterio_id,
                    estado,
                    observacion,
                    registrado_por,
                    fecha_registro,
                    updated_at
                )
                VALUES (
                    $1,
                    $2,
                    $3,
                    $4,
                    $5,
                    $6,
                    NOW(),
                    NOW()
                )

                ON CONFLICT (
                    pda_id,
                    accion_id
                )

                DO UPDATE SET
                    criterio_id =
                        EXCLUDED.criterio_id,

                    estado =
                        EXCLUDED.estado,

                    observacion =
                        EXCLUDED.observacion,

                    registrado_por =
                        EXCLUDED.registrado_por,

                    updated_at =
                        NOW()
                `,
          [
            pdaId,
            item.accion_id,
            item.criterio_id || null,
            item.estado,
            item.observacion || null,
            data.supervisor
          ]
        );
      }


      // ==============================================
      // 3. ACTUALIZAR HISTORIAL
      // ==============================================

      const historialResult =
        await client.query(
          `
                SELECT
                    historial_estados

                FROM pda_cabecera

                WHERE id = $1

                FOR UPDATE
                `,
          [
            pdaId
          ]
        );


      let historial =
        historialResult
          .rows[0]
          ?.historial_estados;


      if (
        typeof historial ===
        'string'
      ) {
        try {
          historial =
            JSON.parse(
              historial
            );
        } catch {
          historial =
            [];
        }
      }


      if (
        !Array.isArray(
          historial
        )
      ) {
        historial =
          [];
      }


      historial.push({
        fecha:
          new Date()
            .toISOString(),

        usuario:
          data.supervisor,

        evento:
          'feedback_registrado',

        detalle: {
          gescot:
            data.gescot,

          fecha_feedback:
            data.fecha_feedback,

          observaciones:
            data.observaciones ||
            null,

          total_items:
            items.length,

          trabajados:
            items.filter(
              item =>
                item.estado ===
                'trabajado'
            ).length,

          parciales:
            items.filter(
              item =>
                item.estado ===
                'parcial'
            ).length,

          no_trabajados:
            items.filter(
              item =>
                item.estado ===
                'no_trabajado'
            ).length
        }
      });


      if (
        historial.length >
        50
      ) {
        historial =
          historial.slice(
            -50
          );
      }


      await client.query(
        `
            UPDATE pda_cabecera

            SET
                historial_estados = $2::jsonb,
                updated_at = NOW()

            WHERE id = $1
            `,
        [
          pdaId,
          JSON.stringify(
            historial
          )
        ]
      );


      await client.query(
        'COMMIT'
      );


      return {
        ...cabeceraResult.rows[0],

        feedback: {
          total:
            items.length,

          trabajados:
            items.filter(
              item =>
                item.estado ===
                'trabajado'
            ).length,

          parciales:
            items.filter(
              item =>
                item.estado ===
                'parcial'
            ).length,

          no_trabajados:
            items.filter(
              item =>
                item.estado ===
                'no_trabajado'
            ).length
        }
      };


    } catch (error) {

      await client.query(
        'ROLLBACK'
      );

      throw error;


    } finally {

      client.release();
    }
  }
  async closeForImprovement(
    pdaId,
    {
      cuartil_seguimiento,
      promedio_seguimiento,
      ciclo_seguimiento_numero,
      cerrado_por
    } = {}
  ) {
    return this.withTransaction(
      async client => {

        // ================================================
        // 1. CABECERA ACTUAL
        // ================================================

        const currentResult =
          await client.query(
            `
            SELECT
              id,
              historial_estados

            FROM pda_cabecera

            WHERE id = $1

            FOR UPDATE
          `,
            [
              pdaId
            ]
          );


        const actual =
          currentResult.rows?.[0] ||
          null;


        if (!actual) {
          return null;
        }


        // ================================================
        // 2. HISTORIAL EXISTENTE
        // ================================================

        let historial =
          [];


        const origen =
          actual.historial_estados;


        if (
          Array.isArray(
            origen
          )
        ) {
          historial =
            [...origen];

        } else if (
          typeof origen ===
          'string'
        ) {
          try {

            const parsed =
              JSON.parse(
                origen
              );


            historial =
              Array.isArray(
                parsed
              )
                ? parsed
                : [];

          } catch {
            historial =
              [];
          }

        } else if (
          origen &&
          typeof origen ===
          'object'
        ) {
          historial =
            Object.values(
              origen
            );
        }


        // ================================================
        // 3. EVENTO DE CIERRE
        // ================================================

        const ahora =
          new Date();


        historial.push({
          fecha:
            ahora.toISOString(),

          fecha_display:
            ahora.toLocaleString(
              'es-PE'
            ),

          usuario:
            cerrado_por,

          usuario_id:
            null,

          evento:
            'cerrado_exitoso',

          detalle: {
            cuartil_seguimiento:
              cuartil_seguimiento ??
              null,

            promedio_seguimiento:
              promedio_seguimiento ??
              null,

            ciclo_seguimiento_numero:
              ciclo_seguimiento_numero ??
              null,

            cerrado_por:
              cerrado_por
          }
        });


        if (
          historial.length >
          50
        ) {
          historial =
            historial.slice(
              -50
            );
        }


        // ================================================
        // 4. CERRAR PDA
        // ================================================

        const result =
          await client.query(
            `
            UPDATE pda_cabecera

            SET
              estado =
                'completado',

              cuartil_seguimiento =
                $2,

              promedio_seguimiento =
                $3,

              ciclo_seguimiento_numero =
                $4,

              historial_estados =
                $5::jsonb,

              updated_at =
                NOW()

            WHERE id = $1

            RETURNING *
          `,
            [
              pdaId,

              cuartil_seguimiento ??
              null,

              promedio_seguimiento ??
              null,

              ciclo_seguimiento_numero ??
              null,

              JSON.stringify(
                historial
              )
            ]
          );


        return result.rows?.[0] ||
          null;
      }
    );
  }
  async registerTraining(
    pdaId,
    {
      gescot,
      fecha_capacitacion,
      capacitador,
      observaciones = null,
      accion_ids = []
    } = {}
  ) {
    return this.withTransaction(
      async client => {

        // ================================================
        // 1. VALIDAR PDA
        // ================================================

        const headerResult =
          await client.query(
            `
            SELECT *
            FROM pda_cabecera
            WHERE id = $1
            FOR UPDATE
          `,
            [
              pdaId
            ]
          );


        const pda =
          headerResult.rows?.[0] ||
          null;


        if (!pda) {
          return null;
        }


        // ================================================
        // 2. ACTUALIZAR ACCIONES SELECCIONADAS
        // ================================================

        const ids =
          (
            Array.isArray(
              accion_ids
            )
              ? accion_ids
              : []
          )
            .map(
              value =>
                Number(value)
            )
            .filter(
              value =>
                Number.isInteger(
                  value
                ) &&
                value > 0
            );


        if (
          ids.length > 0
        ) {
          await client.query(
            `
            UPDATE pda_acciones

            SET
              completado =
                TRUE,

              codigo_gescot =
                $2,

              fecha_completado =
                $3,

              completado_por =
                $4,

              observaciones =
                $5,

              updated_at =
                NOW()

            WHERE pda_id = $1
              AND id =
                ANY($6::bigint[])
          `,
            [
              pdaId,
              gescot,
              fecha_capacitacion,
              capacitador,
              observaciones,
              ids
            ]
          );
        }


        // ================================================
        // 3. HISTORIAL
        // ================================================

        let historial =
          [];


        const origen =
          pda.historial_estados;


        if (
          Array.isArray(
            origen
          )
        ) {
          historial =
            [...origen];

        } else if (
          typeof origen ===
          'string'
        ) {
          try {
            const parsed =
              JSON.parse(
                origen
              );


            historial =
              Array.isArray(
                parsed
              )
                ? parsed
                : [];

          } catch {
            historial =
              [];
          }

        } else if (
          origen &&
          typeof origen ===
          'object'
        ) {
          historial =
            Object.values(
              origen
            );
        }


        const ahora =
          new Date();


        historial.push({
          fecha:
            ahora.toISOString(),

          fecha_display:
            ahora.toLocaleString(
              'es-PE'
            ),

          usuario:
            capacitador,

          usuario_id:
            null,

          evento:
            'capacitacion_registrada',

          detalle: {
            gescot,
            fecha_capacitacion,
            capacitador,
            items_completados:
              ids.length,
            observaciones
          }
        });


        if (
          historial.length >
          50
        ) {
          historial =
            historial.slice(
              -50
            );
        }


        // ================================================
        // 4. VOLVER A SEGUIMIENTO
        // ================================================

        const result =
          await client.query(
            `
            UPDATE pda_cabecera

            SET
              estado =
                'en_seguimiento',

              gescot_capacitacion =
                $2,

              fecha_capacitacion =
                $3,

              capacitador =
                $4,

              observaciones_capacitacion =
                $5,

              fecha_inicio_seguimiento_capacitacion =
                NOW(),

              historial_estados =
                $6::jsonb,

              updated_at =
                NOW()

            WHERE id = $1

            RETURNING *
          `,
            [
              pdaId,
              gescot,
              fecha_capacitacion,
              capacitador,
              observaciones,
              JSON.stringify(
                historial
              )
            ]
          );


        return result.rows?.[0] ||
          null;
      }
    );
  }
  async escalate(
    pdaId,
    {
      escalado_por,
      motivo
    } = {}
  ) {
    return this.withTransaction(
      async client => {

        const currentResult =
          await client.query(
            `
                    SELECT
                        id,
                        historial_estados

                    FROM pda_cabecera

                    WHERE id = $1

                    FOR UPDATE
                    `,
            [
              pdaId
            ]
          );


        const pda =
          currentResult.rows?.[0] ||
          null;


        if (!pda) {
          return null;
        }


        // ==========================================
        // HISTORIAL
        // ==========================================

        let historial =
          [];


        const origen =
          pda.historial_estados;


        if (
          Array.isArray(
            origen
          )
        ) {
          historial =
            [...origen];

        } else if (
          typeof origen ===
          'string'
        ) {
          try {

            const parsed =
              JSON.parse(
                origen
              );


            historial =
              Array.isArray(
                parsed
              )
                ? parsed
                : [];

          } catch {
            historial =
              [];
          }

        } else if (
          origen &&
          typeof origen ===
          'object'
        ) {
          historial =
            Object.values(
              origen
            );
        }


        const ahora =
          new Date();


        historial.push({
          fecha:
            ahora.toISOString(),

          fecha_display:
            ahora.toLocaleString(
              'es-PE'
            ),

          usuario:
            escalado_por,

          usuario_id:
            null,

          evento:
            'escalado',

          detalle: {
            motivo:
              motivo,

            escalado_por:
              escalado_por
          }
        });


        if (
          historial.length >
          50
        ) {
          historial =
            historial.slice(
              -50
            );
        }


        // ==========================================
        // ACTUALIZAR PDA
        // ==========================================

        const result =
          await client.query(
            `
                    UPDATE pda_cabecera

                    SET
                        estado =
                            'escalado',

                        fecha_escalamiento =
                            CURRENT_DATE,

                        escalado_por =
                            $2,

                        observaciones_escalamiento =
                            $3,

                        historial_estados =
                            $4::jsonb,

                        updated_at =
                            NOW()

                    WHERE id = $1

                    RETURNING *
                    `,
            [
              pdaId,
              escalado_por,
              motivo,
              JSON.stringify(
                historial
              )
            ]
          );


        return result.rows?.[0] ||
          null;
      }
    );
  }
}


module.exports = PdaRepository;