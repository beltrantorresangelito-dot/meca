const ANALYTICS_SIN_CAMPANA = '__SIN_CAMPANA__';

let analyticsInicializado = false;
let analyticsCargando = false;

let analyticsEvolutionChart = null;
let analyticsQualityMixChart = null;

let analyticsDiagnosticParetoChart = null;

let analyticsDiagnosticoActual = null;
let analyticsFrenteSeleccionado = null;
let analyticsAtributoSeleccionado = null;

let analyticsLiderConcentracionSeleccionado = null;

let analyticsDiagnosticHierarchySort = {
    campo: 'incumplimientos',
    direccion: 'desc'
};

let analyticsDiagnosticHierarchyInitialized = false;

let analyticsFindingDetailData = null;
let analyticsFindingEvaluationSelectedId = null;
let analyticsFindingSearchInitialized = false;
let analyticsFindingNavigationInitialized = false;

let analyticsFindingSort = {
    campo: 'fecha',
    direccion: 'desc'
};

let analyticsInterventionData = null;
let analyticsInterventionFrontSelectedId = null;
let analyticsInterventionAttributeSelectedId = null;


function construirQueryAnalytics() {
    const params = new URLSearchParams();

    const fechaDesde =
        document.getElementById('analyticsFechaDesde')?.value || '';

    const fechaHasta =
        document.getElementById('analyticsFechaHasta')?.value || '';

    const quiebre =
        document.getElementById('analyticsQuiebre')?.value || '';

    const campana =
        document.getElementById('analyticsCampana')?.value || '';

    const matriz =
        document.getElementById('analyticsMatriz')?.value || '';

    const lider =
        document.getElementById('analyticsLider')?.value || '';

    const gestor =
        document.getElementById('analyticsGestor')?.value || '';

    const auditor =
        document.getElementById('analyticsAuditor')?.value || '';

    if (fechaDesde) {
        params.set('fecha_desde', fechaDesde);
    }

    if (fechaHasta) {
        params.set('fecha_hasta', fechaHasta);
    }

    if (quiebre) {
        params.set('quiebre_id', quiebre);
    }

    if (campana === ANALYTICS_SIN_CAMPANA) {
        params.set('sin_campana', 'true');
    } else if (campana) {
        params.set('campana_id', campana);
    }

    if (matriz) {
        params.set('matriz_id', matriz);
    }

    if (lider) {
        params.set('lider', lider);
    }

    if (gestor) {
        params.set('gestor', gestor);
    }

    if (auditor) {
        params.set('auditor', auditor);
    }

    return params;
}

function limpiarFiltrosAnalyticsDesde(nivel) {
    const cadena = [
        'analyticsQuiebre',
        'analyticsCampana',
        'analyticsMatriz',
        'analyticsLider',
        'analyticsGestor',
        'analyticsAuditor'
    ];

    const indice =
        cadena.indexOf(nivel);

    if (indice === -1) return;

    for (
        let i = indice + 1;
        i < cadena.length;
        i++
    ) {
        const elemento =
            document.getElementById(
                cadena[i]
            );

        if (elemento) {
            elemento.value = '';
        }
    }
}

async function actualizarFiltrosEncadenadosAnalytics(
    origen
) {
    try {
        limpiarFiltrosAnalyticsDesde(
            origen
        );

        const params =
            construirQueryAnalytics();

        const catalogo =
            await solicitarAnalytics(
                '/api/analytics/filtros',
                params
            );

        renderizarFiltrosDependientesAnalytics(
            catalogo,
            origen
        );

        renderizarCalidadDatosAnalytics(
            catalogo
        );

    } catch (error) {
        console.error(
            '❌ Error actualizando filtros Analytics:',
            error
        );
    }
}

function renderizarFiltrosDependientesAnalytics(
    catalogo,
    origen
) {
    const niveles = {
        analyticsQuiebre: 0,
        analyticsCampana: 1,
        analyticsMatriz: 2,
        analyticsLider: 3,
        analyticsGestor: 4,
        analyticsAuditor: 5
    };

    const nivelOrigen =
        niveles[origen];

    if (nivelOrigen == null) return;

    // ==================================================
    // CAMPAÑA
    // ==================================================
    if (nivelOrigen < 1) {
        renderizarSelectorCampanasAnalytics(
            catalogo
        );
    }

    // ==================================================
    // MATRIZ
    // ==================================================
    if (nivelOrigen < 2) {
        llenarSelectAnalytics(
            'analyticsMatriz',
            catalogo?.matrices,
            {
                labelBuilder: item =>
                    `${item.codigo || item.id} ` +
                    `(${item.evaluaciones})`,
                defaultLabel: 'Todas'
            }
        );
    }

    // ==================================================
    // LÍDER
    // ==================================================
    if (nivelOrigen < 3) {
        llenarSelectAnalytics(
            'analyticsLider',
            catalogo?.lideres,
            {
                valueKey: 'nombre',

                labelBuilder: item =>
                    `${item.nombre} ` +
                    `(${item.evaluaciones})`,

                defaultLabel: 'Todos'
            }
        );
    }

    // ==================================================
    // GESTOR
    // ==================================================
    if (nivelOrigen < 4) {
        llenarSelectAnalytics(
            'analyticsGestor',
            catalogo?.gestores,
            {
                valueKey: 'nombre',

                labelBuilder: item =>
                    `${item.nombre} ` +
                    `(${item.evaluaciones})`,

                defaultLabel: 'Todos'
            }
        );
    }

    // ==================================================
    // AUDITOR
    // ==================================================
    if (nivelOrigen < 5) {
        llenarSelectAnalytics(
            'analyticsAuditor',
            catalogo?.auditores,
            {
                valueKey: 'nombre',

                labelBuilder: item =>
                    `${item.nombre} ` +
                    `(${item.evaluaciones})`,

                defaultLabel: 'Todos'
            }
        );
    }
}

function renderizarSelectorCampanasAnalytics(
    catalogo
) {
    const campanaSelect =
        document.getElementById(
            'analyticsCampana'
        );

    if (!campanaSelect) return;

    llenarSelectAnalytics(
        'analyticsCampana',
        catalogo?.campanas,
        {
            labelBuilder: item => {
                const nombre =
                    item.descripcion ||
                    item.codigo ||
                    item.id;

                return (
                    `${nombre} ` +
                    `(${item.evaluaciones})`
                );
            },

            defaultLabel: 'Todas'
        }
    );

    const quiebreSeleccionado =
        document.getElementById(
            'analyticsQuiebre'
        )?.value || '';

    const disponibles =
        catalogo?.sinCampana || [];

    const aplicables =
        disponibles.filter(item => {
            if (!quiebreSeleccionado) {
                return (
                    Number(
                        item.evaluaciones || 0
                    ) > 0
                );
            }

            return (
                String(item.quiebreId) ===
                String(quiebreSeleccionado)
            );
        });

    const totalSinCampana =
        aplicables.reduce(
            (total, item) =>
                total +
                Number(
                    item.evaluaciones || 0
                ),
            0
        );

    if (totalSinCampana > 0) {
        const option =
            document.createElement(
                'option'
            );

        option.value =
            ANALYTICS_SIN_CAMPANA;

        option.textContent =
            `Sin campaña ` +
            `(${totalSinCampana})`;

        campanaSelect.appendChild(
            option
        );
    }
}

