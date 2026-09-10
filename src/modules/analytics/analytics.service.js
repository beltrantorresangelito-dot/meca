class AnalyticsService {
  constructor(repository = null) {
    this.repository = repository;
  }

  static validationError(message, code = 'ANALYTICS_VALIDATION_ERROR') {
    const error = new Error(message);
    error.status = 400;
    error.code = code;
    return error;
  }

  static normalizeOptionalText(value) {
    if (
      value === undefined ||
      value === null
    ) {
      return null;
    }

    const normalized = String(value).trim();

    return normalized || null;
  }

  static normalizePositiveId(value, fieldName) {
    if (
      value === undefined ||
      value === null ||
      String(value).trim() === ''
    ) {
      return null;
    }

    const parsed = Number(value);

    if (
      !Number.isInteger(parsed) ||
      parsed <= 0
    ) {
      throw AnalyticsService.validationError(
        `${fieldName} debe ser un entero positivo`
      );
    }

    return parsed;
  }

  static normalizeDate(value, fieldName) {
    if (
      value === undefined ||
      value === null ||
      String(value).trim() === ''
    ) {
      return null;
    }

    const normalized = String(value).trim();

    if (!/^\d{4}-\d{2}-\d{2}$/.test(normalized)) {
      throw AnalyticsService.validationError(
        `${fieldName} debe tener formato YYYY-MM-DD`
      );
    }

    const [year, month, day] =
      normalized.split('-').map(Number);

    const date = new Date(
      Date.UTC(year, month - 1, day)
    );

    if (
      date.getUTCFullYear() !== year ||
      date.getUTCMonth() !== month - 1 ||
      date.getUTCDate() !== day
    ) {
      throw AnalyticsService.validationError(
        `${fieldName} contiene una fecha inválida`
      );
    }

    return normalized;
  }

  static normalizeBoolean(value, fieldName) {
    if (
      value === undefined ||
      value === null ||
      String(value).trim() === ''
    ) {
      return false;
    }

    if (
      value === true ||
      value === 1 ||
      value === '1' ||
      String(value).trim().toLowerCase() === 'true'
    ) {
      return true;
    }

    if (
      value === false ||
      value === 0 ||
      value === '0' ||
      String(value).trim().toLowerCase() === 'false'
    ) {
      return false;
    }

    throw AnalyticsService.validationError(
      `${fieldName} debe ser booleano`
    );
  }

  static normalizeFilters(query = {}) {
    if (
      !query ||
      typeof query !== 'object' ||
      Array.isArray(query)
    ) {
      throw AnalyticsService.validationError(
        'Filtros de Analytics inválidos'
      );
    }

    const fechaDesde =
      AnalyticsService.normalizeDate(
        query.fecha_desde ??
        query.fechaDesde,
        'fecha_desde'
      );

    const fechaHasta =
      AnalyticsService.normalizeDate(
        query.fecha_hasta ??
        query.fechaHasta,
        'fecha_hasta'
      );

    if (
      fechaDesde &&
      fechaHasta &&
      fechaDesde > fechaHasta
    ) {
      throw AnalyticsService.validationError(
        'fecha_desde no puede ser mayor que fecha_hasta',
        'ANALYTICS_DATE_RANGE_INVALID'
      );
    }

    const quiebreId =
      AnalyticsService.normalizePositiveId(
        query.quiebre_id ??
        query.quiebreId,
        'quiebre_id'
      );

    const campanaId =
      AnalyticsService.normalizePositiveId(
        query.campana_id ??
        query.campanaId,
        'campana_id'
      );

    const matrizId =
      AnalyticsService.normalizePositiveId(
        query.matriz_id ??
        query.matrizId,
        'matriz_id'
      );

    const sinCampana =
      AnalyticsService.normalizeBoolean(
        query.sin_campana ??
        query.sinCampana,
        'sin_campana'
      );

    if (campanaId !== null && sinCampana) {
      throw AnalyticsService.validationError(
        'campana_id y sin_campana=true no pueden utilizarse simultáneamente',
        'ANALYTICS_CAMPAIGN_FILTER_CONFLICT'
      );
    }

    let campaignMode = 'TODAS';

    if (sinCampana) {
      campaignMode = 'SIN_CAMPANA';
    } else if (campanaId !== null) {
      campaignMode = 'ESPECIFICA';
    }

    return {
      fechaDesde,
      fechaHasta,

      quiebreId,

      campana: {
        modo: campaignMode,
        id:
          campaignMode === 'ESPECIFICA'
            ? campanaId
            : null
      },

      matrizId,

      lider:
        AnalyticsService.normalizeOptionalText(
          query.lider
        ),

      gestor:
        AnalyticsService.normalizeOptionalText(
          query.gestor
        ),

      auditor:
        AnalyticsService.normalizeOptionalText(
          query.auditor
        )
    };
  }
  async getPopulation(query = {}) {
    if (!this.repository) {
      const error = new Error(
        'AnalyticsService requiere repository'
      );

      error.status = 500;
      error.code = 'ANALYTICS_REPOSITORY_REQUIRED';

      throw error;
    }

    const filters =
      AnalyticsService.normalizeFilters(query);

    const rows =
      await this.repository.listPopulation(filters);

    return {
      filters,
      total: rows.length,
      data: rows
    };
  }
  async getExecutiveSummary(query = {}) {
    if (!this.repository) {
      const error = new Error(
        'AnalyticsService requiere repository'
      );
      error.status = 500;
      error.code = 'ANALYTICS_REPOSITORY_REQUIRED';
      throw error;
    }

    const filters =
      AnalyticsService.normalizeFilters(query);

    const [
      summary,
      rangeDistribution
    ] = await Promise.all([
      this.repository.getExecutiveSummary(filters),
      this.repository.listRangeDistribution(filters)
    ]);

    const evaluaciones =
      Number(summary?.evaluaciones || 0);

    const rangos =
      (rangeDistribution || []).map((item) => {
        const cantidad =
          Number(item.cantidad || 0);

        const porcentaje =
          evaluaciones > 0
            ? Number(
              (
                (cantidad / evaluaciones) *
                100
              ).toFixed(2)
            )
            : 0;

        return {
          rango: item.rango,
          cantidad,
          porcentaje
        };
      });

    return {
      filters,

      poblacion: {
        evaluaciones,
        gestores:
          Number(summary?.gestores || 0),
        auditores:
          Number(summary?.auditores || 0)
      },

      calidad: {
        notaPromedio:
          summary?.nota_promedio == null
            ? null
            : Number(summary.nota_promedio),

        notaMinima:
          summary?.nota_minima == null
            ? null
            : Number(summary.nota_minima),

        notaMaxima:
          summary?.nota_maxima == null
            ? null
            : Number(summary.nota_maxima)
      },

      errores: {
        enc:
          Number(summary?.total_enc || 0),

        ecuf:
          Number(summary?.total_ecuf || 0),

        ecn:
          Number(summary?.total_ecn || 0)
      },

      rangos
    };
  }
  async getFilters(query = {}) {
    if (!this.repository) {
      const error = new Error(
        'AnalyticsService requiere repository'
      );

      error.status = 500;
      error.code =
        'ANALYTICS_REPOSITORY_REQUIRED';

      throw error;
    }

    const filters =
      AnalyticsService.normalizeFilters(query);

    const [
      breakRows,
      campaignRows,
      matrixRows,
      leaderRows,
      managerRows,
      auditorRows
    ] = await Promise.all([
      this.repository.listBreakDimensions(
        filters
      ),

      this.repository.listCampaignDimensions(
        filters
      ),

      this.repository.listMatrixDimensions(
        filters
      ),

      this.repository.listLeaderDimensions(
        filters
      ),

      this.repository.listManagerDimensions(
        filters
      ),

      this.repository.listAuditorDimensions(
        filters
      )
    ]);

    const quiebres = [];
    let sinContexto = 0;

    for (const row of breakRows || []) {
      if (row.quiebre_id == null) {
        sinContexto +=
          Number(row.evaluaciones || 0);

        continue;
      }

      quiebres.push({
        id: Number(row.quiebre_id),
        codigo: row.quiebre_codigo,
        descripcion:
          row.quiebre_descripcion,
        evaluaciones:
          Number(row.evaluaciones || 0)
      });
    }

    const campanas = [];
    const sinCampana = [];

    for (const row of campaignRows || []) {
      const quiebreId =
        row.quiebre_id == null
          ? null
          : Number(row.quiebre_id);

      /*
       * NULL + NULL = registro sin contexto.
       * No debe convertirse en "Sin campaña".
       */
      if (
        quiebreId == null &&
        row.campana_id == null
      ) {
        continue;
      }

      /*
       * Quiebre conocido + campaña NULL
       * = asignación directa válida.
       */
      if (row.campana_id == null) {
        sinCampana.push({
          quiebreId,
          evaluaciones:
            Number(row.evaluaciones || 0)
        });

        continue;
      }

      campanas.push({
        id: Number(row.campana_id),
        quiebreId,
        codigo: row.campana_codigo,
        descripcion:
          row.campana_descripcion,
        evaluaciones:
          Number(row.evaluaciones || 0)
      });
    }

    const matrices = [];
    let sinMatriz = 0;

    for (const row of matrixRows || []) {
      if (row.matriz_id == null) {
        sinMatriz +=
          Number(row.evaluaciones || 0);

        continue;
      }

      matrices.push({
        id: Number(row.matriz_id),
        codigo: row.matriz_codigo,
        evaluaciones:
          Number(row.evaluaciones || 0)
      });
    }

    const lideres =
      (leaderRows || []).map((row) => ({
        nombre: row.lider,
        evaluaciones:
          Number(row.evaluaciones || 0)
      }));

    const gestores =
      (managerRows || []).map((row) => ({
        nombre: row.gestor,
        evaluaciones:
          Number(row.evaluaciones || 0)
      }));

    const auditores =
      (auditorRows || []).map((row) => ({
        nombre: row.auditor,
        evaluaciones:
          Number(row.evaluaciones || 0)
      }));

    return {
      filters,

      quiebres,

      campanas,

      sinCampana,

      matrices,

      sinMatriz: {
        evaluaciones: sinMatriz
      },

      lideres,

      gestores,

      auditores,

      calidadDatos: {
        sinContexto
      }
    };

  }
  async getDiagnostic(
    query = {}
  ) {
    if (!this.repository) {
      const error =
        new Error(
          'AnalyticsService requiere repository'
        );

      error.status = 500;
      error.code =
        'ANALYTICS_REPOSITORY_REQUIRED';

      throw error;
    }


    const filters =
      AnalyticsService.normalizeFilters(
        query
      );


    const rows =
      await this.repository
        .listDiagnosticPareto(
          filters
        );


    /*
     * --------------------------------------------------
     * NORMALIZACIÓN DE CRITERIOS
     * --------------------------------------------------
     */
    const criterios =
      (rows || []).map(
        row => ({
          frente:
            row.bloque ?? null,

          atributo:
            row.atributo ?? null,

          criterio:
            row.submotivo ?? null,


          registros:
            Number(
              row.registros || 0
            ),

          incumplimientos:
            Number(
              row.incumplimientos || 0
            ),

          cumplimientos:
            Number(
              row.cumplimientos || 0
            ),

          noAplica:
            Number(
              row.no_aplica || 0
            ),

          sinRespuesta:
            Number(
              row.sin_respuesta || 0
            ),


          respuestasAplicablesExplicitas:
            Number(
              row
                .respuestas_aplicables_explicitas ||
              0
            ),

          respuestasTriestado:
            Number(
              row.respuestas_triestado || 0
            ),


          /*
           * IMPORTANTE:
           * esta tasa solo utiliza respuestas
           * 0/1 explícitamente identificadas.
           */
          tasaIncumplimientoExplicitaPct:
            row
              .tasa_incumplimiento_explicita_pct ==
              null
              ? null
              : Number(
                row
                  .tasa_incumplimiento_explicita_pct
              ),


          coberturaTriestadoPct:
            Number(
              row
                .cobertura_triestado_pct ||
              0
            ),


          participacionFallasPct:
            Number(
              row
                .participacion_fallas_pct ||
              0
            ),


          paretoAcumuladoPct:
            Number(
              row
                .pareto_acumulado_pct ||
              0
            )
        })
      );


    /*
     * --------------------------------------------------
     * TOTALES
     * --------------------------------------------------
     */
    const totalIncumplimientos =
      criterios.reduce(
        (
          total,
          item
        ) =>
          total +
          item.incumplimientos,
        0
      );


    const totalRegistrosDetalle =
      criterios.reduce(
        (
          total,
          item
        ) =>
          total +
          item.registros,
        0
      );


    const totalRespuestasTriestado =
      criterios.reduce(
        (
          total,
          item
        ) =>
          total +
          item.respuestasTriestado,
        0
      );


    const totalSinRespuesta =
      criterios.reduce(
        (
          total,
          item
        ) =>
          total +
          item.sinRespuesta,
        0
      );


    const coberturaTriestadoGlobalPct =
      totalRegistrosDetalle > 0
        ? Number(
          (
            totalRespuestasTriestado /
            totalRegistrosDetalle *
            100
          ).toFixed(2)
        )
        : 0;


    /*
     * --------------------------------------------------
     * NÚCLEO PARETO 80%
     * --------------------------------------------------
     *
     * Incluimos el criterio que cruza
     * el umbral del 80%.
     * --------------------------------------------------
     */
    const nucleoPareto80 = [];

    for (const criterio of criterios) {
      if (
        criterio.incumplimientos <= 0
      ) {
        continue;
      }

      nucleoPareto80.push(
        criterio
      );

      if (
        criterio.paretoAcumuladoPct >=
        80
      ) {
        break;
      }
    }


    const participacionNucleoPareto80Pct =
      nucleoPareto80.length > 0
        ? nucleoPareto80[
          nucleoPareto80.length - 1
        ].paretoAcumuladoPct
        : 0;


    /*
     * --------------------------------------------------
     * AGRUPACIÓN POR FRENTE
     * --------------------------------------------------
     */
    const frentesMap =
      new Map();


    for (const criterio of criterios) {
      const frente =
        criterio.frente ||
        'SIN_FRENTE';


      if (
        !frentesMap.has(frente)
      ) {
        frentesMap.set(
          frente,
          {
            frente:
              criterio.frente,

            incumplimientos: 0,

            criteriosConFalla: 0
          }
        );
      }


      const item =
        frentesMap.get(frente);


      item.incumplimientos +=
        criterio.incumplimientos;

      item.criteriosConFalla += 1;
    }


    const frentes =
      Array.from(
        frentesMap.values()
      )
        .map(
          item => ({
            ...item,

            participacionFallasPct:
              totalIncumplimientos > 0
                ? Number(
                  (
                    item.incumplimientos /
                    totalIncumplimientos *
                    100
                  ).toFixed(2)
                )
                : 0
          })
        )
        .sort(
          (
            a,
            b
          ) =>
            b.incumplimientos -
            a.incumplimientos
        );


    /*
     * --------------------------------------------------
     * AGRUPACIÓN POR ATRIBUTO
     * --------------------------------------------------
     */
    const atributosMap =
      new Map();


    for (const criterio of criterios) {
      const key =
        `${criterio.frente || ''}` +
        '|' +
        `${criterio.atributo || ''}`;


      if (
        !atributosMap.has(key)
      ) {
        atributosMap.set(
          key,
          {
            frente:
              criterio.frente,

            atributo:
              criterio.atributo,

            incumplimientos: 0,

            criteriosConFalla: 0
          }
        );
      }


      const item =
        atributosMap.get(key);


      item.incumplimientos +=
        criterio.incumplimientos;

      item.criteriosConFalla += 1;
    }


    const atributos =
      Array.from(
        atributosMap.values()
      )
        .map(
          item => ({
            ...item,

            participacionFallasPct:
              totalIncumplimientos > 0
                ? Number(
                  (
                    item.incumplimientos /
                    totalIncumplimientos *
                    100
                  ).toFixed(2)
                )
                : 0
          })
        )
        .sort(
          (
            a,
            b
          ) =>
            b.incumplimientos -
            a.incumplimientos
        );


    return {
      filters,


      resumen: {
        totalIncumplimientos,

        criteriosConFalla:
          criterios.length,

        criteriosNucleoPareto80:
          nucleoPareto80.length,

        participacionNucleoPareto80Pct,

        frenteMayorConcentracion:
          frentes[0] ?? null,

        atributoMayorConcentracion:
          atributos[0] ?? null
      },


      calidadDatos: {
        registrosDetalle:
          totalRegistrosDetalle,

        respuestasTriestado:
          totalRespuestasTriestado,

        sinRespuesta:
          totalSinRespuesta,

        coberturaTriestadoPct:
          coberturaTriestadoGlobalPct,

        historialParcial:
          totalSinRespuesta > 0
      },


      pareto: {
        umbralPct: 80,

        nucleo:
          nucleoPareto80,

        criterios
      },


      frentes,

      atributos
    };
  }

  async getConcentration(query = {}) {
    if (
      !this.repository ||
      typeof this.repository.listConcentration !== 'function'
    ) {
      const error =
        new Error(
          'AnalyticsRepository.listConcentration no está disponible'
        );

      error.status = 500;
      error.code =
        'ANALYTICS_REPOSITORY_METHOD_MISSING';

      throw error;
    }

    const filters =
      this.normalizeFilters
        ? this.normalizeFilters(query)
        : query;

    const rows =
      await this.repository.listConcentration(
        filters
      );

    const filas =
      Array.isArray(rows)
        ? rows
        : [];


    // ====================================================
    // OPERACIÓN
    // Líder → Gestor
    // ====================================================

    const lideresMap =
      new Map();

    let totalIncumplimientosOperacion =
      0;


    for (const row of filas) {
      const lider =
        row?.lider ||
        'Sin líder';

      const gestor =
        row?.gestor ||
        'Sin gestor';

      const evaluaciones =
        Number(
          row?.evaluaciones ||
          0
        );

      const incumplimientos =
        Number(
          row?.incumplimientos ||
          0
        );


      totalIncumplimientosOperacion +=
        incumplimientos;


      if (!lideresMap.has(lider)) {
        lideresMap.set(
          lider,
          {
            lider,

            evaluaciones: 0,

            incumplimientos: 0,

            gestoresMap:
              new Map()
          }
        );
      }


      const liderActual =
        lideresMap.get(lider);


      liderActual.evaluaciones +=
        evaluaciones;

      liderActual.incumplimientos +=
        incumplimientos;


      if (
        !liderActual
          .gestoresMap
          .has(gestor)
      ) {
        liderActual
          .gestoresMap
          .set(
            gestor,
            {
              gestor,

              evaluaciones: 0,

              incumplimientos: 0
            }
          );
      }


      const gestorActual =
        liderActual
          .gestoresMap
          .get(gestor);


      gestorActual.evaluaciones +=
        evaluaciones;

      gestorActual.incumplimientos +=
        incumplimientos;
    }


    const lideres =
      Array.from(
        lideresMap.values()
      )
        .map(
          lider => {
            const gestores =
              Array.from(
                lider
                  .gestoresMap
                  .values()
              )
                .map(
                  gestor => ({
                    gestor:
                      gestor.gestor,

                    evaluaciones:
                      gestor.evaluaciones,

                    incumplimientos:
                      gestor.incumplimientos,

                    participacionPct:
                      lider.incumplimientos > 0
                        ? Number(
                          (
                            gestor.incumplimientos /
                            lider.incumplimientos *
                            100
                          ).toFixed(2)
                        )
                        : 0
                  })
                )
                .sort(
                  (a, b) =>
                    b.incumplimientos -
                    a.incumplimientos
                );


            return {
              lider:
                lider.lider,

              evaluaciones:
                lider.evaluaciones,

              incumplimientos:
                lider.incumplimientos,

              participacionPct:
                totalIncumplimientosOperacion > 0
                  ? Number(
                    (
                      lider.incumplimientos /
                      totalIncumplimientosOperacion *
                      100
                    ).toFixed(2)
                  )
                  : 0,

              gestores
            };
          }
        )
        .sort(
          (a, b) =>
            b.incumplimientos -
            a.incumplimientos
        );


    // ====================================================
    // AUDITORÍA
    // Auditor independiente
    // ====================================================

    const auditoresMap =
      new Map();

    let totalIncumplimientosAuditoria =
      0;


    for (const row of filas) {
      const auditor =
        row?.auditor ||
        'Sin auditor';

      const evaluaciones =
        Number(
          row?.evaluaciones ||
          0
        );

      const incumplimientos =
        Number(
          row?.incumplimientos ||
          0
        );


      totalIncumplimientosAuditoria +=
        incumplimientos;


      if (
        !auditoresMap.has(
          auditor
        )
      ) {
        auditoresMap.set(
          auditor,
          {
            auditor,

            evaluaciones: 0,

            incumplimientos: 0
          }
        );
      }


      const auditorActual =
        auditoresMap.get(
          auditor
        );


      auditorActual.evaluaciones +=
        evaluaciones;

      auditorActual.incumplimientos +=
        incumplimientos;
    }


    const auditores =
      Array.from(
        auditoresMap.values()
      )
        .map(
          auditor => ({
            auditor:
              auditor.auditor,

            evaluaciones:
              auditor.evaluaciones,

            incumplimientos:
              auditor.incumplimientos,

            participacionPct:
              totalIncumplimientosAuditoria > 0
                ? Number(
                  (
                    auditor.incumplimientos /
                    totalIncumplimientosAuditoria *
                    100
                  ).toFixed(2)
                )
                : 0
          })
        )
        .sort(
          (a, b) =>
            b.incumplimientos -
            a.incumplimientos
        );


    return {
      filters,

      operacion: {
        lideres
      },

      auditoria: {
        auditores
      }
    };
  }

  async getFindingDetail(query = {}) {
  if (
    !this.repository ||
    typeof this.repository
      .listFindingEvaluations !== 'function'
  ) {
    const error =
      new Error(
        'AnalyticsRepository.listFindingEvaluations no está disponible'
      );

    error.status = 500;
    error.code =
      'ANALYTICS_REPOSITORY_METHOD_MISSING';

    throw error;
  }


  const filters =
    AnalyticsService.normalizeFilters(
      query
    );


  const frente =
    AnalyticsService.normalizeOptionalText(
      query.frente
    );

  const atributo =
    AnalyticsService.normalizeOptionalText(
      query.atributo
    );

  const criterio =
    AnalyticsService.normalizeOptionalText(
      query.criterio
    );


  const tieneAlguno =
    Boolean(
      frente ||
      atributo ||
      criterio
    );


  const tieneTodos =
    Boolean(
      frente &&
      atributo &&
      criterio
    );


  if (
    tieneAlguno &&
    !tieneTodos
  ) {
    throw AnalyticsService.validationError(
      'Para filtrar por hallazgo debe indicar frente, atributo y criterio'
    );
  }


  const finding =
    tieneTodos
      ? {
          frente,
          atributo,
          criterio
        }
      : null;


  const rows =
    await this.repository
      .listFindingEvaluations(
        filters,
        finding
      );


  const evaluaciones =
    (rows || []).map(
      row => ({
        id:
          Number(
            row.evaluacion_id
          ),

        fecha:
          row.fecha ?? null,

        ticketPsi:
          row.ticket_psi ?? null,

        gestor:
          row.gestor ?? null,

        lider:
          row.lider ?? null,

        auditor:
          row.auditor ?? null,


        notaFinal:
          row.nota_final == null
            ? null
            : Number(
                row.nota_final
              ),

        rango:
          row.rango ?? null,


        /*
         * ============================================
         * CANTIDAD TOTAL DE ERRORES
         * ============================================
         *
         * Corresponde a todos los criterios
         * incumplidos de esta evaluación.
         *
         * No representa únicamente el hallazgo
         * seleccionado en Bloque 3.
         * ============================================
         */
        errores:
          Number(
            row.total_errores || 0
          ),

        evidencias:
          Array.isArray(
            row.evidencias
          )
            ? row.evidencias.map(
                item => ({
                  frente:
                    item?.frente ?? null,

                  atributo:
                    item?.atributo ?? null,

                  criterio:
                    item?.criterio ?? null,

                  valorRespuesta:
                    item?.valorRespuesta ?? null,

                  origenHallazgo:
                    Boolean(
                      finding &&
                      item?.frente ===
                        finding.frente &&
                      item?.atributo ===
                        finding.atributo &&
                      item?.criterio ===
                        finding.criterio
                    )
                })
              )
            : [],

        campanaId:
          row.campana_id == null
            ? null
            : Number(
                row.campana_id
              ),

        quiebreId:
          row.quiebre_id == null
            ? null
            : Number(
                row.quiebre_id
              ),

        matrizId:
          row.matriz_id == null
            ? null
            : Number(
                row.matriz_id
              ),

        versionMatrizId:
          row.version_matriz_id == null
            ? null
            : Number(
                row.version_matriz_id
              ),


        /*
         * ============================================
         * CONTEXTO OPERATIVO DE LLAMADA
         * ============================================
         */
        contextoLlamada: {
          asignacionId:
            row.asignacion_id == null
              ? null
              : Number(
                  row.asignacion_id
                ),

          estado:
            row.estado_escucha ?? null,

          fechaAsignacion:
            row.fecha_asignacion ?? null,

          fechaGestion:
            row.fecha_gestion ?? null,

          peticion:
            row.peticion ?? null,

          motivoCall:
            row.motivo_call ?? null,

          motivos:
            row.motivos_escucha ?? null,

          submotivos:
            row.submotivos_escucha ?? null
        },


        /*
         * ============================================
         * EVIDENCIA DEL HALLAZGO
         * ============================================
         *
         * En modo GENERAL puede venir vacío.
         *
         * En modo HALLAZGO contiene:
         * frente + atributo + criterio + respuesta.
         * ============================================
         */
        evidencia: {
          frente:
            row.frente ?? null,

          atributo:
            row.atributo ?? null,

          criterio:
            row.criterio ?? null,

          valorRespuesta:
            row.valor_respuesta ?? null
        }
      })
    );


  return {
    filters,


    modo:
      finding
        ? 'HALLAZGO'
        : 'GENERAL',


    hallazgo:
      finding,


    resumen: {
      evaluaciones:
        evaluaciones.length
    },


    evaluaciones
  };
}

  async getEvolution(query = {}) {
    if (!this.repository) {
      const error =
        new Error(
          'AnalyticsService requiere repository'
        );

      error.status = 500;
      error.code =
        'ANALYTICS_REPOSITORY_REQUIRED';

      throw error;
    }

    const filters =
      AnalyticsService.normalizeFilters(
        query
      );

    const rawGranularity =
      query.granularidad ??
      query.granularity ??
      'month';

    const granularity =
      String(rawGranularity)
        .trim()
        .toLowerCase();

    const allowed =
      new Set([
        'day',
        'week',
        'month'
      ]);

    if (!allowed.has(granularity)) {
      throw AnalyticsService.validationError(
        'granularidad debe ser day, week o month',
        'ANALYTICS_GRANULARITY_INVALID'
      );
    }

    const [
      rows,
      matrixContextRows
    ] = await Promise.all([
      this.repository.listEvolution(
        filters,
        granularity
      ),

      this.repository.listEvolutionMatrixContext(
        filters,
        granularity
      )
    ]);

    const serie =
      (rows || []).map(row => {
        const evaluaciones =
          Number(row.evaluaciones || 0);

        const excelente =
          Number(row.excelente || 0);

        const bien =
          Number(row.bien || 0);

        const regular =
          Number(row.regular || 0);

        const bajo =
          Number(row.bajo || 0);

        const favorable =
          excelente + bien;

        const atencion =
          regular + bajo;

        return {
          periodo:
            row.periodo,

          evaluaciones,

          notaPromedio:
            row.nota_promedio == null
              ? null
              : Number(
                row.nota_promedio
              ),

          gestores:
            Number(
              row.gestores || 0
            ),

          auditores:
            Number(
              row.auditores || 0
            ),

          rangos: {
            excelente,
            bien,
            regular,
            bajo
          },

          calidad: {
            favorable,

            favorablePct:
              evaluaciones > 0
                ? Number(
                  (
                    favorable /
                    evaluaciones *
                    100
                  ).toFixed(2)
                )
                : 0,

            atencion,

            atencionPct:
              evaluaciones > 0
                ? Number(
                  (
                    atencion /
                    evaluaciones *
                    100
                  ).toFixed(2)
                )
                : 0
          }
        };
      });

    const normalizarPeriodo =
      (value) => {
        if (value == null) {
          return null;
        }

        if (value instanceof Date) {
          return value
            .toISOString()
            .slice(0, 10);
        }

        const text =
          String(value).trim();

        const match =
          text.match(
            /^(\d{4}-\d{2}-\d{2})/
          );

        return match
          ? match[1]
          : text;
      };


    const contextosPorPeriodo =
      new Map();

    for (
      const row of matrixContextRows || []
    ) {
      const periodo =
        normalizarPeriodo(row.periodo);

      if (!periodo) {
        continue;
      }

      if (
        !contextosPorPeriodo.has(periodo)
      ) {
        contextosPorPeriodo.set(
          periodo,
          []
        );
      }

      contextosPorPeriodo
        .get(periodo)
        .push(row);
    }


    for (const punto of serie) {
      const periodo =
        normalizarPeriodo(
          punto.periodo
        );

      const rowsPeriodo =
        contextosPorPeriodo.get(
          periodo
        ) || [];

      const totalPeriodo =
        punto.evaluaciones;

      const configuraciones =
        rowsPeriodo.map(row => {
          const auditorias =
            Number(
              row.auditorias || 0
            );

          return {
            matrizId:
              row.matriz_id == null
                ? null
                : Number(
                  row.matriz_id
                ),

            matrizCodigo:
              row.matriz_codigo ??
              null,

            versionMatrizId:
              row.version_matriz_id == null
                ? null
                : Number(
                  row.version_matriz_id
                ),

            version:
              row.version_matriz ??
              null,

            auditorias,

            porcentaje:
              totalPeriodo > 0
                ? Number(
                  (
                    auditorias /
                    totalPeriodo *
                    100
                  ).toFixed(2)
                )
                : 0,

            notaPromedio:
              row.nota_promedio == null
                ? null
                : Number(
                  row.nota_promedio
                ),

            primeraAuditoria:
              normalizarPeriodo(
                row.primera_auditoria
              ),

            ultimaAuditoria:
              normalizarPeriodo(
                row.ultima_auditoria
              )
          };
        });


      const matricesConocidas =
        new Set(
          configuraciones
            .filter(
              item =>
                item.matrizId != null
            )
            .map(
              item =>
                item.matrizId
            )
        );


      const versionesConocidas =
        new Set(
          configuraciones
            .filter(
              item =>
                item.versionMatrizId != null
            )
            .map(
              item =>
                item.versionMatrizId
            )
        );


      const auditoriasSinMatriz =
        configuraciones
          .filter(
            item =>
              item.matrizId == null
          )
          .reduce(
            (
              total,
              item
            ) =>
              total +
              item.auditorias,
            0
          );


      let estado =
        'ESTABLE';

      if (
        totalPeriodo > 0 &&
        (
          configuraciones.length === 0 ||
          auditoriasSinMatriz === totalPeriodo
        )
      ) {
        estado =
          'SIN_MATRIZ_IDENTIFICADA';

      } else if (
        totalPeriodo > 0 &&
        auditoriasSinMatriz > 0
      ) {
        estado =
          'CONTEXTO_PARCIAL';

      } else if (
        matricesConocidas.size > 1
      ) {
        estado =
          'TRANSICION_MATRIZ';

      } else if (
        versionesConocidas.size > 1
      ) {
        estado =
          'TRANSICION_VERSION';
      }


      punto.contextoMatriz = {
        estado,

        configuraciones,

        matrices:
          matricesConocidas.size,

        versiones:
          versionesConocidas.size,

        auditoriasSinMatriz,

        porcentajeSinMatriz:
          totalPeriodo > 0
            ? Number(
              (
                auditoriasSinMatriz /
                totalPeriodo *
                100
              ).toFixed(2)
            )
            : 0
      };
    }

    for (
      let i = 0;
      i < serie.length;
      i++
    ) {
      const actual =
        serie[i];

      const anterior =
        i > 0
          ? serie[i - 1]
          : null;

      if (!anterior) {
        actual.variacion = {
          notaPp: null,
          volumenPct: null,
          atencionPp: null
        };

        continue;
      }

      actual.variacion = {
        notaPp:
          actual.notaPromedio == null ||
            anterior.notaPromedio == null
            ? null
            : Number(
              (
                actual.notaPromedio -
                anterior.notaPromedio
              ).toFixed(2)
            ),

        volumenPct:
          anterior.evaluaciones > 0
            ? Number(
              (
                (
                  actual.evaluaciones -
                  anterior.evaluaciones
                ) /
                anterior.evaluaciones *
                100
              ).toFixed(2)
            )
            : null,

        atencionPp:
          Number(
            (
              actual.calidad.atencionPct -
              anterior.calidad.atencionPct
            ).toFixed(2)
          )
      };
    }

    for (
      let i = 0;
      i < serie.length;
      i++
    ) {
      const actual =
        serie[i];

      const anterior =
        i > 0
          ? serie[i - 1]
          : null;

      const contexto =
        actual.contextoMatriz;

      contexto.cambioRespectoAnterior = {
        existe: false,
        tipo: 'SIN_CAMBIO',
        comparable: true,
        periodoAnterior:
          anterior?.periodo ??
          null
      };


      if (!anterior) {
        contexto
          .cambioRespectoAnterior
          .tipo =
          'SIN_PERIODO_ANTERIOR';

        continue;
      }


      if (
        contexto.estado ===
        'SIN_MATRIZ_IDENTIFICADA' ||
        anterior
          .contextoMatriz
          ?.estado ===
        'SIN_MATRIZ_IDENTIFICADA'
      ) {
        contexto.cambioRespectoAnterior = {
          existe: true,
          tipo:
            'CONTEXTO_INCOMPLETO',
          comparable: false,
          periodoAnterior:
            anterior.periodo
        };

        continue;
      }


      if (
        contexto.estado ===
        'TRANSICION_MATRIZ' ||
        anterior
          .contextoMatriz
          ?.estado ===
        'TRANSICION_MATRIZ'
      ) {
        contexto.cambioRespectoAnterior = {
          existe: true,
          tipo:
            'TRANSICION_MATRIZ',
          comparable: false,
          periodoAnterior:
            anterior.periodo
        };

        continue;
      }


      if (
        contexto.estado ===
        'TRANSICION_VERSION' ||
        anterior
          .contextoMatriz
          ?.estado ===
        'TRANSICION_VERSION'
      ) {
        contexto.cambioRespectoAnterior = {
          existe: true,
          tipo:
            'TRANSICION_VERSION',
          comparable: false,
          periodoAnterior:
            anterior.periodo
        };

        continue;
      }


      const actualPrincipal =
        contexto
          .configuraciones
          .filter(
            item =>
              item.matrizId != null
          )
          .sort(
            (a, b) =>
              b.auditorias -
              a.auditorias
          )[0] ??
        null;


      const anteriorPrincipal =
        anterior
          .contextoMatriz
          ?.configuraciones
          ?.filter(
            item =>
              item.matrizId != null
          )
          .sort(
            (a, b) =>
              b.auditorias -
              a.auditorias
          )[0] ??
        null;


      if (
        !actualPrincipal ||
        !anteriorPrincipal
      ) {
        contexto.cambioRespectoAnterior = {
          existe: true,
          tipo:
            'CONTEXTO_INCOMPLETO',
          comparable: false,
          periodoAnterior:
            anterior.periodo
        };

        continue;
      }


      if (
        actualPrincipal.matrizId !==
        anteriorPrincipal.matrizId
      ) {
        contexto.cambioRespectoAnterior = {
          existe: true,
          tipo:
            'CAMBIO_MATRIZ',
          comparable: false,
          periodoAnterior:
            anterior.periodo,

          anterior: {
            matrizId:
              anteriorPrincipal
                .matrizId,

            matrizCodigo:
              anteriorPrincipal
                .matrizCodigo,

            versionMatrizId:
              anteriorPrincipal
                .versionMatrizId,

            version:
              anteriorPrincipal
                .version
          },

          actual: {
            matrizId:
              actualPrincipal
                .matrizId,

            matrizCodigo:
              actualPrincipal
                .matrizCodigo,

            versionMatrizId:
              actualPrincipal
                .versionMatrizId,

            version:
              actualPrincipal
                .version
          }
        };

        continue;
      }


      if (
        actualPrincipal
          .versionMatrizId !==
        anteriorPrincipal
          .versionMatrizId
      ) {
        contexto.cambioRespectoAnterior = {
          existe: true,
          tipo:
            'CAMBIO_VERSION',
          comparable: false,
          periodoAnterior:
            anterior.periodo,

          anterior: {
            matrizId:
              anteriorPrincipal
                .matrizId,

            matrizCodigo:
              anteriorPrincipal
                .matrizCodigo,

            versionMatrizId:
              anteriorPrincipal
                .versionMatrizId,

            version:
              anteriorPrincipal
                .version
          },

          actual: {
            matrizId:
              actualPrincipal
                .matrizId,

            matrizCodigo:
              actualPrincipal
                .matrizCodigo,

            versionMatrizId:
              actualPrincipal
                .versionMatrizId,

            version:
              actualPrincipal
                .version
          }
        };
      }
    }

    const MIN_EVALUATIONS_FOR_TREND = 30;

    for (const punto of serie) {
      punto.muestra = {
        suficiente:
          punto.evaluaciones >=
          MIN_EVALUATIONS_FOR_TREND,

        evaluaciones:
          punto.evaluaciones,

        minimoReferencia:
          MIN_EVALUATIONS_FOR_TREND
      };
    }

    for (const punto of serie) {
      const cambio =
        punto
          .contextoMatriz
          ?.cambioRespectoAnterior;

      let estadoComparabilidad =
        'COMPARABLE';

      let motivo = null;


      // 1. Primero evaluamos volumen.
      if (
        !punto.muestra.suficiente
      ) {
        estadoComparabilidad =
          'MUESTRA_INSUFICIENTE';

        motivo =
          'El volumen de auditorías del período es inferior a la referencia mínima para tendencia ejecutiva.';
      }


      // 2. Hay volumen, pero no sabemos
      // qué matriz/version se utilizó.
      else if (
        punto.contextoMatriz
          ?.estado ===
        'SIN_MATRIZ_IDENTIFICADA'
      ) {
        estadoComparabilidad =
          'CONTEXTO_INCOMPLETO';

        motivo =
          'No se dispone de trazabilidad suficiente de matriz y versión para interpretar metodológicamente el período.';
      }

      else if (
        punto.contextoMatriz
          ?.estado ===
        'CONTEXTO_PARCIAL'
      ) {
        estadoComparabilidad =
          'CONTEXTO_PARCIAL';

        motivo =
          'El período contiene auditorías con y sin trazabilidad de matriz y versión, por lo que la comparación metodológica requiere cautela.';
      }

      // 3. Dentro del mismo período
      // coexistieron matrices diferentes.
      else if (
        punto.contextoMatriz
          ?.estado ===
        'TRANSICION_MATRIZ'
      ) {
        estadoComparabilidad =
          'TRANSICION_MATRIZ';

        motivo =
          'Durante el período coexistieron diferentes matrices de auditoría.';
      }


      // 4. Dentro del mismo período
      // coexistieron versiones diferentes.
      else if (
        punto.contextoMatriz
          ?.estado ===
        'TRANSICION_VERSION'
      ) {
        estadoComparabilidad =
          'TRANSICION_VERSION';

        motivo =
          'Durante el período coexistieron diferentes versiones de la matriz de auditoría.';
      }


      // 5. El período es homogéneo,
      // pero cambió la matriz respecto
      // al período anterior.
      else if (
        cambio?.tipo ===
        'CAMBIO_MATRIZ'
      ) {
        estadoComparabilidad =
          'CAMBIO_MATRIZ';

        motivo =
          'La matriz de auditoría cambió respecto al período anterior.';
      }


      // 6. Misma matriz pero nueva versión
      // respecto al período anterior.
      else if (
        cambio?.tipo ===
        'CAMBIO_VERSION'
      ) {
        estadoComparabilidad =
          'CAMBIO_VERSION';

        motivo =
          'La versión de la matriz de auditoría cambió respecto al período anterior.';
      }


      punto.comparabilidad = {
        estado:
          estadoComparabilidad,

        comparable:
          estadoComparabilidad ===
          'COMPARABLE',

        motivo
      };
    }

    const periodosComparables =
      serie.filter(
        punto =>
          punto.muestra.suficiente &&
          punto.notaPromedio != null
      );

    const ultimo =
      serie.length > 0
        ? serie[serie.length - 1]
        : null;

    const ultimoComparable =
      periodosComparables.length > 0
        ? periodosComparables[
        periodosComparables.length - 1
        ]
        : null;

    const anteriorComparable =
      periodosComparables.length > 1
        ? periodosComparables[
        periodosComparables.length - 2
        ]
        : null;

    let tendencia = 'SIN_DATOS';

    if (
      ultimoComparable &&
      anteriorComparable
    ) {
      const delta =
        ultimoComparable.notaPromedio -
        anteriorComparable.notaPromedio;

      if (delta > 0.5) {
        tendencia = 'MEJORA';
      } else if (delta < -0.5) {
        tendencia = 'DETERIORO';
      } else {
        tendencia = 'ESTABLE';
      }
    }

    const ultimoPeriodoConMuestraInsuficiente =
      Boolean(
        ultimo &&
        !ultimo.muestra.suficiente
      );

    const cambioMetodologico =
      ultimoComparable
        ?.contextoMatriz
        ?.cambioRespectoAnterior ??
      null;


    const estadoMetodologicoActual =
      ultimoComparable
        ?.comparabilidad
        ?.estado ??
      null;


    const estadoMetodologicoAnterior =
      anteriorComparable
        ?.comparabilidad
        ?.estado ??
      null;


    const estadosTransicion =
      new Set([
        'TRANSICION_MATRIZ',
        'TRANSICION_VERSION'
      ]);


    const estadosCambio =
      new Set([
        'CAMBIO_MATRIZ',
        'CAMBIO_VERSION'
      ]);


    const estadosContextoIncompleto =
      new Set([
        'CONTEXTO_INCOMPLETO',
        'CONTEXTO_PARCIAL'
      ]);


    let lecturaEjecutiva =
      tendencia;


    if (
      !ultimoComparable ||
      !anteriorComparable
    ) {
      lecturaEjecutiva =
        'SIN_DATOS_COMPARABLES';

    } else if (
      estadosTransicion.has(
        estadoMetodologicoActual
      ) ||
      estadosTransicion.has(
        estadoMetodologicoAnterior
      )
    ) {
      lecturaEjecutiva =
        'TRANSICION_METODOLOGICA';

    } else if (
      estadosCambio.has(
        estadoMetodologicoActual
      )
    ) {
      lecturaEjecutiva =
        'CAMBIO_METODOLOGICO';

    } else if (
      estadosContextoIncompleto.has(
        estadoMetodologicoActual
      ) ||
      estadosContextoIncompleto.has(
        estadoMetodologicoAnterior
      )
    ) {
      lecturaEjecutiva =
        estadoMetodologicoActual ===
          'CONTEXTO_PARCIAL' ||
          estadoMetodologicoAnterior ===
          'CONTEXTO_PARCIAL'
          ? 'CONTEXTO_PARCIAL'
          : 'CONTEXTO_INCOMPLETO';
    }


    return {
      filters,
      granularidad: granularity,

      serie,

      comparacion: {
        periodoActual:
          ultimoComparable?.periodo ??
          null,

        periodoAnterior:
          anteriorComparable?.periodo ??
          null,

        notaActual:
          ultimoComparable?.notaPromedio ??
          null,

        notaAnterior:
          anteriorComparable?.notaPromedio ??
          null,

        variacionNotaPp:
          ultimoComparable &&
            anteriorComparable
            ? Number(
              (
                ultimoComparable.notaPromedio -
                anteriorComparable.notaPromedio
              ).toFixed(2)
            )
            : null,

        variacionVolumenPct:
          ultimoComparable &&
            anteriorComparable &&
            anteriorComparable.evaluaciones > 0
            ? Number(
              (
                (
                  ultimoComparable.evaluaciones -
                  anteriorComparable.evaluaciones
                ) /
                anteriorComparable.evaluaciones *
                100
              ).toFixed(2)
            )
            : null,

        atencionActualPct:
          ultimoComparable
            ?.calidad
            ?.atencionPct ??
          null,

        variacionAtencionPp:
          ultimoComparable &&
            anteriorComparable
            ? Number(
              (
                ultimoComparable
                  .calidad
                  .atencionPct -
                anteriorComparable
                  .calidad
                  .atencionPct
              ).toFixed(2)
            )
            : null,

        tendencia,

        lecturaEjecutiva,

        metodologia: {
          comparable:
            ultimoComparable &&
              anteriorComparable
              ? (
                ultimoComparable
                  .comparabilidad
                  ?.comparable === true &&
                anteriorComparable
                  .comparabilidad
                  ?.comparable === true
              )
              : false,

          estado:
            ultimoComparable
              ?.comparabilidad
              ?.estado ??
            null,

          estadoAnterior:
            anteriorComparable
              ?.comparabilidad
              ?.estado ??
            null,

          motivo:
            ultimoComparable
              ?.comparabilidad
              ?.motivo ??
            null,

          motivoAnterior:
            anteriorComparable
              ?.comparabilidad
              ?.motivo ??
            null,

          cambio:
            cambioMetodologico
        },

        confiabilidad: {
          minimoEvaluaciones:
            MIN_EVALUATIONS_FOR_TREND,

          ultimoPeriodoDisponible:
            ultimo?.periodo ??
            null,

          evaluacionesUltimoPeriodo:
            ultimo?.evaluaciones ??
            0,

          ultimoPeriodoConMuestraInsuficiente
        }
      }
    };
  }

async getIntervention(
  query = {}
) {
  if (!this.repository) {
    const error =
      new Error(
        'AnalyticsService requiere repository'
      );

    error.status = 500;
    error.code =
      'ANALYTICS_REPOSITORY_REQUIRED';

    throw error;
  }


  if (
    typeof this.repository
      .getInterventionOverview !==
    'function'
  ) {
    const error =
      new Error(
        'AnalyticsRepository.getInterventionOverview no está disponible'
      );

    error.status = 500;
    error.code =
      'ANALYTICS_REPOSITORY_METHOD_MISSING';

    throw error;
  }


  const filters =
    AnalyticsService.normalizeFilters(
      query
    );


  const [
    data,
    effectiveness,
    evolutionRows,
    concentrationRows
  ] =
    await Promise.all([
      this.repository
        .getInterventionOverview(
          filters
        ),

      this.repository
        .getInterventionEffectiveness(
          filters
        ),

      this.repository
        .listInterventionEvolution(
          filters
        ),

      this.repository
        .listInterventionConcentration(
          filters
        )
    ]);


  const raw =
    data?.resumen || {};


  const pdaGenerados =
    Number(
      raw.pda_generados || 0
    );

  const gestoresIntervenidos =
    Number(
      raw.gestores_intervenidos || 0
    );

  const pdaEvaluables =
    Number(
      raw.pda_evaluables || 0
    );

  const mejoraron =
    Number(
      raw.mejoraron || 0
    );

  const persisten =
    Number(
      raw.persisten || 0
    );

  const pendientesMedicion =
    Number(
      raw.pendientes_medicion || 0
    );

  const feedbackRealizados =
    Number(
      raw.feedback_realizados || 0
    );

  const capacitacionDerivados =
    Number(
      raw.capacitacion_derivados || 0
    );

  const capacitacionRealizados =
    Number(
      raw.capacitacion_realizados || 0
    );


  const tasaMejoraPct =
    pdaEvaluables > 0
      ? Number(
          (
            mejoraron /
            pdaEvaluables *
            100
          ).toFixed(2)
        )
      : null;


  const coberturaSeguimientoPct =
    pdaGenerados > 0
      ? Number(
          (
            pdaEvaluables /
            pdaGenerados *
            100
          ).toFixed(2)
        )
      : 0;


  const estados =
    Array.isArray(data?.estados)
      ? data.estados.map(
          row => ({
            estado:
              row.estado ||
              'sin_estado',

            cantidad:
              Number(
                row.cantidad || 0
              )
          })
        )
      : [];

  const feedbackEvaluables =
  Number(
    effectiveness
      ?.feedback_evaluables || 0
  );

const feedbackMejoraron =
  Number(
    effectiveness
      ?.feedback_mejoraron || 0
  );

const feedbackPersisten =
  Number(
    effectiveness
      ?.feedback_persisten || 0
  );

const capacitacionEvaluables =
  Number(
    effectiveness
      ?.capacitacion_evaluables || 0
  );

const capacitacionMejoraron =
  Number(
    effectiveness
      ?.capacitacion_mejoraron || 0
  );

const capacitacionPersisten =
  Number(
    effectiveness
      ?.capacitacion_persisten || 0
  );

const feedbackEfectividadPct =
  feedbackEvaluables > 0
    ? Number(
        (
          feedbackMejoraron /
          feedbackEvaluables *
          100
        ).toFixed(2)
      )
    : null;

const capacitacionEfectividadPct =
  capacitacionEvaluables > 0
    ? Number(
        (
          capacitacionMejoraron /
          capacitacionEvaluables *
          100
        ).toFixed(2)
      )
    : null;

const evolucion =
  Array.isArray(evolutionRows)
    ? evolutionRows.map(
        row => ({
          periodo:
            row.periodo,

          generados:
            Number(
              row.generados || 0
            ),

          evaluables:
            Number(
              row.evaluables || 0
            ),

          mejoraron:
            Number(
              row.mejoraron || 0
            ),

          cerrados:
            Number(
              row.cerrados || 0
            )
        })
      )
    : [];

  const concentracion = {
    frentes: [],
    atributos: [],
    criterios: []
  };

  for (
    const row of
    Array.isArray(concentrationRows)
      ? concentrationRows
      : []
  ) {
    const item = {
      id:
        row.id != null
          ? Number(row.id)
          : null,

      nombre:
        row.nombre,

      padreId:
        row.padre_id != null
          ? Number(row.padre_id)
          : null,

      pda:
        Number(
          row.pda || 0
        ),

      acciones:
        Number(
          row.acciones || 0
        )
    };

    if (row.nivel === 'FRENTE') {
      concentracion.frentes.push(
        item
      );
    }

    if (row.nivel === 'ATRIBUTO') {
      concentracion.atributos.push(
        item
      );
    }

    if (row.nivel === 'CRITERIO') {
      concentracion.criterios.push(
        item
      );
    }
  }

  return {
    filters,

    resumen: {
      pdaGenerados,
      gestoresIntervenidos,
      pdaEvaluables,
      mejoraron,
      persisten,
      tasaMejoraPct
    },

    estados,

    intervenciones: {
      feedback: {
        realizados:
          feedbackRealizados,

        evaluables:
          feedbackEvaluables,

        mejoraron:
          feedbackMejoraron,

        persisten:
          feedbackPersisten,

        efectividadPct:
          feedbackEfectividadPct
      },

      capacitacion: {
        derivados:
          capacitacionDerivados,

        realizados:
          capacitacionRealizados,

        evaluables:
          capacitacionEvaluables,

        mejoraron:
          capacitacionMejoraron,

        persisten:
          capacitacionPersisten,

        efectividadPct:
          capacitacionEfectividadPct
      }
    },

    resolucion: {
      feedbackSuficiente:
        Number(
          effectiveness
            ?.feedback_suficiente || 0
        ),

      requirioCapacitacion:
        Number(
          effectiveness
            ?.requirio_capacitacion || 0
        ),

      continuaSeguimiento:
        Number(
          effectiveness
            ?.continua_seguimiento || 0
        ),

      escalados:
        Number(
          effectiveness
            ?.escalados || 0
        )
    },

    evolucion,

    calidadDatos: {
      pdaTotales:
        pdaGenerados,

      conResultadoPosterior:
        pdaEvaluables,

      pendientesMedicion,

      coberturaSeguimientoPct
    },

    concentracion,
  };
}
}

module.exports = AnalyticsService;