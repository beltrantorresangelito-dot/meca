// =============================================
// MÓDULO: UI TABS - ui-tabs.js
// =============================================
// Generación de pestañas y navegación
// =============================================

(function() {
    'use strict';

    // =============================================
    // 1. GENERAR PESTAÑAS DEL SUPERVISOR
    // =============================================

    window.generarTabsSupervisor = async function() {
        console.log('🔧 Generando pestañas dinámicas para supervisor...');

        const tabsContainer = document.getElementById('tabsHeaderContainer');
        if (!tabsContainer) {
            console.error('❌ No se encontró el contenedor de pestañas');
            return;
        }

        tabsContainer.innerHTML = '';

        try {
            const token = localStorage.getItem('meca_token');
            if (!token) {
                console.error('❌ No hay token');
                window.mostrarPestanasFallback(tabsContainer);
                return;
            }

            const response = await fetch('/api/pestanas', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const pestanas = await response.json();
            console.log('📋 Pestañas desde /api/pestanas:', pestanas);

            if (pestanas.length === 0) {
                console.warn('⚠️ No hay pestañas para este rol');
                tabsContainer.innerHTML = '<div style="padding: 20px; text-align: center;">No tiene acceso a ningún módulo</div>';
                return;
            }

            // Crear botones
            pestanas.forEach(pestana => {
                const button = document.createElement('button');
                button.className = 'tab-button';
                button.innerHTML = `${pestana.icono || '📄'} ${pestana.nombre}`;
                button.setAttribute('data-tab', pestana.codigo);
                button.onclick = (event) => window.showTab(pestana.codigo, event);
                tabsContainer.appendChild(button);
            });

            // Activar primera pestaña
            const primerBoton = tabsContainer.querySelector('.tab-button');
            if (primerBoton) {
                primerBoton.classList.add('active');
                const primeraPestana = primerBoton.getAttribute('data-tab');
                if (primeraPestana && typeof window.showTab === 'function') {
                    window.showTab(primeraPestana, null);
                }
            }

            console.log(`✅ Generadas ${tabsContainer.children.length} pestañas`);

        } catch (error) {
            console.error('❌ Error generando pestañas:', error);
            window.mostrarPestanasFallback(tabsContainer);
        }
    };

    // =============================================
    // 2. FALLBACK DE PESTAÑAS
    // =============================================

    window.mostrarPestanasFallback = function(tabsContainer) {
        const pestanasBasicas = [
            { codigo: 'reportes', nombre: '📊 Reportes', icono: '📊' },
            { codigo: 'historialAgente', nombre: '📋 Avance Gestores', icono: '📋' }
        ];

        pestanasBasicas.forEach(pestana => {
            const button = document.createElement('button');
            button.className = 'tab-button';
            button.innerHTML = `${pestana.icono} ${pestana.nombre}`;
            button.setAttribute('data-tab', pestana.codigo);
            button.onclick = (event) => window.showTab(pestana.codigo, event);
            tabsContainer.appendChild(button);
        });

        const primerBoton = tabsContainer.querySelector('.tab-button');
        if (primerBoton) {
            primerBoton.classList.add('active');
            const primeraPestana = primerBoton.getAttribute('data-tab');
            if (primeraPestana) window.showTab(primeraPestana, null);
        }
    };

    // =============================================
    // 3. SHOW TAB - NAVEGACIÓN PRINCIPAL
    // =============================================

    window.showTab = async function(tabName, event) {
        console.log(`🔄 showTab: Cambiando a pestaña ${tabName}`);

        // Cambiar pestañas visibles
        document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
        document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));

        const targetPane = document.getElementById(`tab-${tabName}`);
        if (targetPane) {
            targetPane.classList.add('active');
        } else {
            console.error(`❌ No se encontró la pestaña tab-${tabName}`);
            return;
        }

        if (event && event.target) {
            event.target.classList.add('active');
        } else {
            const btn = document.querySelector(`.tab-button[data-tab="${tabName}"]`);
            if (btn) btn.classList.add('active');
        }

        // =============================================
        // EJECUTAR ACCIONES ESPECÍFICAS POR PESTAÑA
        // =============================================

        try {
            // Mapa de acciones por pestaña
            const acciones = {
                // ===== REPORTES =====
                'reportes': async () => {
                    if ((!window.evaluacionesGlobales || window.evaluacionesGlobales.length === 0) &&
                        typeof window.obtenerEvaluacionesConCache === 'function') {
                        await window.obtenerEvaluacionesConCache(false);
                    }
                    if (typeof window.generarReportes === 'function') {
                        await window.generarReportes();
                    }
                    if (typeof window.cargarResumenPorLider === 'function') {
                        await window.cargarResumenPorLider();
                    }
                },

                // ===== AVANCE GESTORES =====
                'historialAgente': async () => {
                    console.log('🔄 Forzando carga de PDA para Avance Gestores...');
                    if (typeof window.cargarDatosPDA === 'function') {
                        await window.cargarDatosPDA();
                    }
                    if (typeof window.cargarLideresEnSelectRanking === 'function') {
                        await window.cargarLideresEnSelectRanking();
                    }
                    if (typeof window.inicializarBuscadorGestores === 'function') {
                        window.inicializarBuscadorGestores();
                    }
                    if (typeof window.cargarMesesParaSelectorQ4 === 'function') {
                        await window.cargarMesesParaSelectorQ4();
                    }
                    if (typeof window.cargarAgentesQ4PorMes === 'function') {
                        await window.cargarAgentesQ4PorMes();
                    }
                    setTimeout(() => {
                        if (typeof window.cargarEvolucionCuartilesPorGestor === 'function') {
                            window.cargarEvolucionCuartilesPorGestor();
                        }
                    }, 200);
                },

                // ===== PDA =====
                'gestionPDA': async () => {
                    if (typeof window.cargarDatosPDA === 'function') await window.cargarDatosPDA();
                    if (typeof window.llenarSelectAgentes === 'function') window.llenarSelectAgentes();
                },

                // ===== AUDITORES =====
                'productividad': async () => {
                    if (typeof window.cargarProductividad === 'function') window.cargarProductividad();
                    setTimeout(() => {
                        if (typeof window.cargarSelectAuditoresHistorial === 'function') {
                            window.cargarSelectAuditoresHistorial();
                        }
                        const resumenAuditor = document.getElementById('resumenAuditor');
                        const historialContainer = document.getElementById('historialAuditorContainer');
                        const btnExportar = document.getElementById('btnExportarHistorialAuditor');
                        if (resumenAuditor) resumenAuditor.style.display = 'none';
                        if (historialContainer) historialContainer.style.display = 'none';
                        if (btnExportar) btnExportar.style.display = 'none';
                    }, 100);
                },

                // ===== ESCUCHAS =====
                'gestionEscuchas': async () => {
                    console.log('🎧 Inicializando pestaña Escuchas');
                    if (typeof window.inicializarGestionEscuchas === 'function') {
                        await window.inicializarGestionEscuchas();
                    }
                    if (typeof window.cargarHistorialLotes === 'function') {
                        await window.cargarHistorialLotes();
                    }
                    if (typeof window.refrescarMonitoreoEscuchas === 'function') {
                        await window.refrescarMonitoreoEscuchas();
                    }
                },

                // ===== FTE =====
                'gestionAgentes': async () => {
                    if (typeof window.cargarAgentes === 'function') await window.cargarAgentes();
                    if (typeof window.cargarCategoriasUnicas === 'function') await window.cargarCategoriasUnicas();
                },

                // ===== USUARIOS =====
                'gestionUsuarios': async () => {
                    if (typeof window.cargarUsuarios === 'function') await window.cargarUsuarios();
                    if (typeof window.cargarRoles === 'function') await window.cargarRoles();
                },

                // ===== BD =====
                'estadoBD': async () => {
                    if (typeof window.refrescarEstadoBD === 'function') await window.refrescarEstadoBD();
                },

                // ===== VERSIONES =====
                'versiones': async () => {
                    if (typeof window.cargarVersionesTabla === 'function') window.cargarVersionesTabla('todos');
                    if (typeof window.inicializarFormVersiones === 'function') window.inicializarFormVersiones();
                },

                // ===== GESTIÓN DE PERSONAS =====
                'gestionPersonas': async () => {
                    if (typeof window.cargarGestionPersonasGP === 'function') await window.cargarGestionPersonasGP();
                    if (typeof window.inicializarFiltrosGestionPersonasGP === 'function') {
                        window.inicializarFiltrosGestionPersonasGP();
                    }
                },

                // ===== CUARTILES =====
                'cuartiles': async () => {
                    if (typeof window.cargarCriteriosCuartilesTabla === 'function') {
                        await window.cargarCriteriosCuartilesTabla();
                    }
                },

                // ===== REGLAS =====
                'reglas': async () => {
                    if (typeof window.inicializarReglasAdmin === 'function') {
                        await window.inicializarReglasAdmin();
                    }
                },

                // ===== SOLICITUDES =====
                'misSolicitudes': async () => {
                    if (typeof window.cargarMisSolicitudes === 'function') {
                        await window.cargarMisSolicitudes();
                    }
                },

                // ===== INFORMES MENSUALES =====
                'informesMensuales': async () => {
                    if (typeof window.cargarHistorialInformes === 'function') await window.cargarHistorialInformes();
                    if (typeof window.cargarMesesInformes === 'function') await window.cargarMesesInformes();
                    if (typeof window.mostrarAdminToolsInformes === 'function') window.mostrarAdminToolsInformes();
                },

                // ===== TRANSCRIPCIÓN =====
                'transcripcion': async () => {
                    if (typeof window.cargarTranscripciones === 'function') {
                        window.cargarTranscripciones();
                    }
                    if (typeof window.cargarTareasProgramadas === 'function') {
                        setTimeout(window.cargarTareasProgramadas, 300);
                    }
                },

                // ===== REPORTES AUTOMÁTICOS =====
                'reportesAuto': async () => {
                    if (typeof window.cargarEstadoReportes === 'function') {
                        setTimeout(window.cargarEstadoReportes, 300);
                    }
                    if (typeof window.cargarTareasReportes === 'function') {
                        setTimeout(window.cargarTareasReportes, 500);
                    }
                }
            };

            // Ejecutar acción correspondiente
            const accion = acciones[tabName];
            if (accion) {
                await accion();
            }

        } catch (error) {
            console.error(`❌ Error en acciones de pestaña ${tabName}:`, error);
        }
    };

    console.log('✅ Módulo ui-tabs.js cargado');

})();