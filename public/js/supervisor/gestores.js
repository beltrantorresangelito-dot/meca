let gestoresPaginaActual = 1;
let gestoresPageSizeActual = 25;
let gestoresFiltradosActual = [];
let gestorSeleccionadoDashboardActual = null;

function setGestorSeleccionadoDashboard(
    gestor
) {
    gestorSeleccionadoDashboardActual =
        gestor ?? null;
}

async function renderizarGestoresDashboard() {
    const tbody =
        document.getElementById(
            'gestoresTableBody'
        );

    const contador =
        document.getElementById(
            'gestoresTableCount'
        );


    if (!tbody) {
        return;
    }


    // ======================================================
    // 1. LEER CONTEXTO
    // ======================================================

    const periodoFiltro =
        document
            .getElementById(
                'gestoresPeriodo'
            )
            ?.value ||
        '';


    const quiebreFiltro =
        document
            .getElementById(
                'gestoresQuiebre'
            )
            ?.value ||
        '';


    const campanaFiltro =
        document
            .getElementById(
                'gestoresCampana'
            )
            ?.value ||
        '';


    // ======================================================
    // 2. CARGAR UNIVERSO DESDE API
    // ======================================================

    tbody.innerHTML = `
        <tr>
            <td
                colspan="10"
                class="gestores-table-empty"
            >
                Cargando información de gestores...
            </td>
        </tr>
    `;


    let respuesta;


    try {
        respuesta =
            await API.getGestoresResumen({
                periodo:
                    periodoFiltro ||
                    null,

                quiebreId:
                    quiebreFiltro ||
                    null,

                campanaId:
                    campanaFiltro ||
                    null
            });

    } catch (error) {
        console.error(
            '❌ Error cargando Gestores 2.0 vía API:',
            error
        );


        tbody.innerHTML = `
            <tr>
                <td
                    colspan="10"
                    class="gestores-table-empty"
                >
                    No fue posible cargar
                    la información de gestores.
                </td>
            </tr>
        `;


        return;
    }


    // ======================================================
    // 3. UNIVERSO YA RESUELTO POR BACKEND
    // ======================================================

    const gestores =
        Array.isArray(
            respuesta?.gestores
        )
            ? respuesta.gestores
            : [];


    console.log(
        '📊 Gestores 2.0 vía API:',
        {
            filtros:
                respuesta?.filters,

            gestores:
                gestores.length,

            auditorias:
                respuesta?.evaluaciones
        }
    );


    if (
        gestores.length === 0
    ) {
        tbody.innerHTML = `
            <tr>
                <td
                    colspan="10"
                    class="gestores-table-empty"
                >
                    No existen gestores
                    para el contexto seleccionado.
                </td>
            </tr>
        `;


        gestoresFiltradosActual =
            [];


        if (contador) {
            contador.textContent =
                '0';
        }


        return;
    }


    // ======================================================
    // 4. FILTROS
    // ======================================================

    let filtrados =
        [...gestores];


    const busqueda =
        (
            document
                .getElementById(
                    'gestoresBuscar'
                )
                ?.value ||
            ''
        )
            .trim()
            .toLowerCase();


    const liderFiltro =
        document
            .getElementById(
                'gestoresLider'
            )
            ?.value ||
        '';


    const estadoFiltro =
        document
            .getElementById(
                'gestoresEstado'
            )
            ?.value ||
        '';


    const pdaFiltro =
        document
            .getElementById(
                'gestoresPda'
            )
            ?.value ||
        '';


    if (busqueda) {
        filtrados =
            filtrados.filter(
                item =>
                    String(
                        item.agente ||
                        ''
                    )
                        .toLowerCase()
                        .includes(
                            busqueda
                        )
            );
    }


    if (liderFiltro) {
        filtrados =
            filtrados.filter(
                item =>
                    item.lider ===
                    liderFiltro
            );
    }


    if (estadoFiltro) {
        filtrados =
            filtrados.filter(
                item =>
                    item.estado ===
                    estadoFiltro
            );
    }


    if (pdaFiltro) {
        filtrados =
            filtrados.filter(
                item => {
                    switch (
                    pdaFiltro
                    ) {
                        case 'requiere':
                            return (
                                item
                                    .ciclosPendientesPda
                                    .length >
                                0
                            );

                        case 'activo':
                        case 'pendiente':
                            return (
                                item
                                    .ciclosConPda
                                    .length >
                                0
                            );

                        case 'sin_pda':
                            return (
                                item
                                    .ciclosAlerta
                                    .length ===
                                0
                            );

                        case 'cerrado':
                            return false;

                        default:
                            return true;
                    }
                }
            );
    }


    gestoresFiltradosActual =
        filtrados;


    // ======================================================
    // 5. PAGINACIÓN
    // ======================================================

    gestoresPageSizeActual =
        Number(
            document
                .getElementById(
                    'gestoresPageSize'
                )
                ?.value ||
            25
        );


    const totalPaginas =
        Math.max(
            1,
            Math.ceil(
                filtrados.length /
                gestoresPageSizeActual
            )
        );


    if (
        gestoresPaginaActual >
        totalPaginas
    ) {
        gestoresPaginaActual =
            totalPaginas;
    }


    const inicio =
        (
            gestoresPaginaActual -
            1
        ) *
        gestoresPageSizeActual;


    const pagina =
        filtrados.slice(
            inicio,
            inicio +
            gestoresPageSizeActual
        );


    // ======================================================
    // 6. RENDER
    // ======================================================

    tbody.innerHTML =
        '';


    if (
        pagina.length === 0
    ) {
        tbody.innerHTML = `
            <tr>
                <td
                    colspan="10"
                    class="gestores-table-empty"
                >
                    No existen gestores
                    para los filtros seleccionados.
                </td>
            </tr>
        `;

    } else {
        pagina.forEach(
            gestor => {
                const fila =
                    document.createElement(
                        'tr'
                    );


                const ultimoCiclo =
                    gestor.ultimoCicloCompleto ||
                    null;


                const promedio =
                    Number(
                        gestor.promedio ||
                        0
                    );


                const cuartil =
                    ultimoCiclo?.cuartil ||
                    '—';


                const ciclosCompletos =
                    Array.isArray(
                        gestor.ciclosCompletos
                    )
                        ? gestor
                            .ciclosCompletos
                            .length
                        : 0;


                const ciclosCriticos =
                    Array.isArray(
                        gestor.ciclosAlerta
                    )
                        ? gestor
                            .ciclosAlerta
                            .length
                        : 0;


                const ciclosPendientes =
                    Array.isArray(
                        gestor.ciclosPendientesPda
                    )
                        ? gestor
                            .ciclosPendientesPda
                            .length
                        : 0;


                let estadoTexto =
                    'Sin ciclo';


                switch (
                gestor.estado
                ) {
                    case 'critico':
                        estadoTexto =
                            '🔴 Crítico';
                        break;

                    case 'seguimiento':
                        estadoTexto =
                            '⚠️ Seguimiento';
                        break;

                    case 'favorable':
                        estadoTexto =
                            '✅ Favorable';
                        break;
                }


                fila.innerHTML = `
                    <td>
                        <strong>
                            ${escapeHtml(
                    gestor.agente ||
                    ''
                )}
                        </strong>
                    </td>

                    <td>
                        ${escapeHtml(
                    gestor.lider ||
                    'Sin líder'
                )}
                    </td>

                    <td style="text-align:center;">
                        ${Number(
                    gestor.count ||
                    0
                )}
                    </td>

                    <td style="text-align:center;">
                        ${promedio.toFixed(1)}%
                    </td>

                    <td style="text-align:center;">
                        ${escapeHtml(
                    cuartil
                )}
                    </td>

                    <td style="text-align:center;">
                        ${ciclosCompletos}
                    </td>

                    <td style="text-align:center;">
                        ${ciclosCriticos}
                    </td>

                    <td style="text-align:center;">
                        ${ciclosPendientes}
                    </td>

                    <td style="text-align:center;">
                        ${estadoTexto}
                    </td>

                    <td style="text-align:center;">
                        <button
                            type="button"
                            class="gestores-ver-detalle"
                        >
                            Ver
                        </button>
                    </td>
                `;


                fila
                    .querySelector(
                        '.gestores-ver-detalle'
                    )
                    ?.addEventListener(
                        'click',
                        () => {
                            mostrarDetalleGestorDashboard(
                                gestor
                            );
                        }
                    );


                tbody.appendChild(
                    fila
                );
            }
        );
    }


    // ======================================================
    // 7. KPIs
    // ======================================================

    actualizarKpisGestoresDashboard(
        filtrados
    );


    // ======================================================
    // 8. CONTADOR / PAGINACIÓN
    // ======================================================

    if (contador) {
        contador.textContent =
            filtrados.length
                .toLocaleString(
                    'es-PE'
                );
    }


    actualizarPaginacionGestoresDashboard(
        filtrados.length,
        totalPaginas
    );
}

