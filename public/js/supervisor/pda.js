let pdaPaginaActual = 1;
let pdaPageSizeActual = 25;
let pdaFiltradosActual = [];
let pdaFiltroRapidoActual = '';
let pdaDashboardInicializado = false;
let pdaMapaLiderPorAgente = {};
let pdaMapaCampanasPorId = new Map();
let pdaMapaQuiebresPorId = new Map();


function obtenerGrupoEstadoPdaDashboard(
    estado
) {
    switch (
    String(
        estado ||
        ''
    ).trim()
    ) {

        case 'pendiente':
            return 'pendiente';


        case 'notificado':

        case 'en_gestion':
            return 'intervencion';


        case 'en_seguimiento':

        case 'en_seguimiento_capacitacion':
            return 'seguimiento';


        case 'requiere_capacitacion':

        case 'enviado_capacitacion':

        case 'en_capacitacion':
            return 'capacitacion';


        case 'completado':

        case 'corregido':

        case 'cerrado':
            return 'cerrados';


        case 'escalado':

        case 'reiterativo':

        case 'persiste':
            return 'escalados';


        default:
            return 'otro';
    }
}

function obtenerTextoEstadoPdaDashboard(
    estado
) {
    const textos = {
        pendiente:
            'Pendiente',

        notificado:
            'Notificado',

        en_gestion:
            'En gestión',

        en_seguimiento:
            'En seguimiento',

        requiere_capacitacion:
            'Requiere capacitación',

        enviado_capacitacion:
            'En capacitación',

        en_capacitacion:
            'En capacitación',

        en_seguimiento_capacitacion:
            'Seguimiento post-capacitación',

        completado:
            'Completado',

        corregido:
            'Completado',

        escalado:
            'Escalado',

        reiterativo:
            'Reiterativo',

        persiste:
            'Persistencia'
    };


    return (
        textos[estado] ||
        estado ||
        'Sin estado'
    );
}

function calcularAntiguedadPdaDashboard(
    fecha
) {
    if (!fecha) {
        return null;
    }


    const inicio =
        new Date(
            fecha
        );


    if (
        Number.isNaN(
            inicio.getTime()
        )
    ) {
        return null;
    }


    const hoy =
        new Date();


    inicio.setHours(
        0,
        0,
        0,
        0
    );


    hoy.setHours(
        0,
        0,
        0,
        0
    );


    return Math.max(
        0,
        Math.floor(
            (
                hoy -
                inicio
            ) /
            86400000
        )
    );
}

function formatearFechaPdaDashboard(
    fecha
) {
    if (!fecha) {
        return '—';
    }


    if (
        typeof formatearFechaPeru ===
        'function'
    ) {
        return (
            formatearFechaPeru(
                fecha
            ) ||
            '—'
        );
    }


    const valor =
        new Date(
            fecha
        );


    if (
        Number.isNaN(
            valor.getTime()
        )
    ) {
        return String(
            fecha
        );
    }


    return valor.toLocaleDateString(
        'es-PE'
    );
}


async function cargarCampanasPdaDashboard() {
    const quiebre =
        document.getElementById(
            'pdaQuiebre'
        );

    const campana =
        document.getElementById(
            'pdaCampana'
        );


    if (!campana) {
        return;
    }


    const quiebreId =
        Number(
            quiebre?.value
        );


    if (
        !Number.isInteger(
            quiebreId
        ) ||
        quiebreId <= 0
    ) {
        campana.disabled =
            true;

        campana.innerHTML = `
            <option value="">
                Seleccione un quiebre
            </option>
        `;

        return;
    }


    campana.disabled =
        false;


    campana.innerHTML =
        '<option value="">Todas</option>';


    const sinCampana =
        document.createElement(
            'option'
        );


    sinCampana.value =
        '__SIN_CAMPANA__';

    sinCampana.textContent =
        'Sin campaña';


    campana.appendChild(
        sinCampana
    );


    const campanas =
        [
            ...pdaMapaCampanasPorId
                .values()
        ]
            .filter(
                item =>
                    Number(
                        item.quiebre_id
                    ) ===
                    quiebreId
            )
            .sort(
                (
                    a,
                    b
                ) =>
                    String(
                        a.codigo
                    ).localeCompare(
                        String(
                            b.codigo
                        ),
                        'es'
                    )
            );


    campanas.forEach(
        item => {
            const option =
                document.createElement(
                    'option'
                );


            option.value =
                String(
                    item.id
                );


            option.textContent =
                item.descripcion
                    ? `${item.codigo} - ${item.descripcion}`
                    : item.codigo;


            campana.appendChild(
                option
            );
        }
    );
}

function resolverContextoPdaDashboard(
    pda
) {
    let quiebreId =
        pda.quiebre_id == null
            ? null
            : Number(
                pda.quiebre_id
            );


    let campanaId =
        pda.campana_id == null
            ? null
            : Number(
                pda.campana_id
            );


    // ======================================================
    // CONTEXTO DIRECTO
    // ======================================================

    if (campanaId) {
        const campana =
            pdaMapaCampanasPorId.get(
                campanaId
            );


        if (
            !quiebreId &&
            campana?.quiebre_id
        ) {
            quiebreId =
                Number(
                    campana.quiebre_id
                );
        }


        return {
            quiebreId,
            campanaId,
            inferido:
                false
        };
    }


    // ======================================================
    // INTENTO DE RESOLUCIÓN HISTÓRICA
    // ======================================================

    const evaluaciones =
        Array.isArray(
            window.evaluacionesGlobales
        )
            ? window.evaluacionesGlobales
            : [];


    const agente =
        String(
            pda.agente ||
            ''
        ).trim();


    const inicio =
        pda.fecha_inicio_ciclo_basal
            ? new Date(
                pda.fecha_inicio_ciclo_basal
            )
            : null;


    const fin =
        pda.fecha_fin_ciclo_basal
            ? new Date(
                pda.fecha_fin_ciclo_basal
            )
            : null;


    if (
        !agente ||
        !inicio ||
        !fin ||
        Number.isNaN(
            inicio.getTime()
        ) ||
        Number.isNaN(
            fin.getTime()
        )
    ) {
        return {
            quiebreId,
            campanaId,
            inferido:
                false
        };
    }


    inicio.setHours(
        0,
        0,
        0,
        0
    );


    fin.setHours(
        23,
        59,
        59,
        999
    );


    const relacionadas =
        evaluaciones.filter(
            evaluacion => {
                if (
                    String(
                        evaluacion.agente ||
                        ''
                    ).trim() !==
                    agente
                ) {
                    return false;
                }


                const fecha =
                    typeof obtenerFechaEvaluacion ===
                        'function'
                        ? obtenerFechaEvaluacion(
                            evaluacion
                        )
                        : null;


                return (
                    fecha &&
                    fecha >= inicio &&
                    fecha <= fin
                );
            }
        );


    const campanas =
        [
            ...new Set(
                relacionadas
                    .map(
                        evaluacion =>
                            evaluacion
                                .campana_id
                    )
                    .filter(
                        valor =>
                            valor != null
                    )
                    .map(Number)
            )
        ];


    /*
     * Solo inferimos si existe
     * una única campaña posible.
     */
    if (
        campanas.length === 1
    ) {
        campanaId =
            campanas[0];


        const campana =
            pdaMapaCampanasPorId.get(
                campanaId
            );


        quiebreId =
            campana?.quiebre_id
                ? Number(
                    campana.quiebre_id
                )
                : quiebreId;


        return {
            quiebreId,
            campanaId,
            inferido:
                true
        };
    }


    return {
        quiebreId,
        campanaId,
        inferido:
            false
    };
}

function prepararPdaDashboard(
    pda
) {
    const contexto =
        resolverContextoPdaDashboard(
            pda
        );


    const lider =
        pdaMapaLiderPorAgente[
        pda.agente
        ] ||
        'Sin líder';


    const antiguedad =
        calcularAntiguedadPdaDashboard(
            pda.fecha_deteccion
        );


    const quiebre =
        contexto.quiebreId
            ? pdaMapaQuiebresPorId.get(
                contexto.quiebreId
            )
            : null;


    const campana =
        contexto.campanaId
            ? pdaMapaCampanasPorId.get(
                contexto.campanaId
            )
            : null;


    let contextoTexto =
        'Histórico sin contexto';


    if (
        quiebre &&
        campana
    ) {
        contextoTexto =
            `${quiebre.codigo} / ${campana.codigo}`;

    } else if (quiebre) {
        contextoTexto =
            `${quiebre.codigo} / Sin campaña`;
    }


    return {
        ...pda,

        lider,

        antiguedad,

        quiebreId:
            contexto.quiebreId,

        campanaId:
            contexto.campanaId,

        contextoInferido:
            contexto.inferido,

        contextoTexto,

        grupoEstado:
            obtenerGrupoEstadoPdaDashboard(
                pda.estado
            )
    };
}

async function renderizarPdaDashboard() {

    const tbody =
        document.getElementById(
            'pdaTableBody'
        );


    if (!tbody) {
        console.warn(
            '⚠️ pdaTableBody no existe'
        );

        return;
    }


    try {

        // ======================================================
        // 1. ORIGEN DE DATOS
        // ======================================================

        const origen =
            Array.isArray(
                window.datosPDA
            )
                ? window.datosPDA
                : [];


        console.log(
            '📋 PDA 2.0 - origen:',
            origen.length
        );


        // ======================================================
        // 2. ENRIQUECER INFORMACIÓN
        // ======================================================

        const lista =
            origen.map(
                pda => {
                    try {
                        return prepararPdaDashboard(
                            pda
                        );

                    } catch (error) {

                        console.warn(
                            '⚠️ PDA no pudo enriquecerse:',
                            pda?.id,
                            error
                        );


                        /*
                         * Si falla la resolución histórica
                         * de contexto, el PDA igual debe
                         * permanecer visible.
                         */
                        return {
                            ...pda,

                            lider:
                                pdaMapaLiderPorAgente[
                                pda.agente
                                ] ||
                                'Sin líder',

                            antiguedad:
                                calcularAntiguedadPdaDashboard(
                                    pda
                                        .fecha_deteccion
                                ),

                            quiebreId:
                                pda.quiebre_id ??
                                null,

                            campanaId:
                                pda.campana_id ??
                                null,

                            contextoInferido:
                                false,

                            contextoTexto:
                                'Histórico sin contexto',

                            grupoEstado:
                                obtenerGrupoEstadoPdaDashboard(
                                    pda.estado
                                )
                        };
                    }
                }
            );


        console.log(
            '📋 PDA 2.0 - preparados:',
            lista.length
        );


        let filtrados =
            [...lista];


        // ======================================================
        // 3. LEER FILTROS
        // ======================================================

        const periodo =
            document
                .getElementById(
                    'pdaPeriodo'
                )
                ?.value ||
            '';


        const quiebre =
            document
                .getElementById(
                    'pdaQuiebre'
                )
                ?.value ||
            '';


        const campana =
            document
                .getElementById(
                    'pdaCampana'
                )
                ?.value ||
            '';


        const lider =
            document
                .getElementById(
                    'pdaLider'
                )
                ?.value ||
            '';


        const estado =
            document
                .getElementById(
                    'pdaEstado'
                )
                ?.value ||
            '';


        const busqueda =
            (
                document
                    .getElementById(
                        'pdaBuscar'
                    )
                    ?.value ||
                ''
            )
                .trim()
                .toLowerCase();


        // ======================================================
        // 4. FILTRO PERÍODO
        // BASADO EN FECHA FIN DEL CICLO BASAL
        // ======================================================

        if (periodo) {

            filtrados =
                filtrados.filter(
                    pda => {

                        if (
                            !pda
                                .fecha_fin_ciclo_basal
                        ) {
                            return false;
                        }


                        const fecha =
                            new Date(
                                pda
                                    .fecha_fin_ciclo_basal
                            );


                        if (
                            Number.isNaN(
                                fecha.getTime()
                            )
                        ) {
                            return false;
                        }


                        const anio =
                            fecha
                                .getFullYear();


                        const mes =
                            String(
                                fecha
                                    .getMonth() +
                                1
                            )
                                .padStart(
                                    2,
                                    '0'
                                );


                        const clave =
                            `${anio}-${mes}`;


                        return (
                            clave ===
                            periodo
                        );
                    }
                );
        }


        // ======================================================
        // 5. FILTRO QUIEBRE
        // ======================================================

        if (quiebre) {

            filtrados =
                filtrados.filter(
                    pda =>
                        Number(
                            pda.quiebreId
                        ) ===
                        Number(
                            quiebre
                        )
                );
        }


        // ======================================================
        // 6. FILTRO CAMPAÑA
        // ======================================================

        if (
            campana ===
            '__SIN_CAMPANA__'
        ) {

            filtrados =
                filtrados.filter(
                    pda =>
                        pda.quiebreId !=
                        null &&
                        pda.campanaId ==
                        null
                );

        } else if (campana) {

            filtrados =
                filtrados.filter(
                    pda =>
                        Number(
                            pda.campanaId
                        ) ===
                        Number(
                            campana
                        )
                );
        }


        // ======================================================
        // 7. FILTRO LÍDER
        // ======================================================

        if (lider) {

            filtrados =
                filtrados.filter(
                    pda =>
                        pda.lider ===
                        lider
                );
        }


        // ======================================================
        // 8. FILTRO ESTADO
        // ======================================================

        if (estado) {

            filtrados =
                filtrados.filter(
                    pda =>
                        pda.estado ===
                        estado
                );
        }


        // ======================================================
        // 9. FILTRO RÁPIDO
        // ======================================================

        if (
            pdaFiltroRapidoActual
        ) {

            filtrados =
                filtrados.filter(
                    pda => {

                        if (
                            pdaFiltroRapidoActual ===
                            'cerrados'
                        ) {
                            return [
                                'cerrados',
                                'escalados'
                            ]
                                .includes(
                                    pda
                                        .grupoEstado
                                );
                        }


                        return (
                            pda.grupoEstado ===
                            pdaFiltroRapidoActual
                        );
                    }
                );
        }


        // ======================================================
        // 10. BÚSQUEDA
        // ======================================================

        if (busqueda) {

            filtrados =
                filtrados.filter(
                    pda =>
                        [
                            pda.id,
                            pda.agente,
                            pda.lider,
                            pda.contextoTexto
                        ]
                            .some(
                                valor =>
                                    String(
                                        valor ||
                                        ''
                                    )
                                        .toLowerCase()
                                        .includes(
                                            busqueda
                                        )
                            )
                );
        }


        // ======================================================
        // 11. ORDENAMIENTO
        // ======================================================

        filtrados.sort(
            (
                a,
                b
            ) => {

                /*
                 * PDA abiertos primero.
                 */
                const cerradoA =
                    [
                        'cerrados'
                    ]
                        .includes(
                            a.grupoEstado
                        )
                        ? 1
                        : 0;


                const cerradoB =
                    [
                        'cerrados'
                    ]
                        .includes(
                            b.grupoEstado
                        )
                        ? 1
                        : 0;


                if (
                    cerradoA !==
                    cerradoB
                ) {
                    return (
                        cerradoA -
                        cerradoB
                    );
                }


                /*
                 * Dentro de los abiertos:
                 * más antiguos primero.
                 */
                const antiguedadA =
                    Number(
                        a.antiguedad ||
                        0
                    );


                const antiguedadB =
                    Number(
                        b.antiguedad ||
                        0
                    );


                if (
                    antiguedadA !==
                    antiguedadB
                ) {
                    return (
                        antiguedadB -
                        antiguedadA
                    );
                }


                /*
                 * Desempate por ID.
                 */
                return (
                    Number(
                        b.id ||
                        0
                    ) -
                    Number(
                        a.id ||
                        0
                    )
                );
            }
        );


        // ======================================================
        // 12. GUARDAR UNIVERSO FILTRADO
        // ======================================================

        pdaFiltradosActual =
            filtrados;


        console.log(
            '📋 PDA 2.0 - filtrados:',
            filtrados.length
        );


        // ======================================================
        // 13. ACTUALIZAR KPIs
        // ======================================================

        actualizarKpisPdaDashboard(
            filtrados,
            lista
        );


        // ======================================================
        // 14. CONTEXTO VISUAL
        // ======================================================

        const contexto =
            document.getElementById(
                'pdaTableContext'
            );


        if (contexto) {

            const partes =
                [];


            if (periodo) {

                const option =
                    document
                        .getElementById(
                            'pdaPeriodo'
                        )
                        ?.selectedOptions?.[0]
                        ?.textContent
                        ?.trim();


                if (option) {
                    partes.push(
                        option
                    );
                }
            }


            if (quiebre) {

                const option =
                    document
                        .getElementById(
                            'pdaQuiebre'
                        )
                        ?.selectedOptions?.[0]
                        ?.textContent
                        ?.trim();


                if (option) {
                    partes.push(
                        option
                    );
                }
            }


            if (campana) {

                const option =
                    document
                        .getElementById(
                            'pdaCampana'
                        )
                        ?.selectedOptions?.[0]
                        ?.textContent
                        ?.trim();


                if (option) {
                    partes.push(
                        option
                    );
                }
            }


            if (lider) {
                partes.push(
                    lider
                );
            }


            contexto.textContent =
                partes.length > 0
                    ? partes.join(
                        ' · '
                    )
                    : 'Todos los contextos';
        }


        // ======================================================
        // 15. RENDER TABLA
        // ======================================================

        renderizarTablaPdaDashboard(
            filtrados
        );


    } catch (error) {

        console.error(
            '❌ Error renderizando PDA 2.0:',
            error
        );


        tbody.innerHTML = `
            <tr>
                <td
                    colspan="10"
                    class="pda-table-empty"
                >
                    No fue posible cargar
                    la bandeja de PDA.
                </td>
            </tr>
        `;
    }
}

function actualizarKpisPdaDashboard(
    filtrados,
    universo
) {
    const lista =
        Array.isArray(
            filtrados
        )
            ? filtrados
            : [];


    const abiertos =
        lista.filter(
            pda =>
                ![
                    'cerrados',
                    'escalados'
                ].includes(
                    pda.grupoEstado
                )
        );


    const pendientes =
        lista.filter(
            pda =>
                pda.grupoEstado ===
                'pendiente'
        );


    const intervencion =
        lista.filter(
            pda =>
                pda.grupoEstado ===
                'intervencion'
        );


    const seguimiento =
        lista.filter(
            pda =>
                pda.grupoEstado ===
                'seguimiento'
        );


    const capacitacion =
        lista.filter(
            pda =>
                pda.grupoEstado ===
                'capacitacion'
        );


    /*
     * Prioritario provisional:
     * abierto con 8+ días.
     */
    const prioritarios =
        abiertos.filter(
            pda =>
                Number(
                    pda.antiguedad ||
                    0
                ) >=
                8
        );


    const asignar =
        (
            id,
            valor
        ) => {
            const elemento =
                document.getElementById(
                    id
                );


            if (elemento) {
                elemento.textContent =
                    Number(
                        valor
                    ).toLocaleString(
                        'es-PE'
                    );
            }
        };


    asignar(
        'pdaKpiActivos',
        abiertos.length
    );

    asignar(
        'pdaKpiPendientes',
        pendientes.length
    );

    asignar(
        'pdaKpiIntervencion',
        intervencion.length
    );

    asignar(
        'pdaKpiSeguimiento',
        seguimiento.length
    );

    asignar(
        'pdaKpiCapacitacion',
        capacitacion.length
    );

    asignar(
        'pdaKpiPrioritarios',
        prioritarios.length
    );


    /*
     * Los filtros rápidos muestran
     * el universo anterior al filtro rápido.
     */
    const base =
        Array.isArray(
            universo
        )
            ? universo
            : [];


    asignar(
        'pdaQuickTodos',
        base.length
    );

    asignar(
        'pdaQuickPendientes',
        base.filter(
            x =>
                x.grupoEstado ===
                'pendiente'
        ).length
    );

    asignar(
        'pdaQuickIntervencion',
        base.filter(
            x =>
                x.grupoEstado ===
                'intervencion'
        ).length
    );

    asignar(
        'pdaQuickSeguimiento',
        base.filter(
            x =>
                x.grupoEstado ===
                'seguimiento'
        ).length
    );

    asignar(
        'pdaQuickCapacitacion',
        base.filter(
            x =>
                x.grupoEstado ===
                'capacitacion'
        ).length
    );

    asignar(
        'pdaQuickCerrados',
        base.filter(
            x =>
                [
                    'cerrados',
                    'escalados'
                ].includes(
                    x.grupoEstado
                )
        ).length
    );
}

function renderizarTablaPdaDashboard(
    lista
) {
    const tbody =
        document.getElementById(
            'pdaTableBody'
        );

    const count =
        document.getElementById(
            'pdaTableCount'
        );


    if (!tbody) {
        return;
    }


    pdaPageSizeActual =
        Number(
            document
                .getElementById(
                    'pdaPageSize'
                )
                ?.value ||
            25
        );


    const totalPaginas =
        Math.max(
            1,
            Math.ceil(
                lista.length /
                pdaPageSizeActual
            )
        );


    if (
        pdaPaginaActual >
        totalPaginas
    ) {
        pdaPaginaActual =
            totalPaginas;
    }


    const inicio =
        (
            pdaPaginaActual -
            1
        ) *
        pdaPageSizeActual;


    const pagina =
        lista.slice(
            inicio,
            inicio +
            pdaPageSizeActual
        );


    if (count) {
        count.textContent =
            `${lista.length.toLocaleString(
                'es-PE'
            )} registros`;
    }


    tbody.innerHTML =
        '';


    if (
        pagina.length ===
        0
    ) {
        tbody.innerHTML = `
            <tr>
                <td
                    colspan="10"
                    class="pda-table-empty"
                >
                    No existen PDA para
                    los filtros seleccionados.
                </td>
            </tr>
        `;


        actualizarPaginacionPdaDashboard(
            lista.length,
            totalPaginas
        );


        return;
    }


    pagina.forEach(
        pda => {

            const fila =
                document.createElement(
                    'tr'
                );


            const nota =
                pda.promedio_basal ==
                    null
                    ? '—'
                    : `${Number(
                        pda.promedio_basal
                    ).toFixed(
                        1
                    )}%`;


            const antiguedad =
                pda.antiguedad ==
                    null
                    ? '—'
                    : `${pda.antiguedad} día${
                        pda.antiguedad ===
                        1
                            ? ''
                            : 's'
                    }`;


            fila.innerHTML = `
                <td>
                    #${escapeHtml(
                        pda.id
                    )}
                </td>


                <td>
                    <strong>
                        ${escapeHtml(
                            pda.agente ||
                            '—'
                        )}
                    </strong>
                </td>


                <td>
                    ${escapeHtml(
                        pda.lider ||
                        'Sin líder'
                    )}
                </td>


                <td>
                    ${escapeHtml(
                        pda.contextoTexto
                    )}

                    ${
                        pda.contextoInferido
                            ? `
                                <small
                                    title="
                                        Contexto inferido desde
                                        las evaluaciones históricas
                                    "
                                >
                                    *
                                </small>
                            `
                            : ''
                    }
                </td>


                <td>
                    #${escapeHtml(
                        pda.ciclo_basal_numero ??
                        '—'
                    )}
                </td>


                <td>
                    ${escapeHtml(
                        nota
                    )}
                </td>


                <td>
                    ${escapeHtml(
                        obtenerTextoEstadoPdaDashboard(
                            pda.estado
                        )
                    )}
                </td>


                <td>
                    ${escapeHtml(
                        formatearFechaPdaDashboard(
                            pda.fecha_deteccion
                        )
                    )}
                </td>


                <td>
                    ${escapeHtml(
                        antiguedad
                    )}
                </td>


                <td>

                    <div
                        class="
                            pda-table-actions
                        "
                    >

                        <button
                            type="button"
                            class="
                                pda-table-action
                                pda-table-action-manage
                            "
                            data-pda-id="${Number(
                                pda.id
                            )}"
                        >
                            Gestionar
                        </button>


                        <button
                            type="button"
                            class="
                                pda-table-action
                                pda-table-action-report
                            "
                            data-pda-id="${Number(
                                pda.id
                            )}"
                        >
                            Ver informe
                        </button>

                    </div>

                </td>
            `;


            // ==============================================
            // GESTIONAR PDA
            // ==============================================

            fila
                .querySelector(
                    '.pda-table-action-manage'
                )
                ?.addEventListener(
                    'click',
                    async event => {

                        event.preventDefault();
                        event.stopPropagation();


                        try {

                            await abrirGestionPDA(
                                Number(
                                    pda.id
                                )
                            );


                        } catch (error) {

                            console.error(
                                '❌ Error abriendo gestión PDA:',
                                error
                            );


                            alert(
                                '❌ No fue posible abrir la gestión del PDA:\n\n' +
                                (
                                    error?.message ||
                                    'Error desconocido'
                                )
                            );
                        }
                    }
                );


            // ==============================================
            // VER INFORME PDA
            //
            // Solo consulta:
            //
            // - documento persistido;
            // - estado actual;
            // - timeline dinámico;
            // - sin abrir controles de gestión.
            // ==============================================

            fila
                .querySelector(
                    '.pda-table-action-report'
                )
                ?.addEventListener(
                    'click',
                    async event => {

                        event.preventDefault();
                        event.stopPropagation();


                        try {

                            if (
                                typeof verInformePda !==
                                'function'
                            ) {
                                throw new Error(
                                    'verInformePda no está disponible.'
                                );
                            }


                            await verInformePda(
                                Number(
                                    pda.id
                                )
                            );


                        } catch (error) {

                            console.error(
                                '❌ Error visualizando informe PDA:',
                                error
                            );


                            alert(
                                '❌ No fue posible visualizar el informe PDA:\n\n' +
                                (
                                    error?.message ||
                                    'Error desconocido'
                                )
                            );
                        }
                    }
                );


            tbody.appendChild(
                fila
            );
        }
    );


    actualizarPaginacionPdaDashboard(
        lista.length,
        totalPaginas
    );
}

function actualizarPaginacionPdaDashboard(
    total,
    totalPaginas
) {
    const info =
        document.getElementById(
            'pdaPaginationInfo'
        );

    const pagina =
        document.getElementById(
            'pdaPaginaActual'
        );

    const anterior =
        document.getElementById(
            'pdaPaginaAnterior'
        );

    const siguiente =
        document.getElementById(
            'pdaPaginaSiguiente'
        );


    if (info) {
        info.textContent =
            `${total.toLocaleString(
                'es-PE'
            )} registros`;
    }


    if (pagina) {
        pagina.textContent =
            `Página ${pdaPaginaActual} de ${totalPaginas}`;
    }


    if (anterior) {
        anterior.disabled =
            pdaPaginaActual <=
            1;
    }


    if (siguiente) {
        siguiente.disabled =
            pdaPaginaActual >=
            totalPaginas;
    }
}

async function inicializarPdaDashboard() {
    const dashboard =
        document.getElementById(
            'pdaDashboard'
        );


    if (!dashboard) {
        return;
    }


    if (
        pdaDashboardInicializado
    ) {
        await renderizarPdaDashboard();

        return;
    }


    pdaDashboardInicializado =
        true;


    await cargarCatalogosPdaDashboard();


    await cargarCampanasPdaDashboard();


    const quiebre =
        document.getElementById(
            'pdaQuiebre'
        );

    const aplicar =
        document.getElementById(
            'pdaAplicarFiltros'
        );

    const limpiar =
        document.getElementById(
            'pdaLimpiarFiltros'
        );

    const actualizar =
        document.getElementById(
            'pdaActualizar'
        );

    const exportar =
        document.getElementById(
            'pdaExportar'
        );

    const anterior =
        document.getElementById(
            'pdaPaginaAnterior'
        );

    const siguiente =
        document.getElementById(
            'pdaPaginaSiguiente'
        );

    const pageSize =
        document.getElementById(
            'pdaPageSize'
        );


    if (quiebre) {
        quiebre.addEventListener(
            'change',
            async () => {
                pdaPaginaActual =
                    1;

                await cargarCampanasPdaDashboard();

                await renderizarPdaDashboard();
            }
        );
    }


    if (aplicar) {
        aplicar.addEventListener(
            'click',
            async () => {
                pdaPaginaActual =
                    1;

                await renderizarPdaDashboard();
            }
        );
    }


    if (limpiar) {
        limpiar.addEventListener(
            'click',
            async () => {
                [
                    'pdaPeriodo',
                    'pdaQuiebre',
                    'pdaLider',
                    'pdaEstado',
                    'pdaBuscar'
                ].forEach(
                    id => {
                        const elemento =
                            document.getElementById(
                                id
                            );

                        if (elemento) {
                            elemento.value =
                                '';
                        }
                    }
                );


                pdaFiltroRapidoActual =
                    '';


                document
                    .querySelectorAll(
                        '.pda-quick-filter'
                    )
                    .forEach(
                        boton =>
                            boton.classList.remove(
                                'active'
                            )
                    );


                document
                    .querySelector(
                        '.pda-quick-filter[data-pda-state=""]'
                    )
                    ?.classList.add(
                        'active'
                    );


                pdaPaginaActual =
                    1;


                await cargarCampanasPdaDashboard();


                await renderizarPdaDashboard();
            }
        );
    }


    if (actualizar) {
        actualizar.addEventListener(
            'click',
            async () => {
                /*
                 * No bloqueamos la bandeja
                 * esperando reportes Python.
                 */
                await renderizarPdaDashboard();
            }
        );
    }


    if (
        exportar &&
        typeof exportarReportePDA ===
        'function'
    ) {
        exportar.addEventListener(
            'click',
            () => {
                exportarReportePDA();
            }
        );
    }


    document
        .querySelectorAll(
            '.pda-quick-filter'
        )
        .forEach(
            boton => {
                boton.addEventListener(
                    'click',
                    async () => {
                        document
                            .querySelectorAll(
                                '.pda-quick-filter'
                            )
                            .forEach(
                                otro =>
                                    otro.classList.remove(
                                        'active'
                                    )
                            );


                        boton.classList.add(
                            'active'
                        );


                        pdaFiltroRapidoActual =
                            boton.dataset
                                .pdaState ||
                            '';


                        pdaPaginaActual =
                            1;


                        await renderizarPdaDashboard();
                    }
                );
            }
        );


    if (anterior) {
        anterior.addEventListener(
            'click',
            async () => {
                if (
                    pdaPaginaActual >
                    1
                ) {
                    pdaPaginaActual--;

                    await renderizarPdaDashboard();
                }
            }
        );
    }


    if (siguiente) {
        siguiente.addEventListener(
            'click',
            async () => {
                pdaPaginaActual++;

                await renderizarPdaDashboard();
            }
        );
    }


    if (pageSize) {
        pageSize.addEventListener(
            'change',
            async () => {
                pdaPaginaActual =
                    1;

                await renderizarPdaDashboard();
            }
        );
    }


    await renderizarPdaDashboard();
}

async function cargarCatalogosPdaDashboard() {

    // ======================================================
    // QUIEBRES / CAMPAÑAS
    // ======================================================

    pdaMapaCampanasPorId =
        new Map();

    pdaMapaQuiebresPorId =
        new Map();


    try {
        const quiebres =
            await obtenerQuiebres();


        const listaQuiebres =
            Array.isArray(
                quiebres
            )
                ? quiebres
                : [];


        for (
            const quiebre
            of listaQuiebres
        ) {
            pdaMapaQuiebresPorId.set(
                Number(
                    quiebre.id
                ),
                quiebre
            );


            const campanas =
                await obtenerCampanasPorQuiebre(
                    quiebre.id
                );


            for (
                const campana
                of (
                    Array.isArray(
                        campanas
                    )
                        ? campanas
                        : []
                )
            ) {
                pdaMapaCampanasPorId.set(
                    Number(
                        campana.id
                    ),
                    campana
                );
            }
        }


        const selectQuiebre =
            document.getElementById(
                'pdaQuiebre'
            );


        if (selectQuiebre) {
            selectQuiebre.innerHTML =
                '<option value="">Todos</option>';


            listaQuiebres.forEach(
                quiebre => {
                    const option =
                        document.createElement(
                            'option'
                        );


                    option.value =
                        String(
                            quiebre.id
                        );


                    option.textContent =
                        quiebre.nombre
                            ? `${quiebre.codigo} - ${quiebre.nombre}`
                            : quiebre.codigo;


                    selectQuiebre.appendChild(
                        option
                    );
                }
            );
        }

    } catch (error) {
        console.error(
            '❌ Error cargando dominio PDA 2.0:',
            error
        );
    }


    // ======================================================
    // LÍDERES
    // FUENTE: API
    // ======================================================

    pdaMapaLiderPorAgente =
        {};


    try {
        const agentesConLider =
            await API.getAgentesCompleto();


        (
            Array.isArray(
                agentesConLider
            )
                ? agentesConLider
                : []
        ).forEach(
            item => {
                const agente =
                    String(
                        item.nombre ||
                        ''
                    ).trim();


                const lider =
                    String(
                        item.lider_2026 ||
                        ''
                    ).trim();


                if (agente) {
                    pdaMapaLiderPorAgente[
                        agente
                    ] =
                        lider ||
                        'Sin líder';
                }
            }
        );


        // ==================================================
        // POBLAR SELECT DE LÍDERES
        // ==================================================

        const selectLider =
            document.getElementById(
                'pdaLider'
            );


        if (selectLider) {
            const lideres =
                [
                    ...new Set(
                        Object.values(
                            pdaMapaLiderPorAgente
                        )
                            .filter(
                                valor =>
                                    valor &&
                                    valor !==
                                    'Sin líder'
                            )
                    )
                ]
                    .sort(
                        (
                            a,
                            b
                        ) =>
                            a.localeCompare(
                                b,
                                'es'
                            )
                    );


            selectLider.innerHTML =
                '<option value="">Todos</option>';


            lideres.forEach(
                lider => {
                    const option =
                        document.createElement(
                            'option'
                        );


                    option.value =
                        lider;

                    option.textContent =
                        lider;


                    selectLider.appendChild(
                        option
                    );
                }
            );
        }


        console.log(
            '👥 PDA 2.0 - agentes vía API:',
            Object.keys(
                pdaMapaLiderPorAgente
            ).length
        );


        console.log(
            '👥 PDA 2.0 - líderes vía API:',
            [
                ...new Set(
                    Object.values(
                        pdaMapaLiderPorAgente
                    )
                        .filter(
                            valor =>
                                valor !==
                                'Sin líder'
                        )
                )
            ]
        );

    } catch (error) {
        console.error(
            '❌ Error cargando líderes PDA vía API:',
            error
        );
    }


    // ======================================================
    // PERÍODOS
    // SE BASA EN EL FIN DEL CICLO BASAL
    // NO EN LA FECHA DE DETECCIÓN DEL PDA
    // ======================================================

    const selectPeriodo =
        document.getElementById(
            'pdaPeriodo'
        );


    if (selectPeriodo) {

        const periodos =
            [
                ...new Set(
                    (
                        Array.isArray(
                            window.datosPDA
                        )
                            ? window.datosPDA
                            : []
                    )
                        .map(
                            pda => {

                                if (
                                    !pda
                                        .fecha_fin_ciclo_basal
                                ) {
                                    return null;
                                }


                                const fecha =
                                    new Date(
                                        pda
                                            .fecha_fin_ciclo_basal
                                    );


                                if (
                                    Number.isNaN(
                                        fecha.getTime()
                                    )
                                ) {
                                    return null;
                                }


                                const anio =
                                    fecha
                                        .getFullYear();


                                const mes =
                                    String(
                                        fecha
                                            .getMonth() +
                                        1
                                    )
                                        .padStart(
                                            2,
                                            '0'
                                        );


                                return (
                                    `${anio}-${mes}`
                                );
                            }
                        )
                        .filter(Boolean)
                )
            ]
                .sort()
                .reverse();


        selectPeriodo.innerHTML =
            '<option value="">Todos</option>';


        periodos.forEach(
            periodo => {

                const option =
                    document.createElement(
                        'option'
                    );


                option.value =
                    periodo;


                const [
                    anio,
                    mes
                ] =
                    periodo.split(
                        '-'
                    );


                const fecha =
                    new Date(
                        Number(
                            anio
                        ),
                        Number(
                            mes
                        ) -
                        1,
                        1
                    );


                let texto =
                    fecha.toLocaleDateString(
                        'es-PE',
                        {
                            month:
                                'long',

                            year:
                                'numeric'
                        }
                    );


                /*
                 * Capitalizar primera letra
                 */
                texto =
                    texto
                        .charAt(0)
                        .toUpperCase() +
                    texto.slice(1);


                option.textContent =
                    texto;


                selectPeriodo.appendChild(
                    option
                );
            }
        );
    }


    console.log(
        '✅ Catálogos PDA 2.0 cargados'
    );
}

// ======================================================
// PDA - CONTEXTO MULTIDOMINIO DEL CICLO
// ======================================================