async function solicitarAnalytics(endpoint, params = null) {
    const token =
        localStorage.getItem('meca_token');

    const query =
        params && params.toString()
            ? `?${params.toString()}`
            : '';

    const response =
        await fetch(`${endpoint}${query}`, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

    let data = null;

    try {
        data = await response.json();
    } catch (error) {
        data = null;
    }

    if (!response.ok) {
        const apiError =
            new Error(
                data?.error ||
                `Error HTTP ${response.status}`
            );

        apiError.status = response.status;
        apiError.code =
            data?.code ||
            'ANALYTICS_HTTP_ERROR';

        throw apiError;
    }

    return data;
}


function llenarSelectAnalytics(
    selectId,
    items,
    {
        valueKey = 'id',
        labelBuilder = null,
        defaultLabel = 'Todos'
    } = {}
) {
    const select =
        document.getElementById(selectId);

    if (!select) return;

    const valorActual = select.value;

    select.replaceChildren();

    const opcionDefault =
        document.createElement('option');

    opcionDefault.value = '';
    opcionDefault.textContent = defaultLabel;

    select.appendChild(opcionDefault);

    for (const item of items || []) {
        const option =
            document.createElement('option');

        option.value =
            String(item[valueKey] ?? '');

        option.textContent =
            labelBuilder
                ? labelBuilder(item)
                : String(item[valueKey] ?? '');

        select.appendChild(option);
    }

    const conservaValor =
        Array.from(select.options)
            .some(
                option =>
                    option.value === valorActual
            );

    if (conservaValor) {
        select.value = valorActual;
    }
}


function renderizarFiltrosAnalytics(catalogo) {
    llenarSelectAnalytics(
        'analyticsQuiebre',
        catalogo?.quiebres,
        {
            labelBuilder: item =>
                `${item.codigo || item.descripcion || item.id} (${item.evaluaciones})`,
            defaultLabel: 'Todos'
        }
    );

    renderizarSelectorCampanasAnalytics(
        catalogo
    );

    llenarSelectAnalytics(
        'analyticsMatriz',
        catalogo?.matrices,
        {
            labelBuilder: item =>
                `${item.codigo || item.id} (${item.evaluaciones})`,
            defaultLabel: 'Todas'
        }
    );

    llenarSelectAnalytics(
        'analyticsLider',
        catalogo?.lideres,
        {
            valueKey: 'nombre',
            labelBuilder: item =>
                `${item.nombre} (${item.evaluaciones})`,
            defaultLabel: 'Todos'
        }
    );

    llenarSelectAnalytics(
        'analyticsGestor',
        catalogo?.gestores,
        {
            valueKey: 'nombre',
            labelBuilder: item =>
                `${item.nombre} (${item.evaluaciones})`,
            defaultLabel: 'Todos'
        }
    );

    llenarSelectAnalytics(
        'analyticsAuditor',
        catalogo?.auditores,
        {
            valueKey: 'nombre',
            labelBuilder: item =>
                `${item.nombre} (${item.evaluaciones})`,
            defaultLabel: 'Todos'
        }
    );

    renderizarCalidadDatosAnalytics(
        catalogo
    );
}


function renderizarCalidadDatosAnalytics(catalogo) {
    const elemento =
        document.getElementById(
            'analyticsDataQuality'
        );

    if (!elemento) return;

    const sinContexto =
        Number(
            catalogo?.calidadDatos?.sinContexto || 0
        );

    const sinMatriz =
        Number(
            catalogo?.sinMatriz?.evaluaciones || 0
        );

    const mensajes = [];

    if (sinContexto > 0) {
        mensajes.push(
            `${sinContexto} evaluación(es) sin contexto`
        );
    }

    if (sinMatriz > 0) {
        mensajes.push(
            `${sinMatriz} evaluación(es) históricas sin matriz identificada`
        );
    }

    if (mensajes.length === 0) {
        elemento.hidden = true;
        elemento.textContent = '';
        return;
    }

    elemento.textContent =
        `Calidad de datos: ${mensajes.join(' · ')}`;

    elemento.hidden = false;
}


function renderizarResumenEjecutivoAnalytics(resumen) {
    const poblacion =
        resumen?.poblacion || {};

    const calidad =
        resumen?.calidad || {};

    const evaluaciones =
        Number(poblacion.evaluaciones || 0);

    const gestores =
        Number(poblacion.gestores || 0);

    const auditores =
        Number(poblacion.auditores || 0);

    const notaPromedio =
        calidad.notaPromedio == null
            ? null
            : Number(calidad.notaPromedio);

    const kpiEvaluaciones =
        document.getElementById(
            'analyticsKpiEvaluaciones'
        );

    const kpiNota =
        document.getElementById(
            'analyticsKpiNotaPromedio'
        );

    const kpiGestores =
        document.getElementById(
            'analyticsKpiGestores'
        );

    const kpiAuditores =
        document.getElementById(
            'analyticsKpiAuditores'
        );

    if (kpiEvaluaciones) {
        kpiEvaluaciones.textContent =
            evaluaciones.toLocaleString('es-PE');
    }

    if (kpiNota) {
        kpiNota.textContent =
            notaPromedio == null
                ? '—'
                : `${notaPromedio.toFixed(2)}%`;
    }

    if (kpiGestores) {
        kpiGestores.textContent =
            gestores.toLocaleString('es-PE');
    }

    if (kpiAuditores) {
        kpiAuditores.textContent =
            auditores.toLocaleString('es-PE');
    }

    renderizarDistribucionAnalytics(
        resumen?.rangos || [],
        evaluaciones
    );

    renderizarAlertasEjecutivasAnalytics(
        resumen
    );

    actualizarEtiquetaPoblacionAnalytics(
        evaluaciones
    );
}


function obtenerNombreRangoAnalytics(rango) {
    const valor =
        String(rango || '')
            .trim()
            .toLowerCase();

    switch (valor) {
        case 'excelente':
            return 'Excelente';

        case 'bien':
        case 'bueno':
            return 'Bueno';

        case 'regular':
            return 'Regular';

        case 'bajo':
        case 'critico':
        case 'crítico':
            return 'Crítico';

        default:
            return rango || 'Sin rango';
    }
}

function renderizarDistribucionAnalytics(
    rangos,
    totalEvaluaciones
) {
    const contenedor =
        document.getElementById(
            'analyticsRangeDistribution'
        );

    if (!contenedor) return;

    contenedor.replaceChildren();

    if (!rangos || rangos.length === 0) {
        const empty =
            document.createElement('p');

        empty.className =
            'analytics-empty';

        empty.textContent =
            'No hay evaluaciones para los filtros seleccionados.';

        contenedor.appendChild(empty);
        return;
    }

    for (const item of rangos) {
        const fila =
            document.createElement('div');

        fila.className =
            'analytics-range-item';

        const nombre =
            document.createElement('span');

        nombre.className =
            'analytics-range-name';

        nombre.textContent =
            obtenerNombreRangoAnalytics(
                item.rango
            );

        const valor =
            document.createElement('strong');

        valor.className =
            'analytics-range-value';

        const cantidad =
            Number(item.cantidad || 0);

        const porcentaje =
            Number(item.porcentaje || 0);

        valor.textContent =
            `${porcentaje.toFixed(2)}% · ` +
            `${cantidad.toLocaleString('es-PE')}`;

        fila.appendChild(nombre);
        fila.appendChild(valor);

        contenedor.appendChild(fila);
    }
}

function renderizarAlertasEjecutivasAnalytics(
    resumen
) {
    const contenedor =
        document.getElementById(
            'analyticsExecutiveAlerts'
        );

    if (!contenedor) return;

    contenedor.replaceChildren();

    const auditorias =
        Number(
            resumen?.poblacion?.evaluaciones || 0
        );

    if (auditorias === 0) {
        const empty =
            document.createElement('p');

        empty.className =
            'analytics-empty';

        empty.textContent =
            'No hay auditorías para analizar.';

        contenedor.appendChild(empty);
        return;
    }

    const rangos =
        resumen?.rangos || [];

    const buscarRango =
        (...nombres) =>
            rangos.find(item =>
                nombres.includes(
                    String(item.rango || '')
                        .trim()
                        .toLowerCase()
                )
            );

    const critico =
        buscarRango(
            'bajo',
            'critico',
            'crítico'
        );

    const regular =
        buscarRango('regular');

    const bueno =
        buscarRango(
            'bien',
            'bueno'
        );

    const excelente =
        buscarRango('excelente');

    const cantidadCritico =
        Number(
            critico?.cantidad || 0
        );

    const cantidadRegular =
        Number(
            regular?.cantidad || 0
        );

    const cantidadBueno =
        Number(
            bueno?.cantidad || 0
        );

    const cantidadExcelente =
        Number(
            excelente?.cantidad || 0
        );

    const porcentajeCritico =
        auditorias > 0
            ? (
                cantidadCritico /
                auditorias *
                100
            )
            : 0;

    const porcentajeRegular =
        auditorias > 0
            ? (
                cantidadRegular /
                auditorias *
                100
            )
            : 0;

    const fueraNivel =
        cantidadCritico +
        cantidadRegular;

    const porcentajeFueraNivel =
        auditorias > 0
            ? (
                fueraNivel /
                auditorias *
                100
            )
            : 0;

    const favorable =
        cantidadExcelente +
        cantidadBueno;

    const porcentajeFavorable =
        auditorias > 0
            ? (
                favorable /
                auditorias *
                100
            )
            : 0;

    const mensajes = [
        {
            titulo:
                'Auditorías críticas',

            texto:
                `${cantidadCritico.toLocaleString(
                    'es-PE'
                )} auditorías · ` +
                `${porcentajeCritico.toFixed(
                    2
                )}% · ` +
                `resultado menor a 85 puntos`
        },

        {
            titulo:
                'Auditorías regulares',

            texto:
                `${cantidadRegular.toLocaleString(
                    'es-PE'
                )} auditorías · ` +
                `${porcentajeRegular.toFixed(
                    2
                )}% · ` +
                `resultado entre 85 y menor a 90 puntos`
        },

        {
            titulo:
                'Auditorías fuera del nivel esperado',

            texto:
                `${fueraNivel.toLocaleString(
                    'es-PE'
                )} auditorías · ` +
                `${porcentajeFueraNivel.toFixed(
                    2
                )}% · Regular + Crítico`
        },

        {
            titulo:
                'Resultado favorable',

            texto:
                `${favorable.toLocaleString(
                    'es-PE'
                )} auditorías · ` +
                `${porcentajeFavorable.toFixed(
                    2
                )}% · Excelente + Bueno`
        }
    ];

    for (const mensaje of mensajes) {
        const item =
            document.createElement('div');

        item.className =
            'analytics-alert-item';

        const titulo =
            document.createElement('strong');

        titulo.textContent =
            mensaje.titulo;

        const texto =
            document.createElement('span');

        texto.textContent =
            mensaje.texto;

        item.appendChild(titulo);
        item.appendChild(texto);

        contenedor.appendChild(item);
    }
}


function actualizarEtiquetaPoblacionAnalytics(
    evaluaciones
) {
    const elemento =
        document.getElementById(
            'analyticsPopulationLabel'
        );

    if (!elemento) return;

    const auditorias =
        Number(evaluaciones || 0);

    elemento.textContent =
        auditorias === 1
            ? '1 auditoría'
            : `${auditorias.toLocaleString(
                'es-PE'
            )} auditorías`;
}

// ======================================================
// MECA ANALYTICS 2.0 - A4 EVOLUCIÓN
// ======================================================

function formatearPeriodoAnalytics(
    periodo,
    granularidad = 'month'
) {
    if (!periodo) return '—';

    const texto = String(periodo);
    const fechaBase = texto.substring(0, 10);
    const partes = fechaBase.split('-');

    if (partes.length !== 3) {
        return texto;
    }

    const anio = Number(partes[0]);
    const mes = Number(partes[1]);
    const dia = Number(partes[2]);

    if (
        !Number.isInteger(anio) ||
        !Number.isInteger(mes) ||
        !Number.isInteger(dia)
    ) {
        return texto;
    }

    const fecha = new Date(
        Date.UTC(anio, mes - 1, dia)
    );

    if (granularidad === 'day') {
        return new Intl.DateTimeFormat(
            'es-PE',
            {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
                timeZone: 'UTC'
            }
        ).format(fecha);
    }

    if (granularidad === 'week') {
        return (
            'Sem. ' +
            new Intl.DateTimeFormat(
                'es-PE',
                {
                    day: '2-digit',
                    month: 'short',
                    timeZone: 'UTC'
                }
            ).format(fecha)
        );
    }

    return new Intl.DateTimeFormat(
        'es-PE',
        {
            month: 'short',
            year: 'numeric',
            timeZone: 'UTC'
        }
    ).format(fecha);
}


function formatearVariacionAnalytics(
    valor,
    sufijo = ' pp'
) {
    if (
        valor == null ||
        !Number.isFinite(Number(valor))
    ) {
        return '—';
    }

    const numero = Number(valor);
    const signo = numero > 0 ? '+' : '';

    return (
        `${signo}${numero.toFixed(2)}${sufijo}`
    );
}


function limpiarEstadoSemanticoAnalytics(
    elemento
) {
    if (!elemento) return;

    elemento.classList.remove(
        'analytics-value-positive',
        'analytics-value-warning',
        'analytics-value-negative',
        'analytics-value-neutral'
    );
}


function aplicarClaseValorAnalytics(
    elemento,
    clase
) {
    if (!elemento) return;

    limpiarEstadoSemanticoAnalytics(
        elemento
    );

    if (clase) {
        elemento.classList.add(clase);
    }
}


function obtenerPuntoSerieAnalytics(
    serie,
    periodo
) {
    if (!periodo) return null;

    return (
        (serie || []).find(
            item =>
                String(item.periodo) ===
                String(periodo)
        ) || null
    );
}


function destruirGraficosEvolucionAnalytics() {
    if (
        analyticsEvolutionChart &&
        typeof analyticsEvolutionChart.destroy ===
        'function'
    ) {
        analyticsEvolutionChart.destroy();
    }

    if (
        analyticsQualityMixChart &&
        typeof analyticsQualityMixChart.destroy ===
        'function'
    ) {
        analyticsQualityMixChart.destroy();
    }

    analyticsEvolutionChart = null;
    analyticsQualityMixChart = null;
}


function obtenerClaseTendenciaAnalytics(
    tendencia
) {
    switch (
    String(tendencia || '').toUpperCase()
    ) {
        case 'MEJORA':
            return 'analytics-value-positive';

        case 'DETERIORO':
            return 'analytics-value-negative';

        case 'ESTABLE':
            return 'analytics-value-neutral';

        default:
            return 'analytics-value-warning';
    }
}


function renderizarEstadoEvolucionAnalytics(
    evolucion
) {
    const contenedor =
        document.getElementById(
            'analyticsEvolutionStatus'
        );

    const texto =
        document.getElementById(
            'analyticsEvolutionStatusText'
        );

    if (!contenedor || !texto) return;


    contenedor.classList.remove(
        'is-improving',
        'is-stable',
        'is-deteriorating',
        'is-insufficient',
        'is-methodology'
    );


    const comparacion =
        evolucion?.comparacion || null;


    if (!comparacion) {
        texto.textContent =
            'Sin períodos comparables';

        contenedor.classList.add(
            'is-insufficient'
        );

        return;
    }


    const tendencia =
        String(
            comparacion.tendencia ||
            'SIN_DATOS'
        ).toUpperCase();


    const lectura =
        String(
            comparacion.lecturaEjecutiva ||
            tendencia
        ).toUpperCase();


    /*
     * La condición metodológica tiene
     * prioridad sobre el resultado matemático.
     */
    if (
        [
            'CAMBIO_METODOLOGICO',
            'TRANSICION_METODOLOGICA',
            'CONTEXTO_PARCIAL',
            'CONTEXTO_INCOMPLETO'
        ].includes(
            lectura
        )
    ) {
        texto.textContent =
            lectura ===
                'CAMBIO_METODOLOGICO'
                ? 'Cambio metodológico'
                : lectura ===
                    'TRANSICION_METODOLOGICA'
                    ? 'Transición metodológica'
                    : lectura ===
                        'CONTEXTO_PARCIAL'
                        ? 'Contexto metodológico parcial'
                        : 'Contexto metodológico incompleto';

        contenedor.classList.add(
            'is-methodology'
        );

        return;
    }


    if (
        lectura ===
        'SIN_DATOS_COMPARABLES'
    ) {
        texto.textContent =
            'Muestra aún no comparable';

        contenedor.classList.add(
            'is-insufficient'
        );

        return;
    }


    switch (tendencia) {
        case 'MEJORA':
            texto.textContent =
                'Tendencia favorable';

            contenedor.classList.add(
                'is-improving'
            );
            break;


        case 'DETERIORO':
            texto.textContent =
                'Deterioro detectado';

            contenedor.classList.add(
                'is-deteriorating'
            );
            break;


        case 'ESTABLE':
            texto.textContent =
                'Comportamiento estable';

            contenedor.classList.add(
                'is-stable'
            );
            break;


        default:
            texto.textContent =
                'Muestra aún no comparable';

            contenedor.classList.add(
                'is-insufficient'
            );
            break;
    }
}


function renderizarKpisEvolucionAnalytics(
    evolucion
) {
    const comparacion =
        evolucion?.comparacion || null;

    const serie =
        evolucion?.serie || [];


    const nota =
        document.getElementById(
            'analyticsEvolutionNota'
        );


    const periodo =
        document.getElementById(
            'analyticsEvolutionPeriodo'
        );


    const variacionNota =
        document.getElementById(
            'analyticsEvolutionVariacionNota'
        );


    const atencion =
        document.getElementById(
            'analyticsEvolutionAtencion'
        );


    const variacionAtencion =
        document.getElementById(
            'analyticsEvolutionVariacionAtencion'
        );


    if (!comparacion) {
        if (nota) {
            nota.textContent = '—';

            aplicarClaseValorAnalytics(
                nota,
                'analytics-value-neutral'
            );
        }


        if (periodo) {
            periodo.textContent =
                'Sin período comparable';
        }


        if (variacionNota) {
            variacionNota.textContent = '—';

            aplicarClaseValorAnalytics(
                variacionNota,
                'analytics-value-neutral'
            );
        }


        if (atencion) {
            atencion.textContent = '—';

            aplicarClaseValorAnalytics(
                atencion,
                'analytics-value-neutral'
            );
        }


        if (variacionAtencion) {
            variacionAtencion.textContent = '—';

            aplicarClaseValorAnalytics(
                variacionAtencion,
                'analytics-value-neutral'
            );
        }

        return;
    }


    const puntoActual =
        obtenerPuntoSerieAnalytics(
            serie,
            comparacion.periodoActual
        );


    const metodologia =
        comparacion.metodologia || {};


    const comparableMetodologicamente =
        metodologia.comparable === true;


    const lecturaEjecutiva =
        String(
            comparacion.lecturaEjecutiva ||
            comparacion.tendencia ||
            ''
        ).toUpperCase();


    /*
     * --------------------------------------------------
     * NOTA ACTUAL
     * --------------------------------------------------
     *
     * Es un dato observado del período.
     * No depende de comparabilidad entre períodos.
     * --------------------------------------------------
     */
    if (nota) {
        nota.textContent =
            comparacion.notaActual == null
                ? '—'
                : Number(
                    comparacion.notaActual
                ).toFixed(2);

        aplicarClaseValorAnalytics(
            nota,
            'analytics-value-neutral'
        );
    }


    /*
     * --------------------------------------------------
     * PERÍODO
     * --------------------------------------------------
     */
    if (periodo) {
        periodo.textContent =
            formatearPeriodoAnalytics(
                comparacion.periodoActual,
                evolucion?.granularidad
            );
    }


    /*
     * --------------------------------------------------
     * VARIACIÓN DE NOTA
     * --------------------------------------------------
     *
     * El valor SIEMPRE se muestra.
     *
     * Solo se interpreta como:
     *
     * verde = mejora
     * rojo  = deterioro
     *
     * cuando la metodología es comparable.
     * --------------------------------------------------
     */
    if (variacionNota) {
        variacionNota.textContent =
            formatearVariacionAnalytics(
                comparacion.variacionNotaPp
            );


        const deltaNota =
            Number(
                comparacion.variacionNotaPp
            );


        let claseNota =
            'analytics-value-neutral';


        if (
            comparableMetodologicamente
        ) {
            claseNota =
                deltaNota > 0.5
                    ? 'analytics-value-positive'

                    : deltaNota < -0.5
                        ? 'analytics-value-negative'

                        : 'analytics-value-neutral';
        }


        if (
            [
                'CAMBIO_METODOLOGICO',
                'TRANSICION_METODOLOGICA',
                'CONTEXTO_PARCIAL',
                'CONTEXTO_INCOMPLETO'
            ].includes(
                lecturaEjecutiva
            )
        ) {
            claseNota =
                'analytics-value-warning';
        }


        aplicarClaseValorAnalytics(
            variacionNota,
            claseNota
        );


        /*
         * Tooltip nativo del navegador.
         * No requiere HTML adicional.
         */
        if (
            comparableMetodologicamente
        ) {
            variacionNota.title =
                'Variación entre períodos metodológicamente comparables.';

        } else {
            variacionNota.title =
                'Variación observada. La comparación requiere contexto metodológico.';
        }
    }


    /*
     * --------------------------------------------------
     * FUERA DE NIVEL ACTUAL
     * Regular + Crítico
     * --------------------------------------------------
     *
     * Este KPI describe el período actual,
     * por lo que mantiene su semántica propia.
     * --------------------------------------------------
     */
    const atencionActual =
        puntoActual
            ?.calidad
            ?.atencionPct ??
        comparacion.atencionActualPct;


    if (atencion) {
        atencion.textContent =
            atencionActual == null
                ? '—'
                : `${Number(
                    atencionActual
                ).toFixed(2)}%`;


        aplicarClaseValorAnalytics(
            atencion,
            Number(
                atencionActual
            ) >= 30
                ? 'analytics-value-warning'
                : 'analytics-value-neutral'
        );


        atencion.title =
            'Porcentaje de auditorías clasificadas como Regular o Crítico en el período.';
    }


    /*
     * --------------------------------------------------
     * VARIACIÓN FUERA DE NIVEL
     * --------------------------------------------------
     *
     * Negativo = mejora
     * Positivo = deterioro
     *
     * pero solo si ambos períodos son
     * metodológicamente comparables.
     * --------------------------------------------------
     */
    if (variacionAtencion) {
        variacionAtencion.textContent =
            formatearVariacionAnalytics(
                comparacion
                    .variacionAtencionPp
            );


        const deltaAtencion =
            Number(
                comparacion
                    .variacionAtencionPp
            );


        let claseAtencion =
            'analytics-value-neutral';


        if (
            comparableMetodologicamente
        ) {
            claseAtencion =
                deltaAtencion < 0
                    ? 'analytics-value-positive'

                    : deltaAtencion > 0
                        ? 'analytics-value-negative'

                        : 'analytics-value-neutral';
        }


        if (
            [
                'CAMBIO_METODOLOGICO',
                'TRANSICION_METODOLOGICA',
                'CONTEXTO_PARCIAL',
                'CONTEXTO_INCOMPLETO'
            ].includes(
                lecturaEjecutiva
            )
        ) {
            claseAtencion =
                'analytics-value-warning';
        }


        aplicarClaseValorAnalytics(
            variacionAtencion,
            claseAtencion
        );


        if (
            comparableMetodologicamente
        ) {
            variacionAtencion.title =
                'Cambio en auditorías fuera de nivel entre períodos metodológicamente comparables.';

        } else {
            variacionAtencion.title =
                'Cambio observado en auditorías fuera de nivel. La comparación requiere contexto metodológico.';
        }
    }
}


function renderizarAdvertenciaMuestraAnalytics(
    evolucion
) {
    const contenedor =
        document.getElementById(
            'analyticsEvolutionSampleWarning'
        );

    const titulo =
        document.getElementById(
            'analyticsEvolutionWarningTitle'
        );

    const texto =
        document.getElementById(
            'analyticsEvolutionSampleWarningText'
        );

    const icono =
        document.getElementById(
            'analyticsEvolutionWarningIcon'
        );

    if (
        !contenedor ||
        !titulo ||
        !texto ||
        !icono
    ) {
        return;
    }


    /*
     * Se limpia cualquier variante semántica
     * previa antes de volver a renderizar.
     */
    contenedor.classList.remove(
        'is-sample',
        'is-context',
        'is-methodology',
        'is-critical'
    );


    const serie =
        evolucion?.serie || [];

    const comparacion =
        evolucion?.comparacion || null;

    const ultimo =
        serie.length > 0
            ? serie[serie.length - 1]
            : null;


    if (!ultimo) {
        contenedor.hidden = true;
        return;
    }


    const ultimoInsuficiente =
        Boolean(
            comparacion
                ?.confiabilidad
                ?.ultimoPeriodoConMuestraInsuficiente
        ) ||
        ultimo?.muestra?.suficiente ===
        false;


    const contextoUltimo =
        String(
            ultimo
                ?.contextoMatriz
                ?.estado ||
            ''
        ).toUpperCase();


    const cambioUltimo =
        String(
            ultimo
                ?.contextoMatriz
                ?.cambioRespectoAnterior
                ?.tipo ||
            ''
        ).toUpperCase();


    const lecturaEjecutiva =
        String(
            comparacion
                ?.lecturaEjecutiva ||
            ''
        ).toUpperCase();


    const metodologia =
        comparacion?.metodologia || {};


    /*
     * --------------------------------------------------
     * PRIORIDAD 1:
     * período cronológicamente más reciente con
     * muestra insuficiente.
     * --------------------------------------------------
     */
    if (ultimoInsuficiente) {
        const minimo =
            Number(
                ultimo?.muestra
                    ?.minimoReferencia ||
                comparacion
                    ?.confiabilidad
                    ?.minimoEvaluaciones ||
                30
            );

        const evaluacionesUltimo =
            Number(
                ultimo?.evaluaciones ||
                comparacion
                    ?.confiabilidad
                    ?.evaluacionesUltimoPeriodo ||
                0
            );

        titulo.textContent =
            'Período reciente con muestra limitada';

        texto.textContent =
            `El período más reciente registra ` +
            `${evaluacionesUltimo.toLocaleString(
                'es-PE'
            )} auditorías. ` +
            `La referencia mínima actual para ` +
            `incorporarlo a la tendencia ejecutiva ` +
            `es ${minimo.toLocaleString(
                'es-PE'
            )}.`;

        icono.textContent = '!';

        contenedor.classList.add(
            'is-sample'
        );

        contenedor.hidden = false;

        return;
    }


    /*
     * --------------------------------------------------
     * PRIORIDAD 2:
     * transición dentro del período más reciente.
     * --------------------------------------------------
     */
    if (
        contextoUltimo ===
        'TRANSICION_MATRIZ' ||
        contextoUltimo ===
        'TRANSICION_VERSION'
    ) {
        const tipo =
            contextoUltimo ===
                'TRANSICION_MATRIZ'
                ? 'matrices'
                : 'versiones';

        titulo.textContent =
            'Transición metodológica en el período';

        texto.textContent =
            `Durante el período más reciente ` +
            `coexisten diferentes ${tipo} de ` +
            `auditoría. La nota agregada combina ` +
            `metodologías distintas y debe ` +
            `interpretarse considerando esa transición.`;

        icono.textContent = '↔';

        contenedor.classList.add(
            'is-methodology'
        );

        contenedor.hidden = false;

        return;
    }


    /*
     * --------------------------------------------------
     * PRIORIDAD 3:
     * período más reciente con cobertura parcial.
     * --------------------------------------------------
     */
    if (
        contextoUltimo ===
        'CONTEXTO_PARCIAL'
    ) {
        const sinMatriz =
            Number(
                ultimo
                    ?.contextoMatriz
                    ?.auditoriasSinMatriz ||
                0
            );

        const porcentaje =
            Number(
                ultimo
                    ?.contextoMatriz
                    ?.porcentajeSinMatriz ||
                0
            );

        titulo.textContent =
            'Cobertura metodológica parcial';

        texto.textContent =
            `En el período más reciente existen ` +
            `${sinMatriz.toLocaleString(
                'es-PE'
            )} auditorías ` +
            `(${porcentaje.toFixed(2)}%) sin ` +
            `matriz o versión histórica ` +
            `identificada.`;

        icono.textContent = '!';

        contenedor.classList.add(
            'is-context'
        );

        contenedor.hidden = false;

        return;
    }


    /*
     * --------------------------------------------------
     * PRIORIDAD 4:
     * período sin trazabilidad metodológica.
     * --------------------------------------------------
     */
    if (
        contextoUltimo ===
        'SIN_MATRIZ_IDENTIFICADA'
    ) {
        titulo.textContent =
            'Contexto metodológico incompleto';

        texto.textContent =
            'El período más reciente no dispone de ' +
            'trazabilidad histórica suficiente de ' +
            'matriz y versión. El resultado continúa ' +
            'siendo visible, pero su interpretación ' +
            'metodológica es limitada.';

        icono.textContent = '!';

        contenedor.classList.add(
            'is-context'
        );

        contenedor.hidden = false;

        return;
    }


    /*
     * --------------------------------------------------
     * PRIORIDAD 5:
     * la comparación ejecutiva contiene una
     * discontinuidad aunque el último período
     * individualmente sea correcto.
     *
     * Este es el caso real Junio → Julio.
     * --------------------------------------------------
     */
    if (
        metodologia.comparable === false &&
        [
            'CONTEXTO_PARCIAL',
            'CONTEXTO_INCOMPLETO',
            'CAMBIO_METODOLOGICO',
            'TRANSICION_METODOLOGICA'
        ].includes(
            lecturaEjecutiva
        )
    ) {
        let mensaje =
            'Los períodos utilizados para la ' +
            'comparación no tienen una base ' +
            'metodológica completamente equivalente.';


        if (
            lecturaEjecutiva ===
            'CONTEXTO_PARCIAL'
        ) {
            mensaje =
                'La variación observada utiliza un ' +
                'período con cobertura histórica ' +
                'parcial de matriz o versión. ' +
                'El cambio numérico es válido, pero ' +
                'requiere cautela en su interpretación.';
        }


        if (
            lecturaEjecutiva ===
            'CONTEXTO_INCOMPLETO'
        ) {
            mensaje =
                'Uno de los períodos comparados no ' +
                'dispone de trazabilidad metodológica ' +
                'suficiente para una comparación ' +
                'directa.';
        }


        if (
            lecturaEjecutiva ===
            'CAMBIO_METODOLOGICO'
        ) {
            mensaje =
                'Entre los períodos comparados cambió ' +
                'la matriz o su versión. La variación ' +
                'observada no debe atribuirse ' +
                'automáticamente al desempeño.';
        }


        if (
            lecturaEjecutiva ===
            'TRANSICION_METODOLOGICA'
        ) {
            mensaje =
                'Uno de los períodos comparados contiene ' +
                'una transición de matriz o versión. ' +
                'La evolución debe analizarse con ese ' +
                'contexto metodológico.';
        }


        titulo.textContent =
            'Comparación con advertencia metodológica';

        texto.textContent =
            mensaje;

        icono.textContent = '↔';

        contenedor.classList.add(
            'is-methodology'
        );

        contenedor.hidden = false;

        return;
    }


    /*
     * --------------------------------------------------
     * Sin advertencias relevantes.
     * --------------------------------------------------
     */
    contenedor.hidden = true;
}

function renderizarMovimientoDesempenoAnalytics(
    evolucion
) {
    const serie =
        evolucion?.serie || [];

    const comparacion =
        evolucion?.comparacion || null;


    const favorable =
        document.getElementById(
            'analyticsMovementFavorable'
        );

    const favorableActualElemento =
        document.getElementById(
            'analyticsMovementFavorableCurrent'
        );

    const atencion =
        document.getElementById(
            'analyticsMovementAttention'
        );

    const atencionActualElemento =
        document.getElementById(
            'analyticsMovementAttentionCurrent'
        );

    const volumen =
        document.getElementById(
            'analyticsMovementVolume'
        );

    const volumenActualElemento =
        document.getElementById(
            'analyticsMovementVolumeCurrent'
        );


    if (!comparacion) {
        if (favorable) {
            favorable.textContent = '—';

            aplicarClaseValorAnalytics(
                favorable,
                'analytics-value-neutral'
            );
        }

        if (favorableActualElemento) {
            favorableActualElemento.textContent =
                '—';
        }

        if (atencion) {
            atencion.textContent = '—';

            aplicarClaseValorAnalytics(
                atencion,
                'analytics-value-neutral'
            );
        }

        if (atencionActualElemento) {
            atencionActualElemento.textContent =
                '—';
        }

        if (volumen) {
            volumen.textContent = '—';

            aplicarClaseValorAnalytics(
                volumen,
                'analytics-value-neutral'
            );
        }

        if (volumenActualElemento) {
            volumenActualElemento.textContent =
                '—';
        }

        return;
    }


    const actual =
        obtenerPuntoSerieAnalytics(
            serie,
            comparacion.periodoActual
        );


    const anterior =
        obtenerPuntoSerieAnalytics(
            serie,
            comparacion.periodoAnterior
        );


    const metodologia =
        comparacion.metodologia || {};


    const comparableMetodologicamente =
        metodologia.comparable === true;


    const lecturaEjecutiva =
        String(
            comparacion.lecturaEjecutiva ||
            comparacion.tendencia ||
            ''
        ).toUpperCase();


    const requiereAdvertenciaMetodologica =
        [
            'CAMBIO_METODOLOGICO',
            'TRANSICION_METODOLOGICA',
            'CONTEXTO_PARCIAL',
            'CONTEXTO_INCOMPLETO'
        ].includes(
            lecturaEjecutiva
        );


    /*
     * --------------------------------------------------
     * NIVEL FAVORABLE
     * Excelente + Bueno
     * --------------------------------------------------
     */
    const favorableActual =
        Number(
            actual?.calidad?.favorablePct || 0
        );


    const favorableAnterior =
        Number(
            anterior?.calidad?.favorablePct || 0
        );


    const deltaFavorable =
        favorableActual -
        favorableAnterior;


    if (favorableActualElemento) {
        favorableActualElemento.textContent =
            `${favorableActual.toFixed(2)}%`;

        favorableActualElemento.title =
            'Porcentaje actual de auditorías en nivel favorable: Excelente + Bueno.';
    }


    if (favorable) {
        favorable.textContent =
            formatearVariacionAnalytics(
                deltaFavorable
            );


        let claseFavorable =
            'analytics-value-neutral';


        if (
            comparableMetodologicamente
        ) {
            claseFavorable =
                deltaFavorable > 0
                    ? 'analytics-value-positive'

                    : deltaFavorable < 0
                        ? 'analytics-value-negative'

                        : 'analytics-value-neutral';
        }


        if (
            requiereAdvertenciaMetodologica
        ) {
            claseFavorable =
                'analytics-value-warning';
        }


        aplicarClaseValorAnalytics(
            favorable,
            claseFavorable
        );


        favorable.title =
            comparableMetodologicamente
                ? 'Variación del nivel favorable entre períodos metodológicamente comparables.'
                : 'Variación observada del nivel favorable. La comparación requiere contexto metodológico.';
    }


    /*
     * --------------------------------------------------
     * FUERA DE NIVEL
     * Regular + Crítico
     * --------------------------------------------------
     */
    const atencionActual =
        Number(
            actual?.calidad?.atencionPct || 0
        );


    const deltaAtencion =
        Number(
            comparacion
                .variacionAtencionPp || 0
        );


    if (atencionActualElemento) {
        atencionActualElemento.textContent =
            `${atencionActual.toFixed(2)}%`;

        atencionActualElemento.title =
            'Porcentaje actual de auditorías fuera de nivel: Regular + Crítico.';
    }


    if (atencion) {
        atencion.textContent =
            formatearVariacionAnalytics(
                deltaAtencion
            );


        let claseAtencion =
            'analytics-value-neutral';


        if (
            comparableMetodologicamente
        ) {
            claseAtencion =
                deltaAtencion < 0
                    ? 'analytics-value-positive'

                    : deltaAtencion > 0
                        ? 'analytics-value-negative'

                        : 'analytics-value-neutral';
        }


        if (
            requiereAdvertenciaMetodologica
        ) {
            claseAtencion =
                'analytics-value-warning';
        }


        aplicarClaseValorAnalytics(
            atencion,
            claseAtencion
        );


        atencion.title =
            comparableMetodologicamente
                ? 'Variación de auditorías fuera de nivel entre períodos metodológicamente comparables.'
                : 'Variación observada de auditorías fuera de nivel. La comparación requiere contexto metodológico.';
    }


    /*
     * --------------------------------------------------
     * VOLUMEN DE AUDITORÍAS
     * --------------------------------------------------
     */
    const volumenActual =
        Number(
            actual?.evaluaciones || 0
        );


    const deltaVolumen =
        comparacion.variacionVolumenPct;


    if (volumenActualElemento) {
        volumenActualElemento.textContent =
            volumenActual.toLocaleString(
                'es-PE'
            );

        volumenActualElemento.title =
            'Cantidad de auditorías del período actual utilizado en la comparación.';
    }


    if (volumen) {
        volumen.textContent =
            formatearVariacionAnalytics(
                deltaVolumen,
                '%'
            );


        /*
         * El volumen no representa por sí mismo
         * mejora o deterioro de calidad.
         */
        aplicarClaseValorAnalytics(
            volumen,
            requiereAdvertenciaMetodologica
                ? 'analytics-value-warning'
                : 'analytics-value-neutral'
        );


        volumen.title =
            comparableMetodologicamente
                ? 'Variación del volumen de auditorías respecto al período anterior.'
                : 'Variación observada del volumen. Los períodos no son metodológicamente equivalentes.';
    }
}


function agregarInsightEvolucionAnalytics(
    contenedor,
    texto,
    clase = null
) {
    if (!contenedor || !texto) return;

    const item =
        document.createElement('div');

    if (clase) {
        item.classList.add(clase);
    }

    item.textContent = texto;

    contenedor.appendChild(item);
}


function renderizarLecturaEjecutivaEvolucionAnalytics(
    evolucion
) {
    const titulo =
        document.getElementById(
            'analyticsEvolutionInsightTitle'
        );

    const texto =
        document.getElementById(
            'analyticsEvolutionInsightText'
        );

    const icono =
        document.querySelector(
            '#analyticsEvolutionInsightMain ' +
            '.analytics-evolution-insight-icon'
        );

    const lista =
        document.getElementById(
            'analyticsEvolutionInsights'
        );

    const comparacion =
        evolucion?.comparacion || null;

    const serie =
        evolucion?.serie || [];

    if (lista) {
        lista.replaceChildren();
    }

    if (!comparacion) {
        if (titulo) {
            titulo.textContent =
                'Aún no existe tendencia comparable';
        }

        if (texto) {
            texto.textContent =
                'Se necesitan al menos dos períodos con una muestra suficiente para interpretar la evolución.';
        }

        if (icono) {
            icono.textContent = '–';
        }

        return;
    }


    const tendencia =
        String(
            comparacion.tendencia ||
            'SIN_DATOS'
        ).toUpperCase();

    const lecturaEjecutiva =
        String(
            comparacion.lecturaEjecutiva ||
            tendencia
        ).toUpperCase();

    const metodologia =
        comparacion.metodologia || {};

    const deltaNota =
        Number(
            comparacion.variacionNotaPp || 0
        );

    const deltaAtencion =
        Number(
            comparacion
                .variacionAtencionPp || 0
        );

    const actual =
        obtenerPuntoSerieAnalytics(
            serie,
            comparacion.periodoActual
        );

    const anterior =
        obtenerPuntoSerieAnalytics(
            serie,
            comparacion.periodoAnterior
        );

    const periodoActual =
        formatearPeriodoAnalytics(
            comparacion.periodoActual,
            evolucion?.granularidad
        );

    const periodoAnterior =
        formatearPeriodoAnalytics(
            comparacion.periodoAnterior,
            evolucion?.granularidad
        );


    /*
     * La lectura metodológica tiene prioridad
     * sobre la tendencia matemática.
     */
    if (
        lecturaEjecutiva ===
        'CONTEXTO_PARCIAL'
    ) {
        if (titulo) {
            titulo.textContent =
                'La variación requiere contexto metodológico';
        }

        if (texto) {
            texto.textContent =
                `Entre ${periodoAnterior} y ` +
                `${periodoActual}, la nota varió ` +
                `${formatearVariacionAnalytics(
                    deltaNota
                )}, pero los períodos no tienen ` +
                `una cobertura metodológica equivalente.`;
        }

        if (icono) {
            icono.textContent = '!';
        }

    } else if (
        lecturaEjecutiva ===
        'CONTEXTO_INCOMPLETO'
    ) {
        if (titulo) {
            titulo.textContent =
                'La comparación tiene contexto incompleto';
        }

        if (texto) {
            texto.textContent =
                `La variación observada entre ` +
                `${periodoAnterior} y ` +
                `${periodoActual} debe interpretarse ` +
                `con cautela porque falta información ` +
                `histórica de matriz o versión.`;
        }

        if (icono) {
            icono.textContent = '!';
        }

    } else if (
        lecturaEjecutiva ===
        'TRANSICION_METODOLOGICA'
    ) {
        if (titulo) {
            titulo.textContent =
                'El período contiene una transición metodológica';
        }

        if (texto) {
            texto.textContent =
                `La evolución observada entre ` +
                `${periodoAnterior} y ` +
                `${periodoActual} coincide con una ` +
                `transición de matriz o versión.`;
        }

        if (icono) {
            icono.textContent = '↔';
        }

    } else if (
        lecturaEjecutiva ===
        'CAMBIO_METODOLOGICO'
    ) {
        if (titulo) {
            titulo.textContent =
                'Existe un cambio metodológico entre períodos';
        }

        if (texto) {
            texto.textContent =
                `La variación de ` +
                `${formatearVariacionAnalytics(
                    deltaNota
                )} coincide con un cambio de ` +
                `matriz o versión de auditoría.`;
        }

        if (icono) {
            icono.textContent = '↔';
        }

    } else if (
        lecturaEjecutiva ===
        'SIN_DATOS_COMPARABLES'
    ) {
        if (titulo) {
            titulo.textContent =
                'Aún no existe una comparación confiable';
        }

        if (texto) {
            texto.textContent =
                'No existen dos períodos con condiciones suficientes para construir una lectura ejecutiva comparable.';
        }

        if (icono) {
            icono.textContent = '–';
        }

    } else if (
        tendencia === 'MEJORA'
    ) {
        if (titulo) {
            titulo.textContent =
                'La calidad muestra una evolución favorable';
        }

        if (texto) {
            texto.textContent =
                `Entre ${periodoAnterior} y ` +
                `${periodoActual}, la nota varió ` +
                `${formatearVariacionAnalytics(
                    deltaNota
                )}.`;
        }

        if (icono) {
            icono.textContent = '↗';
        }

    } else if (
        tendencia === 'DETERIORO'
    ) {
        if (titulo) {
            titulo.textContent =
                'La calidad requiere atención';
        }

        if (texto) {
            texto.textContent =
                `Entre ${periodoAnterior} y ` +
                `${periodoActual}, la nota cayó ` +
                `${Math.abs(
                    deltaNota
                ).toFixed(2)} pp.`;
        }

        if (icono) {
            icono.textContent = '↘';
        }

    } else {
        if (titulo) {
            titulo.textContent =
                'La calidad se mantiene estable';
        }

        if (texto) {
            texto.textContent =
                `Entre ${periodoAnterior} y ` +
                `${periodoActual}, la variación ` +
                `de la nota fue de ` +
                `${formatearVariacionAnalytics(
                    deltaNota
                )}.`;
        }

        if (icono) {
            icono.textContent = '→';
        }
    }


    if (!lista) {
        return;
    }


    /*
     * Resultado observado.
     * Se mantiene aunque la metodología
     * impida atribuir causalidad.
     */
    agregarInsightEvolucionAnalytics(
        lista,
        `Auditorías fuera de nivel pasaron de ` +
        `${Number(
            anterior?.calidad
                ?.atencionPct || 0
        ).toFixed(2)}% a ` +
        `${Number(
            actual?.calidad
                ?.atencionPct || 0
        ).toFixed(2)}% ` +
        `(${formatearVariacionAnalytics(
            deltaAtencion
        )}).`
    );


    agregarInsightEvolucionAnalytics(
        lista,
        `El volumen comparable cambió ` +
        `${formatearVariacionAnalytics(
            comparacion
                .variacionVolumenPct,
            '%'
        )}.`
    );


    /*
     * Advertencia metodológica explícita.
     */
    if (
        metodologia.comparable === false
    ) {
        const estadoActual =
            metodologia.estado ||
            'SIN INFORMACIÓN';

        const estadoAnterior =
            metodologia.estadoAnterior ||
            'SIN INFORMACIÓN';

        agregarInsightEvolucionAnalytics(
            lista,
            `Comparación metodológica no equivalente: ` +
            `período anterior ${estadoAnterior} y ` +
            `período actual ${estadoActual}.`,
            'analytics-insight-warning'
        );
    }


    /*
     * El período cronológicamente más reciente
     * puede ser visible aunque no determine
     * la tendencia.
     */
    const ultimo =
        serie.length > 0
            ? serie[serie.length - 1]
            : null;

    if (
        ultimo?.muestra?.suficiente ===
        false
    ) {
        agregarInsightEvolucionAnalytics(
            lista,
            `El período más reciente ` +
            `(${formatearPeriodoAnalytics(
                ultimo.periodo,
                evolucion?.granularidad
            )}) tiene ` +
            `${Number(
                ultimo.evaluaciones || 0
            ).toLocaleString(
                'es-PE'
            )} auditorías y no determina ` +
            `la tendencia ejecutiva.`
        );
    }
}


function crearGraficoEvolucionAnalytics(
    evolucion
) {
    const canvas =
        document.getElementById(
            'analyticsEvolutionChart'
        );

    if (!canvas) return;

    if (
        typeof Chart === 'undefined'
    ) {
        console.warn(
            '⚠️ Chart.js no disponible para Analytics'
        );
        return;
    }

    if (
        analyticsEvolutionChart &&
        typeof analyticsEvolutionChart.destroy ===
        'function'
    ) {
        analyticsEvolutionChart.destroy();
        analyticsEvolutionChart = null;
    }

    const serie =
        evolucion?.serie || [];

    if (serie.length === 0) {
        return;
    }


    const labels =
        serie.map(
            item =>
                formatearPeriodoAnalytics(
                    item.periodo,
                    evolucion?.granularidad
                )
        );


    const notas =
        serie.map(
            item =>
                item.notaPromedio == null
                    ? null
                    : Number(
                        item.notaPromedio
                    )
        );


    const volumenes =
        serie.map(
            item =>
                Number(
                    item.evaluaciones || 0
                )
        );


    /*
     * --------------------------------------------------
     * CONTEXTO VISUAL DE CADA PERÍODO
     * --------------------------------------------------
     *
     * Azul:
     * período metodológicamente estable/comparable.
     *
     * Naranja:
     * muestra insuficiente.
     *
     * Amarillo oscuro:
     * contexto parcial o incompleto.
     *
     * Morado:
     * transición/cambio de versión.
     *
     * Rojo oscuro:
     * transición/cambio de matriz.
     * --------------------------------------------------
     */

    const obtenerEstadoVisual =
        item => {
            if (
                item?.muestra?.suficiente ===
                false
            ) {
                return {
                    color: '#F59E0B',
                    estilo: 'triangle',
                    radio: 6
                };
            }

            const contexto =
                String(
                    item?.contextoMatriz
                        ?.estado ||
                    ''
                ).toUpperCase();

            const cambio =
                String(
                    item?.contextoMatriz
                        ?.cambioRespectoAnterior
                        ?.tipo ||
                    ''
                ).toUpperCase();

            if (
                contexto ===
                'TRANSICION_MATRIZ' ||
                cambio ===
                'CAMBIO_MATRIZ'
            ) {
                return {
                    color: '#D93025',
                    estilo: 'rectRot',
                    radio: 7
                };
            }

            if (
                contexto ===
                'TRANSICION_VERSION' ||
                cambio ===
                'CAMBIO_VERSION'
            ) {
                return {
                    color: '#7B1FA2',
                    estilo: 'rectRot',
                    radio: 7
                };
            }

            if (
                contexto ===
                'CONTEXTO_PARCIAL' ||
                contexto ===
                'SIN_MATRIZ_IDENTIFICADA'
            ) {
                return {
                    color: '#D97706',
                    estilo: 'rectRounded',
                    radio: 6
                };
            }

            return {
                color: '#1A7F37',
                estilo: 'circle',
                radio: 4
            };
        };


    const estadosVisuales =
        serie.map(
            obtenerEstadoVisual
        );


    const coloresPuntos =
        estadosVisuales.map(
            item => item.color
        );


    const estilosPuntos =
        estadosVisuales.map(
            item => item.estilo
        );


    const radiosPuntos =
        estadosVisuales.map(
            item => item.radio
        );


    /*
     * Convierte estados técnicos en texto
     * entendible para el usuario.
     */
    const describirEstadoMetodologico =
        estado => {
            switch (
            String(
                estado || ''
            ).toUpperCase()
            ) {
                case 'ESTABLE':
                    return 'Metodología estable';

                case 'COMPARABLE':
                    return 'Comparable';

                case 'CONTEXTO_PARCIAL':
                    return 'Contexto metodológico parcial';

                case 'SIN_MATRIZ_IDENTIFICADA':
                    return 'Matriz no identificada';

                case 'CONTEXTO_INCOMPLETO':
                    return 'Contexto metodológico incompleto';

                case 'TRANSICION_VERSION':
                    return 'Transición de versión';

                case 'TRANSICION_MATRIZ':
                    return 'Transición de matriz';

                case 'CAMBIO_VERSION':
                    return 'Cambio de versión';

                case 'CAMBIO_MATRIZ':
                    return 'Cambio de matriz';

                case 'MUESTRA_INSUFICIENTE':
                    return 'Muestra insuficiente';

                case 'SIN_CAMBIO':
                    return 'Sin cambio metodológico';

                case 'SIN_PERIODO_ANTERIOR':
                    return 'Primer período disponible';

                default:
                    return estado ||
                        'Sin información';
            }
        };


    /*
     * Resume las matrices/versiones realmente
     * utilizadas dentro del período.
     */
    const obtenerConfiguracionesPeriodo =
        punto => {
            const configuraciones =
                punto?.contextoMatriz
                    ?.configuraciones ||
                [];

            if (
                configuraciones.length === 0
            ) {
                return [];
            }

            return configuraciones.map(
                item => {
                    const matriz =
                        item.matrizCodigo ||
                        (
                            item.matrizId != null
                                ? `Matriz ${item.matrizId}`
                                : 'Matriz no identificada'
                        );

                    const version =
                        item.version ||
                        (
                            item.versionMatrizId != null
                                ? `Versión ${item.versionMatrizId}`
                                : 'Sin versión identificada'
                        );

                    const auditorias =
                        Number(
                            item.auditorias || 0
                        );

                    const porcentaje =
                        Number(
                            item.porcentaje || 0
                        );

                    return (
                        `${matriz} · ${version}: ` +
                        `${auditorias.toLocaleString(
                            'es-PE'
                        )} auditorías ` +
                        `(${porcentaje.toFixed(2)}%)`
                    );
                }
            );
        };


    const contexto =
        canvas.getContext('2d');


    analyticsEvolutionChart =
        new Chart(
            contexto,
            {
                data: {
                    labels,

                    datasets: [
                        {
                            type: 'bar',

                            label:
                                'Auditorías realizadas',

                            data:
                                volumenes,

                            yAxisID:
                                'yVolumen',

                            backgroundColor:
                                'rgba(1, 157, 244, 0.12)',

                            borderColor:
                                'rgba(1, 157, 244, 0.24)',

                            borderWidth: 1,

                            borderRadius: 5,

                            order: 2
                        },

                        {
                            type: 'line',

                            label:
                                'Nota promedio',

                            data:
                                notas,

                            yAxisID:
                                'yNota',

                            borderColor:
                                '#019DF4',

                            backgroundColor:
                                '#019DF4',

                            pointBackgroundColor:
                                coloresPuntos,

                            pointBorderColor:
                                coloresPuntos,

                            pointStyle:
                                estilosPuntos,

                            pointRadius:
                                radiosPuntos,

                            pointHoverRadius:
                                radiosPuntos.map(
                                    radio =>
                                        radio + 2
                                ),

                            pointBorderWidth: 2,

                            borderWidth: 3,

                            tension: 0.25,

                            fill: false,

                            spanGaps: true,

                            order: 1
                        }
                    ]
                },


                options: {
                    responsive: true,

                    maintainAspectRatio: false,

                    interaction: {
                        mode: 'index',
                        intersect: false
                    },


                    plugins: {
                        legend: {
                            display: false
                        },


                        datalabels: {
                            display: false
                        },


                        tooltip: {
                            callbacks: {

                                title:
                                    tooltipItems => {
                                        const indice =
                                            tooltipItems?.[0]
                                                ?.dataIndex;

                                        if (
                                            indice == null
                                        ) {
                                            return '';
                                        }

                                        return labels[indice];
                                    },


                                afterBody:
                                    tooltipItems => {
                                        const indice =
                                            tooltipItems?.[0]
                                                ?.dataIndex;

                                        if (
                                            indice == null
                                        ) {
                                            return [];
                                        }

                                        const punto =
                                            serie[indice];

                                        const lineas = [];


                                        /*
                                         * Separador visual
                                         */
                                        lineas.push('');


                                        /*
                                         * Calidad de la muestra
                                         */
                                        if (
                                            punto?.muestra
                                                ?.suficiente ===
                                            false
                                        ) {
                                            lineas.push(
                                                '⚠ Muestra insuficiente'
                                            );

                                            lineas.push(
                                                `${Number(
                                                    punto.evaluaciones ||
                                                    0
                                                ).toLocaleString(
                                                    'es-PE'
                                                )} auditorías; ` +
                                                `mínimo de referencia: ` +
                                                `${Number(
                                                    punto
                                                        ?.muestra
                                                        ?.minimoReferencia ||
                                                    0
                                                ).toLocaleString(
                                                    'es-PE'
                                                )}.`
                                            );
                                        }


                                        /*
                                         * Estado del período
                                         */
                                        const estadoContexto =
                                            punto
                                                ?.contextoMatriz
                                                ?.estado;

                                        if (
                                            estadoContexto
                                        ) {
                                            lineas.push(
                                                `Contexto: ` +
                                                `${describirEstadoMetodologico(
                                                    estadoContexto
                                                )}`
                                            );
                                        }


                                        /*
                                         * Comparabilidad individual
                                         */
                                        const comparabilidad =
                                            punto
                                                ?.comparabilidad
                                                ?.estado;

                                        if (
                                            comparabilidad &&
                                            comparabilidad !==
                                            'COMPARABLE'
                                        ) {
                                            lineas.push(
                                                `Comparabilidad: ` +
                                                `${describirEstadoMetodologico(
                                                    comparabilidad
                                                )}`
                                            );
                                        }


                                        /*
                                         * Cambio respecto del período
                                         * inmediatamente anterior.
                                         */
                                        const cambio =
                                            punto
                                                ?.contextoMatriz
                                                ?.cambioRespectoAnterior;

                                        if (
                                            cambio?.tipo &&
                                            ![
                                                'SIN_CAMBIO',
                                                'SIN_PERIODO_ANTERIOR'
                                            ].includes(
                                                cambio.tipo
                                            )
                                        ) {
                                            lineas.push(
                                                `Cambio: ` +
                                                `${describirEstadoMetodologico(
                                                    cambio.tipo
                                                )}`
                                            );
                                        }


                                        /*
                                         * Distribución real de
                                         * matrices/versiones.
                                         */
                                        const configuraciones =
                                            obtenerConfiguracionesPeriodo(
                                                punto
                                            );

                                        if (
                                            configuraciones.length >
                                            0
                                        ) {
                                            lineas.push('');

                                            lineas.push(
                                                'Matriz / versión:'
                                            );

                                            for (
                                                const configuracion
                                                of configuraciones
                                            ) {
                                                lineas.push(
                                                    `• ${configuracion}`
                                                );
                                            }
                                        }


                                        /*
                                         * Auditorías sin trazabilidad.
                                         */
                                        const sinMatriz =
                                            Number(
                                                punto
                                                    ?.contextoMatriz
                                                    ?.auditoriasSinMatriz ||
                                                0
                                            );

                                        if (
                                            sinMatriz > 0
                                        ) {
                                            const porcentajeSinMatriz =
                                                Number(
                                                    punto
                                                        ?.contextoMatriz
                                                        ?.porcentajeSinMatriz ||
                                                    0
                                                );

                                            lineas.push('');

                                            lineas.push(
                                                `Sin matriz identificada: ` +
                                                `${sinMatriz.toLocaleString(
                                                    'es-PE'
                                                )} ` +
                                                `(${porcentajeSinMatriz.toFixed(
                                                    2
                                                )}%)`
                                            );
                                        }


                                        return lineas;
                                    }
                            }
                        }
                    },


                    scales: {
                        x: {
                            grid: {
                                display: false
                            },

                            ticks: {
                                color:
                                    '#4b6074',

                                font: {
                                    size: 10
                                }
                            }
                        },


                        yNota: {
                            position: 'left',

                            min: 0,

                            max: 100,

                            title: {
                                display: true,

                                text:
                                    'Nota promedio',

                                color:
                                    '#4b6074'
                            },

                            grid: {
                                color:
                                    'rgba(216, 230, 246, 0.65)'
                            },

                            ticks: {
                                color:
                                    '#4b6074'
                            }
                        },


                        yVolumen: {
                            position: 'right',

                            beginAtZero: true,

                            title: {
                                display: true,

                                text:
                                    'Auditorías',

                                color:
                                    '#4b6074'
                            },

                            grid: {
                                drawOnChartArea:
                                    false
                            },

                            ticks: {
                                color:
                                    '#4b6074',

                                precision: 0
                            }
                        }
                    }
                }
            }
        );
}


function crearGraficoMixCalidadAnalytics(
    evolucion
) {
    const canvas =
        document.getElementById(
            'analyticsQualityMixChart'
        );

    if (!canvas) return;

    if (
        typeof Chart === 'undefined'
    ) {
        return;
    }

    if (
        analyticsQualityMixChart &&
        typeof analyticsQualityMixChart.destroy ===
        'function'
    ) {
        analyticsQualityMixChart.destroy();
        analyticsQualityMixChart = null;
    }

    const serie =
        evolucion?.serie || [];

    if (serie.length === 0) {
        return;
    }


    const labels =
        serie.map(
            item =>
                formatearPeriodoAnalytics(
                    item.periodo,
                    evolucion?.granularidad
                )
        );


    const porcentaje =
        (cantidad, total) =>
            total > 0
                ? Number(
                    (
                        (
                            Number(
                                cantidad || 0
                            ) /
                            Number(total)
                        ) * 100
                    ).toFixed(2)
                )
                : 0;


    /*
     * IMPORTANTE:
     *
     * "bien" y "bajo" son las claves
     * históricas/backend.
     *
     * En presentación:
     *
     * bien  -> Bueno
     * bajo  -> Crítico
     *
     * No se modifica persistencia.
     */

    const excelente =
        serie.map(
            item =>
                porcentaje(
                    item?.rangos
                        ?.excelente,
                    item.evaluaciones
                )
        );


    const bueno =
        serie.map(
            item =>
                porcentaje(
                    item?.rangos?.bien,
                    item.evaluaciones
                )
        );


    const regular =
        serie.map(
            item =>
                porcentaje(
                    item?.rangos
                        ?.regular,
                    item.evaluaciones
                )
        );


    const critico =
        serie.map(
            item =>
                porcentaje(
                    item?.rangos?.bajo,
                    item.evaluaciones
                )
        );


    const contexto =
        canvas.getContext('2d');


    analyticsQualityMixChart =
        new Chart(
            contexto,
            {
                type: 'bar',

                data: {
                    labels,

                    datasets: [
                        {
                            label:
                                'Excelente',

                            data:
                                excelente,

                            backgroundColor:
                                '#1A7F37',

                            borderWidth: 0
                        },

                        {
                            label:
                                'Bueno',

                            data:
                                bueno,

                            backgroundColor:
                                '#019DF4',

                            borderWidth: 0
                        },

                        {
                            label:
                                'Regular',

                            data:
                                regular,

                            backgroundColor:
                                '#F59E0B',

                            borderWidth: 0
                        },

                        {
                            label:
                                'Crítico',

                            data:
                                critico,

                            backgroundColor:
                                '#D93025',

                            borderWidth: 0
                        }
                    ]
                },


                options: {
                    responsive: true,

                    maintainAspectRatio: false,


                    interaction: {
                        mode: 'index',
                        intersect: false
                    },


                    plugins: {
                        legend: {
                            position:
                                'bottom',

                            labels: {
                                usePointStyle:
                                    true,

                                boxWidth: 8,

                                color:
                                    '#4b6074',

                                font: {
                                    size: 10
                                }
                            }
                        },


                        datalabels: {
                            display: false
                        },


                        tooltip: {
                            callbacks: {

                                title:
                                    tooltipItems => {
                                        const indice =
                                            tooltipItems?.[0]
                                                ?.dataIndex;

                                        if (
                                            indice == null
                                        ) {
                                            return '';
                                        }

                                        return labels[
                                            indice
                                        ];
                                    },


                                label:
                                    context => {
                                        const indice =
                                            context
                                                .dataIndex;

                                        const item =
                                            serie[
                                            indice
                                            ];

                                        const nombre =
                                            context
                                                .dataset
                                                .label;


                                        /*
                                         * Traducción inversa
                                         * hacia claves backend.
                                         */
                                        const clave =
                                            nombre ===
                                                'Excelente'
                                                ? 'excelente'

                                                : nombre ===
                                                    'Bueno'
                                                    ? 'bien'

                                                    : nombre ===
                                                        'Regular'
                                                        ? 'regular'

                                                        : 'bajo';


                                        const cantidad =
                                            Number(
                                                item
                                                    ?.rangos
                                                ?.[clave] ||
                                                0
                                            );


                                        return (
                                            `${nombre}: ` +
                                            `${Number(
                                                context.raw ||
                                                0
                                            ).toFixed(
                                                2
                                            )}% ` +
                                            `(${cantidad.toLocaleString(
                                                'es-PE'
                                            )} auditorías)`
                                        );
                                    },


                                afterBody:
                                    tooltipItems => {
                                        const indice =
                                            tooltipItems?.[0]
                                                ?.dataIndex;

                                        if (
                                            indice == null
                                        ) {
                                            return [];
                                        }

                                        const punto =
                                            serie[indice];

                                        const lineas = [];


                                        const favorable =
                                            Number(
                                                punto
                                                    ?.calidad
                                                    ?.favorablePct ||
                                                0
                                            );

                                        const fueraNivel =
                                            Number(
                                                punto
                                                    ?.calidad
                                                    ?.atencionPct ||
                                                0
                                            );


                                        lineas.push('');

                                        lineas.push(
                                            `Nivel favorable: ` +
                                            `${favorable.toFixed(
                                                2
                                            )}%`
                                        );

                                        lineas.push(
                                            `Fuera de nivel: ` +
                                            `${fueraNivel.toFixed(
                                                2
                                            )}%`
                                        );


                                        if (
                                            punto?.muestra
                                                ?.suficiente ===
                                            false
                                        ) {
                                            lineas.push('');

                                            lineas.push(
                                                '⚠ Muestra limitada'
                                            );
                                        }


                                        return lineas;
                                    }
                            }
                        }
                    },


                    scales: {
                        x: {
                            stacked: true,

                            grid: {
                                display: false
                            },

                            ticks: {
                                color:
                                    '#4b6074',

                                font: {
                                    size: 10
                                }
                            }
                        },


                        y: {
                            stacked: true,

                            beginAtZero: true,

                            max: 100,

                            title: {
                                display: true,

                                text:
                                    '% de auditorías',

                                color:
                                    '#4b6074'
                            },

                            grid: {
                                color:
                                    'rgba(216, 230, 246, 0.65)'
                            },

                            ticks: {
                                color:
                                    '#4b6074',

                                callback:
                                    value =>
                                        `${value}%`
                            }
                        }
                    }
                }
            }
        );
}


function limpiarEvolucionAnalytics() {
    destruirGraficosEvolucionAnalytics();

    const ids = [
        'analyticsEvolutionNota',
        'analyticsEvolutionVariacionNota',
        'analyticsEvolutionAtencion',
        'analyticsEvolutionVariacionAtencion',
        'analyticsMovementFavorable',
        'analyticsMovementAttention',
        'analyticsMovementVolume'
    ];

    for (const id of ids) {
        const elemento =
            document.getElementById(id);

        if (elemento) {
            elemento.textContent = '—';

            limpiarEstadoSemanticoAnalytics(
                elemento
            );
        }
    }

    const periodo =
        document.getElementById(
            'analyticsEvolutionPeriodo'
        );

    if (periodo) {
        periodo.textContent =
            'Sin información';
    }

    const advertencia =
        document.getElementById(
            'analyticsEvolutionSampleWarning'
        );

    if (advertencia) {
        advertencia.hidden = true;
    }
}

// ==========================================================
// MECA ANALYTICS 2.0
// BLOQUE 06 - INTERVENCIÓN Y RESULTADO
// ¿QUÉ HICIMOS AL RESPECTO Y FUNCIONÓ?
// ==========================================================

function formatearNumeroIntervencionAnalytics(
    valor
) {
    return new Intl.NumberFormat(
        'es-PE'
    ).format(
        Number(valor || 0)
    );
}


function formatearPorcentajeIntervencionAnalytics(
    valor
) {
    if (
        valor === null ||
        valor === undefined ||
        Number.isNaN(
            Number(valor)
        )
    ) {
        return '—';
    }

    return `${Math.round(
        Number(valor)
    )}%`;
}


function formatearPeriodoIntervencionAnalytics(
    periodo
) {
    if (!periodo) {
        return '—';
    }

    const [
        anio,
        mes
    ] =
        String(periodo)
            .split('-');

    const fecha =
        new Date(
            Number(anio),
            Number(mes) - 1,
            1
        );

    if (
        Number.isNaN(
            fecha.getTime()
        )
    ) {
        return periodo;
    }

    const texto =
        new Intl.DateTimeFormat(
            'es-PE',
            {
                month: 'short',
                year: 'numeric'
            }
        ).format(fecha);

    return texto
        .replace('.', '')
        .replace(
            /^\w/,
            letra =>
                letra.toUpperCase()
        );
}


function formatearEstadoPdaAnalytics(
    estado
) {
    const valor =
        String(
            estado || ''
        )
            .trim()
            .toLowerCase();

    const etiquetas = {
        detectado:
            'Detectado',

        pendiente_notificacion:
            'Pendiente de notificación',

        notificado:
            'Notificado',

        en_gestion:
            'En gestión',

        feedback_registrado:
            'Feedback realizado',

        en_seguimiento:
            'En seguimiento',

        derivado_capacitacion:
            'Derivado a capacitación',

        en_capacitacion:
            'En capacitación',

        seguimiento_capacitacion:
            'Seguimiento post-capacitación',

        cerrado:
            'Cerrado',

        escalado:
            'Escalado'
    };

    if (
        etiquetas[valor]
    ) {
        return etiquetas[valor];
    }

    if (!valor) {
        return 'Sin estado';
    }

    return valor
        .replaceAll('_', ' ')
        .replace(
            /^\w/,
            letra =>
                letra.toUpperCase()
        );
}


// ==========================================================
// KPI
// ==========================================================

function renderizarResumenIntervencionAnalytics(
    data
) {
    const resumen =
        data?.resumen || {};

    const calidad =
        data?.calidadDatos || {};

    const elementos = {
        analyticsInterventionGenerated:
            resumen.pdaGenerados,

        analyticsInterventionManagers:
            resumen.gestoresIntervenidos,

        analyticsInterventionImproved:
            resumen.mejoraron,

        analyticsInterventionEvaluable:
            resumen.pdaEvaluables,

        analyticsInterventionPending:
            calidad.pendientesMedicion
    };


    for (
        const [
            id,
            valor
        ]
        of Object.entries(
            elementos
        )
    ) {
        const elemento =
            document.getElementById(
                id
            );

        if (elemento) {
            elemento.textContent =
                formatearNumeroIntervencionAnalytics(
                    valor
                );
        }
    }


    const tasa =
        document.getElementById(
            'analyticsInterventionImprovementRate'
        );

    if (tasa) {
        tasa.textContent =
            formatearPorcentajeIntervencionAnalytics(
                resumen.tasaMejoraPct
            );
    }


    const detalleTasa =
        document.getElementById(
            'analyticsInterventionImprovementRateDetail'
        );

    if (detalleTasa) {
        if (
            Number(
                resumen.pdaEvaluables || 0
            ) === 0
        ) {
            detalleTasa.textContent =
                'Aún no existen casos con resultado posterior';
        } else {
            detalleTasa.textContent =
                `Sobre ${formatearNumeroIntervencionAnalytics(
                    resumen.pdaEvaluables
                )} PDA evaluables`;
        }
    }
}


// ==========================================================
// LECTURA PRINCIPAL
// ==========================================================

function renderizarLecturaIntervencionAnalytics(
    data
) {
    const elemento =
        document.getElementById(
            'analyticsInterventionInsightText'
        );

    if (!elemento) {
        return;
    }


    const resumen =
        data?.resumen || {};

    const calidad =
        data?.calidadDatos || {};


    const generados =
        Number(
            resumen.pdaGenerados || 0
        );

    const gestores =
        Number(
            resumen.gestoresIntervenidos || 0
        );

    const evaluables =
        Number(
            resumen.pdaEvaluables || 0
        );

    const mejoraron =
        Number(
            resumen.mejoraron || 0
        );

    const persisten =
        Number(
            resumen.persisten || 0
        );

    const pendientes =
        Number(
            calidad.pendientesMedicion || 0
        );


    if (
        generados === 0
    ) {
        elemento.textContent =
            'No se registran PDA para los filtros seleccionados.';

        return;
    }


    if (
        evaluables === 0
    ) {
        elemento.textContent =
            `Durante el período se generaron ` +
            `${formatearNumeroIntervencionAnalytics(
                generados
            )} PDA para ` +
            `${formatearNumeroIntervencionAnalytics(
                gestores
            )} gestores. ` +
            `${formatearNumeroIntervencionAnalytics(
                pendientes
            )} casos aún se encuentran pendientes ` +
            `de contar con un resultado posterior, por lo que ` +
            `todavía no corresponde calcular una tasa de mejora.`;

        return;
    }


    const tasa =
        formatearPorcentajeIntervencionAnalytics(
            resumen.tasaMejoraPct
        );


    elemento.textContent =
        `Durante el período se generaron ` +
        `${formatearNumeroIntervencionAnalytics(
            generados
        )} PDA para ` +
        `${formatearNumeroIntervencionAnalytics(
            gestores
        )} gestores. ` +
        `De los ${formatearNumeroIntervencionAnalytics(
            evaluables
        )} casos que ya cuentan con seguimiento posterior, ` +
        `${formatearNumeroIntervencionAnalytics(
            mejoraron
        )} mostraron mejora y ` +
        `${formatearNumeroIntervencionAnalytics(
            persisten
        )} mantienen oportunidades. ` +
        `La tasa de mejora observada es de ${tasa}.`;
}


// ==========================================================
// ACCIONES REALIZADAS
// ==========================================================

function renderizarAccionesIntervencionAnalytics(
    data
) {
    const contenedor =
        document.getElementById(
            'analyticsInterventionActions'
        );

    if (!contenedor) {
        return;
    }


    const feedback =
        data?.intervenciones
            ?.feedback || {};

    const capacitacion =
        data?.intervenciones
            ?.capacitacion || {};

    const resumen =
        data?.resumen || {};


    const acciones = [
        {
            nombre:
                'Feedback realizado',

            valor:
                Number(
                    feedback.realizados || 0
                ),

            detalle:
                'Casos con intervención de feedback registrada'
        },

        {
            nombre:
                'Derivados a capacitación',

            valor:
                Number(
                    capacitacion.derivados || 0
                ),

            detalle:
                'Casos que requirieron una intervención adicional'
        },

        {
            nombre:
                'Capacitaciones realizadas',

            valor:
                Number(
                    capacitacion.realizados || 0
                ),

            detalle:
                'Capacitaciones efectivamente ejecutadas'
        },

        {
            nombre:
                'Con seguimiento posterior',

            valor:
                Number(
                    resumen.pdaEvaluables || 0
                ),

            detalle:
                'Casos que ya cuentan con medición posterior'
        }
    ];


    contenedor.innerHTML =
        acciones
            .map(
                item => `
                    <div class="
                        analytics-intervention-list-item
                    ">
                        <div>
                            <strong>
                                ${item.nombre}
                            </strong>

                            <span>
                                ${item.detalle}
                            </span>
                        </div>

                        <strong class="
                            analytics-intervention-list-value
                        ">
                            ${formatearNumeroIntervencionAnalytics(
                                item.valor
                            )}
                        </strong>
                    </div>
                `
            )
            .join('');
}


// ==========================================================
// ESTADOS
// ==========================================================

function renderizarEstadosIntervencionAnalytics(
    data
) {
    const contenedor =
        document.getElementById(
            'analyticsInterventionStates'
        );

    if (!contenedor) {
        return;
    }


    const estados =
        Array.isArray(
            data?.estados
        )
            ? data.estados
            : [];


    if (
        estados.length === 0
    ) {
        contenedor.innerHTML = `
            <div class="
                analytics-intervention-empty
            ">
                No existen PDA para los filtros seleccionados.
            </div>
        `;

        return;
    }


    contenedor.innerHTML =
        estados
            .map(
                item => {

                    const estado =
                        item.estado ??
                        item.nombre ??
                        '';

                    const cantidad =
                        Number(
                            item.cantidad ??
                            item.total ??
                            item.pda ??
                            0
                        );

                    return `
                        <div class="
                            analytics-intervention-list-item
                        ">
                            <span>
                                ${formatearEstadoPdaAnalytics(
                                    estado
                                )}
                            </span>

                            <strong class="
                                analytics-intervention-list-value
                            ">
                                ${formatearNumeroIntervencionAnalytics(
                                    cantidad
                                )}
                            </strong>
                        </div>
                    `;
                }
            )
            .join('');
}


// ==========================================================
// EFECTIVIDAD
// ==========================================================

function renderizarEfectividadIntervencionAnalytics(
    data
) {
    const feedback =
        data?.intervenciones
            ?.feedback || {};

    const capacitacion =
        data?.intervenciones
            ?.capacitacion || {};


    const feedbackRate =
        document.getElementById(
            'analyticsInterventionFeedbackRate'
        );

    const feedbackDetail =
        document.getElementById(
            'analyticsInterventionFeedbackDetail'
        );


    if (feedbackRate) {
        feedbackRate.textContent =
            formatearPorcentajeIntervencionAnalytics(
                feedback.efectividadPct
            );
    }


    if (feedbackDetail) {
        const evaluables =
            Number(
                feedback.evaluables || 0
            );

        if (
            evaluables === 0
        ) {
            feedbackDetail.textContent =
                'Aún sin resultados medibles';
        } else {
            feedbackDetail.textContent =
                `${formatearNumeroIntervencionAnalytics(
                    feedback.mejoraron
                )} mejoraron de ` +
                `${formatearNumeroIntervencionAnalytics(
                    evaluables
                )} evaluables`;
        }
    }


    const capacitacionRate =
        document.getElementById(
            'analyticsInterventionTrainingRate'
        );

    const capacitacionDetail =
        document.getElementById(
            'analyticsInterventionTrainingDetail'
        );


    if (capacitacionRate) {
        capacitacionRate.textContent =
            formatearPorcentajeIntervencionAnalytics(
                capacitacion.efectividadPct
            );
    }


    if (capacitacionDetail) {
        const evaluables =
            Number(
                capacitacion.evaluables || 0
            );

        if (
            evaluables === 0
        ) {
            capacitacionDetail.textContent =
                'Aún sin resultados medibles';
        } else {
            capacitacionDetail.textContent =
                `${formatearNumeroIntervencionAnalytics(
                    capacitacion.mejoraron
                )} mejoraron de ` +
                `${formatearNumeroIntervencionAnalytics(
                    evaluables
                )} evaluables`;
        }
    }
}


// ==========================================================
// EVOLUCIÓN MENSUAL
// ==========================================================

function renderizarEvolucionIntervencionAnalytics(
    data
) {
    const tbody =
        document.getElementById(
            'analyticsInterventionEvolutionBody'
        );

    if (!tbody) {
        return;
    }


    const evolucion =
        Array.isArray(
            data?.evolucion
        )
            ? data.evolucion
            : [];


    if (
        evolucion.length === 0
    ) {
        tbody.innerHTML = `
            <tr>
                <td
                    colspan="5"
                    class="
                        analytics-intervention-empty
                    "
                >
                    No existe información mensual
                    para los filtros seleccionados.
                </td>
            </tr>
        `;

        return;
    }


    tbody.innerHTML =
        evolucion
            .map(
                item => `
                    <tr>
                        <td>
                            ${formatearPeriodoIntervencionAnalytics(
                                item.periodo
                            )}
                        </td>

                        <td>
                            ${formatearNumeroIntervencionAnalytics(
                                item.generados
                            )}
                        </td>

                        <td>
                            ${formatearNumeroIntervencionAnalytics(
                                item.evaluables
                            )}
                        </td>

                        <td>
                            ${formatearNumeroIntervencionAnalytics(
                                item.mejoraron
                            )}
                        </td>

                        <td>
                            ${formatearNumeroIntervencionAnalytics(
                                item.cerrados
                            )}
                        </td>
                    </tr>
                `
            )
            .join('');
}


// ==========================================================
// RESOLUCIÓN
// ==========================================================

function renderizarResolucionIntervencionAnalytics(
    data
) {
    const resolucion =
        data?.resolucion || {};


    const valores = {
        analyticsInterventionFeedbackResolved:
            resolucion.feedbackSuficiente,

        analyticsInterventionTrainingRequired:
            resolucion.requirioCapacitacion,

        analyticsInterventionFollowing:
            resolucion.continuaSeguimiento,

        analyticsInterventionEscalated:
            resolucion.escalados
    };


    for (
        const [
            id,
            valor
        ]
        of Object.entries(
            valores
        )
    ) {
        const elemento =
            document.getElementById(
                id
            );

        if (elemento) {
            elemento.textContent =
                formatearNumeroIntervencionAnalytics(
                    valor
                );
        }
    }
}


// ==========================================================
// CONCENTRACIÓN
// Frente → Atributo → Criterio
// ==========================================================

function obtenerIdIntervencionAnalytics(
    valor
) {
    if (
        valor === null ||
        valor === undefined ||
        valor === ''
    ) {
        return null;
    }

    return String(valor);
}


function crearItemConcentracionIntervencionAnalytics(
    item,
    seleccionado
) {
    const boton =
        document.createElement(
            'button'
        );

    boton.type =
        'button';

    boton.className =
        'analytics-intervention-concentration-item';


    if (
        seleccionado
    ) {
        boton.classList.add(
            'is-selected'
        );
    }


    boton.innerHTML = `
        <span>
            ${item.nombre || 'Sin identificación'}
        </span>

        <strong>
            ${formatearNumeroIntervencionAnalytics(
                item.pda
            )} PDA
        </strong>
    `;

    return boton;
}


function renderizarCriteriosIntervencionAnalytics(
    atributoId
) {
    const contenedor =
        document.getElementById(
            'analyticsInterventionCriteria'
        );

    if (!contenedor) {
        return;
    }


    const criterios =
        analyticsInterventionData
            ?.concentracion
            ?.criterios || [];


    const filtrados =
        criterios.filter(
            item =>
                obtenerIdIntervencionAnalytics(
                    item.padreId
                ) ===
                obtenerIdIntervencionAnalytics(
                    atributoId
                )
        );


    if (
        filtrados.length === 0
    ) {
        contenedor.innerHTML = `
            <div class="
                analytics-intervention-empty
            ">
                Sin criterios asociados.
            </div>
        `;

        return;
    }


    contenedor.replaceChildren();


    filtrados.forEach(
        item => {

            const boton =
                crearItemConcentracionIntervencionAnalytics(
                    item,
                    false
                );

            contenedor.appendChild(
                boton
            );
        }
    );
}


function seleccionarAtributoIntervencionAnalytics(
    atributoId
) {
    analyticsInterventionAttributeSelectedId =
        obtenerIdIntervencionAnalytics(
            atributoId
        );


    renderizarAtributosIntervencionAnalytics(
        analyticsInterventionFrontSelectedId
    );


    renderizarCriteriosIntervencionAnalytics(
        analyticsInterventionAttributeSelectedId
    );
}


function renderizarAtributosIntervencionAnalytics(
    frenteId
) {
    const contenedor =
        document.getElementById(
            'analyticsInterventionAttributes'
        );

    if (!contenedor) {
        return;
    }


    const atributos =
        analyticsInterventionData
            ?.concentracion
            ?.atributos || [];


    const filtrados =
        atributos.filter(
            item =>
                obtenerIdIntervencionAnalytics(
                    item.padreId
                ) ===
                obtenerIdIntervencionAnalytics(
                    frenteId
                )
        );


    if (
        filtrados.length === 0
    ) {
        contenedor.innerHTML = `
            <div class="
                analytics-intervention-empty
            ">
                Sin atributos asociados.
            </div>
        `;

        return;
    }


    contenedor.replaceChildren();


    filtrados.forEach(
        item => {

            const id =
                obtenerIdIntervencionAnalytics(
                    item.id
                );

            const boton =
                crearItemConcentracionIntervencionAnalytics(
                    item,
                    id ===
                    analyticsInterventionAttributeSelectedId
                );


            boton.addEventListener(
                'click',
                () =>
                    seleccionarAtributoIntervencionAnalytics(
                        item.id
                    )
            );


            contenedor.appendChild(
                boton
            );
        }
    );
}


function seleccionarFrenteIntervencionAnalytics(
    frenteId
) {
    analyticsInterventionFrontSelectedId =
        obtenerIdIntervencionAnalytics(
            frenteId
        );

    analyticsInterventionAttributeSelectedId =
        null;


    renderizarFrentesIntervencionAnalytics();


    renderizarAtributosIntervencionAnalytics(
        analyticsInterventionFrontSelectedId
    );


    const criterios =
        document.getElementById(
            'analyticsInterventionCriteria'
        );

    if (criterios) {
        criterios.innerHTML = `
            <div class="
                analytics-intervention-empty
            ">
                Seleccione un atributo
            </div>
        `;
    }
}


function renderizarFrentesIntervencionAnalytics() {
    const contenedor =
        document.getElementById(
            'analyticsInterventionFronts'
        );

    if (!contenedor) {
        return;
    }


    const frentes =
        analyticsInterventionData
            ?.concentracion
            ?.frentes || [];


    if (
        frentes.length === 0
    ) {
        contenedor.innerHTML = `
            <div class="
                analytics-intervention-empty
            ">
                No existen intervenciones clasificadas.
            </div>
        `;

        return;
    }


    contenedor.replaceChildren();


    frentes.forEach(
        item => {

            const id =
                obtenerIdIntervencionAnalytics(
                    item.id
                );

            const boton =
                crearItemConcentracionIntervencionAnalytics(
                    item,
                    id ===
                    analyticsInterventionFrontSelectedId
                );


            boton.addEventListener(
                'click',
                () =>
                    seleccionarFrenteIntervencionAnalytics(
                        item.id
                    )
            );


            contenedor.appendChild(
                boton
            );
        }
    );
}


function renderizarConcentracionIntervencionAnalytics(
    data
) {
    analyticsInterventionData =
        data;

    analyticsInterventionFrontSelectedId =
        null;

    analyticsInterventionAttributeSelectedId =
        null;


    renderizarFrentesIntervencionAnalytics();


    const atributos =
        document.getElementById(
            'analyticsInterventionAttributes'
        );

    const criterios =
        document.getElementById(
            'analyticsInterventionCriteria'
        );


    if (atributos) {
        atributos.innerHTML = `
            <div class="
                analytics-intervention-empty
            ">
                Seleccione un frente
            </div>
        `;
    }


    if (criterios) {
        criterios.innerHTML = `
            <div class="
                analytics-intervention-empty
            ">
                Seleccione un atributo
            </div>
        `;
    }
}


// ==========================================================
// ESTADO GENERAL
// ==========================================================

function renderizarEstadoIntervencionAnalytics(
    texto
) {
    const elemento =
        document.getElementById(
            'analyticsInterventionStatusText'
        );

    if (elemento) {
        elemento.textContent =
            texto;
    }
}


// ==========================================================
// RENDER PRINCIPAL
// ==========================================================

function renderizarIntervencionAnalytics(
    data
) {
    analyticsInterventionData =
        data;


    renderizarResumenIntervencionAnalytics(
        data
    );

    renderizarLecturaIntervencionAnalytics(
        data
    );

    renderizarAccionesIntervencionAnalytics(
        data
    );

    renderizarEstadosIntervencionAnalytics(
        data
    );

    renderizarEfectividadIntervencionAnalytics(
        data
    );

    renderizarEvolucionIntervencionAnalytics(
        data
    );

    renderizarConcentracionIntervencionAnalytics(
        data
    );

    renderizarResolucionIntervencionAnalytics(
        data
    );


    renderizarEstadoIntervencionAnalytics(
        Number(
            data?.resumen
                ?.pdaGenerados || 0
        ) > 0
            ? 'Intervenciones analizadas'
            : 'Sin intervenciones'
    );
}


// ==========================================================
// ERROR
// ==========================================================

function renderizarErrorIntervencionAnalytics(
    error
) {
    console.error(
        '❌ Analytics intervención:',
        error
    );


    analyticsInterventionData =
        null;


    renderizarEstadoIntervencionAnalytics(
        'No se pudo cargar el análisis'
    );


    const lectura =
        document.getElementById(
            'analyticsInterventionInsightText'
        );

    if (lectura) {
        lectura.textContent =
            'No fue posible obtener la información de intervención y resultado.';
    }
}

async function cargarEvolucionLideresAnalytics(
    concentracion
) {
    const tbody =
        document.getElementById(
            'analyticsLeaderEvolutionBody'
        );

    const status =
        document.getElementById(
            'analyticsLeaderEvolutionStatus'
        );


    const lideres =
        Array.isArray(
            concentracion
                ?.operacion
                ?.lideres
        )
            ? concentracion
                .operacion
                .lideres
                .map(
                    item =>
                        item.lider
                )
                .filter(Boolean)
            : [];


    if (
        lideres.length === 0
    ) {
        if (status) {
            status.textContent =
                'Sin líderes';
        }

        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td
                        colspan="8"
                        class="analytics-leader-evolution-empty"
                    >
                        No existen líderes para
                        los filtros seleccionados.
                    </td>
                </tr>
            `;
        }

        return;
    }


    if (status) {
        status.textContent =
            `Analizando ${lideres.length} líderes...`;
    }


    try {
        const paramsBase =
            construirQueryAnalytics();


        /*
         * IMPORTANTE:
         *
         * Quitamos el líder global para poder
         * comparar todos los líderes del universo.
         */
        paramsBase.delete(
            'lider'
        );


        paramsBase.set(
            'granularidad',
            'month'
        );


        const resultados =
    await Promise.all(
        lideres.map(
            async lider => {
                const params =
                    new URLSearchParams(
                        paramsBase.toString()
                    );


                params.set(
                    'lider',
                    lider
                );


                const evolucion =
                    await solicitarAnalytics(
                        '/api/analytics/evolucion',
                        params
                    );


                return {
                    lider,
                    evolucion
                };
            }
        )
    );


// ======================================================
// RENDERIZAR MATRIZ MENSUAL POR LÍDER
// ======================================================

renderizarTablaEvolucionLideresAnalytics(
    resultados
);


if (status) {
    status.textContent =
        `${resultados.length} líderes comparados`;
}


    } catch (error) {

        console.error(
            '❌ Error cargando evolución por líder:',
            error
        );


        if (status) {
            status.textContent =
                'No disponible';
        }


        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td
                        colspan="8"
                        class="analytics-leader-evolution-empty"
                    >
                        No fue posible cargar
                        la comparación por líder.
                    </td>
                </tr>
            `;
        }
    }
}

