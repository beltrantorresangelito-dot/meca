// =============================================
// MÓDULO: CONFIGURACIÓN - config.js
// =============================================
// Variables globales del sistema
// =============================================

(function() {
    'use strict';

    console.log('📦 Inicializando variables globales...');

    // =============================================
    // 1. SESIÓN Y USUARIOS
    // =============================================
    window.usuarioActual = null;
    window.usuariosGlobales = [];
    window.usuariosFiltrados = [];
    window.usuarioEnEdicion = null;
    window.usuarioPasswordId = null;

    // =============================================
    // 2. EVALUACIONES
    // =============================================
    window.evaluacionesGlobales = [];
    window.evaluacionesFiltradas = [];
    window.evaluacionesFiltradasGlobal = [];
    window.evaluacionesFiltradasPorLider = null;

    // =============================================
    // 3. CACHÉ
    // =============================================
    window.cacheEvaluaciones = { data: null, timestamp: null, hash: null };
    window.CACHE_DURACION = 5 * 60 * 1000; // 5 minutos
    window.MATRIZ_CACHE_DURACION = 10 * 60 * 1000; // 10 minutos
    window.matrizCacheStore = {};
    window.CACHE_PRODUCTIVIDAD_DURACION = 2 * 60 * 1000; // 2 minutos
    window.cacheProductividad = { datos: null, timestamp: null, filtroHash: null };
    window.cacheCiclos = new Map();

    // =============================================
    // 4. PDA
    // =============================================
    window.datosPDA = [];
    window.itemsActuales = [];
    window.pdaEnEdicion = null;
    window.pdaActualGestion = null;

    // =============================================
    // 5. GRÁFICOS (Chart.js)
    // =============================================
    window.chartResultados = null;
    window.chartTendencias = null;
    window.chartEvolutivoAudios = null;
    window.chartDistribucionRangos = null;
    window.chartEvolutivoAtributos = null;
    window.chartEvolutivoQuiebres = null;
    window.chartEvolutivoCuartiles = null;
    window.chartEvolutivo = null;
    window.chartEvolutivoFrentes = null;
    window.chartAuditoriasPorAuditor = null;
    window.chartEvolutivoAuditorias = null;
    window.chartTablasSize = null;
    window.chartErroresAuditores = null;
    window.chartComparativa = null;
    window.chartGestionLlamadas = null;
    window.chartRadar = null;
    window.chartTamanioTablasInstance = null;

    // =============================================
    // 6. AUDITORES Y RANKING
    // =============================================
    window.auditoresExcluidosGlobal = [];
    window.todosLosAuditoresGlobal = [];
    window.rankingOriginalCompleto = [];
    window.rankingCompletoGlobal = [];
    window.datosAgrupadosActualesGlobal = [];
    window.rankingActualVisible = [];

    // =============================================
    // 7. FILTROS
    // =============================================
    window.filtroPeriodoActual = 'todos';
    window.filtroCantidadActual = 'all';
    window.filtroFechaInicioActual = null;
    window.filtroFechaFinActual = null;
    window.liderSeleccionadoActual = 'todos';
    window.cuartilActivoGlobal = 'todos';
    window.filtroMesRankingActual = 'todos';
    window.liderFiltroRankingActual = 'todos';
    window.vistaActual = 'general';
    window.vistaAtributosActual = 'general';

    // Filtros por período
    window.filtroDiaDesde = null;
    window.filtroDiaHasta = null;
    window.filtroSemanaAnio = null;
    window.filtroSemanaNumero = null;
    window.filtroMesAnio = null;
    window.filtroMesNumero = null;
    window.filtroTrimestreAnio = null;
    window.filtroTrimestreNumero = null;
    window.filtroAnio = null;
    window.filtroRangoInicio = null;
    window.filtroRangoFin = null;
    window.filtroMultiples = [];

    // =============================================
    // 8. AGENTES
    // =============================================
    window.agentesGlobales = [];
    window.agentesFiltrados = [];
    window.agentesPendientesGuardarMasivo = [];
    window.agenteEnEdicion = null;

    // =============================================
    // 9. ROLES Y PESTAÑAS
    // =============================================
    window.rolesGlobales = [];
    window.pestanasDisponiblesGlobal = [];
    window.permisosPestanasGlobal = [];

    // =============================================
    // 10. ESCUCHAS
    // =============================================
    window.asignacionesEscuchasGlobales = [];
    window.lotesHistorialGlobal = [];
    window.loteSeleccionadoId = null;

    // =============================================
    // 11. SOLICITUDES
    // =============================================
    window.solicitudesData = [];
    window.solicitudEnEdicion = null;

    // =============================================
    // 12. INFORMES
    // =============================================
    window.informesGlobales = [];

    // =============================================
    // 13. GESTIÓN DE PERSONAS
    // =============================================
    window.datosGestoresGP = [];
    window.gestoresFiltradosGP = [];
    window.paginaActualGP = 1;
    window.registrosPorPaginaGP = 25;
    window.gestoresExpandidosGP = new Set();
    window.cicloActualDetalleGP = null;
    window.evaluacionActualDetalleGP = null;
    window.mesFiltroGP = 'todos';

    // =============================================
    // 14. TRANSCRIPCIÓN
    // =============================================
    window.transcripcionesData = [];
    window.tareasDataGlobal = [];
    window.progresoActivo = false;
    window.progresoInterval = null;
    window.tareaEnProgreso = null;

    // =============================================
    // 15. SESIONES ACTIVAS
    // =============================================
    window.usuarioSesionesSeleccionado = null;
    window.monitorInterval = null;

    // =============================================
    // 16. NOTIFICACIONES
    // =============================================
    window.ultimaNotificacionLeida = null;
    window.timeoutNotificaciones = null;
    window.notificacionMostrada = false;
    window.historialFiltrado = [];

    // =============================================
    // 17. MATRICES (CONSTANTES)
    // =============================================
    window.MATRIZ_ANTIGUA = {
        nombre: "Original (30|30|40)",
        fecha_limite: "2026-05-31",
        pesos: { ENC: 30, ECUF: 30, ECN: 40 }
    };

    window.MATRIZ_NUEVA = {
        nombre: "Nueva (15|15|70)",
        fecha_limite: null,
        pesos: { ENC: 15, ECUF: 15, ECN: 70 }
    };

    // =============================================
    // 18. API Y URLs
    // =============================================
    window.API_TRANSCRIPCION_URL = 'http://localhost:5001/api/transcripcion';
    window.API_REPORTES_URL = 'http://localhost:5000/api/reportes';

    console.log('✅ Módulo config.js cargado');

})();