function normalizarIdContextoPda(
    valor
) {
    if (
        valor === null ||
        valor === undefined ||
        valor === ''
    ) {
        return null;
    }


    const numero =
        Number(
            valor
        );


    return (
        Number.isInteger(
            numero
        ) &&
        numero > 0
    )
        ? numero
        : null;
}


function obtenerContextoEvaluacionPda(
    evaluacion
) {
    if (!evaluacion) {
        return null;
    }


    return {
        quiebre_id:
            normalizarIdContextoPda(
                evaluacion.quiebre_id
            ),

        campana_id:
            normalizarIdContextoPda(
                evaluacion.campana_id
            ),

        matriz_id:
            normalizarIdContextoPda(
                evaluacion.matriz_id
            ),

        version_matriz_id:
            normalizarIdContextoPda(
                evaluacion.version_matriz_id ??
                evaluacion.versionMatrizId
            )
    };
}


function construirClaveContextoPda(
    contexto
) {
    return [
        contexto.quiebre_id ??
        'SIN_QUIEBRE',

        contexto.matriz_id ??
        'SIN_MATRIZ',

        contexto.version_matriz_id ??
        'SIN_VERSION'
    ].join(
        '|'
    );
}


function resolverContextoCicloPda(
    evaluaciones
) {
    const lista =
        Array.isArray(
            evaluaciones
        )
            ? evaluaciones
            : [];


    if (
        lista.length === 0
    ) {
        throw new Error(
            'El ciclo no contiene evaluaciones'
        );
    }


    const contextos =
        lista.map(
            evaluacion => ({
                evaluacion,

                contexto:
                    obtenerContextoEvaluacionPda(
                        evaluacion
                    )
            })
        );


    const incompletas =
        contextos.filter(
            item =>
                !item.contexto?.quiebre_id ||
                !item.contexto?.matriz_id ||
                !item.contexto?.version_matriz_id
        );


    if (
        incompletas.length > 0
    ) {
        console.error(
            '❌ Evaluaciones sin contexto PDA completo:',
            incompletas
        );


        throw new Error(
            `${incompletas.length} evaluación(es) del ciclo no tienen ` +
            'quiebre, matriz o versión de matriz asociados.'
        );
    }


    /*
     * campana_id puede ser null.
     *
     * Esto soporta:
     *
     * quiebre -> campaña -> matriz
     *
     * y también:
     *
     * quiebre -> matriz
     */
    const grupos =
        new Map();


    for (
        const item
        of contextos
    ) {
        const clave =
            construirClaveContextoPda(
                item.contexto
            );


        if (
            !grupos.has(
                clave
            )
        ) {
            grupos.set(
                clave,
                {
                    contexto:
                        item.contexto,

                    evaluaciones:
                        []
                }
            );
        }


        grupos.get(
            clave
        ).evaluaciones.push(
            item.evaluacion
        );
    }


    if (
        grupos.size > 1
    ) {
        console.error(
            '❌ El ciclo contiene múltiples contextos PDA:',
            Array.from(
                grupos.values()
            )
        );


        throw new Error(
            'El ciclo contiene evaluaciones de diferentes quiebres, ' +
            'campañas, matrices o versiones. No se puede generar un único ' +
            'PDA mezclando contextos distintos.'
        );
    }


    const unico =
        Array.from(
            grupos.values()
        )[0];


    return {
        ...unico.contexto,

        evaluaciones:
            unico.evaluaciones
    };

    const campanasIds =
        [
            ...new Set(
                unico.evaluaciones
                    .map(
                        evaluacion =>
                            normalizarIdContextoPda(
                                evaluacion.campana_id
                            )
                    )
                    .filter(
                        id =>
                            id !== null
                    )
            )
        ];


    return {
        ...unico.contexto,

        campana_id:
            campanasIds.length === 1
                ? campanasIds[0]
                : null,

        campanas_ids:
            campanasIds,

        es_multicampana:
            campanasIds.length > 1,

        evaluaciones:
            unico.evaluaciones
    };
}

// ======================================================
// PDA - HALLAZGOS DINÁMICOS SEGÚN MATRIZ / VERSIÓN
// ======================================================

function normalizarRespuestaPda(
    valor
) {
    if (
        valor === null ||
        valor === undefined
    ) {
        return '';
    }


    return String(
        valor
    )
        .trim()
        .toUpperCase();
}


function respuestaIncumplePda(
    detalle
) {
    if (!detalle) {
        return false;
    }


    /*
     * Prioridad:
     *
     * 1. Si backend/detalle ya trae cumple explícito,
     *    respetamos ese valor.
     *
     * 2. Si no, interpretamos valor_respuesta.
     *
     * Convención histórica MECA:
     *
     * 1  = cumple
     * NA = no aplica / cumple para puntuación
     * 0  = incumple
     */

    if (
        detalle.cumple === false ||
        detalle.cumple === 0 ||
        detalle.cumple === 'false'
    ) {
        return true;
    }


    if (
        detalle.cumple === true ||
        detalle.cumple === 1 ||
        detalle.cumple === 'true'
    ) {
        return false;
    }


    const respuesta =
        normalizarRespuestaPda(
            detalle.valor_respuesta ??
            detalle.respuesta ??
            detalle.valor
        );


    if (
        respuesta === '0' ||
        respuesta === 'NO' ||
        respuesta === 'INCUMPLE'
    ) {
        return true;
    }


    return false;
}


function obtenerNombreElementoPda(
    elemento,
    fallback = ''
) {
    if (!elemento) {
        return fallback;
    }


    return (
        elemento.nombre ??
        elemento.descripcion ??
        elemento.codigo ??
        elemento.label ??
        fallback
    );
}


function obtenerCriteriosAtributoPda(
    atributo
) {
    if (!atributo) {
        return [];
    }


    /*
     * La estructura puede seguir usando distintos
     * nombres según la evolución histórica del módulo.
     *
     * No forzamos "submotivos" como concepto de dominio.
     */

    const candidatos = [
        /*
        * Contrato actual del módulo Matrix.
        * /api/evaluacion/estructura devuelve:
        * atributo.sub_motivos
        */
        atributo.sub_motivos,

        /*
        * Compatibilidad con contratos históricos.
        */
        atributo.criterios,
        atributo.items,
        atributo.submotivos,
        atributo.subMotivos,
        atributo.detalles
    ];


    for (
        const lista
        of candidatos
    ) {
        if (
            Array.isArray(
                lista
            )
        ) {
            return lista;
        }
    }


    return [];
}


function crearIndiceEstructuraPda(
    estructura
) {
    const indice =
        new Map();


    const frentes =
        Array.isArray(
            estructura?.frentes
        )
            ? estructura.frentes
            : Array.isArray(
                estructura
            )
                ? estructura
                : [];


    for (
        const frente
        of frentes
    ) {
        const atributos =
            Array.isArray(
                frente?.atributos
            )
                ? frente.atributos
                : [];


        for (
            const atributo
            of atributos
        ) {
            const criterios =
                obtenerCriteriosAtributoPda(
                    atributo
                );


            for (
                const criterio
                of criterios
            ) {
                const criterioId =
                    normalizarIdContextoPda(
                        criterio?.id ??
                        criterio?.criterio_id ??
                        criterio?.submotivo_id
                    );


                if (!criterioId) {
                    continue;
                }


                indice.set(
                    criterioId,
                    {
                        frente_id:
                            normalizarIdContextoPda(
                                frente?.id
                            ),

                        frente:
                            frente?.nombre ??
                            frente?.descripcion ??
                            frente?.codigo ??
                            frente?.frente ??
                            'Sin frente',

                        atributo_id:
                            normalizarIdContextoPda(
                                atributo?.id
                            ),

                        atributo:
                            obtenerNombreElementoPda(
                                atributo,
                                'Sin atributo'
                            ),

                        criterio_id:
                            criterioId,

                        criterio:
                            criterio?.codigo ??
                            criterio?.criterio ??
                            criterio?.nombre ??
                            criterio?.descripcion ??
                            'Sin criterio',

                        peso:
                            Number(
                                criterio?.peso_individual ??
                                criterio?.peso ??
                                0
                            ) || 0,

                        // ==================================================
                        // CLASIFICACIÓN PDA DESDE LA MATRIZ
                        // ==================================================

                        clasificacion_pda_id:
                            normalizarIdContextoPda(
                                criterio?.clasificacion_pda?.id ??
                                criterio?.clasificacion_pda_id
                            ),

                        clasificacion_pda_codigo:
                            criterio?.clasificacion_pda?.codigo ??
                            criterio?.clasificacion_pda_codigo ??
                            null,

                        clasificacion_pda_nombre:
                            criterio?.clasificacion_pda?.nombre ??
                            criterio?.clasificacion_pda_nombre ??
                            null,

                        /*
                        * Compatibilidad histórica.
                        */
                        clasificacion:
                            criterio?.clasificacion ??
                            null
                    }
                );
            }
        }
    }


    return indice;
}


function resolverCriterioDetallePda(
    detalle,
    indiceEstructura
) {
    // ======================================================
    // 1. IDENTIDAD ESTRUCTURAL DEL DETALLE
    // ======================================================

    const criterioId =
        normalizarIdContextoPda(
            detalle?.criterio_id
        );


    const atributoId =
        normalizarIdContextoPda(
            detalle?.atributo_id
        );


    const frenteId =
        normalizarIdContextoPda(
            detalle?.frente_id
        );


    if (
        !criterioId ||
        !atributoId ||
        !frenteId
    ) {
        throw new Error(
            'Detalle de evaluación sin identidad estructural: ' +
            (
                detalle?.submotivo ??
                detalle?.criterio ??
                detalle?.id ??
                'desconocido'
            )
        );
    }


    // ======================================================
    // 2. RESOLVER CRITERIO POR ID
    // ======================================================

    const criterio =
        indiceEstructura.get(
            criterioId
        );


    if (!criterio) {
        throw new Error(
            `El criterio_id ${criterioId} no pertenece ` +
            'a la estructura de la versión evaluada.'
        );
    }


    // ======================================================
    // 3. VALIDAR JERARQUÍA
    //
    // Evita mezclar accidentalmente IDs pertenecientes
    // a contextos estructurales diferentes.
    // ======================================================

    if (
        criterio.atributo_id !==
        atributoId
    ) {
        throw new Error(
            `El atributo_id ${atributoId} no corresponde ` +
            `al criterio_id ${criterioId}.`
        );
    }


    if (
        criterio.frente_id !==
        frenteId
    ) {
        throw new Error(
            `El frente_id ${frenteId} no corresponde ` +
            `al criterio_id ${criterioId}.`
        );
    }


    return criterio;
}


async function cargarDetallesEvaluacionesPda(
    evaluaciones
) {
    const lista =
        Array.isArray(
            evaluaciones
        )
            ? evaluaciones
            : [];


    const resultado =
        [];


    for (
        const evaluacion
        of lista
    ) {
        const evaluacionId =
            evaluacion?.id ??
            evaluacion?.evaluacion_id;


        if (!evaluacionId) {
            console.warn(
                '⚠️ Evaluación sin ID al construir PDA:',
                evaluacion
            );

            continue;
        }


        /*
         * Si gestores.js ya cargó los detalles bajo demanda,
         * los reutilizamos y evitamos otra llamada.
         */
        let detalles =
            Array.isArray(
                evaluacion.detalles
            )
                ? evaluacion.detalles
                : null;


        if (
            !detalles &&
            window.API &&
            typeof API.getDetallesEvaluacion ===
            'function'
        ) {
            detalles =
                await API.getDetallesEvaluacion(
                    evaluacionId
                );
        }


        resultado.push({
            evaluacion,
            detalles:
                Array.isArray(
                    detalles
                )
                    ? detalles
                    : []
        });
    }



    return resultado;
}


async function construirHallazgosPda(
    evaluaciones,
    estructura
) {
    const indiceEstructura =
        crearIndiceEstructuraPda(
            estructura
        );



    const evaluacionesDetalle =
        await cargarDetallesEvaluacionesPda(
            evaluaciones
        );

    const hallazgos = [];

    for (
        const item
        of evaluacionesDetalle
    ) {
        const evaluacion =
            item.evaluacion;


        for (
            const detalle
            of item.detalles
        ) {
            if (
                !respuestaIncumplePda(
                    detalle
                )
            ) {
                continue;
            }


            const criterio =
                resolverCriterioDetallePda(
                    detalle,
                    indiceEstructura
                );


            hallazgos.push({
                evaluacion_id:
                    evaluacion?.id ??
                    evaluacion?.evaluacion_id ??
                    null,

                codigo_llamada:
                    evaluacion?.idLlamada ??
                    evaluacion?.id_llamada ??
                    evaluacion?.codigo_llamada ??
                    null,

                ticket:
                    evaluacion?.ticketPSI ??
                    evaluacion?.ticket_psi ??
                    evaluacion?.ticket ??
                    null,

                fecha:
                    evaluacion?.fechaOriginal ??
                    evaluacion?.fecha ??
                    evaluacion?.fecha_formateada ??
                    null,

                campana:
                    evaluacion?.campana ??
                    null,

                nota:
                    Number(
                        evaluacion?.notaFinal ??
                        evaluacion?.nota_final ??
                        evaluacion?.nota ??
                        0
                    ) || 0,

                frente_id:
                    criterio.frente_id,

                frente:
                    criterio.frente,

                atributo_id:
                    criterio.atributo_id,

                atributo:
                    criterio.atributo,

                criterio_id:
                    criterio.criterio_id,

                criterio:
                    criterio.criterio,

                peso:
                    criterio.peso,

                clasificacion_pda_id:
                    criterio.clasificacion_pda_id ??
                    null,

                clasificacion_pda_codigo:
                    criterio.clasificacion_pda_codigo ??
                    null,

                clasificacion_pda_nombre:
                    criterio.clasificacion_pda_nombre ??
                    null,

                clasificacion:
                    criterio.clasificacion ??
                    null,

                respuesta:
                    detalle?.valor_respuesta ??
                    detalle?.respuesta ??
                    detalle?.valor ??
                    null,

                observacion:
                    detalle?.observacion ??
                    detalle?.observaciones ??
                    null
            });
        }
    }


    return hallazgos;
}

// ======================================================
// PDA - RESUMEN DINÁMICO DE HALLAZGOS
// ======================================================

function construirResumenHallazgosPda(
    hallazgos
) {
    const lista =
        Array.isArray(
            hallazgos
        )
            ? hallazgos
            : [];


    const mapaFrentes =
        new Map();


    for (
        const hallazgo
        of lista
    ) {
        const frenteClave =
            hallazgo.frente_id ??
            hallazgo.frente ??
            'SIN_FRENTE';


        if (
            !mapaFrentes.has(
                frenteClave
            )
        ) {
            mapaFrentes.set(
                frenteClave,
                {
                    frente_id:
                        hallazgo.frente_id ??
                        null,

                    frente:
                        hallazgo.frente ||
                        'Sin frente',

                    total:
                        0,

                    atributos:
                        new Map()
                }
            );
        }


        const frente =
            mapaFrentes.get(
                frenteClave
            );


        frente.total++;


        const atributoClave =
            hallazgo.atributo_id ??
            hallazgo.atributo ??
            'SIN_ATRIBUTO';


        if (
            !frente.atributos.has(
                atributoClave
            )
        ) {
            frente.atributos.set(
                atributoClave,
                {
                    atributo_id:
                        hallazgo.atributo_id ??
                        null,

                    atributo:
                        hallazgo.atributo ||
                        'Sin atributo',

                    total:
                        0,

                    criterios:
                        new Map()
                }
            );
        }


        const atributo =
            frente.atributos.get(
                atributoClave
            );


        atributo.total++;


        const criterioClave =
            hallazgo.criterio_id ??
            hallazgo.criterio ??
            'SIN_CRITERIO';


        if (
            !atributo.criterios.has(
                criterioClave
            )
        ) {
            atributo.criterios.set(
                criterioClave,
                {
                    criterio_id:
                        hallazgo.criterio_id ??
                        null,

                    criterio:
                        hallazgo.criterio ||
                        'Sin criterio',

                    total:
                        0,

                    evaluaciones:
                        new Set()
                }
            );
        }


        const criterio =
            atributo.criterios.get(
                criterioClave
            );


        criterio.total++;


        if (
            hallazgo.evaluacion_id
        ) {
            criterio.evaluaciones.add(
                hallazgo.evaluacion_id
            );
        }
    }


    const frentes =
        Array.from(
            mapaFrentes.values()
        )
            .map(
                frente => ({
                    frente_id:
                        frente.frente_id,

                    frente:
                        frente.frente,

                    total:
                        frente.total,

                    atributos:
                        Array.from(
                            frente.atributos.values()
                        )
                            .map(
                                atributo => ({
                                    atributo_id:
                                        atributo.atributo_id,

                                    atributo:
                                        atributo.atributo,

                                    total:
                                        atributo.total,

                                    criterios:
                                        Array.from(
                                            atributo.criterios.values()
                                        )
                                            .map(
                                                criterio => ({
                                                    criterio_id:
                                                        criterio.criterio_id,

                                                    criterio:
                                                        criterio.criterio,

                                                    total:
                                                        criterio.total,

                                                    total_evaluaciones:
                                                        criterio.evaluaciones.size
                                                })
                                            )
                                            .sort(
                                                (
                                                    a,
                                                    b
                                                ) =>
                                                    b.total -
                                                    a.total
                                            )
                                })
                            )
                            .sort(
                                (
                                    a,
                                    b
                                ) =>
                                    b.total -
                                    a.total
                            )
                })
            )
            .sort(
                (
                    a,
                    b
                ) =>
                    b.total -
                    a.total
            );


    return {
        total_hallazgos:
            lista.length,

        total_frentes:
            frentes.length,

        total_atributos:
            frentes.reduce(
                (
                    suma,
                    frente
                ) =>
                    suma +
                    frente.atributos.length,
                0
            ),

        total_criterios:
            frentes.reduce(
                (
                    suma,
                    frente
                ) =>
                    suma +
                    frente.atributos.reduce(
                        (
                            subtotal,
                            atributo
                        ) =>
                            subtotal +
                            atributo.criterios.length,
                        0
                    ),
                0
            ),

        frentes
    };
}

// ======================================================
// PDA - MODELO DOCUMENTAL DE EVALUACIONES
// ======================================================

function construirCatalogoEvaluacionesDocumentoPda(
    evaluaciones,
    hallazgos
) {
    const listaEvaluaciones =
        Array.isArray(evaluaciones)
            ? evaluaciones
            : [];

    const listaHallazgos =
        Array.isArray(hallazgos)
            ? hallazgos
            : [];


    const totalHallazgosPorEvaluacion =
        new Map();


    for (const hallazgo of listaHallazgos) {
        const evaluacionId =
            normalizarIdContextoPda(
                hallazgo?.evaluacion_id
            );

        if (!evaluacionId) {
            continue;
        }

        totalHallazgosPorEvaluacion.set(
            evaluacionId,
            (
                totalHallazgosPorEvaluacion.get(
                    evaluacionId
                ) || 0
            ) + 1
        );
    }


    return listaEvaluaciones.map(
        (evaluacion, index) => {

            const evaluacionId =
                normalizarIdContextoPda(
                    evaluacion?.id ??
                    evaluacion?.evaluacion_id
                );


            return {
                ref:
                    `L${index + 1}`,

                evaluacion_id:
                    evaluacionId,

                codigo_llamada:
                    evaluacion?.idLlamada ??
                    evaluacion?.id_llamada ??
                    evaluacion?.codigo_llamada ??
                    '—',

                ticket:
                    evaluacion?.ticketPSI ??
                    evaluacion?.ticket_psi ??
                    evaluacion?.ticket ??
                    '—',

                fecha_auditoria:
                    evaluacion?.fechaOriginal ??
                    evaluacion?.fecha ??
                    evaluacion?.fecha_formateada ??
                    '—',

                campana:
                    evaluacion?.campana ??
                    evaluacion?.campana_codigo ??
                    '—',

                nota:
                    Number(
                        evaluacion?.notaFinal ??
                        evaluacion?.nota_final ??
                        evaluacion?.nota ??
                        0
                    ) || 0,

                total_hallazgos:
                    totalHallazgosPorEvaluacion.get(
                        evaluacionId
                    ) || 0
            };
        }
    );
}

// ======================================================
// PDA - MATRIZ DE HALLAZGOS POR LLAMADA
// ======================================================

function construirMatrizHallazgosDocumentoPda(
    hallazgos,
    evaluacionesDocumento
) {
    const listaHallazgos =
        Array.isArray(hallazgos)
            ? hallazgos
            : [];

    const llamadas =
        Array.isArray(evaluacionesDocumento)
            ? evaluacionesDocumento
            : [];


    const referenciaPorEvaluacion =
        new Map(
            llamadas.map(
                item => [
                    normalizarIdContextoPda(
                        item.evaluacion_id
                    ),
                    item.ref
                ]
            )
        );


    const totalLlamadas =
        llamadas.length;


    const mapa =
        new Map();


    for (const hallazgo of listaHallazgos) {

        const clave =
            [
                hallazgo.frente_id ??
                hallazgo.frente ??
                'SIN_FRENTE',

                hallazgo.atributo_id ??
                hallazgo.atributo ??
                'SIN_ATRIBUTO',

                hallazgo.criterio_id ??
                hallazgo.criterio ??
                'SIN_CRITERIO'
            ].join('|');


        if (!mapa.has(clave)) {

            const tipo =
                resolverTipoPdaDesdeClasificacion(
                    hallazgo
                );


            mapa.set(
                clave,
                {
                    frente_id:
                        hallazgo.frente_id ??
                        null,

                    frente:
                        hallazgo.frente ??
                        'Sin frente',

                    atributo_id:
                        hallazgo.atributo_id ??
                        null,

                    atributo:
                        hallazgo.atributo ??
                        'Sin atributo',

                    criterio_id:
                        hallazgo.criterio_id ??
                        null,

                    criterio:
                        hallazgo.criterio ??
                        'Sin criterio',

                    clasificacion_pda_id:
                        hallazgo.clasificacion_pda_id ??
                        null,

                    clasificacion_pda_codigo:
                        hallazgo.clasificacion_pda_codigo ??
                        null,

                    clasificacion_pda_nombre:
                        hallazgo.clasificacion_pda_nombre ??
                        tipo.clasificacion,

                    tipo_accion:
                        tipo.tipo_accion,

                    evaluaciones:
                        new Set(),

                    llamadas:
                        new Set(),

                    total:
                        0
                }
            );
        }


        const item =
            mapa.get(clave);


        const evaluacionId =
            normalizarIdContextoPda(
                hallazgo.evaluacion_id
            );


        if (evaluacionId) {

            item.evaluaciones.add(
                evaluacionId
            );


            const referencia =
                referenciaPorEvaluacion.get(
                    evaluacionId
                );


            if (referencia) {
                item.llamadas.add(
                    referencia
                );
            }
        }


        item.total++;
    }


    return Array
        .from(
            mapa.values()
        )
        .map(
            item => {

                const totalEvaluaciones =
                    item.evaluaciones.size;


                const recurrenciaPct =
                    totalLlamadas > 0
                        ? (
                            totalEvaluaciones /
                            totalLlamadas
                        ) * 100
                        : 0;


                return {
                    ...item,

                    evaluaciones:
                        Array.from(
                            item.evaluaciones
                        ),

                    llamadas:
                        Array.from(
                            item.llamadas
                        ),

                    total_evaluaciones:
                        totalEvaluaciones,

                    total_llamadas:
                        totalLlamadas,

                    recurrencia_pct:
                        Number(
                            recurrenciaPct.toFixed(0)
                        )
                };
            }
        )
        .sort(
            (a, b) => {

                if (
                    b.total_evaluaciones !==
                    a.total_evaluaciones
                ) {
                    return (
                        b.total_evaluaciones -
                        a.total_evaluaciones
                    );
                }

                return String(
                    a.criterio
                ).localeCompare(
                    String(
                        b.criterio
                    ),
                    'es'
                );
            }
        );
}

// ======================================================
// PDA - UTILIDADES DOCUMENTO
// ======================================================

function escaparHtmlPda(
    valor
) {
    return String(
        valor ??
        ''
    )
        .replace(
            /&/g,
            '&amp;'
        )
        .replace(
            /</g,
            '&lt;'
        )
        .replace(
            />/g,
            '&gt;'
        )
        .replace(
            /"/g,
            '&quot;'
        )
        .replace(
            /'/g,
            '&#039;'
        );
}


function generarDocumentoIdPda() {
    const ahora =
        new Date();


    const anio =
        ahora
            .getFullYear();


    const mes =
        String(
            ahora.getMonth() + 1
        )
            .padStart(
                2,
                '0'
            );


    const dia =
        String(
            ahora.getDate()
        )
            .padStart(
                2,
                '0'
            );


    const hora =
        String(
            ahora.getHours()
        )
            .padStart(
                2,
                '0'
            );


    const minuto =
        String(
            ahora.getMinutes()
        )
            .padStart(
                2,
                '0'
            );


    const segundo =
        String(
            ahora.getSeconds()
        )
            .padStart(
                2,
                '0'
            );


    return (
        `PDA-${anio}${mes}${dia}-` +
        `${hora}${minuto}${segundo}`
    );
}


function formatearNumeroPda(
    valor,
    decimales = 1
) {
    const numero =
        Number(
            valor
        );


    if (
        !Number.isFinite(
            numero
        )
    ) {
        return '0';
    }


    return numero.toFixed(
        decimales
    );
}


function obtenerNombreContextoPda(
    objeto,
    fallback
) {
    if (!objeto) {
        return fallback;
    }


    return (
        objeto.nombre ??
        objeto.descripcion ??
        objeto.codigo ??
        fallback
    );
}

// ======================================================
// PDA - FORMATO DE FECHAS DEL DOCUMENTO
// ======================================================

function formatearFechaDocumentoPda(
    valor,
    incluirHora = false
) {
    if (
        valor === null ||
        valor === undefined ||
        valor === ''
    ) {
        return '—';
    }


    /*
     * Si recibimos YYYY-MM-DD sin hora,
     * NO usamos new Date() para evitar
     * desplazamientos por zona horaria.
     */
    const soloFecha =
        String(valor).match(
            /^(\d{4})-(\d{2})-(\d{2})$/
        );


    if (soloFecha) {
        return (
            `${soloFecha[3]}/` +
            `${soloFecha[2]}/` +
            `${soloFecha[1]}`
        );
    }


    /*
     * Formatos tipo:
     * 2026-06-02T14:26
     * 2026-06-02T14:26:00
     *
     * Si NO existe offset/Z explícito,
     * conservamos exactamente la hora
     * recibida.
     */
    const fechaLocalTexto =
        String(valor).match(
            /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/
        );


    const tieneZonaExplicita =
        /(?:Z|[+-]\d{2}:\d{2})$/i.test(
            String(valor)
        );


    if (
        fechaLocalTexto &&
        !tieneZonaExplicita
    ) {
        const fecha =
            `${fechaLocalTexto[3]}/` +
            `${fechaLocalTexto[2]}/` +
            `${fechaLocalTexto[1]}`;


        if (!incluirHora) {
            return fecha;
        }


        return (
            `${fecha} ` +
            `${fechaLocalTexto[4]}:` +
            `${fechaLocalTexto[5]}`
        );
    }


    /*
     * ISO real con timezone:
     * se convierte a hora Perú.
     */
    const fecha =
        new Date(valor);


    if (
        Number.isNaN(
            fecha.getTime()
        )
    ) {
        return String(valor);
    }


    const opciones = {
        timeZone:
            'America/Lima',

        day:
            '2-digit',

        month:
            '2-digit',

        year:
            'numeric'
    };


    if (incluirHora) {
        opciones.hour =
            '2-digit';

        opciones.minute =
            '2-digit';

        opciones.hour12 =
            false;
    }


    return new Intl.DateTimeFormat(
        'es-PE',
        opciones
    ).format(
        fecha
    );
}


function formatearPeriodoDocumentoPda(
    fechaInicio,
    fechaFin
) {
    return (
        `${formatearFechaDocumentoPda(
            fechaInicio
        )} → ` +
        `${formatearFechaDocumentoPda(
            fechaFin
        )}`
    );
}

// ======================================================
// PDA - FORMATO DE FECHAS DEL DOCUMENTO
// ======================================================

function formatearFechaDocumentoPda(
    valor,
    incluirHora = false
) {
    if (
        valor === null ||
        valor === undefined ||
        valor === ''
    ) {
        return '—';
    }

    const texto =
        String(valor).trim();


    // ==================================================
    // YA VIENE EN DD/MM/YYYY
    // ==================================================

    if (
        /^\d{2}\/\d{2}\/\d{4}$/.test(
            texto
        )
    ) {
        return texto;
    }


    // ==================================================
    // YYYY-MM-DD SIN HORA
    // ==================================================

    const soloFecha =
        texto.match(
            /^(\d{4})-(\d{2})-(\d{2})$/
        );


    if (soloFecha) {
        return (
            `${soloFecha[3]}/` +
            `${soloFecha[2]}/` +
            `${soloFecha[1]}`
        );
    }


    // ==================================================
    // FECHA LOCAL SIN TIMEZONE
    // Ejemplo:
    // 2026-06-02T14:26
    // ==================================================

    const fechaLocal =
        texto.match(
            /^(\d{4})-(\d{2})-(\d{2})[T ](\d{2}):(\d{2})/
        );


    const tieneZonaExplicita =
        /(?:Z|[+-]\d{2}:?\d{2})$/i.test(
            texto
        );


    if (
        fechaLocal &&
        !tieneZonaExplicita
    ) {
        const fecha =
            `${fechaLocal[3]}/` +
            `${fechaLocal[2]}/` +
            `${fechaLocal[1]}`;


        if (!incluirHora) {
            return fecha;
        }


        return (
            `${fecha} ` +
            `${fechaLocal[4]}:` +
            `${fechaLocal[5]}`
        );
    }


    // ==================================================
    // ISO CON TIMEZONE
    // Convertimos al horario de Perú.
    // ==================================================

    const fecha =
        new Date(texto);


    if (
        Number.isNaN(
            fecha.getTime()
        )
    ) {
        return texto;
    }


    const opciones = {
        timeZone:
            'America/Lima',

        day:
            '2-digit',

        month:
            '2-digit',

        year:
            'numeric'
    };


    if (incluirHora) {
        opciones.hour =
            '2-digit';

        opciones.minute =
            '2-digit';

        opciones.hour12 =
            false;
    }


    return new Intl.DateTimeFormat(
        'es-PE',
        opciones
    ).format(
        fecha
    );
}


function formatearPeriodoDocumentoPda(
    fechaInicio,
    fechaFin
) {
    return (
        `${formatearFechaDocumentoPda(
            fechaInicio
        )} → ` +
        `${formatearFechaDocumentoPda(
            fechaFin
        )}`
    );
}

function obtenerCampanasDocumentoPda(
    evaluaciones,
    contexto
) {
    const lista =
        Array.isArray(evaluaciones)
            ? evaluaciones
            : [];

    const mapa =
        new Map();


    for (const evaluacion of lista) {

        const id =
            evaluacion?.campana_id ??
            null;

        const codigo =
            evaluacion?.campana ??
            evaluacion?.campana_codigo ??
            null;

        const nombre =
            evaluacion?.campana_nombre ??
            codigo ??
            null;


        if (
            id === null &&
            !codigo &&
            !nombre
        ) {
            continue;
        }


        const clave =
            String(
                id ??
                codigo ??
                nombre
            );


        if (!mapa.has(clave)) {
            mapa.set(
                clave,
                {
                    id,
                    codigo,
                    nombre
                }
            );
        }
    }


    /*
     * Fallback al contexto cuando las evaluaciones
     * no traen información de campaña.
     */
    if (
        mapa.size === 0 &&
        contexto?.campana
    ) {
        const campana =
            contexto.campana;

        mapa.set(
            String(
                campana.id ??
                campana.codigo ??
                campana.nombre ??
                'CAMPANA'
            ),
            {
                id:
                    campana.id ??
                    null,

                codigo:
                    campana.codigo ??
                    null,

                nombre:
                    campana.nombre ??
                    campana.codigo ??
                    null
            }
        );
    }


    return Array.from(
        mapa.values()
    );
}

// ======================================================
// PDA - DOCUMENTO HTML MULTICONTEXTO
// ======================================================