function renderizarTablaEvolucionLideresAnalytics(
    resultados
) {
    const thead =
        document.getElementById(
            'analyticsLeaderEvolutionHead'
        );

    const tbody =
        document.getElementById(
            'analyticsLeaderEvolutionBody'
        );


    if (
        !thead ||
        !tbody
    ) {
        return;
    }


    const lista =
        Array.isArray(
            resultados
        )
            ? resultados
            : [];


    if (
        lista.length === 0
    ) {
        thead.innerHTML = `
            <tr>
                <th>
                    Líder
                </th>
            </tr>
        `;


        tbody.innerHTML = `
            <tr>
                <td
                    class="analytics-leader-evolution-empty"
                >
                    Sin información comparable.
                </td>
            </tr>
        `;

        return;
    }


    // ======================================================
    // 1. OBTENER TODOS LOS MESES
    // ======================================================

    const periodosSet =
        new Set();


    lista.forEach(
        resultado => {
            const serie =
                Array.isArray(
                    resultado
                        ?.evolucion
                        ?.serie
                )
                    ? resultado
                        .evolucion
                        .serie
                    : [];


            serie.forEach(
                punto => {
                    if (
                        punto?.periodo
                    ) {
                        periodosSet.add(
                            String(
                                punto.periodo
                            )
                        );
                    }
                }
            );
        }
    );


    const periodos =
        Array.from(
            periodosSet
        ).sort();


    // ======================================================
    // 2. CABECERA DINÁMICA
    // ======================================================

    thead.innerHTML = `
        <tr>

            <th
                class="
                    analytics-leader-name-column
                "
            >
                Líder
            </th>

            ${
                periodos
                    .map(
                        periodo => `
                            <th>
                                ${
                                    escapeHtml(
                                        formatearPeriodoAnalytics(
                                            periodo,
                                            'month'
                                        )
                                    )
                                }
                            </th>
                        `
                    )
                    .join('')
            }

            <th>
                Promedio período
            </th>

            <th>
                Mejor mes
            </th>

            <th>
                Peor mes
            </th>

            <th>
                Tendencia
            </th>

        </tr>
    `;


    // ======================================================
    // 3. CONSTRUIR FILAS POR LÍDER
    // ======================================================

    const filas =
        lista.map(
            resultado => {
                const serie =
                    Array.isArray(
                        resultado
                            ?.evolucion
                            ?.serie
                    )
                        ? resultado
                            .evolucion
                            .serie
                        : [];


                const mapa =
                    new Map(
                        serie.map(
                            punto => [
                                String(
                                    punto.periodo
                                ),
                                punto
                            ]
                        )
                    );


                const puntosValidos =
                    serie.filter(
                        punto =>
                            punto
                                ?.notaPromedio !=
                            null
                    );


                const promedioPeriodo =
                    puntosValidos.length > 0
                        ? puntosValidos
                            .reduce(
                                (
                                    suma,
                                    punto
                                ) =>
                                    suma +
                                    Number(
                                        punto
                                            .notaPromedio
                                    ),
                                0
                            ) /
                            puntosValidos.length
                        : null;


                const ordenados =
                    [...puntosValidos]
                        .sort(
                            (
                                a,
                                b
                            ) =>
                                Number(
                                    b
                                        .notaPromedio
                                ) -
                                Number(
                                    a
                                        .notaPromedio
                                )
                        );


                const mejor =
                    ordenados[0] ||
                    null;


                const peor =
                    ordenados.length > 0
                        ? ordenados[
                            ordenados.length -
                            1
                        ]
                        : null;


                let tendencia =
                    'Sin datos';


                if (
                    puntosValidos.length >=
                    2
                ) {
                    const primero =
                        puntosValidos[0];

                    const ultimo =
                        puntosValidos[
                            puntosValidos.length -
                            1
                        ];


                    const delta =
                        Number(
                            ultimo
                                .notaPromedio
                        ) -
                        Number(
                            primero
                                .notaPromedio
                        );


                    if (
                        delta > 0.5
                    ) {
                        tendencia =
                            'Mejora';
                    } else if (
                        delta < -0.5
                    ) {
                        tendencia =
                            'Deterioro';
                    } else {
                        tendencia =
                            'Estable';
                    }
                }


                return {
                    lider:
                        resultado.lider,

                    mapa,

                    promedioPeriodo,

                    mejor,

                    peor,

                    tendencia
                };
            }
        )
        .sort(
            (
                a,
                b
            ) =>
                Number(
                    b.promedioPeriodo ||
                    0
                ) -
                Number(
                    a.promedioPeriodo ||
                    0
                )
        );


    // ======================================================
    // 4. RENDERIZAR TABLA
    // ======================================================

    tbody.innerHTML = '';


    filas.forEach(
        item => {
            const fila =
                document.createElement(
                    'tr'
                );


            const celdasMes =
                periodos
                    .map(
                        periodo => {
                            const punto =
                                item.mapa.get(
                                    periodo
                                );


                            if (
                                !punto ||
                                punto
                                    .notaPromedio ==
                                null
                            ) {
                                return `
                                    <td
                                        class="
                                            analytics-leader-month-cell
                                            is-empty
                                        "
                                    >
                                        —
                                    </td>
                                `;
                            }


                            return `
                                <td
                                    class="
                                        analytics-leader-month-cell
                                    "
                                >
                                    <strong>
                                        ${
                                            Number(
                                                punto
                                                    .notaPromedio
                                            ).toFixed(
                                                2
                                            )
                                        }
                                    </strong>

                                    <span>
                                        ${
                                            Number(
                                                punto
                                                    .evaluaciones ||
                                                0
                                            ).toLocaleString(
                                                'es-PE'
                                            )
                                        } aud.
                                    </span>
                                </td>
                            `;
                        }
                    )
                    .join('');


            let claseTendencia =
                'is-stable';


            if (
                item.tendencia ===
                'Mejora'
            ) {
                claseTendencia =
                    'is-improving';
            } else if (
                item.tendencia ===
                'Deterioro'
            ) {
                claseTendencia =
                    'is-deteriorating';
            }


            fila.innerHTML = `

                <td
                    class="
                        analytics-leader-name-column
                    "
                >
                    <strong>
                        ${
                            escapeHtml(
                                item.lider
                            )
                        }
                    </strong>
                </td>


                ${celdasMes}


                <td
                    class="
                        analytics-leader-summary-cell
                    "
                >
                    ${
                        item.promedioPeriodo ==
                        null
                            ? '—'
                            : Number(
                                item
                                    .promedioPeriodo
                            ).toFixed(2)
                    }
                </td>


                <td
                    class="
                        analytics-leader-summary-cell
                    "
                >
                    ${
                        item.mejor
                            ? `
                                <strong>
                                    ${
                                        Number(
                                            item
                                                .mejor
                                                .notaPromedio
                                        ).toFixed(
                                            2
                                        )
                                    }
                                </strong>

                                <span>
                                    ${
                                        escapeHtml(
                                            formatearPeriodoAnalytics(
                                                item
                                                    .mejor
                                                    .periodo,
                                                'month'
                                            )
                                        )
                                    }
                                </span>
                            `
                            : '—'
                    }
                </td>


                <td
                    class="
                        analytics-leader-summary-cell
                    "
                >
                    ${
                        item.peor
                            ? `
                                <strong>
                                    ${
                                        Number(
                                            item
                                                .peor
                                                .notaPromedio
                                        ).toFixed(
                                            2
                                        )
                                    }
                                </strong>

                                <span>
                                    ${
                                        escapeHtml(
                                            formatearPeriodoAnalytics(
                                                item
                                                    .peor
                                                    .periodo,
                                                'month'
                                            )
                                        )
                                    }
                                </span>
                            `
                            : '—'
                    }
                </td>


                <td>
                    <span
                        class="
                            analytics-leader-trend
                            ${claseTendencia}
                        "
                    >
                        ${
                            item.tendencia ===
                            'Mejora'
                                ? '↑ Mejora'
                                : item.tendencia ===
                                  'Deterioro'
                                    ? '↓ Deterioro'
                                    : item.tendencia ===
                                      'Estable'
                                        ? '→ Estable'
                                        : '— Sin datos'
                        }
                    </span>
                </td>
            `;


            tbody.appendChild(
                fila
            );
        }
    );
}



