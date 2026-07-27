// =============================================
// SUPERVISOR.JS - ARCHIVO PRINCIPAL
// =============================================
// Orquestador: carga módulos e inicia el sistema
// =============================================

(function() {
    'use strict';

    console.log('🚀 Cargando sistema de supervisión...');

    // =============================================
    // 1. LISTA DE MÓDULOS A CARGAR
    // =============================================

    const modulos = [
        { nombre: 'config', path: 'js/modules/config.js' },
        { nombre: 'utils', path: 'js/modules/utils.js' },
        { nombre: 'session', path: 'js/modules/session.js' },
        { nombre: 'ui-tabs', path: 'js/modules/ui-tabs.js' },
        { nombre: 'api', path: 'js/modules/api.js' },
        { nombre: 'reports', path: 'js/modules/reports.js' },
        { nombre: 'agents', path: 'js/modules/agents.js' },
        { nombre: 'pda', path: 'js/modules/pda.js' },
        { nombre: 'auditors', path: 'js/modules/auditors.js' },
        { nombre: 'escuchas', path: 'js/modules/escuchas.js' },
        { nombre: 'users', path: 'js/modules/users.js' },
        { nombre: 'database', path: 'js/modules/database.js' },
        { nombre: 'versions', path: 'js/modules/versions.js' },
        { nombre: 'gestion-personas', path: 'js/modules/gestion-personas.js' },
        { nombre: 'cuartiles', path: 'js/modules/cuartiles.js' },
        { nombre: 'reglas', path: 'js/modules/reglas.js' },
        { nombre: 'solicitudes', path: 'js/modules/solicitudes.js' },
        { nombre: 'informes-mensuales', path: 'js/modules/informes-mensuales.js' },
        { nombre: 'transcripcion', path: 'js/modules/transcripcion.js' },
        { nombre: 'reportes-auto', path: 'js/modules/reportes-auto.js' }
    ];

    let modulosCargados = 0;
    const totalModulos = modulos.length;

    // =============================================
    // 2. CARGA SECUENCIAL DE MÓDULOS
    // =============================================

    function cargarSiguienteModulo(index) {
        if (index >= totalModulos) {
            console.log('✅ Todos los módulos cargados');
            inicializarSupervisor();
            return;
        }

        const modulo = modulos[index];
        const script = document.createElement('script');
        script.src = modulo.path;
        script.async = false;

        script.onload = function() {
            modulosCargados++;
            console.log(`✅ Módulo ${modulo.nombre} cargado (${modulosCargados}/${totalModulos})`);
            cargarSiguienteModulo(index + 1);
        };

        script.onerror = function() {
            console.error(`❌ Error cargando módulo ${modulo.nombre}`);
            // Intentar continuar con el siguiente
            cargarSiguienteModulo(index + 1);
        };

        document.head.appendChild(script);
    }

    // =============================================
    // 3. INICIALIZACIÓN PRINCIPAL
    // =============================================

    function inicializarSupervisor() {
        console.log('🚀 Inicializando sistema de supervisión...');

        // Verificar que las funciones principales existan
        if (typeof window.verificarSesionSupervisor !== 'function') {
            console.error('❌ verificarSesionSupervisor no está definida');
            return;
        }

        // Iniciar sesión
        window.verificarSesionSupervisor().then(sesionValida => {
            if (!sesionValida) {
                console.log('❌ Sesión no válida, redirigiendo a login');
                return;
            }

            console.log('✅ Sesión válida, cargando datos...');

            // Inicializar componentes
            if (typeof window.cargarRankingAgentesCompleto === 'function') {
                window.cargarRankingAgentesCompleto();
            }

            if (typeof window.cargarLideresEnSelectRanking === 'function') {
                window.cargarLideresEnSelectRanking();
            }

            if (typeof window.cargarResumenPorLider === 'function') {
                window.cargarResumenPorLider();
            }

            if (typeof window.actualizarGraficoErroresAuditores === 'function') {
                window.actualizarGraficoErroresAuditores();
            }

            // Inicializar filtro de reportes
            if (typeof window.inicializarFiltroReportes === 'function') {
                window.inicializarFiltroReportes();
            }

            console.log('✅ Sistema de supervisión inicializado');
        });
    }

    // =============================================
    // 4. FUNCIONES GLOBALES
    // =============================================

    /**
     * Cierra la sesión del usuario
     */
    window.cerrarSesion = function(event) {
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        if (confirm('¿Cerrar sesión?')) {
            localStorage.removeItem('meca_token');
            localStorage.removeItem('meca_usuario');
            localStorage.clear();
            sessionStorage.clear();
            window.location.href = '/login';
        }
    };

    /**
     * Recarga un módulo específico (útil para desarrollo)
     */
    window.recargarModulo = function(nombre) {
        console.log(`🔄 Recargando módulo: ${nombre}`);
        const script = document.createElement('script');
        script.src = `modules/${nombre}.js?t=${Date.now()}`;
        document.head.appendChild(script);
    };

    /**
     * Obtiene el ID del usuario actual
     */
    window.getUsuarioActualId = function() {
        return window.usuarioActual?.id || null;
    };

    /**
     * Obtiene el nombre del usuario actual
     */
    window.getUsuarioActualNombre = function() {
        return window.usuarioActual?.nombre_completo || window.usuarioActual?.usuario || '';
    };

    /**
     * Obtiene el rol del usuario actual
     */
    window.getUsuarioActualRol = function() {
        return window.usuarioActual?.rol_codigo || window.usuarioActual?.rol || '';
    };

    // =============================================
    // 5. INICIAR CARGA DE MÓDULOS
    // =============================================

    cargarSiguienteModulo(0);

    console.log('✅ supervisor.js cargado correctamente');

})();