function generarDocumentoHtmlPda(
    data
) {
    const {
        documentoId,
        fechaEmision,
        agente,
        ciclo,
        contexto,
        resumenHallazgos,
        evaluacionesDocumento,
        matrizHallazgosDocumento
    } = data;


    const llamadas =
        Array.isArray(
            evaluacionesDocumento
        )
            ? evaluacionesDocumento
            : [];


    const matriz =
        Array.isArray(
            matrizHallazgosDocumento
        )
            ? matrizHallazgosDocumento
            : [];


    const quiebre =
        contexto?.quiebre ??
        {};


    const campana =
        contexto?.campana ??
        null;

    const campanasDocumento =
        obtenerCampanasDocumentoPda(
            llamadas,
            contexto
        );


    const matrizContexto =
        contexto?.matriz ??
        {};


    const version =
        contexto?.versionMatriz ??
        {};


    // ==================================================
    // ORIENTACIÓN A4
    // ==================================================
    //
    // Hasta 6 llamadas:
    // A4 vertical.
    //
    // Más de 6:
    // A4 horizontal para proteger la matriz.
    // ==================================================

    const documentoHorizontal =
        llamadas.length > 6;


    // ==================================================
    // CONTEXTO
    // ==================================================

    const nombreQuiebre =
        quiebre?.nombre ??
        quiebre?.codigo ??
        '—';


    const nombreCampana =
        campanasDocumento.length > 0
            ? campanasDocumento
                .map(
                    item =>
                        item.codigo ??
                        item.nombre ??
                        '—'
                )
                .filter(Boolean)
                .join(' / ')
            : '—';


    const nombreMatriz =
        matrizContexto?.nombre ??
        matrizContexto?.codigo ??
        '—';


    const versionTexto =
        version?.version ??
        version?.nombre ??
        '—';


    // ==================================================
    // INDICADORES
    // ==================================================

    const totalIncumplimientos =
        matriz.reduce(
            (
                total,
                item
            ) => {

                const cantidad =
                    Number(
                        item
                            ?.total_evaluaciones ??
                        item
                            ?.incumplimientos ??
                        0
                    );


                return (
                    total +
                    (
                        Number.isFinite(
                            cantidad
                        )
                            ? cantidad
                            : 0
                    )
                );
            },
            0
        );


    const totalFrentes =
        new Set(
            matriz
                .map(
                    item =>
                        item.frente_id ??
                        item.frente
                )
                .filter(Boolean)
        ).size;


    const totalAtributos =
        new Set(
            matriz
                .map(
                    item =>
                        item.atributo_id ??
                        item.atributo
                )
                .filter(Boolean)
        ).size;


    const totalSubmotivos =
        matriz.length;


    // ==================================================
    // CABECERAS L1, L2...
    // ==================================================

    const columnasLlamadasHtml =
        llamadas
            .map(
                llamada => `
                    <th class="pda-col-llamada">
                        ${escaparHtmlPda(
                    llamada.ref
                )}
                    </th>
                `
            )
            .join('');


    // ==================================================
    // TABLA DE EVALUACIONES
    // ==================================================

    const llamadasHtml =
        llamadas
            .map(
                llamada => `
                    <tr>
                        <td class="pda-centro pda-ref">
                            ${escaparHtmlPda(
                    llamada.ref
                )}
                        </td>

                        <td>
                            ${escaparHtmlPda(
                    llamada.codigo_llamada ??
                    '—'
                )}
                        </td>

                        <td>
                            ${escaparHtmlPda(
                    llamada.ticket ??
                    '—'
                )}
                        </td>

                        <td>
                            ${escaparHtmlPda(
                    formatearFechaDocumentoPda(
                        llamada.fecha_auditoria,
                        true
                    )
                )}
                        </td>

                        <td class="pda-centro">
                            ${escaparHtmlPda(
                    llamada.campana ??
                    '—'
                )}
                        </td>

                        <td class="pda-derecha">
                            <strong>
                                ${formatearNumeroPda(
                    llamada.nota
                )}%
                            </strong>
                        </td>
                    </tr>
                `
            )
            .join('');


    // ==================================================
    // ESTILOS DE FRENTE
    // ==================================================

    function obtenerClaseFrentePda(
        frente
    ) {
        const valor =
            String(
                frente ?? ''
            )
                .trim()
                .toUpperCase();


        if (
            valor.includes(
                'ECUF'
            )
        ) {
            return 'pda-frente-ecuf';
        }


        if (
            valor.includes(
                'ECN'
            )
        ) {
            return 'pda-frente-ecn';
        }


        if (
            valor.includes(
                'ENC'
            )
        ) {
            return 'pda-frente-enc';
        }


        return 'pda-frente-default';
    }


    // ==================================================
    // MATRIZ SUBMOTIVO × LLAMADA
    // ==================================================

    const matrizHtml =
        matriz
            .map(
                item => {

                    const claseFrente =
                        obtenerClaseFrentePda(
                            item.frente
                        );


                    const marcas =
                        llamadas
                            .map(
                                llamada => {

                                    const existe =
                                        Array.isArray(
                                            item.llamadas
                                        ) &&
                                        item.llamadas.includes(
                                            llamada.ref
                                        );


                                    return `
                                        <td class="pda-marca">
                                            ${existe
                                            ? '●'
                                            : '—'
                                        }
                                        </td>
                                    `;
                                }
                            )
                            .join('');


                    return `
                        <tr>
                            <td>
                                <span
                                    class="
                                        pda-frente-badge
                                        ${claseFrente}
                                    "
                                >
                                    ${escaparHtmlPda(
                        item.frente
                    )}
                                </span>
                            </td>

                            <td>
                                ${escaparHtmlPda(
                        item.atributo
                    )}
                            </td>

                            <td class="pda-submotivo">
                                ${escaparHtmlPda(
                        item.criterio
                    )}
                            </td>

                            <td class="pda-centro">
                                <span class="pda-tipo-badge">
                                    ${escaparHtmlPda(
                        item
                            .clasificacion_pda_codigo ??
                        item
                            .tipo_accion ??
                        '—'
                    )}
                                </span>
                            </td>

                            ${marcas}

                            <td class="pda-centro pda-recurrencia">
                                <strong>
                                    ${item.total_evaluaciones}/
                                    ${item.total_llamadas}
                                </strong>

                                <div>
                                    ${item.recurrencia_pct}%
                                </div>
                            </td>
                        </tr>
                    `;
                }
            )
            .join('');


    // ==================================================
// PLAN DE DESARROLLO
//
// Fuente:
// matrizHallazgosDocumento
//
// Estructura:
// Tipo PDA
//   -> Frente
//      -> Atributo
//         -> Submotivo
// ==================================================


function obtenerTipoPlanPda(
    item
) {
    return String(
        item?.clasificacion_pda_codigo ??
        item?.tipo_accion ??
        item?.clasificacion ??
        'SIN CLASIFICAR'
    )
        .trim()
        .toUpperCase();
}


function obtenerNombreTipoPlanPda(
    item
) {
    return (
        item?.clasificacion_pda_nombre ??
        obtenerTipoPlanPda(
            item
        )
    );
}


function obtenerDescripcionTipoPlanPda(
    tipo
) {
    const codigo =
        String(
            tipo ?? ''
        )
            .trim()
            .toUpperCase();


    if (
        codigo ===
        'HABILIDADES'
    ) {
        return (
            'Desarrollo de comunicación, ' +
            'interacción y manejo de la gestión.'
        );
    }


    if (
        codigo ===
        'PROCESO'
    ) {
        return (
            'Reforzamiento de conocimiento ' +
            'y ejecución de procedimientos.'
        );
    }


    if (
        codigo ===
        'FEEDBACK'
    ) {
        return (
            'Retroalimentación puntual ' +
            'o reforzamiento específico.'
        );
    }


    return (
        'Tratamiento definido según la ' +
        'clasificación PDA configurada.'
    );
}


function obtenerClaseTipoPlanPda(
    tipo
) {
    const codigo =
        String(
            tipo ?? ''
        )
            .trim()
            .toUpperCase();


    if (
        codigo ===
        'PROCESO'
    ) {
        return 'pda-plan-proceso';
    }


    if (
        codigo ===
        'HABILIDADES'
    ) {
        return 'pda-plan-habilidades';
    }


    if (
        codigo ===
        'FEEDBACK'
    ) {
        return 'pda-plan-feedback';
    }


    return 'pda-plan-default';
}


function agruparPlanDocumentoPda(
    items
) {
    const tipos =
        new Map();


    for (
        const item
        of Array.isArray(items)
            ? items
            : []
    ) {
        const tipoCodigo =
            obtenerTipoPlanPda(
                item
            );


        const tipoNombre =
            obtenerNombreTipoPlanPda(
                item
            );


        if (
            !tipos.has(
                tipoCodigo
            )
        ) {
            tipos.set(
                tipoCodigo,
                {
                    codigo:
                        tipoCodigo,

                    nombre:
                        tipoNombre,

                    frentes:
                        new Map()
                }
            );
        }


        const tipo =
            tipos.get(
                tipoCodigo
            );


        const frenteClave =
            String(
                item?.frente_id ??
                item?.frente ??
                'SIN_FRENTE'
            );


        if (
            !tipo.frentes.has(
                frenteClave
            )
        ) {
            tipo.frentes.set(
                frenteClave,
                {
                    frente:
                        item?.frente ??
                        'Sin frente',

                    atributos:
                        new Map()
                }
            );
        }


        const frente =
            tipo.frentes.get(
                frenteClave
            );


        const atributoClave =
            String(
                item?.atributo_id ??
                item?.atributo ??
                'SIN_ATRIBUTO'
            );


        if (
            !frente.atributos.has(
                atributoClave
            )
        ) {
            frente.atributos.set(
                atributoClave,
                {
                    atributo:
                        item?.atributo ??
                        'Sin atributo',

                    items:
                        []
                }
            );
        }


        frente
            .atributos
            .get(
                atributoClave
            )
            .items
            .push(
                item
            );
    }


    return Array
        .from(
            tipos.values()
        )
        .map(
            tipo => ({
                codigo:
                    tipo.codigo,

                nombre:
                    tipo.nombre,

                frentes:
                    Array.from(
                        tipo.frentes.values()
                    )
                        .map(
                            frente => ({
                                frente:
                                    frente.frente,

                                atributos:
                                    Array.from(
                                        frente
                                            .atributos
                                            .values()
                                    )
                            })
                        )
            })
        );
}


function generarBloquePlanPda(
    tipo
) {
    if (
        !tipo ||
        !Array.isArray(
            tipo.frentes
        ) ||
        tipo.frentes.length === 0
    ) {
        return '';
    }


    const filas =
        [];


    for (
        const frente
        of tipo.frentes
    ) {
        const atributos =
            Array.isArray(
                frente?.atributos
            )
                ? frente.atributos
                : [];


        for (
            const atributo
            of atributos
        ) {
            const items =
                Array.isArray(
                    atributo?.items
                )
                    ? atributo.items
                    : [];


            for (
                const item
                of items
            ) {
                filas.push(`
                    <tr>

                        <td
                            class="
                                pda-plan-col-frente
                            "
                        >
                            ${escaparHtmlPda(
                                frente?.frente ??
                                'Sin frente'
                            )}
                        </td>


                        <td
                            class="
                                pda-plan-col-atributo
                            "
                        >
                            ${escaparHtmlPda(
                                atributo?.atributo ??
                                'Sin atributo'
                            )}
                        </td>


                        <td
                            class="
                                pda-plan-col-submotivo
                            "
                        >
                            ${escaparHtmlPda(
                                item?.criterio ??
                                item?.submotivo ??
                                'Sin submotivo'
                            )}
                        </td>


                        <td
                            class="
                                pda-plan-col-recurrencia
                                pda-centro
                            "
                        >
                            <strong>
                                ${Number(
                                    item?.total_evaluaciones ??
                                    0
                                )}/
                                ${Number(
                                    item?.total_llamadas ??
                                    0
                                )}
                            </strong>
                        </td>


                        <td
                            class="
                                pda-plan-col-llamadas
                            "
                        >
                            ${escaparHtmlPda(
                                (
                                    Array.isArray(
                                        item?.llamadas
                                    )
                                        ? item.llamadas
                                        : []
                                ).join(
                                    ', '
                                )
                            )}
                        </td>

                    </tr>
                `);
            }
        }
    }


    if (
        filas.length === 0
    ) {
        return '';
    }


    const claseTipo =
        obtenerClaseTipoPlanPda(
            tipo.codigo
        );


    const descripcion =
        obtenerDescripcionTipoPlanPda(
            tipo.codigo
        );


    return `
        <div
            class="
                pda-plan-bloque
                pda-no-cortar
                ${claseTipo}
            "
        >

            <div class="pda-plan-header">

                <strong>
                    ${escaparHtmlPda(
                        tipo.nombre ??
                        tipo.codigo
                    )}
                </strong>

                <div>
                    ${escaparHtmlPda(
                        descripcion
                    )}
                </div>

            </div>


            <table class="pda-plan-tabla">

                <colgroup>

                    <col
                        class="
                            pda-plan-colgroup-frente
                        "
                    >

                    <col
                        class="
                            pda-plan-colgroup-atributo
                        "
                    >

                    <col
                        class="
                            pda-plan-colgroup-submotivo
                        "
                    >

                    <col
                        class="
                            pda-plan-colgroup-recurrencia
                        "
                    >

                    <col
                        class="
                            pda-plan-colgroup-llamadas
                        "
                    >

                </colgroup>


                <thead>
                    <tr>

                        <th>
                            Frente
                        </th>

                        <th>
                            Atributo
                        </th>

                        <th>
                            Submotivo
                        </th>

                        <th>
                            Recurrencia
                        </th>

                        <th>
                            Llamadas
                        </th>

                    </tr>
                </thead>


                <tbody>
                    ${filas.join('')}
                </tbody>

            </table>

        </div>
    `;
}


const estructuraPlanPda =
    agruparPlanDocumentoPda(
        matriz
    );


const planHtml =
    estructuraPlanPda
        .map(
            tipo =>
                generarBloquePlanPda(
                    tipo
                )
        )
        .filter(Boolean)
        .join('');


    // ==================================================
    // DOCUMENTO
    // ==================================================

    return `
        <div class="pda-documento-raiz">

            <style>

                /* ======================================
                   DOCUMENTO BASE
                   ====================================== */

                .pda-documento-raiz {
                    max-width:
                        1180px;

                    margin:
                        0 auto;

                    background:
                        #FFFFFF;

                    color:
                        #1D2939;

                    font-family:
                        Arial,
                        Helvetica,
                        sans-serif;

                    line-height:
                        1.4;
                }


                .pda-documento {
                    width:
                        100%;
                }


                .pda-documento * {
                    box-sizing:
                        border-box;
                }


                /* ======================================
                   CABECERA CORPORATIVA
                   ====================================== */

                .pda-cabecera {
                    background:
                        #101828;

                    color:
                        #FFFFFF;

                    padding:
                        18px 22px;

                    border-radius:
                        10px 10px 0 0;
                }


                .pda-cabecera-superior {
                    display:
                        flex;

                    justify-content:
                        space-between;

                    align-items:
                        flex-start;

                    gap:
                        20px;
                }


                .pda-meca {
                    font-size:
                        11px;

                    letter-spacing:
                        .08em;

                    opacity:
                        .75;
                }


                .pda-titulo {
                    margin-top:
                        3px;

                    font-size:
                        18px;

                    font-weight:
                        700;
                }


                .pda-movistar {
                    font-size:
                        18px;

                    font-weight:
                        700;

                    text-align:
                        right;

                    letter-spacing:
                        .04em;
                }


                .pda-gestor {
                    margin-top:
                        16px;

                    padding-top:
                        14px;

                    border-top:
                        1px solid
                        rgba(
                            255,
                            255,
                            255,
                            .20
                        );
                }


                .pda-gestor-nombre {
                    font-size:
                        23px;

                    font-weight:
                        700;
                }


                .pda-documento-info {
                    margin-top:
                        5px;

                    font-size:
                        11px;

                    opacity:
                        .78;
                }


                /* ======================================
                   RESUMEN
                   ====================================== */

                .pda-resumen {
                    padding:
                        15px 18px;

                    border:
                        1px solid
                        #D0D5DD;

                    border-top:
                        0;
                }


                .pda-resumen-grid {
                    display:
                        grid;

                    grid-template-columns:
                        repeat(
                            4,
                            1fr
                        );

                    gap:
                        10px;
                }


                .pda-label {
                    color:
                        #667085;

                    font-size:
                        10px;

                    margin-bottom:
                        2px;
                }


                .pda-valor {
                    font-size:
                        12px;

                    font-weight:
                        700;
                }


                /* ======================================
                   SECCIONES
                   ====================================== */

                .pda-plan-tabla {
                    width: 100%;
                    table-layout: fixed;
                    border-collapse: collapse;
                }

                .pda-plan-colgroup-frente {
                    width: 18%;
                }

                .pda-plan-colgroup-atributo {
                    width: 22%;
                }

                .pda-plan-colgroup-submotivo {
                    width: 31%;
                }

                .pda-plan-colgroup-recurrencia {
                    width: 12%;
                }

                .pda-plan-colgroup-llamadas {
                    width: 17%;
                }

                .pda-plan-tabla th,
                .pda-plan-tabla td {
                    vertical-align: top;
                    overflow-wrap: anywhere;
                }

                .pda-plan-col-recurrencia {
                    text-align: center;
                    white-space: nowrap;
                }


                /* PROCESO */

                .pda-plan-proceso .pda-plan-header {
                    background: #EAF4FF;
                    border-bottom-color: #84CAFF;
                }

                .pda-plan-proceso .pda-plan-header strong {
                    color: #175CD3;
                }


                /* HABILIDADES BLANDAS */

                .pda-plan-habilidades .pda-plan-header {
                    background: #F4EBFF;
                    border-bottom-color: #D6BBFB;
                }

                .pda-plan-habilidades .pda-plan-header strong {
                    color: #6941C6;
                }


                /* FEEDBACK */

                .pda-plan-feedback .pda-plan-header {
                    background: #ECFDF3;
                    border-bottom-color: #A6F4C5;
                }

                .pda-plan-feedback .pda-plan-header strong {
                    color: #067647;
                }


                /* OTROS TIPOS FUTUROS */

                .pda-plan-default .pda-plan-header {
                    background: #F2F4F7;
                    border-bottom-color: #D0D5DD;
                }

                .pda-plan-default .pda-plan-header strong {
                    color: #344054;
                }

                .pda-documento h2 {
                    margin:
                        24px 0
                        10px;

                    font-size:
                        15px;

                    color:
                        #101828;

                    page-break-after:
                        avoid;

                    break-after:
                        avoid;
                }


                .pda-ayuda {
                    margin-bottom:
                        8px;

                    color:
                        #667085;

                    font-size:
                        10px;
                }


                /* ======================================
                   INDICADORES
                   ====================================== */

                .pda-indicadores {
                    display:
                        grid;

                    grid-template-columns:
                        repeat(
                            4,
                            1fr
                        );

                    gap:
                        9px;
                }


                .pda-indicador {
                    padding:
                        10px;

                    border:
                        1px solid
                        #D0D5DD;

                    border-radius:
                        7px;

                    text-align:
                        center;

                    background:
                        #FFFFFF;
                }


                .pda-indicador-numero {
                    font-size:
                        21px;

                    font-weight:
                        700;
                }


                .pda-indicador-label {
                    color:
                        #667085;

                    font-size:
                        10px;
                }


                /* ======================================
                   TABLAS
                   ====================================== */

                .pda-documento table {
                    width:
                        100%;

                    border-collapse:
                        collapse;

                    background:
                        #FFFFFF;
                }


                .pda-documento th {
                    padding:
                        7px 8px;

                    border:
                        1px solid
                        #D0D5DD;

                    background:
                        #F2F4F7;

                    color:
                        #344054;

                    font-size:
                        10px;

                    text-align:
                        left;
                }


                .pda-documento td {
                    padding:
                        7px 8px;

                    border:
                        1px solid
                        #EAECF0;

                    font-size:
                        10px;

                    vertical-align:
                        middle;
                }


                .pda-centro {
                    text-align:
                        center;
                }


                .pda-derecha {
                    text-align:
                        right;
                }


                .pda-ref {
                    font-weight:
                        700;

                    background:
                        #F9FAFB;
                }


                .pda-submotivo {
                    font-weight:
                        700;
                }


                /* ======================================
                   MATRIZ
                   ====================================== */

                .pda-matriz-contenedor {
                    width:
                        100%;

                    overflow-x:
                        auto;
                }


                .pda-matriz {
                    table-layout:
                        auto;
                }


                .pda-col-llamada {
                    min-width:
                        38px;

                    text-align:
                        center !important;
                }


                .pda-marca {
                    min-width:
                        36px;

                    text-align:
                        center;

                    font-size:
                        14px;

                    font-weight:
                        700;
                }


                .pda-recurrencia div {
                    margin-top:
                        2px;

                    color:
                        #667085;

                    font-size:
                        9px;
                }


                /* ======================================
                   COLORES DE FRENTES
                   ====================================== */

                .pda-frente-badge {
                    display:
                        inline-block;

                    padding:
                        3px 7px;

                    border:
                        1px solid;

                    border-radius:
                        10px;

                    font-size:
                        9px;

                    font-weight:
                        700;
                }


                .pda-frente-enc {
                    background:
                        #FFF8D8;

                    border-color:
                        #B58A00;

                    color:
                        #6B5200;
                }


                .pda-frente-ecuf {
                    background:
                        #FDECEC;

                    border-color:
                        #B42318;

                    color:
                        #7A271A;
                }


                .pda-frente-ecn {
                    background:
                        #FFF0E1;

                    border-color:
                        #B54708;

                    color:
                        #7A2E0E;
                }


                .pda-frente-default {
                    background:
                        #F2F4F7;

                    border-color:
                        #667085;

                    color:
                        #344054;
                }


                .pda-tipo-badge {
                    display:
                        inline-block;

                    padding:
                        3px 6px;

                    border-radius:
                        9px;

                    background:
                        #EEF2F6;

                    color:
                        #344054;

                    font-size:
                        9px;

                    font-weight:
                        700;
                }


                /* ======================================
                PLAN DE DESARROLLO
                ====================================== */

                .pda-plan-bloque {
                    margin-top:
                        15px;

                    border:
                        1px solid
                        #D0D5DD;

                    border-radius:
                        8px;

                    overflow:
                        hidden;
                }


                .pda-plan-header {
                    padding:
                        10px 13px;

                    border-bottom:
                        1px solid
                        #D0D5DD;
                }


                .pda-plan-header strong {
                    font-size:
                        11px;

                    font-weight:
                        700;
                }


                .pda-plan-header div {
                    margin-top:
                        3px;

                    font-size:
                        9px;

                    line-height:
                        1.35;
                }


                /* ======================================
                COLORES POR CLASIFICACIÓN PDA
                ====================================== */

                .pda-plan-proceso
                .pda-plan-header {
                    background:
                        #EAF4FF;

                    border-bottom-color:
                        #84CAFF;
                }


                .pda-plan-proceso
                .pda-plan-header strong {
                    color:
                        #175CD3;
                }


                .pda-plan-proceso
                .pda-plan-header div {
                    color:
                        #344054;
                }


                /* HABILIDADES BLANDAS */

                .pda-plan-habilidades
                .pda-plan-header {
                    background:
                        #F4EBFF;

                    border-bottom-color:
                        #D6BBFB;
                }


                .pda-plan-habilidades
                .pda-plan-header strong {
                    color:
                        #6941C6;
                }


                .pda-plan-habilidades
                .pda-plan-header div {
                    color:
                        #344054;
                }


                /* FEEDBACK */

                .pda-plan-feedback
                .pda-plan-header {
                    background:
                        #ECFDF3;

                    border-bottom-color:
                        #A6F4C5;
                }


                .pda-plan-feedback
                .pda-plan-header strong {
                    color:
                        #067647;
                }


                .pda-plan-feedback
                .pda-plan-header div {
                    color:
                        #344054;
                }


                /* CLASIFICACIONES FUTURAS */

                .pda-plan-default
                .pda-plan-header {
                    background:
                        #F2F4F7;

                    border-bottom-color:
                        #D0D5DD;
                }


                .pda-plan-default
                .pda-plan-header strong {
                    color:
                        #344054;
                }


                /* ======================================
                TABLA UNIFORME
                ====================================== */

                .pda-plan-tabla {
                    width:
                        100%;

                    table-layout:
                        fixed;

                    border-collapse:
                        collapse;
                }


                /*
                * Estos porcentajes son idénticos
                * para todos los bloques.
                *
                * Así Proceso, Habilidades y Feedback
                * quedan perfectamente alineados.
                */

                .pda-plan-colgroup-motivo {
                    width:
                        17%;
                }


                .pda-plan-colgroup-atributo {
                    width:
                        22%;
                }


                .pda-plan-colgroup-submotivo {
                    width:
                        31%;
                }


                .pda-plan-colgroup-recurrencia {
                    width:
                        12%;
                }


                .pda-plan-colgroup-llamadas {
                    width:
                        18%;
                }


                .pda-plan-tabla th,
                .pda-plan-tabla td {
                    vertical-align:
                        top;

                    overflow-wrap:
                        anywhere;

                    word-break:
                        normal;
                }


                .pda-plan-tabla th {
                    white-space:
                        nowrap;
                }


                .pda-plan-col-recurrencia {
                    text-align:
                        center;

                    white-space:
                        nowrap;
                }


                .pda-plan-col-llamadas {
                    font-size:
                        9px;
                }


                /* ======================================
                   CIERRE
                   ====================================== */

                .pda-pie {
                    margin-top:
                        24px;

                    padding-top:
                        10px;

                    border-top:
                        1px solid
                        #EAECF0;

                    color:
                        #98A2B3;

                    font-size:
                        9px;

                    text-align:
                        center;
                }


                /* ======================================
                   IMPRESIÓN A4
                   ====================================== */

                @page {
                    size:
                        A4
                        ${documentoHorizontal
            ? 'landscape'
            : 'portrait'
        };

                    margin:
                        10mm
                        9mm
                        11mm
                        9mm;
                }


                @media print {

                    html,
                    body {
                        margin:
                            0 !important;

                        padding:
                            0 !important;

                        width:
                            100% !important;

                        background:
                            #FFFFFF !important;

                        -webkit-print-color-adjust:
                            exact !important;

                        print-color-adjust:
                            exact !important;
                    }


                    .pda-documento-raiz {
                        width:
                            100% !important;

                        max-width:
                            none !important;

                        margin:
                            0 !important;
                    }


                    .pda-documento {
                        width:
                            100% !important;

                        font-size:
                            9px !important;
                    }


                    .pda-documento * {
                        -webkit-print-color-adjust:
                            exact !important;

                        print-color-adjust:
                            exact !important;
                    }


                    .pda-documento h2 {
                        margin:
                            14px 0
                            6px !important;

                        font-size:
                            12px !important;
                    }


                    .pda-documento table {
                        width:
                            100% !important;

                        border-collapse:
                            collapse !important;

                        page-break-inside:
                            auto !important;

                        break-inside:
                            auto !important;
                    }


                    .pda-documento thead {
                        display:
                            table-header-group !important;
                    }


                    .pda-documento tr {
                        page-break-inside:
                            avoid !important;

                        break-inside:
                            avoid !important;
                    }


                    .pda-documento th,
                    .pda-documento td {
                        padding:
                            3px 4px !important;

                        font-size:
                            7.5px !important;

                        line-height:
                            1.2 !important;

                        overflow-wrap:
                            anywhere !important;

                        word-break:
                            normal !important;
                    }


                    .pda-matriz th,
                    .pda-matriz td {
                        padding:
                            2.5px 3px !important;

                        font-size:
                            7px !important;
                    }


                    .pda-col-llamada,
                    .pda-marca {
                        min-width:
                            22px !important;
                    }


                    .pda-frente-badge,
                    .pda-tipo-badge {
                        padding:
                            2px 4px !important;

                        font-size:
                            6.5px !important;
                    }


                    .pda-cabecera {
                        padding:
                            12px 14px !important;
                    }


                    .pda-gestor-nombre {
                        font-size:
                            18px !important;
                    }


                    .pda-indicador-numero {
                        font-size:
                            17px !important;
                    }


                    .pda-plan-bloque,
                    .pda-no-cortar,
                    .pda-cabecera,
                    .pda-resumen {
                        page-break-inside:
                            avoid !important;

                        break-inside:
                            avoid !important;
                    }
                }

            </style>


            <div class="pda-documento">

                <!-- ===================================
                     CABECERA
                     =================================== -->

                <div
                    class="
                        pda-cabecera
                        pda-no-cortar
                    "
                >

                    <div
                        class="
                            pda-cabecera-superior
                        "
                    >

                        <div>
                            <div class="pda-meca">
                                MECA
                            </div>

                            <div class="pda-titulo">
                                Plan de Desarrollo
                                y Acompañamiento
                            </div>
                        </div>


                        <div class="pda-movistar">
                            MOVISTAR
                        </div>

                    </div>


                    <div class="pda-gestor">

                        <div
                            class="
                                pda-gestor-nombre
                            "
                        >
                            ${escaparHtmlPda(
            agente
        )}
                        </div>

                        <div
                            class="
                                pda-documento-info
                            "
                        >
                            Documento:
                            ${escaparHtmlPda(
            documentoId
        )}

                            · Emitido:
                            ${escaparHtmlPda(
            fechaEmision
        )}
                        </div>

                    </div>

                </div>


                <!-- ===================================
                     RESUMEN
                     =================================== -->

                <div
                    class="
                        pda-resumen
                        pda-no-cortar
                    "
                >

                    <div class="pda-resumen-grid">

                        <div>
                            <div class="pda-label">
                                Ciclo basal
                            </div>

                            <div class="pda-valor">
                                #${escaparHtmlPda(
            ciclo.numero ??
            '—'
        )}
                            </div>
                        </div>


                        <div>
                            <div class="pda-label">
                                Periodo
                            </div>

                            <div class="pda-valor">
                                ${escaparHtmlPda(
            formatearPeriodoDocumentoPda(
                ciclo.fechaInicio ??
                ciclo.fecha_inicio,

                ciclo.fechaFin ??
                ciclo.fecha_fin
            )
        )}
                            </div>
                        </div>


                        <div>
                            <div class="pda-label">
                                Resultado basal
                            </div>

                            <div class="pda-valor">
                                ${formatearNumeroPda(
            ciclo.promedio
        )}%
                                ·
                                ${escaparHtmlPda(
            ciclo.cuartil ??
            '—'
        )}
                            </div>
                        </div>


                        <div>
                            <div class="pda-label">
                                Evaluaciones
                            </div>

                            <div class="pda-valor">
                                ${llamadas.length}
                            </div>
                        </div>

                    </div>

                </div>


                <!-- ===================================
                     CONTEXTO
                     =================================== -->

                <h2>
                    1. Contexto de evaluación
                </h2>

                <table class="pda-no-cortar">
                    <tbody>

                        <tr>
                            <th>
                                Quiebre
                            </th>

                            <td>
                                ${escaparHtmlPda(
            nombreQuiebre
        )}
                            </td>

                            <th>
                                Campaña(s)
                            </th>

                            <td>
                                ${escaparHtmlPda(
            nombreCampana
        )}
                            </td>
                        </tr>


                        <tr>
                            <th>
                                Matriz
                            </th>

                            <td>
                                ${escaparHtmlPda(
            nombreMatriz
        )}
                            </td>

                            <th>
                                Versión
                            </th>

                            <td>
                                ${escaparHtmlPda(
            versionTexto
        )}
                            </td>
                        </tr>

                    </tbody>
                </table>


                <!-- ===================================
                     DIAGNÓSTICO
                     =================================== -->

                <h2>
                    2. Diagnóstico del ciclo basal
                </h2>


                <div class="pda-indicadores">

                    <div class="pda-indicador">
                        <div
                            class="
                                pda-indicador-numero
                            "
                        >
                            ${totalIncumplimientos}
                        </div>

                        <div
                            class="
                                pda-indicador-label
                            "
                        >
                            Incumplimientos
                        </div>
                    </div>


                    <div class="pda-indicador">
                        <div
                            class="
                                pda-indicador-numero
                            "
                        >
                            ${totalFrentes}
                        </div>

                        <div
                            class="
                                pda-indicador-label
                            "
                        >
                            Frentes
                        </div>
                    </div>


                    <div class="pda-indicador">
                        <div
                            class="
                                pda-indicador-numero
                            "
                        >
                            ${totalAtributos}
                        </div>

                        <div
                            class="
                                pda-indicador-label
                            "
                        >
                            Atributos
                        </div>
                    </div>


                    <div class="pda-indicador">
                        <div
                            class="
                                pda-indicador-numero
                            "
                        >
                            ${totalSubmotivos}
                        </div>

                        <div
                            class="
                                pda-indicador-label
                            "
                        >
                            Submotivos
                        </div>
                    </div>

                </div>


                <!-- ===================================
                     EVALUACIONES
                     =================================== -->

                <h2>
                    3. Evaluaciones consideradas
                </h2>

                <table>
                    <thead>
                        <tr>
                            <th>
                                Ref.
                            </th>

                            <th>
                                Código de llamada
                            </th>

                            <th>
                                Ticket
                            </th>

                            <th>
                                Fecha de auditoría
                            </th>

                            <th>
                                Campaña(s)
                            </th>

                            <th class="pda-derecha">
                                Nota
                            </th>
                        </tr>
                    </thead>

                    <tbody>
                        ${llamadasHtml}
                    </tbody>
                </table>


                <!-- ===================================
                     MATRIZ
                     =================================== -->

                <h2>
                    4. Matriz de hallazgos
                </h2>

                <div class="pda-ayuda">
                    Cada punto identifica la llamada
                    donde se presentó el incumplimiento.
                </div>


                <div class="pda-matriz-contenedor">

                    <table class="pda-matriz">

                        <thead>
                            <tr>
                                <th>
                                    Frente
                                </th>

                                <th>
                                    Atributo
                                </th>

                                <th>
                                    Submotivo
                                </th>

                                <th>
                                    Tipo PDA
                                </th>

                                ${columnasLlamadasHtml}

                                <th>
                                    Recurrencia
                                </th>
                            </tr>
                        </thead>

                        <tbody>
                            ${matrizHtml}
                        </tbody>

                    </table>

                </div>


                <!-- ===================================
                     PLAN DE DESARROLLO
                     =================================== -->

                <h2>
                    5. Plan de desarrollo
                </h2>

                <div class="pda-ayuda">
                    Los submotivos se organizan
                    según la clasificación configurada
                    en la versión de matriz utilizada
                    en las evaluaciones.
                </div>


                ${planHtml}


                <!-- ===================================
                     PIE
                     =================================== -->

                <div class="pda-pie">

                    Documento generado automáticamente
                    por MECA.

                    Corresponde al diagnóstico inicial
                    del ciclo basal.

                </div>

            </div>

        </div>
    `;
}


// ======================================================
// PDA - DOCUMENTO TEXTO MULTICONTEXTO
// ======================================================