function renderizarEvolucionAnalytics(
    evolucion
) {
    limpiarEvolucionAnalytics();

    renderizarEstadoEvolucionAnalytics(
        evolucion
    );

    renderizarKpisEvolucionAnalytics(
        evolucion
    );

    renderizarAdvertenciaMuestraAnalytics(
        evolucion
    );

    renderizarLecturaEjecutivaEvolucionAnalytics(
        evolucion
    );

    renderizarMovimientoDesempenoAnalytics(
        evolucion
    );

    crearGraficoEvolucionAnalytics(
        evolucion
    );

    crearGraficoMixCalidadAnalytics(
        evolucion
    );


    // ======================================================
    // TABLA EVOLUTIVA POTENCIADA
    // ======================================================

    renderizarTablaEvolucionIndicadoresAnalytics(
        evolucion
    );
}


function renderizarErrorEvolucionAnalytics(
    error
) {
    limpiarEvolucionAnalytics();

    const titulo =
        document.getElementById(
            'analyticsEvolutionInsightTitle'
        );

    const texto =
        document.getElementById(
            'analyticsEvolutionInsightText'
        );

    const estado =
        document.getElementById(
            'analyticsEvolutionStatus'
        );

    const estadoTexto =
        document.getElementById(
            'analyticsEvolutionStatusText'
        );

    if (titulo) {
        titulo.textContent =
            'No fue posible cargar la evolución';
    }

    if (texto) {
        texto.textContent =
            error?.message ||
            'Ocurrió un error obteniendo la serie temporal.';
    }

    if (estado) {
        estado.classList.remove(
            'is-improving',
            'is-stable',
            'is-deteriorating'
        );

        estado.classList.add(
            'is-insufficient'
        );
    }

    if (estadoTexto) {
        estadoTexto.textContent =
            'Evolución no disponible';
    }
}