function actualizarKpisGestoresDashboard(
    gestores
) {
    const lista =
        Array.isArray(
            gestores
        )
            ? gestores
            : [];


    // ======================================================
    // 1. TOTAL DE GESTORES
    // ======================================================

    const totalGestores =
        lista.length;


    // ======================================================
    // 2. GESTORES EN SEGUIMIENTO
    // ======================================================

    const gestoresSeguimiento =
        lista.filter(
            item =>
                item?.estado ===
                'seguimiento'
        ).length;


    // ======================================================
    // 3. GESTORES QUE REALMENTE TIENEN PDA PENDIENTE
    //
    // IMPORTANTE:
    //
    // No usamos ciclosAlerta.
    //
    // ciclosPendientesPda ya representa los ciclos que,
    // según la lógica del backend, pueden originar PDA.
    //
    // Un gestor cuenta UNA sola vez aunque tenga
    // varios ciclos pendientes.
    // ======================================================

    const gestoresConAlerta =
        lista.filter(
            item =>
                Array.isArray(
                    item?.ciclosPendientesPda
                ) &&
                item
                    .ciclosPendientesPda
                    .length >
                0
        ).length;


    // ======================================================
    // 4. TOTAL DE CICLOS PENDIENTES PDA
    //
    // Aquí sí contamos TODOS los ciclos.
    //
    // Ejemplo:
    //
    // Gestor A -> 2
    // Gestor B -> 1
    //
    // Gestores con alerta PDA = 2
    // Ciclos pendientes PDA   = 3
    // ======================================================

    const ciclosPendientes =
        lista.reduce(
            (
                total,
                item
            ) => {
                const ciclos =
                    Array.isArray(
                        item?.ciclosPendientesPda
                    )
                        ? item
                            .ciclosPendientesPda
                        : [];


                return (
                    total +
                    ciclos.length
                );
            },
            0
        );


    // ======================================================
    // 5. ASIGNAR KPI
    // ======================================================

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
        'gestoresKpiTotal',
        totalGestores
    );


    asignar(
        'gestoresKpiSeguimiento',
        gestoresSeguimiento
    );


    asignar(
        'gestoresKpiRequierePda',
        gestoresConAlerta
    );


    asignar(
        'gestoresKpiPdaActivos',
        ciclosPendientes
    );
}


function actualizarPaginacionGestoresDashboard(
    total,
    totalPaginas
) {
    const info =
        document.getElementById(
            'gestoresPaginationInfo'
        );

    const actual =
        document.getElementById(
            'gestoresPaginaActual'
        );

    const anterior =
        document.getElementById(
            'gestoresPaginaAnterior'
        );

    const siguiente =
        document.getElementById(
            'gestoresPaginaSiguiente'
        );


    if (info) {
        info.textContent =
            `${total.toLocaleString(
                'es-PE'
            )} registros`;
    }


    if (actual) {
        actual.textContent =
            `Página ${gestoresPaginaActual} de ${totalPaginas}`;
    }


    if (anterior) {
        anterior.disabled =
            gestoresPaginaActual <= 1;
    }


    if (siguiente) {
        siguiente.disabled =
            gestoresPaginaActual >=
            totalPaginas;
    }
}