function generarDocumentoTextoPda(
    data
) {
    const {
        documentoId,
        fechaEmision,
        agente,
        ciclo,
        contexto,
        resumenHallazgos,
        evaluaciones = []
    } = data;


    const lineas = [];


    // ==================================================
    // HELPERS LOCALES
    // ==================================================

    const valorSeguro = (
        valor,
        fallback = '—'
    ) => {
        if (
            valor === null ||
            valor === undefined ||
            valor === ''
        ) {
            return fallback;
        }

        return String(
            valor
        ).trim() || fallback;
    };


    const formatearFechaDocumento = (
        valor,
        incluirHora = false
    ) => {
        if (!valor) {
            return '—';
        }


        /*
         * Si ya viene como:
         * DD/MM/YYYY
         * DD/MM/YYYY HH:mm
         */
        const texto =
            String(
                valor
            ).trim();


        const formatoLatino =
            texto.match(
                /^(\d{2})\/(\d{2})\/(\d{4})(?:[ T](\d{2}):(\d{2}))?/
            );


        if (formatoLatino) {
            if (
                incluirHora &&
                formatoLatino[4] &&
                formatoLatino[5]
            ) {
                return (
                    `${formatoLatino[1]}/` +
                    `${formatoLatino[2]}/` +
                    `${formatoLatino[3]} ` +
                    `${formatoLatino[4]}:` +
                    `${formatoLatino[5]}`
                );
            }


            return (
                `${formatoLatino[1]}/` +
                `${formatoLatino[2]}/` +
                `${formatoLatino[3]}`
            );
        }


        /*
         * ISO:
         * YYYY-MM-DD...
         *
         * Se procesa manualmente para evitar
         * desplazamientos por zona horaria cuando
         * sólo interesa la fecha.
         */
        const formatoIso =
            texto.match(
                /^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/
            );


        if (formatoIso) {
            const fecha =
                `${formatoIso[3]}/` +
                `${formatoIso[2]}/` +
                `${formatoIso[1]}`;


            if (
                incluirHora &&
                formatoIso[4] &&
                formatoIso[5]
            ) {
                return (
                    `${fecha} ` +
                    `${formatoIso[4]}:` +
                    `${formatoIso[5]}`
                );
            }


            return fecha;
        }


        return texto;
    };


    const obtenerCodigoLlamada = (
        evaluacion
    ) => {
        return valorSeguro(
            evaluacion?.codigo_llamada ??
            evaluacion?.codigoLlamada ??
            evaluacion?.codigo ??
            evaluacion?.call_id ??
            evaluacion?.callId ??
            null
        );
    };


    const obtenerTicket = (
        evaluacion
    ) => {
        return valorSeguro(
            evaluacion?.ticketPSI ??
            evaluacion?.ticket_psi ??
            evaluacion?.ticket ??
            null
        );
    };


    const obtenerFechaEvaluacion = (
        evaluacion
    ) => {
        const fecha =
            evaluacion?.fechaOriginal ??
            evaluacion?.fecha ??
            evaluacion?.fecha_formateada ??
            evaluacion?.fecha_registro ??
            null;


        return formatearFechaDocumento(
            fecha,
            true
        );
    };


    const obtenerNotaEvaluacion = (
        evaluacion
    ) => {
        const nota =
            evaluacion?.nota ??
            evaluacion?.puntaje ??
            evaluacion?.score ??
            evaluacion?.porcentaje ??
            null;


        if (
            nota === null ||
            nota === undefined ||
            nota === ''
        ) {
            return '—';
        }


        return (
            `${formatearNumeroPda(
                nota
            )}%`
        );
    };


    const obtenerEvaluacionesCriterio = (
        criterio
    ) => {
        const posibles =
            [
                criterio?.evaluaciones,
                criterio?.evaluacion_ids,
                criterio?.evaluaciones_ids,
                criterio?.detalle_evaluaciones
            ];


        for (
            const lista
            of posibles
        ) {
            if (
                Array.isArray(
                    lista
                )
            ) {
                return lista;
            }
        }


        return [];
    };


    // ==================================================
    // ENCABEZADO
    // ==================================================

    lineas.push(
        'PLAN DE DESARROLLO Y ACOMPAÑAMIENTO'
    );

    lineas.push(
        '===================================='
    );

    lineas.push(
        `Documento: ${valorSeguro(
            documentoId
        )}`
    );

    lineas.push(
        `Fecha de emisión: ${formatearFechaDocumento(
            fechaEmision
        )}`
    );

    lineas.push(
        ''
    );


    // ==================================================
    // DATOS DEL CICLO
    // ==================================================

    lineas.push(
        'DATOS DEL CICLO BASAL'
    );

    lineas.push(
        '---------------------'
    );

    lineas.push(
        `Gestor: ${valorSeguro(
            agente
        )}`
    );

    lineas.push(
        `Ciclo basal: #${valorSeguro(
            ciclo?.numero
        )}`
    );

    lineas.push(
        `Periodo: ${formatearFechaDocumento(
            ciclo?.fechaInicio
        )} - ${formatearFechaDocumento(
            ciclo?.fechaFin
        )}`
    );

    lineas.push(
        `Resultado basal: ${formatearNumeroPda(
            ciclo?.promedio
        )}%`
    );

    lineas.push(
        `Cuartil: ${valorSeguro(
            ciclo?.cuartil
        )}`
    );

    lineas.push(
        ''
    );


    // ==================================================
    // 1. CONTEXTO DE EVALUACIÓN
    // ==================================================

    lineas.push(
        '1. CONTEXTO DE EVALUACIÓN'
    );

    lineas.push(
        '-------------------------'
    );


    lineas.push(
        `Quiebre: ${obtenerNombreContextoPda(
            contexto?.quiebre,
            '—'
        )}`
    );


    /*
     * Puede existir más de una campaña
     * dentro del mismo ciclo basal.
     */
    let campanasTexto =
        'Sin campaña';


    if (
        Array.isArray(
            contexto?.campanas
        ) &&
        contexto.campanas.length > 0
    ) {
        campanasTexto =
            contexto.campanas
                .map(
                    (campana) =>
                        obtenerNombreContextoPda(
                            campana,
                            '—'
                        )
                )
                .filter(
                    Boolean
                )
                .join(
                    ' / '
                );
    } else if (
        contexto?.campana
    ) {
        campanasTexto =
            obtenerNombreContextoPda(
                contexto.campana,
                '—'
            );
    }


    lineas.push(
        `Campaña(s): ${campanasTexto}`
    );


    lineas.push(
        `Matriz: ${obtenerNombreContextoPda(
            contexto?.matriz,
            contexto?.matriz_id
                ? `Matriz ${contexto.matriz_id}`
                : '—'
        )}`
    );


    lineas.push(
        `Versión: ${valorSeguro(
            contexto?.versionMatriz?.version ??
            contexto?.versionMatriz?.nombre ??
            contexto?.version_matriz_id
        )}`
    );


    lineas.push(
        ''
    );


    // ==================================================
    // 2. RESUMEN DEL DIAGNÓSTICO
    // ==================================================

    lineas.push(
        '2. RESUMEN DEL DIAGNÓSTICO'
    );

    lineas.push(
        '-------------------------'
    );


    lineas.push(
        `Incumplimientos detectados: ${resumenHallazgos?.total_hallazgos ?? 0
        }`
    );

    lineas.push(
        `Frentes afectados: ${resumenHallazgos?.total_frentes ?? 0
        }`
    );

    lineas.push(
        `Atributos afectados: ${resumenHallazgos?.total_atributos ?? 0
        }`
    );

    lineas.push(
        `Submotivos afectados: ${resumenHallazgos?.total_criterios ?? 0
        }`
    );


    lineas.push(
        ''
    );


    // ==================================================
    // 3. EVALUACIONES CONSIDERADAS
    // ==================================================

    lineas.push(
        '3. EVALUACIONES CONSIDERADAS'
    );

    lineas.push(
        '---------------------------'
    );


    if (
        !Array.isArray(
            evaluaciones
        ) ||
        evaluaciones.length === 0
    ) {
        lineas.push(
            'No se encontraron evaluaciones asociadas al ciclo.'
        );
    } else {
        evaluaciones.forEach(
            (
                evaluacion,
                index
            ) => {
                lineas.push(
                    `L${index + 1} | ` +
                    `Código: ${obtenerCodigoLlamada(
                        evaluacion
                    )} | ` +
                    `Ticket: ${obtenerTicket(
                        evaluacion
                    )} | ` +
                    `Fecha: ${obtenerFechaEvaluacion(
                        evaluacion
                    )} | ` +
                    `Nota: ${obtenerNotaEvaluacion(
                        evaluacion
                    )}`
                );
            }
        );
    }


    lineas.push(
        ''
    );


    // ==================================================
    // 4. MATRIZ DE SUBMOTIVOS IDENTIFICADOS
    // ==================================================

    lineas.push(
        '4. MATRIZ DE SUBMOTIVOS IDENTIFICADOS'
    );

    lineas.push(
        '------------------------------------'
    );


    const frentes =
        Array.isArray(
            resumenHallazgos?.frentes
        )
            ? resumenHallazgos.frentes
            : [];


    if (
        frentes.length === 0
    ) {
        lineas.push(
            'No se identificaron incumplimientos.'
        );
    }


    for (
        const frente
        of frentes
    ) {
        lineas.push(
            ''
        );

        lineas.push(
            `[${valorSeguro(
                frente?.frente
            )}]`
        );


        const atributos =
            Array.isArray(
                frente?.atributos
            )
                ? frente.atributos
                : [];


        for (
            const atributo
            of atributos
        ) {
            lineas.push(
                `  ${valorSeguro(
                    atributo?.atributo
                )}`
            );


            const criterios =
                Array.isArray(
                    atributo?.criterios
                )
                    ? atributo.criterios
                    : [];


            for (
                const criterio
                of criterios
            ) {
                const evaluacionesCriterio =
                    obtenerEvaluacionesCriterio(
                        criterio
                    );


                const referencias =
                    [];


                for (
                    const referencia
                    of evaluacionesCriterio
                ) {
                    /*
                     * La referencia puede ser:
                     * - ID
                     * - objeto evaluación
                     */
                    const idReferencia =
                        typeof referencia ===
                            'object'
                            ? (
                                referencia?.id ??
                                referencia?.evaluacion_id
                            )
                            : referencia;


                    const posicion =
                        evaluaciones.findIndex(
                            (evaluacion) =>
                                String(
                                    evaluacion?.id ??
                                    evaluacion?.evaluacion_id ??
                                    ''
                                ) ===
                                String(
                                    idReferencia ??
                                    ''
                                )
                        );


                    if (
                        posicion >= 0
                    ) {
                        referencias.push(
                            `L${posicion + 1}`
                        );
                    }
                }


                const llamadasTexto =
                    referencias.length > 0
                        ? [
                            ...new Set(
                                referencias
                            )
                        ].join(
                            ', '
                        )
                        : '—';


                lineas.push(
                    `    - ${valorSeguro(
                        criterio?.criterio
                    )}`
                );

                lineas.push(
                    `      Incumplimientos: ${criterio?.total ?? 0
                    }`
                );

                lineas.push(
                    `      Evaluaciones afectadas: ${criterio?.total_evaluaciones ?? 0
                    }`
                );

                lineas.push(
                    `      Llamadas: ${llamadasTexto}`
                );


                const clasificacion =
                    criterio?.clasificacion_pda_codigo ??
                    criterio?.clasificacion ??
                    criterio?.tipo_accion ??
                    null;


                if (
                    clasificacion
                ) {
                    lineas.push(
                        `      Clasificación PDA: ${valorSeguro(
                            clasificacion
                        )
                        }`
                    );
                }
            }
        }
    }


    lineas.push(
        ''
    );


    // ==================================================
    // 5. LECTURA DEL DIAGNÓSTICO
    // ==================================================

    lineas.push(
        '5. LECTURA DEL DIAGNÓSTICO'
    );

    lineas.push(
        '-------------------------'
    );


    /*
     * Construimos una lectura resumida
     * de recurrencia por submotivo.
     */
    const recurrencias =
        [];


    for (
        const frente
        of frentes
    ) {
        const atributos =
            Array.isArray(
                frente?.atributos
            )
                ? frente.atributos
                : [];


        for (
            const atributo
            of atributos
        ) {
            const criterios =
                Array.isArray(
                    atributo?.criterios
                )
                    ? atributo.criterios
                    : [];


            for (
                const criterio
                of criterios
            ) {
                recurrencias.push(
                    {
                        frente:
                            frente?.frente ??
                            'Sin frente',

                        atributo:
                            atributo?.atributo ??
                            'Sin atributo',

                        criterio:
                            criterio?.criterio ??
                            'Sin submotivo',

                        total:
                            Number(
                                criterio?.total ??
                                0
                            ),

                        evaluaciones:
                            Number(
                                criterio?.total_evaluaciones ??
                                0
                            )
                    }
                );
            }
        }
    }


    recurrencias.sort(
        (
            a,
            b
        ) =>
            b.total - a.total
    );


    if (
        recurrencias.length === 0
    ) {
        lineas.push(
            'No existen submotivos incumplidos para analizar.'
        );
    } else {
        recurrencias.forEach(
            (
                item,
                index
            ) => {
                lineas.push(
                    `${index + 1}. ` +
                    `${item.criterio} | ` +
                    `${item.atributo} | ` +
                    `${item.frente} | ` +
                    `${item.total} incumplimiento(s) en ` +
                    `${item.evaluaciones} evaluación(es)`
                );
            }
        );
    }


    lineas.push(
        ''
    );


    // ==================================================
    // CIERRE
    // ==================================================

    lineas.push(
        '--------------------------------------------------'
    );

    lineas.push(
        'Documento generado por MECA - Gestión de PDA'
    );

    lineas.push(
        '--------------------------------------------------'
    );


    return lineas.join(
        '\n'
    );
}

// ======================================================
// PDA - CREACIÓN COMPLETA DESDE CICLO BASAL
// ======================================================

function normalizarFechaSqlPda(
    valor
) {
    if (!valor) {
        return null;
    }


    if (
        valor instanceof Date &&
        !Number.isNaN(
            valor.getTime()
        )
    ) {
        const anio =
            valor.getFullYear();

        const mes =
            String(
                valor.getMonth() + 1
            ).padStart(
                2,
                '0'
            );

        const dia =
            String(
                valor.getDate()
            ).padStart(
                2,
                '0'
            );

        return `${anio}-${mes}-${dia}`;
    }


    const texto =
        String(
            valor
        ).trim();


    /*
     * ISO / YYYY-MM-DD
     */
    const iso =
        texto.match(
            /^(\d{4})-(\d{2})-(\d{2})/
        );


    if (iso) {
        return (
            `${iso[1]}-` +
            `${iso[2]}-` +
            `${iso[3]}`
        );
    }


    /*
     * DD/MM/YYYY
     */
    const peru =
        texto.match(
            /^(\d{1,2})\/(\d{1,2})\/(\d{4})/
        );


    if (peru) {
        return (
            `${peru[3]}-` +
            `${String(peru[2]).padStart(2, '0')}-` +
            `${String(peru[1]).padStart(2, '0')}`
        );
    }


    const fecha =
        new Date(
            texto
        );


    if (
        Number.isNaN(
            fecha.getTime()
        )
    ) {
        return null;
    }


    return normalizarFechaSqlPda(
        fecha
    );
}


function obtenerElementoMapaPda(
    mapa,
    id
) {
    if (
        !mapa ||
        !id
    ) {
        return null;
    }


    if (
        mapa instanceof Map
    ) {
        return (
            mapa.get(
                Number(id)
            ) ??
            mapa.get(
                String(id)
            ) ??
            null
        );
    }


    if (
        typeof mapa ===
        'object'
    ) {
        return (
            mapa[id] ??
            mapa[String(id)] ??
            null
        );
    }


    return null;
}


function construirContextoSnapshotPda(
    contexto,
    estructura
) {
    // ==================================================
    // 1. CONTEXTO MAESTRO DEVUELTO POR BACKEND
    // ==================================================

    const quiebreEstructura =
        estructura?.quiebre ??
        estructura?.contexto?.quiebre ??
        null;


    const matrizEstructura =
        estructura?.matriz ??
        estructura?.contexto?.matriz ??
        null;


    const versionEstructura =
        estructura?.version ??
        estructura?.versionMatriz ??
        estructura?.version_matriz ??
        {};


    // ==================================================
    // 2. CAMPAÑA
    // ==================================================
    //
    // La campaña continúa utilizando el catálogo
    // porque el documento multicampaña se construye
    // posteriormente desde las evaluaciones.
    // ==================================================

    const campanaCatalogo =
        contexto?.campana_id
            ? obtenerElementoMapaPda(
                pdaMapaCampanasPorId,
                contexto.campana_id
            )
            : null;


    // ==================================================
    // 3. SNAPSHOT
    // ==================================================

    return {

        // ==============================================
        // QUIEBRE
        // ==============================================

        quiebre: {
            id:
                quiebreEstructura?.id ??
                contexto?.quiebre_id ??
                null,

            codigo:
                quiebreEstructura?.codigo ??
                contexto?.quiebre_codigo ??
                null,

            nombre:
                quiebreEstructura?.nombre ??
                contexto?.quiebre_nombre ??
                quiebreEstructura?.codigo ??
                '—'
        },


        // ==============================================
        // CAMPAÑA BASE
        // ==============================================

        campana:
            contexto?.campana_id
                ? {
                    id:
                        contexto.campana_id,

                    codigo:
                        campanaCatalogo?.codigo ??
                        contexto?.campana_codigo ??
                        null,

                    nombre:
                        campanaCatalogo?.nombre ??
                        campanaCatalogo?.descripcion ??
                        contexto?.campana_nombre ??
                        campanaCatalogo?.codigo ??
                        contexto?.campana_codigo ??
                        null
                }
                : null,


        // ==============================================
        // MATRIZ
        // ==============================================

        matriz: {
            id:
                matrizEstructura?.id ??
                contexto?.matriz_id ??
                null,

            codigo:
                matrizEstructura?.codigo ??
                contexto?.matriz_codigo ??
                null,

            nombre:
                matrizEstructura?.nombre ??
                contexto?.matriz_nombre ??
                matrizEstructura?.codigo ??
                '—'
        },


        // ==============================================
        // VERSIÓN
        // ==============================================

        versionMatriz: {
            id:
                versionEstructura?.id ??
                contexto?.version_matriz_id ??
                null,

            version:
                versionEstructura?.version ??
                contexto?.version ??
                null,

            fechaVigencia:
                versionEstructura?.fecha_vigencia ??
                versionEstructura?.fechaVigencia ??
                null
        }
    };
}

function resolverTipoPdaDesdeClasificacion(
    item
) {
    const codigo =
        String(
            item?.clasificacion_pda_codigo ??
            ''
        )
            .trim()
            .toUpperCase();


    if (codigo === 'HABILIDADES') {
        return {
            tipo: 'habilidades',

            /*
             * Contrato histórico de pda_acciones.
             */
            tipo_accion: 'habilidades',

            /*
             * Compatibilidad legacy.
             */
            clasificacion:
                'HABILIDADES BLANDAS'
        };
    }


    if (codigo === 'FEEDBACK') {
        return {
            tipo: 'feedback',

            tipo_accion: 'feedback',

            clasificacion: 'FEEDBACK'
        };
    }


    if (codigo === 'PROCESO') {
        return {
            tipo: 'proceso',

            tipo_accion: 'proceso',

            clasificacion: 'PROCESO'
        };
    }


    // ==================================================
    // FALLBACK PARA DATA HISTÓRICA
    // ==================================================

    const legacy =
        String(
            item?.clasificacion ??
            ''
        )
            .trim()
            .toUpperCase();


    if (
        legacy ===
        'HABILIDADES BLANDAS'
    ) {
        return {
            tipo: 'habilidades',
            tipo_accion: 'habilidades',
            clasificacion:
                'HABILIDADES BLANDAS'
        };
    }


    if (
        legacy ===
        'FEEDBACK'
    ) {
        return {
            tipo: 'feedback',
            tipo_accion: 'feedback',
            clasificacion: 'FEEDBACK'
        };
    }


    return {
        tipo: 'proceso',
        tipo_accion: 'proceso',
        clasificacion: 'PROCESO'
    };
}

// ======================================================
// PDA - ACCIONES
// ======================================================

function normalizarTipoAccionPda(
    clasificacion
) {
    const valor =
        String(
            clasificacion ??
            ''
        )
            .trim()
            .toUpperCase();


    if (
        valor.includes(
            'HABIL'
        )
    ) {
        return {
            tipo_accion:
                'habilidades',

            requiere_codigo:
                true
        };
    }


    if (
        valor.includes(
            'FEEDBACK'
        )
    ) {
        return {
            tipo_accion:
                'feedback',

            requiere_codigo:
                false
        };
    }


    /*
     * Compatibilidad histórica.
     *
     * PROCESO y cualquier clasificación
     * aún no tipificada usan proceso.
     */
    return {
        tipo_accion:
            'proceso',

        requiere_codigo:
            true
    };
}


function construirAccionesPda(
    hallazgos = [],
    contextoSnapshot = {}
) {
    const lista =
        Array.isArray(hallazgos)
            ? hallazgos
            : [];


    const mapa =
        new Map();


    // ======================================================
    // 1. AGRUPAR HALLAZGOS POR FRENTE / ATRIBUTO / CRITERIO
    // ======================================================

    for (const hallazgo of lista) {

        if (!hallazgo) {
            continue;
        }


        const clave = [
            hallazgo.frente_id ??
            hallazgo.frente ??
            'SIN_FRENTE',

            hallazgo.atributo_id ??
            hallazgo.atributo ??
            'SIN_ATRIBUTO',

            hallazgo.criterio_id ??
            hallazgo.criterio ??
            'SIN_CRITERIO'
        ].join('|');


        if (!mapa.has(clave)) {

            mapa.set(
                clave,
                {
                    // ==========================================
                    // CONTEXTO ESTRUCTURAL
                    // ==========================================

                    frente_id:
                        hallazgo.frente_id ??
                        null,

                    frente:
                        hallazgo.frente ??
                        'Sin frente',

                    atributo_id:
                        hallazgo.atributo_id ??
                        null,

                    atributo:
                        hallazgo.atributo ??
                        'Sin atributo',

                    criterio_id:
                        hallazgo.criterio_id ??
                        null,

                    criterio:
                        hallazgo.criterio ??
                        'Sin criterio',

                    peso:
                        Number(
                            hallazgo.peso ??
                            0
                        ) || 0,


                    // ==========================================
                    // CLASIFICACIÓN PDA NORMALIZADA
                    // ==========================================

                    clasificacion_pda_id:
                        hallazgo.clasificacion_pda_id ??
                        null,

                    clasificacion_pda_codigo:
                        hallazgo.clasificacion_pda_codigo ??
                        null,

                    clasificacion_pda_nombre:
                        hallazgo.clasificacion_pda_nombre ??
                        null,


                    // ==========================================
                    // COMPATIBILIDAD LEGACY
                    // ==========================================

                    clasificacion:
                        hallazgo.clasificacion ??
                        null,


                    // ==========================================
                    // ACUMULADORES
                    // ==========================================

                    ocurrencias:
                        0,

                    evaluaciones:
                        new Set()
                }
            );
        }


        const item =
            mapa.get(clave);


        item.ocurrencias++;


        // ======================================================
        // CONSERVAR CLASIFICACIÓN SI EL PRIMER REGISTRO
        // NO LA TRAÍA
        // ======================================================

        if (
            !item.clasificacion_pda_id &&
            hallazgo.clasificacion_pda_id
        ) {
            item.clasificacion_pda_id =
                hallazgo.clasificacion_pda_id;
        }


        if (
            !item.clasificacion_pda_codigo &&
            hallazgo.clasificacion_pda_codigo
        ) {
            item.clasificacion_pda_codigo =
                hallazgo.clasificacion_pda_codigo;
        }


        if (
            !item.clasificacion_pda_nombre &&
            hallazgo.clasificacion_pda_nombre
        ) {
            item.clasificacion_pda_nombre =
                hallazgo.clasificacion_pda_nombre;
        }


        if (
            !item.clasificacion &&
            hallazgo.clasificacion
        ) {
            item.clasificacion =
                hallazgo.clasificacion;
        }


        // ======================================================
        // EVALUACIONES RELACIONADAS
        // ======================================================

        const evaluacionId =
            normalizarIdContextoPda(
                hallazgo.evaluacion_id ??
                hallazgo.evaluacionId ??
                hallazgo.id_evaluacion
            );


        if (evaluacionId) {
            item.evaluaciones.add(
                evaluacionId
            );
        }


        /*
         * Compatibilidad por si construirHallazgosPda()
         * ya entrega una colección.
         */
        if (
            Array.isArray(
                hallazgo.evaluaciones
            )
        ) {
            for (
                const evaluacion
                of hallazgo.evaluaciones
            ) {
                const id =
                    normalizarIdContextoPda(
                        evaluacion?.id ??
                        evaluacion?.evaluacion_id ??
                        evaluacion
                    );

                if (id) {
                    item.evaluaciones.add(id);
                }
            }
        }


        if (
            hallazgo.evaluaciones
            instanceof Set
        ) {
            for (
                const evaluacionIdSet
                of hallazgo.evaluaciones
            ) {
                const id =
                    normalizarIdContextoPda(
                        evaluacionIdSet
                    );

                if (id) {
                    item.evaluaciones.add(id);
                }
            }
        }
    }


    // ======================================================
    // 2. CONSTRUIR ACCIONES PDA
    // ======================================================

    const acciones = [];


    for (
        const item
        of mapa.values()
    ) {

        const tipo =
            resolverTipoPdaDesdeClasificacion(
                item
            );


        const evaluaciones =
            Array.from(
                item.evaluaciones
            );


        /*
         * Una única evaluación puede persistirse en
         * la columna legacy evaluacion_id.
         *
         * Si existen varias, dejamos NULL porque una
         * sola FK no representa correctamente la relación.
         */
        const evaluacionId =
            evaluaciones.length === 1
                ? evaluaciones[0]
                : null;


        const accion = {

            // ==============================================
            // CAMPOS LEGACY OBLIGATORIOS
            // ==============================================

            atributo:
                item.atributo ??
                'Sin atributo',

            submotivo:
                item.criterio ??
                'Sin criterio',

            tipo_accion:
                tipo.tipo_accion,

            descripcion:
                `${item.criterio || 'Criterio'} ` +
                `presenta ${item.ocurrencias} ` +
                `incumplimiento(s) en ` +
                `${item.evaluaciones.size} ` +
                `evaluación(es).`,

            requiere_codigo:
                tipo.tipo_accion !==
                'feedback',

            codigo_gescot:
                null,

            observaciones:
                null,

            completado:
                false,


            // ==============================================
            // CONTEXTO ESTRUCTURAL
            // ==============================================

            frente_id:
                item.frente_id ??
                null,

            frente:
                item.frente ??
                'Sin frente',

            atributo_id:
                item.atributo_id ??
                null,

            criterio_id:
                item.criterio_id ??
                null,

            criterio:
                item.criterio ??
                null,


            // ==============================================
            // TRAZABILIDAD LEGACY
            // ==============================================

            evaluacion_id:
                evaluacionId,


            // ==============================================
            // CLASIFICACIÓN PDA NORMALIZADA
            // ==============================================

            clasificacion_pda_id:
                item.clasificacion_pda_id ??
                null,

            clasificacion_pda_codigo:
                item.clasificacion_pda_codigo ??
                null,

            clasificacion_pda_nombre:
                item.clasificacion_pda_nombre ??
                null,


            /*
             * Legacy temporal.
             */
            clasificacion:
                tipo.clasificacion,


            // ==============================================
            // SNAPSHOT
            // ==============================================

            contexto_snapshot:
                contextoSnapshot &&
                    typeof contextoSnapshot ===
                    'object'
                    ? {
                        ...contextoSnapshot,

                        /*
                         * Esto todavía no requiere columna
                         * adicional y preserva la trazabilidad
                         * multievaluación.
                         */
                        evaluaciones:
                            evaluaciones
                    }
                    : {
                        evaluaciones:
                            evaluaciones
                    }
        };


        acciones.push(
            accion
        );
    }


    return acciones;
}


// ======================================================
// PDA - PAYLOAD API
// ======================================================

function construirPayloadCreacionPda({
    agente,
    ciclo,
    contexto,
    contextoSnapshot,
    hallazgos,
    documentoId,
    documentoHtml,
    documentoTexto
}) {
    const hoy =
        normalizarFechaSqlPda(
            new Date()
        );


    const fechaInicio =
        normalizarFechaSqlPda(
            ciclo.fechaInicio ??
            ciclo.fecha_inicio
        );


    const fechaFin =
        normalizarFechaSqlPda(
            ciclo.fechaFin ??
            ciclo.fecha_fin
        );


    if (
        !fechaInicio ||
        !fechaFin
    ) {
        throw new Error(
            'No se pudo determinar el periodo del ciclo basal.'
        );
    }


    const fechaProxima =
        new Date();


    fechaProxima.setDate(
        fechaProxima.getDate() +
        7
    );


    const nombreCampana =
        contextoSnapshot.campana?.nombre ??
        'Sin campaña';


    return {
        cabecera: {
            agente,

            fecha_deteccion:
                hoy,

            fecha_inicio_ciclo_basal:
                fechaInicio,

            fecha_fin_ciclo_basal:
                fechaFin,

            cuartil_basal:
                ciclo.cuartil ??
                'Q4',

            promedio_basal:
                Number(
                    ciclo.promedio ??
                    ciclo.promedio_nota ??
                    0
                ),

            estado:
                'pendiente',

            ciclo_basal_numero:
                Number(
                    ciclo.numero
                ) || null,


            /*
             * Compatibilidad temporal legacy.
             */
            campana:
                nombreCampana,

            campanas:
                contextoSnapshot.campana
                    ? [
                        contextoSnapshot.campana
                    ]
                    : [],


            /*
             * Nuevo contexto multidominio.
             */
            quiebre_id:
                contexto.quiebre_id,

            campana_id:
                contexto.campana_id ??
                null,

            matriz_id:
                contexto.matriz_id,

            version_matriz_id:
                contexto.version_matriz_id,

            contexto_snapshot:
                contextoSnapshot
        },


        acciones:
            construirAccionesPda(
                hallazgos,
                contextoSnapshot
            ),


        ciclo: {
            ciclo_numero:
                Number(
                    ciclo.numero ??
                    ciclo.ciclo_numero ??
                    0
                ) || null,

            fecha_inicio:
                fechaInicio,

            fecha_fin:
                fechaFin,

            total_evaluaciones:
                Number(
                    ciclo.totalEvaluaciones ??
                    ciclo.total_evaluaciones ??
                    contexto.evaluaciones?.length ??
                    0
                ),

            promedio_nota:
                Number(
                    ciclo.promedio ??
                    ciclo.promedio_nota ??
                    0
                ),

            cuartil:
                ciclo.cuartil ??
                'Q4',

            mejora_detectada:
                false
        },


        documento: {
            documento_id:
                documentoId,

            fecha_emision:
                hoy,

            periodo_desde:
                fechaInicio,

            periodo_hasta:
                fechaFin,

            total_evaluaciones:
                Number(
                    ciclo.totalEvaluaciones ??
                    ciclo.total_evaluaciones ??
                    contexto.evaluaciones?.length ??
                    0
                ),

            promedio_final:
                Number(
                    ciclo.promedio ??
                    ciclo.promedio_nota ??
                    0
                ),

            cuartil:
                ciclo.cuartil ??
                'Q4',

            /*
             * Histórico completo.
             */
            items_fallados:
                hallazgos,

            fecha_proxima_evaluacion:
                normalizarFechaSqlPda(
                    fechaProxima
                ),

            estado:
                'pendiente',

            campana:
                nombreCampana,

            campanas:
                contextoSnapshot.campana
                    ? [
                        contextoSnapshot.campana
                    ]
                    : [],

            contenido_html:
                documentoHtml,

            contenido_texto:
                documentoTexto,

            contexto_snapshot:
                contextoSnapshot
        }
    };
}


// ======================================================
// PDA - MODAL DOCUMENTO
// ======================================================

function cerrarModalDocumentoPda() {
    document
        .getElementById(
            'modalDocumentoPdaNuevo'
        )
        ?.remove();
}


async function copiarTextoDocumentoPda() {
    const texto =
        window.documentoPdaTextoActual ??
        '';


    if (!texto) {
        return;
    }


    await navigator.clipboard.writeText(
        texto
    );


    alert(
        'Documento copiado al portapapeles.'
    );
}


function imprimirDocumentoPda() {

    const html =
        window.documentoPdaHtmlActual ??
        '';


    if (!html) {
        alert(
            'No existe un documento PDA para imprimir.'
        );

        return;
    }


    const ventana =
        window.open(
            '',
            '_blank'
        );


    if (!ventana) {

        alert(
            'El navegador bloqueó la ventana de impresión.'
        );

        return;
    }


    const documentoCompleto = `
        <!DOCTYPE html>

        <html lang="es">

        <head>

            <meta charset="UTF-8">

            <meta
                name="viewport"
                content="
                    width=device-width,
                    initial-scale=1.0
                "
            >

            <title>
                PDA - MECA
            </title>


            <style>

                html,
                body {
                    margin:
                        0;

                    padding:
                        0;

                    background:
                        #FFFFFF;

                    font-family:
                        Arial,
                        Helvetica,
                        sans-serif;

                    -webkit-print-color-adjust:
                        exact;

                    print-color-adjust:
                        exact;
                }


                body {
                    padding:
                        10px;
                }


                @media print {

                    body {
                        padding:
                            0;
                    }


                    * {
                        -webkit-print-color-adjust:
                            exact !important;

                        print-color-adjust:
                            exact !important;
                    }
                }

            </style>

        </head>


        <body>

            ${html}

            <script>

                window.addEventListener(
                    'load',
                    function () {

                        setTimeout(
                            function () {

                                window.focus();

                                window.print();

                            },
                            250
                        );

                    }
                );

            <\/script>

        </body>

        </html>
    `;


    ventana.document.open();

    ventana.document.write(
        documentoCompleto
    );

    ventana.document.close();
}

function renderizarTimelineInformePda(
    pda
) {
    const modelo =
        obtenerModeloTimelinePda(
            pda
        );


    const etapas =
        modelo.etapas;


    const indiceActual =
        modelo.indiceActual;


    const pasosHtml =
        etapas
            .map(
                (
                    etapa,
                    index
                ) => {

                    const completado =
                        index <
                        indiceActual;


                    const actual =
                        index ===
                        indiceActual;


                    return `
                        <div
                            class="
                                pda-report-step
                                ${
                                    completado
                                        ? 'completed'
                                        : ''
                                }
                                ${
                                    actual
                                        ? 'active'
                                        : ''
                                }
                            "
                        >

                            <div
                                class="
                                    pda-report-step-dot
                                "
                            >
                                ${
                                    completado
                                        ? '✓'
                                        : index + 1
                                }
                            </div>


                            <div
                                class="
                                    pda-report-step-label
                                "
                            >
                                ${escapeHtml(
                                    etapa.nombre
                                )}
                            </div>

                        </div>
                    `;
                }
            )
            .join('');


    return `
        <div
            class="
                pda-report-timeline
            "
            style="
                grid-template-columns:
                    repeat(
                        ${etapas.length},
                        minmax(0, 1fr)
                    );
            "
        >
            ${pasosHtml}
        </div>
    `;
}

async function verInformePda(
    pdaId
) {
    const id =
        Number(
            pdaId
        );


    if (
        !Number.isInteger(id) ||
        id <= 0
    ) {
        throw new Error(
            'El ID del PDA no es válido.'
        );
    }


    if (
        typeof API?.getPDADetalle !==
        'function'
    ) {
        throw new Error(
            'API.getPDADetalle no está disponible.'
        );
    }


    const pda =
        await API.getPDADetalle(
            id
        );


    if (!pda) {
        throw new Error(
            'No se encontró el PDA solicitado.'
        );
    }


    const documento =
        pda?.documento ??
        null;


    if (
        !documento ||
        !documento.contenido_html
    ) {
        throw new Error(
            `El PDA #${id} no tiene informe disponible.`
        );
    }


    // ======================================================
    // TIMELINE ACTUAL
    // ======================================================

    const timelineHtml =
        renderizarTimelineGestionPda(
            pda
        );


    // ======================================================
    // INFORME DE CONSULTA
    //
    // El documento histórico NO se modifica.
    // Solamente se envuelve con el estado actual.
    // ======================================================

    const htmlInforme = `
        <div class="pda-informe-consulta">

            <style>

                .pda-informe-consulta {
                    width: 100%;
                }


                .pda-informe-estado {
                    margin-bottom: 18px;
                    background: #ffffff;
                    border: 1px solid #e2e8f0;
                    border-radius: 10px;
                    overflow: hidden;
                }


                .pda-informe-estado-header {
                    padding: 14px 18px 4px;
                }


                .pda-informe-estado-header span {
                    display: block;
                    font-size: 0.68rem;
                    font-weight: 700;
                    color: #64748b;
                    text-transform: uppercase;
                    letter-spacing: 0.04em;
                }


                .pda-informe-estado-header strong {
                    display: block;
                    margin-top: 3px;
                    font-size: 0.95rem;
                    color: #0f172a;
                }


                .pda-informe-consulta
                .pda-management-timeline {
                    border-bottom: none;
                }

            </style>


            <section class="pda-informe-estado">

                <div class="pda-informe-estado-header">

                    <span>
                        Estado actual del PDA
                    </span>

                    <strong>
                        ${escapeHtml(
                            obtenerTextoEstadoPdaDashboard(
                                pda?.estado
                            )
                        )}
                    </strong>

                </div>


                ${timelineHtml}

            </section>


            ${documento.contenido_html}

        </div>
    `;


    mostrarDocumentoPda(
        htmlInforme,
        documento.contenido_texto ?? '',
        `PDA #${id} · ${pda.agente ?? ''}`
    );
}


window.verInformePda =
    verInformePda;

async function verDocumentoPda(
    pdaId
) {
    const id =
        Number(
            pdaId
        );


    if (
        !Number.isInteger(id) ||
        id <= 0
    ) {
        throw new Error(
            'El ID del PDA no es válido.'
        );
    }


    if (
        typeof API?.getPDADetalle !==
        'function'
    ) {
        throw new Error(
            'API.getPDADetalle no está disponible.'
        );
    }


    const pda =
        await API.getPDADetalle(
            id
        );


    if (!pda) {
        throw new Error(
            'No se encontró el PDA solicitado.'
        );
    }


    const documento =
        pda?.documento ??
        null;


    if (
        !documento ||
        !documento.contenido_html
    ) {
        throw new Error(
            `El PDA #${id} no tiene un documento disponible.`
        );
    }


    mostrarDocumentoPda(
        documento.contenido_html,
        documento.contenido_texto ?? '',
        `PDA #${id} · ${pda.agente ?? ''}`
    );
}


window.verDocumentoPda =
    verDocumentoPda;

function mostrarDocumentoPda(
    html,
    texto,
    titulo = 'Documento PDA'
) {
    cerrarModalDocumentoPda();


    window.documentoPdaHtmlActual =
        html;

    window.documentoPdaTextoActual =
        texto;


    const modal =
        document.createElement(
            'div'
        );


    modal.id =
        'modalDocumentoPdaNuevo';


    modal.style.cssText = `
        position: fixed;
        inset: 0;
        z-index: 10050;
        background: rgba(15, 23, 42, 0.72);
        display: flex;
        align-items: center;
        justify-content: center;
        padding: 24px;
    `;


    modal.innerHTML = `
        <div style="
            width: min(1100px, 96vw);
            height: min(90vh, 900px);
            background: white;
            border-radius: 12px;
            display: flex;
            flex-direction: column;
            overflow: hidden;
            box-shadow: 0 25px 60px rgba(0,0,0,.25);
        ">

            <div style="
                padding: 14px 18px;
                background: #0f172a;
                color: white;
                display: flex;
                justify-content: space-between;
                align-items: center;
                gap: 15px;
            ">

                <strong>
                    ${escaparHtmlPda(
        titulo
    )}
                </strong>

                <div style="
                    display:flex;
                    gap:8px;
                ">

                    <button
                        type="button"
                        onclick="copiarTextoDocumentoPda()"
                    >
                        Copiar texto
                    </button>

                    <button
                        type="button"
                        onclick="imprimirDocumentoPda()"
                    >
                        Imprimir
                    </button>

                    <button
                        type="button"
                        onclick="cerrarModalDocumentoPda()"
                    >
                        Cerrar
                    </button>

                </div>
            </div>


            <div style="
                flex:1;
                overflow:auto;
                padding:28px;
                background:#f1f5f9;
            ">

                <div style="
                    max-width:900px;
                    margin:auto;
                    background:white;
                    padding:32px;
                    box-shadow:0 4px 15px rgba(0,0,0,.08);
                ">
                    ${html}
                </div>

            </div>
        </div>
    `;


    document.body.appendChild(
        modal
    );
}

// ======================================================
// PDA - ENRIQUECER EVALUACIONES DEL CICLO
// ======================================================

function obtenerClavesEvaluacionPda(
    evaluacion
) {
    if (!evaluacion) {
        return [];
    }


    const claves =
        [];


    // ==================================================
    // ID DE EVALUACIÓN
    // ==================================================

    const id =
        evaluacion.id ??
        evaluacion.evaluacion_id ??
        null;


    if (
        id !== null &&
        id !== undefined &&
        String(id).trim() !== ''
    ) {
        claves.push(
            `ID:${String(id).trim()}`
        );
    }


    // ==================================================
    // TICKET PSI
    // ==================================================

    const ticket =
        evaluacion.ticketPSI ??
        evaluacion.ticket_psi ??
        evaluacion.ticket ??
        null;


    if (
        ticket !== null &&
        ticket !== undefined &&
        String(ticket).trim() !== ''
    ) {
        claves.push(
            `TICKET:${String(ticket)
                .trim()
                .toUpperCase()
            }`
        );
    }


    // ==================================================
    // ID DE LLAMADA
    // ==================================================

    const llamada =
        evaluacion.idLlamada ??
        evaluacion.id_llamada ??
        evaluacion.llamada_id ??
        null;


    if (
        llamada !== null &&
        llamada !== undefined &&
        String(llamada).trim() !== ''
    ) {
        claves.push(
            `LLAMADA:${String(llamada)
                .trim()
                .toUpperCase()
            }`
        );
    }


    return [
        ...new Set(
            claves
        )
    ];
}

function normalizarEvaluacionCompletaPda(
    evaluacion
) {
    if (!evaluacion) {
        return null;
    }


    return {
        ...evaluacion,

        id:
            evaluacion.id ??
            evaluacion.evaluacion_id ??
            null,

        ticketPSI:
            evaluacion.ticketPSI ??
            evaluacion.ticket_psi ??
            evaluacion.ticket ??
            '',

        fechaOriginal:
            evaluacion.fechaOriginal ??
            evaluacion.fecha_formateada ??
            evaluacion.fecha ??
            null,

        fecha:
            evaluacion.fecha ??
            evaluacion.fecha_formateada ??
            evaluacion.fechaOriginal ??
            null,

        quiebre_id:
            evaluacion.quiebre_id ??
            null,

        campana_id:
            evaluacion.campana_id ??
            null,

        matriz_id:
            evaluacion.matriz_id ??
            null,

        version_matriz_id:
            evaluacion.version_matriz_id ??
            evaluacion.versionMatrizId ??
            null,

        notaFinal:
            Number(
                evaluacion.notaFinal ??
                evaluacion.nota_final ??
                0
            ),

        detalles:
            Array.isArray(
                evaluacion.detalles
            )
                ? evaluacion.detalles
                : Array.isArray(
                    evaluacion.detalles_evaluacion
                )
                    ? evaluacion.detalles_evaluacion
                    : []
    };
}