// ======================================================
// MECA ANALYTICS 2.0
// BLOQUE 03 - ¿DÓNDE ESTÁ EL PROBLEMA?
// Resumen del diagnóstico
// ======================================================

function limpiarResumenDiagnosticoAnalytics() {
    const ids = [
        'analyticsDiagnosticFailures',
        'analyticsDiagnosticCriteria',
        'analyticsDiagnosticParetoCriteria',
        'analyticsDiagnosticParetoShare'
    ];

    for (const id of ids) {
        const elemento =
            document.getElementById(id);

        if (elemento) {
            elemento.textContent = '—';
        }
    }


    const advertencia =
        document.getElementById(
            'analyticsDiagnosticWarning'
        );

    if (advertencia) {
        advertencia.hidden = true;
    }
}


function renderizarResumenDiagnosticoAnalytics(
    diagnostico
) {
    limpiarResumenDiagnosticoAnalytics();


    const resumen =
        diagnostico?.resumen || {};

    const calidadDatos =
        diagnostico?.calidadDatos || {};


    const totalIncumplimientos =
        Number(
            resumen.totalIncumplimientos || 0
        );

    const criteriosConFalla =
        Number(
            resumen.criteriosConFalla || 0
        );

    const criteriosPrincipales =
        Number(
            resumen.criteriosNucleoPareto80 || 0
        );

    const concentracion =
        Number(
            resumen.participacionNucleoPareto80Pct || 0
        );


    const elementoIncumplimientos =
        document.getElementById(
            'analyticsDiagnosticFailures'
        );

    const elementoCriterios =
        document.getElementById(
            'analyticsDiagnosticCriteria'
        );

    const elementoPrincipales =
        document.getElementById(
            'analyticsDiagnosticParetoCriteria'
        );

    const elementoConcentracion =
        document.getElementById(
            'analyticsDiagnosticParetoShare'
        );


    if (elementoIncumplimientos) {
        elementoIncumplimientos.textContent =
            totalIncumplimientos
                .toLocaleString('es-PE');
    }


    if (elementoCriterios) {
        elementoCriterios.textContent =
            criteriosConFalla
                .toLocaleString('es-PE');
    }


    if (elementoPrincipales) {
        elementoPrincipales.textContent =
            criteriosPrincipales
                .toLocaleString('es-PE');
    }


    if (elementoConcentracion) {
        elementoConcentracion.textContent =
            `${concentracion.toFixed(2)}%`;
    }


    /*
     * Algunas evaluaciones históricas
     * no almacenaban el mismo nivel de
     * detalle disponible actualmente.
     *
     * Esta condición debe mostrarse al
     * usuario sin exponer terminología
     * técnica del modelo de datos.
     */
    const historialParcial =
        calidadDatos.historialParcial === true;

    const advertencia =
        document.getElementById(
            'analyticsDiagnosticWarning'
        );

    const textoAdvertencia =
        document.getElementById(
            'analyticsDiagnosticWarningText'
        );


    if (
        historialParcial &&
        advertencia
    ) {
        advertencia.hidden = false;


        if (textoAdvertencia) {
            textoAdvertencia.textContent =
                'Parte de las auditorías antiguas no cuenta ' +
                'con el mismo nivel de detalle que las ' +
                'evaluaciones actuales. Algunos resultados ' +
                'de diagnóstico deben interpretarse como ' +
                'referenciales.';
        }
    }
}

function crearGraficoParetoDiagnosticoAnalytics(
    diagnostico
) {
    const canvas =
        document.getElementById(
            'analyticsDiagnosticParetoChart'
        );

    if (!canvas) return;

    if (
        typeof Chart === 'undefined'
    ) {
        return;
    }


    /*
     * Destruimos la instancia anterior
     * antes de volver a dibujar.
     *
     * Esto es necesario porque Analytics
     * se actualiza cada vez que cambian
     * los filtros.
     */
    if (
        analyticsDiagnosticParetoChart &&
        typeof analyticsDiagnosticParetoChart.destroy ===
        'function'
    ) {
        analyticsDiagnosticParetoChart.destroy();

        analyticsDiagnosticParetoChart =
            null;
    }


    const nucleo =
        Array.isArray(
            diagnostico?.pareto?.nucleo
        )
            ? diagnostico.pareto.nucleo
            : [];


    if (nucleo.length === 0) {
        return;
    }


    /*
     * Conservamos el nombre completo
     * para los tooltips.
     *
     * Para el eje visual utilizamos una
     * versión corta para evitar saturar
     * el gráfico.
     */
    const nombresCompletos =
        nucleo.map(
            item =>
                item?.criterio ||
                'Criterio sin nombre'
        );


    const labels =
        nombresCompletos.map(
            nombre => {
                const texto =
                    String(nombre);

                return texto.length > 28
                    ? `${texto.substring(
                        0,
                        28
                    )}…`
                    : texto;
            }
        );


    const incumplimientos =
        nucleo.map(
            item =>
                Number(
                    item?.incumplimientos ||
                    0
                )
        );


    const acumulado =
        nucleo.map(
            item =>
                Number(
                    item?.paretoAcumuladoPct ||
                    0
                )
        );


    const contexto =
        canvas.getContext('2d');


    analyticsDiagnosticParetoChart =
        new Chart(
            contexto,
            {
                data: {
                    labels,

                    datasets: [
                        {
                            type: 'bar',

                            label:
                                'Incumplimientos',

                            data:
                                incumplimientos,

                            yAxisID:
                                'yIncumplimientos',

                            borderWidth: 0,

                            /*
                             * Las etiquetas visibles del gráfico
                             * se reservan para la línea Pareto.
                             */
                            datalabels: {
                                display: false
                            }
                        },

                        {
                            type: 'line',

                            label:
                                'Acumulado',

                            data:
                                acumulado,

                            yAxisID:
                                'yPareto',

                            tension: 0.2,

                            pointRadius: 4,

                            pointHoverRadius: 6,

                            /*
                             * Etiquetas del acumulado Pareto.
                             *
                             * Se presentan como porcentaje entero
                             * para facilitar la lectura ejecutiva.
                             */
                            datalabels: {
                                display: true,

                                formatter:
                                    value =>
                                        `${Math.round(
                                            Number(value || 0)
                                        )}%`,

                                anchor: 'end',

                                align: 'top',

                                offset: 5,

                                clamp: true,

                                color: '#ffffff',

                                backgroundColor:
                                    'rgba(22, 97, 140, 0.92)',

                                borderRadius: 5,

                                padding: {
                                    top: 3,
                                    bottom: 3,
                                    left: 6,
                                    right: 6
                                },

                                font: {
                                    size: 10,
                                    weight: '700'
                                }
                            }
                        }
                    ]
                },


                options: {
                    responsive: true,

                    maintainAspectRatio:
                        false,


                    interaction: {
                        mode: 'index',

                        intersect: false
                    },


                    plugins: {
                        legend: {
                            display: true,

                            position: 'top'
                        },


                        tooltip: {
                            callbacks: {
                                title:
                                    items => {
                                        const indice =
                                            items?.[0]
                                                ?.dataIndex;

                                        return (
                                            nombresCompletos[
                                            indice
                                            ] ||
                                            'Criterio'
                                        );
                                    },


                                label:
                                    contextoTooltip => {
                                        const indice =
                                            contextoTooltip
                                                .dataIndex;

                                        const item =
                                            nucleo[
                                            indice
                                            ] || {};

                                        if (
                                            contextoTooltip
                                                .dataset
                                                .yAxisID ===
                                            'yPareto'
                                        ) {
                                            return (
                                                'Acumulado: ' +
                                                Math.round(
                                                    Number(
                                                        item
                                                            .paretoAcumuladoPct ||
                                                        0
                                                    )
                                                ) +
                                                '%'
                                            );
                                        }


                                        return (
                                            'Incumplimientos: ' +
                                            Number(
                                                item
                                                    .incumplimientos ||
                                                0
                                            )
                                                .toLocaleString(
                                                    'es-PE'
                                                )
                                        );
                                    },


                                afterBody:
                                    items => {
                                        const indice =
                                            items?.[0]
                                                ?.dataIndex;

                                        const item =
                                            nucleo[
                                            indice
                                            ];

                                        if (!item) {
                                            return [];
                                        }


                                        return [
                                            `Frente: ${item.frente ||
                                            'Sin información'
                                            }`,
                                            `Atributo: ${item.atributo ||
                                            'Sin información'
                                            }`,
                                            `Participación: ${Number(
                                                item
                                                    .participacionFallasPct ||
                                                0
                                            )
                                                .toFixed(
                                                    2
                                                )
                                            }%`
                                        ];
                                    }
                            }
                        }
                    },


                    scales: {
                        x: {
                            ticks: {
                                maxRotation: 45,

                                minRotation: 0
                            },

                            grid: {
                                display: false
                            }
                        },


                        yIncumplimientos: {
                            position: 'left',

                            beginAtZero: true,

                            title: {
                                display: true,

                                text:
                                    'Incumplimientos'
                            },

                            ticks: {
                                precision: 0
                            }
                        },


                        yPareto: {
                            position: 'right',

                            beginAtZero: true,

                            min: 0,

                            max: 100,

                            title: {
                                display: true,

                                text:
                                    '% acumulado'
                            },

                            ticks: {
                                stepSize: 20,

                                callback:
                                    value =>
                                        `${Math.round(value)}%`
                            },

                            grid: {
                                drawOnChartArea:
                                    false
                            }
                        }
                    }
                }
            }
        );
}

function obtenerCriteriosJerarquiaAnalytics() {
    let criterios =
        obtenerCriteriosDiagnosticoAnalytics();

    if (analyticsFrenteSeleccionado) {
        criterios =
            criterios.filter(
                item =>
                    item.frente ===
                    analyticsFrenteSeleccionado
            );
    }

    if (analyticsAtributoSeleccionado) {
        criterios =
            criterios.filter(
                item =>
                    item.atributo ===
                    analyticsAtributoSeleccionado
            );
    }

    return criterios;
}


function ordenarJerarquiaDiagnosticoAnalytics(
    criterios
) {
    const {
        campo,
        direccion
    } = analyticsDiagnosticHierarchySort;

    const factor =
        direccion === 'asc'
            ? 1
            : -1;

    const obtenerValor =
        item => {
            switch (campo) {
                case 'frente':
                    return String(
                        item.frente || ''
                    );

                case 'atributo':
                    return String(
                        item.atributo || ''
                    );

                case 'criterio':
                    return String(
                        item.criterio || ''
                    );

                case 'incumplimientos':
                    return Number(
                        item.incumplimientos || 0
                    );

                case 'participacion':
                    return Number(
                        item.participacionFallasPct || 0
                    );

                case 'pareto':
                    return Number(
                        item.paretoAcumuladoPct || 0
                    );

                default:
                    return '';
            }
        };

    return [...criterios].sort(
        (a, b) => {
            const valorA =
                obtenerValor(a);

            const valorB =
                obtenerValor(b);

            if (
                typeof valorA === 'number' &&
                typeof valorB === 'number'
            ) {
                return (
                    valorA - valorB
                ) * factor;
            }

            return String(valorA)
                .localeCompare(
                    String(valorB),
                    'es',
                    {
                        sensitivity: 'base'
                    }
                ) * factor;
        }
    );
}