async function inicializarGestoresDashboard() {

    // ======================================================
    // 1. CARGAR FILTROS BASE
    // ======================================================

    await cargarFiltrosBaseGestoresDashboard();


    // ======================================================
    // 2. OBTENER CONTROLES
    // ======================================================

    const aplicar =
        document.getElementById(
            'gestoresAplicarFiltros'
        );

    const limpiar =
        document.getElementById(
            'gestoresLimpiarFiltros'
        );

    const quiebre =
        document.getElementById(
            'gestoresQuiebre'
        );

    const anterior =
        document.getElementById(
            'gestoresPaginaAnterior'
        );

    const siguiente =
        document.getElementById(
            'gestoresPaginaSiguiente'
        );

    const pageSize =
        document.getElementById(
            'gestoresPageSize'
        );

    const cerrar =
        document.getElementById(
            'gestoresCerrarDetalle'
        );

    const gestionarPda =
        document.getElementById(
            'gestoresGestionarPda'
        );

    // ======================================================
    // 3. CAMBIO DE QUIEBRE
    //    - Recarga campañas
    //    - Reinicia página
    //    - Invalida ciclos
    //    - Refresca dashboard
    // ======================================================

    if (
        quiebre &&
        quiebre.dataset.initialized !==
        'true'
    ) {
        quiebre.dataset.initialized =
            'true';


        quiebre.addEventListener(
            'change',
            async () => {

                gestoresPaginaActual =
                    1;


                await cargarCampanasGestoresDashboard();


                if (
                    typeof invalidarCacheCiclos ===
                    'function'
                ) {
                    invalidarCacheCiclos();
                }


                await renderizarGestoresDashboard();
            }
        );
    }


    // ======================================================
    // 4. APLICAR FILTROS
    // ======================================================

    if (
        aplicar &&
        aplicar.dataset.initialized !==
        'true'
    ) {
        aplicar.dataset.initialized =
            'true';


        aplicar.addEventListener(
            'click',
            async () => {

                gestoresPaginaActual =
                    1;


                if (
                    typeof invalidarCacheCiclos ===
                    'function'
                ) {
                    invalidarCacheCiclos();
                }


                await renderizarGestoresDashboard();
            }
        );
    }


    // ======================================================
    // 5. LIMPIAR FILTROS
    // ======================================================

    if (
        limpiar &&
        limpiar.dataset.initialized !==
        'true'
    ) {
        limpiar.dataset.initialized =
            'true';


        limpiar.addEventListener(
            'click',
            async () => {

                const idsFiltros = [
                    'gestoresPeriodo',
                    'gestoresQuiebre',
                    'gestoresCampana',
                    'gestoresLider',
                    'gestoresEstado',
                    'gestoresPda',
                    'gestoresBuscar'
                ];


                idsFiltros.forEach(
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


                gestoresPaginaActual =
                    1;


                /*
                 * Al limpiar Quiebre,
                 * Campaña debe volver
                 * al estado inicial.
                 */
                await cargarCampanasGestoresDashboard();


                if (
                    typeof invalidarCacheCiclos ===
                    'function'
                ) {
                    invalidarCacheCiclos();
                }


                await renderizarGestoresDashboard();
            }
        );
    }


    // ======================================================
    // 6. PÁGINA ANTERIOR
    // ======================================================

    if (
        anterior &&
        anterior.dataset.initialized !==
        'true'
    ) {
        anterior.dataset.initialized =
            'true';


        anterior.addEventListener(
            'click',
            async () => {

                if (
                    gestoresPaginaActual >
                    1
                ) {
                    gestoresPaginaActual--;


                    await renderizarGestoresDashboard();
                }
            }
        );
    }


    // ======================================================
    // 7. PÁGINA SIGUIENTE
    // ======================================================

    if (
        siguiente &&
        siguiente.dataset.initialized !==
        'true'
    ) {
        siguiente.dataset.initialized =
            'true';


        siguiente.addEventListener(
            'click',
            async () => {

                gestoresPaginaActual++;


                await renderizarGestoresDashboard();
            }
        );
    }


    // ======================================================
    // 8. CAMBIO DE TAMAÑO DE PÁGINA
    // ======================================================

    if (
        pageSize &&
        pageSize.dataset.initialized !==
        'true'
    ) {
        pageSize.dataset.initialized =
            'true';


        pageSize.addEventListener(
            'change',
            async () => {

                gestoresPaginaActual =
                    1;


                await renderizarGestoresDashboard();
            }
        );
    }


    // ======================================================
    // 9. CERRAR DETALLE
    // ======================================================

    if (
        cerrar &&
        cerrar.dataset.initialized !==
        'true'
    ) {
        cerrar.dataset.initialized =
            'true';


        cerrar.addEventListener(
            'click',
            () => {

                const panel =
                    document.getElementById(
                        'gestoresDetalle'
                    );


                if (panel) {
                    panel.hidden =
                        true;
                }
            }
        );
    }
    // ======================================================
    // 10. GESTIONAR PDA DEL GESTOR SELECCIONADO
    // ======================================================

    if (
        gestionarPda &&
        gestionarPda.dataset.initialized !==
        'true'
    ) {
        gestionarPda.dataset.initialized =
            'true';


        gestionarPda.addEventListener(
            'click',
            async event => {

                event.preventDefault();

                event.stopPropagation();


                console.log(
                    '🔥 CLICK GESTIONAR PDA'
                );


                const gestor =
                    gestorSeleccionadoDashboardActual;


                console.log(
                    '👤 GESTOR ACTUAL:',
                    gestor?.agente
                );


                if (!gestor) {
                    alert(
                        'No hay un gestor seleccionado.'
                    );

                    return;
                }


                try {
                    await gestionarPdaGestorDashboard(
                        gestor
                    );

                } catch (error) {
                    console.error(
                        '❌ Error gestionando PDA desde Gestores 2.0:',
                        error
                    );

                    alert(
                        'No fue posible abrir la gestión PDA.'
                    );
                }
            }
        );
    }
}
async function cargarFiltrosBaseGestoresDashboard() {

    const selectLider =
        document.getElementById(
            'gestoresLider'
        );

    const selectPeriodo =
        document.getElementById(
            'gestoresPeriodo'
        );


    // ======================================================
    // LÍDERES
    // ======================================================

    if (
        selectLider &&
        typeof API?.getLideres ===
        'function'
    ) {
        try {
            const lideres =
                await API.getLideres();


            const valorActual =
                selectLider.value;


            selectLider.innerHTML =
                '<option value="">Todos</option>';


            (
                Array.isArray(lideres)
                    ? lideres
                    : []
            )
                .map(
                    item => {
                        if (
                            typeof item ===
                            'string'
                        ) {
                            return item;
                        }

                        return (
                            item?.lider_2026 ||
                            item?.lider ||
                            item?.nombre ||
                            ''
                        );
                    }
                )
                .filter(Boolean)
                .filter(
                    (
                        valor,
                        indice,
                        lista
                    ) =>
                        lista.indexOf(
                            valor
                        ) === indice
                )
                .sort(
                    (
                        a,
                        b
                    ) =>
                        a.localeCompare(
                            b,
                            'es'
                        )
                )
                .forEach(
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


            if (
                valorActual &&
                Array.from(
                    selectLider.options
                ).some(
                    option =>
                        option.value ===
                        valorActual
                )
            ) {
                selectLider.value =
                    valorActual;
            }

        } catch (error) {
            console.error(
                '❌ Error cargando líderes Gestores 2.0:',
                error
            );
        }
    }


    // ======================================================
    // PERÍODOS
    // ======================================================

    if (
        selectPeriodo &&
        typeof API?.getMesesDisponibles ===
        'function'
    ) {
        try {
            const meses =
                await API
                    .getMesesDisponibles();


            const valorActual =
                selectPeriodo.value;


            selectPeriodo.innerHTML =
                '<option value="">Todos los períodos</option>';


            (
                Array.isArray(meses)
                    ? meses
                    : []
            ).forEach(
                mes => {
                    const valor =
                        mes.valor ||
                        `${mes.anio}-${String(
                            mes.mes
                        ).padStart(
                            2,
                            '0'
                        )}`;


                    const option =
                        document.createElement(
                            'option'
                        );

                    option.value =
                        valor;

                    option.textContent =
                        mes.label ||
                        valor;


                    selectPeriodo.appendChild(
                        option
                    );
                }
            );


            if (
                valorActual &&
                Array.from(
                    selectPeriodo.options
                ).some(
                    option =>
                        option.value ===
                        valorActual
                )
            ) {
                selectPeriodo.value =
                    valorActual;
            }

        } catch (error) {
            console.error(
                '❌ Error cargando períodos Gestores 2.0:',
                error
            );
        }
    }
    await cargarQuiebresGestoresDashboard();
    await cargarCampanasGestoresDashboard();
}

async function cargarQuiebresGestoresDashboard() {
    const select =
        document.getElementById(
            'gestoresQuiebre'
        );

    if (!select) {
        return;
    }


    try {
        const quiebres =
            await obtenerQuiebres();


        const valorActual =
            select.value;


        select.innerHTML =
            '<option value="">Todos</option>';


        (
            Array.isArray(quiebres)
                ? quiebres
                : []
        ).forEach(
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


                option.dataset.codigo =
                    quiebre.codigo ||
                    '';


                select.appendChild(
                    option
                );
            }
        );


        if (
            valorActual &&
            Array.from(
                select.options
            ).some(
                option =>
                    option.value ===
                    valorActual
            )
        ) {
            select.value =
                valorActual;
        }

    } catch (error) {
        console.error(
            '❌ Error cargando quiebres Gestores 2.0:',
            error
        );
    }
}

async function cargarCampanasGestoresDashboard() {
    const quiebreSelect =
        document.getElementById(
            'gestoresQuiebre'
        );

    const campanaSelect =
        document.getElementById(
            'gestoresCampana'
        );


    if (!campanaSelect) {
        return;
    }


    const quiebreId =
        Number(
            quiebreSelect?.value
        );


    campanaSelect.innerHTML =
        '<option value="">Todas</option>';


    /*
     * Sin quiebre no mostramos campañas
     * mezcladas de distintos contextos.
     */
    if (
        !Number.isInteger(quiebreId) ||
        quiebreId <= 0
    ) {
        campanaSelect.disabled =
            true;

        campanaSelect.innerHTML = `
            <option value="">
                Seleccione un quiebre
            </option>
        `;

        return;
    }


    try {
        const campanas =
            await obtenerCampanasPorQuiebre(
                quiebreId
            );


        campanaSelect.disabled =
            false;


        campanaSelect.innerHTML =
            '<option value="">Todas las campañas</option>';


        /*
         * Permite representar evaluaciones
         * asignadas directamente al quiebre.
         */
        const directo =
            document.createElement(
                'option'
            );

        directo.value =
            '__SIN_CAMPANA__';

        directo.textContent =
            'Sin campaña';

        campanaSelect.appendChild(
            directo
        );


        (
            Array.isArray(campanas)
                ? campanas
                : []
        ).forEach(
            campana => {
                const option =
                    document.createElement(
                        'option'
                    );


                option.value =
                    String(
                        campana.id
                    );


                option.textContent =
                    campana.descripcion
                        ? `${campana.codigo} - ${campana.descripcion}`
                        : campana.codigo;


                option.dataset.codigo =
                    campana.codigo ||
                    '';


                campanaSelect.appendChild(
                    option
                );
            }
        );

    } catch (error) {
        console.error(
            '❌ Error cargando campañas Gestores 2.0:',
            error
        );
    }
}

function evaluacionPertenecePeriodoGestores(
    evaluacion,
    periodo
) {
    if (!periodo) {
        return true;
    }


    const fecha =
        typeof obtenerFechaEvaluacion ===
            'function'
            ? obtenerFechaEvaluacion(
                evaluacion
            )
            : null;


    if (
        !fecha ||
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

function cicloPertenecePeriodoGestores(
    ciclo,
    periodo
) {
    if (!periodo) {
        return true;
    }


    const evaluaciones =
        Array.isArray(
            ciclo?.evaluaciones
        )
            ? ciclo.evaluaciones
            : [];


    return evaluaciones.some(
        evaluacion =>
            evaluacionPertenecePeriodoGestores(
                evaluacion,
                periodo
            )
    );
}


function obtenerQuiebreEfectivoEvaluacionGestores(
    evaluacion,
    mapaCampanasPorId
) {
    const quiebreDirecto =
        Number(
            evaluacion?.quiebre_id
        );


    if (
        Number.isInteger(
            quiebreDirecto
        ) &&
        quiebreDirecto > 0
    ) {
        return quiebreDirecto;
    }


    const campanaId =
        Number(
            evaluacion?.campana_id
        );


    if (
        !Number.isInteger(
            campanaId
        ) ||
        campanaId <= 0
    ) {
        return null;
    }


    const campana =
        mapaCampanasPorId?.get(
            campanaId
        );


    const quiebreCampana =
        Number(
            campana?.quiebre_id
        );


    return (
        Number.isInteger(
            quiebreCampana
        ) &&
        quiebreCampana > 0
    )
        ? quiebreCampana
        : null;
}

async function abrirDetalleCicloGestoresDashboard(
    gestor,
    ciclo
) {
    if (
        !gestor ||
        !ciclo
    ) {
        return;
    }


    const modal =
        document.getElementById(
            'modalDetalleCicloGP'
        );

    const subtitle =
        document.getElementById(
            'modalDetalleCicloSubtitleGP'
        );


    if (
        !modal ||
        !subtitle
    ) {
        console.error(
            '❌ No se encontró el modal de detalle de ciclo'
        );

        return;
    }


    // ======================================================
    // 1. COPIA DEL CICLO CONTEXTUAL
    // ======================================================
    const evaluacionesBase =
        Array.isArray(
            ciclo.evaluaciones
        )
            ? ciclo.evaluaciones
            : [];


    const cicloDetalle = {
        ...ciclo,

        evaluaciones:
            evaluacionesBase.map(
                evaluacion => ({
                    ...evaluacion
                })
            )
    };


    // ======================================================
    // 2. CARGAR DETALLES SOLO BAJO DEMANDA
    // ======================================================
    if (
        window.API &&
        typeof API.getDetallesEvaluacion ===
        'function'
    ) {
        console.log(
            `📡 Cargando detalles de ${cicloDetalle.evaluaciones.length} evaluaciones...`
        );


        const resultados =
            await Promise.allSettled(
                cicloDetalle.evaluaciones.map(
                    evaluacion =>
                        API.getDetallesEvaluacion(
                            evaluacion.id
                        )
                )
            );


        resultados.forEach(
            (
                resultado,
                indice
            ) => {
                if (
                    resultado.status ===
                    'fulfilled'
                ) {
                    cicloDetalle
                        .evaluaciones[
                        indice
                    ]
                        .detalles =
                        resultado.value;
                } else {
                    console.warn(
                        '⚠️ No se pudieron cargar detalles de evaluación:',
                        cicloDetalle
                            .evaluaciones[
                            indice
                        ]
                            .id,
                        resultado.reason
                    );

                    cicloDetalle
                        .evaluaciones[
                        indice
                    ]
                        .detalles = [];
                }
            }
        );
    } else {
        console.warn(
            '⚠️ API.getDetallesEvaluacion no disponible'
        );
    }


    // ======================================================
    // 3. CONTEXTO DEL MODAL
    // ======================================================
    cicloActualDetalleGP = {
        gestor:
            gestor.agente,

        ciclo:
            cicloDetalle,

        cicloNumero:
            cicloDetalle.numero
    };


    // ======================================================
    // 4. CABECERA
    // ======================================================
    let cuartilTexto =
        cicloDetalle.cuartil ||
        '—';


    switch (
    cicloDetalle.cuartil
    ) {
        case 'Q1':
            cuartilTexto =
                '🏆 Q1';
            break;

        case 'Q2':
            cuartilTexto =
                '📈 Q2';
            break;

        case 'Q3':
            cuartilTexto =
                '⚠️ Q3';
            break;

        case 'Q4':
            cuartilTexto =
                '🔴 Q4';
            break;
    }


    const esCompleto =
        cicloDetalle.esCompleto
            ? '✅ Completo'
            : `⏳ En curso (${cicloDetalle.totalEvaluaciones}/5)`;


    subtitle.innerHTML = `
        ${escapeHtml(
            gestor.agente
        )}

        · Ciclo #${Number(
            cicloDetalle.numero
        )}

        · ${escapeHtml(
            formatearPeriodoGestores(
                cicloDetalle.fechaInicio,
                cicloDetalle.fechaFin
            )
        )}

        · Promedio:
        ${Number(
            cicloDetalle.promedio ||
            0
        ).toFixed(1)}%

        · ${escapeHtml(
            cuartilTexto
        )}

        · ${escapeHtml(
            esCompleto
        )}
    `;


    modal.style.display =
        'flex';


    // ======================================================
    // 5. RENDER
    // ======================================================
    await mostrarTabDetalleCicloGP(
        'evaluaciones'
    );
}


function obtenerPdaDeCicloGestoresDashboard(
    gestor,
    ciclo
) {
    if (
        !gestor ||
        !ciclo
    ) {
        return null;
    }


    /*
     * El backend ya determina qué PDA
     * corresponde al ciclo:
     *
     * - origen
     * - preintervención
     * - seguimiento
     *
     * Gestores no debe volver a inferirlo.
     */

    return (
        ciclo.pda ||
        ciclo.pdaActivo ||
        ciclo.pdaOrigen ||
        null
    );
}

async function sincronizarCiclosSeguimientoGestor(
    gestor
) {
    if (!gestor) {
        return [];
    }


    const ciclos =
        Array.isArray(
            gestor.ciclos
        )
            ? gestor.ciclos
            : [];


    const ciclosSeguimiento =
        ciclos
            .filter(
                ciclo =>
                    ciclo?.esCompleto ===
                        true &&
                    ciclo?.accionPda ===
                        'seguimiento' &&
                    ciclo?.pda &&
                    Number(
                        ciclo.pda.id
                    ) > 0
            )
            .sort(
                (
                    a,
                    b
                ) =>
                    Number(
                        a.numero
                    ) -
                    Number(
                        b.numero
                    )
            );


    if (
        ciclosSeguimiento.length ===
        0
    ) {
        return [];
    }


    if (
        typeof API
            ?.registrarCicloSeguimientoPDA !==
        'function'
    ) {
        console.error(
            '❌ API.registrarCicloSeguimientoPDA no está disponible.'
        );


        return [];
    }


    const resultados =
        [];


    for (
        const ciclo
        of ciclosSeguimiento
    ) {
        const pdaId =
            Number(
                ciclo
                    ?.pda
                    ?.id
            );


        if (
            !Number.isInteger(
                pdaId
            ) ||
            pdaId <= 0
        ) {
            continue;
        }


        try {

            const respuesta =
                await API
                    .registrarCicloSeguimientoPDA(
                        pdaId,
                        {
                            agente:
                                gestor.agente,

                            ciclo_numero:
                                Number(
                                    ciclo.numero
                                ),

                            fecha_inicio:
                                ciclo.fechaInicio,

                            fecha_fin:
                                ciclo.fechaFin,

                            total_evaluaciones:
                                Number(
                                    ciclo.totalEvaluaciones ||
                                    0
                                ),

                            promedio_nota:
                                Number(
                                    ciclo.promedio ||
                                    0
                                ),

                            cuartil:
                                ciclo.cuartil,

                            esCompleto:
                                ciclo.esCompleto ===
                                true,

                            quiebre_id:
                                ciclo.quiebreId,

                            evaluaciones:
                                Array.isArray(
                                    ciclo.evaluaciones
                                )
                                    ? ciclo.evaluaciones
                                    : [],

                            contexto_snapshot: {
                                quiebre_id:
                                    ciclo.quiebreId,

                                ciclo_numero:
                                    Number(
                                        ciclo.numero
                                    ),

                                fecha_inicio:
                                    ciclo.fechaInicio,

                                fecha_fin:
                                    ciclo.fechaFin,

                                promedio:
                                    Number(
                                        ciclo.promedio ||
                                        0
                                    ),

                                cuartil:
                                    ciclo.cuartil
                            }
                        }
                    );


            resultados.push({
                ciclo:
                    Number(
                        ciclo.numero
                    ),

                pdaId,

                success:
                    true,

                data:
                    respuesta?.data ??
                    respuesta
            });


        } catch (error) {

            /*
             * La sincronización no debe impedir
             * abrir un PDA por un ciclo aislado.
             *
             * Dejamos evidencia en consola para
             * diagnóstico.
             */

            console.error(
                `❌ Error sincronizando ciclo #${ciclo.numero} con PDA #${pdaId}:`,
                error
            );


            resultados.push({
                ciclo:
                    Number(
                        ciclo.numero
                    ),

                pdaId,

                success:
                    false,

                error:
                    error?.message ||
                    'Error desconocido'
            });
        }
    }


    return resultados;
}

async function gestionarPdaGestorDashboard(
    gestor
) {
    if (!gestor) {
        return;
    }


    // ======================================================
    // 1. CICLOS DEL GESTOR
    // ======================================================

    const ciclos =
        Array.isArray(
            gestor.ciclos
        )
            ? gestor.ciclos
            : [];


    const ciclosCompletos =
        ciclos
            .filter(
                ciclo =>
                    ciclo?.esCompleto ===
                    true
            )
            .sort(
                (
                    a,
                    b
                ) =>
                    Number(
                        a.numero
                    ) -
                    Number(
                        b.numero
                    )
            );


    if (
        ciclosCompletos.length ===
        0
    ) {
        alert(
            'Este gestor todavía no tiene ciclos basales completos.'
        );

        return;
    }


    // ======================================================
    // 2. SINCRONIZAR CICLOS DE SEGUIMIENTO
    //
    // Gestores no analiza el resultado.
    // Solo registra los ciclos que backend ya clasificó
    // como seguimiento.
    // ======================================================

    await sincronizarCiclosSeguimientoGestor(
        gestor
    );


    // ======================================================
    // 3. BUSCAR PDA YA EXISTENTE
    //
    // IMPORTANTE:
    //
    // Desde Gestores NO se administra el PDA.
    //
    // Si existe:
    //     -> solamente se visualiza su documento.
    //
    // La gestión operativa se realiza exclusivamente
    // desde la pestaña PDA.
    // ======================================================

    const ciclosConPda =
        ciclosCompletos
            .filter(
                ciclo =>
                    ciclo?.pda &&
                    Number(
                        ciclo.pda.id
                    ) > 0
            )
            .sort(
                (
                    a,
                    b
                ) =>
                    Number(
                        b.numero
                    ) -
                    Number(
                        a.numero
                    )
            );


    const cicloConPda =
        ciclosConPda[0] ||
        null;


    if (
        cicloConPda
    ) {
        const pda =
            obtenerPdaDeCicloGestoresDashboard(
                gestor,
                cicloConPda
            );


        if (
            pda &&
            Number(
                pda.id
            ) > 0
        ) {

            // ==============================================
            // SOLO VISUALIZAR DOCUMENTO
            // ==============================================

            if (
                typeof window
                    .verDocumentoPda !==
                'function'
            ) {
                console.error(
                    '❌ verDocumentoPda no está disponible.'
                );


                alert(
                    'El documento PDA no está disponible para visualizar.'
                );

                return;
            }


            try {

                await window
                    .verDocumentoPda(
                        Number(
                            pda.id
                        )
                    );


            } catch (error) {

                console.error(
                    '❌ Error visualizando documento PDA:',
                    error
                );


                alert(
                    '❌ No se pudo visualizar el documento PDA:\n\n' +
                    (
                        error?.message ||
                        'Error desconocido'
                    )
                );
            }


            return;
        }
    }


    // ======================================================
    // 4. BUSCAR CICLO QUE PUEDE ORIGINAR UN PDA
    //
    // La decisión proviene de GestoresService:
    //
    //      accionPda === 'crear_pda'
    //
    // Gestores NO decide por su cuenta usando Q4.
    // ======================================================

    const cicloPendiente =
        ciclosCompletos.find(
            ciclo =>
                ciclo?.accionPda ===
                'crear_pda'
        ) ||
        null;


    if (
        !cicloPendiente
    ) {
        /*
         * Puede ocurrir cuando:
         *
         * - todos los ciclos son favorables;
         * - existe preintervención;
         * - existe un seguimiento;
         * - no existe ningún ciclo que pueda
         *   originar un nuevo PDA.
         */

        alert(
            'Este gestor no tiene actualmente un ciclo que requiera generar un nuevo PDA.'
        );

        return;
    }


    // ======================================================
    // 5. VALIDAR MÓDULO DE CREACIÓN PDA
    // ======================================================

    if (
        typeof window
            .generarPdaDesdeCiclo !==
        'function'
    ) {
        console.error(
            '❌ generarPdaDesdeCiclo no está disponible.'
        );


        alert(
            'El módulo PDA no está disponible para crear el registro.'
        );

        return;
    }


    // ======================================================
    // 6. CONFIRMACIÓN DE CREACIÓN
    // ======================================================

    const confirmar =
        window.confirm(
            `Se generará un PDA para el gestor:\n\n` +

            `${gestor.agente}\n\n` +

            `Ciclo basal: #${Number(
                cicloPendiente.numero
            )}\n` +

            `Promedio: ${Number(
                cicloPendiente.promedio ||
                0
            ).toFixed(1)}%\n` +

            `Cuartil: ${
                cicloPendiente.cuartil ||
                'Q4'
            }\n\n` +

            '¿Desea continuar?'
        );


    if (!confirmar) {
        return;
    }


    // ======================================================
    // 7. CREAR PDA INICIAL
    //
    // generarPdaDesdeCiclo() ya se encarga de:
    //
    // - construir el PDA;
    // - persistirlo;
    // - persistir el documento;
    // - mostrar el documento generado.
    //
    // Gestores NO debe abrir abrirGestionPDA().
    // ======================================================

    try {

        const creado =
            await window
                .generarPdaDesdeCiclo({
                    agente:
                        gestor.agente,

                    ciclo:
                        cicloPendiente
                });


        if (
            !creado ||
            Number(
                creado.id
            ) <= 0
        ) {
            throw new Error(
                'La creación del PDA no devolvió un registro válido.'
            );
        }


        // ==================================================
        // 8. ACTUALIZAR REFERENCIA LOCAL
        // ==================================================

        cicloPendiente.pda =
            creado;


        cicloPendiente.pdaOrigen =
            creado;


        cicloPendiente.relacionPda =
            'origen';


        cicloPendiente.accionPda =
            'sin_accion';


        // ==================================================
        // 9. REFRESCAR GESTORES
        //
        // Al refrescar, el ciclo debe regresar asociado
        // al PDA y la siguiente acción ya no será crear.
        // ==================================================

        if (
            typeof cargarDatosGestoresDashboard ===
            'function'
        ) {
            await cargarDatosGestoresDashboard();
        }


        /*
         * NO abrir:
         *
         *     abrirGestionPDA()
         *
         * El documento ya fue mostrado por
         * generarPdaDesdeCiclo().
         *
         * La gestión de etapas pertenece únicamente
         * a la pestaña PDA.
         */


    } catch (error) {

        console.error(
            '❌ Error generando PDA desde Gestores:',
            error
        );


        alert(
            '❌ No se pudo generar el PDA:\n\n' +
            (
                error?.message ||
                'Error desconocido'
            )
        );
    }
}

function mostrarDetalleGestorDashboard(
    gestor
) {
    setGestorSeleccionadoDashboard(gestor);
    const panel =
        document.getElementById(
            'gestoresDetalle'
        );


    if (!panel) {
        return;
    }


    panel.hidden =
        false;


    const nombre =
        document.getElementById(
            'gestoresDetalleNombre'
        );


    const contexto =
        document.getElementById(
            'gestoresDetalleContexto'
        );


    const resultado =
        document.getElementById(
            'gestoresDetalleResultado'
        );


    const evolucion =
        document.getElementById(
            'gestoresDetalleEvolucion'
        );


    const hallazgos =
        document.getElementById(
            'gestoresDetalleHallazgos'
        );


    const pda =
        document.getElementById(
            'gestoresDetallePda'
        );


    if (nombre) {
        nombre.textContent =
            gestor.agente ||
            '—';
    }


    if (contexto) {
        contexto.textContent =
            gestor.lider ||
            'Sin líder';
    }


    if (resultado) {
        resultado.innerHTML = `
            <div>
                <strong>
                    Nota acumulada
                </strong>

                <div>
                    ${
                        Number(
                            gestor.promedio ||
                            0
                        ).toFixed(1)
                    }%
                </div>
            </div>

            <div>
                ${
                    Number(
                        gestor.count ||
                        0
                    ).toLocaleString(
                        'es-PE'
                    )
                }
                auditorías acumuladas
            </div>

            <div>
                ${
                    gestor
                        .ciclosCompletos
                        .length
                }
                ciclos completos
            </div>

            ${
                gestor.cicloEnCurso
                    ? `
                        <div>
                            Ciclo actual:
                            ${
                                gestor
                                    .cicloEnCurso
                                    .totalEvaluaciones
                            }/5 auditorías
                        </div>
                    `
                    : ''
            }
        `;
    }


    if (evolucion) {
        const ciclos =
            Array.isArray(
                gestor.ciclos
            )
                ? gestor.ciclos
                : [];


        if (
            ciclos.length === 0
        ) {
            evolucion.innerHTML =
                'Sin ciclos disponibles.';

        } else {
            evolucion.innerHTML = `
                <div
                    class="
                        gestores-cycles-wrapper
                    "
                >
                    <table
                        class="
                            gestores-cycles-table
                        "
                    >
                        <thead>
                            <tr>
                                <th>
                                    Ciclo
                                </th>

                                <th>
                                    Período
                                </th>

                                <th>
                                    Eval.
                                </th>

                                <th>
                                    Nota
                                </th>

                                <th>
                                    Estado
                                </th>

                                <th>
                                    PDA
                                </th>

                                <th>
                                    Acción
                                </th>
                            </tr>
                        </thead>

                        <tbody>
                            ${
                                ciclos
                                    .map(
                                        ciclo => {
                                            const tienePda =
                                                gestor
                                                    .ciclosConPda
                                                    .some(
                                                        x =>
                                                            Number(
                                                                x.numero
                                                            ) ===
                                                            Number(
                                                                ciclo.numero
                                                            )
                                                    );


                                            const pendiente =
                                                gestor
                                                    .ciclosPendientesPda
                                                    .some(
                                                        x =>
                                                            Number(
                                                                x.numero
                                                            ) ===
                                                            Number(
                                                                ciclo.numero
                                                            )
                                                    );


                                            const estado =
                                                !ciclo.esCompleto
                                                    ? 'En curso'
                                                    : ciclo.cuartil ===
                                                      'Q4'
                                                        ? 'Crítico'
                                                        : ciclo.cuartil ===
                                                          'Q3'
                                                            ? 'Seguimiento'
                                                            : 'Favorable';


                                            const estadoPda =
                                                pendiente
                                                    ? 'Pendiente'
                                                    : tienePda
                                                        ? 'Registrado'
                                                        : '—';


                                            return `
                                                <tr>
                                                    <td>
                                                        #${
                                                            Number(
                                                                ciclo.numero
                                                            )
                                                        }
                                                    </td>

                                                    <td>
                                                        ${
                                                            escapeHtml(
                                                                formatearPeriodoGestores(
                                                                    ciclo.fechaInicio,
                                                                    ciclo.fechaFin
                                                                )
                                                            )
                                                        }
                                                    </td>

                                                    <td>
                                                        ${
                                                            Number(
                                                                ciclo.totalEvaluaciones ||
                                                                0
                                                            )
                                                        }
                                                    </td>

                                                    <td>
                                                        ${
                                                            Number(
                                                                ciclo.promedio ||
                                                                0
                                                            ).toFixed(
                                                                1
                                                            )
                                                        }%
                                                    </td>

                                                    <td>
                                                        ${
                                                            escapeHtml(
                                                                estado
                                                            )
                                                        }
                                                    </td>

                                                    <td>
                                                        ${
                                                            escapeHtml(
                                                                estadoPda
                                                            )
                                                        }
                                                    </td>

                                                    <td>
                                                        <button
                                                            type="button"
                                                            class="gestores-cycle-view-button"
                                                            data-cycle-number="${
                                                                Number(
                                                                    ciclo.numero
                                                                )
                                                            }"
                                                        >
                                                            Ver evaluaciones
                                                        </button>
                                                    </td>
                                                </tr>
                                            `;
                                        }
                                    )
                                    .join('')
                            }
                        </tbody>
                    </table>
                </div>
            `;
        }
        evolucion
            .querySelectorAll(
                '.gestores-cycle-view-button'
            )
            .forEach(
                boton => {
                    boton.addEventListener(
                        'click',
                        async () => {
                            const numeroCiclo =
                                Number(
                                    boton.dataset
                                        .cycleNumber
                                );


                            const ciclo =
                                gestor.ciclos.find(
                                    item =>
                                        Number(
                                            item.numero
                                        ) ===
                                        numeroCiclo
                                );


                            if (!ciclo) {
                                return;
                            }


                            await abrirDetalleCicloGestoresDashboard(
                                gestor,
                                ciclo
                            );
                        }
                    );
                }
            );
    }


    if (hallazgos) {
        hallazgos.innerHTML = `
            <div>
                ${
                    Number(
                        gestor.bajos ||
                        0
                    ).toLocaleString(
                        'es-PE'
                    )
                }
                auditorías bajo nivel
            </div>

            <div>
                ${
                    gestor
                        .ciclosAlerta
                        .length
                }
                ciclos críticos detectados
            </div>
        `;
    }


    if (pda) {
        pda.innerHTML = `
            <div>
                <strong>
                    ${
                        gestor
                            .ciclosAlerta
                            .length
                    }
                </strong>
                ciclo(s) requieren PDA
            </div>

            <div>
                <strong>
                    ${
                        gestor
                            .ciclosConPda
                            .length
                    }
                </strong>
                con PDA registrado
            </div>

            <div>
                <strong>
                    ${
                        gestor
                            .ciclosPendientesPda
                            .length
                    }
                </strong>
                pendientes
            </div>
        `;
    }

    const botonGestionarPda =
    document.getElementById(
        'gestoresGestionarPda'
    );


    if (botonGestionarPda) {

        const pendientes =
            gestor
                .ciclosPendientesPda
                ?.length ||
            0;


        const existentes =
            gestor
                .ciclosConPda
                ?.length ||
            0;


        if (
            pendientes > 0
        ) {
            botonGestionarPda.textContent =
                pendientes === 1
                    ? 'Generar PDA'
                    : `Generar PDA (${pendientes} pendientes)`;

            botonGestionarPda.disabled =
                false;

        } else if (
            existentes > 0
        ) {
            botonGestionarPda.textContent =
                'Ver informe';

            botonGestionarPda.disabled =
                false;

        } else {
            botonGestionarPda.textContent =
                'Sin PDA requerido';

            botonGestionarPda.disabled =
                true;
        }
    }

    panel.scrollIntoView({
        behavior:
            'smooth',

        block:
            'start'
    });

    const botonVerEvaluaciones =
    document.getElementById(
        'gestoresVerEvaluaciones'
    );


    if (botonVerEvaluaciones) {

        /*
        * Evitamos acumular listeners
        * al cambiar de gestor.
        */
        const nuevoBoton =
            botonVerEvaluaciones
                .cloneNode(true);


        botonVerEvaluaciones
            .parentNode
            ?.replaceChild(
                nuevoBoton,
                botonVerEvaluaciones
            );


        nuevoBoton.addEventListener(
            'click',
            async () => {
                const ciclos =
                    Array.isArray(
                        gestor.ciclos
                    )
                        ? gestor.ciclos
                        : [];


                if (
                    ciclos.length === 0
                ) {
                    alert(
                        'Este gestor todavía no registra ciclos para el contexto seleccionado.'
                    );

                    return;
                }


                const ultimoCiclo =
                    ciclos[
                        ciclos.length -
                        1
                    ];


                await abrirDetalleCicloGestoresDashboard(
                    gestor,
                    ultimoCiclo
                );
            }
        );
    }
}


function formatearFechaGestores(
    valor
) {
    if (
        valor === null ||
        valor === undefined ||
        valor === ''
    ) {
        return '—';
    }


    const texto =
        String(
            valor
        ).trim();


    // YYYY-MM-DD
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


    // ISO o YYYY-MM-DDTHH:mm...
    const iso =
        texto.match(
            /^(\d{4})-(\d{2})-(\d{2})/
        );


    if (iso) {
        return (
            `${iso[3]}/` +
            `${iso[2]}/` +
            `${iso[1]}`
        );
    }


    return texto;
}


function formatearPeriodoGestores(
    fechaInicio,
    fechaFin
) {
    return (
        `${formatearFechaGestores(
            fechaInicio
        )} → ` +
        `${formatearFechaGestores(
            fechaFin
        )}`
    );
}