async function enriquecerEvaluacionesCicloPda(
    evaluaciones
) {
    const lista =
        Array.isArray(
            evaluaciones
        )
            ? evaluaciones
            : [];


    if (
        lista.length === 0
    ) {
        return [];
    }


    // ==================================================
    // 1. PRIMERA FUENTE:
    // evaluaciones completas ya cargadas por MECA
    // ==================================================

    let completas =
        Array.isArray(
            window.evaluacionesGlobales
        )
            ? window.evaluacionesGlobales
            : [];


    // ==================================================
    // 2. FALLBACK API
    // Si la colección global no está disponible,
    // recuperamos evaluaciones completas vía API.
    // ==================================================

    if (
        completas.length === 0 &&
        window.API &&
        typeof API.getEvaluacionesConDetalles ===
        'function'
    ) {
        console.log(
            '🔄 Cargando evaluaciones completas para enriquecer PDA...'
        );


        const respuesta =
            await API.getEvaluacionesConDetalles();


        completas =
            Array.isArray(
                respuesta
            )
                ? respuesta.map(
                    normalizarEvaluacionCompletaPda
                )
                : [];
    }


    const indice =
        new Map();


    for (
        const evaluacion
        of completas
    ) {
        const normalizada =
            normalizarEvaluacionCompletaPda(
                evaluacion
            );


        const claves =
            obtenerClavesEvaluacionPda(
                normalizada
            );


        for (
            const clave
            of claves
        ) {
            if (
                !indice.has(
                    clave
                )
            ) {
                indice.set(
                    clave,
                    normalizada
                );
            }
        }
    }


    const enriquecidas =
        lista.map(
            evaluacion => {

                const claves =
                    obtenerClavesEvaluacionPda(
                        evaluacion
                    );


                let completa =
                    null;


                for (
                    const clave
                    of claves
                ) {
                    if (
                        indice.has(
                            clave
                        )
                    ) {
                        completa =
                            indice.get(
                                clave
                            );

                        break;
                    }
                }

                if (!completa) {
                    console.warn(
                        '⚠️ No se encontró evaluación completa para:',
                        {
                            evaluacionCiclo:
                                evaluacion,

                            clavesBuscadas:
                                claves
                        }
                    );
                }

                /*
                 * La evaluación del ciclo conserva
                 * sus datos específicos.
                 *
                 * La evaluación completa aporta
                 * contexto histórico y detalles.
                 */
                return normalizarEvaluacionCompletaPda({
                    ...completa,
                    ...evaluacion,

                    quiebre_id:
                        evaluacion.quiebre_id ??
                        completa?.quiebre_id ??
                        null,

                    campana_id:
                        evaluacion.campana_id ??
                        completa?.campana_id ??
                        null,

                    matriz_id:
                        evaluacion.matriz_id ??
                        completa?.matriz_id ??
                        null,

                    version_matriz_id:
                        evaluacion.version_matriz_id ??
                        evaluacion.versionMatrizId ??
                        completa?.version_matriz_id ??
                        completa?.versionMatrizId ??
                        null,

                    detalles:
                        (
                            Array.isArray(
                                evaluacion.detalles
                            ) &&
                            evaluacion.detalles.length > 0
                        )
                            ? evaluacion.detalles
                            : completa?.detalles ??
                            completa?.detalles_evaluacion ??
                            []
                });
            }
        );

    return enriquecidas;
}

async function generarPdaDesdeCiclo({
    agente,
    ciclo
}) {
    if (
        !agente ||
        !ciclo
    ) {
        throw new Error(
            'Gestor y ciclo son obligatorios para generar el PDA.'
        );
    }


    if (
        !window.API ||
        typeof API.crearPDA !==
        'function'
    ) {
        throw new Error(
            'API.crearPDA no está disponible.'
        );
    }


    if (
        typeof API.getEstructuraVersion !==
        'function'
    ) {
        throw new Error(
            'API.getEstructuraVersion no está disponible.'
        );
    }


    const evaluacionesBase =
        Array.isArray(
            ciclo.evaluaciones
        )
            ? ciclo.evaluaciones
            : [];


    if (
        evaluacionesBase.length ===
        0
    ) {
        throw new Error(
            'El ciclo seleccionado no contiene evaluaciones.'
        );
    }


    // ==================================================
    // 1. ENRIQUECER EVALUACIONES
    // ==================================================

    const evaluaciones =
        await enriquecerEvaluacionesCicloPda(
            evaluacionesBase
        );


    // ==================================================
    // 2. CONTEXTO HISTÓRICO REAL
    // ==================================================

    const contexto =
        resolverContextoCicloPda(
            evaluaciones
        );


    // ==================================================
    // 2. ESTRUCTURA HISTÓRICA DE LA VERSIÓN
    // ==================================================

    const estructura =
        await API.getEstructuraVersion(
            contexto.version_matriz_id
        );


    if (!estructura) {
        throw new Error(
            'No se pudo cargar la estructura histórica de la matriz.'
        );
    }


    // ==================================================
    // 3. HALLAZGOS
    // ==================================================

    const hallazgos =
        await construirHallazgosPda(
            contexto.evaluaciones,
            estructura
        );


    const resumenHallazgos =
        construirResumenHallazgosPda(
            hallazgos
        );


    // ==================================================
    // 4. SNAPSHOT
    // ==================================================

    const contextoSnapshot =
        construirContextoSnapshotPda(
            contexto,
            estructura
        );


    // ==================================================
    // 5. DOCUMENTO
    // ==================================================

    const documentoId =
        generarDocumentoIdPda();


    const fechaEmisionTexto =
        formatearFechaDocumentoPda(
            new Date().toISOString()
        );


    const evaluacionesDocumento =
        construirCatalogoEvaluacionesDocumentoPda(
            contexto.evaluaciones,
            hallazgos
        );


    const matrizHallazgosDocumento =
        construirMatrizHallazgosDocumentoPda(
            hallazgos,
            evaluacionesDocumento
        );


    const datosDocumento = {
        documentoId,

        fechaEmision:
            fechaEmisionTexto,

        agente,

        ciclo,

        contexto: {
            ...contexto,
            ...contextoSnapshot
        },

        resumenHallazgos,

        evaluaciones:
            contexto.evaluaciones,

        hallazgos,

        evaluacionesDocumento,

        matrizHallazgosDocumento
    };


    const documentoHtml =
        generarDocumentoHtmlPda(
            datosDocumento
        );


    const documentoTexto =
        generarDocumentoTextoPda(
            datosDocumento
        );


    // ==================================================
    // 6. PAYLOAD TRANSACCIONAL
    // ==================================================

    const payload =
        construirPayloadCreacionPda({
            agente,

            ciclo,

            contexto,

            contextoSnapshot,

            hallazgos,

            documentoId,

            documentoHtml,

            documentoTexto
        });

    // ==================================================
    // 7. CREAR TODO VÍA API
    // ==================================================

    const creado =
        await API.crearPDA(
            payload
        );


    if (
        !creado ||
        !creado.id
    ) {
        throw new Error(
            'La API no devolvió el PDA creado.'
        );
    }


    // ==================================================
    // 8. MOSTRAR DOCUMENTO PERSISTIDO
    // ==================================================

    mostrarDocumentoPda(
        documentoHtml,
        documentoTexto,
        `PDA ${creado.id} · ${agente}`
    );


    // ==================================================
    // 9. ACTUALIZAR BANDEJA
    // ==================================================

    if (
        typeof renderizarPdaDashboard ===
        'function'
    ) {
        await renderizarPdaDashboard();
    }


    return creado;
}


window.generarPdaDesdeCiclo =
    generarPdaDesdeCiclo;

window.abrirGestionPDA =
    abrirGestionPDA;

window.mostrarDocumentoPda =
    mostrarDocumentoPda;

window.cerrarModalDocumentoPda =
    cerrarModalDocumentoPda;

window.copiarTextoDocumentoPda =
    copiarTextoDocumentoPda;

window.imprimirDocumentoPda =
    imprimirDocumentoPda;

// ======================================================
// PDA - ESTRUCTURA COMÚN DE TEMAS
//
// Clasificación PDA
//   -> Frente
//      -> Atributo
//         -> Submotivo
//
// Fuente esperada:
// pda_acciones / hallazgos normalizados.
//
// Esta estructura es reutilizable por:
// - Documento inicial
// - Feedback
// - Capacitación
// - Consulta posterior
// ======================================================

function normalizarClasificacionPda(
    item = {}
) {
    const valor = String(
        item.tipo_accion ??
        item.clasificacion ??
        item.clasificacion_pda ??
        item.tipo ??
        ''
    )
        .trim()
        .toUpperCase();


    if (
        valor === 'PROCESO' ||
        valor === 'PROCESOS'
    ) {
        return {
            codigo: 'PROCESO',
            nombre: 'Proceso'
        };
    }


    if (
        valor === 'HABILIDADES' ||
        valor === 'HABILIDAD' ||
        valor === 'HABILIDADES BLANDAS'
    ) {
        return {
            codigo: 'HABILIDADES',
            nombre: 'Habilidades blandas'
        };
    }


    if (
        valor === 'FEEDBACK' ||
        valor === 'RETROALIMENTACION' ||
        valor === 'RETROALIMENTACIÓN'
    ) {
        return {
            codigo: 'FEEDBACK',
            nombre: 'Feedback'
        };
    }


    return {
        codigo:
            valor ||
            'SIN_CLASIFICAR',

        nombre:
            valor ||
            'Sin clasificar'
    };
}


function normalizarTemaPda(
    item = {}
) {
    const clasificacion =
        normalizarClasificacionPda(
            item
        );


    const frente =
        String(
            item.frente ??
            item.frente_nombre ??
            'SIN FRENTE'
        ).trim() ||
        'SIN FRENTE';


    const atributo =
        String(
            item.atributo ??
            item.atributo_nombre ??
            item.bloque ??
            'SIN ATRIBUTO'
        ).trim() ||
        'SIN ATRIBUTO';


    const submotivo =
        String(
            item.criterio ??
            item.submotivo ??
            item.criterio_nombre ??
            item.submotivo_nombre ??
            item.codigo ??
            'SIN SUBMOTIVO'
        ).trim() ||
        'SIN SUBMOTIVO';


    return {
        id:
            item.id ??
            item.accion_id ??
            item.pda_accion_id ??
            null,

        criterio_id:
            item.criterio_id ??
            item.submotivo_id ??
            null,

        frente_id:
            item.frente_id ??
            null,

        atributo_id:
            item.atributo_id ??
            null,

        clasificacion_codigo:
            clasificacion.codigo,

        clasificacion_nombre:
            clasificacion.nombre,

        frente,

        atributo,

        submotivo,

        descripcion:
            item.descripcion ??
            null,

        completado:
            item.completado === true,

        resultado:
            item.resultado ??
            null,

        evaluacion_id:
            item.evaluacion_id ??
            null,

        contexto_snapshot:
            item.contexto_snapshot ??
            null,

        original:
            item
    };
}


function agruparTemasPda(
    items = []
) {
    const clasificaciones =
        new Map();


    for (
        const itemOriginal
        of Array.isArray(items)
            ? items
            : []
    ) {
        const item =
            normalizarTemaPda(
                itemOriginal
            );


        // ==============================================
        // 1. CLASIFICACIÓN PDA
        // ==============================================

        const claveClasificacion =
            item.clasificacion_codigo;


        if (
            !clasificaciones.has(
                claveClasificacion
            )
        ) {
            clasificaciones.set(
                claveClasificacion,
                {
                    codigo:
                        item.clasificacion_codigo,

                    nombre:
                        item.clasificacion_nombre,

                    frentes:
                        new Map()
                }
            );
        }


        const clasificacion =
            clasificaciones.get(
                claveClasificacion
            );


        // ==============================================
        // 2. FRENTE
        // ==============================================

        const claveFrente =
            item.frente_id != null
                ? `id:${item.frente_id}`
                : `txt:${item.frente}`;


        if (
            !clasificacion.frentes.has(
                claveFrente
            )
        ) {
            clasificacion.frentes.set(
                claveFrente,
                {
                    frente_id:
                        item.frente_id,

                    frente:
                        item.frente,

                    atributos:
                        new Map()
                }
            );
        }


        const frente =
            clasificacion.frentes.get(
                claveFrente
            );


        // ==============================================
        // 3. ATRIBUTO
        // ==============================================

        const claveAtributo =
            item.atributo_id != null
                ? `id:${item.atributo_id}`
                : `txt:${item.atributo}`;


        if (
            !frente.atributos.has(
                claveAtributo
            )
        ) {
            frente.atributos.set(
                claveAtributo,
                {
                    atributo_id:
                        item.atributo_id,

                    atributo:
                        item.atributo,

                    submotivos:
                        []
                }
            );
        }


        const atributo =
            frente.atributos.get(
                claveAtributo
            );


        // ==============================================
        // 4. SUBMOTIVO
        // ==============================================

        const claveItem =
            item.id != null
                ? `accion:${item.id}`
                : (
                    item.criterio_id != null
                        ? `criterio:${item.criterio_id}`
                        : `txt:${item.submotivo}`
                );


        const yaExiste =
            atributo.submotivos.some(
                actual =>
                    actual._clave ===
                    claveItem
            );


        if (!yaExiste) {
            atributo.submotivos.push({
                ...item,

                _clave:
                    claveItem
            });
        }
    }


    // ==================================================
    // CONVERTIR MAPS A ARRAYS
    // ==================================================

    return Array.from(
        clasificaciones.values()
    ).map(
        clasificacion => ({
            codigo:
                clasificacion.codigo,

            nombre:
                clasificacion.nombre,

            frentes:
                Array.from(
                    clasificacion.frentes.values()
                ).map(
                    frente => ({
                        frente_id:
                            frente.frente_id,

                        frente:
                            frente.frente,

                        atributos:
                            Array.from(
                                frente.atributos.values()
                            ).map(
                                atributo => ({
                                    atributo_id:
                                        atributo.atributo_id,

                                    atributo:
                                        atributo.atributo,

                                    submotivos:
                                        atributo
                                            .submotivos
                                            .map(
                                                item => {
                                                    const {
                                                        _clave,
                                                        ...limpio
                                                    } = item;

                                                    return limpio;
                                                }
                                            )
                                })
                            )
                    })
                )
        })
    );
}


async function abrirGestionPDA(
    pdaId
) {
    try {
        const id =
            Number(
                pdaId
            );


        if (
            !Number.isInteger(id) ||
            id <= 0
        ) {
            throw new Error(
                'El ID del PDA no es válido.'
            );
        }


        if (
            typeof API?.getPDADetalle !==
            'function'
        ) {
            throw new Error(
                'API.getPDADetalle no está disponible.'
            );
        }


        // ==================================================
        // 1. OBTENER PDA COMPLETO
        // ==================================================

        const pdaCompleto =
            await API.getPDADetalle(
                id
            );


        if (!pdaCompleto) {
            throw new Error(
                'No se encontró el PDA solicitado.'
            );
        }


        // ==================================================
        // 2. NORMALIZAR ESTADO
        // ==================================================

        const estado =
            String(
                pdaCompleto.estado ||
                'pendiente'
            )
                .trim()
                .toLowerCase();


        // ==================================================
        // 3. RESOLVER RENDERIZADOR DE FORMA SEGURA
        // ==================================================

        let renderizador =
            null;


        switch (estado) {

            case 'pendiente':

                if (
                    typeof renderizarModalPendiente ===
                    'function'
                ) {
                    renderizador =
                        renderizarModalPendiente;
                }

                break;


            case 'notificado':

                if (
                    typeof renderizarModalFeedback ===
                    'function'
                ) {
                    renderizador =
                        renderizarModalFeedback;
                }

                break;

            case 'en_gestion':

                /*
                * Estado histórico.
                *
                * En el flujo actual equivale a la etapa
                * de Feedback. Ya NO representa Capacitación.
                */
                if (
                    typeof renderizarModalFeedback ===
                    'function'
                ) {
                    renderizador =
                        renderizarModalFeedback;
                }

                break;

            case 'en_seguimiento':

                if (
                    typeof renderizarModalEnSeguimiento ===
                    'function'
                ) {
                    renderizador =
                        renderizarModalEnSeguimiento;
                }

                break;


            case 'requiere_capacitacion':
            case 'enviado_capacitacion':
            case 'en_capacitacion':

                if (
                    typeof renderizarModalRequiereCapacitacion ===
                    'function'
                ) {
                    renderizador =
                        renderizarModalRequiereCapacitacion;
                }

                break;

            case 'en_seguimiento_capacitacion':

                if (
                    typeof renderizarModalEnSeguimiento ===
                    'function'
                ) {
                    renderizador =
                        renderizarModalEnSeguimiento;
                }

                break;

            case 'reiterativo':

                if (
                    typeof renderizarModalReiterativo ===
                    'function'
                ) {
                    renderizador =
                        renderizarModalReiterativo;
                }

                break;


            case 'completado':
            case 'corregido':
            case 'cerrado':
            case 'escalado':

                if (
                    typeof renderizarModalDetallePDA ===
                    'function'
                ) {
                    renderizador =
                        renderizarModalDetallePDA;
                }

                break;
            default:

                console.warn(
                    '⚠️ Estado PDA sin renderizador específico:',
                    {
                        pdaId:
                            Number(
                                pda?.id ||
                                id
                            ),

                        estado
                    }
                );

                break;
        }


        // ==================================================
        // 4. VALIDAR RENDERIZADOR
        // ==================================================

        if (
            typeof renderizador !==
            'function'
        ) {
            throw new Error(
                `No existe un renderizador disponible para el estado PDA "${estado}".`
            );
        }


        const contenidoEtapa =
            renderizador(
                pdaCompleto
            );


        // ==================================================
        // 5. CERRAR MODAL ANTERIOR
        // ==================================================

        if (
            typeof cerrarModalGestionPDA ===
            'function'
        ) {
            cerrarModalGestionPDA();
        } else {

            const existente =
                document.getElementById(
                    'modalGestionPDA'
                );


            if (existente) {
                existente.remove();
            }
        }


        // ==================================================
        // 6. CREAR CONTENEDOR ÚNICO
        // ==================================================

        const modal =
            document.createElement(
                'div'
            );


        modal.id =
            'modalGestionPDA';

        modal.className =
            'pda-management-modal';


        modal.innerHTML = `
            <div
                class="pda-management-backdrop"
                data-pda-close
            ></div>

            <section
                class="pda-management-shell"
                role="dialog"
                aria-modal="true"
                aria-labelledby="pdaManagementTitle"
            >
                ${contenidoEtapa}
            </section>
        `;


        document.body.appendChild(
            modal
        );


        // ==================================================
        // 7. CONTEXTO ACTUAL
        // ==================================================

        window.pdaActualGestion =
        {
            id,
            estado,
            cabecera:
                pdaCompleto
        };


        // ==================================================
        // 8. CIERRE DEL MODAL
        // ==================================================

        modal
            .querySelectorAll(
                '[data-pda-close]'
            )
            .forEach(
                elemento => {

                    elemento.addEventListener(
                        'click',
                        event => {

                            event.preventDefault();

                            if (
                                typeof cerrarModalGestionPDA ===
                                'function'
                            ) {
                                cerrarModalGestionPDA();
                            }
                        }
                    );
                }
            );


        // ==================================================
        // 9. INICIALIZACIÓN DE CONTROLES
        // ==================================================

        requestAnimationFrame(
            async () => {

                if (
                    typeof inicializarSelectoresMultiples ===
                    'function'
                ) {
                    inicializarSelectoresMultiples();
                }


                if (
                    typeof inicializarGestionPdaEtapa ===
                    'function'
                ) {
                    inicializarGestionPdaEtapa(
                        pdaCompleto
                    );
                }


                if (
                    pdaCompleto.estado ===
                    'en_seguimiento' &&
                    typeof cargarAnalisisSeguimientoPDA ===
                    'function'
                ) {
                    await cargarAnalisisSeguimientoPDA(
                        Number(
                            pdaId
                        )
                    );
                }
            }
        );


    } catch (error) {

        console.error(
            '❌ Error abriendo gestión PDA:',
            error
        );


        alert(
            'No fue posible cargar la gestión del PDA.\n\n' +
            error.message
        );
    }
}

function obtenerEstadoVisualGestionPda(
    estado
) {
    const estados = {
        pendiente: {
            texto: 'Pendiente',
            paso: 1,
            clase: 'pending'
        },

        notificado: {
            texto: 'Notificado',
            paso: 2,
            clase: 'notified'
        },

        en_gestion: {
            texto: 'En intervención',
            paso: 3,
            clase: 'management'
        },

        requiere_capacitacion: {
            texto: 'Capacitación',
            paso: 4,
            clase: 'training'
        },

        enviado_capacitacion: {
            texto: 'Capacitación',
            paso: 4,
            clase: 'training'
        },

        en_capacitacion: {
            texto: 'Capacitación',
            paso: 4,
            clase: 'training'
        },

        en_seguimiento: {
            texto: 'Seguimiento',
            paso: 5,
            clase: 'management'
        },

        en_seguimiento_capacitacion: {
            texto: 'Seguimiento',
            paso: 5,
            clase: 'management'
        },

        reiterativo: {
            texto: 'Reiterativo',
            paso: 5,
            clase: 'warning'
        },

        completado: {
            texto: 'Cerrado',
            paso: 6,
            clase: 'completed'
        },

        escalado: {
            texto: 'Escalado',
            paso: 6,
            clase: 'escalated'
        }
    };


    return (
        estados[
        String(
            estado || ''
        )
            .trim()
            .toLowerCase()
        ] ||
        {
            texto:
                estado || 'Sin estado',

            paso:
                1,

            clase:
                'pending'
        }
    );
}

function obtenerModeloTimelinePda(
    pda
) {
    const estado =
        String(
            pda?.estado ||
            'pendiente'
        )
            .trim()
            .toLowerCase();


    // ======================================================
    // 1. HISTORIAL
    // ======================================================

    let historial =
        pda?.historial_estados;


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


    // ======================================================
    // 2. DETECTAR PASO REAL POR CAPACITACIÓN
    //
    // No dependemos solo del estado actual.
    // Una vez terminada la capacitación el PDA puede
    // volver a seguimiento y debemos conservar la etapa.
    // ======================================================

    const tieneEventoCapacitacion =
        historial.some(
            evento =>
                [
                    'enviado_capacitacion',
                    'capacitacion_registrada'
                ].includes(
                    String(
                        evento?.evento ||
                        ''
                    )
                        .trim()
                        .toLowerCase()
                )
        );


    const tieneDatosCapacitacion =
        Boolean(
            pda?.fecha_envio_capacitacion ||
            pda?.fecha_capacitacion ||
            pda?.gescot_capacitacion ||
            pda?.capacitador ||
            pda?.fecha_inicio_seguimiento_capacitacion
        );


    const estadoCapacitacion =
        [
            'requiere_capacitacion',
            'enviado_capacitacion',
            'en_capacitacion',
            'en_seguimiento_capacitacion'
        ].includes(
            estado
        );


    const pasoPorCapacitacion =
        estadoCapacitacion ||
        tieneEventoCapacitacion ||
        tieneDatosCapacitacion;


    // ======================================================
    // 3. ETAPAS DEL FLUJO
    // ======================================================

    const etapas =
        [
            {
                clave:
                    'deteccion',

                nombre:
                    'Detección'
            },

            {
                clave:
                    'notificacion',

                nombre:
                    'Notificación'
            },

            {
                clave:
                    'feedback',

                nombre:
                    'Feedback'
            },

            {
                clave:
                    'seguimiento',

                nombre:
                    'Seguimiento'
            }
        ];


    if (
        pasoPorCapacitacion
    ) {
        etapas.push(
            {
                clave:
                    'capacitacion',

                nombre:
                    'Capacitación'
            },

            {
                clave:
                    'seguimiento_post_capacitacion',

                nombre:
                    'Seguimiento post-capacitación'
            }
        );
    }


    etapas.push({
        clave:
            'cierre',

        nombre:
            'Cierre'
    });


    // ======================================================
    // 4. ETAPA ACTUAL
    // ======================================================

    let etapaActual =
        'notificacion';


    switch (
        estado
    ) {

        case 'pendiente':

            etapaActual =
                'notificacion';

            break;


        case 'notificado':

        case 'en_gestion':

            etapaActual =
                'feedback';

            break;


        case 'en_seguimiento':

        case 'reiterativo':

        case 'persiste':

            etapaActual =
                pasoPorCapacitacion
                    ? 'seguimiento_post_capacitacion'
                    : 'seguimiento';

            break;


        case 'requiere_capacitacion':

        case 'enviado_capacitacion':

        case 'en_capacitacion':

            etapaActual =
                'capacitacion';

            break;


        case 'en_seguimiento_capacitacion':

            etapaActual =
                'seguimiento_post_capacitacion';

            break;


        case 'completado':

        case 'corregido':

        case 'cerrado':

        case 'escalado':

            etapaActual =
                'cierre';

            break;


        default:

            etapaActual =
                'notificacion';

            break;
    }


    // ======================================================
    // 5. POSICIÓN ACTUAL
    // ======================================================

    const indiceEncontrado =
        etapas.findIndex(
            etapa =>
                etapa.clave ===
                etapaActual
        );


    const indiceActual =
        indiceEncontrado >= 0
            ? indiceEncontrado
            : 0;


    return {
        estado,
        pasoPorCapacitacion,
        etapas,
        etapaActual,
        indiceActual
    };
}

function renderizarTimelineGestionPda(
    pda
) {
    const modelo =
        obtenerModeloTimelinePda(
            pda
        );


    const etapas =
        modelo.etapas;


    const indiceActual =
        modelo.indiceActual;


    return `
        <div
            class="
                pda-management-timeline
            "
            style="
                grid-template-columns:
                    repeat(
                        ${etapas.length},
                        minmax(0, 1fr)
                    );
            "
        >

            ${etapas
                .map(
                    (
                        etapa,
                        index
                    ) => {

                        const numero =
                            index + 1;


                        const completado =
                            index <
                            indiceActual;


                        const actual =
                            index ===
                            indiceActual;


                        return `
                            <div
                                class="
                                    pda-management-step
                                    ${
                                        completado
                                            ? 'completed'
                                            : ''
                                    }
                                    ${
                                        actual
                                            ? 'active'
                                            : ''
                                    }
                                "
                            >

                                <div
                                    class="
                                        pda-management-step-dot
                                    "
                                >
                                    ${
                                        completado
                                            ? '✓'
                                            : numero
                                    }
                                </div>


                                <div
                                    class="
                                        pda-management-step-label
                                    "
                                >
                                    ${escapeHtml(
                                        etapa.nombre
                                    )}
                                </div>

                            </div>
                        `;
                    }
                )
                .join('')}

        </div>
    `;
}


function obtenerContextoGestionPda(
    pda
) {
    const cabecera =
        pda?.cabecera &&
            typeof pda.cabecera === 'object'
            ? pda.cabecera
            : pda;


    const acciones =
        Array.isArray(
            pda?.acciones
        )
            ? pda.acciones
            : Array.isArray(
                cabecera?.acciones
            )
                ? cabecera.acciones
                : [];


    function normalizarSnapshot(
        valor
    ) {
        if (!valor) {
            return {};
        }


        if (
            typeof valor ===
            'object'
        ) {
            return valor;
        }


        if (
            typeof valor ===
            'string'
        ) {
            try {
                return JSON.parse(
                    valor
                );
            } catch {
                return {};
            }
        }


        return {};
    }


    const snapshotCabecera =
        normalizarSnapshot(
            cabecera?.contexto_snapshot
        );


    const snapshotContexto =
        normalizarSnapshot(
            cabecera?.contexto
        );


    const accionConContexto =
        acciones.find(
            accion =>
                accion?.contexto_snapshot
        );


    const snapshotAccion =
        normalizarSnapshot(
            accionConContexto
                ?.contexto_snapshot
        );


    /*
     * Prioridad:
     * 1. snapshot de cabecera
     * 2. contexto de cabecera
     * 3. snapshot persistido en acciones
     */
    const snapshot = {
        ...snapshotAccion,
        ...snapshotContexto,
        ...snapshotCabecera
    };


    // ==================================================
    // QUIEBRE
    // ==================================================

    const quiebre =
        snapshot?.quiebre?.nombre ??
        snapshot?.quiebre?.codigo ??
        cabecera?.quiebre_nombre ??
        cabecera?.quiebre_codigo ??
        pda?.quiebre_nombre ??
        pda?.quiebre_codigo ??
        (
            cabecera?.quiebre_id
                ? `Quiebre ${cabecera.quiebre_id}`
                : '—'
        );


    // ==================================================
    // MATRIZ
    // ==================================================

    const matriz =
        snapshot?.matriz?.nombre ??
        snapshot?.matriz?.codigo ??
        cabecera?.matriz_nombre ??
        cabecera?.matriz_codigo ??
        pda?.matriz_nombre ??
        pda?.matriz_codigo ??
        (
            cabecera?.matriz_id
                ? `Matriz ${cabecera.matriz_id}`
                : '—'
        );


    // ==================================================
    // VERSIÓN
    // ==================================================

    const version =
        snapshot?.versionMatriz?.version ??
        snapshot?.version_matriz?.version ??
        cabecera?.version_matriz_nombre ??
        cabecera?.version_matriz ??
        cabecera?.version ??
        pda?.version_matriz ??
        pda?.version ??
        (
            cabecera?.version_matriz_id
                ? `Versión ${cabecera.version_matriz_id}`
                : '—'
        );


    // ==================================================
    // CAMPAÑAS
    // ==================================================

    let campanas =
        'Sin campaña';


    const listaCampanas =
        Array.isArray(
            cabecera?.campanas
        )
            ? cabecera.campanas
            : Array.isArray(
                pda?.campanas
            )
                ? pda.campanas
                : Array.isArray(
                    snapshot?.campanas
                )
                    ? snapshot.campanas
                    : [];


    if (
        listaCampanas.length >
        0
    ) {
        campanas =
            listaCampanas
                .map(
                    item =>
                        item?.codigo ??
                        item?.nombre ??
                        (
                            item?.id
                                ? `Campaña ${item.id}`
                                : null
                        )
                )
                .filter(Boolean)
                .join(' / ') ||
            'Sin campaña';

    } else if (
        snapshot?.campana
    ) {
        campanas =
            snapshot.campana.codigo ??
            snapshot.campana.nombre ??
            (
                snapshot.campana.id
                    ? `Campaña ${snapshot.campana.id}`
                    : 'Sin campaña'
            );

    } else if (
        cabecera?.campana_codigo ||
        cabecera?.campana_nombre
    ) {
        campanas =
            cabecera.campana_codigo ??
            cabecera.campana_nombre;

    } else if (
        cabecera?.campana_id
    ) {
        campanas =
            `Campaña ${cabecera.campana_id}`;
    }


    return {
        quiebre,
        campanas,
        matriz,
        version
    };
}


function renderizarCabeceraGestionPda(
    pda
) {
    const estado =
        obtenerEstadoVisualGestionPda(
            pda?.estado
        );


    const contexto =
        obtenerContextoGestionPda(
            pda
        );


    return `
        <header class="pda-management-header">

            <div class="pda-management-header-main">

                <div>
                    <div
                        class="pda-management-eyebrow"
                    >
                        PLAN DE DESARROLLO Y ACOMPAÑAMIENTO
                    </div>

                    <h2
                        id="pdaManagementTitle"
                        class="pda-management-title"
                    >
                        PDA #${Number(
        pda?.id || 0
    )}
                    </h2>

                    <div
                        class="pda-management-agent"
                    >
                        ${escapeHtml(
        pda?.agente ||
        'Gestor no identificado'
    )}
                    </div>
                </div>


                <div
                    class="pda-management-header-actions"
                >
                    <span
                        class="
                            pda-management-status
                            ${escapeHtml(
        estado.clase
    )}
                        "
                    >
                        ${escapeHtml(
        estado.texto
    )}
                    </span>

                    <button
                        type="button"
                        class="pda-management-close"
                        data-pda-close
                        aria-label="Cerrar"
                    >
                        ×
                    </button>
                </div>

            </div>


            <div class="pda-management-context">

                <span>
                    <strong>Quiebre:</strong>
                    ${escapeHtml(
        contexto.quiebre
    )}
                </span>

                <span>
                    <strong>Campaña(s):</strong>
                    ${escapeHtml(
        contexto.campanas
    )}
                </span>

                <span>
                    <strong>Matriz:</strong>
                    ${escapeHtml(
        contexto.matriz
    )}
                </span>

                <span>
                    <strong>Versión:</strong>
                    ${escapeHtml(
        contexto.version
    )}
                </span>

            </div>

        </header>
    `;
}


function renderizarResumenGestionPda(
    pda
) {
    const cicloNumero =
        pda?.ciclo_basal_numero ??
        pda?.ciclo?.numero ??
        pda?.ciclo?.ciclo ??
        pda?.numero_ciclo ??
        '—';


    const promedio =
        Number(
            pda?.promedio_basal ??
            pda?.promedio_nota ??
            pda?.promedio ??
            0
        );


    const cuartil =
        pda?.cuartil_basal ??
        pda?.cuartil ??
        '—';


    const acciones =
        Array.isArray(
            pda?.acciones
        )
            ? pda.acciones
            : [];


    /*
     * En esta vista usamos el número de acciones
     * persistidas como referencia operativa.
     * El total de incumplimientos del informe
     * histórico lo trataremos aparte.
     */
    const totalAcciones =
        acciones.length;


    return `
        <section class="pda-management-summary">

            <article>
                <span>Ciclo basal</span>
                <strong>
                    #${escapeHtml(
        cicloNumero
    )}
                </strong>
            </article>

            <article>
                <span>Resultado basal</span>
                <strong>
                    ${promedio.toFixed(1)}%
                </strong>
            </article>

            <article>
                <span>Cuartil</span>
                <strong>
                    ${escapeHtml(
        cuartil
    )}
                </strong>
            </article>

            <article>
                <span>Inicio ciclo</span>
                <strong>
                    ${escapeHtml(
        formatearFechaPdaDashboard(
            pda?.fecha_inicio_ciclo_basal
        )
    )}
                </strong>
            </article>

            <article>
                <span>Fin ciclo</span>
                <strong>
                    ${escapeHtml(
        formatearFechaPdaDashboard(
            pda?.fecha_fin_ciclo_basal
        )
    )}
                </strong>
            </article>

        </section>
    `;
}


function renderizarEstructuraGestionPda(
    pda,
    contenidoEtapa
) {
    return `
        <div class="pda-management-content">

            ${renderizarCabeceraGestionPda(
                pda
            )}

            ${renderizarTimelineGestionPda(
                pda
            )}

            <div class="pda-management-scroll">

                ${renderizarResumenGestionPda(
                    pda
                )}

                <section
                    class="
                        pda-management-stage
                    "
                >
                    ${contenidoEtapa}
                </section>

            </div>

        </div>
    `;
}