function renderizarJerarquiaDiagnosticoAnalytics() {
    const tbody =
        document.getElementById(
            'analyticsDiagnosticHierarchyBody'
        );

    const count =
        document.getElementById(
            'analyticsDiagnosticHierarchyCount'
        );

    const contexto =
        document.getElementById(
            'analyticsDiagnosticHierarchyContext'
        );

    if (!tbody) {
        return;
    }

    const criterios =
        ordenarJerarquiaDiagnosticoAnalytics(
            obtenerCriteriosJerarquiaAnalytics()
        );

    if (count) {
        count.textContent =
            `${criterios.length.toLocaleString(
                'es-PE'
            )} registros`;
    }

    if (contexto) {
        if (analyticsAtributoSeleccionado) {
            contexto.textContent =
                `Criterios de ${analyticsAtributoSeleccionado} dentro de ${analyticsFrenteSeleccionado}`;
        } else if (
            analyticsFrenteSeleccionado
        ) {
            contexto.textContent =
                `Atributos y criterios del frente ${analyticsFrenteSeleccionado}`;
        } else {
            contexto.textContent =
                'Vista general de frentes, atributos y criterios con incumplimientos';
        }
    }

    tbody.innerHTML = '';

    if (criterios.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td
                    colspan="6"
                    class="analytics-diagnostic-hierarchy-empty"
                >
                    No se encontraron criterios
                    para el contexto seleccionado.
                </td>
            </tr>
        `;

        return;
    }

    criterios.forEach(
        item => {
            const fila =
                document.createElement(
                    'tr'
                );

            fila.tabIndex = 0;

            fila.title =
                'Ver evaluaciones relacionadas';

            const abrirHallazgo =
                () => {
                    if (
                        !item.frente ||
                        !item.atributo ||
                        !item.criterio
                    ) {
                        return;
                    }

                    cargarDetalleHallazgoAnalytics({
                        frente:
                            item.frente,

                        atributo:
                            item.atributo,

                        criterio:
                            item.criterio
                    });

                    document
                        .getElementById(
                            'analyticsFindingDetailSection'
                        )
                        ?.scrollIntoView({
                            behavior:
                                'smooth',

                            block:
                                'start'
                        });
                };

            fila.addEventListener(
                'click',
                abrirHallazgo
            );

            fila.addEventListener(
                'keydown',
                event => {
                    if (
                        event.key === 'Enter' ||
                        event.key === ' '
                    ) {
                        event.preventDefault();

                        abrirHallazgo();
                    }
                }
            );

            fila.innerHTML = `
                <td>
                    ${
                        escapeHtml(
                            obtenerTextoFindingAnalytics(
                                item.frente
                            )
                        )
                    }
                </td>

                <td>
                    ${
                        escapeHtml(
                            obtenerTextoFindingAnalytics(
                                item.atributo
                            )
                        )
                    }
                </td>

                <td>
                    ${
                        escapeHtml(
                            obtenerTextoFindingAnalytics(
                                item.criterio
                            )
                        )
                    }
                </td>

                <td class="analytics-diagnostic-hierarchy-number">
                    ${
                        Number(
                            item.incumplimientos || 0
                        ).toLocaleString(
                            'es-PE'
                        )
                    }
                </td>

                <td class="analytics-diagnostic-hierarchy-number">
                    ${
                        Math.round(
                            Number(
                                item.participacionFallasPct || 0
                            )
                        )
                    }%
                </td>

                <td class="analytics-diagnostic-hierarchy-number">
                    ${
                        Math.round(
                            Number(
                                item.paretoAcumuladoPct || 0
                            )
                        )
                    }%
                </td>
            `;

            tbody.appendChild(
                fila
            );
        }
    );
}


function inicializarJerarquiaDiagnosticoAnalytics() {
    if (
        analyticsDiagnosticHierarchyInitialized
    ) {
        return;
    }

    const botones =
        document.querySelectorAll(
            '.analytics-diagnostic-hierarchy-sort'
        );

    botones.forEach(
        boton => {
            boton.addEventListener(
                'click',
                event => {
                    event.stopPropagation();

                    const campo =
                        boton.dataset.sort;

                    if (
                        analyticsDiagnosticHierarchySort
                            .campo ===
                        campo
                    ) {
                        analyticsDiagnosticHierarchySort
                            .direccion =
                            analyticsDiagnosticHierarchySort
                                .direccion ===
                            'asc'
                                ? 'desc'
                                : 'asc';
                    } else {
                        analyticsDiagnosticHierarchySort =
                            {
                                campo,
                                direccion:
                                    'asc'
                            };
                    }

                    renderizarJerarquiaDiagnosticoAnalytics();
                }
            );
        }
    );

    analyticsDiagnosticHierarchyInitialized =
        true;
}

// ======================================================
// MECA ANALYTICS 2.0
// BLOQUE 03 - DRILL-DOWN DIAGNÓSTICO
// Frente → Atributo → Criterio → Pareto
// ======================================================

function obtenerCriteriosDiagnosticoAnalytics() {
    return Array.isArray(
        analyticsDiagnosticoActual
            ?.pareto
            ?.criterios
    )
        ? analyticsDiagnosticoActual
            .pareto
            .criterios
        : [];
}


function agruparCriteriosDiagnosticoAnalytics(
    criterios,
    campo
) {
    const mapa = new Map();


    for (const criterio of criterios) {
        const nombre =
            criterio?.[campo] ||
            'Sin información';

        const incumplimientos =
            Number(
                criterio?.incumplimientos ||
                0
            );


        if (!mapa.has(nombre)) {
            mapa.set(
                nombre,
                {
                    nombre,
                    incumplimientos: 0
                }
            );
        }


        mapa.get(nombre).incumplimientos +=
            incumplimientos;
    }


    const total =
        Array.from(
            mapa.values()
        )
            .reduce(
                (
                    acumulado,
                    item
                ) =>
                    acumulado +
                    item.incumplimientos,
                0
            );


    return Array.from(
        mapa.values()
    )
        .map(
            item => ({
                ...item,

                participacionPct:
                    total > 0
                        ? (
                            item.incumplimientos /
                            total
                        ) * 100
                        : 0
            })
        )
        .sort(
            (a, b) =>
                b.incumplimientos -
                a.incumplimientos
        );
}


function construirParetoContextualAnalytics(
    criterios
) {
    const ordenados =
        [...criterios]
            .sort(
                (a, b) =>
                    Number(
                        b?.incumplimientos ||
                        0
                    ) -
                    Number(
                        a?.incumplimientos ||
                        0
                    )
            );


    const total =
        ordenados.reduce(
            (
                acumulado,
                item
            ) =>
                acumulado +
                Number(
                    item?.incumplimientos ||
                    0
                ),
            0
        );


    let acumuladoPct = 0;


    const criteriosPareto =
        ordenados.map(
            item => {
                const incumplimientos =
                    Number(
                        item?.incumplimientos ||
                        0
                    );

                const participacion =
                    total > 0
                        ? (
                            incumplimientos /
                            total
                        ) * 100
                        : 0;


                acumuladoPct +=
                    participacion;


                return {
                    ...item,

                    participacionFallasPct:
                        participacion,

                    paretoAcumuladoPct:
                        Math.min(
                            acumuladoPct,
                            100
                        )
                };
            }
        );


    const nucleo = [];


    for (
        const criterio
        of criteriosPareto
    ) {
        nucleo.push(
            criterio
        );


        if (
            criterio
                .paretoAcumuladoPct >=
            80
        ) {
            break;
        }
    }


    return {
        umbralPct: 80,
        criterios:
            criteriosPareto,
        nucleo
    };
}


function obtenerCriteriosContextualesAnalytics() {
    let criterios =
        obtenerCriteriosDiagnosticoAnalytics();


    if (
        analyticsFrenteSeleccionado
    ) {
        criterios =
            criterios.filter(
                item =>
                    item?.frente ===
                    analyticsFrenteSeleccionado
            );
    }


    if (
        analyticsAtributoSeleccionado
    ) {
        criterios =
            criterios.filter(
                item =>
                    item?.atributo ===
                    analyticsAtributoSeleccionado
            );
    }


    return criterios;
}


function crearTarjetaDiagnosticoAnalytics({
    nombre,
    incumplimientos,
    participacionPct,
    seleccionado,
    onClick
}) {
    const tarjeta =
        document.createElement(
            'div'
        );


    tarjeta.className =
        'analytics-diagnostic-item';


    if (seleccionado) {
        tarjeta.classList.add(
            'is-selected'
        );
    }


    tarjeta.setAttribute(
        'role',
        'button'
    );

    tarjeta.tabIndex = 0;


    const cabecera =
        document.createElement(
            'div'
        );

    cabecera.className =
        'analytics-diagnostic-item-header';


    const nombreElemento =
        document.createElement(
            'div'
        );

    nombreElemento.className =
        'analytics-diagnostic-item-name';

    nombreElemento.textContent =
        nombre;


    const valor =
        document.createElement(
            'div'
        );

    valor.className =
        'analytics-diagnostic-item-value';

    valor.textContent =
        `${Math.round(
            participacionPct
        )}%`;


    cabecera.appendChild(
        nombreElemento
    );

    cabecera.appendChild(
        valor
    );


    const progreso =
        document.createElement(
            'div'
        );

    progreso.className =
        'analytics-diagnostic-progress';


    const barra =
        document.createElement(
            'div'
        );

    barra.className =
        'analytics-diagnostic-progress-bar';

    barra.style.width =
        `${Math.min(
            participacionPct,
            100
        )}%`;


    progreso.appendChild(
        barra
    );


    const detalle =
        document.createElement(
            'div'
        );

    detalle.className =
        'analytics-diagnostic-item-detail';

    detalle.textContent =
        `${Number(
            incumplimientos
        ).toLocaleString(
            'es-PE'
        )} incumplimientos`;


    tarjeta.appendChild(
        cabecera
    );

    tarjeta.appendChild(
        progreso
    );

    tarjeta.appendChild(
        detalle
    );


    tarjeta.addEventListener(
        'click',
        onClick
    );


    tarjeta.addEventListener(
        'keydown',
        event => {
            if (
                event.key ===
                'Enter' ||
                event.key ===
                ' '
            ) {
                event.preventDefault();

                onClick();
            }
        }
    );


    return tarjeta;
}


function renderizarFrentesDiagnosticoAnalytics() {
    const contenedor =
        document.getElementById(
            'analyticsDiagnosticFronts'
        );

    if (!contenedor) return;


    contenedor.innerHTML =
        '';


    const criterios =
        obtenerCriteriosDiagnosticoAnalytics();


    const frentes =
        agruparCriteriosDiagnosticoAnalytics(
            criterios,
            'frente'
        );


    if (
        frentes.length === 0
    ) {
        contenedor.innerHTML =
            '<div class="analytics-diagnostic-empty">' +
            'No se encontraron frentes con incumplimientos.' +
            '</div>';

        return;
    }


    for (const frente of frentes) {
        const tarjeta =
            crearTarjetaDiagnosticoAnalytics({
                nombre:
                    frente.nombre,

                incumplimientos:
                    frente.incumplimientos,

                participacionPct:
                    frente.participacionPct,

                seleccionado:
                    analyticsFrenteSeleccionado ===
                    frente.nombre,

                onClick:
                    () => {
                        analyticsFrenteSeleccionado =
                            frente.nombre;

                        /*
                         * Al cambiar de frente,
                         * cualquier atributo anterior
                         * deja de ser válido.
                         */
                        analyticsAtributoSeleccionado =
                            null;

                        actualizarDrilldownDiagnosticoAnalytics();
                    }
            });


        contenedor.appendChild(
            tarjeta
        );
    }
}


function renderizarAtributosDiagnosticoAnalytics() {
    const contenedor =
        document.getElementById(
            'analyticsDiagnosticAttributes'
        );

    const contexto =
        document.getElementById(
            'analyticsDiagnosticAttributesContext'
        );


    if (!contenedor) return;


    contenedor.innerHTML =
        '';


    if (
        !analyticsFrenteSeleccionado
    ) {
        if (contexto) {
            contexto.textContent =
                'Seleccione un frente para analizar sus atributos.';
        }


        contenedor.innerHTML =
            '<div class="analytics-diagnostic-empty">' +
            'Seleccione un frente.' +
            '</div>';

        return;
    }


    if (contexto) {
        contexto.textContent =
            `Participación de los atributos dentro de ${analyticsFrenteSeleccionado}.`;
    }


    const criterios =
        obtenerCriteriosDiagnosticoAnalytics()
            .filter(
                item =>
                    item?.frente ===
                    analyticsFrenteSeleccionado
            );


    const atributos =
        agruparCriteriosDiagnosticoAnalytics(
            criterios,
            'atributo'
        );


    for (
        const atributo
        of atributos
    ) {
        const tarjeta =
            crearTarjetaDiagnosticoAnalytics({
                nombre:
                    atributo.nombre,

                incumplimientos:
                    atributo.incumplimientos,

                participacionPct:
                    atributo.participacionPct,

                seleccionado:
                    analyticsAtributoSeleccionado ===
                    atributo.nombre,

                onClick:
                    () => {
                        analyticsAtributoSeleccionado =
                            atributo.nombre;

                        actualizarDrilldownDiagnosticoAnalytics();
                    }
            });


        contenedor.appendChild(
            tarjeta
        );
    }
}


function renderizarCriteriosDiagnosticoAnalytics() {
    const contenedor =
        document.getElementById(
            'analyticsDiagnosticCriteriaList'
        );

    const contexto =
        document.getElementById(
            'analyticsDiagnosticCriteriaContext'
        );


    if (!contenedor) {
        return;
    }


    contenedor.innerHTML = '';


    /*
     * ==================================================
     * NIVEL 1
     * TODAVÍA NO HAY FRENTE
     * ==================================================
     */
    if (
        !analyticsFrenteSeleccionado
    ) {
        if (contexto) {
            contexto.textContent =
                'Seleccione un frente y luego un atributo para identificar sus criterios.';
        }

        contenedor.innerHTML = `
            <div
                class="analytics-diagnostic-empty"
            >
                Seleccione un frente.
            </div>
        `;

        return;
    }


    /*
     * ==================================================
     * NIVEL 2
     * HAY FRENTE, PERO TODAVÍA NO HAY ATRIBUTO
     * ==================================================
     *
     * No debemos mostrar criterios mezclados
     * de distintos atributos.
     * ==================================================
     */
    if (
        !analyticsAtributoSeleccionado
    ) {
        if (contexto) {
            contexto.textContent =
                `Seleccione un atributo dentro de ${analyticsFrenteSeleccionado} para identificar sus criterios.`;
        }

        contenedor.innerHTML = `
            <div
                class="analytics-diagnostic-empty"
            >
                Seleccione un atributo.
            </div>
        `;

        return;
    }


    /*
     * ==================================================
     * NIVEL 3
     * FRENTE + ATRIBUTO YA DEFINIDOS
     * ==================================================
     */
    const criterios =
        obtenerCriteriosContextualesAnalytics();


    const total =
        criterios.reduce(
            (
                acumulado,
                item
            ) =>
                acumulado +
                Number(
                    item?.incumplimientos ||
                    0
                ),
            0
        );


    if (contexto) {
        contexto.textContent =
            `Criterios de ${analyticsAtributoSeleccionado} dentro de ${analyticsFrenteSeleccionado}.`;
    }


    const ordenados =
        [...criterios]
            .sort(
                (a, b) =>
                    Number(
                        b?.incumplimientos ||
                        0
                    ) -
                    Number(
                        a?.incumplimientos ||
                        0
                    )
            );


    if (
        ordenados.length === 0
    ) {
        contenedor.innerHTML = `
            <div
                class="analytics-diagnostic-empty"
            >
                No hay criterios con incumplimientos
                para el atributo seleccionado.
            </div>
        `;

        return;
    }


    for (
        const criterio
        of ordenados
    ) {
        const nombreCriterio =
            criterio?.criterio ||
            criterio?.submotivo ||
            null;


        if (!nombreCriterio) {
            console.warn(
                '⚠️ Criterio sin identificador:',
                criterio
            );

            continue;
        }


        const incumplimientos =
            Number(
                criterio
                    ?.incumplimientos ||
                0
            );


        const participacion =
            total > 0
                ? (
                    incumplimientos /
                    total
                ) * 100
                : 0;


        /*
         * ==================================================
         * CONTRATO CANÓNICO BLOQUE 3 → BLOQUE 5
         * ==================================================
         *
         * No dependemos de que el objeto criterio
         * repita frente y atributo.
         *
         * La jerarquía activa es la fuente de verdad.
         * ==================================================
         */
        const hallazgo = {
            frente:
                String(
                    analyticsFrenteSeleccionado
                ),

            atributo:
                String(
                    analyticsAtributoSeleccionado
                ),

            criterio:
                String(
                    nombreCriterio
                )
        };


        const tarjeta =
            crearTarjetaDiagnosticoAnalytics({
                nombre:
                    nombreCriterio,

                incumplimientos,

                participacionPct:
                    participacion,

                seleccionado:
                    false,

                onClick:
                    () => {
                        console.log(
                            '🔎 A7 HALLAZGO SELECCIONADO:',
                            hallazgo
                        );

                        cargarDetalleHallazgoAnalytics(
                            hallazgo
                        );
                    }
            });


        contenedor.appendChild(
            tarjeta
        );
    }
}


function actualizarBreadcrumbDiagnosticoAnalytics() {
    const todos =
        document.getElementById(
            'analyticsDiagnosticBreadcrumbAll'
        );

    const frente =
        document.getElementById(
            'analyticsDiagnosticBreadcrumbFront'
        );

    const separadorFrente =
        document.getElementById(
            'analyticsDiagnosticBreadcrumbFrontSeparator'
        );

    const atributo =
        document.getElementById(
            'analyticsDiagnosticBreadcrumbAttribute'
        );

    const separadorAtributo =
        document.getElementById(
            'analyticsDiagnosticBreadcrumbAttributeSeparator'
        );


    if (todos) {
        todos.classList.toggle(
            'is-active',
            !analyticsFrenteSeleccionado
        );

        todos.onclick =
            () => {
                analyticsFrenteSeleccionado =
                    null;

                analyticsAtributoSeleccionado =
                    null;

                actualizarDrilldownDiagnosticoAnalytics();
            };
    }


    if (
        frente &&
        separadorFrente
    ) {
        const visible =
            Boolean(
                analyticsFrenteSeleccionado
            );


        frente.hidden =
            !visible;

        separadorFrente.hidden =
            !visible;


        if (visible) {
            frente.textContent =
                analyticsFrenteSeleccionado;

            frente.classList.toggle(
                'is-active',
                !analyticsAtributoSeleccionado
            );


            frente.onclick =
                () => {
                    analyticsAtributoSeleccionado =
                        null;

                    actualizarDrilldownDiagnosticoAnalytics();
                };
        }
    }


    if (
        atributo &&
        separadorAtributo
    ) {
        const visible =
            Boolean(
                analyticsAtributoSeleccionado
            );


        atributo.hidden =
            !visible;

        separadorAtributo.hidden =
            !visible;


        if (visible) {
            atributo.textContent =
                analyticsAtributoSeleccionado;

            atributo.classList.add(
                'is-active'
            );
        }
    }
}


function renderizarParetoContextualDiagnosticoAnalytics() {
    const criterios =
        obtenerCriteriosContextualesAnalytics();


    const pareto =
        construirParetoContextualAnalytics(
            criterios
        );


    const diagnosticoContextual = {
        pareto
    };


    crearGraficoParetoDiagnosticoAnalytics(
        diagnosticoContextual
    );


    const contexto =
        document.getElementById(
            'analyticsDiagnosticParetoContext'
        );


    if (!contexto) return;


    if (
        analyticsAtributoSeleccionado
    ) {
        contexto.textContent =
            `Pareto de los criterios de ${analyticsAtributoSeleccionado} dentro de ${analyticsFrenteSeleccionado}.`;

        return;
    }


    if (
        analyticsFrenteSeleccionado
    ) {
        contexto.textContent =
            `Pareto de los criterios correspondientes al frente ${analyticsFrenteSeleccionado}.`;

        return;
    }


    contexto.textContent =
        'Pareto general de los criterios que concentran aproximadamente el 80% de los incumplimientos.';
}


function renderizarLecturaContextualDiagnosticoAnalytics() {
    const titulo =
        document.getElementById(
            'analyticsDiagnosticInsightTitle'
        );

    const texto =
        document.getElementById(
            'analyticsDiagnosticInsightText'
        );


    if (!titulo || !texto) {
        return;
    }


    const criterios =
        obtenerCriteriosContextualesAnalytics();


    const total =
        criterios.reduce(
            (
                acumulado,
                item
            ) =>
                acumulado +
                Number(
                    item?.incumplimientos ||
                    0
                ),
            0
        );


    if (
        analyticsAtributoSeleccionado
    ) {
        const principal =
            [...criterios]
                .sort(
                    (a, b) =>
                        Number(
                            b?.incumplimientos ||
                            0
                        ) -
                        Number(
                            a?.incumplimientos ||
                            0
                        )
                )[0];


        titulo.textContent =
            `${analyticsFrenteSeleccionado} › ${analyticsAtributoSeleccionado}`;


        if (principal) {
            const porcentaje =
                total > 0
                    ? (
                        Number(
                            principal
                                .incumplimientos ||
                            0
                        ) /
                        total
                    ) * 100
                    : 0;


            texto.textContent =
                `El criterio "${principal.criterio}" es el principal foco dentro de este atributo y concentra ${Math.round(porcentaje)}% de sus incumplimientos.`;
        }

        return;
    }


    if (
        analyticsFrenteSeleccionado
    ) {
        const atributos =
            agruparCriteriosDiagnosticoAnalytics(
                criterios,
                'atributo'
            );


        const principal =
            atributos[0];


        titulo.textContent =
            `Diagnóstico de ${analyticsFrenteSeleccionado}`;


        if (principal) {
            texto.textContent =
                `Dentro de ${analyticsFrenteSeleccionado}, el atributo "${principal.nombre}" concentra la mayor cantidad de incumplimientos con ${Math.round(principal.participacionPct)}%.`;
        }

        return;
    }


    const frentes =
        agruparCriteriosDiagnosticoAnalytics(
            criterios,
            'frente'
        );


    const principal =
        frentes[0];


    titulo.textContent =
        'Concentración general de incumplimientos';


    if (principal) {
        texto.textContent =
            `${principal.nombre} es el frente con mayor concentración y representa ${Math.round(principal.participacionPct)}% de los incumplimientos detectados. Selecciónelo para profundizar en sus atributos.`;
    }
}


function actualizarDrilldownDiagnosticoAnalytics() {
    renderizarFrentesDiagnosticoAnalytics();

    renderizarAtributosDiagnosticoAnalytics();

    renderizarCriteriosDiagnosticoAnalytics();

    actualizarBreadcrumbDiagnosticoAnalytics();

    renderizarParetoContextualDiagnosticoAnalytics();

    renderizarLecturaContextualDiagnosticoAnalytics();

    renderizarJerarquiaDiagnosticoAnalytics();
}


function inicializarDrilldownDiagnosticoAnalytics(
    diagnostico
) {
    analyticsDiagnosticoActual =
        diagnostico;

    analyticsFrenteSeleccionado =
        null;

    analyticsAtributoSeleccionado =
        null;


    actualizarDrilldownDiagnosticoAnalytics();
}

function renderizarLecturaDiagnosticoAnalytics(
    diagnostico
) {
    const resumen =
        diagnostico?.resumen || {};

    const frente =
        resumen.frenteMayorConcentracion || null;

    const atributo =
        resumen.atributoMayorConcentracion || null;


    const titulo =
        document.getElementById(
            'analyticsDiagnosticInsightTitle'
        );

    const texto =
        document.getElementById(
            'analyticsDiagnosticInsightText'
        );


    if (!titulo || !texto) return;


    if (
        !frente ||
        Number(frente.incumplimientos || 0) <= 0
    ) {
        titulo.textContent =
            'Sin concentración relevante';

        texto.textContent =
            'No se identificaron incumplimientos suficientes ' +
            'para determinar dónde se concentra el problema.';

        return;
    }


    const nombreFrente =
        frente.frente ||
        'frente sin identificar';

    const porcentajeFrente =
        Number(
            frente.participacionFallasPct || 0
        );


    const nombreAtributo =
        atributo?.atributo ||
        null;

    const porcentajeAtributo =
        Number(
            atributo?.participacionFallasPct || 0
        );


    titulo.textContent =
        `La mayor concentración está en ${nombreFrente}`;


    if (nombreAtributo) {
        texto.textContent =
            `${nombreFrente} concentra ` +
            `${porcentajeFrente.toFixed(2)}% de los ` +
            `incumplimientos. Dentro del diagnóstico general, ` +
            `el atributo "${nombreAtributo}" representa ` +
            `${porcentajeAtributo.toFixed(2)}% del total.`;
    } else {
        texto.textContent =
            `${nombreFrente} concentra ` +
            `${porcentajeFrente.toFixed(2)}% de los ` +
            `incumplimientos de la población seleccionada.`;
    }
}

function limpiarFiltrosAnalytics() {
    const ids = [
        'analyticsFechaDesde',
        'analyticsFechaHasta',
        'analyticsQuiebre',
        'analyticsCampana',
        'analyticsMatriz',
        'analyticsLider',
        'analyticsGestor',
        'analyticsAuditor'
    ];

    for (const id of ids) {
        const elemento =
            document.getElementById(id);

        if (elemento) {
            elemento.value = '';
        }
    }

    cargarAnalyticsDashboard();
}


function inicializarAnalyticsDashboard() {
    if (analyticsInicializado) {
        cargarAnalyticsDashboard();
        return;
    }

    const dashboard =
        document.getElementById(
            'analyticsDashboard'
        );

    if (!dashboard) {
        return;
    }

    // ======================================================
    // BLOQUE 05 - BUSCADOR
    // ======================================================
    inicializarBusquedaFindingAnalytics();
    inicializarOrdenamientoFindingAnalytics();
    inicializarNavegacionFindingAnalytics();
    inicializarJerarquiaDiagnosticoAnalytics();

    const aplicar =
        document.getElementById(
            'analyticsAplicarFiltros'
        );

    const limpiar =
        document.getElementById(
            'analyticsLimpiarFiltros'
        );

    const filtroQuiebre =
        document.getElementById(
            'analyticsQuiebre'
        );

    const filtroCampana =
        document.getElementById(
            'analyticsCampana'
        );

    const filtroMatriz =
        document.getElementById(
            'analyticsMatriz'
        );

    const filtroLider =
        document.getElementById(
            'analyticsLider'
        );

    const filtroGestor =
        document.getElementById(
            'analyticsGestor'
        );

    aplicar?.addEventListener(
        'click',
        cargarAnalyticsDashboard
    );

    limpiar?.addEventListener(
        'click',
        limpiarFiltrosAnalytics
    );

    filtroQuiebre?.addEventListener(
        'change',
        () =>
            actualizarFiltrosEncadenadosAnalytics(
                'analyticsQuiebre'
            )
    );

    filtroCampana?.addEventListener(
        'change',
        () =>
            actualizarFiltrosEncadenadosAnalytics(
                'analyticsCampana'
            )
    );

    filtroMatriz?.addEventListener(
        'change',
        () =>
            actualizarFiltrosEncadenadosAnalytics(
                'analyticsMatriz'
            )
    );

    filtroLider?.addEventListener(
        'change',
        () =>
            actualizarFiltrosEncadenadosAnalytics(
                'analyticsLider'
            )
    );

    filtroGestor?.addEventListener(
        'change',
        () =>
            actualizarFiltrosEncadenadosAnalytics(
                'analyticsGestor'
            )
    );

    analyticsInicializado = true;

    cargarAnalyticsDashboard();
}

function formatearNumeroConcentracionAnalytics(valor) {
    return new Intl.NumberFormat(
        'es-PE'
    ).format(
        Number(valor) || 0
    );
}


function formatearPorcentajeConcentracionAnalytics(valor) {
    return `${(
        Number(valor) || 0
    ).toFixed(1)}%`;
}


function renderizarKpisConcentracionAnalytics(
    concentracion
) {
    const lideres =
        concentracion?.operacion?.lideres || [];

    const auditores =
        concentracion?.auditoria?.auditores || [];

    const gestores =
        lideres.reduce(
            (total, lider) =>
                total +
                (
                    Array.isArray(lider.gestores)
                        ? lider.gestores.length
                        : 0
                ),
            0
        );

    const mayorConcentracion =
        lideres.length > 0
            ? Number(
                lideres[0].participacionPct
            ) || 0
            : 0;

    const lideresElemento =
        document.getElementById(
            'analyticsConcentrationLeaders'
        );

    const gestoresElemento =
        document.getElementById(
            'analyticsConcentrationManagers'
        );

    const auditoresElemento =
        document.getElementById(
            'analyticsConcentrationAuditors'
        );

    const concentracionElemento =
        document.getElementById(
            'analyticsConcentrationTopShare'
        );

    if (lideresElemento) {
        lideresElemento.textContent =
            lideres.length;
    }

    if (gestoresElemento) {
        gestoresElemento.textContent =
            gestores;
    }

    if (auditoresElemento) {
        auditoresElemento.textContent =
            auditores.length;
    }

    if (concentracionElemento) {
        concentracionElemento.textContent =
            formatearPorcentajeConcentracionAnalytics(
                mayorConcentracion
            );
    }
}


function crearItemConcentracionAnalytics({
    nombre,
    evaluaciones,
    incumplimientos,
    participacionPct,
    seleccionable = false,
    seleccionado = false,
    onClick = null
}) {
    const item =
        document.createElement('div');

    item.className =
        'analytics-concentration-item';

    if (seleccionable) {
        item.classList.add(
            'is-selectable'
        );
    }

    if (seleccionado) {
        item.classList.add(
            'is-selected'
        );
    }

    const porcentaje =
        Math.max(
            0,
            Math.min(
                100,
                Number(participacionPct) || 0
            )
        );

    item.innerHTML = `
        <div
            class="
                analytics-concentration-item-header
            "
        >
            <span
                class="
                    analytics-concentration-item-name
                "
                title="${String(nombre)}"
            >
                ${String(nombre)}
            </span>

            <strong
                class="
                    analytics-concentration-item-value
                "
            >
                ${formatearNumeroConcentracionAnalytics(
        incumplimientos
    )
        }
            </strong>
        </div>

        <div
            class="
                analytics-concentration-item-meta
            "
        >
            <span>
                ${formatearNumeroConcentracionAnalytics(
            evaluaciones
        )
        }
                evaluaciones
            </span>

            <span>
                ${formatearPorcentajeConcentracionAnalytics(
            participacionPct
        )
        }
                de concentración
            </span>
        </div>

        <div
            class="
                analytics-concentration-progress
            "
        >
            <div
                class="
                    analytics-concentration-progress-bar
                "
                style="width: ${porcentaje}%"
            ></div>
        </div>
    `;

    if (
        seleccionable &&
        typeof onClick === 'function'
    ) {
        item.addEventListener(
            'click',
            onClick
        );
    }

    return item;
}


function renderizarGestoresConcentracionAnalytics(
    lider
) {
    const contenedor =
        document.getElementById(
            'analyticsConcentrationManagersList'
        );

    const contexto =
        document.getElementById(
            'analyticsConcentrationManagersContext'
        );

    if (!contenedor) {
        return;
    }

    contenedor.innerHTML = '';

    if (
        !lider ||
        !Array.isArray(lider.gestores) ||
        lider.gestores.length === 0
    ) {
        if (contexto) {
            contexto.textContent =
                'Seleccione un líder para ver sus gestores.';
        }

        contenedor.innerHTML = `
            <div
                class="
                    analytics-concentration-empty
                "
            >
                Seleccione un líder.
            </div>
        `;

        return;
    }

    if (contexto) {
        contexto.textContent =
            `Gestores asociados a ${lider.lider}.`;
    }

    lider.gestores.forEach(
        gestor => {
            contenedor.appendChild(
                crearItemConcentracionAnalytics({
                    nombre:
                        gestor.gestor ||
                        'Sin gestor',

                    evaluaciones:
                        gestor.evaluaciones,

                    incumplimientos:
                        gestor.incumplimientos,

                    participacionPct:
                        gestor.participacionPct
                })
            );
        }
    );
}


function renderizarLideresConcentracionAnalytics(
    concentracion
) {
    const contenedor =
        document.getElementById(
            'analyticsConcentrationLeadersList'
        );

    if (!contenedor) {
        return;
    }

    const lideres =
        concentracion?.operacion?.lideres || [];

    contenedor.innerHTML = '';

    if (lideres.length === 0) {
        contenedor.innerHTML = `
            <div
                class="
                    analytics-concentration-empty
                "
            >
                No hay información de líderes
                para los filtros seleccionados.
            </div>
        `;

        renderizarGestoresConcentracionAnalytics(
            null
        );

        return;
    }

    lideres.forEach(
        lider => {
            const seleccionado =
                analyticsLiderConcentracionSeleccionado ===
                lider.lider;

            const item =
                crearItemConcentracionAnalytics({
                    nombre:
                        lider.lider ||
                        'Sin líder',

                    evaluaciones:
                        lider.evaluaciones,

                    incumplimientos:
                        lider.incumplimientos,

                    participacionPct:
                        lider.participacionPct,

                    seleccionable: true,

                    seleccionado,

                    onClick: () => {
                        analyticsLiderConcentracionSeleccionado =
                            lider.lider;

                        renderizarLideresConcentracionAnalytics(
                            concentracion
                        );

                        renderizarGestoresConcentracionAnalytics(
                            lider
                        );

                        renderizarLecturaConcentracionAnalytics(
                            concentracion,
                            lider
                        );
                    }
                });

            contenedor.appendChild(item);
        }
    );
}


function renderizarAuditoresConcentracionAnalytics(
    concentracion
) {
    const contenedor =
        document.getElementById(
            'analyticsConcentrationAuditorsList'
        );

    if (!contenedor) {
        return;
    }

    const auditores =
        concentracion?.auditoria?.auditores || [];

    contenedor.innerHTML = '';

    if (auditores.length === 0) {
        contenedor.innerHTML = `
            <div
                class="
                    analytics-concentration-empty
                "
            >
                No hay información de auditoría
                para los filtros seleccionados.
            </div>
        `;

        return;
    }

    auditores.forEach(
        auditor => {
            const item =
                document.createElement('div');

            item.className =
                'analytics-concentration-item';

            const porcentaje =
                Math.max(
                    0,
                    Math.min(
                        100,
                        Number(
                            auditor.participacionPct
                        ) || 0
                    )
                );

            item.innerHTML = `
                <div
                    class="
                        analytics-concentration-item-header
                    "
                >
                    <span
                        class="
                            analytics-concentration-item-name
                        "
                        title="${String(
                auditor.auditor ||
                'Sin auditor'
            )
                }"
                    >
                        ${String(
                    auditor.auditor ||
                    'Sin auditor'
                )
                }
                    </span>

                    <strong
                        class="
                            analytics-concentration-item-value
                        "
                    >
                        ${formatearNumeroConcentracionAnalytics(
                    auditor.incumplimientos
                )
                }
                    </strong>
                </div>

                <div
                    class="
                        analytics-concentration-item-meta
                    "
                >
                    <span>
                        ${formatearNumeroConcentracionAnalytics(
                    auditor.evaluaciones
                )
                }
                        evaluaciones auditadas
                    </span>

                    <span>
                        ${formatearPorcentajeConcentracionAnalytics(
                    auditor.participacionPct
                )
                }
                        de los hallazgos detectados
                    </span>
                </div>

                <div
                    class="
                        analytics-concentration-progress
                    "
                >
                    <div
                        class="
                            analytics-concentration-progress-bar
                        "
                        style="
                            width: ${porcentaje}%;
                        "
                    ></div>
                </div>
            `;

            contenedor.appendChild(item);
        }
    );
}


function renderizarLecturaConcentracionAnalytics(
    concentracion,
    liderSeleccionado = null
) {
    const elemento =
        document.getElementById(
            'analyticsConcentrationInsightText'
        );

    if (!elemento) {
        return;
    }

    const lideres =
        concentracion?.operacion?.lideres || [];

    if (lideres.length === 0) {
        elemento.textContent =
            'No existe información suficiente para analizar la concentración.';
        return;
    }

    if (liderSeleccionado) {
        const gestores =
            liderSeleccionado.gestores || [];

        const gestorPrincipal =
            gestores[0];

        if (gestorPrincipal) {
            elemento.textContent =
                `${liderSeleccionado.lider} concentra ` +
                `${formatearPorcentajeConcentracionAnalytics(
                    liderSeleccionado.participacionPct
                )} de los incumplimientos. ` +
                `Dentro de este equipo, ` +
                `${gestorPrincipal.gestor} presenta la mayor concentración.`;

            return;
        }
    }

    const principal =
        lideres[0];

    elemento.textContent =
        `${principal.lider} presenta la mayor concentración operativa, ` +
        `con ${formatearPorcentajeConcentracionAnalytics(
            principal.participacionPct
        )} de los incumplimientos identificados. ` +
        `Seleccione un líder para profundizar en sus gestores.`;
}


function inicializarConcentracionAnalytics(
    concentracion
) {
    analyticsLiderConcentracionSeleccionado =
        null;

    renderizarKpisConcentracionAnalytics(
        concentracion
    );

    renderizarLideresConcentracionAnalytics(
        concentracion
    );

    renderizarGestoresConcentracionAnalytics(
        null
    );

    renderizarAuditoresConcentracionAnalytics(
        concentracion
    );

    renderizarLecturaConcentracionAnalytics(
        concentracion
    );

    const status =
        document.getElementById(
            'analyticsConcentrationStatusText'
        );

    if (status) {
        status.textContent =
            'Análisis actualizado';
    }
}

// ==========================================================
// MECA ANALYTICS 2.0
// BLOQUE 05 - DETALLE DE HALLAZGO
// ==========================================================



function formatearFechaFindingAnalytics(valor) {
    if (!valor) {
        return '—';
    }

    const fecha =
        new Date(valor);

    if (
        Number.isNaN(
            fecha.getTime()
        )
    ) {
        return String(valor);
    }

    return new Intl.DateTimeFormat(
        'es-PE',
        {
            day: '2-digit',
            month: '2-digit',
            year: '2-digit'
        }
    ).format(fecha);
}


function obtenerTextoFindingAnalytics(valor) {
    if (
        valor === null ||
        valor === undefined ||
        String(valor).trim() === ''
    ) {
        return '—';
    }

    return String(valor);
}


function limpiarDetalleEvaluacionFindingAnalytics() {
    analyticsFindingEvaluationSelectedId =
        null;

    const empty =
        document.getElementById(
            'analyticsFindingDetailEmpty'
        );

    const content =
        document.getElementById(
            'analyticsFindingDetailContent'
        );

    const subtitle =
        document.getElementById(
            'analyticsFindingDetailSubtitle'
        );

    if (empty) {
        empty.hidden = false;
    }

    if (content) {
        content.hidden = true;
    }

    if (subtitle) {
        subtitle.textContent =
            'Seleccione una evaluación de la tabla superior';
    }
    const evidenciaBody =
        document.getElementById(
            'analyticsFindingEvidenceBody'
        );

    const evidenciaCount =
        document.getElementById(
            'analyticsFindingEvidenceCount'
        );

    const evidenciaSubtitle =
        document.getElementById(
            'analyticsFindingEvidenceSubtitle'
        );


    if (evidenciaBody) {
        evidenciaBody.innerHTML = `
            <tr>
                <td
                    colspan="4"
                    class="analytics-finding-table-empty"
                >
                    Seleccione una evaluación.
                </td>
            </tr>
        `;
    }


    if (evidenciaCount) {
        evidenciaCount.textContent =
            '—';
    }


    if (evidenciaSubtitle) {
        evidenciaSubtitle.textContent =
            'Criterios incumplidos detectados en esta auditoría';
    }
}

async function cargarEvidenciasEvaluacionFindingAnalytics(
    evaluacion
) {
    const body =
        document.getElementById(
            'analyticsFindingEvidenceBody'
        );

    const count =
        document.getElementById(
            'analyticsFindingEvidenceCount'
        );

    const subtitle =
        document.getElementById(
            'analyticsFindingEvidenceSubtitle'
        );


    if (
        !evaluacion ||
        !evaluacion.id
    ) {
        return;
    }


    if (body) {
        body.innerHTML = `
            <tr>
                <td
                    colspan="4"
                    class="analytics-finding-table-empty"
                >
                    Consultando criterios de la evaluación...
                </td>
            </tr>
        `;
    }


    if (count) {
        count.textContent = '—';
    }


    try {
        const token =
            localStorage.getItem(
                'meca_token'
            );


        const response =
            await fetch(
                `/api/evaluaciones/${encodeURIComponent(
                    evaluacion.id
                )}/detalles`,
                {
                    headers: {
                        Authorization:
                            `Bearer ${token}`
                    }
                }
            );


        if (!response.ok) {
            throw new Error(
                `HTTP ${response.status}`
            );
        }


        const detalles =
            await response.json();


        const lista =
            Array.isArray(detalles)
                ? detalles
                : [];


        /*
         * Solo son incumplimientos reales
         * los valor_respuesta = 0.
         */
        const incumplimientos =
            lista.filter(
                detalle =>
                    String(
                        detalle
                            ?.valor_respuesta ??
                        ''
                    )
                        .trim()
                        .toUpperCase() ===
                    '0'
            );


        if (count) {
            count.textContent =
                incumplimientos.length
                    .toLocaleString(
                        'es-PE'
                    );
        }


        if (subtitle) {
            if (
                incumplimientos.length ===
                0
            ) {
                subtitle.textContent =
                    'Esta auditoría no registra criterios incumplidos.';
            } else {
                subtitle.textContent =
                    `${incumplimientos.length.toLocaleString(
                        'es-PE'
                    )} criterio` +
                    (
                        incumplimientos.length ===
                        1
                            ? ''
                            : 's'
                    ) +
                    ' incumplido' +
                    (
                        incumplimientos.length ===
                        1
                            ? ''
                            : 's'
                    ) +
                    ' en esta auditoría.';
            }
        }


        if (!body) {
            return;
        }


        body.innerHTML = '';


        if (
            incumplimientos.length === 0
        ) {
            body.innerHTML = `
                <tr>
                    <td
                        colspan="4"
                        class="analytics-finding-table-empty"
                    >
                        No se registraron incumplimientos
                        en esta evaluación.
                    </td>
                </tr>
            `;

            return;
        }


        /*
         * Hallazgo que puede venir
         * seleccionado desde Bloque 3.
         */
        const hallazgoActual =
            analyticsFindingDetailData
                ?.hallazgo ||
            null;


        incumplimientos.forEach(
            detalle => {
                const frente =
                    detalle?.bloque ??
                    null;

                const atributo =
                    detalle?.atributo ??
                    null;

                const criterio =
                    detalle?.submotivo ??
                    null;


                const esOrigen =
                    Boolean(
                        hallazgoActual &&
                        hallazgoActual.frente ===
                            frente &&
                        hallazgoActual.atributo ===
                            atributo &&
                        hallazgoActual.criterio ===
                            criterio
                    );


                const fila =
                    document.createElement(
                        'tr'
                    );


                if (esOrigen) {
                    fila.classList.add(
                        'is-origin-finding'
                    );
                }


                fila.innerHTML = `
                    <td>
                        ${
                            escapeHtml(
                                obtenerTextoFindingAnalytics(
                                    frente
                                )
                            )
                        }
                    </td>

                    <td>
                        ${
                            escapeHtml(
                                obtenerTextoFindingAnalytics(
                                    atributo
                                )
                            )
                        }
                    </td>

                    <td>
                        <div
                            class="
                                analytics-finding-evidence-criterion
                            "
                        >
                            ${
                                escapeHtml(
                                    obtenerTextoFindingAnalytics(
                                        criterio
                                    )
                                )
                            }

                            ${
                                esOrigen
                                    ? `
                                        <span
                                            class="
                                                analytics-finding-origin-badge
                                            "
                                        >
                                            Hallazgo seleccionado
                                        </span>
                                    `
                                    : ''
                            }
                        </div>
                    </td>

                    <td>
                        <span
                            class="
                                analytics-finding-result-badge
                                is-failure
                            "
                        >
                            Incumple
                        </span>
                    </td>
                `;


                body.appendChild(
                    fila
                );
            }
        );


    } catch (error) {
        console.error(
            '❌ Error cargando evidencias de evaluación:',
            error
        );


        if (count) {
            count.textContent =
                '—';
        }


        if (subtitle) {
            subtitle.textContent =
                'No fue posible consultar los criterios de esta auditoría.';
        }


        if (body) {
            body.innerHTML = `
                <tr>
                    <td
                        colspan="4"
                        class="analytics-finding-table-empty"
                    >
                        No fue posible cargar
                        el detalle de criterios.
                    </td>
                </tr>
            `;
        }
    }
}

function renderizarDetalleEvaluacionFindingAnalytics(
    evaluacion
) {
    if (!evaluacion) {
        limpiarDetalleEvaluacionFindingAnalytics();
        return;
    }

    analyticsFindingEvaluationSelectedId =
        evaluacion.id;


    const empty =
        document.getElementById(
            'analyticsFindingDetailEmpty'
        );

    const content =
        document.getElementById(
            'analyticsFindingDetailContent'
        );

    const subtitle =
        document.getElementById(
            'analyticsFindingDetailSubtitle'
        );


    if (empty) {
        empty.hidden = true;
    }

    if (content) {
        content.hidden = false;
    }

    if (subtitle) {
        subtitle.textContent =
            `Evaluación ${evaluacion.id}`;
    }


    const asignar =
        (
            id,
            valor
        ) => {
            const elemento =
                document.getElementById(id);

            if (elemento) {
                elemento.textContent =
                    obtenerTextoFindingAnalytics(
                        valor
                    );
            }
        };


    // ======================================================
    // EVALUACIÓN
    // ======================================================

    asignar(
        'analyticsFindingDetailEvaluationId',
        evaluacion.id
    );

    asignar(
        'analyticsFindingDetailDate',
        formatearFechaFindingAnalytics(
            evaluacion.fecha
        )
    );

    asignar(
        'analyticsFindingDetailTicket',
        evaluacion.ticketPsi
    );

    asignar(
        'analyticsFindingDetailManager',
        evaluacion.gestor
    );

    asignar(
        'analyticsFindingDetailLeader',
        evaluacion.lider
    );

    asignar(
        'analyticsFindingDetailAuditor',
        evaluacion.auditor
    );

    asignar(
        'analyticsFindingDetailScore',
        evaluacion.notaFinal == null
            ? '—'
            : Number(
                evaluacion.notaFinal
            ).toFixed(2)
    );

    asignar(
        'analyticsFindingDetailRange',
        evaluacion.rango
    );

    asignar(
        'analyticsFindingDetailErrors',
        Number(
            evaluacion.errores || 0
        ).toLocaleString(
            'es-PE'
        )
    );

    // ======================================================
    // CONTEXTO DE LLAMADA
    // ======================================================

    const contexto =
        evaluacion.contextoLlamada || {};

    const tieneContexto =
        contexto.asignacionId != null;

    const contextoStatus =
        document.getElementById(
            'analyticsFindingContextStatus'
        );


    if (contextoStatus) {
        contextoStatus.classList.remove(
            'is-available',
            'is-unavailable'
        );

        if (tieneContexto) {
            contextoStatus.classList.add(
                'is-available'
            );

            contextoStatus.textContent =
                'Contexto operativo disponible para esta evaluación.';
        } else {
            contextoStatus.classList.add(
                'is-unavailable'
            );

            contextoStatus.textContent =
                'Esta evaluación histórica no tiene contexto de asignación disponible.';
        }
    }


    asignar(
        'analyticsFindingDetailListeningStatus',
        contexto.estado
    );

    asignar(
        'analyticsFindingDetailAssignmentDate',
        formatearFechaFindingAnalytics(
            contexto.fechaAsignacion
        )
    );

    asignar(
        'analyticsFindingDetailManagementDate',
        formatearFechaFindingAnalytics(
            contexto.fechaGestion
        )
    );

    asignar(
        'analyticsFindingDetailRequest',
        contexto.peticion
    );

    asignar(
        'analyticsFindingDetailCallReason',
        contexto.motivoCall
    );

    asignar(
        'analyticsFindingDetailOperationalReason',
        contexto.motivos
    );

    asignar(
        'analyticsFindingDetailOperationalSubreason',
        contexto.submotivos
    );


    // ======================================================
    // EVIDENCIA REAL DE LA EVALUACIÓN
    // ======================================================

    cargarEvidenciasEvaluacionFindingAnalytics(
        evaluacion
    );

    // ======================================================
    // FILA SELECCIONADA
    // ======================================================

    document
        .querySelectorAll(
            '#analyticsFindingTableBody tr[data-evaluation-id]'
        )
        .forEach(
            fila => {
                fila.classList.toggle(
                    'is-selected',
                    String(
                        fila.dataset.evaluationId
                    ) ===
                    String(
                        evaluacion.id
                    )
                );
            }
        );
}

function ordenarEvaluacionesFindingAnalytics(
    evaluaciones
) {
    const campo =
        analyticsFindingSort.campo;

    const direccion =
        analyticsFindingSort.direccion ===
        'asc'
            ? 1
            : -1;


    const obtenerValor =
        evaluacion => {
            switch (campo) {
                case 'fecha':
                    return evaluacion.fecha
                        ? new Date(
                            evaluacion.fecha
                        ).getTime()
                        : 0;

                case 'ticket':
                    return String(
                        evaluacion.ticketPsi || ''
                    ).toLowerCase();

                case 'gestor':
                    return String(
                        evaluacion.gestor || ''
                    ).toLowerCase();

                case 'lider':
                    return String(
                        evaluacion.lider || ''
                    ).toLowerCase();

                case 'auditor':
                    return String(
                        evaluacion.auditor || ''
                    ).toLowerCase();

                case 'nota':
                    return Number(
                        evaluacion.notaFinal || 0
                    );

                case 'rango':
                    return String(
                        evaluacion.rango || ''
                    ).toLowerCase();

                case 'errores':
                    return Number(
                        evaluacion.errores || 0
                    );

                default:
                    return '';
            }
        };


    return [...evaluaciones]
        .sort(
            (a, b) => {
                const valorA =
                    obtenerValor(a);

                const valorB =
                    obtenerValor(b);


                if (
                    typeof valorA === 'number' &&
                    typeof valorB === 'number'
                ) {
                    return (
                        valorA - valorB
                    ) * direccion;
                }


                return String(valorA)
                    .localeCompare(
                        String(valorB),
                        'es',
                        {
                            sensitivity:
                                'base'
                        }
                    ) * direccion;
            }
        );
}

function renderizarTablaFindingAnalytics(
    data
) {
    const tbody =
        document.getElementById(
            'analyticsFindingTableBody'
        );

    const count =
        document.getElementById(
            'analyticsFindingTableCount'
        );

    const total =
        document.getElementById(
            'analyticsFindingEvaluationsTotal'
        );


    if (!tbody) {
        return;
    }


    const evaluacionesBase =
        Array.isArray(
            data?.evaluaciones
        )
            ? data.evaluaciones
            : [];


    const evaluaciones =
        ordenarEvaluacionesFindingAnalytics(
            evaluacionesBase
        );

    if (count) {
        count.textContent =
            `${evaluaciones.length} registros`;
    }

    if (total) {
        total.textContent =
            new Intl.NumberFormat(
                'es-PE'
            ).format(
                evaluaciones.length
            );
    }


    if (evaluaciones.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td
                    colspan="8"
                    class="analytics-finding-table-empty"
                >
                    No se encontraron evaluaciones
                    relacionadas con este criterio.
                </td>
            </tr>
        `;

        limpiarDetalleEvaluacionFindingAnalytics();

        return;
    }


    tbody.innerHTML = '';


    evaluaciones.forEach(
        evaluacion => {
            const fila =
                document.createElement(
                    'tr'
                );

            fila.dataset.evaluationId =
                String(
                    evaluacion.id
                );


            const nota =
                evaluacion.notaFinal == null
                    ? '—'
                    : Number(
                        evaluacion.notaFinal
                    ).toFixed(2);


            fila.innerHTML = `
                <td>
                    ${escapeHtml(
                formatearFechaFindingAnalytics(
                    evaluacion.fecha
                )
            )
                }
                </td>

                <td>
                    ${escapeHtml(
                    obtenerTextoFindingAnalytics(
                        evaluacion.ticketPsi
                    )
                )
                }
                </td>

                <td>
                    ${escapeHtml(
                    obtenerTextoFindingAnalytics(
                        evaluacion.gestor
                    )
                )
                }
                </td>

                <td>
                    ${escapeHtml(
                    obtenerTextoFindingAnalytics(
                        evaluacion.lider
                    )
                )
                }
                </td>

                <td>
                    ${escapeHtml(
                    obtenerTextoFindingAnalytics(
                        evaluacion.auditor
                    )
                )
                }
                </td>

                <td
                    class="
                        analytics-finding-number-column
                    "
                >
                    ${escapeHtml(
                    nota
                )
                }
                </td>

                <td>
                    ${
                        escapeHtml(
                            obtenerTextoFindingAnalytics(
                                evaluacion.rango
                            )
                        )
                    }
                </td>

                <td
                    class="
                        analytics-finding-number-column
                    "
                >
                    ${
                        Number(
                            evaluacion.errores || 0
                        ).toLocaleString(
                            'es-PE'
                        )
                    }
                </td>
                `;


            fila.addEventListener(
                'click',
                () => {
                    renderizarDetalleEvaluacionFindingAnalytics(
                        evaluacion
                    );
                }
            );


            tbody.appendChild(
                fila
            );
        }
    );


    limpiarDetalleEvaluacionFindingAnalytics();
}

