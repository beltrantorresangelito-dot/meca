class PdaService {
  constructor(repository) {
    this.repository = repository;
  }


  // ======================================================
  // UTILIDADES
  // ======================================================

  static createError(
    message,
    status = 400
  ) {
    const error =
      new Error(message);

    error.status =
      status;

    return error;
  }


  static normalizeId(
    value
  ) {
    if (
      value === null ||
      value === undefined ||
      value === ''
    ) {
      return null;
    }

    const id =
      Number(value);

    return (
      Number.isInteger(id) &&
      id > 0
    )
      ? id
      : null;
  }


  static normalizeText(
    value
  ) {
    if (
      value === null ||
      value === undefined
    ) {
      return null;
    }

    const text =
      String(value).trim();

    return text || null;
  }


  // ======================================================
  // TABLA PDA
  // ======================================================

  async tableExists() {
    return this.repository.tableExists();
  }


  // ======================================================
  // LISTADOS
  // ======================================================

  async listPending() {
    return this.repository.listPending();
  }


  async listTracking() {
    return this.repository.listTracking();
  }


  async listHistory() {
    return this.repository.listHistory();
  }


  // ======================================================
  // DETALLE COMPLETO
  // ======================================================

  async getDetail(pdaId) {
    if (!pdaId) {
      throw PdaService.createError(
        'ID de PDA requerido',
        400
      );
    }

    const idNormalizado =
      PdaService.normalizeId(
        pdaId
      );

    if (!idNormalizado) {
      throw PdaService.createError(
        'ID de PDA requerido',
        400
      );
    }

    /*
     * Conservamos el valor recibido desde la ruta.
     *
     * normalizeId() se utiliza únicamente para validar
     * que represente un ID positivo válido.
     */
    const id = pdaId;

    const pda =
      await this.repository
        .findHeaderById(id);

    if (!pda) {
      return null;
    }

    const acciones =
      await this.repository
        .listActions(id);

    const listaAcciones =
      Array.isArray(acciones)
        ? acciones
        : [];

    /*
     * Mantener esta forma deliberadamente.
     *
     * Además de ser clara, conserva el contrato
     * histórico cubierto por las pruebas PDA.
     */
    const totalAcciones = acciones.length;
    const completadas = acciones.filter(
      accion => accion.completado === true
    ).length;

    const progreso =
      totalAcciones > 0
        ? Math.round((completadas / totalAcciones) * 100)
        : 0;

    /*
     * Los siguientes datos pertenecen al PDA
     * enriquecido nuevo.
     *
     * Se consultan únicamente cuando el
     * repository dispone de esos métodos.
     *
     * Esto conserva compatibilidad con los
     * contratos anteriores y con los mocks
     * existentes.
     */

    let ciclo = null;

    if (
      typeof this.repository
        .findBasalCycleByPdaId === 'function'
    ) {
      ciclo =
        await this.repository
          .findBasalCycleByPdaId(id);
    }

    let ciclos =
      [];


    if (
      typeof this.repository
        .listCyclesByPdaId ===
      'function'
    ) {
      ciclos =
        await this.repository
          .listCyclesByPdaId(
            id
          );
    }

    let documento = null;

    if (
      typeof this.repository
        .findDocumentByPdaId === 'function'
    ) {
      documento =
        await this.repository
          .findDocumentByPdaId(id);
    }

    return {
      ...pda,

      acciones:
        listaAcciones,

      ciclo:
        ciclo || null,

      ciclos:
        Array.isArray(ciclos)
          ? ciclos
          : [],

      documento:
        documento || null,

      progreso,

      resumen_acciones: {
        total:
          totalAcciones,

        completadas,

        pendientes:
          totalAcciones -
          completadas
      }
    };
  }


  // ======================================================
  // VALIDAR CREACIÓN PDA
  // ======================================================

  validateCreatePayload(
    payload
  ) {
    if (
      !payload ||
      typeof payload !== 'object' ||
      Array.isArray(payload)
    ) {
      throw PdaService.createError(
        'Datos del PDA requeridos'
      );
    }


    const cabecera =
      payload.cabecera;


    if (
      !cabecera ||
      typeof cabecera !== 'object'
    ) {
      throw PdaService.createError(
        'Cabecera del PDA requerida'
      );
    }


    // ==================================================
    // GESTOR
    // ==================================================

    const agente =
      PdaService.normalizeText(
        cabecera.agente
      );


    if (!agente) {
      throw PdaService.createError(
        'El gestor del PDA es obligatorio'
      );
    }


    // ==================================================
    // FECHA
    // ==================================================

    const fechaDeteccion =
      PdaService.normalizeText(
        cabecera.fecha_deteccion
      );


    if (!fechaDeteccion) {
      throw PdaService.createError(
        'La fecha de detección del PDA es obligatoria'
      );
    }


    // ==================================================
    // CONTEXTO MECA
    // ==================================================

    const quiebreId =
      PdaService.normalizeId(
        cabecera.quiebre_id
      );


    const campanaId =
      PdaService.normalizeId(
        cabecera.campana_id
      );


    const matrizId =
      PdaService.normalizeId(
        cabecera.matriz_id
      );


    const versionMatrizId =
      PdaService.normalizeId(
        cabecera.version_matriz_id
      );


    /*
     * REGLA MECA:
     *
     * Un PDA siempre debe conocer:
     *
     * - quiebre
     * - matriz
     * - versión de matriz
     *
     * La campaña NO es obligatoria.
     *
     * Esto permite trabajar tanto:
     *
     * quiebre -> campaña -> matriz
     *
     * como:
     *
     * quiebre -> matriz
     */

    if (!quiebreId) {
      throw PdaService.createError(
        'El quiebre del PDA es obligatorio'
      );
    }


    if (!matrizId) {
      throw PdaService.createError(
        'La matriz del PDA es obligatoria'
      );
    }


    if (!versionMatrizId) {
      throw PdaService.createError(
        'La versión de matriz del PDA es obligatoria'
      );
    }


    // ==================================================
    // ACCIONES
    // ==================================================

    const acciones =
      Array.isArray(
        payload.acciones
      )
        ? payload.acciones
        : [];


    /*
     * No obligamos a tener acciones.
     *
     * El PDA puede existir como documento
     * de diagnóstico aunque todavía no se
     * hayan definido acciones de gestión.
     */


    // ==================================================
    // CICLO
    // ==================================================

    const ciclo =
      payload.ciclo &&
        typeof payload.ciclo === 'object'
        ? payload.ciclo
        : null;


    if (ciclo) {
      if (!ciclo.fecha_inicio) {
        throw PdaService.createError(
          'La fecha inicial del ciclo basal es obligatoria'
        );
      }


      if (!ciclo.fecha_fin) {
        throw PdaService.createError(
          'La fecha final del ciclo basal es obligatoria'
        );
      }
    }


    // ==================================================
    // DOCUMENTO
    // ==================================================

    const documento =
      payload.documento &&
        typeof payload.documento ===
        'object'
        ? payload.documento
        : null;


    if (documento) {
      const documentoId =
        PdaService.normalizeText(
          documento.documento_id
        );


      if (!documentoId) {
        throw PdaService.createError(
          'El identificador del documento PDA es obligatorio'
        );
      }


      if (!documento.fecha_emision) {
        throw PdaService.createError(
          'La fecha de emisión del documento PDA es obligatoria'
        );
      }
    }


    // ==================================================
    // PAYLOAD NORMALIZADO
    // ==================================================

    return {
      cabecera: {
        ...cabecera,

        agente,

        fecha_deteccion:
          fechaDeteccion,

        quiebre_id:
          quiebreId,

        campana_id:
          campanaId,

        matriz_id:
          matrizId,

        version_matriz_id:
          versionMatrizId,

        /*
         * Conservamos snapshot recibido.
         *
         * Este snapshot representa el
         * contexto histórico del momento
         * en que se generó el PDA.
         */
        contexto_snapshot:
          cabecera.contexto_snapshot ||
          null
      },

      acciones,

      ciclo,

      documento
    };
  }


  // ======================================================
  // CREAR PDA COMPLETO
  // ======================================================

  async create(
    payload
  ) {
    const data =
      this.validateCreatePayload(
        payload
      );

    try {
      const creado =
        await this.repository
          .createComplete(data);

      if (!creado) {
        throw PdaService.createError(
          'No se pudo crear el PDA',
          500
        );
      }

      return creado;

    } catch (error) {

      /*
       * PostgreSQL:
       * 23505 = unique_violation
       *
       * El índice uq_pda_ciclo_contexto
       * protege contra doble generación.
       */
      if (
        error?.code === '23505' &&
        error?.constraint ===
        'uq_pda_ciclo_contexto'
      ) {
        throw PdaService.createError(
          'Ya existe un PDA para este gestor, ciclo y contexto.',
          409
        );
      }

      throw error;
    }

  }


  // ======================================================
  // EXPORTACIÓN
  // ======================================================

  async exportRows() {
    return this.repository.exportRows();
  }

  static normalizeCriterionKey(
    value
  ) {
    return String(
      value ?? ''
    )
      .trim()
      .toLowerCase()
      .replace(
        /\s+/g,
        ' '
      );
  }


  static getDetailCriterionKey(
    detalle
  ) {
    const criterioId =
      PdaService.normalizeId(
        detalle?.criterio_id
      );


    if (criterioId) {
      return `id:${criterioId}`;
    }


    const nombre =
      detalle?.criterio ??
      detalle?.submotivo ??
      null;


    const normalizado =
      PdaService
        .normalizeCriterionKey(
          nombre
        );


    return normalizado
      ? `txt:${normalizado}`
      : null;
  }


  static getActionCriterionKey(
    accion
  ) {
    const criterioId =
      PdaService.normalizeId(
        accion?.criterio_id
      );


    if (criterioId) {
      return `id:${criterioId}`;
    }


    const nombre =
      accion?.criterio ??
      accion?.submotivo ??
      null;


    const normalizado =
      PdaService
        .normalizeCriterionKey(
          nombre
        );


    return normalizado
      ? `txt:${normalizado}`
      : null;
  }


  static normalizeCompliance(
    value
  ) {
    if (
      value === true ||
      value === 1 ||
      value === '1' ||
      value === 'true'
    ) {
      return true;
    }


    if (
      value === false ||
      value === 0 ||
      value === '0' ||
      value === 'false'
    ) {
      return false;
    }


    /*
     * null / undefined / NA / valores
     * no reconocibles:
     *
     * no deben contarse como oportunidad
     * evaluable.
     */
    return null;
  }

  async registerTrackingCycle(
    pdaId,
    data = {}
  ) {
    const id =
      PdaService.normalizeId(
        pdaId
      );


    if (!id) {
      throw PdaService.createError(
        'ID de PDA inválido',
        400
      );
    }


    // ==================================================
    // 1. PDA
    // ==================================================

    const pda =
      await this.repository
        .findHeaderById(
          id
        );


    if (!pda) {
      throw PdaService.createError(
        'PDA no encontrado',
        404
      );
    }


    const estadosSeguimientoPermitidos =
      new Set([
        'en_seguimiento',
        'en_seguimiento_capacitacion'
      ]);


    if (
      !estadosSeguimientoPermitidos.has(
        pda.estado
      )
    ) {
      throw PdaService.createError(
        'El PDA no se encuentra en etapa de seguimiento',
        409
      );
    }


    // ==================================================
    // 2. CICLO
    // ==================================================

    const cicloNumero =
      Number(
        data.ciclo_numero ??
        data.numero
      );


    if (
      !Number.isInteger(
        cicloNumero
      ) ||
      cicloNumero <= 0
    ) {
      throw PdaService.createError(
        'Número de ciclo inválido',
        400
      );
    }


    if (
      Number(
        pda.ciclo_basal_numero
      ) ===
      cicloNumero
    ) {
      throw PdaService.createError(
        'El ciclo de seguimiento no puede ser el mismo ciclo basal',
        409
      );
    }


    if (
      cicloNumero <
      Number(
        pda.ciclo_basal_numero ||
        0
      )
    ) {
      throw PdaService.createError(
        'El ciclo de seguimiento debe ser posterior al ciclo basal',
        409
      );
    }


    // ==================================================
    // 3. GESTOR
    // ==================================================

    const agente =
      PdaService.normalizeText(
        data.agente
      );


    if (
      agente &&
      String(
        agente
      ).trim() !==
      String(
        pda.agente
      ).trim()
    ) {
      throw PdaService.createError(
        'El ciclo pertenece a otro gestor',
        409
      );
    }


    // ==================================================
    // 4. QUIEBRE
    //
    // Campaña NO participa en esta validación.
    // ==================================================

    const quiebreId =
      PdaService.normalizeId(
        data.quiebre_id ??
        data.quiebreId
      );


    const quiebrePda =
      PdaService.normalizeId(
        pda.quiebre_id
      );


    if (
      !quiebreId
    ) {
      throw PdaService.createError(
        'No se pudo determinar el quiebre del ciclo',
        400
      );
    }


    if (
      quiebrePda &&
      quiebreId !==
      quiebrePda
    ) {
      throw PdaService.createError(
        'El ciclo pertenece a un quiebre diferente al PDA',
        409
      );
    }


    // ==================================================
    // 5. CICLO COMPLETO
    // ==================================================

    const totalEvaluaciones =
      Number(
        data.total_evaluaciones ??
        data.totalEvaluaciones ??
        0
      );


    if (
      !Number.isInteger(
        totalEvaluaciones
      ) ||
      totalEvaluaciones <= 0
    ) {
      throw PdaService.createError(
        'El ciclo no contiene evaluaciones válidas',
        400
      );
    }


    if (
      data.esCompleto ===
      false
    ) {
      throw PdaService.createError(
        'El ciclo todavía no está completo',
        409
      );
    }


    // ==================================================
    // 6. FECHAS
    // ==================================================

    const fechaInicio =
      PdaService.normalizeText(
        data.fecha_inicio ??
        data.fechaInicio
      );


    const fechaFin =
      PdaService.normalizeText(
        data.fecha_fin ??
        data.fechaFin
      );


    if (
      !fechaInicio ||
      !fechaFin
    ) {
      throw PdaService.createError(
        'Las fechas del ciclo son obligatorias',
        400
      );
    }


    const fechaInicioDate =
      new Date(
        fechaInicio
      );


    const fechaFinDate =
      new Date(
        fechaFin
      );


    if (
      Number.isNaN(
        fechaInicioDate.getTime()
      ) ||
      Number.isNaN(
        fechaFinDate.getTime()
      )
    ) {
      throw PdaService.createError(
        'Las fechas del ciclo no son válidas',
        400
      );
    }


    // ==================================================
    // 7. FRONTERA DE INTERVENCIÓN
    //
    // Siempre utilizamos la intervención MÁS RECIENTE.
    //
    // Primera etapa:
    //   feedback -> seguimiento
    //
    // Si hubo capacitación:
    //   capacitación -> nuevo seguimiento
    //
    // Un ciclo anterior a la última intervención
    // nunca puede medir su efectividad.
    // ==================================================

    const fechaIntervencion =
      pda.fecha_inicio_seguimiento_capacitacion ??
      pda.fecha_inicio_seguimiento ??
      pda.fecha_feedback ??
      null;


    if (!fechaIntervencion) {
      throw PdaService.createError(
        'El PDA todavía no tiene feedback registrado',
        409
      );
    }


    const fechaIntervencionDate =
      new Date(
        fechaIntervencion
      );


    if (
      Number.isNaN(
        fechaIntervencionDate.getTime()
      )
    ) {
      throw PdaService.createError(
        'La fecha de inicio de seguimiento del PDA no es válida',
        500
      );
    }


    /*
    * Regla importante:
    *
    * Para medir efectividad del feedback,
    * el ciclo debe comenzar después de la
    * intervención.
    */
    if (
      fechaInicioDate <=
      fechaIntervencionDate
    ) {
      throw PdaService.createError(
        'El ciclo ocurrió antes del feedback y corresponde a preintervención',
        409
      );
    }


    // ==================================================
    // 8. RESULTADO DEL CICLO
    // ==================================================

    const promedio =
      Number(
        data.promedio_nota ??
        data.promedio
      );


    if (
      !Number.isFinite(
        promedio
      )
    ) {
      throw PdaService.createError(
        'El promedio del ciclo no es válido',
        400
      );
    }


    const cuartil =
      PdaService.normalizeText(
        data.cuartil
      );


    if (!cuartil) {
      throw PdaService.createError(
        'El cuartil del ciclo es obligatorio',
        400
      );
    }


    // ==================================================
    // 9. MEJORA GENERAL
    //
    // Por ahora es solo un indicador simple.
    // La conclusión integral vendrá en el
    // siguiente bloque.
    // ==================================================

    const promedioBasal =
      Number(
        pda.promedio_basal
      );


    const mejoraDetectada =
      Number.isFinite(
        promedioBasal
      )
        ? promedio >
        promedioBasal
        : null;


    // ==================================================
    // 10. IDS DE EVALUACIONES
    // ==================================================

    const evaluaciones =
      Array.isArray(
        data.evaluaciones
      )
        ? data.evaluaciones
        : [];


    const evaluacionesIds =
      evaluaciones
        .map(
          evaluacion =>
            Number(
              evaluacion?.id ??
              evaluacion?.evaluacion_id ??
              evaluacion?.evaluacionId
            )
        )
        .filter(
          evaluacionId =>
            Number.isInteger(
              evaluacionId
            ) &&
            evaluacionId > 0
        );


    // ==================================================
    // 11. PERSISTIR
    // ==================================================

    return this.repository
      .saveTrackingCycle(
        id,
        {
          agente:
            pda.agente,

          ciclo_numero:
            cicloNumero,

          fecha_inicio:
            fechaInicio,

          fecha_fin:
            fechaFin,

          total_evaluaciones:
            totalEvaluaciones,

          promedio_nota:
            promedio,

          cuartil,

          mejora_detectada:
            mejoraDetectada,

          quiebre_id:
            quiebreId,

          evaluaciones_ids:
            evaluacionesIds,

          contexto_snapshot:
            data.contexto_snapshot ??
            {
              quiebre_id:
                quiebreId,

              ciclo_numero:
                cicloNumero,

              fecha_inicio:
                fechaInicio,

              fecha_fin:
                fechaFin
            }
        }
      );
  }

  async evaluateTracking(
    pdaId
  ) {
    const id =
      PdaService.normalizeId(
        pdaId
      );


    if (!id) {
      throw PdaService.createError(
        'ID de PDA inválido',
        400
      );
    }


    // ==================================================
    // 1. CABECERA PDA
    // ==================================================

    const pda =
      await this.repository
        .findHeaderById(
          id
        );


    if (!pda) {
      throw PdaService.createError(
        'PDA no encontrado',
        404
      );
    }


    // ==================================================
    // 2. CICLOS
    // ==================================================

    const ciclos =
      await this.repository
        .listCyclesByPdaId(
          id
        );


    const listaCiclos =
      Array.isArray(
        ciclos
      )
        ? ciclos
        : [];


    const basal =
      listaCiclos.find(
        ciclo =>
          ciclo.tipo_ciclo ===
          'basal'
      ) ||
      null;


    if (!basal) {
      throw PdaService.createError(
        'El PDA no tiene ciclo basal registrado',
        409
      );
    }


    // ==================================================
    // CICLOS DE SEGUIMIENTO VÁLIDOS PARA LA ETAPA ACTUAL
    // ==================================================

    const fechaFronteraActual =
      pda.fecha_inicio_seguimiento_capacitacion ??
      pda.fecha_inicio_seguimiento ??
      pda.fecha_feedback ??
      null;


    const fechaFronteraDate =
      fechaFronteraActual
        ? new Date(
          fechaFronteraActual
        )
        : null;


    const fronteraValida =
      fechaFronteraDate &&
      !Number.isNaN(
        fechaFronteraDate.getTime()
      );


    const todosSeguimientos =
      listaCiclos
        .filter(
          ciclo =>
            ciclo.tipo_ciclo ===
            'seguimiento'
        )
        .sort(
          (
            a,
            b
          ) =>
            Number(
              a.ciclo_numero ||
              0
            ) -
            Number(
              b.ciclo_numero ||
              0
            )
        );


    const seguimientos =
      fronteraValida
        ? todosSeguimientos.filter(
          ciclo => {

            if (
              !ciclo.fecha_inicio
            ) {
              return false;
            }


            const fechaCiclo =
              new Date(
                ciclo.fecha_inicio
              );


            if (
              Number.isNaN(
                fechaCiclo.getTime()
              )
            ) {
              return false;
            }


            return (
              fechaCiclo >
              fechaFronteraDate
            );
          }
        )
        : todosSeguimientos;


    if (
      seguimientos.length ===
      0
    ) {
      return {
        estado:
          'esperando_ciclo',

        pda_id:
          id,

        basal: {
          ciclo:
            basal.ciclo_numero ??
            pda.ciclo_basal_numero ??
            null,

          promedio:
            Number(
              basal.promedio_nota ??
              pda.promedio_basal ??
              0
            ),

          cuartil:
            basal.cuartil ??
            pda.cuartil_basal ??
            null,

          fecha_inicio:
            basal.fecha_inicio ??
            null,

          fecha_fin:
            basal.fecha_fin ??
            null
        },

        seguimiento:
          null,

        ciclos_seguimiento:
          [],

        temas: {
          total: 0,
          corregidos: 0,
          mejoraron: 0,
          persistentes: 0,
          empeoraron: 0,
          no_evaluables: 0,
          nuevos: 0
        },

        detalle:
          [],

        nuevos_hallazgos:
          [],

        conclusion: {
          codigo:
            'no_concluyente',

          requiere_decision_supervisor:
            false,

          opciones:
            []
        }
      };
    }


    // ==================================================
    // 3. ÚLTIMO CICLO DE SEGUIMIENTO
    // ==================================================

    const seguimiento =
      seguimientos[
      seguimientos.length - 1
      ];


    const promedioBasal =
      Number(
        basal.promedio_nota ??
        pda.promedio_basal ??
        0
      );


    const promedioSeguimiento =
      Number(
        seguimiento.promedio_nota ??
        0
      );


    const cuartilBasal =
      basal.cuartil ??
      pda.cuartil_basal ??
      null;


    const cuartilSeguimiento =
      seguimiento.cuartil ??
      null;


    const variacionPp =
      Number(
        (
          promedioSeguimiento -
          promedioBasal
        ).toFixed(
          1
        )
      );


    const salioQ4 =
      cuartilBasal ===
      'Q4' &&
      cuartilSeguimiento !==
      'Q4' &&
      Boolean(
        cuartilSeguimiento
      );


    // ==================================================
    // 4. ACCIONES Y FEEDBACK
    // ==================================================

    const acciones =
      await this.repository
        .listActions(
          id
        );


    const feedbackItems =
      typeof this.repository
        .listFeedbackItems ===
        'function'
        ? await this.repository
          .listFeedbackItems(
            id
          )
        : [];


    const listaAcciones =
      Array.isArray(
        acciones
      )
        ? acciones
        : [];


    const listaFeedback =
      Array.isArray(
        feedbackItems
      )
        ? feedbackItems
        : [];


    // ==================================================
    // 5. EVALUACIONES DEL SEGUIMIENTO
    // ==================================================

    let evaluacionesIds =
      seguimiento
        ?.evaluaciones_ids ??
      [];


    if (
      typeof evaluacionesIds ===
      'string'
    ) {
      try {
        evaluacionesIds =
          JSON.parse(
            evaluacionesIds
          );
      } catch {
        evaluacionesIds =
          [];
      }
    }


    if (
      !Array.isArray(
        evaluacionesIds
      )
    ) {
      evaluacionesIds =
        [];
    }


    const detallesSeguimiento =
      (
        evaluacionesIds.length > 0 &&
        typeof this.repository
          .listEvaluationDetailsByIds ===
        'function'
      )
        ? await this.repository
          .listEvaluationDetailsByIds(
            evaluacionesIds
          )
        : [];


    const listaDetalles =
      Array.isArray(
        detallesSeguimiento
      )
        ? detallesSeguimiento
        : [];


    // ==================================================
    // 6. FEEDBACK POR ACCIÓN
    // ==================================================

    const feedbackPorAccion =
      new Map();


    for (
      const item
      of listaFeedback
    ) {
      feedbackPorAccion.set(
        Number(
          item.accion_id
        ),
        item
      );
    }


    // ==================================================
    // 7. AGRUPAR DETALLES DE SEGUIMIENTO POR CRITERIO
    // ==================================================

    const detallesPorCriterio =
      new Map();


    for (
      const detalle
      of listaDetalles
    ) {
      const criterioId =
        Number(
          detalle?.criterio_id
        );


      const key =
        Number.isInteger(
          criterioId
        ) &&
          criterioId > 0
          ? `id:${criterioId}`
          : `txt:${String(
            detalle?.submotivo ??
            detalle?.criterio ??
            ''
          )
            .trim()
            .toLowerCase()}`;


      if (
        !detallesPorCriterio.has(
          key
        )
      ) {
        detallesPorCriterio.set(
          key,
          []
        );
      }


      detallesPorCriterio
        .get(
          key
        )
        .push(
          detalle
        );
    }


    // ==================================================
    // 8. ANALIZAR ACCIONES ORIGINALES
    // ==================================================

    const detalleResultado =
      [];


    const criteriosOriginales =
      new Set();


    for (
      const accion
      of listaAcciones
    ) {
      const criterioId =
        Number(
          accion?.criterio_id
        );


      const key =
        Number.isInteger(
          criterioId
        ) &&
          criterioId > 0
          ? `id:${criterioId}`
          : `txt:${String(
            accion?.submotivo ??
            accion?.criterio ??
            ''
          )
            .trim()
            .toLowerCase()}`;


      criteriosOriginales.add(
        key
      );


      const detalles =
        detallesPorCriterio.get(
          key
        ) ||
        [];


      let oportunidades =
        0;


      let fallas =
        0;

      const evidencias =
        [];

      for (
        const detalle
        of detalles
      ) {
        const valor =
          detalle?.cumple;


        let cumple =
          null;


        if (
          valor === true ||
          valor === 1 ||
          valor === '1' ||
          valor === 'true'
        ) {
          cumple =
            true;

        } else if (
          valor === false ||
          valor === 0 ||
          valor === '0' ||
          valor === 'false'
        ) {
          cumple =
            false;
        }


        if (
          cumple === null
        ) {
          continue;
        }


        oportunidades +=
          1;


        if (
            cumple === false
        ) {
            fallas +=
                1;


            evidencias.push({
                evaluacion_id:
                    Number(
                        detalle.evaluacion_id_real ??
                        detalle.evaluacion_id ??
                        0
                    ) ||
                    null,

                fecha:
                    detalle.fecha ??
                    null,

                id_llamada:
                    detalle.id_llamada ??
                    null,

                ticket_psi:
                    detalle.ticket_psi ??
                    null,

                evaluador:
                    detalle.evaluador ??
                    null,

                nota_final:
                    Number(
                        detalle.nota_final ??
                        0
                    )
            });
        }
      }

      const evidenciasUnicas =
        Array.from(
            new Map(
                evidencias.map(
                    evidencia => [
                        evidencia.evaluacion_id,
                        evidencia
                    ]
                )
            ).values()
        );


      let resultado =
        'no_evaluable';


      if (
        oportunidades > 0
      ) {
        resultado =
          fallas === 0
            ? 'corregido'
            : 'persiste';
      }


      const feedback =
        feedbackPorAccion.get(
          Number(
            accion.id
          )
        );


      detalleResultado.push({
        accion_id:
          accion.id,

        criterio_id:
          accion.criterio_id ??
          null,

        criterio:
          accion.criterio ??
          accion.submotivo ??
          'Sin criterio',

        submotivo:
          accion.submotivo ??
          accion.criterio ??
          'Sin criterio',

        atributo:
          accion.atributo ??
          null,

        frente:
          accion.frente ??
          null,

        feedback:
          feedback?.estado ??
          'sin_registro',

        seguimiento: {
          oportunidades,

          fallas,

          tasa_falla_pct:
              oportunidades > 0
                  ? Number(
                      (
                          (
                              fallas /
                              oportunidades
                          ) *
                          100
                      ).toFixed(
                          1
                      )
                  )
                  : null,

          evidencias:
              evidencias
      },

        resultado
      });
    }


    // ==================================================
    // 9. NUEVOS HALLAZGOS
    // ==================================================

    const nuevosMap =
      new Map();


    for (
      const detalle
      of listaDetalles
    ) {
      const valor =
        detalle?.cumple;


      const incumple =
        valor === false ||
        valor === 0 ||
        valor === '0' ||
        valor === 'false';


      if (!incumple) {
        continue;
      }


      const criterioId =
        Number(
          detalle?.criterio_id
        );


      const key =
        Number.isInteger(
          criterioId
        ) &&
          criterioId > 0
          ? `id:${criterioId}`
          : `txt:${String(
            detalle?.submotivo ??
            detalle?.criterio ??
            ''
          )
            .trim()
            .toLowerCase()}`;


      if (
        criteriosOriginales.has(
          key
        )
      ) {
        continue;
      }


      if (
        !nuevosMap.has(
          key
        )
      ) {
        nuevosMap.set(
          key,
          {
            criterio_id:
              detalle.criterio_id ??
              null,

            criterio:
              detalle.criterio ??
              detalle.submotivo ??
              'Sin criterio',

            atributo:
              detalle.atributo ??
              null,

            frente:
              detalle.frente ??
              null,

            fallas:
              0
          }
        );
      }


      nuevosMap
        .get(
          key
        )
        .fallas +=
        1;
    }


    const nuevosHallazgos =
      Array.from(
        nuevosMap.values()
      );


    // ==================================================
    // 10. RESUMEN
    // ==================================================

    const corregidos =
      detalleResultado.filter(
        item =>
          item.resultado ===
          'corregido'
      ).length;


    const persistentes =
      detalleResultado.filter(
        item =>
          item.resultado ===
          'persiste'
      ).length;


    const noEvaluables =
      detalleResultado.filter(
        item =>
          item.resultado ===
          'no_evaluable'
      ).length;

    // ==================================================
    // IDENTIFICAR SI YA EXISTIÓ CAPACITACIÓN
    // ==================================================

    const huboCapacitacion =
      Boolean(
        pda.fecha_capacitacion ||
        pda.gescot_capacitacion ||
        pda.fecha_inicio_seguimiento_capacitacion
      );

    // ==================================================
    // CONCLUSIÓN GENERAL
    // ==================================================

    let codigoConclusion =
      'no_concluyente';


    // ==================================================
    // 1. NO EVALUABLE
    // ==================================================

    if (
      detalleResultado.length > 0 &&
      noEvaluables ===
      detalleResultado.length
    ) {
      codigoConclusion =
        'no_concluyente';


      // ==================================================
      // 2. SALIÓ DE Q4
      // ==================================================

    } else if (
      salioQ4 &&
      persistentes === 0
    ) {
      codigoConclusion =
        'mejora_satisfactoria';


      // ==================================================
      // 3. PERSISTENCIA DESPUÉS DE CAPACITACIÓN
      //
      // Esta condición debe evaluarse ANTES que
      // persistencia normal.
      // ==================================================

    } else if (
      huboCapacitacion &&
      cuartilSeguimiento ===
      'Q4'
    ) {
      codigoConclusion =
        'persistencia_post_capacitacion';


      // ==================================================
      // 4. MEJORA PARCIAL
      // ==================================================

    } else if (
      salioQ4 ||
      variacionPp > 0 ||
      corregidos > 0
    ) {
      codigoConclusion =
        'mejora_parcial';


      // ==================================================
      // 5. PERSISTENCIA NORMAL
      // ==================================================

    } else {
      codigoConclusion =
        'persistencia';
    }


    // ==================================================
    // OPCIONES DISPONIBLES PARA EL SUPERVISOR
    // ==================================================

    let opciones =
      [];


    switch (
    codigoConclusion
    ) {

      case 'mejora_satisfactoria':

        opciones = [
          'cerrar',
          'continuar_seguimiento'
        ];

        break;


      case 'mejora_parcial':

        /*
        * Si nunca fue capacitado, el supervisor
        * todavía puede optar por capacitación.
        *
        * Si ya fue capacitado, no repetimos
        * automáticamente esa intervención.
        */
        opciones =
          huboCapacitacion
            ? [
              'continuar_seguimiento',
              'cerrar'
            ]
            : [
              'continuar_seguimiento',
              'cerrar',
              'derivar_capacitacion'
            ];

        break;


      case 'persistencia_post_capacitacion':

        opciones = [
          'continuar_seguimiento',
          'escalar'
        ];

        break;


      case 'persistencia':

        opciones = [
          'continuar_seguimiento',
          'derivar_capacitacion'
        ];

        break;


      default:

        opciones = [
          'continuar_seguimiento'
        ];

        break;
    }

    // ==================================================
    // 11. RESPUESTA
    // ==================================================

    return {
      estado:
        'evaluado',

      pda_id:
        id,

      basal: {
        ciclo:
          basal.ciclo_numero ??
          pda.ciclo_basal_numero ??
          null,

        promedio:
          promedioBasal,

        cuartil:
          cuartilBasal,

        fecha_inicio:
          basal.fecha_inicio ??
          null,

        fecha_fin:
          basal.fecha_fin ??
          null
      },

      seguimiento: {
        ciclo:
          seguimiento.ciclo_numero ??
          null,

        promedio:
          promedioSeguimiento,

        cuartil:
          cuartilSeguimiento,

        fecha_inicio:
          seguimiento.fecha_inicio ??
          null,

        fecha_fin:
          seguimiento.fecha_fin ??
          null,

        variacion_pp:
          variacionPp,

        salio_q4:
          salioQ4
      },

      ciclos_seguimiento:
        seguimientos.map(
          ciclo => ({
            ciclo:
              ciclo.ciclo_numero ??
              null,

            promedio:
              Number(
                ciclo.promedio_nota ??
                0
              ),

            cuartil:
              ciclo.cuartil ??
              null,

            fecha_inicio:
              ciclo.fecha_inicio ??
              null,

            fecha_fin:
              ciclo.fecha_fin ??
              null
          })
        ),

      historial_seguimiento:
        todosSeguimientos.map(
          ciclo => ({
            ciclo:
              ciclo.ciclo_numero ??
              null,

            promedio:
              Number(
                ciclo.promedio_nota ??
                0
              ),

            cuartil:
              ciclo.cuartil ??
              null,

            fecha_inicio:
              ciclo.fecha_inicio ??
              null,

            fecha_fin:
              ciclo.fecha_fin ??
              null,

            etapa_actual:
              seguimientos.some(
                actual =>
                  Number(actual.id) ===
                  Number(ciclo.id)
              )
          })
        ),

      temas: {
        total:
          detalleResultado.length,

        corregidos,

        mejoraron:
          0,

        persistentes,

        empeoraron:
          0,

        no_evaluables:
          noEvaluables,

        nuevos:
          nuevosHallazgos.length
      },

      detalle:
        detalleResultado,

      nuevos_hallazgos:
        nuevosHallazgos,

      conclusion: {
        codigo:
          codigoConclusion,

        hubo_capacitacion:
          huboCapacitacion,

        requiere_decision_supervisor:
          [
            'persistencia',
            'mejora_parcial',
            'persistencia_post_capacitacion'
          ].includes(
            codigoConclusion
          ),

        opciones
      }
    };
  }

  async sendToTraining(
    pdaId,
    data = {}
  ) {
    const id =
      PdaService.normalizeId(
        pdaId
      );


    if (!id) {
      throw PdaService.createError(
        'ID de PDA inválido',
        400
      );
    }


    const pda =
      await this.repository
        .findHeaderById(
          id
        );


    if (!pda) {
      throw PdaService.createError(
        'PDA no encontrado',
        404
      );
    }


    if (
      pda.estado !==
      'en_seguimiento'
    ) {
      throw PdaService.createError(
        'Solo un PDA en seguimiento puede derivarse a capacitación',
        409
      );
    }


    const enviadoPor =
      PdaService.normalizeText(
        data.enviado_por ??
        data.supervisor ??
        data.responsable
      );


    if (!enviadoPor) {
      throw PdaService.createError(
        'Debe identificarse al supervisor que deriva el PDA',
        400
      );
    }


    const evaluacion =
      await this.evaluateTracking(
        id
      );


    if (
      evaluacion.estado !==
      'evaluado'
    ) {
      throw PdaService.createError(
        'El PDA todavía no tiene un ciclo de seguimiento evaluable',
        409
      );
    }


    const permitidos =
      new Set([
        'persistencia',
        'mejora_parcial'
      ]);


    if (
      !permitidos.has(
        evaluacion
          ?.conclusion
          ?.codigo
      )
    ) {
      throw PdaService.createError(
        'El resultado actual no requiere derivación a capacitación',
        409
      );
    }


    const actualizado =
      await this.repository
        .sendToTraining(
          id,
          {
            enviado_por:
              enviadoPor
          }
        );


    if (!actualizado) {
      throw PdaService.createError(
        'No se pudo derivar el PDA a capacitación',
        500
      );
    }


    return {
      pda:
        actualizado,

      evaluacion
    };
  }

  async closeForImprovement(
    pdaId,
    data = {}
  ) {
    const id =
      PdaService.normalizeId(
        pdaId
      );


    if (!id) {
      throw PdaService.createError(
        'ID de PDA inválido',
        400
      );
    }


    // ==================================================
    // 1. PDA
    // ==================================================

    const pda =
      await this.repository
        .findHeaderById(
          id
        );


    if (!pda) {
      throw PdaService.createError(
        'PDA no encontrado',
        404
      );
    }


    if (
      pda.estado !==
      'en_seguimiento'
    ) {
      throw PdaService.createError(
        'Solo un PDA en seguimiento puede cerrarse por mejora',
        409
      );
    }


    // ==================================================
    // 2. RESPONSABLE
    // ==================================================

    const cerradoPor =
      PdaService.normalizeText(
        data.cerrado_por ??
        data.supervisor ??
        data.responsable
      );


    if (!cerradoPor) {
      throw PdaService.createError(
        'Debe identificarse al supervisor que cierra el PDA',
        400
      );
    }


    // ==================================================
    // 3. EVALUAR RESULTADO REAL
    // ==================================================

    const evaluacion =
      await this.evaluateTracking(
        id
      );


    if (
      evaluacion.estado !==
      'evaluado'
    ) {
      throw PdaService.createError(
        'El PDA todavía no tiene un seguimiento evaluable',
        409
      );
    }


    /*
     * No confiamos en el frontend.
     *
     * El propio backend determina si entre las
     * opciones del resultado actual existe cerrar.
     */
    const opciones =
      Array.isArray(
        evaluacion
          ?.conclusion
          ?.opciones
      )
        ? evaluacion
          .conclusion
          .opciones
        : [];


    if (
      !opciones.includes(
        'cerrar'
      )
    ) {
      throw PdaService.createError(
        'El resultado actual del seguimiento no permite cerrar el PDA por mejora',
        409
      );
    }


    const seguimiento =
      evaluacion.seguimiento;


    if (!seguimiento) {
      throw PdaService.createError(
        'No existe ciclo de seguimiento para cerrar el PDA',
        409
      );
    }


    // ==================================================
    // 4. CERRAR
    // ==================================================

    const actualizado =
      await this.repository
        .closeForImprovement(
          id,
          {
            cuartil_seguimiento:
              seguimiento.cuartil,

            promedio_seguimiento:
              Number(
                seguimiento.promedio
              ),

            ciclo_seguimiento_numero:
              Number(
                seguimiento.ciclo
              ),

            cerrado_por:
              cerradoPor
          }
        );


    if (!actualizado) {
      throw PdaService.createError(
        'No se pudo cerrar el PDA',
        500
      );
    }


    return {
      pda:
        actualizado,

      evaluacion
    };
  }

  async registerTraining(
    pdaId,
    data = {}
  ) {
    const id =
      PdaService.normalizeId(
        pdaId
      );


    if (!id) {
      throw PdaService.createError(
        'ID de PDA inválido',
        400
      );
    }


    const pda =
      await this.repository
        .findHeaderById(
          id
        );


    if (!pda) {
      throw PdaService.createError(
        'PDA no encontrado',
        404
      );
    }


    const estadosPermitidos =
      new Set([
        'requiere_capacitacion',
        'enviado_capacitacion',
        'en_capacitacion'
      ]);


    if (
      !estadosPermitidos.has(
        pda.estado
      )
    ) {
      throw PdaService.createError(
        'El PDA no se encuentra en una etapa válida de capacitación',
        409
      );
    }


    const gescot =
      PdaService.normalizeText(
        data.gescot
      );


    const fechaCapacitacion =
      PdaService.normalizeText(
        data.fecha_capacitacion ??
        data.fecha
      );


    const capacitador =
      PdaService.normalizeText(
        data.capacitador
      );


    if (!gescot) {
      throw PdaService.createError(
        'El código GESCOT es obligatorio',
        400
      );
    }


    if (!fechaCapacitacion) {
      throw PdaService.createError(
        'La fecha de capacitación es obligatoria',
        400
      );
    }


    if (!capacitador) {
      throw PdaService.createError(
        'El capacitador es obligatorio',
        400
      );
    }


    const accionIds =
      (
        Array.isArray(
          data.accion_ids
        )
          ? data.accion_ids
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
      accionIds.length ===
      0
    ) {
      throw PdaService.createError(
        'Debe seleccionarse al menos un ítem trabajado en capacitación',
        400
      );
    }


    const actualizado =
      await this.repository
        .registerTraining(
          id,
          {
            gescot,

            fecha_capacitacion:
              fechaCapacitacion,

            capacitador,

            observaciones:
              PdaService.normalizeText(
                data.observaciones
              ),

            accion_ids:
              accionIds
          }
        );


    if (!actualizado) {
      throw PdaService.createError(
        'No se pudo registrar la capacitación',
        500
      );
    }


    return actualizado;
  }
  static normalizeCriterionKey(
    value
  ) {
    return String(
      value ?? ''
    )
      .trim()
      .toLowerCase()
      .replace(
        /\s+/g,
        ' '
      );
  }


  static getDetailCriterionKey(
    detalle
  ) {
    const criterioId =
      PdaService.normalizeId(
        detalle?.criterio_id
      );


    if (criterioId) {
      return `id:${criterioId}`;
    }


    const nombre =
      detalle?.criterio ??
      detalle?.submotivo ??
      null;


    const normalizado =
      PdaService
        .normalizeCriterionKey(
          nombre
        );


    return normalizado
      ? `txt:${normalizado}`
      : null;
  }


  static getActionCriterionKey(
    accion
  ) {
    const criterioId =
      PdaService.normalizeId(
        accion?.criterio_id
      );


    if (criterioId) {
      return `id:${criterioId}`;
    }


    const nombre =
      accion?.criterio ??
      accion?.submotivo ??
      null;


    const normalizado =
      PdaService
        .normalizeCriterionKey(
          nombre
        );


    return normalizado
      ? `txt:${normalizado}`
      : null;
  }


  static normalizeCompliance(
    value
  ) {
    if (
      value === true ||
      value === 1 ||
      value === '1' ||
      value === 'true'
    ) {
      return true;
    }


    if (
      value === false ||
      value === 0 ||
      value === '0' ||
      value === 'false'
    ) {
      return false;
    }


    /*
     * null / undefined / NA / valores
     * no reconocibles:
     *
     * no deben contarse como oportunidad
     * evaluable.
     */
    return null;
  }

  async registerFeedback(
    pdaId,
    data = {}
  ) {
    const id =
      Number(
        pdaId
      );


    if (
      !Number.isInteger(id) ||
      id <= 0
    ) {
      throw PdaService.createError(
        'ID de PDA inválido',
        400
      );
    }


    const gescot =
      String(
        data.gescot || ''
      ).trim();


    const supervisor =
      String(
        data.supervisor || ''
      ).trim();


    const fechaFeedback =
      String(
        data.fecha_feedback || ''
      ).trim();


    if (!gescot) {
      throw PdaService.createError(
        'El código GESCOT es obligatorio',
        400
      );
    }


    if (!supervisor) {
      throw PdaService.createError(
        'El supervisor es obligatorio',
        400
      );
    }


    if (!fechaFeedback) {
      throw PdaService.createError(
        'La fecha de feedback es obligatoria',
        400
      );
    }


    const items =
      Array.isArray(
        data.items
      )
        ? data.items
        : [];


    const estadosPermitidos =
      new Set([
        'trabajado',
        'parcial',
        'no_trabajado'
      ]);


    for (
      const item
      of items
    ) {
      const accionId =
        Number(
          item.accion_id
        );


      if (
        !Number.isInteger(
          accionId
        ) ||
        accionId <= 0
      ) {
        throw PdaService.createError(
          'Existe un item de feedback sin acción válida',
          400
        );
      }


      if (
        !estadosPermitidos.has(
          item.estado
        )
      ) {
        throw PdaService.createError(
          `Estado de feedback inválido: ${item.estado}`,
          400
        );
      }
    }


    return this.repository
      .saveFeedback(
        id,
        {
          gescot,

          fecha_feedback:
            fechaFeedback,

          supervisor,

          observaciones:
            String(
              data.observaciones ||
              ''
            ).trim(),

          items
        }
      );
  }

  async escalate(
    pdaId,
    data = {}
  ) {
    const id =
      PdaService.normalizeId(
        pdaId
      );


    if (!id) {
      throw PdaService.createError(
        'ID de PDA inválido',
        400
      );
    }


    const pda =
      await this.repository
        .findHeaderById(
          id
        );


    if (!pda) {
      throw PdaService.createError(
        'PDA no encontrado',
        404
      );
    }


    const estadosPermitidos =
      new Set([
        'en_seguimiento',
        'en_seguimiento_capacitacion'
      ]);


    if (
      !estadosPermitidos.has(
        pda.estado
      )
    ) {
      throw PdaService.createError(
        'El PDA no se encuentra en una etapa que permita escalamiento',
        409
      );
    }


    const escaladoPor =
      PdaService.normalizeText(
        data.escalado_por ??
        data.supervisor ??
        data.responsable
      );


    if (!escaladoPor) {
      throw PdaService.createError(
        'Debe identificarse al responsable del escalamiento',
        400
      );
    }


    // ==================================================
    // VOLVER A EVALUAR
    // ==================================================

    const evaluacion =
      await this.evaluateTracking(
        id
      );


    if (
      evaluacion
        ?.conclusion
        ?.codigo !==
      'persistencia_post_capacitacion'
    ) {
      throw PdaService.createError(
        'El PDA no presenta persistencia posterior a capacitación',
        409
      );
    }


    const motivo =
      PdaService.normalizeText(
        data.motivo
      ) ||
      'Persistencia posterior a capacitación';


    const actualizado =
      await this.repository
        .escalate(
          id,
          {
            escalado_por:
              escaladoPor,

            motivo
          }
        );


    if (!actualizado) {
      throw PdaService.createError(
        'No se pudo escalar el PDA',
        500
      );
    }


    return {
      pda:
        actualizado,

      evaluacion
    };
  }
}


module.exports = PdaService;