function renderizarTemasFeedbackPda(
    pda
) {
    const acciones =
        Array.isArray(
            pda?.acciones
        )
            ? pda.acciones
            : [];


    /*
     * Feedback trabaja sobre el snapshot original
     * del PDA, pero solo sobre acciones cuya
     * clasificación PDA corresponde a FEEDBACK.
     */
    const accionesFeedback =
        acciones.filter(
            accion =>
                normalizarClasificacionPda(
                    accion
                ).codigo ===
                'FEEDBACK'
        );


    const estructura =
        agruparTemasPda(
            accionesFeedback
        );


    const grupoFeedback =
        estructura.find(
            grupo =>
                grupo.codigo ===
                'FEEDBACK'
        );


    if (
        !grupoFeedback ||
        !Array.isArray(
            grupoFeedback.frentes
        ) ||
        grupoFeedback.frentes.length ===
        0
    ) {
        return `
            <div class="pda-stage-empty">
                No se encontraron submotivos
                clasificados como Feedback
                para este PDA.
            </div>
        `;
    }


    let html =
        '';


    for (
        const frente
        of grupoFeedback.frentes
    ) {
        const atributos =
            Array.isArray(
                frente.atributos
            )
                ? frente.atributos
                : [];


        if (
            atributos.length ===
            0
        ) {
            continue;
        }


        html += `
            <section
                class="pda-feedback-front"
            >

                <div
                    class="pda-feedback-front-title"
                >
                    ${escapeHtml(
            frente.frente
        )}
                </div>
        `;


        for (
            const atributo
            of atributos
        ) {
            const items =
                Array.isArray(
                    atributo.submotivos
                )
                    ? atributo.submotivos
                    : [];


            if (
                items.length ===
                0
            ) {
                continue;
            }


            html += `
                <div
                    class="pda-feedback-attribute"
                >

                    <div
                        class="pda-feedback-attribute-header"
                    >

                        <div>
                            <strong>
                                ${escapeHtml(
                atributo.atributo
            )}
                            </strong>

                            <span>
                                ${items.length}
                                submotivo(s)
                            </span>
                        </div>


                        <button
                            type="button"
                            class="pda-feedback-group-all"
                            onclick="
                                marcarGrupoFeedbackPda(
                                    this,
                                    'trabajado'
                                )
                            "
                        >
                            Marcar todos trabajados
                        </button>

                    </div>


                    <div
                        class="pda-feedback-items"
                    >
            `;


            for (
                const item
                of items
            ) {
                const origen =
                    item.original ||
                    {};


                const accionId =
                    Number(
                        origen.id ??
                        item.id ??
                        0
                    );


                const criterioId =
                    origen.criterio_id ??
                    item.criterio_id ??
                    null;


                const evaluaciones =
                    Array.isArray(
                        origen
                            ?.contexto_snapshot
                            ?.evaluaciones
                    )
                        ? origen
                            .contexto_snapshot
                            .evaluaciones
                        : (
                            origen.evaluacion_id
                                ? [
                                    origen
                                        .evaluacion_id
                                ]
                                : []
                        );


                html += `
                    <div
                        class="pda-feedback-item"
                        data-feedback-item
                        data-accion-id="${accionId}"
                        data-criterio-id="${criterioId ??
                    ''
                    }"
                    >

                        <div
                            class="pda-feedback-item-info"
                        >

                            <strong>
                                ${escapeHtml(
                        item.submotivo
                    )}
                            </strong>

                            <span>
                                ${evaluaciones.length}
                                llamada(s)
                                relacionada(s)
                            </span>

                        </div>


                        <select
                            class="pda-feedback-item-status"
                            onchange="
                                actualizarResumenFeedbackPda()
                            "
                        >
                            <option
                                value="no_trabajado"
                            >
                                No trabajado
                            </option>

                            <option
                                value="trabajado"
                            >
                                Trabajado
                            </option>

                            <option
                                value="parcial"
                            >
                                Parcial
                            </option>
                        </select>

                    </div>
                `;
            }


            html += `
                    </div>
                </div>
            `;
        }


        html += `
            </section>
        `;
    }


    return html;
}

function aplicarAlcanceFeedbackPda(
    estado
) {
    const selects =
        document.querySelectorAll(
            '#modalGestionPDA ' +
            '.pda-feedback-item-status'
        );


    selects.forEach(
        select => {
            select.value =
                estado;
        }
    );


    actualizarResumenFeedbackPda();
}

function mostrarSeleccionFeedbackPda() {
    const detalle =
        document.getElementById(
            'pdaFeedbackDetalleTemas'
        );


    if (!detalle) {
        return;
    }


    detalle.hidden =
        false;


    detalle.scrollIntoView({
        behavior:
            'smooth',

        block:
            'nearest'
    });
}

function marcarGrupoFeedbackPda(
    boton,
    estado
) {
    const grupo =
        boton.closest(
            '.pda-feedback-attribute'
        );


    if (!grupo) {
        return;
    }


    grupo
        .querySelectorAll(
            '.pda-feedback-item-status'
        )
        .forEach(
            select => {
                select.value =
                    estado;
            }
        );


    actualizarResumenFeedbackPda();
}

function actualizarResumenFeedbackPda() {
    const selects =
        Array.from(
            document.querySelectorAll(
                '#modalGestionPDA ' +
                '.pda-feedback-item-status'
            )
        );


    const total =
        selects.length;


    const trabajados =
        selects.filter(
            item =>
                item.value ===
                'trabajado'
        ).length;


    const parciales =
        selects.filter(
            item =>
                item.value ===
                'parcial'
        ).length;


    const noTrabajados =
        selects.filter(
            item =>
                item.value ===
                'no_trabajado'
        ).length;


    const abordados =
        trabajados +
        parciales;


    const porcentaje =
        total > 0
            ? Math.round(
                (
                    abordados /
                    total
                ) *
                100
            )
            : 0;


    const cobertura =
        document.getElementById(
            'pdaFeedbackCobertura'
        );


    const detalle =
        document.getElementById(
            'pdaFeedbackCoberturaDetalle'
        );


    if (cobertura) {
        cobertura.textContent =
            `${porcentaje}%`;
    }


    if (detalle) {
        detalle.textContent =
            (
                `${abordados} de ${total} ` +
                'submotivos abordados · ' +
                `${trabajados} trabajados · ` +
                `${parciales} parciales · ` +
                `${noTrabajados} no trabajados`
            );
    }
}

function obtenerItemsFeedbackPda() {
    return Array.from(
        document.querySelectorAll(
            '#modalGestionPDA ' +
            '[data-feedback-item]'
        )
    )
        .map(
            elemento => {

                const select =
                    elemento
                        .querySelector(
                            '.pda-feedback-item-status'
                        );


                return {
                    accion_id:
                        Number(
                            elemento
                                .dataset
                                .accionId
                        ),

                    criterio_id:
                        elemento
                            .dataset
                            .criterioId
                            ? Number(
                                elemento
                                    .dataset
                                    .criterioId
                            )
                            : null,

                    estado:
                        select?.value ||
                        'no_trabajado'
                };
            }
        )
        .filter(
            item =>
                Number.isInteger(
                    item.accion_id
                ) &&
                item.accion_id >
                0
        );
}

function renderizarModalFeedback(
    pda
) {
    const fechaNotificacion =
        pda?.fecha_notificacion_gestor
            ? formatearFechaPdaDashboard(
                pda.fecha_notificacion_gestor
            )
            : 'No registrada';


    const notificadoPor =
        pda?.notificado_por ??
        'No registrado';


    const fechaHoy =
        new Date()
            .toISOString()
            .slice(
                0,
                10
            );


    const usuarioActual =
        window?.usuarioActual?.nombre_completo ??
        window?.usuarioActual?.nombre ??
        '';


    const contenido = `
        <div class="pda-stage-header">

            <div>
                <span class="pda-stage-kicker">
                    ETAPA ACTUAL
                </span>

                <h3>
                    Registrar feedback
                </h3>

                <p>
                    El gestor ya fue notificado.
                    Ahora corresponde registrar formalmente
                    el feedback realizado y dejar trazabilidad
                    mediante el código GESCOT.
                </p>
            </div>

        </div>


        <div class="pda-stage-grid">

            <article class="pda-stage-card">

                <h4>
                    Notificación registrada
                </h4>

                <div class="pda-stage-data">

                    <div>
                        <span>
                            Fecha de notificación
                        </span>

                        <strong>
                            ${escapeHtml(
        fechaNotificacion
    )}
                        </strong>
                    </div>


                    <div>
                        <span>
                            Notificado por
                        </span>

                        <strong>
                            ${escapeHtml(
        notificadoPor
    )}
                        </strong>
                    </div>

                </div>

            </article>


            <article class="pda-stage-card">

                <h4>
                    Objetivo de esta etapa
                </h4>

                <p>
                    Registrar la reunión o sesión de feedback
                    realizada con el gestor y dejar evidencia
                    del tratamiento aplicado antes de iniciar
                    el seguimiento.
                </p>

            </article>

        </div>

        <article
            class="
                pda-stage-card
                pda-stage-card-wide
            "
        >

            <div
                class="pda-stage-card-title"
            >
                <div>
                    <h4>
                        Temas trabajados en el feedback
                    </h4>

                    <p>
                        Registra de forma rápida qué
                        submotivos fueron abordados con
                        el gestor.
                    </p>
                </div>
            </div>


            <div
                class="pda-feedback-quick-actions"
            >

                <button
                    type="button"
                    class="pda-feedback-quick primary"
                    onclick="
                        aplicarAlcanceFeedbackPda(
                            'trabajado'
                        )
                    "
                >
                    ✓ Trabajé todos
                </button>


                <button
                    type="button"
                    class="pda-feedback-quick"
                    onclick="
                        mostrarSeleccionFeedbackPda()
                    "
                >
                    Seleccionar temas
                </button>


                <button
                    type="button"
                    class="pda-feedback-quick"
                    onclick="
                        aplicarAlcanceFeedbackPda(
                            'no_trabajado'
                        )
                    "
                >
                    Ningún tema específico
                </button>

            </div>


            <div
                class="pda-feedback-coverage"
            >

                <div>
                    <span>
                        Cobertura del feedback
                    </span>

                    <strong
                        id="pdaFeedbackCobertura"
                    >
                        0%
                    </strong>
                </div>


                <small
                    id="pdaFeedbackCoberturaDetalle"
                >
                </small>

            </div>


            <div
                id="pdaFeedbackDetalleTemas"
                class="pda-feedback-detail"
            >

                ${renderizarTemasFeedbackPda(
        pda
    )}

            </div>

        </article>

        <article
            class="pda-stage-card pda-stage-card-wide"
        >

            <h4>
                Datos del feedback
            </h4>


            <div class="pda-notification-form">

                <div class="pda-field">

                    <label for="gescotFeedback">
                        Código GESCOT
                        <span>*</span>
                    </label>

                    <input
                        type="text"
                        id="gescotFeedback"
                        placeholder="Ingrese código GESCOT"
                        autocomplete="off"
                        required
                    >

                </div>


                <div class="pda-field">

                    <label for="fechaFeedback">
                        Fecha del feedback
                        <span>*</span>
                    </label>

                    <input
                        type="date"
                        id="fechaFeedback"
                        value="${escapeHtml(
        fechaHoy
    )}"
                        required
                    >

                </div>


                <div class="pda-field pda-field-full">

                    <label for="supervisorFeedback">
                        Supervisor que realizó el feedback
                        <span>*</span>
                    </label>

                    <input
                        type="text"
                        id="supervisorFeedback"
                        value="${escapeHtml(
        usuarioActual
    )}"
                        placeholder="Nombre del supervisor"
                        required
                    >

                </div>


                <div class="pda-field pda-field-full">

                    <label for="observacionesFeedback">
                        Observaciones del feedback

                        <small>
                            Opcional
                        </small>
                    </label>

                    <textarea
                        id="observacionesFeedback"
                        rows="4"
                        placeholder="Detalle del feedback realizado, acuerdos, compromisos u observaciones relevantes..."
                    ></textarea>

                </div>

            </div>


            <div class="pda-stage-note">

                El código GESCOT es obligatorio para
                garantizar la trazabilidad del feedback.

                Al registrar esta etapa, el PDA pasará a
                <strong>Seguimiento</strong>.

            </div>

        </article>


        <footer class="pda-stage-footer">

            <button
                type="button"
                class="pda-secondary-button"
                data-pda-close
            >
                Cancelar
            </button>


            <button
                type="button"
                class="pda-primary-button"
                onclick="registrarFeedbackYEnviarSeguimiento(${Number(
        pda?.id || 0
    )})"
            >
                Registrar feedback y enviar a seguimiento
            </button>

        </footer>
    `;


    return renderizarEstructuraGestionPda(
        pda,
        contenido
    );
}

async function registrarFeedbackYEnviarSeguimiento(
    pdaId
) {
    const id =
        Number(
            pdaId
        );


    // ==================================================
    // 1. VALIDAR PDA
    // ==================================================

    if (
        !Number.isInteger(
            id
        ) ||
        id <= 0
    ) {
        alert(
            '❌ El ID del PDA no es válido.'
        );

        return;
    }


    // ==================================================
    // 2. OBTENER CAMPOS DEL FORMULARIO
    // ==================================================

    const gescot =
        document
            .getElementById(
                'gescotFeedback'
            )
            ?.value
            ?.trim() ||
        '';


    const fecha =
        document
            .getElementById(
                'fechaFeedback'
            )
            ?.value ||
        '';


    const supervisor =
        document
            .getElementById(
                'supervisorFeedback'
            )
            ?.value
            ?.trim() ||
        '';


    const observaciones =
        document
            .getElementById(
                'observacionesFeedback'
            )
            ?.value
            ?.trim() ||
        '';


    // ==================================================
    // 3. VALIDACIONES DEL FORMULARIO
    // ==================================================

    if (!gescot) {

        alert(
            '⚠️ El código GESCOT es obligatorio para registrar el feedback.'
        );


        document
            .getElementById(
                'gescotFeedback'
            )
            ?.focus();


        return;
    }


    if (!fecha) {

        alert(
            '⚠️ Debe registrar la fecha del feedback.'
        );


        document
            .getElementById(
                'fechaFeedback'
            )
            ?.focus();


        return;
    }


    if (!supervisor) {

        alert(
            '⚠️ Debe registrar quién realizó el feedback.'
        );


        document
            .getElementById(
                'supervisorFeedback'
            )
            ?.focus();


        return;
    }


    // ==================================================
    // 4. VALIDAR API
    // ==================================================

    if (
        typeof API?.registrarFeedbackPDA !==
        'function'
    ) {
        alert(
            '❌ API.registrarFeedbackPDA no está disponible.'
        );

        return;
    }


    // ==================================================
    // 5. OBTENER TEMAS TRABAJADOS
    // ==================================================

    let items =
        [];


    if (
        typeof obtenerItemsFeedbackPda ===
        'function'
    ) {
        items =
            obtenerItemsFeedbackPda();
    }


    if (
        !Array.isArray(
            items
        )
    ) {
        items =
            [];
    }


    // ==================================================
    // 6. VALIDAR QUE EXISTAN ITEMS DEL PDA
    // ==================================================

    if (
        items.length ===
        0
    ) {
        const continuar =
            window.confirm(
                'No se encontraron submotivos marcados para este feedback.\n\n' +
                '¿Desea registrar el feedback de todas formas?'
            );


        if (!continuar) {
            return;
        }
    }


    // ==================================================
    // 7. RESUMEN DE COBERTURA
    // ==================================================

    const total =
        items.length;


    const trabajados =
        items.filter(
            item =>
                item.estado ===
                'trabajado'
        ).length;


    const parciales =
        items.filter(
            item =>
                item.estado ===
                'parcial'
        ).length;


    const noTrabajados =
        items.filter(
            item =>
                item.estado ===
                'no_trabajado'
        ).length;


    const abordados =
        trabajados +
        parciales;


    const porcentajeCobertura =
        total > 0
            ? Math.round(
                (
                    abordados /
                    total
                ) *
                100
            )
            : 0;


    // ==================================================
    // 8. CONFIRMACIÓN SI QUEDAN TEMAS SIN TRABAJAR
    // ==================================================

    if (
        total > 0 &&
        noTrabajados > 0
    ) {
        const continuar =
            window.confirm(
                `El feedback tiene ${noTrabajados} submotivo(s) marcado(s) como no trabajado(s).\n\n` +
                `Cobertura registrada: ${porcentajeCobertura}%.\n\n` +
                '¿Desea continuar y registrar el feedback?'
            );


        if (!continuar) {
            return;
        }
    }


    // ==================================================
    // 9. BLOQUEAR BOTÓN DURANTE EL GUARDADO
    // ==================================================

    const boton =
        document.querySelector(
            '#modalGestionPDA ' +
            '.pda-stage-footer ' +
            '.pda-primary-button'
        );


    const textoOriginal =
        boton?.textContent ||
        'Registrar feedback';


    try {

        if (boton) {

            boton.disabled =
                true;


            boton.textContent =
                'Registrando...';
        }


        // ==================================================
        // 10. PREPARAR PAYLOAD
        // ==================================================

        const payload =
        {
            gescot,

            fecha_feedback:
                fecha,

            supervisor,

            observaciones,

            items
        };


        // ==================================================
        // 11. REGISTRAR FEEDBACK VÍA API
        // ==================================================

        const respuesta =
            await API
                .registrarFeedbackPDA(
                    id,
                    payload
                );


        // ==================================================
        // 12. VALIDAR RESPUESTA
        // ==================================================

        if (
            respuesta?.success ===
            false
        ) {
            throw new Error(
                respuesta?.error ||
                'No se pudo registrar el feedback.'
            );
        }


        const resultado =
            respuesta?.data ??
            respuesta;


        // ==================================================
        // 13. MENSAJE DE CONFIRMACIÓN
        // ==================================================

        const resumenServidor =
            resultado?.feedback ||
            {};


        const totalFinal =
            Number(
                resumenServidor?.total ??
                total
            );


        const trabajadosFinal =
            Number(
                resumenServidor?.trabajados ??
                trabajados
            );


        const parcialesFinal =
            Number(
                resumenServidor?.parciales ??
                parciales
            );


        const noTrabajadosFinal =
            Number(
                resumenServidor?.no_trabajados ??
                noTrabajados
            );


        alert(
            '✅ Feedback registrado correctamente.\n\n' +

            `GESCOT: ${gescot}\n` +

            `Supervisor: ${supervisor}\n\n` +

            `Submotivos: ${totalFinal}\n` +

            `Trabajados: ${trabajadosFinal}\n` +

            `Parciales: ${parcialesFinal}\n` +

            `No trabajados: ${noTrabajadosFinal}\n\n` +

            'El PDA continuará en la etapa de seguimiento.'
        );


        // ==================================================
        // 14. CERRAR MODAL ACTUAL
        // ==================================================

        if (
            typeof cerrarModalGestionPDA ===
            'function'
        ) {
            cerrarModalGestionPDA();
        }


        // ==================================================
        // 15. REFRESCAR BANDEJA PDA
        // ==================================================

        if (
            typeof cargarDatosPDA ===
            'function'
        ) {
            await cargarDatosPDA();

        } else if (
            typeof renderizarPdaDashboard ===
            'function'
        ) {
            await renderizarPdaDashboard();
        }


        // ==================================================
        // 16. ABRIR NUEVA ETAPA
        // ==================================================

        if (
            typeof abrirGestionPDA ===
            'function'
        ) {
            await abrirGestionPDA(
                id
            );
        }


    } catch (error) {

        console.error(
            '❌ Error registrando feedback PDA:',
            error
        );


        alert(
            '❌ Error al registrar feedback:\n\n' +
            (
                error?.message ||
                'Error desconocido.'
            )
        );


    } finally {

        // ==================================================
        // 17. RESTAURAR BOTÓN
        // ==================================================

        if (
            boton &&
            document.body.contains(
                boton
            )
        ) {
            boton.disabled =
                false;


            boton.textContent =
                textoOriginal;
        }
    }
}

function renderizarModalRequiereCapacitacion(
    pda
) {
    const acciones =
        Array.isArray(
            pda?.acciones
        )
            ? pda.acciones
            : [];


    const accionesPendientes =
        acciones.filter(
            accion =>
                accion.completado !==
                true
        );


    const fechaFeedback =
        pda?.fecha_feedback
            ? formatearFechaPdaDashboard(
                pda.fecha_feedback
            )
            : '—';


    const fechaDerivacion =
        pda?.fecha_envio_capacitacion
            ? formatearFechaPdaDashboard(
                pda.fecha_envio_capacitacion
            )
            : '—';


    const enviadoPor =
        pda?.enviado_por ||
        '—';


    const gescotFeedback =
        pda?.gescot_reunion ||
        '—';


    const itemsHtml =
        accionesPendientes.length > 0
            ? accionesPendientes
                .map(
                    accion => `
                        <label
                            class="
                                pda-training-item
                            "
                        >
                            <input
                                type="checkbox"
                                class="
                                    item-capacitacion
                                "
                                value="${Number(
                        accion.id ||
                        0
                    )}"
                                checked
                            >

                            <div
                                class="
                                    pda-training-item-content
                                "
                            >
                                <strong>
                                    ${escapeHtml(
                        accion.submotivo ||
                        accion.criterio ||
                        'Sin criterio'
                    )}
                                </strong>

                                ${accion.atributo
                            ? `
                                            <span>
                                                ${escapeHtml(
                                accion.atributo
                            )}
                                            </span>
                                        `
                            : ''
                        }

                                ${accion.frente
                            ? `
                                            <small>
                                                ${escapeHtml(
                                accion.frente
                            )}
                                            </small>
                                        `
                            : ''
                        }
                            </div>
                        </label>
                    `
                )
                .join('')
            : `
                <div class="pda-stage-note">
                    No existen criterios pendientes
                    registrados para capacitación.
                </div>
            `;


    const contenido = `

        <div class="pda-stage-header">

            <div>
                <span class="pda-stage-kicker">
                    ETAPA ACTUAL
                </span>

                <h3>
                    Capacitación
                </h3>

                <p>
                    El seguimiento detectó persistencia
                    y el supervisor decidió realizar una
                    intervención formativa adicional.
                </p>
            </div>

        </div>


        <div class="pda-stage-grid">

            <article class="pda-stage-card">

                <div class="pda-stage-card-title">
                    <div>
                        <h4>
                            Antecedente
                        </h4>

                        <p>
                            Información que motivó la
                            derivación a capacitación.
                        </p>
                    </div>
                </div>


                <div class="pda-tracking-main-metrics">

                    <div class="pda-stage-metric">
                        <span>
                            Ciclo basal
                        </span>

                        <strong>
                            #${escapeHtml(
        pda
            ?.ciclo_basal_numero ??
        '—'
    )}
                        </strong>
                    </div>


                    <div class="pda-stage-metric">
                        <span>
                            Resultado basal
                        </span>

                        <strong>
                            ${Number(
        pda
            ?.promedio_basal ||
        0
    ).toFixed(
        1
    )}%
                        </strong>
                    </div>


                    <div class="pda-stage-metric">
                        <span>
                            Cuartil basal
                        </span>

                        <strong>
                            ${escapeHtml(
        pda
            ?.cuartil_basal ||
        '—'
    )}
                        </strong>
                    </div>


                    <div class="pda-stage-metric">
                        <span>
                            Feedback
                        </span>

                        <strong>
                            ${escapeHtml(
        fechaFeedback
    )}
                        </strong>
                    </div>

                </div>

            </article>


            <article class="pda-stage-card">

                <div class="pda-stage-card-title">
                    <div>
                        <h4>
                            Derivación
                        </h4>

                        <p>
                            Trazabilidad de la decisión
                            tomada por el supervisor.
                        </p>
                    </div>
                </div>


                <div class="pda-tracking-main-metrics">

                    <div class="pda-stage-metric">
                        <span>
                            Fecha
                        </span>

                        <strong>
                            ${escapeHtml(
        fechaDerivacion
    )}
                        </strong>
                    </div>


                    <div class="pda-stage-metric">
                        <span>
                            Derivado por
                        </span>

                        <strong>
                            ${escapeHtml(
        enviadoPor
    )}
                        </strong>
                    </div>


                    <div class="pda-stage-metric">
                        <span>
                            GESCOT feedback
                        </span>

                        <strong>
                            ${escapeHtml(
        gescotFeedback
    )}
                        </strong>
                    </div>


                    <div class="pda-stage-metric">
                        <span>
                            Temas pendientes
                        </span>

                        <strong>
                            ${accionesPendientes.length}
                        </strong>
                    </div>

                </div>

            </article>

        </div>


        <article
            class="
                pda-stage-card
                pda-stage-card-wide
            "
        >

            <div class="pda-stage-card-title">

                <div>
                    <h4>
                        Temas a trabajar
                    </h4>

                    <p>
                        Marca los criterios efectivamente
                        abordados durante la capacitación.
                    </p>
                </div>

            </div>


            <div class="pda-training-toolbar">

                <button
                    type="button"
                    class="pda-secondary-button"
                    onclick="
                        seleccionarTodosItemsCapacitacionPDA(
                            true
                        )
                    "
                >
                    Marcar todos
                </button>


                <button
                    type="button"
                    class="pda-secondary-button"
                    onclick="
                        seleccionarTodosItemsCapacitacionPDA(
                            false
                        )
                    "
                >
                    Limpiar
                </button>

            </div>


            <div class="pda-training-items">
                ${itemsHtml}
            </div>

        </article>


        <article
            class="
                pda-stage-card
                pda-stage-card-wide
            "
        >

            <div class="pda-stage-card-title">

                <div>
                    <h4>
                        Registro de capacitación
                    </h4>

                    <p>
                        Completa los datos que dejarán
                        evidencia formal de la sesión.
                    </p>
                </div>

            </div>


            <div class="pda-training-form-grid">

                <div class="pda-form-field">

                    <label for="fechaCapacitacion">
                        Fecha de capacitación
                    </label>

                    <input
                        id="fechaCapacitacion"
                        type="date"
                        value="${new Date()
            .toISOString()
            .slice(
                0,
                10
            )
        }"
                    >

                </div>


                <div class="pda-form-field">

                    <label for="capacitador">
                        Capacitador
                    </label>

                    <input
                        id="capacitador"
                        type="text"
                        placeholder="
                            Nombre del capacitador
                        "
                    >

                </div>


                <div class="pda-form-field">

                    <label for="gescotCapacitacion">
                        Código GESCOT
                    </label>

                    <input
                        id="gescotCapacitacion"
                        type="text"
                        placeholder="
                            Código de trazabilidad
                        "
                    >

                </div>

            </div>


            <div class="pda-form-field">

                <label for="observacionesCapacitacion">
                    Observaciones
                </label>

                <textarea
                    id="observacionesCapacitacion"
                    rows="4"
                    placeholder="
                        Detalles relevantes de la capacitación...
                    "
                ></textarea>

            </div>


            <div class="pda-stage-note">

                Al registrar la capacitación,
                MECA abrirá una

                <strong>
                    nueva frontera de seguimiento.
                </strong>

                Solo los ciclos iniciados después
                de esta intervención podrán medir
                su efectividad.

            </div>

        </article>


        <footer class="pda-stage-footer">

            <button
                type="button"
                class="pda-secondary-button"
                data-pda-close
            >
                Cancelar
            </button>


            <button
                type="button"
                class="pda-primary-button"
                onclick="
                    guardarGestionCapacitacion(
                        ${Number(
            pda?.id ||
            0
        )}
                    )
                "
            >
                Registrar capacitación
                y volver a seguimiento
            </button>

        </footer>
    `;


    return renderizarEstructuraGestionPda(
        pda,
        contenido
    );
}

function renderizarModalRequiereCapacitacion(
    pda
) {
    const acciones =
        Array.isArray(
            pda?.acciones
        )
            ? pda.acciones
            : [];


    const accionesPendientes =
        acciones.filter(
            accion =>
                accion.completado !==
                true
        );


    const fechaFeedback =
        pda?.fecha_feedback
            ? formatearFechaPdaDashboard(
                pda.fecha_feedback
            )
            : '—';


    const fechaDerivacion =
        pda?.fecha_envio_capacitacion
            ? formatearFechaPdaDashboard(
                pda.fecha_envio_capacitacion
            )
            : '—';


    const enviadoPor =
        pda?.enviado_por ||
        '—';


    const gescotFeedback =
        pda?.gescot_reunion ||
        '—';


    const itemsHtml =
        accionesPendientes.length > 0
            ? accionesPendientes
                .map(
                    accion => `
                        <label
                            class="
                                pda-training-item
                            "
                        >
                            <input
                                type="checkbox"
                                class="
                                    item-capacitacion
                                "
                                value="${Number(
                        accion.id ||
                        0
                    )}"
                                checked
                            >

                            <div
                                class="
                                    pda-training-item-content
                                "
                            >
                                <strong>
                                    ${escapeHtml(
                        accion.submotivo ||
                        accion.criterio ||
                        'Sin criterio'
                    )}
                                </strong>

                                ${accion.atributo
                            ? `
                                            <span>
                                                ${escapeHtml(
                                accion.atributo
                            )}
                                            </span>
                                        `
                            : ''
                        }

                                ${accion.frente
                            ? `
                                            <small>
                                                ${escapeHtml(
                                accion.frente
                            )}
                                            </small>
                                        `
                            : ''
                        }
                            </div>
                        </label>
                    `
                )
                .join('')
            : `
                <div class="pda-stage-note">
                    No existen criterios pendientes
                    registrados para capacitación.
                </div>
            `;


    const contenido = `

        <div class="pda-stage-header">

            <div>
                <span class="pda-stage-kicker">
                    ETAPA ACTUAL
                </span>

                <h3>
                    Capacitación
                </h3>

                <p>
                    El seguimiento detectó persistencia
                    y el supervisor decidió realizar una
                    intervención formativa adicional.
                </p>
            </div>

        </div>


        <div class="pda-stage-grid">

            <article class="pda-stage-card">

                <div class="pda-stage-card-title">
                    <div>
                        <h4>
                            Antecedente
                        </h4>

                        <p>
                            Información que motivó la
                            derivación a capacitación.
                        </p>
                    </div>
                </div>


                <div class="pda-tracking-main-metrics">

                    <div class="pda-stage-metric">
                        <span>
                            Ciclo basal
                        </span>

                        <strong>
                            #${escapeHtml(
        pda
            ?.ciclo_basal_numero ??
        '—'
    )}
                        </strong>
                    </div>


                    <div class="pda-stage-metric">
                        <span>
                            Resultado basal
                        </span>

                        <strong>
                            ${Number(
        pda
            ?.promedio_basal ||
        0
    ).toFixed(
        1
    )}%
                        </strong>
                    </div>


                    <div class="pda-stage-metric">
                        <span>
                            Cuartil basal
                        </span>

                        <strong>
                            ${escapeHtml(
        pda
            ?.cuartil_basal ||
        '—'
    )}
                        </strong>
                    </div>


                    <div class="pda-stage-metric">
                        <span>
                            Feedback
                        </span>

                        <strong>
                            ${escapeHtml(
        fechaFeedback
    )}
                        </strong>
                    </div>

                </div>

            </article>


            <article class="pda-stage-card">

                <div class="pda-stage-card-title">
                    <div>
                        <h4>
                            Derivación
                        </h4>

                        <p>
                            Trazabilidad de la decisión
                            tomada por el supervisor.
                        </p>
                    </div>
                </div>


                <div class="pda-tracking-main-metrics">

                    <div class="pda-stage-metric">
                        <span>
                            Fecha
                        </span>

                        <strong>
                            ${escapeHtml(
        fechaDerivacion
    )}
                        </strong>
                    </div>


                    <div class="pda-stage-metric">
                        <span>
                            Derivado por
                        </span>

                        <strong>
                            ${escapeHtml(
        enviadoPor
    )}
                        </strong>
                    </div>


                    <div class="pda-stage-metric">
                        <span>
                            GESCOT feedback
                        </span>

                        <strong>
                            ${escapeHtml(
        gescotFeedback
    )}
                        </strong>
                    </div>


                    <div class="pda-stage-metric">
                        <span>
                            Temas pendientes
                        </span>

                        <strong>
                            ${accionesPendientes.length}
                        </strong>
                    </div>

                </div>

            </article>

        </div>


        <article
            class="
                pda-stage-card
                pda-stage-card-wide
            "
        >

            <div class="pda-stage-card-title">

                <div>
                    <h4>
                        Temas a trabajar
                    </h4>

                    <p>
                        Marca los criterios efectivamente
                        abordados durante la capacitación.
                    </p>
                </div>

            </div>


            <div class="pda-training-toolbar">

                <button
                    type="button"
                    class="pda-secondary-button"
                    onclick="
                        seleccionarTodosItemsCapacitacionPDA(
                            true
                        )
                    "
                >
                    Marcar todos
                </button>


                <button
                    type="button"
                    class="pda-secondary-button"
                    onclick="
                        seleccionarTodosItemsCapacitacionPDA(
                            false
                        )
                    "
                >
                    Limpiar
                </button>

            </div>


            <div class="pda-training-items">
                ${itemsHtml}
            </div>

        </article>


        <article
            class="
                pda-stage-card
                pda-stage-card-wide
            "
        >

            <div class="pda-stage-card-title">

                <div>
                    <h4>
                        Registro de capacitación
                    </h4>

                    <p>
                        Completa los datos que dejarán
                        evidencia formal de la sesión.
                    </p>
                </div>

            </div>


            <div class="pda-training-form-grid">

                <div class="pda-form-field">

                    <label for="fechaCapacitacion">
                        Fecha de capacitación
                    </label>

                    <input
                        id="fechaCapacitacion"
                        type="date"
                        value="${new Date()
            .toISOString()
            .slice(
                0,
                10
            )
        }"
                    >

                </div>


                <div class="pda-form-field">

                    <label for="capacitador">
                        Capacitador
                    </label>

                    <input
                        id="capacitador"
                        type="text"
                        placeholder="
                            Nombre del capacitador
                        "
                    >

                </div>


                <div class="pda-form-field">

                    <label for="gescotCapacitacion">
                        Código GESCOT
                    </label>

                    <input
                        id="gescotCapacitacion"
                        type="text"
                        placeholder="
                            Código de trazabilidad
                        "
                    >

                </div>

            </div>


            <div class="pda-form-field">

                <label for="observacionesCapacitacion">
                    Observaciones
                </label>

                <textarea
                    id="observacionesCapacitacion"
                    rows="4"
                    placeholder="
                        Detalles relevantes de la capacitación...
                    "
                ></textarea>

            </div>


            <div class="pda-stage-note">

                Al registrar la capacitación,
                MECA abrirá una

                <strong>
                    nueva frontera de seguimiento.
                </strong>

                Solo los ciclos iniciados después
                de esta intervención podrán medir
                su efectividad.

            </div>

        </article>


        <footer class="pda-stage-footer">

            <button
                type="button"
                class="pda-secondary-button"
                data-pda-close
            >
                Cancelar
            </button>


            <button
                type="button"
                class="pda-primary-button"
                onclick="
                    guardarGestionCapacitacion(
                        ${Number(
            pda?.id ||
            0
        )}
                    )
                "
            >
                Registrar capacitación
                y volver a seguimiento
            </button>

        </footer>
    `;


    return renderizarEstructuraGestionPda(
        pda,
        contenido
    );
}

async function enviarACapacitacion(pdaId) {
    if (!confirm(`⚠️ ¿Enviar este PDA a Capacitación?\n\nEl PDA pasará a estado "Enviado a Capacitación".`)) {
        return;
    }

    try {
        const db = getDB();
        if (!db) {
            alert('❌ Base de datos no disponible');
            return;
        }

        const { data: pda, error: fetchError } = await db
            .from('pda_cabecera')
            .select('*')
            .eq('id', pdaId)
            .single();

        if (fetchError) throw fetchError;

        // 🔴 OBTENER QUIÉN ESTÁ REALIZANDO LA ACCIÓN
        const persona = window.usuarioActual?.nombre_completo ||
            window.usuarioActual?.usuario ||
            prompt('Ingrese su nombre para registrar el envío a Capacitación:') ||
            'Operaciones';

        await db
            .from('pda_cabecera')
            .update({
                estado: 'enviado_capacitacion',
                fecha_envio_capacitacion: new Date().toISOString().split('T')[0],
                enviado_por: persona,
                updated_at: new Date().toISOString()
            })
            .eq('id', pdaId);

        // 🔴 REGISTRAR EVENTO CON LA PERSONA
        await registrarEventoPDA(pdaId, 'enviado_capacitacion', {
            fecha_envio: new Date().toISOString().split('T')[0],
            enviado_por: persona
        }, persona);

        alert(`✅ PDA enviado a Capacitación correctamente\n\n👤 Enviado por: ${persona}`);

        cerrarModalGestionPDA();
        await cargarDatosPDA();

    } catch (error) {
        console.error('Error:', error);
        alert('❌ Error al enviar a Capacitación: ' + error.message);
    }
}