function inicializarOrdenamientoFindingAnalytics() {
    const botones =
        document.querySelectorAll(
            '.analytics-finding-sort'
        );


    botones.forEach(
        boton => {
            if (
                boton.dataset
                    .sortInitialized ===
                'true'
            ) {
                return;
            }


            boton.dataset
                .sortInitialized =
                'true';


            boton.addEventListener(
                'click',
                () => {
                    const campo =
                        boton.dataset.sort;


                    if (
                        analyticsFindingSort
                            .campo ===
                        campo
                    ) {
                        analyticsFindingSort
                            .direccion =
                            analyticsFindingSort
                                .direccion ===
                            'asc'
                                ? 'desc'
                                : 'asc';
                    } else {
                        analyticsFindingSort =
                            {
                                campo,
                                direccion:
                                    'asc'
                            };
                    }


                    filtrarEvaluacionesFindingAnalytics();


                    document
                        .querySelectorAll(
                            '.analytics-finding-sort'
                        )
                        .forEach(
                            item => {
                                const icono =
                                    item.querySelector(
                                        '.analytics-finding-sort-icon'
                                    );

                                if (!icono) {
                                    return;
                                }


                                if (
                                    item.dataset.sort ===
                                    analyticsFindingSort
                                        .campo
                                ) {
                                    icono.textContent =
                                        analyticsFindingSort
                                            .direccion ===
                                        'asc'
                                            ? '↑'
                                            : '↓';
                                } else {
                                    icono.textContent =
                                        '↕';
                                }
                            }
                        );
                }
            );
        }
    );
}

async function cargarDetalleHallazgoAnalytics(
    criterio = null
) {
    const status =
        document.getElementById(
            'analyticsFindingDetailStatusText'
        );

    const path =
        document.getElementById(
            'analyticsFindingSelectedPath'
        );

    const tbody =
        document.getElementById(
            'analyticsFindingTableBody'
        );

    const total =
        document.getElementById(
            'analyticsFindingEvaluationsTotal'
        );

    const count =
        document.getElementById(
            'analyticsFindingTableCount'
        );


    const tieneHallazgo =
        Boolean(
            criterio?.frente &&
            criterio?.atributo &&
            criterio?.criterio
        );

    actualizarControlesContextoFindingAnalytics(
        tieneHallazgo
    );

    if (status) {
        status.textContent =
            tieneHallazgo
                ? 'Cargando evaluaciones del hallazgo'
                : 'Cargando todas las evaluaciones';
    }


    if (path) {
        path.textContent =
            tieneHallazgo
                ? (
                    `${criterio.frente} → ` +
                    `${criterio.atributo} → ` +
                    `${criterio.criterio}`
                )
                : 'Todas las evaluaciones del universo filtrado';
    }


    if (total) {
        total.textContent =
            '—';
    }


    if (count) {
        count.textContent =
            'Cargando…';
    }


    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td
                    colspan="8"
                    class="analytics-finding-table-empty"
                >
                    Consultando evaluaciones…
                </td>
            </tr>
        `;
    }


    limpiarDetalleEvaluacionFindingAnalytics();


    try {
        const params =
            construirQueryAnalytics();


        if (tieneHallazgo) {
            params.set(
                'frente',
                criterio.frente
            );

            params.set(
                'atributo',
                criterio.atributo
            );

            params.set(
                'criterio',
                criterio.criterio
            );
        }


        const data =
            await solicitarAnalytics(
                '/api/analytics/detalle-hallazgo',
                params
            );


        analyticsFindingDetailData =
            data;


        renderizarTablaFindingAnalytics(
            data
        );


        if (status) {
            status.textContent =
                tieneHallazgo
                    ? 'Filtrado por hallazgo'
                    : 'Vista general';
        }

    } catch (error) {
        console.error(
            '❌ Error cargando evaluaciones Analytics:',
            error
        );


        analyticsFindingDetailData =
            null;


        if (status) {
            status.textContent =
                'No se pudo cargar el detalle';
        }


        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td
                        colspan="8"
                        class="analytics-finding-table-empty"
                    >
                        No fue posible cargar
                        las evaluaciones.
                    </td>
                </tr>
            `;
        }


        if (count) {
            count.textContent =
                '0 registros';
        }


        if (total) {
            total.textContent =
                '0';
        }
    }
}


// ==========================================================
// MECA ANALYTICS 2.0
// SECCIONES COLAPSABLES
// ==========================================================

