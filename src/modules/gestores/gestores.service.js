class GestoresService {
    constructor({
        repository,
        quartileService
    }) {
        this.repository =
            repository;

        this.quartileService =
            quartileService;
    }


    // ======================================================
    // FECHA DE EVALUACIÓN
    // ======================================================

    static getEvaluationDate(
        evaluacion
    ) {
        const candidatos = [
            evaluacion?.fecha,
            evaluacion?.created_at,
            evaluacion?.fecha_registro,
            evaluacion?.fecha_formateada
        ];


        for (
            const valor
            of candidatos
        ) {
            if (!valor) {
                continue;
            }


            /*
             * Formato legacy:
             * DD/MM/YYYY HH:mm
             */
            const texto =
                String(
                    valor
                ).trim();


            const match =
                texto.match(
                    /^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:[,\s]+(\d{1,2}):(\d{2})(?::(\d{2}))?)?/
                );


            if (match) {
                const fecha =
                    new Date(
                        Number(match[3]),
                        Number(match[2]) - 1,
                        Number(match[1]),
                        Number(match[4] || 0),
                        Number(match[5] || 0),
                        Number(match[6] || 0)
                    );


                if (
                    !Number.isNaN(
                        fecha.getTime()
                    )
                ) {
                    return fecha;
                }
            }


            const fecha =
                new Date(
                    texto
                );


            if (
                !Number.isNaN(
                    fecha.getTime()
                )
            ) {
                return fecha;
            }
        }


        return null;
    }


    // ======================================================
    // CUARTIL
    // ======================================================

    static getQuartileByScore(
        nota,
        criterios
    ) {
        const valor =
            Number(
                nota
            );


        for (
            const criterio
            of criterios
        ) {
            const inferior =
                Number(
                    criterio.limite_inferior
                );

            const superior =
                Number(
                    criterio.limite_superior
                );


            if (
                valor >= inferior &&
                valor <= superior
            ) {
                return {
                    cuartil:
                        criterio.cuartil,

                    nombre:
                        criterio.nombre,

                    color:
                        criterio.color_hex,

                    icono:
                        criterio.icono,

                    limite_inferior:
                        inferior,

                    limite_superior:
                        superior
                };
            }
        }


        /*
         * Fallback legacy.
         */
        return {
            cuartil:
                'Q4',

            nombre:
                'Riesgo',

            color:
                '#d93025',

            icono:
                '🔴',

            limite_inferior:
                0,

            limite_superior:
                84.99
        };
    }


    // ======================================================
    // CONSTRUIR CICLOS BASALES
    // ======================================================

    buildCycles(
        evaluaciones,
        criterios
    ) {
        const ordenadas =
            [...evaluaciones]
                .sort(
                    (
                        a,
                        b
                    ) => {
                        const fechaA =
                            GestoresService
                                .getEvaluationDate(
                                    a
                                );

                        const fechaB =
                            GestoresService
                                .getEvaluationDate(
                                    b
                                );


                        if (
                            !fechaA &&
                            !fechaB
                        ) {
                            return 0;
                        }


                        if (!fechaA) {
                            return 1;
                        }


                        if (!fechaB) {
                            return -1;
                        }


                        return (
                            fechaA -
                            fechaB
                        );
                    }
                );


        const TAMANO_CICLO =
            5;

        const ciclos =
            [];


        for (
            let i = 0;
            i < ordenadas.length;
            i += TAMANO_CICLO
        ) {
            const items =
                ordenadas.slice(
                    i,
                    i + TAMANO_CICLO
                );


            const numero =
                Math.floor(
                    i /
                    TAMANO_CICLO
                ) + 1;


            const total =
                items.length;


            const sumar =
                campo =>
                    items.reduce(
                        (
                            suma,
                            item
                        ) =>
                            suma +
                            Number(
                                item[campo] ||
                                0
                            ),
                        0
                    );


            const promedio =
                total > 0
                    ? Number(
                        (
                            sumar(
                                'nota_final'
                            ) /
                            total
                        ).toFixed(1)
                    )
                    : 0;


            const promedioENC =
                total > 0
                    ? Number(
                        (
                            sumar(
                                'total_enc'
                            ) /
                            total
                        ).toFixed(1)
                    )
                    : 0;


            const promedioECUF =
                total > 0
                    ? Number(
                        (
                            sumar(
                                'total_ecuf'
                            ) /
                            total
                        ).toFixed(1)
                    )
                    : 0;


            const promedioECN =
                total > 0
                    ? Number(
                        (
                            sumar(
                                'total_ecn'
                            ) /
                            total
                        ).toFixed(1)
                    )
                    : 0;


            const fechas =
                items
                    .map(
                        item =>
                            GestoresService
                                .getEvaluationDate(
                                    item
                                )
                    )
                    .filter(Boolean)
                    .sort(
                        (
                            a,
                            b
                        ) =>
                            a - b
                    );


            const fechaInicio =
                fechas.length > 0
                    ? fechas[0]
                        .toISOString()
                    : null;


            const fechaFin =
                fechas.length > 0
                    ? fechas[
                        fechas.length -
                        1
                    ].toISOString()
                    : null;


            const resultadoCuartil =
                GestoresService
                    .getQuartileByScore(
                        promedio,
                        criterios
                    );


            ciclos.push({
                numero,

                fechaInicio,

                fechaFin,

                totalEvaluaciones:
                    total,

                promedio,

                promedioENC,

                promedioECUF,

                promedioECN,

                cuartil:
                    resultadoCuartil
                        .cuartil,

                cuartilDetalle:
                    resultadoCuartil,

                esCompleto:
                    total ===
                    TAMANO_CICLO,

                evaluaciones:
                    items
            });
        }


        return ciclos;
    }

    static getCycleBreakId(
        ciclo
    ) {
        const evaluaciones =
            Array.isArray(
                ciclo?.evaluaciones
            )
                ? ciclo.evaluaciones
                : [];


        const ids =
            evaluaciones
                .map(
                    evaluacion =>
                        Number(
                            evaluacion?.quiebre_id ??
                            evaluacion?.quiebreId ??
                            evaluacion?.contexto?.quiebre_id ??
                            0
                        )
                )
                .filter(
                    id =>
                        Number.isInteger(id) &&
                        id > 0
                );


        const unicos =
            [
                ...new Set(
                    ids
                )
            ];


        /*
        * Un ciclo debe pertenecer a un único quiebre
        * para poder utilizarse como origen/seguimiento
        * de un PDA.
        *
        * Si por datos históricos aparecen varios,
        * no forzamos una asociación.
        */
        if (
            unicos.length !== 1
        ) {
            return null;
        }


        return unicos[0];
    }

    // ======================================================
    // RANKING / RESUMEN POR GESTOR
    // ======================================================

    buildSummary(
        agente,
        evaluaciones,
        ciclos,
        pdaGestor,
        lider
    ) {
        const count =
            evaluaciones.length;


        const suma =
            evaluaciones.reduce(
                (
                    total,
                    item
                ) =>
                    total +
                    Number(
                        item.nota_final ||
                        0
                    ),
                0
            );


        const promedio =
            count > 0
                ? Number(
                    (
                        suma /
                        count
                    ).toFixed(1)
                )
                : 0;


        // ======================================================
        // PDA ACTIVOS DEL GESTOR
        // ======================================================

        const estadosCerradosPda =
            new Set([
                'completado',
                'corregido',
                'escalado'
            ]);


        const pdaActivos =
            (
                Array.isArray(
                    pdaGestor
                )
                    ? pdaGestor
                    : []
            ).filter(
                pda =>
                    !estadosCerradosPda.has(
                        String(
                            pda?.estado || ''
                        )
                    )
            );


        // ======================================================
        // CICLOS ENRIQUECIDOS CON RELACIÓN PDA
        // ======================================================

        const ciclosEnriquecidos =
            ciclos.map(
                ciclo => {

                    // ==========================================
                    // 1. CONTEXTO DEL CICLO
                    // ==========================================

                    const quiebreIdCiclo =
                        GestoresService
                            .getCycleBreakId(
                                ciclo
                            );


                    const numeroCiclo =
                        Number(
                            ciclo?.numero
                        );


                    // ==========================================
                    // 2. PDA QUE NACIÓ EXACTAMENTE EN ESTE CICLO
                    // ==========================================

                    const pdaOrigen =
                        (
                            Array.isArray(
                                pdaGestor
                            )
                                ? pdaGestor
                                : []
                        ).find(
                            pda =>
                                Number(
                                    pda
                                        ?.ciclo_basal_numero
                                ) ===
                                numeroCiclo
                        ) ||
                        null;


                    // ==========================================
                    // 3. PDA ACTIVO COMPATIBLE
                    //
                    // REGLA:
                    // mismo gestor + mismo quiebre.
                    //
                    // Campaña y mes NO participan.
                    // ==========================================

                    const pdaActivoCompatible =
                        quiebreIdCiclo
                            ? pdaActivos
                                .filter(
                                    pda =>
                                        Number(
                                            pda
                                                ?.quiebre_id
                                        ) ===
                                        Number(
                                            quiebreIdCiclo
                                        )
                                )
                                .sort(
                                    (
                                        a,
                                        b
                                    ) =>
                                        Number(
                                            b?.id || 0
                                        ) -
                                        Number(
                                            a?.id || 0
                                        )
                                )[0] ||
                                null
                            : null;


                    // ==========================================
                    // 4. CLASIFICACIÓN DEL CICLO
                    // ==========================================

                    let accionPda =
                        'sin_accion';


                    let relacionPda =
                        null;


                    let pdaAsociado =
                        pdaOrigen;


                    // ==========================================
                    // 4.1 CICLO ORIGEN
                    // ==========================================

                    if (pdaOrigen) {

                        accionPda =
                            'sin_accion';


                        relacionPda =
                            'origen';


                        pdaAsociado =
                            pdaOrigen;


                    // ==========================================
                    // 4.2 EXISTE PDA ACTIVO DEL MISMO QUIEBRE
                    // ==========================================

                    } else if (
                        pdaActivoCompatible
                    ) {

                        const numeroBasal =
                            Number(
                                pdaActivoCompatible
                                    ?.ciclo_basal_numero
                            );


                        /*
                        * Solo los ciclos posteriores al basal
                        * pueden alimentar el expediente.
                        */
                        if (
                            Number.isInteger(
                                numeroCiclo
                            ) &&
                            Number.isInteger(
                                numeroBasal
                            ) &&
                            numeroCiclo >
                            numeroBasal
                        ) {

                            pdaAsociado =
                                pdaActivoCompatible;


                            const fechaFrontera =
                                pdaActivoCompatible
                                    ?.fecha_inicio_seguimiento_capacitacion ??
                                pdaActivoCompatible
                                    ?.fecha_inicio_seguimiento ??
                                pdaActivoCompatible
                                    ?.fecha_feedback ??
                                null;


                            // ==================================
                            // TODAVÍA NO HUBO FEEDBACK
                            // ==================================

                            if (
                                !fechaFrontera
                            ) {

                                accionPda =
                                    'preintervencion';


                                relacionPda =
                                    'preintervencion';


                            } else {

                                const inicioCiclo =
                                    ciclo?.fechaInicio
                                        ? new Date(
                                            ciclo.fechaInicio
                                        )
                                        : null;


                                const inicioSeguimiento =
                                    new Date(
                                        fechaFrontera
                                    );


                                const fechaCicloValida =
                                    inicioCiclo &&
                                    !Number.isNaN(
                                        inicioCiclo
                                            .getTime()
                                    );


                                const fechaSeguimientoValida =
                                    !Number.isNaN(
                                        inicioSeguimiento
                                            .getTime()
                                    );


                                // ==============================
                                // CICLO COMPLETO POSTERIOR
                                // AL FEEDBACK
                                // ==============================

                                if (
                                    fechaCicloValida &&
                                    fechaSeguimientoValida &&
                                    inicioCiclo >
                                    inicioSeguimiento
                                ) {

                                    accionPda =
                                        'seguimiento';


                                    relacionPda =
                                        'seguimiento';


                                } else {

                                    /*
                                    * El ciclo ocurrió antes del
                                    * feedback o empezó antes de
                                    * la frontera de seguimiento.
                                    *
                                    * No mide impacto del feedback.
                                    */
                                    accionPda =
                                        'preintervencion';


                                    relacionPda =
                                        'preintervencion';
                                }
                            }
                        }


                    // ==========================================
                    // 4.3 NO HAY PDA COMPATIBLE
                    // ==========================================

                    } else if (
                        ciclo?.esCompleto &&
                        ciclo?.cuartil ===
                        'Q4'
                    ) {

                        accionPda =
                            'crear_pda';


                        relacionPda =
                            null;


                        pdaAsociado =
                            null;
                    }


                    // ==========================================
                    // 5. DEVOLVER CICLO ENRIQUECIDO
                    // ==========================================

                    return {
                        ...ciclo,

                        quiebreId:
                            quiebreIdCiclo,

                        pda:
                            pdaAsociado,

                        pdaOrigen:
                            pdaOrigen,

                        pdaActivo:
                            pdaActivoCompatible,

                        accionPda,

                        relacionPda
                    };
                }
            );


        // ======================================================
        // CICLOS COMPLETOS
        // ======================================================

        const ciclosCompletos =
            ciclosEnriquecidos.filter(
                ciclo =>
                    ciclo.esCompleto
            );


        // ======================================================
        // CICLO EN CURSO
        // ======================================================

        const cicloEnCurso =
            ciclosEnriquecidos.find(
                ciclo =>
                    !ciclo.esCompleto
            ) ||
            null;


        // ======================================================
        // CICLOS CRÍTICOS
        // ======================================================

        const ciclosAlerta =
            ciclosCompletos.filter(
                ciclo =>
                    ciclo.cuartil ===
                    'Q4'
            );


        // ======================================================
        // CICLOS CRÍTICOS YA CUBIERTOS POR UN PDA
        // ======================================================

        const ciclosConPda =
            ciclosAlerta.filter(
                ciclo =>
                    ciclo.pda !==
                    null
            );


        // ======================================================
        // CICLOS QUE REALMENTE PUEDEN CREAR UN NUEVO PDA
        // ======================================================

        const ciclosPendientesPda =
            ciclosAlerta.filter(
                ciclo =>
                    ciclo.accionPda ===
                    'crear_pda'
            );


        // ======================================================
        // CICLOS PREINTERVENCIÓN
        // ======================================================

        const ciclosPreintervencion =
            ciclosCompletos.filter(
                ciclo =>
                    ciclo.accionPda ===
                    'preintervencion'
            );


        // ======================================================
        // CICLOS DE SEGUIMIENTO
        // ======================================================

        const ciclosSeguimiento =
            ciclosCompletos.filter(
                ciclo =>
                    ciclo.accionPda ===
                    'seguimiento'
            );

        const ultimoCicloCompleto =
            ciclosCompletos.length
                ? ciclosCompletos[
                ciclosCompletos.length -
                1
                ]
                : null;


        let estado =
            'sin_ciclo';


        if (
            ultimoCicloCompleto
        ) {
            if (
                ultimoCicloCompleto
                    .cuartil ===
                'Q4'
            ) {
                estado =
                    'critico';

            } else if (
                ultimoCicloCompleto
                    .cuartil ===
                'Q3'
            ) {
                estado =
                    'seguimiento';

            } else {
                estado =
                    'favorable';
            }
        }


        return {
            agente,

            lider:
                lider ||
                'Sin líder',

            suma,

            count,

            promedio,

            ciclos:
                ciclosEnriquecidos,

            ciclosCompletos,

            cicloEnCurso,

            ciclosAlerta,

            ciclosConPda,

            ciclosPendientesPda,

            ciclosPreintervencion,

            ciclosSeguimiento,

            ultimoCicloCompleto,

            estado,

            requierePda:
                ciclosPendientesPda
                    .length > 0
        };
    }


    // ======================================================
    // ENDPOINT PRINCIPAL
    // ======================================================

    async getSummary({
        quiebreId = null,
        campanaId = null,
        sinCampana = false,
        periodo = null
    } = {}) {

        const [
            evaluaciones,
            agentes,
            pda,
            criterios
        ] =
            await Promise.all([
                this.repository
                    .listEvaluations({
                        quiebreId,
                        campanaId,
                        sinCampana
                    }),

                this.repository
                    .listAgents(),

                this.repository
                    .listPda(),

                this.quartileService
                    .listActive()
            ]);


        const liderPorAgente =
            new Map(
                agentes.map(
                    item => [
                        String(
                            item.nombre ||
                            ''
                        ).trim(),

                        String(
                            item.lider_2026 ||
                            ''
                        ).trim() ||
                        'Sin líder'
                    ]
                )
            );


        const evaluacionesPorAgente =
            new Map();


        for (
            const evaluacion
            of evaluaciones
        ) {
            const agente =
                String(
                    evaluacion.agente ||
                    ''
                ).trim();


            if (!agente) {
                continue;
            }


            if (
                !evaluacionesPorAgente
                    .has(
                        agente
                    )
            ) {
                evaluacionesPorAgente
                    .set(
                        agente,
                        []
                    );
            }


            evaluacionesPorAgente
                .get(
                    agente
                )
                .push(
                    evaluacion
                );
        }


        const resultado =
            [];


        for (
            const [
                agente,
                evaluacionesGestor
            ]
            of evaluacionesPorAgente
        ) {

            // ==================================================
            // 1. CICLOS HISTÓRICOS DEL CONTEXTO
            // ==================================================

            const ciclosHistoricos =
                this.buildCycles(
                    evaluacionesGestor,
                    criterios
                );


            // ==================================================
            // 2. FILTRO DE PERÍODO
            //
            // El período pertenece al ciclo basal,
            // usando la fecha FIN del ciclo.
            // ==================================================

            const ciclosVisibles =
                periodo
                    ? ciclosHistoricos.filter(
                        ciclo => {
                            if (
                                !ciclo.fechaFin
                            ) {
                                return false;
                            }


                            const fecha =
                                new Date(
                                    ciclo.fechaFin
                                );


                            if (
                                Number.isNaN(
                                    fecha.getTime()
                                )
                            ) {
                                return false;
                            }


                            const clave =
                                `${fecha.getFullYear()}-${String(
                                    fecha.getMonth() + 1
                                ).padStart(
                                    2,
                                    '0'
                                )}`;


                            return (
                                clave ===
                                periodo
                            );
                        }
                    )
                    : ciclosHistoricos;


            /*
             * Si se solicitó un período y este gestor
             * no tiene ningún ciclo en ese período,
             * no debe aparecer en el resultado.
             */
            if (
                periodo &&
                ciclosVisibles.length === 0
            ) {
                continue;
            }


            // ==================================================
            // 3. EVALUACIONES DEL UNIVERSO VISIBLE
            // ==================================================

            const evaluacionesVisibles =
                ciclosVisibles.flatMap(
                    ciclo =>
                        Array.isArray(
                            ciclo.evaluaciones
                        )
                            ? ciclo.evaluaciones
                            : []
                );


            // ==================================================
            // 4. PDA DEL GESTOR
            // ==================================================

            const pdaGestor =
                pda.filter(
                    item =>
                        String(
                            item.agente ||
                            ''
                        ).trim() ===
                        agente
                );


            // ==================================================
            // 5. RESUMEN
            // ==================================================

            const resumen =
                this.buildSummary(
                    agente,
                    evaluacionesVisibles,
                    ciclosVisibles,
                    pdaGestor,
                    liderPorAgente.get(
                        agente
                    )
                );


            /*
             * Conservamos también los ciclos históricos
             * por si el detalle los requiere después.
             */
            resumen.ciclosHistoricos =
                ciclosHistoricos;


            resultado.push(
                resumen
            );
        }


        resultado.sort(
            (
                a,
                b
            ) =>
                b.promedio -
                a.promedio
        );


        const totalEvaluacionesVisibles =
            resultado.reduce(
                (
                    suma,
                    gestor
                ) =>
                    suma +
                    Number(
                        gestor.count ||
                        0
                    ),
                0
            );


        return {
            filters: {
                periodo:
                    periodo ||
                    null,

                quiebreId:
                    quiebreId ||
                    null,

                campanaId:
                    campanaId ||
                    null,

                sinCampana:
                    Boolean(
                        sinCampana
                    )
            },

            total:
                resultado.length,

            evaluaciones:
                totalEvaluacionesVisibles,

            gestores:
                resultado
        };
    }
}


module.exports =
    GestoresService;