function renderizarModalReiterativo(pda) {
    const fechaDeteccion = formatearFechaPeru(pda.fecha_deteccion);
    const promedioBasal = pda.promedio_basal || 'Pendiente';
    const fechaInicioCiclo = formatearFechaPeru(pda.fecha_inicio_ciclo_basal);
    const fechaFinCiclo = formatearFechaPeru(pda.fecha_fin_ciclo_basal);
    const fechaNotificacion = pda.fecha_notificacion_gestor ? formatearFechaPeru(pda.fecha_notificacion_gestor) : 'No registrada';
    const notificadoPor = pda.notificado_por || 'No registrado';
    const gescotReunion = pda.gescot_reunion || 'No registrado';
    const gescotCapacitacion = pda.gescot_capacitacion || 'No registrado';
    const fechaCapacitacion = pda.fecha_capacitacion ? formatearFechaPeru(pda.fecha_capacitacion) : 'No registrada';
    const capacitador = pda.capacitador || 'No registrado';

    return `
            <div class="modal-gestion-content">
                <div class="modal-gestion-header" style="background: linear-gradient(135deg, #d93025, #b71c1c);">
                    <strong>🔄 Reiterativo - ${escapeHtml(pda.agente)}</strong>
                    <button onclick="cerrarModalGestionPDA()" style="background: rgba(255,255,255,0.2); border: none; color: white; font-size: 20px; cursor: pointer; width: 32px; height: 32px; border-radius: 50%;">✖</button>
                </div>
                <div class="modal-gestion-body">
                    <div style="background: #ffebee; padding: 12px; border-radius: 8px; margin-bottom: 15px; border-left: 4px solid #d93025;">
                        <strong>🚨 CASO REITERATIVO:</strong> El gestor NO logró salir de Q4 después de la capacitación formal.
                        <br><small style="color: var(--danger);">Requiere escalamiento a Gerencia para evaluación de continuidad.</small>
                    </div>

                    <!-- Historial completo del PDA -->
                    <div class="info-box" style="background: #f0f7ff; padding: 12px; border-radius: 10px; margin-bottom: 20px;">
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                            <div><strong>👤 Gestor:</strong></div>
                            <div><strong>${escapeHtml(pda.agente)}</strong></div>
                            <div><strong>📅 Fecha detección:</strong></div>
                            <div>${fechaDeteccion}</div>
                            <div><strong>📊 Ciclo basal:</strong></div>
                            <div>${fechaInicioCiclo} → ${fechaFinCiclo}</div>
                            <div><strong>📈 Promedio basal:</strong></div>
                            <div>${promedioBasal}%</div>
                            <div><strong>📅 Notificación:</strong></div>
                            <div>${fechaNotificacion}</div>
                            <div><strong>👤 Notificado por:</strong></div>
                            <div>${notificadoPor}</div>
                            <div><strong>🔑 GESCOT Reunión:</strong></div>
                            <div><strong style="color: #7b1fa2;">${gescotReunion}</strong></div>
                            <div><strong>📅 Capacitación:</strong></div>
                            <div>${fechaCapacitacion}</div>
                            <div><strong>👤 Capacitador:</strong></div>
                            <div>${capacitador}</div>
                            <div><strong>🔑 GESCOT Capacitación:</strong></div>
                            <div><strong style="color: #7b1fa2;">${gescotCapacitacion}</strong></div>
                        </div>
                    </div>

                    <div style="border-top: 1px solid #e0e0e0; padding-top: 20px;">
                        <h4>📌 Resumen de Acciones Realizadas</h4>
                        <ul style="margin-top: 10px; padding-left: 20px;">
                            <li>✅ Reunión 1:1 con gestor (${fechaNotificacion})</li>
                            <li>✅ Feedback registrado con GESCOT: ${gescotReunion}</li>
                            <li>✅ Capacitación formal (${fechaCapacitacion})</li>
                            <li>✅ GESCOT Capacitación: ${gescotCapacitacion}</li>
                            <li style="color: #d93025; font-weight: bold;">❌ El gestor PERSISTE en Q4</li>
                        </ul>

                        <div style="margin-top: 20px; background: #ffebee; padding: 12px; border-radius: 8px; border-left: 4px solid #d93025;">
                            <strong>🚨 ACCIÓN REQUERIDA:</strong>
                            <br>Este caso debe ser <strong>ESCALADO A GERENCIA</strong> para evaluación de continuidad.
                            <br><small>El reporte de reiterativos mensual incluirá este caso automáticamente.</small>
                        </div>
                    </div>
                </div>
                <div class="modal-gestion-footer">
                    <button onclick="cerrarModalGestionPDA()" class="secondary" style="padding: 10px 20px;">Cerrar</button>
                    <button onclick="marcarComoReiterativo(${pda.id})"
                            style="background: #d93025; padding: 10px 20px;">
                        🚨 Marcar como Escalado a Gerencia
                    </button>
                </div>
            </div>
        `;
}

async function marcarComoReiterativo(pdaId) {
    // 🔴 SOLICITAR NOMBRE DE QUIÉN ESCALA
    const nombreEscala = prompt('Ingrese su nombre completo para escalar este caso a Gerencia:');
    if (!nombreEscala || nombreEscala.trim() === '') {
        alert('⚠️ Debe ingresar su nombre para escalar el caso');
        return;
    }

    if (!confirm(`🚨 ¿Marcar este PDA como REITERATIVO y escalar a Gerencia?\n\n👤 Escalado por: ${nombreEscala.trim()}\n\nEsta acción no se puede deshacer.`)) {
        return;
    }

    try {
        const db = getDB();
        if (!db) {
            alert('❌ Base de datos no disponible');
            return;
        }

        const { data: pda, error: fetchError } = await db
            .from('pda_cabecera')
            .select('*')
            .eq('id', pdaId)
            .single();

        if (fetchError) throw fetchError;

        const persona = nombreEscala.trim();

        await db
            .from('pda_cabecera')
            .update({
                estado: 'escalado',
                fecha_escalamiento: new Date().toISOString().split('T')[0],
                escalado_por: persona,
                observaciones_escalamiento: 'Caso reiterativo - Persiste en Q4 después de capacitación formal',
                updated_at: new Date().toISOString()
            })
            .eq('id', pdaId);

        // 🔴 REGISTRAR EVENTO CON LA PERSONA QUE ESCALA
        await registrarEventoPDA(pdaId, 'marcado_reiterativo', {
            escalado_por: persona,
            motivo: 'Persiste en Q4 después de capacitación formal'
        }, persona);

        alert(`🚨 PDA escalado a Gerencia correctamente\n\n👤 Escalado por: ${persona}`);

        cerrarModalGestionPDA();
        await cargarDatosPDA();

    } catch (error) {
        console.error('Error:', error);
        alert('❌ Error al escalar el PDA: ' + error.message);
    }
}

async function verHistorialPDA(pdaId) {
    try {
        const db = getDB();
        if (!db) {
            alert('❌ Base de datos no disponible');
            return;
        }

        const { data: pda, error } = await db
            .from('pda_cabecera')
            .select('agente, historial_estados, estado, created_at, cuartil_basal, promedio_basal')
            .eq('id', pdaId)
            .single();

        if (error) throw error;

        let historial = [];
        try {
            historial = pda.historial_estados || [];
            if (typeof historial === 'string') {
                historial = JSON.parse(historial);
            }
            if (!Array.isArray(historial)) {
                historial = [];
            }
        } catch (e) {
            historial = [];
        }

        if (historial.length === 0) {
            alert(`📋 PDA #${pdaId} - ${pda.agente}\n\nNo hay eventos registrados en el historial.`);
            return;
        }

        // Construir mensaje
        let mensaje = `📋 HISTORIAL COMPLETO - PDA #${pdaId}\n`;
        mensaje += `👤 Agente: ${pda.agente}\n`;
        mensaje += `📊 Estado actual: ${obtenerTextoEstadoPDA(pda.estado)}\n`;
        mensaje += `📅 Creado: ${formatearFechaPeru(pda.created_at)}\n`;
        mensaje += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n\n`;

        // Mostrar eventos en orden cronológico
        const eventosOrdenados = [...historial].sort((a, b) =>
            new Date(a.fecha) - new Date(b.fecha)
        );

        for (let i = 0; i < eventosOrdenados.length; i++) {
            const ev = eventosOrdenados[i];
            const icono = obtenerIconoEvento(ev.evento);
            const eventoNombre = ev.evento.toUpperCase().replace(/_/g, ' ');

            // 🔴 Obtener la persona que realizó la acción (usuario del evento)
            const persona = ev.usuario || 'Sistema';

            mensaje += `${icono} ${eventoNombre}\n`;
            mensaje += `   📅 ${ev.fecha_display || formatearFechaPeru(ev.fecha)}\n`;
            mensaje += `   👤 ${persona}\n`;

            // Mostrar detalles según el evento (sin repetir la persona)
            if (ev.detalle) {
                const d = ev.detalle;

                // Evento: GENERADO
                if (ev.evento === 'generado') {
                    mensaje += `   📊 Ciclo #${d.ciclo || 'N/A'}\n`;
                    mensaje += `   📈 Promedio: ${d.promedio || 'N/A'}%\n`;
                    mensaje += `   📋 Cuartil: ${d.cuartil || 'N/A'}\n`;
                    mensaje += `   📞 Evaluaciones: ${d.total_evaluaciones || 'N/A'}\n`;
                }

                // Evento: NOTIFICADO
                if (ev.evento === 'notificado') {
                    mensaje += `   📅 Fecha notificación: ${d.fecha_notificacion || 'N/A'}\n`;
                    // 🔴 NO mostrar supervisor porque ya está en la línea 👤
                    // Solo mostrar observaciones si existen
                    if (d.observaciones) {
                        mensaje += `   📝 ${d.observaciones}\n`;
                    }
                }

                // Evento: FEEDBACK_REGISTRADO
                if (ev.evento === 'feedback_registrado') {
                    mensaje += `   🔑 GESCOT: ${d.gescot || 'N/A'}\n`;
                    mensaje += `   📅 Fecha: ${d.fecha_feedback || 'N/A'}\n`;
                    // 🔴 NO mostrar supervisor porque ya está en la línea 👤
                    if (d.observaciones) {
                        mensaje += `   📝 ${d.observaciones}\n`;
                    }
                }

                // Evento: ENVIADO_CAPACITACION
                if (ev.evento === 'enviado_capacitacion') {
                    mensaje += `   📅 Fecha envío: ${d.fecha_envio || 'N/A'}\n`;
                    // 🔴 NO mostrar enviado_por porque ya está en la línea 👤
                }

                // Evento: CAPACITACION_REGISTRADA
                if (ev.evento === 'capacitacion_registrada') {
                    mensaje += `   🔑 GESCOT: ${d.gescot || 'N/A'}\n`;
                    mensaje += `   📅 Fecha: ${d.fecha_capacitacion || 'N/A'}\n`;
                    mensaje += `   📋 Items completados: ${d.items_completados || 0}\n`;
                    // 🔴 NO mostrar capacitador porque ya está en la línea 👤
                    if (d.observaciones) {
                        mensaje += `   📝 ${d.observaciones}\n`;
                    }
                }

                // Evento: CERRADO_EXITOSO
                if (ev.evento === 'cerrado_exitoso') {
                    mensaje += `   📊 Cuartil seguimiento: ${d.cuartil_seguimiento || 'N/A'}\n`;
                    mensaje += `   📈 Promedio seguimiento: ${d.promedio_seguimiento ? d.promedio_seguimiento.toFixed(1) : 'N/A'}%\n`;
                    // 🔴 NO mostrar cerrado_por porque ya está en la línea 👤
                }

                // Evento: MARCADO_REITERATIVO
                if (ev.evento === 'marcado_reiterativo') {
                    mensaje += `   📌 ${d.motivo || 'Persiste en Q4'}\n`;
                    // 🔴 NO mostrar escalado_por porque ya está en la línea 👤
                }
            }

            mensaje += `\n`;
        }

        mensaje += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
        mensaje += `📌 Total eventos: ${eventosOrdenados.length}`;

        alert(mensaje);

    } catch (error) {
        console.error('Error en verHistorialPDA:', error);
        alert('❌ Error al cargar el historial: ' + error.message);
    }
}

function obtenerIconoEvento(evento) {
    const iconos = {
        'generado': '🟢',
        'notificado': '📨',
        'feedback_registrado': '💬',
        'enviado_capacitacion': '📤',
        'capacitacion_registrada': '📚',
        'cerrado_exitoso': '🏆',
        'marcado_reiterativo': '🔄',
        'escalado': '🚨'
    };
    return iconos[evento] || '📌';
}


async function guardarGestionCapacitacion(
    pdaId
) {
    const id =
        Number(
            pdaId
        );


    if (
        !Number.isInteger(
            id
        ) ||
        id <= 0
    ) {
        alert(
            '❌ ID de PDA inválido.'
        );

        return;
    }


    const gescot =
        String(
            document
                .getElementById(
                    'gescotCapacitacion'
                )
                ?.value ||
            ''
        ).trim();


    const fecha =
        String(
            document
                .getElementById(
                    'fechaCapacitacion'
                )
                ?.value ||
            ''
        ).trim();


    const capacitador =
        String(
            document
                .getElementById(
                    'capacitador'
                )
                ?.value ||
            ''
        ).trim();


    const observaciones =
        String(
            document
                .getElementById(
                    'observacionesCapacitacion'
                )
                ?.value ||
            ''
        ).trim();


    if (!gescot) {
        alert(
            '⚠️ El código GESCOT es obligatorio.'
        );

        return;
    }


    if (
        !fecha ||
        !capacitador
    ) {
        alert(
            '⚠️ Complete fecha y capacitador.'
        );

        return;
    }


    const seleccionados =
        Array.from(
            document.querySelectorAll(
                '.item-capacitacion:checked'
            )
        );


    const accionIds =
        seleccionados
            .map(
                checkbox =>
                    Number(
                        checkbox.value
                    )
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
        alert(
            '⚠️ Seleccione al menos un ítem trabajado.'
        );

        return;
    }


    try {

        if (
            typeof API
                ?.registrarCapacitacionPDA !==
            'function'
        ) {
            throw new Error(
                'La operación de capacitación no está disponible.'
            );
        }


        await API
            .registrarCapacitacionPDA(
                id,
                {
                    gescot,

                    fecha_capacitacion:
                        fecha,

                    capacitador,

                    observaciones,

                    accion_ids:
                        accionIds
                }
            );


        alert(
            '✅ Capacitación registrada correctamente.\n\n' +

            `GESCOT: ${gescot}\n` +

            `Capacitador: ${capacitador}\n\n` +

            'El PDA vuelve a seguimiento.'
        );


        if (
            typeof cerrarModalGestionPDA ===
            'function'
        ) {
            cerrarModalGestionPDA();
        }


        if (
            typeof cargarDatosPDA ===
            'function'
        ) {
            await cargarDatosPDA();
        }


        if (
            typeof abrirGestionPDA ===
            'function'
        ) {
            await abrirGestionPDA(
                id
            );
        }


    } catch (error) {

        console.error(
            '❌ Error registrando capacitación PDA:',
            error
        );


        alert(
            '❌ No se pudo registrar la capacitación:\n\n' +
            (
                error?.message ||
                'Error desconocido'
            )
        );
    }
}

function renderizarModalEnSeguimiento(
    pda
) {
    const contenido = `
        <div class="pda-stage-header">
            <div>
                <span class="pda-stage-kicker">
                    ETAPA ACTUAL
                </span>

                <h3>
                    Seguimiento de mejora
                </h3>

                <p>
                    MECA compara el ciclo basal con los ciclos
                    posteriores al feedback para identificar
                    evolución, persistencia y nuevos hallazgos.
                </p>
            </div>
        </div>

        <div
            id="pdaSeguimientoContenido"
            class="pda-tracking-content"
        >
            <div class="pda-stage-card">
                <div
                    style="
                        min-height: 180px;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        text-align: center;
                    "
                >
                    <div>
                        <div
                            style="
                                font-size: 28px;
                                margin-bottom: 10px;
                            "
                        >
                            ⏳
                        </div>

                        <strong>
                            Analizando seguimiento...
                        </strong>

                        <p
                            style="
                                margin-top: 6px;
                                color: var(--muted);
                            "
                        >
                            MECA está revisando los ciclos
                            posteriores al feedback.
                        </p>
                    </div>
                </div>
            </div>
        </div>

        <footer class="pda-stage-footer">
            <button
                type="button"
                class="pda-secondary-button"
                data-pda-close
            >
                Cerrar
            </button>
        </footer>
    `;


    return renderizarEstructuraGestionPda(
        pda,
        contenido
    );
}

async function cargarAnalisisSeguimientoPDA(
    pdaId
) {
    const contenedor =
        document.getElementById(
            'pdaSeguimientoContenido'
        );


    if (!contenedor) {
        return;
    }


    if (
        typeof API
            ?.evaluarSeguimientoPDA !==
        'function'
    ) {
        contenedor.innerHTML = `
            <div class="pda-stage-card">
                <div class="pda-stage-note">
                    No está disponible el servicio de
                    evaluación de seguimiento.
                </div>
            </div>
        `;

        return;
    }


    try {

        // ==================================================
        // 1. MOTOR PDA
        // ==================================================

        const analisis =
            await API
                .evaluarSeguimientoPDA(
                    pdaId
                );


        // ==================================================
        // 2. CONTEXTO ACTUAL DEL PDA
        // ==================================================

        const pda =
            window
                .pdaActualGestion
                ?.cabecera ||
            null;


        let ciclosGestor =
            [];


        // ==================================================
        // 3. RECUPERAR CICLOS DESDE GESTORES
        //
        // Solo para enriquecer visualmente la línea
        // de tiempo.
        //
        // La decisión PDA sigue viniendo de
        // evaluateTracking().
        // ==================================================

        if (
            pda &&
            typeof API
                ?.getGestoresResumen ===
            'function'
        ) {
            try {

                const resumenGestores =
                    await API
                        .getGestoresResumen({
                            quiebreId:
                                pda.quiebre_id ||
                                null,

                            campanaId:
                                null,

                            periodo:
                                null
                        });


                const gestores =
                    Array.isArray(
                        resumenGestores
                            ?.gestores
                    )
                        ? resumenGestores
                            .gestores
                        : [];


                const gestor =
                    gestores.find(
                        item =>
                            String(
                                item.agente ||
                                ''
                            ).trim() ===
                            String(
                                pda.agente ||
                                ''
                            ).trim()
                    );


                ciclosGestor =
                    Array.isArray(
                        gestor?.ciclos
                    )
                        ? gestor.ciclos
                        : [];


            } catch (error) {

                /*
                 * La línea de tiempo enriquecida
                 * es complementaria.
                 *
                 * Si falla Gestores, el análisis
                 * PDA debe seguir mostrándose.
                 */

                console.warn(
                    '⚠️ No fue posible enriquecer la línea de tiempo PDA:',
                    error
                );
            }
        }


        // ==================================================
        // 4. RENDER
        // ==================================================

        renderizarAnalisisSeguimientoPDA(
            analisis,
            {
                pda,
                ciclosGestor
            }
        );


    } catch (error) {

        console.error(
            '❌ Error cargando análisis de seguimiento PDA:',
            error
        );


        contenedor.innerHTML = `
            <div class="pda-stage-card">

                <div
                    class="pda-stage-note"
                    style="
                        border-left-color:
                            var(--danger);
                    "
                >
                    No fue posible analizar el seguimiento.

                    <br><br>

                    <strong>
                        ${escapeHtml(
            error?.message ||
            'Error desconocido'
        )}
                    </strong>
                </div>

            </div>
        `;
    }
}

function renderizarAnalisisSeguimientoPDA(
    analisis,
    contexto = {}
) {
    const contenedor =
        document.getElementById(
            'pdaSeguimientoContenido'
        );


    if (!contenedor) {
        return;
    }


    const pda =
        contexto?.pda ||
        {};


    const ciclosGestor =
        Array.isArray(
            contexto?.ciclosGestor
        )
            ? contexto.ciclosGestor
            : [];


    const basal =
        analisis?.basal ||
        {};


    const seguimiento =
        analisis?.seguimiento ||
        null;


    const temas =
        analisis?.temas ||
        {};


    const detalle =
        Array.isArray(
            analisis?.detalle
        )
            ? analisis.detalle
            : [];


    const nuevos =
        Array.isArray(
            analisis
                ?.nuevos_hallazgos
        )
            ? analisis
                .nuevos_hallazgos
            : [];


    const conclusion =
        analisis?.conclusion ||
        {};


    // ==================================================
    // FORMATOS
    // ==================================================

    const formatearFecha =
        valor => {

            if (!valor) {
                return '—';
            }


            if (
                typeof formatearFechaPdaDashboard ===
                'function'
            ) {
                return formatearFechaPdaDashboard(
                    valor
                );
            }


            const fecha =
                new Date(
                    valor
                );


            if (
                Number.isNaN(
                    fecha.getTime()
                )
            ) {
                return String(
                    valor
                );
            }


            return fecha
                .toLocaleDateString(
                    'es-PE'
                );
        };


    const etiquetasResultado = {
        corregido:
            'Corregido',

        mejoro:
            'Mejoró',

        persiste:
            'Persiste',

        empeoro:
            'Empeoró',

        no_evaluable:
            'No evaluable'
    };


    const etiquetasFeedback = {
        trabajado:
            'Trabajado',

        parcial:
            'Parcial',

        no_trabajado:
            'No trabajado',

        sin_registro:
            'Sin registro'
    };


    const resumenConclusion = {
        mejora_satisfactoria:
            'Mejora satisfactoria',

        mejora_parcial:
            'Mejora parcial',

        persistencia:
            'Persistencia',

        persistencia_post_capacitacion:
            'Persistencia posterior a capacitación',

        no_concluyente:
            'No concluyente'
    };


    // ==================================================
    // CICLOS RELACIONADOS CON ESTE PDA
    // ==================================================

    const idPda =
        Number(
            analisis?.pda_id ||
            pda?.id ||
            0
        );


    const ciclosRelacionados =
        ciclosGestor
            .filter(
                ciclo =>
                    Number(
                        ciclo?.pda?.id ??
                        ciclo?.pdaOrigen?.id ??
                        ciclo?.pdaActivo?.id ??
                        0
                    ) ===
                    idPda
            )
            .filter(
                ciclo =>
                    ciclo.relacionPda ===
                    'origen' ||
                    ciclo.relacionPda ===
                    'preintervencion' ||
                    ciclo.relacionPda ===
                    'seguimiento'
            )
            .sort(
                (
                    a,
                    b
                ) =>
                    Number(
                        a.numero ||
                        0
                    ) -
                    Number(
                        b.numero ||
                        0
                    )
            );


    // ==================================================
    // LÍNEA DE TIEMPO
    // ==================================================

    const eventosTimeline =
        [];


    for (
        const ciclo
        of ciclosRelacionados
    ) {
        let titulo =
            `Ciclo #${Number(
                ciclo.numero
            )}`;


        let subtitulo =
            '';


        if (
            ciclo.relacionPda ===
            'origen'
        ) {
            subtitulo =
                'Ciclo basal · Origen del PDA';

        } else if (
            ciclo.relacionPda ===
            'preintervencion'
        ) {
            subtitulo =
                'Preintervención · No mide efectividad';

        } else {
            subtitulo =
                'Seguimiento válido';
        }


        eventosTimeline.push({
            fecha:
                ciclo.fechaInicio,

            titulo,

            subtitulo,

            valor:
                `${Number(
                    ciclo.promedio ||
                    0
                ).toFixed(1)}% · ${ciclo.cuartil ||
                '—'
                }`
        });
    }


    if (
        pda.fecha_feedback
    ) {
        eventosTimeline.push({
            fecha:
                pda.fecha_feedback,

            titulo:
                'Feedback registrado',

            subtitulo:
                pda.feedback_por
                    ? `Responsable: ${pda.feedback_por}`
                    : 'Intervención registrada',

            valor:
                pda.gescot_reunion
                    ? `GESCOT ${pda.gescot_reunion}`
                    : ''
        });
    }


    if (
        pda.fecha_capacitacion
    ) {
        eventosTimeline.push({
            fecha:
                pda.fecha_capacitacion,

            titulo:
                'Capacitación registrada',

            subtitulo:
                pda.capacitador
                    ? `Capacitador: ${pda.capacitador}`
                    : 'Intervención formal',

            valor:
                pda.gescot_capacitacion
                    ? `GESCOT ${pda.gescot_capacitacion}`
                    : ''
        });
    }


    eventosTimeline.sort(
        (
            a,
            b
        ) => {

            const fechaA =
                new Date(
                    a.fecha ||
                    0
                ).getTime();


            const fechaB =
                new Date(
                    b.fecha ||
                    0
                ).getTime();


            return (
                fechaA -
                fechaB
            );
        }
    );


    const timelineHtml =
        eventosTimeline.length > 0
            ? eventosTimeline
                .map(
                    evento => `
                        <div
                            class="pda-tracking-timeline-item"
                        >
                            <div
                                class="pda-tracking-timeline-dot"
                            ></div>

                            <div
                                class="pda-tracking-timeline-body"
                            >
                                <div
                                    class="pda-tracking-timeline-top"
                                >
                                    <strong>
                                        ${escapeHtml(
                        evento.titulo
                    )}
                                    </strong>

                                    <span>
                                        ${escapeHtml(
                        formatearFecha(
                            evento.fecha
                        )
                    )}
                                    </span>
                                </div>

                                <div
                                    class="pda-tracking-timeline-description"
                                >
                                    ${escapeHtml(
                        evento.subtitulo
                    )}
                                </div>

                                ${evento.valor
                            ? `
                                            <div
                                                class="
                                                    pda-tracking-timeline-value
                                                "
                                            >
                                                ${escapeHtml(
                                evento.valor
                            )}
                                            </div>
                                        `
                            : ''
                        }
                            </div>
                        </div>
                    `
                )
                .join('')
            : `
                <div class="pda-stage-note">
                    No existe información suficiente
                    para construir la línea de tiempo.
                </div>
            `;


    // ==================================================
    // ESPERANDO CICLO
    // ==================================================

    if (
        !analisis ||
        analisis.estado ===
        'esperando_ciclo'
    ) {
        contenedor.innerHTML = `

            <section class="pda-tracking-summary">

                <div class="pda-stage-card">

                    <div class="pda-stage-card-title">
                        <div>
                            <h4>
                                Resultado de la intervención
                            </h4>

                            <p>
                                Aún no existe un ciclo completo
                                posterior a la última intervención.
                            </p>
                        </div>
                    </div>


                    <div class="pda-tracking-main-metrics">

                        <article class="pda-stage-metric">
                            <span>
                                Ciclo basal
                            </span>

                            <strong>
                                #${escapeHtml(
            basal.ciclo ??
            pda.ciclo_basal_numero ??
            '—'
        )}
                            </strong>
                        </article>


                        <article class="pda-stage-metric">
                            <span>
                                Resultado basal
                            </span>

                            <strong>
                                ${Number(
            basal.promedio ??
            pda.promedio_basal ??
            0
        ).toFixed(1)}%
                            </strong>
                        </article>


                        <article class="pda-stage-metric">
                            <span>
                                Cuartil basal
                            </span>

                            <strong>
                                ${escapeHtml(
            basal.cuartil ??
            pda.cuartil_basal ??
            '—'
        )}
                            </strong>
                        </article>


                        <article class="pda-stage-metric">
                            <span>
                                Estado
                            </span>

                            <strong>
                                En observación
                            </strong>
                        </article>

                    </div>


                    <div
                        class="pda-stage-note"
                        style="margin-top:16px;"
                    >
                        MECA esperará el siguiente ciclo
                        completo iniciado después de la
                        última intervención.
                    </div>

                </div>


                <div class="
                    pda-stage-card
                    pda-stage-card-wide
                ">

                    <div class="pda-stage-card-title">
                        <div>
                            <h4>
                                Historial de evolución
                            </h4>

                            <p>
                                Los ciclos preintervención
                                permanecen visibles, pero
                                no se usan para medir la
                                efectividad del PDA.
                            </p>
                        </div>
                    </div>


                    <div class="pda-tracking-timeline">
                        ${timelineHtml}

                        <div
                            class="
                                pda-tracking-timeline-item
                                is-current
                            "
                        >
                            <div
                                class="
                                    pda-tracking-timeline-dot
                                "
                            ></div>

                            <div
                                class="
                                    pda-tracking-timeline-body
                                "
                            >
                                <div
                                    class="
                                        pda-tracking-timeline-top
                                    "
                                >
                                    <strong>
                                        Esperando siguiente ciclo válido
                                    </strong>
                                </div>

                                <div
                                    class="
                                        pda-tracking-timeline-description
                                    "
                                >
                                    Aún no existe evidencia
                                    posterior suficiente para
                                    evaluar la intervención.
                                </div>
                            </div>
                        </div>
                    </div>

                </div>


                <div class="
                    pda-stage-card
                    pda-stage-card-wide
                ">

                    <div class="pda-stage-card-title">
                        <div>
                            <h4>
                                Decisión del supervisor
                            </h4>

                            <p>
                                Todavía no corresponde tomar
                                una decisión de cierre,
                                capacitación o escalamiento.
                            </p>
                        </div>
                    </div>


                    <div class="pda-stage-note">
                        Estado actual:
                        <strong>
                            esperando evidencia posterior
                            a la intervención.
                        </strong>
                    </div>

                </div>

            </section>
        `;

        return;
    }


    // ==================================================
    // DETALLE DE CRITERIOS
    // ==================================================

    const filasDetalle =
        detalle.length > 0
            ? detalle.map(
                item => `
                    <tr>
                        <td>
                            <strong>
                                ${escapeHtml(
                    item.criterio ||
                    item.submotivo ||
                    'Sin criterio'
                )}
                            </strong>

                            ${item.atributo
                        ? `
                                        <div class="pda-table-subtext">
                                            ${escapeHtml(
                            item.atributo
                        )}
                                        </div>
                                    `
                        : ''
                    }
                        </td>

                        <td>
                            ${escapeHtml(
                        etiquetasFeedback[
                        item.feedback
                        ] ||
                        item.feedback ||
                        '—'
                    )}
                        </td>

                        <td>
                            ${item.seguimiento
                        ?.tasa_falla_pct ??
                    '—'
                    }%
                        </td>

                        <td>
                            <strong>
                                ${escapeHtml(
                        etiquetasResultado[
                        item.resultado
                        ] ||
                        item.resultado ||
                        '—'
                    )}
                            </strong>
                        </td>
                        <td>
                            ${Array.isArray(
                        item.seguimiento
                            ?.evidencias
                    ) &&
                        item.seguimiento
                            .evidencias
                            .length > 0
                        ? `
                                        <button
                                            type="button"
                                            class="
                                                pda-evidence-button
                                            "
                                            onclick='abrirEvidenciasPDA(
                                                ${JSON.stringify(
                            item.criterio ||
                            item.submotivo ||
                            'Criterio'
                        )},
                                                ${JSON.stringify(
                            item.seguimiento
                                .evidencias
                        )}
                                            )'
                                        >
                                            Ver ${item.seguimiento
                            .evidencias
                            .length
                        } evidencia${item.seguimiento
                            .evidencias
                            .length === 1
                            ? ''
                            : 's'
                        }
                                        </button>
                                    `
                        : `
                                        <span
                                            class="pda-evidence-empty"
                                        >
                                            —
                                        </span>
                                    `
                    }
                        </td>
                    </tr>
                `
            ).join('')
            : `
                <tr>
                    <td colspan="5">
                        No existen criterios comparables.
                    </td>
                </tr>
            `;


    // ==================================================
    // NUEVOS HALLAZGOS
    // ==================================================

    const filasNuevos =
        nuevos.length > 0
            ? nuevos.map(
                item => `
                    <tr>
                        <td>
                            ${escapeHtml(
                    item.criterio ||
                    'Sin criterio'
                )}
                        </td>

                        <td>
                            ${escapeHtml(
                    item.atributo ||
                    '—'
                )}
                        </td>

                        <td>
                            ${Number(
                    item.fallas ||
                    0
                )}
                        </td>
                    </tr>
                `
            ).join('')
            : `
                <tr>
                    <td colspan="3">
                        No se detectaron nuevos hallazgos.
                    </td>
                </tr>
            `;


    // ==================================================
    // DECISIONES
    // ==================================================

    let accionesDecision =
        '';


    const opciones =
        Array.isArray(
            conclusion.opciones
        )
            ? conclusion.opciones
            : [];


    if (
        opciones.includes(
            'continuar_seguimiento'
        )
    ) {
        accionesDecision += `
            <button
                type="button"
                class="pda-secondary-button"
                onclick="
                    continuarSeguimientoPDA(
                        ${idPda}
                    )
                "
            >
                Continuar seguimiento
            </button>
        `;
    }


    if (
        opciones.includes(
            'derivar_capacitacion'
        )
    ) {
        accionesDecision += `
            <button
                type="button"
                class="pda-primary-button"
                onclick="
                    derivarPdaACapacitacion(
                        ${idPda}
                    )
                "
            >
                Derivar a capacitación
            </button>
        `;
    }


    if (
        opciones.includes(
            'cerrar'
        )
    ) {
        accionesDecision += `
            <button
                type="button"
                class="pda-primary-button"
                onclick="
                    cerrarPdaPorMejora(
                        ${idPda}
                    )
                "
            >
                Cerrar PDA
            </button>
        `;
    }


    if (
        opciones.includes(
            'escalar'
        )
    ) {
        accionesDecision += `
            <button
                type="button"
                class="pda-primary-button"
                onclick="
                    escalarPdaAGerencia(
                        ${idPda}
                    )
                "
            >
                Escalar caso
            </button>
        `;
    }


    // ==================================================
    // RENDER FINAL
    // ==================================================

    contenedor.innerHTML = `

        <section class="pda-tracking-summary">

            <div class="pda-stage-card">

                <div class="pda-stage-card-title">
                    <div>
                        <h4>
                            Resultado de la intervención
                        </h4>

                        <p>
                            Comparación entre el ciclo basal
                            y el último seguimiento válido.
                        </p>
                    </div>
                </div>


                <div class="pda-tracking-main-metrics">

                    <article class="pda-stage-metric">
                        <span>
                            Basal
                        </span>

                        <strong>
                            #${basal.ciclo ?? '—'}
                            ·
                            ${Number(
        basal.promedio ||
        0
    ).toFixed(1)}%
                            ·
                            ${escapeHtml(
        basal.cuartil ||
        '—'
    )}
                        </strong>
                    </article>


                    <article class="pda-stage-metric">
                        <span>
                            Seguimiento
                        </span>

                        <strong>
                            #${seguimiento?.ciclo ?? '—'}
                            ·
                            ${Number(
        seguimiento?.promedio ||
        0
    ).toFixed(1)}%
                            ·
                            ${escapeHtml(
        seguimiento?.cuartil ||
        '—'
    )}
                        </strong>
                    </article>


                    <article class="pda-stage-metric">
                        <span>
                            Variación
                        </span>

                        <strong>
                            ${Number(
        seguimiento
            ?.variacion_pp ||
        0
    ) >= 0
            ? '+'
            : ''
        }${Number(
            seguimiento
                ?.variacion_pp ||
            0
        ).toFixed(1)}
                            pp
                        </strong>
                    </article>


                    <article class="pda-stage-metric">
                        <span>
                            Resultado
                        </span>

                        <strong>
                            ${escapeHtml(
            resumenConclusion[
            conclusion.codigo
            ] ||
            conclusion.codigo ||
            '—'
        )}
                        </strong>
                    </article>

                </div>

            </div>


            <div class="pda-stage-card">

                <div class="pda-stage-card-title">
                    <div>
                        <h4>
                            Temas trabajados
                        </h4>

                        <p>
                            Resultado posterior de los
                            criterios que originaron el PDA.
                        </p>
                    </div>
                </div>


                <div class="pda-tracking-result-grid">

                    <article class="pda-stage-metric">
                        <span>Corregidos</span>
                        <strong>${Number(temas.corregidos || 0)}</strong>
                    </article>

                    <article class="pda-stage-metric">
                        <span>Mejoraron</span>
                        <strong>${Number(temas.mejoraron || 0)}</strong>
                    </article>

                    <article class="pda-stage-metric">
                        <span>Persisten</span>
                        <strong>${Number(temas.persistentes || 0)}</strong>
                    </article>

                    <article class="pda-stage-metric">
                        <span>Empeoraron</span>
                        <strong>${Number(temas.empeoraron || 0)}</strong>
                    </article>

                    <article class="pda-stage-metric">
                        <span>No evaluables</span>
                        <strong>${Number(temas.no_evaluables || 0)}</strong>
                    </article>

                    <article class="pda-stage-metric">
                        <span>Nuevos</span>
                        <strong>${Number(temas.nuevos || 0)}</strong>
                    </article>

                </div>

            </div>


            <div class="
                pda-stage-card
                pda-stage-card-wide
            ">

                <div class="pda-stage-card-title">
                    <div>
                        <h4>
                            Comparación por criterio
                        </h4>
                    </div>
                </div>

                <div class="pda-stage-table-wrapper">
                    <table class="pda-stage-table">
                        <thead>
                            <tr>
                                <th>Criterio</th>
                                <th>Feedback</th>
                                <th>Falla seguimiento</th>
                                <th>Resultado</th>
                                <th>Evidencia</th>
                            </tr>
                        </thead>

                        <tbody>
                            ${filasDetalle}
                        </tbody>
                    </table>
                </div>

            </div>


            <div class="
                pda-stage-card
                pda-stage-card-wide
            ">

                <div class="pda-stage-card-title">
                    <div>
                        <h4>
                            Nuevos hallazgos
                        </h4>

                        <p>
                            Incumplimientos que no formaban
                            parte del PDA original.
                        </p>
                    </div>
                </div>

                <div class="pda-stage-table-wrapper">
                    <table class="pda-stage-table">
                        <thead>
                            <tr>
                                <th>Criterio</th>
                                <th>Atributo</th>
                                <th>Fallas</th>
                            </tr>
                        </thead>

                        <tbody>
                            ${filasNuevos}
                        </tbody>
                    </table>
                </div>

            </div>


            <div class="
                pda-stage-card
                pda-stage-card-wide
            ">

                <div class="pda-stage-card-title">
                    <div>
                        <h4>
                            Historial de evolución
                        </h4>

                        <p>
                            El historial distingue ciclos
                            previos a la intervención de los
                            que realmente miden su efecto.
                        </p>
                    </div>
                </div>

                <div class="pda-tracking-timeline">
                    ${timelineHtml}
                </div>

            </div>


            <div class="
                pda-stage-card
                pda-stage-card-wide
            ">

                <div class="pda-stage-card-title">
                    <div>
                        <h4>
                            Decisión del supervisor
                        </h4>

                        <p>
                            MECA presenta la evidencia.
                            La decisión operativa corresponde
                            al supervisor.
                        </p>
                    </div>
                </div>


                <div class="pda-stage-note">
                    Resultado:
                    <strong>
                        ${escapeHtml(
            resumenConclusion[
            conclusion.codigo
            ] ||
            conclusion.codigo ||
            '—'
        )}
                    </strong>
                </div>


                <div class="pda-tracking-actions">
                    ${accionesDecision}
                </div>

            </div>

        </section>
    `;
}