function inicializarSeccionesColapsablesAnalytics() {
    const configuracion = [
        {
            id: 'analyticsOverviewSection',
            abierta: true
        },
        {
            id: 'analyticsEvolutionSection',
            abierta: false
        },
        {
            id: 'analyticsDiagnosticSection',
            abierta: false
        },
        {
            id: 'analyticsConcentrationSection',
            abierta: false
        },
        {
            id: 'analyticsFindingDetailSection',
            abierta: false
        },
        {
            id: 'analyticsInterventionSection',
            abierta: false
        }
    ];


    configuracion.forEach(
        item => {
            const seccion =
                document.getElementById(
                    item.id
                );

            if (!seccion) {
                return;
            }


            if (
                seccion.dataset
                    .collapseInitialized ===
                'true'
            ) {
                return;
            }


            seccion.dataset
                .collapseInitialized =
                'true';


            const cabecera =
                seccion.querySelector(
                    ':scope > .analytics-section-header'
                ) ||
                seccion.querySelector(
                    ':scope > .analytics-section-heading'
                );


            if (!cabecera) {
                return;
            }


            cabecera.classList.add(
                'analytics-collapsible-header'
            );


            const boton =
                document.createElement(
                    'button'
                );

            boton.type =
                'button';

            boton.className =
                'analytics-collapse-button';

            boton.setAttribute(
                'aria-label',
                'Expandir o contraer sección'
            );


            const contenido =
                document.createElement(
                    'div'
                );

            contenido.className =
                'analytics-collapsible-content';


            /*
             * Todos los nodos posteriores
             * a la cabecera pasan al contenido.
             */
            const nodos =
                [];

            let nodo =
                cabecera.nextSibling;

            while (nodo) {
                const siguiente =
                    nodo.nextSibling;

                nodos.push(
                    nodo
                );

                nodo =
                    siguiente;
            }


            nodos.forEach(
                nodoActual => {
                    contenido.appendChild(
                        nodoActual
                    );
                }
            );


            seccion.appendChild(
                contenido
            );


            const establecerEstado =
                abierta => {
                    seccion.classList.toggle(
                        'is-collapsed',
                        !abierta
                    );

                    boton.textContent =
                        abierta
                            ? '−'
                            : '+';

                    boton.setAttribute(
                        'aria-expanded',
                        String(
                            abierta
                        )
                    );

                    contenido.hidden =
                        !abierta;
                };


            boton.addEventListener(
                'click',
                event => {
                    event.stopPropagation();

                    establecerEstado(
                        seccion.classList
                            .contains(
                                'is-collapsed'
                            )
                    );
                }
            );


            cabecera.addEventListener(
                'click',
                event => {
                    /*
                     * Evitar colapsar cuando
                     * se pulsa un control
                     * contenido en la cabecera.
                     */
                    if (
                        event.target.closest(
                            'button, a, input, select'
                        )
                    ) {
                        return;
                    }

                    establecerEstado(
                        seccion.classList
                            .contains(
                                'is-collapsed'
                            )
                    );
                }
            );


            cabecera.appendChild(
                boton
            );


            establecerEstado(
                item.abierta
            );
        }
    );
}

// ==========================================================
// BLOQUE 05 - NAVEGACIÓN HACIA DIAGNÓSTICO
// ==========================================================

function irDiagnosticoDesdeFindingAnalytics() {
    const diagnostico =
        document.getElementById(
            'analyticsDiagnosticSection'
        );


    if (!diagnostico) {
        console.warn(
            '⚠️ No se encontró analyticsDiagnosticSection'
        );

        return;
    }


    /*
     * Si la sección está colapsada,
     * intentamos abrirla antes del scroll.
     */
    if (
        diagnostico.classList.contains(
            'is-collapsed'
        )
    ) {
        const boton =
            diagnostico.querySelector(
                '.analytics-collapse-button'
            );

        if (boton) {
            boton.click();
        }
    }


    diagnostico.scrollIntoView({
        behavior: 'smooth',
        block: 'start'
    });
}

async function limpiarHallazgoFindingAnalytics() {
    const buscador =
        document.getElementById(
            'analyticsFindingSearch'
        );

    if (buscador) {
        buscador.value = '';
    }


    await cargarDetalleHallazgoAnalytics(
        null
    );


    actualizarControlesContextoFindingAnalytics(
        false
    );
}


function actualizarControlesContextoFindingAnalytics(
    tieneHallazgo
) {
    const limpiar =
        document.getElementById(
            'analyticsFindingClearContext'
        );

    if (limpiar) {
        limpiar.hidden =
            !tieneHallazgo;
    }
}

function inicializarNavegacionFindingAnalytics() {
    if (
        analyticsFindingNavigationInitialized
    ) {
        return;
    }


    const irDiagnostico =
        document.getElementById(
            'analyticsFindingGoDiagnostic'
        );


    const limpiar =
        document.getElementById(
            'analyticsFindingClearContext'
        );


    irDiagnostico?.addEventListener(
        'click',
        irDiagnosticoDesdeFindingAnalytics
    );


    limpiar?.addEventListener(
        'click',
        limpiarHallazgoFindingAnalytics
    );


    analyticsFindingNavigationInitialized =
        true;
}


function normalizarBusquedaFindingAnalytics(
    valor
) {
    return String(
        valor ?? ''
    )
        .normalize('NFD')
        .replace(
            /[\u0300-\u036f]/g,
            ''
        )
        .toLowerCase()
        .trim();
}


function filtrarEvaluacionesFindingAnalytics() {
    const input =
        document.getElementById(
            'analyticsFindingSearch'
        );

    const busqueda =
        normalizarBusquedaFindingAnalytics(
            input?.value
        );


    const data =
        analyticsFindingDetailData;


    if (
        !data ||
        !Array.isArray(
            data.evaluaciones
        )
    ) {
        return;
    }


    if (!busqueda) {
        renderizarTablaFindingAnalytics(
            data
        );

        return;
    }


    const evaluacionesFiltradas =
        data.evaluaciones.filter(
            evaluacion => {
                const ticket =
                    normalizarBusquedaFindingAnalytics(
                        evaluacion.ticketPsi
                    );

                const gestor =
                    normalizarBusquedaFindingAnalytics(
                        evaluacion.gestor
                    );

                const lider =
                    normalizarBusquedaFindingAnalytics(
                        evaluacion.lider
                    );


                return (
                    ticket.includes(
                        busqueda
                    ) ||
                    gestor.includes(
                        busqueda
                    ) ||
                    lider.includes(
                        busqueda
                    )
                );
            }
        );


    renderizarTablaFindingAnalytics({
        ...data,

        evaluaciones:
            evaluacionesFiltradas
    });


    const count =
        document.getElementById(
            'analyticsFindingTableCount'
        );


    if (count) {
        count.textContent =
            `${evaluacionesFiltradas.length.toLocaleString(
                'es-PE'
            )} de ` +
            `${data.evaluaciones.length.toLocaleString(
                'es-PE'
            )} registros`;
    }
}


function inicializarBusquedaFindingAnalytics() {
    if (
        analyticsFindingSearchInitialized
    ) {
        return;
    }


    const input =
        document.getElementById(
            'analyticsFindingSearch'
        );

    const limpiar =
        document.getElementById(
            'analyticsFindingClearSearch'
        );


    if (!input) {
        return;
    }


    input.addEventListener(
        'input',
        filtrarEvaluacionesFindingAnalytics
    );


    limpiar?.addEventListener(
        'click',
        () => {
            input.value = '';

            filtrarEvaluacionesFindingAnalytics();

            input.focus();
        }
    );


    analyticsFindingSearchInitialized =
        true;
}

async function cargarAnalyticsDashboard() {
    if (analyticsCargando) {
        return;
    }


    const dashboard =
        document.getElementById(
            'analyticsDashboard'
        );


    if (!dashboard) {
        return;
    }


    analyticsCargando = true;


    try {

        // ======================================================
        // 0. LIMPIAR BUSCADOR BLOQUE 05
        // ======================================================

        const inputBusquedaFinding =
            document.getElementById(
                'analyticsFindingSearch'
            );


        if (inputBusquedaFinding) {
            inputBusquedaFinding.value = '';
        }


        // ======================================================
        // 1. CONSTRUIR FILTROS
        // ======================================================

        const params =
            construirQueryAnalytics();


        const paramsEvolucion =
            new URLSearchParams(
                params.toString()
            );


        paramsEvolucion.set(
            'granularidad',
            'month'
        );


        // ======================================================
        // 2. CARGAR TODOS LOS BLOQUES
        //
        // IMPORTANTE:
        // Promise.allSettled evita que el fallo
        // de un bloque impida mostrar los demás.
        // ======================================================

        const resultados =
            await Promise.allSettled([

                // 0
                solicitarAnalytics(
                    '/api/analytics/filtros',
                    params
                ),

                // 1
                solicitarAnalytics(
                    '/api/analytics/resumen-ejecutivo',
                    params
                ),

                // 2
                solicitarAnalytics(
                    '/api/analytics/evolucion',
                    paramsEvolucion
                ),

                // 3
                solicitarAnalytics(
                    '/api/analytics/diagnostico',
                    params
                ),

                // 4
                solicitarAnalytics(
                    '/api/analytics/concentracion',
                    params
                ),

                // 5
                solicitarAnalytics(
                    '/api/analytics/detalle-hallazgo',
                    params
                ),

                // 6
                solicitarAnalytics(
                    '/api/analytics/intervencion',
                    params
                )
            ]);


        const [
            resultadoFiltros,
            resultadoResumen,
            resultadoEvolucion,
            resultadoDiagnostico,
            resultadoConcentracion,
            resultadoDetalle,
            resultadoIntervencion
        ] = resultados;

        // ======================================================
        // BLOQUE 01
        // ¿CÓMO ESTAMOS?
        // ======================================================

        if (
            resultadoFiltros.status ===
            'fulfilled'
        ) {
            renderizarFiltrosAnalytics(
                resultadoFiltros.value
            );
        } else {
            console.error(
                '❌ Analytics filtros:',
                resultadoFiltros.reason
            );
        }


        if (
            resultadoResumen.status ===
            'fulfilled'
        ) {
            renderizarResumenEjecutivoAnalytics(
                resultadoResumen.value
            );
        } else {
            console.error(
                '❌ Bloque 01:',
                resultadoResumen.reason
            );
        }



        // ======================================================
        // BLOQUE 02
        // ¿CÓMO EVOLUCIONAMOS?
        // ======================================================

        if (
            resultadoEvolucion.status ===
            'fulfilled'
        ) {
            renderizarEvolucionAnalytics(
                resultadoEvolucion.value
            );

            console.log(
                '✅ Bloque 02 cargado'
            );

        } else {

            console.error(
                '❌ Bloque 02:',
                resultadoEvolucion.reason
            );


            if (
                typeof renderizarErrorEvolucionAnalytics ===
                'function'
            ) {
                renderizarErrorEvolucionAnalytics(
                    resultadoEvolucion.reason
                );
            }
        }


        // ======================================================
        // BLOQUE 03
        // ¿DÓNDE ESTÁ EL PROBLEMA?
        // ======================================================

        if (
            resultadoDiagnostico.status ===
            'fulfilled'
        ) {
            const diagnostico =
                resultadoDiagnostico.value;


            /*
             * Resumen superior:
             * incumplimientos,
             * criterios,
             * núcleo Pareto,
             * concentración.
             */
            if (
                typeof renderizarResumenDiagnosticoAnalytics ===
                'function'
            ) {
                renderizarResumenDiagnosticoAnalytics(
                    diagnostico
                );
            }


            /*
             * Gráfico Pareto principal.
             */
            if (
                typeof crearGraficoParetoDiagnosticoAnalytics ===
                'function'
            ) {
                crearGraficoParetoDiagnosticoAnalytics(
                    diagnostico
                );
            }


            /*
             * Drill-down:
             * Frente → Atributo → Criterio.
             *
             * Esta función también establece:
             * analyticsDiagnosticoActual.
             */
            if (
                typeof inicializarDrilldownDiagnosticoAnalytics ===
                'function'
            ) {
                inicializarDrilldownDiagnosticoAnalytics(
                    diagnostico
                );
            }


            /*
             * Lectura principal general.
             */
            if (
                typeof renderizarLecturaDiagnosticoAnalytics ===
                'function'
            ) {
                renderizarLecturaDiagnosticoAnalytics(
                    diagnostico
                );
            }


            console.log(
                '✅ Bloque 03 cargado',
                {
                    criterios:
                        diagnostico
                            ?.pareto
                            ?.criterios
                            ?.length || 0,

                    nucleo:
                        diagnostico
                            ?.pareto
                            ?.nucleo
                            ?.length || 0
                }
            );

        } else {

            console.error(
                '❌ Bloque 03:',
                resultadoDiagnostico.reason
            );
        }


        // ======================================================
        // BLOQUE 04
        // ¿QUIÉN LO CONCENTRA?
        // ======================================================

        if (
            resultadoConcentracion.status ===
            'fulfilled'
        ) {
            const concentracion =
                resultadoConcentracion.value;


            /*
             * Esta función ya renderiza:
             *
             * - KPIs
             * - Líderes
             * - Gestores
             * - Auditores
             * - Lectura principal
             */
            if (
                typeof inicializarConcentracionAnalytics ===
                'function'
            ) {
                inicializarConcentracionAnalytics(
                    concentracion
                );
            }

            await cargarEvolucionLideresAnalytics(
                concentracion
            );


            console.log(
                '✅ Bloque 04 cargado',
                {
                    lideres:
                        concentracion
                            ?.operacion
                            ?.lideres
                            ?.length || 0,

                    auditores:
                        concentracion
                            ?.auditoria
                            ?.auditores
                            ?.length || 0
                }
            );

        } else {

            console.error(
                '❌ Bloque 04:',
                resultadoConcentracion.reason
            );


            const statusConcentracion =
                document.getElementById(
                    'analyticsConcentrationStatusText'
                );


            if (statusConcentracion) {
                statusConcentracion.textContent =
                    'No se pudo cargar el análisis';
            }
        }


        // ======================================================
        // BLOQUE 05
        // ¿QUÉ OCURRIÓ EXACTAMENTE?
        // ======================================================

        if (
            resultadoDetalle.status ===
            'fulfilled'
        ) {
            const detalleGeneral =
                resultadoDetalle.value;


            analyticsFindingDetailData =
                detalleGeneral;


            renderizarTablaFindingAnalytics(
                detalleGeneral
            );


            /*
             * Al cargar Analytics desde cero
             * estamos en modo GENERAL.
             */
            if (
                typeof actualizarControlesContextoFindingAnalytics ===
                'function'
            ) {
                actualizarControlesContextoFindingAnalytics(
                    false
                );
            }


            const statusFinding =
                document.getElementById(
                    'analyticsFindingDetailStatusText'
                );


            const pathFinding =
                document.getElementById(
                    'analyticsFindingSelectedPath'
                );


            if (statusFinding) {
                statusFinding.textContent =
                    'Vista general';
            }


            if (pathFinding) {
                pathFinding.textContent =
                    'Todas las evaluaciones del universo filtrado';
            }


            console.log(
                '✅ Bloque 05 cargado',
                {
                    evaluaciones:
                        detalleGeneral
                            ?.evaluaciones
                            ?.length || 0
                }
            );

        } else {

            console.error(
                '❌ Bloque 05:',
                resultadoDetalle.reason
            );


            analyticsFindingDetailData =
                null;


            const tbodyFinding =
                document.getElementById(
                    'analyticsFindingTableBody'
                );


            const countFinding =
                document.getElementById(
                    'analyticsFindingTableCount'
                );


            const totalFinding =
                document.getElementById(
                    'analyticsFindingEvaluationsTotal'
                );


            if (tbodyFinding) {
                tbodyFinding.innerHTML = `
                    <tr>
                        <td
                            colspan="8"
                            class="
                                analytics-finding-table-empty
                            "
                        >
                            No fue posible cargar
                            las evaluaciones.
                        </td>
                    </tr>
                `;
            }


            if (countFinding) {
                countFinding.textContent =
                    '0 registros';
            }


            if (totalFinding) {
                totalFinding.textContent =
                    '0';
            }
        }

        // ======================================================
        // BLOQUE 06
        // ¿QUÉ HICIMOS AL RESPECTO Y FUNCIONÓ?
        // ======================================================

        if (
            resultadoIntervencion &&
            resultadoIntervencion.status ===
            'fulfilled'
        ) {
            const intervencion =
                resultadoIntervencion.value;


            renderizarIntervencionAnalytics(
                intervencion
            );


            console.log(
                '✅ Bloque 06 cargado',
                {
                    pda:
                        intervencion
                            ?.resumen
                            ?.pdaGenerados || 0,

                    gestores:
                        intervencion
                            ?.resumen
                            ?.gestoresIntervenidos || 0,

                    evaluables:
                        intervencion
                            ?.resumen
                            ?.pdaEvaluables || 0,

                    frentes:
                        intervencion
                            ?.concentracion
                            ?.frentes
                            ?.length || 0
                }
            );

        } else {

            const error =
                resultadoIntervencion
                    ?.reason ||
                new Error(
                    'No fue posible cargar intervención'
                );


            renderizarErrorIntervencionAnalytics(
                error
            );
        }

        // ======================================================
        // CONTROL GENERAL
        // ======================================================

        console.log(
            '📊 ANALYTICS 2.0 - ESTADO DE BLOQUES',
            {
                bloque01:
                    resultadoResumen.status,

                bloque02:
                    resultadoEvolucion.status,

                bloque03:
                    resultadoDiagnostico.status,

                bloque04:
                    resultadoConcentracion.status,

                bloque05:
                    resultadoDetalle.status,

                bloque06:
                    resultadoIntervencion
                        ?.status || 'unknown'
            }
        );


    } catch (error) {

        /*
         * Este catch solo debería activarse
         * por un error ajeno a los endpoints,
         * porque cada endpoint ya está aislado
         * mediante Promise.allSettled.
         */

        console.error(
            '❌ Error general cargando Analytics 2.0:',
            error
        );


    } finally {

        analyticsCargando =
            false;
    }
}

function renderizarTablaEvolucionIndicadoresAnalytics(
    evolucion
) {
    const thead =
        document.getElementById(
            'analyticsEvolutionTableHead'
        );

    const tbody =
        document.getElementById(
            'analyticsEvolutionTableBody'
        );


    if (
        !thead ||
        !tbody
    ) {
        return;
    }


    const serie =
        Array.isArray(
            evolucion?.serie
        )
            ? evolucion.serie
            : [];


    if (
        serie.length === 0
    ) {
        thead.innerHTML = `
            <tr>
                <th>
                    Indicador
                </th>
            </tr>
        `;


        tbody.innerHTML = `
            <tr>
                <td
                    class="analytics-evolution-table-empty"
                >
                    No existe información temporal
                    para los filtros seleccionados.
                </td>
            </tr>
        `;

        return;
    }


    // ======================================================
    // CABECERA DINÁMICA
    // ======================================================

    const periodos =
        serie.map(
            item =>
                formatearPeriodoAnalytics(
                    item.periodo,
                    evolucion?.granularidad
                )
        );


    thead.innerHTML = `
        <tr>
            <th class="analytics-evolution-indicator-column">
                Indicador
            </th>

            ${
                periodos
                    .map(
                        periodo => `
                            <th>
                                ${
                                    escapeHtml(
                                        periodo
                                    )
                                }
                            </th>
                        `
                    )
                    .join('')
            }

            <th>
                Último
            </th>

            <th>
                Variación
            </th>
        </tr>
    `;


    // ======================================================
    // HELPERS
    // ======================================================

    const formatoNumero =
        valor =>
            Number(
                valor || 0
            ).toLocaleString(
                'es-PE'
            );


    const formatoPorcentaje =
        valor => {
            if (
                valor == null ||
                Number.isNaN(
                    Number(valor)
                )
            ) {
                return '—';
            }

            return (
                Number(valor)
                    .toFixed(1) +
                '%'
            );
        };


    const formatoNota =
        valor => {
            if (
                valor == null ||
                Number.isNaN(
                    Number(valor)
                )
            ) {
                return '—';
            }

            return Number(
                valor
            ).toFixed(2);
        };


    const calcularVariacionAbsoluta =
        (
            actual,
            anterior,
            sufijo = ''
        ) => {
            if (
                actual == null ||
                anterior == null
            ) {
                return {
                    texto:
                        '—',

                    clase:
                        'analytics-value-neutral'
                };
            }


            const delta =
                Number(actual) -
                Number(anterior);


            const texto =
                `${
                    delta > 0
                        ? '+'
                        : ''
                }${
                    delta.toFixed(1)
                }${sufijo}`;


            return {
                texto,

                clase:
                    delta > 0
                        ? 'analytics-value-positive'
                        : delta < 0
                            ? 'analytics-value-negative'
                            : 'analytics-value-neutral'
            };
        };


    const calcularVariacionInversa =
        (
            actual,
            anterior,
            sufijo = ''
        ) => {
            if (
                actual == null ||
                anterior == null
            ) {
                return {
                    texto:
                        '—',

                    clase:
                        'analytics-value-neutral'
                };
            }


            const delta =
                Number(actual) -
                Number(anterior);


            return {
                texto:
                    `${
                        delta > 0
                            ? '+'
                            : ''
                    }${
                        delta.toFixed(1)
                    }${sufijo}`,

                /*
                 * En fuera de nivel,
                 * bajar es favorable.
                 */
                clase:
                    delta < 0
                        ? 'analytics-value-positive'
                        : delta > 0
                            ? 'analytics-value-negative'
                            : 'analytics-value-neutral'
            };
        };


    const ultimo =
        serie[
            serie.length - 1
        ];


    const anterior =
        serie.length > 1
            ? serie[
                serie.length - 2
            ]
            : null;


    // ======================================================
    // DEFINICIÓN DE INDICADORES
    // ======================================================

    const indicadores = [
        {
            nombre:
                'Auditorías',

            obtener:
                item =>
                    item.evaluaciones,

            formato:
                formatoNumero,

            ultimo:
                ultimo.evaluaciones,

            variacion:
                anterior
                    ? {
                        texto:
                            ultimo
                                ?.variacion
                                ?.volumenPct == null
                                ? '—'
                                : `${
                                    Number(
                                        ultimo
                                            .variacion
                                            .volumenPct
                                    ) > 0
                                        ? '+'
                                        : ''
                                }${
                                    Number(
                                        ultimo
                                            .variacion
                                            .volumenPct
                                    ).toFixed(1)
                                }%`,

                        clase:
                            'analytics-value-neutral'
                    }
                    : {
                        texto:
                            '—',

                        clase:
                            'analytics-value-neutral'
                    }
        },


        {
            nombre:
                'Nota promedio',

            obtener:
                item =>
                    item.notaPromedio,

            formato:
                formatoNota,

            ultimo:
                ultimo.notaPromedio,

            variacion:
                calcularVariacionAbsoluta(
                    ultimo.notaPromedio,
                    anterior
                        ?.notaPromedio,
                    ' pp'
                )
        },


        {
            nombre:
                'Gestores evaluados',

            obtener:
                item =>
                    item.gestores,

            formato:
                formatoNumero,

            ultimo:
                ultimo.gestores,

            variacion:
                calcularVariacionAbsoluta(
                    ultimo.gestores,
                    anterior
                        ?.gestores
                )
        },


        {
            nombre:
                'Auditores',

            obtener:
                item =>
                    item.auditores,

            formato:
                formatoNumero,

            ultimo:
                ultimo.auditores,

            variacion:
                calcularVariacionAbsoluta(
                    ultimo.auditores,
                    anterior
                        ?.auditores
                )
        },


        {
            nombre:
                'Favorable',

            obtener:
                item =>
                    item
                        ?.calidad
                        ?.favorablePct,

            formato:
                formatoPorcentaje,

            ultimo:
                ultimo
                    ?.calidad
                    ?.favorablePct,

            variacion:
                calcularVariacionAbsoluta(
                    ultimo
                        ?.calidad
                        ?.favorablePct,

                    anterior
                        ?.calidad
                        ?.favorablePct,

                    ' pp'
                )
        },


        {
            nombre:
                'Fuera de nivel',

            obtener:
                item =>
                    item
                        ?.calidad
                        ?.atencionPct,

            formato:
                formatoPorcentaje,

            ultimo:
                ultimo
                    ?.calidad
                    ?.atencionPct,

            variacion:
                calcularVariacionInversa(
                    ultimo
                        ?.calidad
                        ?.atencionPct,

                    anterior
                        ?.calidad
                        ?.atencionPct,

                    ' pp'
                )
        }
    ];


    // ======================================================
    // RENDER
    // ======================================================

    tbody.innerHTML = '';


    indicadores.forEach(
        indicador => {
            const fila =
                document.createElement(
                    'tr'
                );


            const valoresPeriodo =
                serie
                    .map(
                        item => `
                            <td>
                                ${
                                    indicador.formato(
                                        indicador.obtener(
                                            item
                                        )
                                    )
                                }
                            </td>
                        `
                    )
                    .join('');


            fila.innerHTML = `
                <th
                    scope="row"
                    class="
                        analytics-evolution-indicator-column
                    "
                >
                    ${
                        escapeHtml(
                            indicador.nombre
                        )
                    }
                </th>

                ${valoresPeriodo}

                <td
                    class="
                        analytics-evolution-table-current
                    "
                >
                    ${
                        indicador.formato(
                            indicador.ultimo
                        )
                    }
                </td>

                <td
                    class="
                        analytics-evolution-table-change
                        ${
                            indicador
                                .variacion
                                .clase
                        }
                    "
                >
                    ${
                        indicador
                            .variacion
                            .texto
                    }
                </td>
            `;


            tbody.appendChild(
                fila
            );
        }
    );
}