function abrirEvidenciasPDA(
    criterio,
    evidencias
) {
    cerrarModalEvidenciasPDA();


    const lista =
        Array.isArray(
            evidencias
        )
            ? evidencias
            : [];


    const modal =
        document.createElement(
            'div'
        );


    modal.id =
        'modalEvidenciasPDA';


    modal.className =
        'pda-evidence-modal';


    const filas =
        lista.length > 0
            ? lista.map(
                evidencia => {

                    const evaluacionId =
                        Number(
                            evidencia
                                .evaluacion_id ||
                            0
                        );


                    const llamada =
                        evidencia
                            .id_llamada ||
                        evidencia
                            .ticket_psi ||
                        '—';


                    const fecha =
                        evidencia.fecha
                            ? new Date(
                                evidencia.fecha
                            )
                                .toLocaleString(
                                    'es-PE'
                                )
                            : '—';


                    const nota =
                        Number(
                            evidencia
                                .nota_final ||
                            0
                        ).toFixed(
                            1
                        );


                    return `
                        <tr>

                            <td>
                                ${evaluacionId ||
                        '—'
                        }
                            </td>

                            <td>
                                ${escapeHtml(
                            fecha
                        )}
                            </td>

                            <td>
                                ${escapeHtml(
                            String(
                                llamada
                            )
                        )}
                            </td>

                            <td>
                                ${nota}%
                            </td>

                            <td>
                                <strong>
                                    No cumple
                                </strong>
                            </td>

                            <td>
                                <button
                                    type="button"
                                    class="
                                        pda-evidence-action
                                    "
                                    onclick="
                                        reproducirEvidenciaPDA(
                                            '${escapeHtml(
                            String(
                                llamada
                            )
                        )}'
                                        )
                                    "
                                >
                                    ▶ Audio
                                </button>
                            </td>

                        </tr>
                    `;
                }
            ).join('')
            : `
                <tr>
                    <td colspan="6">
                        No existen evidencias disponibles.
                    </td>
                </tr>
            `;


    modal.innerHTML = `
        <div class="pda-evidence-dialog">

            <header class="pda-evidence-header">

                <div>
                    <span>
                        EVIDENCIA DE SEGUIMIENTO
                    </span>

                    <h3>
                        ${escapeHtml(
        criterio ||
        'Criterio'
    )}
                    </h3>

                    <p>
                        ${lista.length}
                        evaluación${lista.length === 1
            ? ''
            : 'es'
        }
                        con incumplimiento
                    </p>
                </div>


                <button
                    type="button"
                    class="pda-evidence-close"
                    onclick="
                        cerrarModalEvidenciasPDA()
                    "
                >
                    ×
                </button>

            </header>


            <div class="pda-evidence-body">

                <div
                    class="
                        pda-stage-table-wrapper
                    "
                >

                    <table
                        class="pda-stage-table"
                    >

                        <thead>
                            <tr>
                                <th>Evaluación</th>
                                <th>Fecha</th>
                                <th>ID llamada</th>
                                <th>Nota</th>
                                <th>Resultado</th>
                                <th>Acción</th>
                            </tr>
                        </thead>

                        <tbody>
                            ${filas}
                        </tbody>

                    </table>

                </div>

            </div>


            <footer class="pda-evidence-footer">

                <button
                    type="button"
                    class="pda-secondary-button"
                    onclick="
                        cerrarModalEvidenciasPDA()
                    "
                >
                    Cerrar
                </button>

            </footer>

        </div>
    `;


    document.body.appendChild(
        modal
    );
}

function cerrarModalEvidenciasPDA() {

    const modal =
        document.getElementById(
            'modalEvidenciasPDA'
        );


    if (modal) {
        modal.remove();
    }
}

function reproducirEvidenciaPDA(
    identificador
) {
    const id =
        String(
            identificador ||
            ''
        ).trim();


    if (!id) {
        alert(
            'No existe identificador de audio para esta evaluación.'
        );

        return;
    }


    const url =
        `/api/audio/reproducir/${encodeURIComponent(
            id
        )}`;


    const nuevaVentana =
        window.open(
            '',
            '_blank',
            'width=560,height=220'
        );


    if (!nuevaVentana) {
        alert(
            'El navegador bloqueó la ventana de reproducción.'
        );

        return;
    }


    nuevaVentana.document.write(`
        <!doctype html>

        <html>
        <head>
            <meta charset="utf-8">

            <title>
                Evidencia PDA
            </title>
        </head>

        <body
            style="
                font-family:
                    Arial,
                    sans-serif;

                padding:
                    24px;
            "
        >

            <h3>
                Evidencia de audio
            </h3>

            <p>
                ${escapeHtml(
        id
    )}
            </p>


            <audio
                controls
                autoplay
                style="
                    width:
                        100%;
                "
            >
                <source
                    src="${url}"
                >
            </audio>

        </body>
        </html>
    `);


    nuevaVentana.document.close();
}

function inicializarSelectoresMultiples() {
    const tipos = ['feedback', 'proceso', 'habilidades'];

    for (const tipo of tipos) {
        const btnSelectAll = document.querySelector(`.btn-select-all[data-tipo="${tipo}"]`);
        if (!btnSelectAll) continue;

        // Remover event listener anterior si existe
        const nuevoBtn = btnSelectAll.cloneNode(true);
        btnSelectAll.parentNode.replaceChild(nuevoBtn, btnSelectAll);

        nuevoBtn.addEventListener('click', function () {
            const checkboxes = document.querySelectorAll(`.check-submotivo-${tipo}`);
            const todosSeleccionados = Array.from(checkboxes).every(cb => cb.checked);

            checkboxes.forEach(cb => {
                cb.checked = !todosSeleccionados;
            });

            // Actualizar texto del botón
            const nuevosTodosSeleccionados = Array.from(checkboxes).every(cb => cb.checked);
            this.innerHTML = nuevosTodosSeleccionados ? '⬜ Deseleccionar todos' : '☑️ Seleccionar todos';
        });
    }
}

async function marcarComoNotificado(pdaId) {
    const fecha = document.getElementById('fechaNotificacion').value;
    const supervisor = document.getElementById('supervisorNotifico').value.trim();
    const observaciones = document.getElementById('observacionesNotificacion').value.trim();

    if (!fecha || !supervisor) {
        alert('⚠️ Complete todos los campos obligatorios');
        return;
    }

    try {
        const db = getDB();
        if (!db) {
            alert('❌ Base de datos no disponible');
            return;
        }

        // Actualizar estado a 'notificado'
        const { error } = await db
            .from('pda_cabecera')
            .update({
                estado: 'notificado',
                fecha_notificacion_gestor: fecha,
                notificado_por: supervisor,
                observaciones_notificacion: observaciones,
                updated_at: new Date().toISOString()
            })
            .eq('id', pdaId);

        if (error) throw error;

        // 🔴 REGISTRAR EVENTO CON EL SUPERVISOR (persona real)
        await registrarEventoPDA(pdaId, 'notificado', {
            fecha_notificacion: fecha,
            supervisor: supervisor,
            observaciones: observaciones
        }, supervisor);  // ← PASAR EL SUPERVISOR COMO PERSONA

        alert(`✅ Notificación registrada correctamente\n\n📅 Fecha: ${fecha}\n👤 Supervisor: ${supervisor}`);

        cerrarModalGestionPDA();

        // ======================================================
        // ABRIR SIGUIENTE ETAPA
        //
        // abrirGestionPDA() es el único router de estados.
        // Según el estado actualizado del PDA decidirá
        // qué modal NUEVO corresponde mostrar.
        // ======================================================

        if (
            typeof abrirGestionPDA ===
            'function'
        ) {
            await abrirGestionPDA(
                pdaId
            );
        }

        await cargarDatosPDA();

    } catch (error) {
        console.error('Error:', error);
        alert('❌ Error al registrar notificación: ' + error.message);
    }
}

async function completarAccionPDA(accionId) {
    console.log(`🔧 Completando acción ID: ${accionId}`);

    const db = getDB();
    if (!db) {
        alert('❌ Base de datos no disponible');
        return;
    }

    // Obtener los valores del formulario
    const codigoInput = document.getElementById(`codigo-${accionId}`);
    const obsInput = document.getElementById(`obs-${accionId}`);

    // Determinar si requiere código (por la presencia del input)
    const requiereCodigo = !!codigoInput;
    const codigoGescot = codigoInput ? codigoInput.value.trim() : null;
    const observaciones = obsInput ? obsInput.value.trim() : null;

    // Validar código GESCOT si es requerido
    if (requiereCodigo && (!codigoGescot || codigoGescot === '')) {
        alert('⚠️ Esta acción requiere un código GESCOT. Por favor ingréselo antes de marcar como completada.');
        return;
    }

    // Validar observaciones si es feedback
    if (!requiereCodigo && (!observaciones || observaciones === '')) {
        if (!confirm('⚠️ No ha ingresado observaciones. ¿Desea continuar de todas formas?')) {
            return;
        }
    }

    const usuarioActual = window.usuarioActual?.nombre_completo || window.usuarioActual?.usuario || 'Supervisor';

    try {
        const { error } = await db
            .from('pda_acciones')
            .update({
                completado: true,
                codigo_gescot: codigoGescot,
                observaciones: observaciones,
                fecha_completado: new Date().toISOString().split('T')[0],
                completado_por: usuarioActual,
                updated_at: new Date().toISOString()
            })
            .eq('id', accionId);

        if (error) throw error;

        // Mostrar mensaje de éxito
        const tipoAccion = requiereCodigo ? 'capacitación' : 'feedback';
        alert(`✅ Acción de ${tipoAccion} completada correctamente`);

        // Recargar el modal para reflejar el cambio
        const pdaId = window.pdaActualGestion?.id;
        if (pdaId) {
            cerrarModalGestionPDA();
            await abrirGestionPDA(pdaId);
        }

        // Recargar listas de PDA
        await cargarDatosPDA();

    } catch (error) {
        console.error('Error completando acción:', error);
        alert('❌ Error al completar la acción: ' + error.message);
    }
}

function renderizarChecklistAcciones(acciones) {
    if (!acciones || acciones.length === 0) {
        return '<div style="text-align: center; padding: 20px; color: var(--muted);">✅ No hay acciones pendientes</div>';
    }

    let html = '<div style="display: flex; flex-direction: column; gap: 15px;">';

    for (const acc of acciones) {
        const tipoIcono = acc.tipo_accion === 'feedback' ? '💬' : (acc.tipo_accion === 'capacitacion_proceso' ? '📚' : '🎯');
        const tipoTexto = acc.tipo_accion === 'feedback' ? 'Feedback' : (acc.tipo_accion === 'capacitacion_proceso' ? 'Capacitación Proceso' : 'Capacitación Habilidades');
        const tipoColor = acc.tipo_accion === 'feedback' ? 'var(--accent)' : (acc.tipo_accion === 'capacitacion_proceso' ? '#7b1fa2' : '#fd7e14');
        const requiereCodigo = acc.requiere_codigo;

        html += `
                <div id="accion-${acc.id}" style="background: #f8f9fa; border-radius: 10px; padding: 12px; border-left: 4px solid ${tipoColor};">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 10px;">
                        <div style="flex: 1;">
                            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                                <span style="font-size: 16px;">${tipoIcono}</span>
                                <strong>${escapeHtml(acc.submotivo)}</strong>
                                <span class="badge" style="background: ${tipoColor};">${tipoTexto}</span>
                            </div>
                            <div style="font-size: 12px; color: var(--muted); margin-top: 5px;">
                                📁 ${escapeHtml(acc.atributo || 'Sin atributo')}
                            </div>
                            <div style="margin-top: 12px;">
                                ${requiereCodigo ? `
                                    <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
                                        <label style="font-size: 12px; margin: 0; font-weight: 600;">🔑 Código GESCOT *:</label>
                                        <input type="text" id="codigo-${acc.id}"
                                            placeholder="Ej: GESCOT-2024-00123"
                                            style="flex: 1; min-width: 200px; padding: 8px 10px; font-size: 12px; border-radius: 6px; border: 1px solid var(--line);">
                                        <small style="color: var(--danger);">Obligatorio</small>
                                    </div>
                                ` : `
                                    <div>
                                        <label style="font-size: 12px; font-weight: 600;">📝 Observaciones / Feedback:</label>
                                        <textarea id="obs-${acc.id}" rows="2"
                                            placeholder="Describa el feedback proporcionado al gestor..."
                                            style="width: 100%; padding: 8px 10px; font-size: 12px; border-radius: 6px; border: 1px solid var(--line); margin-top: 5px;"></textarea>
                                    </div>
                                `}
                            </div>
                        </div>
                        <div>
                            <button onclick="completarAccionPDA(${acc.id})"
                                    style="background: var(--ok); padding: 8px 16px; font-size: 12px; border-radius: 6px; border: none; cursor: pointer;">
                                ✓ Marcar como completada
                            </button>
                        </div>
                    </div>
                </div>
            `;
    }

    html += '</div>';
    return html;
}

function renderizarModalDetallePDA(
    pda
) {
    const estado =
        String(
            pda?.estado ||
            ''
        ).trim();


    const esEscalado =
        estado ===
        'escalado';


    const esCompletado =
        [
            'completado',
            'corregido',
            'cerrado'
        ].includes(
            estado
        );


    const historialRaw =
        pda?.historial_estados;


    let historial =
        [];


    if (
        Array.isArray(
            historialRaw
        )
    ) {
        historial =
            historialRaw;

    } else if (
        typeof historialRaw ===
        'string'
    ) {
        try {
            historial =
                JSON.parse(
                    historialRaw
                );

        } catch {
            historial =
                [];
        }
    }


    const ciclos =
        Array.isArray(
            pda?.ciclos
        )
            ? pda.ciclos
            : [];


    const acciones =
        Array.isArray(
            pda?.acciones
        )
            ? pda.acciones
            : [];


    const fecha =
        valor => {

            if (!valor) {
                return '—';
            }


            if (
                typeof formatearFechaPdaDashboard ===
                'function'
            ) {
                return formatearFechaPdaDashboard(
                    valor
                );
            }


            const d =
                new Date(
                    valor
                );


            return Number.isNaN(
                d.getTime()
            )
                ? String(
                    valor
                )
                : d.toLocaleDateString(
                    'es-PE'
                );
        };


    const numero =
        valor => {

            const n =
                Number(
                    valor
                );


            return Number.isFinite(
                n
            )
                ? n
                    .toFixed(
                        1
                    )
                : '—';
        };


    // ==================================================
    // HISTORIAL
    // ==================================================

    const historialHtml =
        historial.length > 0
            ? historial
                .map(
                    evento => {

                        const detalle =
                            evento?.detalle ||
                            {};


                        const etiquetaEvento = {
                            generado:
                                'PDA generado',

                            notificado:
                                'Gestor notificado',

                            feedback_registrado:
                                'Feedback registrado',

                            enviado_capacitacion:
                                'Derivado a capacitación',

                            capacitacion_registrada:
                                'Capacitación registrada',

                            cerrado_exitoso:
                                'PDA cerrado',

                            escalado:
                                'Caso escalado',

                            marcado_reiterativo:
                                'Persistencia detectada'
                        };


                        return `
                            <div
                                class="
                                    pda-expediente-event
                                "
                            >
                                <div
                                    class="
                                        pda-expediente-event-dot
                                    "
                                ></div>

                                <div
                                    class="
                                        pda-expediente-event-body
                                    "
                                >
                                    <div
                                        class="
                                            pda-expediente-event-top
                                        "
                                    >
                                        <strong>
                                            ${escapeHtml(
                            etiquetaEvento[
                            evento.evento
                            ] ||
                            evento.evento ||
                            'Evento'
                        )}
                                        </strong>

                                        <span>
                                            ${escapeHtml(
                            fecha(
                                evento.fecha ||
                                evento.created_at
                            )
                        )}
                                        </span>
                                    </div>

                                    ${evento.usuario
                                ? `
                                                <div
                                                    class="
                                                        pda-expediente-event-user
                                                    "
                                                >
                                                    ${escapeHtml(
                                    evento.usuario
                                )}
                                                </div>
                                            `
                                : ''
                            }

                                    ${detalle.motivo
                                ? `
                                                <div
                                                    class="
                                                        pda-expediente-event-note
                                                    "
                                                >
                                                    ${escapeHtml(
                                    detalle.motivo
                                )}
                                                </div>
                                            `
                                : ''
                            }

                                    ${detalle.observaciones
                                ? `
                                                <div
                                                    class="
                                                        pda-expediente-event-note
                                                    "
                                                >
                                                    ${escapeHtml(
                                    detalle.observaciones
                                )}
                                                </div>
                                            `
                                : ''
                            }
                                </div>
                            </div>
                        `;
                    }
                )
                .join('')
            : `
                <div class="pda-stage-note">
                    No existe historial detallado
                    disponible para este PDA.
                </div>
            `;


    // ==================================================
    // CICLOS
    // ==================================================

    const ciclosHtml =
        ciclos.length > 0
            ? ciclos
                .map(
                    ciclo => {

                        let tipo =
                            ciclo.tipo_ciclo ||
                            'ciclo';


                        if (
                            tipo ===
                            'basal'
                        ) {
                            tipo =
                                'Basal';

                        } else if (
                            tipo ===
                            'seguimiento'
                        ) {
                            tipo =
                                'Seguimiento';
                        }


                        return `
                            <tr>
                                <td>
                                    ${escapeHtml(
                            tipo
                        )}
                                </td>

                                <td>
                                    ${ciclo.ciclo_numero ??
                            '—'
                            }
                                </td>

                                <td>
                                    ${escapeHtml(
                                fecha(
                                    ciclo.fecha_inicio
                                )
                            )}
                                </td>

                                <td>
                                    ${escapeHtml(
                                fecha(
                                    ciclo.fecha_fin
                                )
                            )}
                                </td>

                                <td>
                                    ${numero(
                                ciclo.promedio_nota
                            )}%
                                </td>

                                <td>
                                    ${escapeHtml(
                                ciclo.cuartil ||
                                '—'
                            )}
                                </td>
                            </tr>
                        `;
                    }
                )
                .join('')
            : `
                <tr>
                    <td colspan="6">
                        No existen ciclos registrados.
                    </td>
                </tr>
            `;


    // ==================================================
    // ACCIONES / TEMAS
    // ==================================================

    const accionesHtml =
        acciones.length > 0
            ? acciones
                .map(
                    accion => `
                        <tr>
                            <td>
                                ${escapeHtml(
                        accion.submotivo ||
                        accion.criterio ||
                        'Sin criterio'
                    )}
                            </td>

                            <td>
                                ${escapeHtml(
                        accion.atributo ||
                        '—'
                    )}
                            </td>

                            <td>
                                ${escapeHtml(
                        accion.tipo_accion ||
                        '—'
                    )}
                            </td>

                            <td>
                                ${accion.completado ===
                            true
                            ? 'Trabajado'
                            : 'Pendiente'
                        }
                            </td>
                        </tr>
                    `
                )
                .join('')
            : `
                <tr>
                    <td colspan="4">
                        No existen temas registrados.
                    </td>
                </tr>
            `;


    // ==================================================
    // RESOLUCIÓN
    // ==================================================

    const tituloResolucion =
        esEscalado
            ? 'Caso escalado'
            : 'PDA completado';


    const descripcionResolucion =
        esEscalado
            ? (
                pda
                    ?.observaciones_escalamiento ||
                'El caso fue escalado por persistencia posterior a las intervenciones realizadas.'
            )
            : 'El gestor mostró una evolución suficiente para cerrar el PDA.';


    const responsableFinal =
        esEscalado
            ? (
                pda?.escalado_por ||
                '—'
            )
            : (
                pda?.cerrado_por ||
                '—'
            );


    const fechaFinal =
        esEscalado
            ? (
                pda?.fecha_escalamiento ||
                null
            )
            : (
                pda?.fecha_cierre ||
                pda?.updated_at ||
                null
            );


    const contenido = `

        <div class="pda-stage-header">

            <div>

                <span class="pda-stage-kicker">
                    EXPEDIENTE FINAL
                </span>

                <h3>
                    ${escapeHtml(
        tituloResolucion
    )}
                </h3>

                <p>
                    Consulta consolidada del origen,
                    intervenciones, evolución y resolución
                    del PDA.
                </p>

            </div>

        </div>


        <div class="pda-stage-grid">

            <article class="pda-stage-card">

                <div class="pda-stage-card-title">
                    <div>
                        <h4>
                            Origen del PDA
                        </h4>
                    </div>
                </div>


                <div class="pda-tracking-main-metrics">

                    <div class="pda-stage-metric">
                        <span>
                            Ciclo basal
                        </span>

                        <strong>
                            #${escapeHtml(
        pda
            ?.ciclo_basal_numero ??
        '—'
    )}
                        </strong>
                    </div>


                    <div class="pda-stage-metric">
                        <span>
                            Promedio basal
                        </span>

                        <strong>
                            ${numero(
        pda
            ?.promedio_basal
    )}%
                        </strong>
                    </div>


                    <div class="pda-stage-metric">
                        <span>
                            Cuartil basal
                        </span>

                        <strong>
                            ${escapeHtml(
        pda
            ?.cuartil_basal ||
        '—'
    )}
                        </strong>
                    </div>


                    <div class="pda-stage-metric">
                        <span>
                            Fecha detección
                        </span>

                        <strong>
                            ${escapeHtml(
        fecha(
            pda
                ?.fecha_deteccion
        )
    )}
                        </strong>
                    </div>

                </div>

            </article>


            <article class="pda-stage-card">

                <div class="pda-stage-card-title">
                    <div>
                        <h4>
                            Resultado final
                        </h4>
                    </div>
                </div>


                <div class="pda-tracking-main-metrics">

                    <div class="pda-stage-metric">
                        <span>
                            Ciclo seguimiento
                        </span>

                        <strong>
                            #${escapeHtml(
        pda
            ?.ciclo_seguimiento_numero ??
        '—'
    )}
                        </strong>
                    </div>


                    <div class="pda-stage-metric">
                        <span>
                            Promedio final
                        </span>

                        <strong>
                            ${numero(
        pda
            ?.promedio_seguimiento
    )}%
                        </strong>
                    </div>


                    <div class="pda-stage-metric">
                        <span>
                            Cuartil final
                        </span>

                        <strong>
                            ${escapeHtml(
        pda
            ?.cuartil_seguimiento ||
        '—'
    )}
                        </strong>
                    </div>


                    <div class="pda-stage-metric">
                        <span>
                            Estado
                        </span>

                        <strong>
                            ${escapeHtml(
        esEscalado
            ? 'Escalado'
            : 'Completado'
    )}
                        </strong>
                    </div>

                </div>

            </article>

        </div>


        <article
            class="
                pda-stage-card
                pda-stage-card-wide
            "
        >

            <div class="pda-stage-card-title">

                <div>
                    <h4>
                        Historial de intervención
                    </h4>

                    <p>
                        Secuencia de eventos registrados
                        durante la gestión del PDA.
                    </p>
                </div>

            </div>


            <div class="pda-expediente-timeline">
                ${historialHtml}
            </div>

        </article>


        <article
            class="
                pda-stage-card
                pda-stage-card-wide
            "
        >

            <div class="pda-stage-card-title">

                <div>
                    <h4>
                        Evolución por ciclos
                    </h4>

                    <p>
                        Resultado de los ciclos almacenados
                        dentro del expediente PDA.
                    </p>
                </div>

            </div>


            <div class="pda-stage-table-wrapper">

                <table class="pda-stage-table">

                    <thead>
                        <tr>
                            <th>Tipo</th>
                            <th>Ciclo</th>
                            <th>Inicio</th>
                            <th>Fin</th>
                            <th>Promedio</th>
                            <th>Cuartil</th>
                        </tr>
                    </thead>

                    <tbody>
                        ${ciclosHtml}
                    </tbody>

                </table>

            </div>

        </article>


        <article
            class="
                pda-stage-card
                pda-stage-card-wide
            "
        >

            <div class="pda-stage-card-title">

                <div>
                    <h4>
                        Temas del PDA
                    </h4>

                    <p>
                        Criterios que formaron parte de
                        la intervención.
                    </p>
                </div>

            </div>


            <div class="pda-stage-table-wrapper">

                <table class="pda-stage-table">

                    <thead>
                        <tr>
                            <th>Criterio</th>
                            <th>Atributo</th>
                            <th>Tipo</th>
                            <th>Estado</th>
                        </tr>
                    </thead>

                    <tbody>
                        ${accionesHtml}
                    </tbody>

                </table>

            </div>

        </article>


        <article
            class="
                pda-stage-card
                pda-stage-card-wide
                ${esEscalado
            ? 'pda-resolution-escalated'
            : 'pda-resolution-completed'
        }
            "
        >

            <div class="pda-stage-card-title">

                <div>
                    <h4>
                        Resolución del caso
                    </h4>

                    <p>
                        Resultado definitivo de la
                        intervención.
                    </p>
                </div>

            </div>


            <div class="pda-resolution-box">

                <div class="pda-resolution-status">

                    <span>
                        ${escapeHtml(
            tituloResolucion
        )}
                    </span>

                    <strong>
                        ${escapeHtml(
            descripcionResolucion
        )}
                    </strong>

                </div>


                <div class="pda-resolution-meta">

                    <div>
                        <span>
                            Responsable
                        </span>

                        <strong>
                            ${escapeHtml(
            responsableFinal
        )}
                        </strong>
                    </div>


                    <div>
                        <span>
                            Fecha
                        </span>

                        <strong>
                            ${escapeHtml(
            fecha(
                fechaFinal
            )
        )}
                        </strong>
                    </div>

                </div>

            </div>

        </article>


        <footer class="pda-stage-footer">

            <button
                type="button"
                class="pda-secondary-button"
                data-pda-close
            >
                Cerrar expediente
            </button>

        </footer>
    `;


    return renderizarEstructuraGestionPda(
        pda,
        contenido
    );
}

function cerrarModalGestionPDA() {
    const modal = document.getElementById('modalGestionPDA');
    if (modal) modal.remove();
    window.pdaActualGestion = null;
}

async function abrirGestionPDADesdeAlerta(agente) {
    const pdaActivo = (window.datosPDA || []).find(pda =>
        pda.agente === agente &&
        ['pendiente', 'notificado', 'en_gestion', 'en_seguimiento'].includes(pda.estado)
    );

    if (pdaActivo) {
        await abrirGestionPDA(pdaActivo.id);
    } else {
        alert('No se encontró un PDA activo para este gestor');
    }
}

function renderizarModalPendiente(
    pda
) {
    const fechaDeteccion =
        formatearFechaPdaDashboard(
            pda?.fecha_deteccion
        );


    const contenido = `
        <div class="pda-stage-header">

            <div>
                <span class="pda-stage-kicker">
                    ETAPA ACTUAL
                </span>

                <h3>
                    Notificación al gestor
                </h3>

                <p>
                    El PDA ha sido generado y todavía está
                    pendiente de comunicación formal al gestor.
                    Registra los datos de la notificación para
                    continuar con la intervención.
                </p>
            </div>

        </div>


        <div class="pda-stage-grid">

            <article class="pda-stage-card">

                <h4>
                    Información del PDA
                </h4>

                <div class="pda-stage-data">

                    <div>
                        <span>Fecha de detección</span>

                        <strong>
                            ${escapeHtml(
        fechaDeteccion
    )}
                        </strong>
                    </div>

                    <div>
                        <span>Estado actual</span>

                        <strong>
                            Pendiente de notificación
                        </strong>
                    </div>

                </div>

            </article>


            <article class="pda-stage-card">

                <h4>
                    Qué corresponde hacer ahora
                </h4>

                <p>
                    Comunicar al gestor la apertura de su PDA
                    y dejar evidencia de quién realizó la
                    notificación, cuándo se efectuó y cualquier
                    observación relevante.
                </p>

            </article>

        </div>


        <article
            class="pda-stage-card pda-stage-card-wide"
        >

            <h4>
                Registrar notificación
            </h4>


            <div class="pda-notification-form">

                <div class="pda-field">

                    <label for="fechaNotificacion">
                        Fecha de notificación
                        <span>*</span>
                    </label>

                    <input
                        type="date"
                        id="fechaNotificacion"
                        required
                    >

                </div>


                <div class="pda-field">

                    <label for="supervisorNotifico">
                        Notificado por
                        <span>*</span>
                    </label>

                    <input
                        type="text"
                        id="supervisorNotifico"
                        placeholder="Nombre del supervisor que realizó la notificación"
                        required
                    >

                </div>


                <div class="pda-field pda-field-full">

                    <label for="observacionesNotificacion">
                        Comentarios
                        <small>
                            Opcional
                        </small>
                    </label>

                    <textarea
                        id="observacionesNotificacion"
                        rows="4"
                        placeholder="Comentarios sobre la comunicación realizada al gestor..."
                    ></textarea>

                </div>

            </div>


            <div class="pda-stage-note">

                Al registrar la notificación, el PDA pasará
                automáticamente a la etapa
                <strong>Notificado</strong> y quedará habilitado
                el siguiente paso del proceso.

            </div>

        </article>


        <footer class="pda-stage-footer">

            <button
                type="button"
                class="pda-secondary-button"
                data-pda-close
            >
                Cancelar
            </button>

            <button
                type="button"
                class="pda-primary-button"
                onclick="marcarComoNotificado(${Number(
        pda?.id || 0
    )})"
            >
                Marcar como notificado
            </button>

        </footer>
    `;


    return renderizarEstructuraGestionPda(
        pda,
        contenido
    );
}

async function continuarSeguimientoPDA(
    pdaId
) {
    const confirmar =
        window.confirm(
            'El PDA continuará en seguimiento.\n\n' +

            'MECA esperará un nuevo ciclo completo para volver a evaluar la evolución.'
        );


    if (!confirmar) {
        return;
    }


    if (
        typeof cerrarModalGestionPDA ===
        'function'
    ) {
        cerrarModalGestionPDA();
    }


    if (
        typeof cargarDatosPDA ===
        'function'
    ) {
        await cargarDatosPDA();
    }
}


async function derivarPdaACapacitacion(
    pdaId
) {
    const id =
        Number(
            pdaId
        );


    if (
        !Number.isInteger(
            id
        ) ||
        id <= 0
    ) {
        alert(
            '❌ ID de PDA inválido.'
        );

        return;
    }


    const persona =
        String(
            window.usuarioActual
                ?.nombre_completo ??
            window.usuarioActual
                ?.usuario ??
            ''
        ).trim();


    if (!persona) {
        alert(
            '❌ No se pudo identificar al supervisor.'
        );

        return;
    }


    const confirmar =
        window.confirm(
            '¿Desea derivar este PDA a capacitación?\n\n' +

            'El PDA permanecerá abierto y, después de la capacitación, ' +

            'volverá a seguimiento para medir la evolución del gestor.'
        );


    if (!confirmar) {
        return;
    }


    try {

        if (
            typeof API
                ?.derivarPdaACapacitacionApi !==
            'function'
        ) {
            throw new Error(
                'La operación de capacitación no está disponible.'
            );
        }


        await API
            .derivarPdaACapacitacionApi(
                id,
                {
                    enviado_por:
                        persona
                }
            );


        alert(
            '✅ PDA derivado a capacitación correctamente.'
        );


        if (
            typeof cerrarModalGestionPDA ===
            'function'
        ) {
            cerrarModalGestionPDA();
        }


        if (
            typeof cargarDatosPDA ===
            'function'
        ) {
            await cargarDatosPDA();
        }


        if (
            typeof abrirGestionPDA ===
            'function'
        ) {
            await abrirGestionPDA(
                id
            );
        }


    } catch (error) {

        console.error(
            '❌ Error derivando PDA a capacitación:',
            error
        );


        alert(
            '❌ No se pudo derivar el PDA:\n\n' +
            (
                error?.message ||
                'Error desconocido'
            )
        );
    }
}


async function cerrarPdaPorMejora(
    pdaId
) {
    const id =
        Number(
            pdaId
        );


    if (
        !Number.isInteger(
            id
        ) ||
        id <= 0
    ) {
        alert(
            '❌ ID de PDA inválido.'
        );

        return;
    }


    const persona =
        String(
            window.usuarioActual
                ?.nombre_completo ??
            window.usuarioActual
                ?.usuario ??
            ''
        ).trim();


    if (!persona) {
        alert(
            '❌ No se pudo identificar al supervisor.'
        );

        return;
    }


    const confirmar =
        window.confirm(
            '¿Desea cerrar este PDA por mejora?\n\n' +

            'El expediente quedará finalizado y conservará ' +

            'el resultado del último ciclo de seguimiento.'
        );


    if (!confirmar) {
        return;
    }


    try {

        if (
            typeof API
                ?.cerrarPdaPorMejoraApi !==
            'function'
        ) {
            throw new Error(
                'La operación de cierre PDA no está disponible.'
            );
        }


        const resultado =
            await API
                .cerrarPdaPorMejoraApi(
                    id,
                    {
                        cerrado_por:
                            persona
                    }
                );


        const evaluacion =
            resultado
                ?.evaluacion;


        alert(
            '✅ PDA cerrado correctamente.\n\n' +

            `Supervisor: ${persona}\n` +

            `Último ciclo: #${evaluacion
                ?.seguimiento
                ?.ciclo ??
            'N/A'
            }\n` +

            `Resultado: ${Number(
                evaluacion
                    ?.seguimiento
                    ?.promedio ??
                0
            ).toFixed(1)
            }%\n` +

            `Cuartil: ${evaluacion
                ?.seguimiento
                ?.cuartil ??
            'N/A'
            }`
        );


        if (
            typeof cerrarModalGestionPDA ===
            'function'
        ) {
            cerrarModalGestionPDA();
        }


        if (
            typeof cargarDatosPDA ===
            'function'
        ) {
            await cargarDatosPDA();
        }


    } catch (error) {

        console.error(
            '❌ Error cerrando PDA por mejora:',
            error
        );


        alert(
            '❌ No se pudo cerrar el PDA:\n\n' +
            (
                error?.message ||
                'Error desconocido'
            )
        );
    }
}

async function escalarPdaAGerencia(
    pdaId
) {
    const id =
        Number(
            pdaId
        );


    if (
        !Number.isInteger(id) ||
        id <= 0
    ) {
        alert(
            '❌ ID de PDA inválido.'
        );

        return;
    }


    const persona =
        String(
            window.usuarioActual
                ?.nombre_completo ??
            window.usuarioActual
                ?.usuario ??
            ''
        ).trim();


    if (!persona) {
        alert(
            '❌ No se pudo identificar al supervisor.'
        );

        return;
    }


    const confirmar =
        window.confirm(
            'El gestor continúa presentando bajo desempeño ' +
            'después de la capacitación.\n\n' +

            '¿Desea escalar formalmente este PDA?'
        );


    if (!confirmar) {
        return;
    }


    try {

        if (
            typeof API
                ?.escalarPdaApi !==
            'function'
        ) {
            throw new Error(
                'La operación de escalamiento no está disponible.'
            );
        }


        await API
            .escalarPdaApi(
                id,
                {
                    escalado_por:
                        persona,

                    motivo:
                        'Persistencia posterior a capacitación'
                }
            );


        alert(
            '✅ PDA escalado correctamente.'
        );


        if (
            typeof cerrarModalGestionPDA ===
            'function'
        ) {
            cerrarModalGestionPDA();
        }


        if (
            typeof cargarDatosPDA ===
            'function'
        ) {
            await cargarDatosPDA();
        }


    } catch (error) {

        console.error(
            '❌ Error escalando PDA:',
            error
        );


        alert(
            '❌ No se pudo escalar el PDA:\n\n' +
            (
                error?.message ||
                'Error desconocido'
            )
        );
    }
}