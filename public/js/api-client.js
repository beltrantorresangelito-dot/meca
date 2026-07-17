// ======================================================
// api-client.js - Cliente API unificado
// ======================================================
// 
// 📌 PROPÓSITO: Proporcionar una interfaz unificada para todas las 
//    operaciones de la API, manejando autenticación y tokens
// 📌 TECNOLOGÍA: JavaScript nativo (fetch) con Promesas
// 📌 ESTRUCTURA: 
//    1. Funciones auxiliares (hash, token, sesiones)
//    2. Módulos por funcionalidad (Auth, Auditor, Supervisor, etc.)
//    3. API pública (return de objetos con todos los métodos)
// ======================================================

// ======================================================
// 1. FUNCIONES AUXILIARES
// ======================================================

/**
 * hashSHA256 - Encripta un texto usando SHA-256
 * @param {string} texto - Texto a encriptar
 * @returns {string} Hash en hexadecimal
 * @uso: Encriptar contraseñas antes de enviarlas
 */
async function hashSHA256(texto) {
    const encoder = new TextEncoder();
    const data = encoder.encode(texto);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    return hashHex;
}

// ======================================================
// 2. CONFIGURACIÓN Y MÓDULO PRINCIPAL
// ======================================================

const API = (function() {
    // Todas las operaciones usan la API local PostgreSQL

    // ======================================================
    // Módulo: Autenticación (AUTH)
    // ======================================================

    /**
     * login - Inicia sesión con usuario y contraseña
     * @param {string} usuario - Nombre de usuario
     * @param {string} contrasena - Contraseña (texto plano)
     * @returns {Object} { success, token, usuario }
     */
    async function login(usuario, contrasena) {
        console.log('🔐 Intentando iniciar sesión...');

        if (!usuario || !contrasena) {
            if (typeof window.mostrarErrorLogin === 'function') {
                window.mostrarErrorLogin('⚠️ Complete ambos campos');
            } else {
                mostrarErrorLogin('⚠️ Complete ambos campos');
            }
            return { success: false, error: 'Complete ambos campos' }; // ✅ RETURN CON OBJETO
        }

        const btn = document.querySelector('#loginForm button[type="submit"]');
        const textoOriginal = btn.innerHTML;
        btn.innerHTML = '⏳ Verificando...';
        btn.disabled = true;

        try {
            const resultado = await loginConAPI(usuario, contrasena);

            if (resultado.success && resultado.token) {
                // Guardar token
                localStorage.setItem('meca_token', resultado.token);
                
                // Asegurar que usuario tenga nombre_completo
                if (resultado.usuario && !resultado.usuario.nombre_completo) {
                    const db = getDB();
                    if (db) {
                        const { data: userData, error } = await db
                            .from('usuarios')
                            .select('nombre_completo')
                            .eq('id', resultado.usuario.id)
                            .single();
                        
                        if (!error && userData && userData.nombre_completo) {
                            resultado.usuario.nombre_completo = userData.nombre_completo;
                        }
                    }
                }
                
                // Guardar usuario
                localStorage.setItem('meca_usuario', JSON.stringify(resultado.usuario));
                
                // Establecer usuarioActual
                window.usuarioActual = resultado.usuario;
                console.log('✅ Login exitoso, nombre_completo:', window.usuarioActual?.nombre_completo);
                
                // Redirigir según rol
                if (window.usuarioActual.rol === 'AUDITOR') {
                    window.location.href = '/auditor';
                } else {
                    window.location.href = '/supervisor';
                }
                
                // ✅ RETURN - Login exitoso
                return resultado;
                
            } else {
                // ✅ Usar la función global para errores
                const errorMsg = resultado.error || 'Credenciales incorrectas';
                if (typeof window.mostrarErrorLogin === 'function') {
                    window.mostrarErrorLogin(errorMsg);
                } else {
                    mostrarErrorLogin(errorMsg);
                }
                btn.innerHTML = textoOriginal;
                btn.disabled = false;
                
                // ✅ RETURN - Login fallido (devuelve el resultado con error)
                return resultado;
            }
            
        } catch (error) {
            console.error('Error en login:', error);
            // ✅ Usar la función global para errores
            if (typeof window.mostrarErrorLogin === 'function') {
                window.mostrarErrorLogin('Error al iniciar sesión: ' + error.message);
            } else {
                mostrarErrorLogin('Error al iniciar sesión: ' + error.message);
            }
            btn.innerHTML = textoOriginal;
            btn.disabled = false;
            
            // ✅ RETURN - Error inesperado
            return { success: false, error: error.message };
        }
    }
    
    // ======================================================
    // FUNCIONES DE UTILIDAD - API CLIENT
    // ======================================================

    /**
     * mostrarErrorLogin - Muestra un mensaje de error en el login
     * @param {string} mensaje - Texto del error a mostrar
     */
    function mostrarErrorLogin(mensaje) {
        console.log('🔴 mostrarErrorLogin:', mensaje);
        
        // Buscar el elemento donde se muestra el error
        const errorDiv = document.getElementById('loginError');
        
        if (errorDiv) {
            // Establecer el texto del error
            errorDiv.textContent = mensaje;
            errorDiv.style.display = 'block';
            errorDiv.style.color = '#d93025';
            errorDiv.style.background = '#fff0f0';
            errorDiv.style.padding = '12px';
            errorDiv.style.borderRadius = '8px';
            errorDiv.style.border = '1px solid #ffcfcf';
            errorDiv.style.marginTop = '10px';
            errorDiv.style.marginBottom = '10px';
            
            // Ocultar automáticamente después de 4 segundos
            if (window.timeoutErrorLogin) {
                clearTimeout(window.timeoutErrorLogin);
            }
            window.timeoutErrorLogin = setTimeout(() => {
                errorDiv.style.display = 'none';
            }, 4000);
        } else {
            // Fallback: alert si no existe el elemento
            console.warn('⚠️ Elemento #loginError no encontrado en el DOM');
            alert('❌ ' + mensaje);
        }
    }

    // Exponer la función globalmente para que otros scripts la usen
    window.mostrarErrorLogin = mostrarErrorLogin;
    
    /**
     * loginConAPI - Llama al endpoint de login
     * @param {string} usuario - Nombre de usuario
     * @param {string} contrasena - Contraseña
     * @returns {Object} Respuesta del servidor
     */
    async function loginConAPI(usuario, contrasena) {
        const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ usuario, contrasena })
        });
        
        const data = await response.json();
        
        if (data.success && data.usuario) {
            // 🔴 CORREGIDO: Asegurar que nombre_completo esté presente
            let nombreCompleto = data.usuario.nombre || data.usuario.nombre_completo || usuario;
            
            // Si el nombre_completo no viene de la API, obtenerlo de BD
            if (!nombreCompleto || nombreCompleto === 'undefined' || nombreCompleto === 'null') {
                console.log('🔍 nombre_completo no vino de la API, buscando en BD...');
                const db = getDB();
                if (db) {
                    const { data: userData, error } = await db
                        .from('usuarios')
                        .select('nombre_completo')
                        .eq('usuario', usuario)
                        .single();
                    
                    if (!error && userData && userData.nombre_completo) {
                        nombreCompleto = userData.nombre_completo;
                        console.log('📋 nombre_completo obtenido desde BD:', nombreCompleto);
                    }
                }
            }
            
            // Actualizar el objeto usuario con el nombre correcto
            data.usuario.nombre_completo = nombreCompleto;
            
            // Guardar en localStorage
            localStorage.setItem('meca_usuario', JSON.stringify({
                id: data.usuario.id,
                usuario: data.usuario.usuario,
                nombre_completo: nombreCompleto,
                rol: data.usuario.rol
            }));
            
            // Actualizar usuarioActual
            usuarioActual = {
                id: data.usuario.id,
                usuario: data.usuario.usuario,
                nombre_completo: nombreCompleto,
                rol: data.usuario.rol
            };
            
            console.log('✅ usuarioActual guardado con nombre_completo:', nombreCompleto);
        }
        
        return data;
    }
    
    // ======================================================
    // Módulo: Auditor - Escuchas
    // ======================================================

    /**
     * getMisEscuchas - Obtiene las escuchas asignadas a un auditor
     * @param {string} auditor - Nombre del auditor
     * @returns {Array} Lista de escuchas asignadas
     */
    async function getMisEscuchas(auditor) {
        const response = await fetch(`/api/escuchas/mis-escuchas?auditor=${auditor}`);
        return await response.json();
    }
    
    /**
     * iniciarGestionEscucha - Marca una escucha como "en proceso"
     * @param {number} id - ID de la escucha
     * @returns {Object} Resultado de la operación
     */
    async function iniciarGestionEscucha(id) {
        const response = await fetch(`/api/escuchas/${id}/iniciar`, { method: 'POST' });
        return await response.json();
    }
    
    /**
     * reportarIncidencia - Reporta una incidencia en una escucha
     * @param {number} id - ID de la escucha
     * @param {string} motivo - Motivo de la incidencia
     * @returns {Object} Resultado de la operación
     */
    async function reportarIncidencia(id, motivo) {
        const response = await fetch(`/api/escuchas/${id}/incidencia`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ motivo })
        });
        return await response.json();
    }
    
    // ======================================================
    // Módulo: Auditor - Historial de Evaluaciones
    // ======================================================

    /**
     * getHistorial - Obtiene el historial de evaluaciones
     * @param {Object} filtros - Filtros opcionales (agente, fecha, etc.)
     * @returns {Array} Lista de evaluaciones
     */
    async function getHistorial(filtros = {}) {
        const params = new URLSearchParams(filtros).toString();
        const response = await fetch(`/api/evaluaciones?${params}`);
        if (!response.ok) throw new Error('Error al obtener historial');
        return await response.json();
    }
    
    // ======================================================
    // Módulo: Auditor - Eliminar Evaluación
    // ======================================================

    /**
     * eliminarEvaluacion - Elimina una evaluación por ID
     * @param {number} id - ID de la evaluación
     * @returns {Object} Resultado de la operación
     */
    async function eliminarEvaluacion(id) {
        const response = await fetch(`/api/evaluaciones/${id}`, { method: 'DELETE' });
        return await response.json();
    }
    
    // ======================================================
    // Módulo: Auditor - Agentes y Auditores
    // ======================================================

    /**
     * getAgentes - Obtiene todos los agentes (con autenticación)
     * @returns {Array} Lista de agentes
     */
    async function getAgentes() {
        const token = localStorage.getItem('meca_token');
        const response = await fetch('/api/agentes', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
    }

    /**
     * getAgentesCompleto - Obtiene agentes con datos completos
     * @returns {Array} Lista de agentes con todos los campos
     */
    async function getAgentesCompleto() {
        const token = localStorage.getItem('meca_token');
        const response = await fetch('/api/agentes/completo', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
    }
    
    /**
     * getAuditores - Obtiene lista de auditores
     * @returns {Array} Lista de auditores
     */
    async function getAuditores() {
        const response = await fetch('/api/usuarios/auditores');
        return await response.json();
    }

    // ======================================================
    // Módulo: Auditor - Guardar Evaluación
    // ======================================================

    /**
     * guardarEvaluacion - Guarda una evaluación completa
     * @param {Object} evaluacion - Datos de la evaluación
     * @returns {Object} Resultado con ID de la evaluación creada
     */
    // api-client.js - guardarEvaluacion()

    async function guardarEvaluacion(evaluacion) {
        const response = await fetch('/api/evaluaciones', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                id: evaluacion.id,
                timestamp: evaluacion.timestamp,
                fecha: evaluacion.fecha,
                fechaFormateada: evaluacion.fechaFormateada,
                ticketPSI: evaluacion.ticketPSI,
                agente: evaluacion.agente,
                evaluador: evaluacion.evaluador,
                idLlamada: evaluacion.idLlamada,
                fechaDescarga: evaluacion.fechaDescarga,
                totalENC: evaluacion.totalENC,
                totalECUF: evaluacion.totalECUF,
                totalECN: evaluacion.totalECN,
                notaFinal: evaluacion.notaFinal,
                rango: evaluacion.rango,
                detalles: evaluacion.detalles,
                fechaRegistro: evaluacion.fechaRegistro,
                tiempoAuditoria: evaluacion.tiempoAuditoria,
                tiempoAuditoriaFormateado: evaluacion.tiempoAuditoriaFormateado,
                
                // 🔴 NUEVO: Enviar el ID de la versión
                versionMatrizId: evaluacion.versionMatrizId
            })
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Error al guardar');
        }

        return await response.json();
    }
    
    // ======================================================
    // Módulo: Auditor - Gestionar Escucha
    // ======================================================

    /**
     * marcarEscuchaGestionada - Marca una escucha como gestionada
     * @param {number} id - ID de la escucha
     * @returns {Object} Resultado de la operación
     */
    async function marcarEscuchaGestionada(id) {
        const response = await fetch(`/api/escuchas/${id}/gestionar`, { 
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Error al marcar escucha');
        }

        return await response.json();
    }

    /**
     * cancelarGestionEscucha - Reactiva una escucha cancelando su gestión
     * @param {number} id - ID de la escucha
     * @returns {Object} Resultado de la operación
     */
    async function cancelarGestionEscucha(id) {
        const token = localStorage.getItem('meca_token');
        const response = await fetch(`/api/escuchas/${id}/cancelar`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Error al reactivar escucha');
        }
        return await response.json();
    }

    // ======================================================
    // Módulo: Auditor - Validaciones de Tickets
    // ======================================================

    /**
     * validarTicketDuplicado - Verifica si un ticket ya fue evaluado
     * @param {string} ticketPSI - Número de ticket PSI
     * @returns {Object} { exists: boolean, evaluacion: Object }
     */
    async function validarTicketDuplicado(ticketPSI) {
        const response = await fetch(`/api/evaluaciones/validar-ticket?ticket=${encodeURIComponent(ticketPSI)}`);

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Error al validar ticket');
        }

        return await response.json();
    }

    /**
     * reactivarEscuchaPorTicket - Reactiva una escucha por ticket PSI
     * @param {string} ticketPSI - Número de ticket PSI
     * @returns {Object} Resultado de la operación
     */
    async function reactivarEscuchaPorTicket(ticketPSI) {
        const response = await fetch(`/api/escuchas/reactivar?ticket=${encodeURIComponent(ticketPSI)}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Error al reactivar escucha');
        }

        return await response.json();
    }

    // ======================================================
    // Módulo: Auditor - Detalles de Evaluación
    // ======================================================

    /**
     * getDetallesEvaluacion - Obtiene detalles de una evaluación
     * @param {number} evaluacionId - ID de la evaluación
     * @returns {Object} Detalles de la evaluación
     */
    async function getDetallesEvaluacion(evaluacionId) {
        const response = await fetch(`/api/evaluaciones/${evaluacionId}/detalles`);

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || 'Error al obtener detalles');
        }

        return await response.json();
    }

    // ======================================================
    // Módulo: Supervisor - Reportes y Rankings
    // ======================================================

    /**
     * getKPIs - Obtiene indicadores clave de rendimiento
     * @returns {Object} KPIs del sistema
     */
    async function getKPIs() {
        const response = await fetch('/api/reportes/kpis');
        return await response.json();
    }

    /**
     * getRanking - Obtiene ranking de agentes
     * @returns {Array} Ranking de agentes por desempeño
     */
    async function getRanking() {
        const response = await fetch('/api/reportes/ranking');
        return await response.json();
    }

    /**
     * getEvolutivo - Obtiene datos evolutivos por período
     * @param {string} periodo - 'dia', 'semana', 'mes', 'trimestre', 'anio'
     * @returns {Object} Datos evolutivos agrupados
     */
    async function getEvolutivo(periodo = 'dia') {
        const response = await fetch(`/api/reportes/evolutivo?periodo=${periodo}`);
        return await response.json();
    }

    /**
     * getTopFallas - Obtiene las fallas más frecuentes
     * @returns {Array} Top de fallas
     */
    async function getTopFallas() {
        const response = await fetch('/api/reportes/top-fallas');
        return await response.json();
    }

    /**
     * getEvaluacionesConDetalles - Obtiene evaluaciones con detalles completos
     * @returns {Array} Evaluaciones con sus detalles
     */
    async function getEvaluacionesConDetalles() {
        const response = await fetch('/api/reportes/evaluaciones-con-detalles');
        if (!response.ok) throw new Error('Error al obtener evaluaciones con detalles');
        return await response.json();
    }

    /**
     * getLideres - Obtiene lista de líderes
     * @returns {Array} Líderes disponibles
     */
    async function getLideres() {
        const response = await fetch('/api/reportes/lideres');
        if (!response.ok) throw new Error('Error al obtener líderes');
        return await response.json();
    }

    // ======================================================
    // Módulo: Supervisor - Resúmenes por Categoría
    // ======================================================

    /**
     * getResumenPorLider - Obtiene resumen de desempeño por líder
     * @param {Object} filtros - Filtros opcionales
     * @returns {Array} Resumen por líder
     */
    async function getResumenPorLider(filtros = {}) {
        const token = localStorage.getItem('meca_token');
        const params = new URLSearchParams(filtros).toString();
        const url = params ? `/api/reportes/resumen-por-lider?${params}` : '/api/reportes/resumen-por-lider';
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) throw new Error('Error al obtener resumen por líder');
        return await response.json();
    }

    /**
     * getResumenPorUbicacion - Obtiene resumen por ubicación
     * @returns {Array} Resumen por ubicación
     */
    async function getResumenPorUbicacion() {
        const token = localStorage.getItem('meca_token');
        const response = await fetch('/api/reportes/resumen-por-ubicacion', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) throw new Error('Error al obtener resumen por ubicación');
        return await response.json();
    }

    /**
     * getResumenPorLocalidad - Obtiene resumen por localidad
     * @returns {Array} Resumen por localidad
     */
    async function getResumenPorLocalidad() {
        const token = localStorage.getItem('meca_token');
        const response = await fetch('/api/reportes/resumen-por-localidad', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) throw new Error('Error al obtener resumen por localidad');
        return await response.json();
    }

    // ======================================================
    // Módulo: Supervisor - Agentes por Categoría
    // ======================================================

    /**
     * getAgentesPorLider - Obtiene agentes de un líder específico
     * @param {string} lider - Nombre del líder
     * @returns {Array} Agentes del líder
     */
    async function getAgentesPorLider(lider) {
        const token = localStorage.getItem('meca_token');
        const response = await fetch(`/api/agentes?lider=${encodeURIComponent(lider)}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
    }

    /**
     * getAgentesPorUbicacion - Obtiene agentes por ubicación
     * @param {string} ubicacion - Nombre de la ubicación
     * @returns {Array} Agentes en esa ubicación
     */
    async function getAgentesPorUbicacion(ubicacion) {
        const token = localStorage.getItem('meca_token');
        const response = await fetch(`/api/agentes?ubicacion=${encodeURIComponent(ubicacion)}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
    }

    /**
     * getAgentesPorLocalidad - Obtiene agentes por localidad
     * @param {string} localidad - Nombre de la localidad
     * @returns {Array} Agentes en esa localidad
     */
    async function getAgentesPorLocalidad(localidad) {
        const token = localStorage.getItem('meca_token');
        const response = await fetch(`/api/agentes?localidad=${encodeURIComponent(localidad)}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
    }

    // ======================================================
    // Módulo: Supervisor - CRUD Agentes
    // ======================================================

    /**
     * crearAgente - Crea un nuevo agente
     * @param {Object} agente - Datos del agente
     * @returns {Object} Agente creado
     */
    async function crearAgente(agente) {
        const response = await fetch('/api/agentes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(agente)
        });
        return await response.json();
    }

    /**
     * actualizarAgente - Actualiza un agente existente
     * @param {number} id - ID del agente
     * @param {Object} datos - Datos a actualizar
     * @returns {Object} Agente actualizado
     */
    async function actualizarAgente(id, datos) {
        const response = await fetch(`/api/agentes/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datos)
        });
        return await response.json();
    }

    /**
     * eliminarAgente - Elimina un agente
     * @param {number} id - ID del agente
     * @returns {Object} Resultado de la operación
     */
    async function eliminarAgente(id) {
        const response = await fetch(`/api/agentes/${id}`, { method: 'DELETE' });
        return await response.json();
    }

    /**
     * getCategoriasUnicas - Obtiene categorías únicas de agentes
     * @returns {Array} Categorías disponibles
     */
    async function getCategoriasUnicas() {
        const token = localStorage.getItem('meca_token');
        const response = await fetch('/api/agentes/categorias', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) {
            throw new Error('Error al obtener categorías');
        }
        return await response.json();
    }

    /**
     * crearAgentesMasivo - Crea múltiples agentes desde un archivo
     * @param {Array} agentes - Lista de agentes a crear
     * @returns {Object} Resultado de la operación
     */
    async function crearAgentesMasivo(agentes) {
        const token = localStorage.getItem('meca_token');
        const response = await fetch('/api/agentes/masivo', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ agentes })
        });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        return await response.json();
    }

    // ======================================================
    // Módulo: Supervisor - CRUD Usuarios
    // ======================================================

    /**
     * getUsuarios - Obtiene todos los usuarios
     * @returns {Array} Lista de usuarios
     */
    async function getUsuarios() {
        const token = localStorage.getItem('meca_token');
        const response = await fetch('/api/usuarios', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        return await response.json();
    }

    /**
     * crearUsuario - Crea un nuevo usuario
     * @param {Object} usuario - Datos del usuario
     * @returns {Object} Usuario creado
     */
    async function crearUsuario(usuario) {
        const token = localStorage.getItem('meca_token');
        const response = await fetch('/api/usuarios', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(usuario)
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al crear usuario');
        }
        return await response.json();
    }

    /**
     * actualizarUsuario - Actualiza un usuario existente
     * @param {number} id - ID del usuario
     * @param {Object} datos - Datos a actualizar
     * @returns {Object} Usuario actualizado
     */
    async function actualizarUsuario(id, datos) {
        const token = localStorage.getItem('meca_token');
        const response = await fetch(`/api/usuarios/${id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(datos)
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al actualizar usuario');
        }
        return await response.json();
    }

    /**
     * eliminarUsuario - Elimina un usuario
     * @param {number} id - ID del usuario
     * @returns {Object} Resultado de la operación
     */
    async function eliminarUsuario(id) {
        const token = localStorage.getItem('meca_token');
        const response = await fetch(`/api/usuarios/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al eliminar usuario');
        }
        return await response.json();
    }

    /**
     * cambiarPassword - Cambia la contraseña de un usuario
     * @param {number} usuarioId - ID del usuario
     * @param {string} nuevaPassword - Nueva contraseña (texto plano)
     * @param {boolean} esPrimerLogin - Indica si es primer login
     * @returns {Object} Resultado de la operación
     */
    async function cambiarPassword(usuarioId, nuevaPassword, esPrimerLogin = false) {
        const token = localStorage.getItem('meca_token');
        const response = await fetch(`/api/usuarios/${usuarioId}/password`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ password: nuevaPassword, primerLogin: esPrimerLogin })
        });
        if (!response.ok) throw new Error('Error al cambiar contraseña');
        return await response.json();
    }

    // ======================================================
    // Módulo: Supervisor - CRUD Roles
    // ======================================================

    /**
     * getRoles - Obtiene todos los roles
     * @returns {Array} Lista de roles
     */
    async function getRoles() {
        const token = localStorage.getItem('meca_token');
        const response = await fetch('/api/roles', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        return await response.json();
    }

    /**
     * crearRol - Crea un nuevo rol
     * @param {Object} rol - Datos del rol
     * @returns {Object} Rol creado
     */
    async function crearRol(rol) {
        const token = localStorage.getItem('meca_token');
        const response = await fetch('/api/roles', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(rol)
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al crear rol');
        }
        return await response.json();
    }

    /**
     * actualizarRol - Actualiza un rol existente
     * @param {number} id - ID del rol
     * @param {Object} datos - Datos a actualizar
     * @returns {Object} Rol actualizado
     */
    async function actualizarRol(id, datos) {
        const token = localStorage.getItem('meca_token');
        const response = await fetch(`/api/roles/${id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(datos)
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al actualizar rol');
        }
        return await response.json();
    }

    /**
     * eliminarRol - Elimina un rol
     * @param {number} id - ID del rol
     * @returns {Object} Resultado de la operación
     */
    async function eliminarRol(id) {
        const token = localStorage.getItem('meca_token');
        const response = await fetch(`/api/roles/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al eliminar rol');
        }
        return await response.json();
    }

    // ======================================================
    // Módulo: Supervisor - PDA (Plan de Desarrollo)
    // ======================================================

    /**
     * getPDAHistorial - Obtiene historial de PDA
     * @returns {Array} Lista de PDA completados
     */
    async function getPDAHistorial() {
        const token = localStorage.getItem('meca_token');
        const response = await fetch('/api/pda/historial', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) {
            if (response.status === 401) throw new Error('No autorizado');
            return [];
        }
        return await response.json();
    }

    /**
     * getPDAPendientes - Obtiene PDA pendientes
     * @returns {Array} Lista de PDA pendientes
     */
    async function getPDAPendientes() {
        const token = localStorage.getItem('meca_token');
        const response = await fetch('/api/pda/pendientes', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) {
            if (response.status === 401) throw new Error('No autorizado');
            return [];
        }
        return await response.json();
    }

    /**
     * getPDASeguimiento - Obtiene PDA en seguimiento
     * @returns {Array} Lista de PDA en seguimiento
     */
    async function getPDASeguimiento() {
        const token = localStorage.getItem('meca_token');
        const response = await fetch('/api/pda/seguimiento', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) {
            if (response.status === 401) throw new Error('No autorizado');
            return [];
        }
        return await response.json();
    }

    /**
     * getPDADetalle - Obtiene detalle de un PDA específico
     * @param {number} pdaId - ID del PDA
     * @returns {Object} Datos completos del PDA
     */
    async function getPDADetalle(pdaId) {
        const token = localStorage.getItem('meca_token');
        const response = await fetch(`/api/pda/${pdaId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) {
            if (response.status === 401) throw new Error('No autorizado');
            if (response.status === 404) throw new Error('PDA no encontrado');
            throw new Error(`HTTP ${response.status}`);
        }
        return await response.json();
    }

    /**
     * crearPDA - Crea un nuevo PDA
     * @param {Object} pda - Datos del PDA
     * @returns {Object} PDA creado
     */
    async function crearPDA(pda) {
        const response = await fetch('/api/pda', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(pda)
        });
        return await response.json();
    }

    /**
     * actualizarPDA - Actualiza un PDA existente
     * @param {number} id - ID del PDA
     * @param {Object} datos - Datos a actualizar
     * @returns {Object} PDA actualizado
     */
    async function actualizarPDA(id, datos) {
        const response = await fetch(`/api/pda/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datos)
        });
        return await response.json();
    }

    /**
     * completarAccionPDA - Marca una acción de PDA como completada
     * @param {number} accionId - ID de la acción
     * @param {Object} datos - Datos de la acción completada
     * @returns {Object} Resultado de la operación
     */
    async function completarAccionPDA(accionId, datos) {
        const response = await fetch(`/api/pda/acciones/${accionId}/completar`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datos)
        });
        return await response.json();
    }

    // ======================================================
    // Módulo: Supervisor - Versiones del Sistema
    // ======================================================

    /**
     * getVersiones - Obtiene todas las versiones del sistema
     * @param {string} tipo - 'auditor', 'supervisor' o 'todos'
     * @returns {Array} Lista de versiones
     */
    async function getVersiones(tipo = 'todos') {
        const token = localStorage.getItem('meca_token');
        const response = await fetch(`/api/versiones?tipo=${tipo}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) throw new Error('Error al obtener versiones');
        return await response.json();
    }

    /**
     * publicarVersion - Publica una nueva versión
     * @param {Object} versionData - Datos de la versión
     * @param {File} archivoHtml - Archivo HTML de la versión
     * @returns {Object} Versión publicada
     */
    async function publicarVersion(versionData, archivoHtml) {
        const formData = new FormData();
        formData.append('version', versionData.version);
        formData.append('tipo', versionData.tipo);
        formData.append('descripcion', versionData.descripcion || '');
        formData.append('publicado_por', versionData.publicado_por || 'Administrador');
        formData.append('archivo', archivoHtml);

        const response = await fetch('/api/versiones', {
            method: 'POST',
            body: formData
        });

        if (!response.ok) throw new Error('Error al publicar versión');
        return await response.json();
    }

    /**
     * activarVersion - Activa una versión del sistema
     * @param {number} id - ID de la versión
     * @param {string} tipo - 'auditor' o 'supervisor'
     * @returns {Object} Resultado de la operación
     */
    async function activarVersion(id, tipo) {
        const response = await fetch(`/api/versiones/${id}/activar`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' }
        });

        if (!response.ok) throw new Error('Error al activar versión');
        return await response.json();
    }

    /**
     * eliminarVersion - Elimina una versión del sistema
     * @param {number} id - ID de la versión
     * @returns {Object} Resultado de la operación
     */
    async function eliminarVersion(id) {
        const response = await fetch(`/api/versiones/${id}`, {
            method: 'DELETE'
        });

        if (!response.ok) throw new Error('Error al eliminar versión');
        return await response.json();
    }

    // ======================================================
    // Módulo: Supervisor - Exportaciones
    // ======================================================

    /**
     * exportarPDA - Exporta reporte de PDA en CSV
     * @returns {Array} Datos de PDA para exportar
     */
    async function exportarPDA() {
        const response = await fetch('/api/pda/exportar');
        if (!response.ok) throw new Error('Error al exportar PDA');
        return await response.json();
    }

    /**
     * exportarFrentes - Exporta análisis por frentes
     * @param {Array} evaluaciones - Evaluaciones a exportar
     * @returns {Array} Datos de frentes para exportar
     */
    async function exportarFrentes(evaluaciones) {
        const response = await fetch('/api/reportes/exportar-frentes');
        if (!response.ok) throw new Error('Error al exportar frentes');
        return await response.json();
    }

    /**
     * exportarUsuarios - Exporta lista de usuarios a CSV
     * @returns {Array} Datos de usuarios para exportar
     */
    async function exportarUsuarios() {
        const token = localStorage.getItem('meca_token');
        const response = await fetch('/api/usuarios/exportar', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) {
            throw new Error('Error al exportar usuarios');
        }
        return await response.json();
    }

    /**
     * exportarAgentes - Exporta lista de agentes a CSV
     * @returns {Array} Datos de agentes para exportar
     */
    async function exportarAgentes() {
        const token = localStorage.getItem('meca_token');
        const response = await fetch('/api/agentes/exportar', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) {
            throw new Error('Error al exportar agentes');
        }
        return await response.json();
    }

    // ======================================================
    // Módulo: Supervisor - Estado de Base de Datos
    // ======================================================

    /**
     * getEstadoBD - Obtiene estado completo de la base de datos
     * @returns {Object} Estado de BD (tamaño, tablas, etc.)
     */
    async function getEstadoBD() {
        const token = localStorage.getItem('meca_token');
        const response = await fetch('/api/estado-bd', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) {
            throw new Error('Error al obtener estado de BD');
        }
        return await response.json();
    }

    /**
     * getTamanioTablas - Obtiene tamaño de cada tabla
     * @returns {Array} Tamaño por tabla
     */
    async function getTamanioTablas() {
        const token = localStorage.getItem('meca_token');
        const response = await fetch('/api/estado-bd/tablas', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) {
            throw new Error('Error al obtener tamaño de tablas');
        }
        return await response.json();
    }

    // ======================================================
    // Módulo: Supervisor - Sesiones de Usuario
    // ======================================================

    /**
     * getSesionesUsuario - Obtiene sesiones de un usuario
     * @param {number} usuarioId - ID del usuario
     * @param {boolean} soloActivas - Solo sesiones activas
     * @returns {Array} Lista de sesiones
     */
    async function getSesionesUsuario(usuarioId, soloActivas = false) {
        const token = localStorage.getItem('meca_token');
        const url = soloActivas 
            ? `/api/sesiones/usuarios/${usuarioId}?activas=true`
            : `/api/sesiones/usuarios/${usuarioId}`;
        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) throw new Error('Error al obtener sesiones');
        return await response.json();
    }

    /**
     * cerrarSesion - Cierra una sesión específica
     * @param {string} sessionToken - Token de la sesión a cerrar
     * @returns {Object} Resultado de la operación
     */
    async function cerrarSesion(sessionToken) {
        const token = localStorage.getItem('meca_token');
        const response = await fetch('/api/sesiones/cerrar', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ sessionToken })
        });
        if (!response.ok) throw new Error('Error al cerrar sesión');
        return await response.json();
    }

    /**
     * cerrarTodasSesiones - Cierra todas las sesiones de un usuario
     * @param {number} usuarioId - ID del usuario
     * @returns {Object} Resultado de la operación
     */
    async function cerrarTodasSesiones(usuarioId) {
        const token = localStorage.getItem('meca_token');
        const response = await fetch(`/api/sesiones/usuarios/${usuarioId}/cerrar-todas`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) throw new Error('Error al cerrar sesiones');
        return await response.json();
    }

    // ======================================================
    // Módulo: Supervisor - Escuchas (Lotes y Tickets)
    // ======================================================

    /**
     * getLotesEscuchas - Obtiene todos los lotes de escuchas
     * @returns {Array} Lista de lotes
     */
    async function getLotesEscuchas() {
        const response = await fetch('/api/escuchas/lotes');
        return await response.json();
    }

    /**
     * getTicketsPorLote - Obtiene tickets de un lote específico
     * @param {number} loteId - ID del lote
     * @returns {Array} Tickets del lote
     */
    async function getTicketsPorLote(loteId) {
        const response = await fetch(`/api/escuchas/lotes/${loteId}/tickets`);
        return await response.json();
    }

    /**
     * activarLote - Activa un lote de escuchas
     * @param {number} loteId - ID del lote
     * @returns {Object} Resultado de la operación
     */
    async function activarLote(loteId) {
        const response = await fetch(`/api/escuchas/lotes/${loteId}/activar`, { method: 'PUT' });
        return await response.json();
    }

    /**
     * eliminarLote - Elimina un lote de escuchas
     * @param {number} loteId - ID del lote
     * @returns {Object} Resultado de la operación
     */
    async function eliminarLote(loteId) {
        const response = await fetch(`/api/escuchas/lotes/${loteId}`, { method: 'DELETE' });
        return await response.json();
    }

    // ======================================================
    // Módulo: Supervisor - Solicitudes y Requerimientos
    // ======================================================

    /**
     * getSolicitudesPorUsuario - Obtiene solicitudes de un usuario
     * @param {number} usuarioId - ID del usuario
     * @returns {Array} Solicitudes del usuario
     */
    async function getSolicitudesPorUsuario(usuarioId) {
        const token = localStorage.getItem('meca_token');
        const response = await fetch(`/api/solicitudes/usuario/${usuarioId}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();

        if (result && result.data && Array.isArray(result.data)) {
            return result.data;
        }
        if (Array.isArray(result)) {
            return result;
        }
        console.warn('Respuesta inesperada de API:', result);
        return [];
    }

    /**
     * getTodasSolicitudes - Obtiene todas las solicitudes (admin)
     * @returns {Array} Todas las solicitudes
     */
    async function getTodasSolicitudes() {
        const token = localStorage.getItem('meca_token');
        const response = await fetch('/api/solicitudes', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            throw new Error(`Error ${response.status}: ${response.statusText}`);
        }

        const result = await response.json();

        if (result && result.data && Array.isArray(result.data)) {
            return result.data;
        }
        if (Array.isArray(result)) {
            return result;
        }
        console.warn('Respuesta inesperada de API:', result);
        return [];
    }

    // ======================================================
    // Módulo: Supervisor - Pestañas del Sistema
    // ======================================================

    /**
     * getPestanasDisponibles - Obtiene todas las pestañas disponibles
     * @returns {Array} Pestañas del sistema
     */
    async function getPestanasDisponibles() {
        const response = await fetch('/api/pestanas');
        return await response.json();
    }

    /**
     * getPestanasPorRol - Obtiene pestañas permitidas para un rol
     * @param {number} rolId - ID del rol
     * @returns {Array} Pestañas permitidas
     */
    async function getPestanasPorRol(rolId) {
        const response = await fetch(`/api/pestanas/rol/${rolId}`);
        return await response.json();
    }

    // ======================================================
    // Módulo: Auditor - Estructura de Evaluación
    // ======================================================

    /**
     * getEstructuraEvaluacion - Obtiene la estructura completa de evaluación
     * @returns {Object} Estructura con frentes, atributos y submotivos
     */
    async function getEstructuraEvaluacion() {
        const token = localStorage.getItem('meca_token');
        const response = await fetch('/api/evaluacion/estructura', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Error al cargar estructura');
        return await response.json();
    }

    // ======================================================
    // Módulo: Supervisor - Administración de Matriz
    // ======================================================

    // ======================================================
    // GET FRENTES - SOLO VERSIÓN ACTIVA
    // ======================================================
    async function getFrentes() {
        const token = localStorage.getItem('meca_token');
        
        try {
            // 1. Obtener la versión activa
            const versionActiva = await getVersionActiva();
            if (!versionActiva) {
                console.warn('⚠️ No hay versión activa');
                return [];
            }
            
            console.log(`📌 getFrentes() - Versión activa: ${versionActiva.version} (ID: ${versionActiva.id})`);
            
            // 2. Obtener frentes de la versión activa
            const response = await fetch('/api/query', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    table: 'version_frentes',
                    operation: 'select',
                    selectFields: `
                        id,
                        codigo,
                        nombre,
                        peso_maximo,
                        orden,
                        activo,
                        created_at,
                        updated_at
                    `,
                    filters: [
                        { type: 'eq', column: 'version_id', value: versionActiva.id },
                        { type: 'eq', column: 'activo', value: true }
                    ]
                })
            });
            
            if (!response.ok) throw new Error('Error al cargar frentes');
            
            const result = await response.json();
            
            // Asegurar que los datos tengan el formato esperado
            return (result.data || []).map(item => ({
                id: item.id,
                codigo: item.codigo,
                nombre: item.nombre,
                peso_maximo: parseFloat(item.peso_maximo) || 0,
                orden: parseInt(item.orden) || 0,
                activo: item.activo === true || item.activo === 'true'
            }));
            
        } catch (error) {
            console.error('❌ Error en getFrentes:', error);
            return [];
        }
    }

    // ======================================================
    // CREAR FRENTE - USAR VERSION_FRENTES
    // ======================================================
    async function crearFrente(data) {
        const token = localStorage.getItem('meca_token');
        
        const response = await fetch('/api/query', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                table: 'version_frentes',
                operation: 'insert',
                data: {
                    codigo: data.codigo,
                    nombre: data.nombre,
                    peso_maximo: data.peso_maximo,
                    orden: data.orden || 0,
                    activo: data.activo !== undefined ? data.activo : true,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al crear frente');
        }
        
        const result = await response.json();
        return result.data && result.data.length > 0 ? result.data[0] : null;
    }

    // ======================================================
    // ACTUALIZAR FRENTE - USAR VERSION_FRENTES
    // ======================================================
    async function actualizarFrente(id, data) {
        const token = localStorage.getItem('meca_token');
        
        const response = await fetch('/api/query', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                table: 'version_frentes',
                operation: 'update',
                data: {
                    codigo: data.codigo,
                    nombre: data.nombre,
                    peso_maximo: data.peso_maximo,
                    orden: data.orden || 0,
                    activo: data.activo !== undefined ? data.activo : true,
                    updated_at: new Date().toISOString()
                },
                filters: [
                    { type: 'eq', column: 'id', value: parseInt(id) }
                ]
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al actualizar frente');
        }
        
        const result = await response.json();
        return result.data && result.data.length > 0 ? result.data[0] : null;
    }

    // ======================================================
    // ELIMINAR FRENTE - USAR VERSION_FRENTES
    // ======================================================
    async function eliminarFrente(id) {
        const token = localStorage.getItem('meca_token');
        
        const response = await fetch('/api/query', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                table: 'version_frentes',
                operation: 'delete',
                filters: [
                    { type: 'eq', column: 'id', value: parseInt(id) }
                ]
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al eliminar frente');
        }
        
        const result = await response.json();
        
        if (result.error) {
            throw new Error(result.error);
        }
        
        return {
            success: true,
            message: 'Frente eliminado correctamente',
            data: result.data,
            count: result.count
        };
    }


    // ======================================================
    // GET ATRIBUTOS - SOLO VERSIÓN ACTIVA (SIN JOIN)
    // ======================================================
    async function getAtributos(frenteId) {
        const token = localStorage.getItem('meca_token');
        
        try {
            // 1. Obtener la versión activa
            const versionActiva = await getVersionActiva();
            if (!versionActiva) {
                console.warn('⚠️ No hay versión activa');
                return [];
            }
            
            console.log(`📌 getAtributos() - Versión activa: ${versionActiva.version} (ID: ${versionActiva.id})`);
            
            // 2. Primero, obtener los frentes de la versión activa
            const frentesResponse = await fetch('/api/query', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    table: 'version_frentes',
                    operation: 'select',
                    selectFields: 'id',
                    filters: [
                        { type: 'eq', column: 'version_id', value: versionActiva.id },
                        { type: 'eq', column: 'activo', value: true }
                    ]
                })
            });
            
            if (!frentesResponse.ok) throw new Error('Error al obtener frentes de la versión activa');
            const frentesResult = await frentesResponse.json();
            const frenteIds = (frentesResult.data || []).map(f => f.id);
            
            if (frenteIds.length === 0) {
                console.log('⚠️ No hay frentes en la versión activa');
                return [];
            }
            
            // 3. Construir filtro para atributos (solo de los frentes de la versión activa)
            let filters = [
                { type: 'eq', column: 'activo', value: true }
            ];
            
            // Si se pasa frenteId, filtrar por él
            if (frenteId) {
                filters.push({ type: 'eq', column: 'version_frente_id', value: parseInt(frenteId) });
            } else {
                // Si no se pasa frenteId, filtrar por los frentes de la versión activa
                filters.push({ type: 'in', column: 'version_frente_id', values: frenteIds });
            }
            
            // 4. Obtener atributos
            const response = await fetch('/api/query', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    table: 'version_atributos',
                    operation: 'select',
                    selectFields: `
                        id,
                        nombre,
                        peso_maximo,
                        orden,
                        activo,
                        version_frente_id as frente_id
                    `,
                    filters: filters
                })
            });
            
            if (!response.ok) throw new Error('Error al cargar atributos');
            
            const result = await response.json();
            
            return (result.data || []).map(item => ({
                id: item.id,
                nombre: item.nombre,
                peso_maximo: parseFloat(item.peso_maximo) || 0,
                orden: parseInt(item.orden) || 0,
                activo: item.activo === true || item.activo === 'true',
                frente_id: item.frente_id || item.version_frente_id
            }));
            
        } catch (error) {
            console.error('❌ Error en getAtributos:', error);
            return [];
        }
    }

    // ======================================================
    // CREAR ATRIBUTO - USAR /api/query
    // ======================================================
    async function crearAtributo(data) {
        const token = localStorage.getItem('meca_token');
        
        // 🔴 CAMBIAR: Usar /api/query en lugar de /api/matriz/atributos
        const response = await fetch('/api/query', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                table: 'version_atributos',
                operation: 'insert',
                data: {
                    version_frente_id: data.frente_id,
                    nombre: data.nombre,
                    peso_maximo: data.peso_maximo,
                    orden: data.orden || 0,
                    activo: data.activo !== undefined ? data.activo : true,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al crear atributo');
        }
        
        const result = await response.json();
        return result.data && result.data.length > 0 ? result.data[0] : null;
    }

    // ======================================================
    // ACTUALIZAR ATRIBUTO - USAR /api/query
    // ======================================================
    async function actualizarAtributo(id, data) {
        const token = localStorage.getItem('meca_token');
        
        // 🔴 CAMBIAR: Usar /api/query en lugar de /api/matriz/atributos/:id
        const response = await fetch('/api/query', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                table: 'version_atributos',
                operation: 'update',
                data: {
                    nombre: data.nombre,
                    peso_maximo: data.peso_maximo,
                    orden: data.orden || 0,
                    activo: data.activo !== undefined ? data.activo : true,
                    updated_at: new Date().toISOString()
                },
                filters: [
                    { type: 'eq', column: 'id', value: parseInt(id) }
                ]
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al actualizar atributo');
        }
        
        const result = await response.json();
        return result.data && result.data.length > 0 ? result.data[0] : null;
    }

    // ======================================================
    // ELIMINAR ATRIBUTO - USAR /api/query
    // ======================================================
    async function eliminarAtributo(id) {
        const token = localStorage.getItem('meca_token');
        
        const response = await fetch('/api/query', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                table: 'version_atributos',
                operation: 'delete',
                filters: [
                    { type: 'eq', column: 'id', value: parseInt(id) }
                ]
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al eliminar atributo');
        }
        
        const result = await response.json();
        
        if (result.error) {
            throw new Error(result.error);
        }
        
        return {
            success: true,
            message: 'Atributo eliminado correctamente',
            data: result.data,
            count: result.count
        };
    }

    // ======================================================
    // CREAR SUB-MOTIVO - USAR /api/query
    // ======================================================
    async function crearSubMotivo(data) {
        const token = localStorage.getItem('meca_token');
        
        const response = await fetch('/api/query', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                table: 'version_sub_motivos',
                operation: 'insert',
                data: {
                    version_atributo_id: data.atributo_id,
                    codigo: data.codigo,
                    descripcion: data.descripcion,
                    peso_individual: data.peso_individual,
                    orden: data.orden || 0,
                    activo: data.activo !== undefined ? data.activo : true,
                    created_at: new Date().toISOString(),
                    updated_at: new Date().toISOString()
                }
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al crear sub-motivo');
        }
        
        const result = await response.json();
        return result.data && result.data.length > 0 ? result.data[0] : null;
    }

    // ======================================================
    // ACTUALIZAR SUB-MOTIVO - USAR /api/query
    // ======================================================
    async function actualizarSubMotivo(id, data) {
        const token = localStorage.getItem('meca_token');
        
        const response = await fetch('/api/query', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                table: 'version_sub_motivos',
                operation: 'update',
                data: {
                    codigo: data.codigo,
                    descripcion: data.descripcion,
                    peso_individual: data.peso_individual,
                    orden: data.orden || 0,
                    activo: data.activo !== undefined ? data.activo : true,
                    updated_at: new Date().toISOString()
                },
                filters: [
                    { type: 'eq', column: 'id', value: parseInt(id) }
                ]
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al actualizar sub-motivo');
        }
        
        const result = await response.json();
        return result.data && result.data.length > 0 ? result.data[0] : null;
    }

    // ======================================================
    // GET SUB-MOTIVOS - SOLO VERSIÓN ACTIVA (SIN JOIN)
    // ======================================================
    async function getSubMotivos(atributoId) {
        const token = localStorage.getItem('meca_token');
        
        try {
            // 1. Obtener la versión activa
            const versionActiva = await getVersionActiva();
            if (!versionActiva) {
                console.warn('⚠️ No hay versión activa');
                return [];
            }
            
            console.log(`📌 getSubMotivos() - Versión activa: ${versionActiva.version} (ID: ${versionActiva.id})`);
            
            // 2. Obtener los frentes de la versión activa
            const frentesResponse = await fetch('/api/query', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    table: 'version_frentes',
                    operation: 'select',
                    selectFields: 'id',
                    filters: [
                        { type: 'eq', column: 'version_id', value: versionActiva.id },
                        { type: 'eq', column: 'activo', value: true }
                    ]
                })
            });
            
            if (!frentesResponse.ok) throw new Error('Error al obtener frentes de la versión activa');
            const frentesResult = await frentesResponse.json();
            const frenteIds = (frentesResult.data || []).map(f => f.id);
            
            if (frenteIds.length === 0) {
                console.log('⚠️ No hay frentes en la versión activa');
                return [];
            }
            
            // 3. Obtener los atributos de esos frentes
            const atributosResponse = await fetch('/api/query', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    table: 'version_atributos',
                    operation: 'select',
                    selectFields: 'id',
                    filters: [
                        { type: 'in', column: 'version_frente_id', values: frenteIds },
                        { type: 'eq', column: 'activo', value: true }
                    ]
                })
            });
            
            if (!atributosResponse.ok) throw new Error('Error al obtener atributos de la versión activa');
            const atributosResult = await atributosResponse.json();
            const atributoIds = (atributosResult.data || []).map(a => a.id);
            
            if (atributoIds.length === 0) {
                console.log('⚠️ No hay atributos en la versión activa');
                return [];
            }
            
            // 4. Construir filtro para sub-motivos
            let filters = [
                { type: 'eq', column: 'activo', value: true }
            ];
            
            if (atributoId) {
                // Si se pasa atributoId, filtrar por él
                filters.push({ type: 'eq', column: 'version_atributo_id', value: parseInt(atributoId) });
            } else {
                // Si no se pasa atributoId, filtrar por todos los atributos de la versión activa
                filters.push({ type: 'in', column: 'version_atributo_id', values: atributoIds });
            }
            
            // 5. Obtener sub-motivos
            const response = await fetch('/api/query', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    table: 'version_sub_motivos',
                    operation: 'select',
                    selectFields: `
                        id,
                        codigo,
                        descripcion,
                        peso_individual,
                        orden,
                        activo,
                        version_atributo_id as atributo_id
                    `,
                    filters: filters
                })
            });
            
            if (!response.ok) throw new Error('Error al cargar sub-motivos');
            
            const result = await response.json();
            
            return (result.data || []).map(item => ({
                id: item.id,
                codigo: item.codigo,
                descripcion: item.descripcion,
                peso_individual: parseFloat(item.peso_individual) || 0,
                orden: parseInt(item.orden) || 0,
                activo: item.activo === true || item.activo === 'true',
                atributo_id: item.atributo_id || item.version_atributo_id
            }));
            
        } catch (error) {
            console.error('❌ Error en getSubMotivos:', error);
            return [];
        }
    }


    // ======================================================
    // ELIMINAR SUB-MOTIVO - USAR /api/query
    // ======================================================
    async function eliminarSubMotivo(id) {
        const token = localStorage.getItem('meca_token');
        
        // 🔴 CAMBIAR: Usar /api/query en lugar de /api/matriz/sub-motivos/:id
        const response = await fetch('/api/query', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                table: 'version_sub_motivos',
                operation: 'delete',
                filters: [
                    { type: 'eq', column: 'id', value: parseInt(id) }
                ]
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al eliminar sub-motivo');
        }
        
        const result = await response.json();
        
        // Verificar si se eliminó correctamente
        if (result.error) {
            throw new Error(result.error);
        }
        
        return { 
            success: true, 
            message: 'Sub-motivo eliminado correctamente',
            data: result.data,
            count: result.count
        };
    }

    /**
     * crearVersionMatriz - Crea una nueva versión de la matriz
     * @param {Object} data - Datos de la versión
     * @returns {Object} Versión creada
     */
    async function crearVersionMatriz(data) {
        const token = localStorage.getItem('meca_token');
        const response = await fetch('/api/matriz/versiones', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        if (!response.ok) throw new Error('Error al crear versión');
        return await response.json();
    }

    /**
     * activarVersionMatriz - Activa una versión de la matriz
     * @param {number} id - ID de la versión
     * @returns {Object} Resultado de la operación
     */
    async function activarVersionMatriz(id) {
        const token = localStorage.getItem('meca_token');
        const response = await fetch(`/api/matriz/versiones/${id}/activar`, {
            method: 'PUT',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Error al activar versión');
        return await response.json();
    }

    /**
     * recalcularTodasEvaluaciones - Recalcula todas las evaluaciones con la matriz actual
     * @returns {Object} Resultado de la operación
     */
    async function recalcularTodasEvaluaciones() {
        const token = localStorage.getItem('meca_token');
        const response = await fetch('/api/matriz/recalcular', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Error al recalcular evaluaciones');
        return await response.json();
    }

    // --- VALIDACIONES DE MATRIZ ---

    /**
     * validarSubMotivo - Valida el peso de un sub-motivo
     * @param {number} atributo_id - ID del atributo
     * @param {number} nuevo_peso - Nuevo peso a validar
     * @param {number} sub_motivo_id - ID del sub-motivo (opcional)
     * @param {number} excluir_id - ID a excluir (opcional)
     * @returns {Object} Resultado de la validación
     */
    async function validarSubMotivo(atributo_id, nuevo_peso, sub_motivo_id = null, excluir_id = null) {
        const token = localStorage.getItem('meca_token');
        const response = await fetch('/api/matriz/validar/sub-motivos', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ atributo_id, sub_motivo_id, nuevo_peso, excluir_id })
        });
        const data = await response.json();
        return { ...data, status: response.status };
    }

    /**
     * validarAtributo - Valida el peso de un atributo
     * @param {number} frente_id - ID del frente
     * @param {number} nuevo_peso - Nuevo peso a validar
     * @param {number} atributo_id - ID del atributo (opcional)
     * @param {number} excluir_id - ID a excluir (opcional)
     * @returns {Object} Resultado de la validación
     */
    async function validarAtributo(frente_id, nuevo_peso, atributo_id = null, excluir_id = null) {
        const token = localStorage.getItem('meca_token');
        const response = await fetch('/api/matriz/validar/atributos', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ frente_id, atributo_id, nuevo_peso, excluir_id })
        });
        return await response.json();
    }

    /**
     * validarFrente - Valida el peso de un frente
     * @param {number} nuevo_peso - Nuevo peso a validar
     * @param {number} frente_id - ID del frente (opcional)
     * @param {number} excluir_id - ID a excluir (opcional)
     * @returns {Object} Resultado de la validación
     */
    async function validarFrente(nuevo_peso, frente_id = null, excluir_id = null) {
        const token = localStorage.getItem('meca_token');
        const response = await fetch('/api/matriz/validar/frentes', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ frente_id, nuevo_peso, excluir_id })
        });
        return await response.json();
    }

    // ======================================================
    // Módulo: Supervisor - Reportes Avanzados
    // ======================================================

    /**
     * getMesesDisponibles - Obtiene meses con evaluaciones
     * @returns {Array} Meses disponibles
     */
    async function getMesesDisponibles() {
        const token = localStorage.getItem('meca_token');
        const response = await fetch('/api/reportes/meses-disponibles', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) {
            let errorMsg;
            try {
                const error = await response.json();
                errorMsg = error.error || error.message || `HTTP ${response.status}`;
            } catch(e) {
                errorMsg = `HTTP ${response.status}`;
            }
            throw new Error(errorMsg);
        }
        return await response.json();
    }

    /**
     * getErroresAuditores - Obtiene errores por auditor
     * @param {number} periodoDias - Días a considerar
     * @param {string} auditor - Auditor específico (opcional)
     * @returns {Object} Datos de errores por auditor
     */
    async function getErroresAuditores(periodoDias = 30, auditor = 'todos') {
        const token = localStorage.getItem('meca_token');
        const response = await fetch(`/api/reportes/errores-auditores?periodo=${periodoDias}&auditor=${auditor}`, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) {
            let errorMsg;
            try {
                const error = await response.json();
                errorMsg = error.error || error.message || `HTTP ${response.status}`;
            } catch(e) {
                errorMsg = `HTTP ${response.status}`;
            }
            throw new Error(errorMsg);
        }
        return await response.json();
    }

    /**
     * getAuditoresActivos - Obtiene auditores activos
     * @returns {Array} Auditores activos
     */
    async function getAuditoresActivos() {
        const token = localStorage.getItem('meca_token');
        const response = await fetch('/api/usuarios/auditores-activos', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) {
            let errorMsg;
            try {
                const error = await response.json();
                errorMsg = error.error || error.message || `HTTP ${response.status}`;
            } catch(e) {
                errorMsg = `HTTP ${response.status}`;
            }
            throw new Error(errorMsg);
        }
        return await response.json();
    }

    /**
     * getEvaluacionesPorAgente - Obtiene evaluaciones de un agente específico
     * @param {string} agente - Nombre del agente
     * @returns {Array} Evaluaciones del agente
     */
    async function getEvaluacionesPorAgente(agente) {
        const response = await fetch(`/api/evaluaciones?agente=${encodeURIComponent(agente)}`);
        return await response.json();
    }

    

    // ======================================================
    // Módulo: Autenticación - Verificar Token (Navegador)
    // ======================================================

    /**
     * verifyToken - Verifica si el token almacenado es válido
     * @returns {Object} { valid: boolean, usuario: Object }
     */
    async function verifyToken() {
        const token = localStorage.getItem('meca_token');
        console.log('🔍 [API] verifyToken - Token existe?', !!token);
        
        if (!token) return { valid: false };
        
        try {
            // Decodificar token JWT sin usar Buffer
            const parts = token.split('.');
            if (parts.length !== 3) {
                console.error('Token inválido: no tiene 3 partes');
                return { valid: false };
            }
            
            // Decodificar payload (parte 2)
            const payloadEncoded = parts[1];
            // Reemplazar caracteres Base64URL a Base64 estándar
            let base64 = payloadEncoded.replace(/-/g, '+').replace(/_/g, '/');
            // Decodificar Base64
            const payloadJson = atob(base64);
            const payload = JSON.parse(payloadJson);
            
            console.log('🔍 [API] Payload decodificado:', payload);
            
            // Verificar expiración
            const expirado = payload.exp * 1000 < Date.now();
            console.log('🔍 [API] Token expirado?', expirado);
            
            if (expirado) {
                localStorage.removeItem('meca_token');
                localStorage.removeItem('meca_usuario');
                return { valid: false };
            }
            
            return { valid: true, usuario: payload };
            
        } catch (error) {
            console.error('❌ [API] Error verificando token:', error);
            return { valid: false };
        }
    }

    // ======================================================
    // Módulo: Sesiones - Funciones Auxiliares
    // ======================================================

    /**
     * generarSessionToken - Genera un token único de sesión
     * @returns {string} Token de sesión
     */
    function generarSessionToken() {
        return 'ses_' + Date.now() + '_' + Math.random().toString(36).substr(2, 16) + '_' + crypto.randomUUID();
    }

    /**
     * obtenerIpPublica - Obtiene la IP pública del cliente
     * @returns {string} Dirección IP
     */
    async function obtenerIpPublica() {
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            return data.ip;
        } catch (error) {
            console.warn('No se pudo obtener IP pública:', error);
            return '0.0.0.0';
        }
    }

    /**
     * obtenerInfoDispositivo - Obtiene información del dispositivo
     * @returns {string} Descripción del dispositivo
     */
    function obtenerInfoDispositivo() {
        const ua = navigator.userAgent;
        let dispositivo = 'Desktop';
        
        if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
            dispositivo = 'Tablet';
        } else if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
            dispositivo = 'Móvil';
        }
        
        let so = 'Desconocido';
        if (ua.indexOf('Windows') !== -1) so = 'Windows';
        else if (ua.indexOf('Mac') !== -1) so = 'Mac';
        else if (ua.indexOf('Linux') !== -1) so = 'Linux';
        else if (ua.indexOf('Android') !== -1) so = 'Android';
        else if (ua.indexOf('iOS') !== -1 || ua.indexOf('iPhone') !== -1 || ua.indexOf('iPad') !== -1) so = 'iOS';
        
        let navegador = 'Desconocido';
        if (ua.indexOf('Chrome') !== -1 && ua.indexOf('Edg') === -1) navegador = 'Chrome';
        else if (ua.indexOf('Firefox') !== -1) navegador = 'Firefox';
        else if (ua.indexOf('Safari') !== -1 && ua.indexOf('Chrome') === -1) navegador = 'Safari';
        else if (ua.indexOf('Edg') !== -1) navegador = 'Edge';
        else if (ua.indexOf('Opera') !== -1 || ua.indexOf('OPR') !== -1) navegador = 'Opera';
        
        return `${dispositivo} - ${so} / ${navegador}`;
    }

    /**
     * iniciarMonitorSesion - Inicia el monitoreo de sesión activa
     * @returns {boolean} true si se inició correctamente
     */
    function iniciarMonitorSesion() {
        console.log('🟢 INICIANDO MONITOR DE SESIÓN');
        
        if (window.monitorIntervalSesion) {
            clearInterval(window.monitorIntervalSesion);
        }
        
        window.monitorIntervalSesion = setInterval(async () => {
            const sessionToken = sessionStorage.getItem('session_token_actual');
            if (!sessionToken) return;
            
            const db = getDB();
            if (!db) return;
            
            try {
                const { data: sesion, error } = await db
                    .from('sesiones_activas')
                    .select('estado')
                    .eq('session_token', sessionToken)
                    .maybeSingle();
                
                if (error) return;
                
                if (!sesion || sesion.estado !== 'activa') {
                    console.log('⚠️ Sesión cerrada remotamente');
                    alert('⚠️ Su sesión ha sido cerrada por un administrador o por inicio de sesión en otro dispositivo');
                    sessionStorage.clear();
                    location.reload();
                }
            } catch(e) {
                console.error('Monitor error:', e);
            }
        }, 10000);
        
        return true;
    }

    // ======================================================
    // Módulo: Matriz - Administración de Versiones
    // ======================================================

    /**
     * getVersionesMatriz - Obtiene todas las versiones de la matriz
     * @returns {Array} Lista de versiones
     */
    async function getVersionesMatriz() {
        const token = localStorage.getItem('meca_token');
        const response = await fetch('/api/matriz/versiones', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        return await response.json();
    }

    /**
     * crearVersionMatriz - Crea una nueva versión con estructura
     * @param {Object} data - { version, descripcion, fecha_vigencia }
     * @returns {Object} Versión creada
     */
    async function crearVersionMatriz(data) {
        const token = localStorage.getItem('meca_token');
        const response = await fetch('/api/matriz/versiones', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al crear versión');
        }
        return await response.json();
    }

    /**
     * activarVersionMatriz - Activa una versión existente
     * @param {number} versionId - ID de la versión
     * @returns {Object} Resultado de la operación
     */
    async function activarVersionMatriz(versionId) {
        const token = localStorage.getItem('meca_token');
        const response = await fetch(`/api/matriz/versiones/${versionId}/activar`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al activar versión');
        }
        return await response.json();
    }

    // ======================================================
    // GET VERSIÓN ACTIVA
    // ======================================================
    async function getVersionActiva() {
        const token = localStorage.getItem('meca_token');
        try {
            const response = await fetch('/api/matriz/versiones/activa', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) {
                if (response.status === 404) return null;
                throw new Error(`Error ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Error obteniendo versión activa:', error);
            return null;
        }
    }

    // Obtener versión de matriz para una fecha específica
    async function getVersionPorFecha(fecha) {
        const token = localStorage.getItem('meca_token');
        const response = await fetch(`/api/matriz/versiones/por-fecha?fecha=${fecha}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) {
            if (response.status === 404) return null;
            throw new Error('Error al obtener versión por fecha');
        }
        return await response.json();
    }

    // Obtener estructura completa de una versión
    async function getEstructuraVersion(versionId) {
        const token = localStorage.getItem('meca_token');
        const response = await fetch(`/api/matriz/versiones/${versionId}/estructura`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) throw new Error('Error al cargar la estructura de la versión');
        return await response.json();
    }

    // Congelar la versión activa actual (crear snapshot)
    async function congelarVersionActual(data) {
        const token = localStorage.getItem('meca_token');
        const response = await fetch('/api/matriz/versiones/congelar', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al congelar la versión');
        }
        return await response.json();
    }

    // Activar una versión
    async function activarVersion(versionId) {
        const token = localStorage.getItem('meca_token');
        const response = await fetch(`/api/matriz/versiones/${versionId}/activar`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al activar la versión');
        }
        return await response.json();
    }

    // ======================================================
    // API - REGLAS DE EVALUACIÓN
    // ======================================================

    /**
     * getReglasEvaluacion - Obtiene las reglas de la versión activa
     * @returns {Array} Lista de reglas
     */
    async function getReglasEvaluacion() {
        const token = localStorage.getItem('meca_token');
        
        try {
            // 1. Obtener versión activa
            const versionActiva = await getVersionActiva();
            if (!versionActiva) {
                console.warn('⚠️ No hay versión activa para cargar reglas');
                return [];
            }
            
            // 2. Obtener reglas de esa versión
            const response = await fetch(`/api/reglas-evaluacion/version/${versionActiva.id}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                if (response.status === 404) return [];
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }
            
            const reglas = await response.json();
            console.log(`📋 Reglas cargadas para versión ${versionActiva.version}: ${reglas.length}`);
            return reglas;
            
        } catch (error) {
            console.error('❌ Error cargando reglas:', error);
            return [];
        }
    }

    // ======================================================
    // API - REGLAS DE EVALUACIÓN (CRUD)
    // ======================================================

    /**
     * getReglasByVersion - Obtiene reglas de una versión específica
     * @param {number} versionId - ID de la versión
     * @returns {Array} Lista de reglas
     */
    async function getReglasByVersion(versionId) {
        const token = localStorage.getItem('meca_token');
        
        try {
            const response = await fetch(`/api/reglas-evaluacion/version/${versionId}`, {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });
            
            if (!response.ok) {
                if (response.status === 404) return [];
                throw new Error(`Error ${response.status}: ${response.statusText}`);
            }
            
            return await response.json();
        } catch (error) {
            console.error('❌ Error obteniendo reglas:', error);
            return [];
        }
    }

    /**
     * crearRegla - Crea una nueva regla
     * @param {Object} data - Datos de la regla
     * @returns {Object} Regla creada
     */
    async function crearRegla(data) {
        const token = localStorage.getItem('meca_token');
        
        // 🔴 Asegurar que los campos JSON sean válidos
        const bodyData = {
            version_id: data.version_id,
            submotivo_origen: data.submotivo_origen,
            bloque_origen: data.bloque_origen,
            atributo_origen: data.atributo_origen,
            valor_condicion: data.valor_condicion || '0',
            accion_tipo: data.accion_tipo || 'marcar_no_aplica',
            accion_valor: data.accion_valor || 'NA',
            submotivos_afectados: data.submotivos_afectados || null,
            excepciones: data.excepciones || null,
            orden: data.orden || 0,
            activo: data.activo !== false
        };
        
        console.log('📤 Enviando a /api/reglas-evaluacion:', JSON.stringify(bodyData, null, 2));
        
        const response = await fetch('/api/reglas-evaluacion', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(bodyData)
        });
        
        if (!response.ok) {
            const error = await response.json();
            console.error('❌ Error del servidor:', error);
            throw new Error(error.error || 'Error al crear regla');
        }
        
        return await response.json();
    }

    /**
     * actualizarRegla - Actualiza una regla existente
     * @param {number} id - ID de la regla
     * @param {Object} data - Datos a actualizar
     * @returns {Object} Regla actualizada
     */
    async function actualizarRegla(id, data) {
        const token = localStorage.getItem('meca_token');
        
        const bodyData = {
            submotivo_origen: data.submotivo_origen,
            bloque_origen: data.bloque_origen,
            atributo_origen: data.atributo_origen,
            valor_condicion: data.valor_condicion || '0',
            accion_tipo: data.accion_tipo || 'marcar_no_aplica',
            accion_valor: data.accion_valor || 'NA',
            submotivos_afectados: data.submotivos_afectados || null,
            excepciones: data.excepciones || null,
            orden: data.orden || 0,
            activo: data.activo !== false
        };
        
        const response = await fetch(`/api/reglas-evaluacion/${id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(bodyData)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al actualizar regla');
        }
        
        return await response.json();
    }

    /**
     * eliminarRegla - Elimina una regla
     * @param {number} id - ID de la regla
     * @returns {Object} Resultado de la operación
     */
    async function eliminarRegla(id) {
        const token = localStorage.getItem('meca_token');
        
        const response = await fetch(`/api/reglas-evaluacion/${id}`, {
            method: 'DELETE',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al eliminar regla');
        }
        
        return await response.json();
    }

    // ======================================================
    // Módulo: Transcripción - Nuevo
    // ======================================================

    /**
     * crearTareaTranscripcion - Crea una tarea de transcripción desde MECA
     * @param {Object} data - Datos de la tarea
     * @returns {Object} Tarea creada
     */
    async function crearTareaTranscripcion(data) {
        const token = localStorage.getItem('meca_token');
        const response = await fetch('/api/transcripcion/tareas', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al crear tarea');
        }
        return await response.json();
    }

    /**
     * ejecutarTareaTranscripcion - Ejecuta una tarea de transcripción manualmente
     * @param {number} tareaId - ID de la tarea
     * @returns {Object} Resultado de la operación
     */
    async function ejecutarTareaTranscripcion(tareaId) {
        const token = localStorage.getItem('meca_token');
        const response = await fetch(`/api/transcripcion/tareas/${tareaId}/ejecutar`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al ejecutar tarea');
        }
        return await response.json();
    }

    /**
     * listarTranscripciones - Lista transcripciones con filtros
     * @param {Object} filtros - Filtros opcionales
     * @returns {Array} Lista de transcripciones
     */
    async function listarTranscripciones(filtros = {}) {
        const token = localStorage.getItem('meca_token');
        const params = new URLSearchParams(filtros).toString();
        const url = params ? `/api/transcripcion/listar?${params}` : '/api/transcripcion/listar';
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al listar transcripciones');
        }
        return await response.json();
    }

    /**
     * obtenerTranscripcion - Obtiene una transcripción completa
     * @param {number} id - ID de la transcripción
     * @returns {Object} Transcripción completa
     */
    async function obtenerTranscripcion(id) {
        const token = localStorage.getItem('meca_token');
        const response = await fetch(`/api/transcripcion/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al obtener transcripción');
        }
        return await response.json();
    }

    /**
     * obtenerEstadisticasTranscripcion - Obtiene estadísticas para dashboard
     * @returns {Object} Estadísticas de transcripciones
     */
    async function obtenerEstadisticasTranscripcion() {
        const token = localStorage.getItem('meca_token');
        const response = await fetch('/api/transcripcion/estadisticas', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al obtener estadísticas');
        }
        return await response.json();
    }

    // ======================================================
    // MÓDULO: TRANSCRIPCIÓN (VERSIÓN CORREGIDA)
    // ======================================================

    /**
     * subirAudio - Sube un archivo de audio desde MECA
     * @param {File} file - Archivo de audio
     * @param {Object} opciones - Opciones adicionales
     * @returns {Object} Resultado de la subida
     */
    async function subirAudio(file, opciones = {}) {
        console.log('📤 Subiendo archivo de audio:', file?.name);
        
        if (!file) {
            throw new Error('⚠️ No se ha seleccionado ningún archivo');
        }
        
        const token = localStorage.getItem('meca_token');
        if (!token) {
            throw new Error('⚠️ No hay sesión activa');
        }
        
        const formData = new FormData();
        formData.append('audio', file);
        formData.append('crear_tarea', opciones.crearTarea !== undefined ? opciones.crearTarea : 'true');
        formData.append('creado_por', opciones.creadoPor || 'MECA');
        formData.append('modelo_whisper', opciones.modeloWhisper || 'small');
        formData.append('idioma', opciones.idioma || 'Spanish');
        formData.append('analizar_con_ollama', opciones.analizarConOllama !== undefined ? opciones.analizarConOllama : 'true');
        
        // 🔴 USAR LA VARIABLE GLOBAL
        const response = await fetch(`${API_TRANSCRIPCION_URL}/subir`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            },
            body: formData
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || `Error HTTP ${response.status}`);
        }
        
        return await response.json();
    }

    /**
     * transcribirAudioEspecifico - Transcribe un audio específico
     * @param {string} audioPath - Ruta del audio
     * @param {Object} opciones - Opciones de transcripción
     * @returns {Object} Resultado de la transcripción
     */
    async function transcribirAudioEspecifico(audioPath, opciones = {}) {
        const token = localStorage.getItem('meca_token');
        if (!token) {
            throw new Error('⚠️ No hay sesión activa');
        }
        
        // 🔴 USAR LA VARIABLE GLOBAL
        const response = await fetch(`${API_TRANSCRIPCION_URL}/transcribir`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                audio_path: audioPath,
                idioma: opciones.idioma || 'Spanish',
                modelo: opciones.modelo || 'small',
                analizar_con_ollama: opciones.analizarConOllama !== false,
                modelo_ollama: opciones.modeloOllama || 'llama3.2:3b'
            })
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al transcribir');
        }
        
        return await response.json();
    }

    /**
     * listarTranscripciones - Lista transcripciones con filtros
     * @param {Object} filtros - Filtros opcionales
     * @returns {Object} Lista de transcripciones
     */
    async function listarTranscripciones(filtros = {}) {
        const token = localStorage.getItem('meca_token');
        if (!token) {
            throw new Error('⚠️ No hay sesión activa');
        }
        
        const params = new URLSearchParams();
        if (filtros.estado) params.append('estado', filtros.estado);
        if (filtros.fecha_desde) params.append('fecha_desde', filtros.fecha_desde);
        if (filtros.fecha_hasta) params.append('fecha_hasta', filtros.fecha_hasta);
        if (filtros.tarea_id) params.append('tarea_id', filtros.tarea_id);
        if (filtros.limit) params.append('limit', filtros.limit || 50);
        if (filtros.offset) params.append('offset', filtros.offset || 0);
        
        // 🔴 USAR LA VARIABLE GLOBAL
        const url = params.toString() 
            ? `${API_TRANSCRIPCION_URL}/listar?${params.toString()}`
            : `${API_TRANSCRIPCION_URL}/listar`;
        
        console.log('📡 URL de listarTranscripciones:', url);
        
        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || `Error HTTP ${response.status}`);
        }
        
        return await response.json();
    }

    /**
     * obtenerTranscripcion - Obtiene una transcripción completa
     * @param {number} id - ID de la transcripción
     * @returns {Object} Transcripción completa
     */
    async function obtenerTranscripcion(id) {
        const token = localStorage.getItem('meca_token');
        if (!token) {
            throw new Error('⚠️ No hay sesión activa');
        }
        
        // 🔴 USAR LA VARIABLE GLOBAL
        const response = await fetch(`${API_TRANSCRIPCION_URL}/${id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || `Error HTTP ${response.status}`);
        }
        
        return await response.json();
    }

    /**
     * obtenerEstadisticasTranscripcion - Obtiene estadísticas para dashboard
     * @returns {Object} Estadísticas de transcripciones
     */
    async function obtenerEstadisticasTranscripcion() {
        const token = localStorage.getItem('meca_token');
        if (!token) {
            throw new Error('⚠️ No hay sesión activa');
        }
        
        // 🔴 USAR LA VARIABLE GLOBAL
        const response = await fetch(`${API_TRANSCRIPCION_URL}/estadisticas`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || `Error HTTP ${response.status}`);
        }
        
        return await response.json();
    }

    /**
     * analizarTranscripcion - Reintenta análisis de una transcripción existente
     * @param {number} id - ID de la transcripción
     * @returns {Object} Resultado del análisis
     */
    async function analizarTranscripcion(id) {
        const token = localStorage.getItem('meca_token');
        if (!token) {
            throw new Error('⚠️ No hay sesión activa');
        }
        
        // 🔴 USAR LA VARIABLE GLOBAL
        const response = await fetch(`${API_TRANSCRIPCION_URL}/${id}/analizar`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || `Error HTTP ${response.status}`);
        }
        
        return await response.json();
    }

    /**
     * crearTareaTranscripcion - Crea una tarea de transcripción desde MECA
     * @param {Object} data - Datos de la tarea
     * @returns {Object} Tarea creada
     */
    async function crearTareaTranscripcion(data) {
        const token = localStorage.getItem('meca_token');
        if (!token) {
            throw new Error('⚠️ No hay sesión activa');
        }
        
        // 🔴 USAR LA VARIABLE GLOBAL
        const response = await fetch(`${API_TRANSCRIPCION_URL}/tareas`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || `Error HTTP ${response.status}`);
        }
        
        return await response.json();
    }

    /**
     * ejecutarTareaTranscripcion - Ejecuta una tarea de transcripción manualmente
     * @param {number} tareaId - ID de la tarea
     * @returns {Object} Resultado de la operación
     */
    async function ejecutarTareaTranscripcion(tareaId) {
        const token = localStorage.getItem('meca_token');
        if (!token) {
            throw new Error('⚠️ No hay sesión activa');
        }
        
        // 🔴 USAR LA VARIABLE GLOBAL
        const response = await fetch(`${API_TRANSCRIPCION_URL}/tareas/${tareaId}/ejecutar`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || `Error HTTP ${response.status}`);
        }
        
        return await response.json();
    }

    // =============================================
    // API - REPORTES AUTOMÁTICOS
    // =============================================

    /**
     * Obtiene el estado del sistema de reportes
     */
    async function obtenerEstadoReportes() {
        const token = localStorage.getItem('meca_token');
        const response = await fetch('/api/reportes/estado', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al obtener estado');
        }
        return response.json();
    }

    /**
     * Ejecuta un reporte manualmente
     * @param {string} tipo - 'todos', 'pda', 'mensual'
     */
    async function ejecutarReporte(tipo = 'todos') {
        const token = localStorage.getItem('meca_token');
        const response = await fetch('/api/reportes/ejecutar', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ tipo })
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al ejecutar reporte');
        }
        return response.json();
    }

    /**
     * Lista los reportes generados
     */
    async function listarReportes() {
        const token = localStorage.getItem('meca_token');
        const response = await fetch('/api/reportes/listar', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al listar reportes');
        }
        return response.json();
    }

    /**
     * Descarga un reporte
     * @param {string} nombre - Nombre del archivo
     */
    async function descargarReporte(nombre) {
        const token = localStorage.getItem('meca_token');
        const response = await fetch(`/api/reportes/descargar/${encodeURIComponent(nombre)}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al descargar');
        }
        
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = nombre;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        window.URL.revokeObjectURL(url);
    }

    /**
     * Verifica si el scheduler de reportes está corriendo
     */
    async function verificarSchedulerReportes() {
        const token = localStorage.getItem('meca_token');
        const response = await fetch('/api/reportes/scheduler/status', {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al verificar scheduler');
        }
        return response.json();
    }

    // =============================================
    // CRUD - TAREAS PROGRAMADAS DE REPORTES
    // =============================================

    /**
     * Lista todas las tareas de reportes
     */
    async function listarTareasReportes() {
        const token = localStorage.getItem('meca_token');
        const response = await fetch('http://localhost:5000/api/reportes/tareas', {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al listar tareas');
        }
        return response.json();
    }

    /**
     * Crea una nueva tarea de reporte
     */
    async function crearTareaReporte(data) {
        const token = localStorage.getItem('meca_token');
        const response = await fetch('http://localhost:5000/api/reportes/tareas', {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al crear tarea');
        }
        return response.json();
    }

    /**
     * Actualiza una tarea de reporte
     */
    async function actualizarTareaReporte(id, data) {
        const token = localStorage.getItem('meca_token');
        const response = await fetch(`http://localhost:5000/api/reportes/tareas/${id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(data)
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al actualizar tarea');
        }
        return response.json();
    }

    /**
     * Elimina una tarea de reporte
     */
    async function eliminarTareaReporte(id) {
        const token = localStorage.getItem('meca_token');
        const response = await fetch(`http://localhost:5000/api/reportes/tareas/${id}`, {
            method: 'DELETE',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al eliminar tarea');
        }
        return response.json();
    }

    /**
     * Obtiene o actualiza la carpeta de reportes
     */
    async function configurarCarpetaReportes(carpeta_base = null) {
        const token = localStorage.getItem('meca_token');
        const options = {
            headers: { 'Authorization': `Bearer ${token}` }
        };
        
        if (carpeta_base) {
            options.method = 'POST';
            options.headers['Content-Type'] = 'application/json';
            options.body = JSON.stringify({ carpeta_base });
        }
        
        const response = await fetch('http://localhost:5000/api/reportes/config/carpeta', options);
        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.error || 'Error al configurar carpeta');
        }
        return response.json();
    }
        
    // ======================================================
    // API PÚBLICA - Exportación de todos los métodos
    // ======================================================

    return {
        // ==============================================
        // AUTENTICACIÓN
        // ==============================================
        login,
        logout: () => {
            sessionStorage.removeItem('usuario_actual');
            sessionStorage.removeItem('session_token_actual');
            window.location.reload();
        },
        getUsuarioActual: () => {
            const usuario = sessionStorage.getItem('usuario_actual');
            return usuario ? JSON.parse(usuario) : null;
        },
        loginConAPI,
        verifyToken,

        // ==============================================
        // ESCUCHAS (Auditor)
        // ==============================================
        getMisEscuchas,
        iniciarGestionEscucha,
        reportarIncidencia,
        marcarEscuchaGestionada,
        reactivarEscuchaPorTicket,
        cancelarGestionEscucha,
        getLotesEscuchas,
        getTicketsPorLote,
        activarLote,
        eliminarLote,

        // ==============================================
        // EVALUACIONES
        // ==============================================
        guardarEvaluacion,
        getHistorial,
        eliminarEvaluacion,
        validarTicketDuplicado,
        getEvaluacionesConDetalles,
        getDetallesEvaluacion,
        getEvaluacionesPorAgente,

        // ==============================================
        // AGENTES
        // ==============================================
        getAgentes,
        getAgentesCompleto,
        getAuditores,
        crearAgentesMasivo,
        getAgentesPorLider,
        getAgentesPorUbicacion,
        getAgentesPorLocalidad,
        crearAgente,
        actualizarAgente,
        eliminarAgente,
        getCategoriasUnicas,

        // ==============================================
        // USUARIOS
        // ==============================================
        getUsuarios,
        crearUsuario,
        actualizarUsuario,
        eliminarUsuario,
        cambiarPassword,

        // ==============================================
        // ROLES
        // ==============================================
        getRoles,
        crearRol,
        actualizarRol,
        eliminarRol,

        // ==============================================
        // PESTAÑAS
        // ==============================================
        getPestanasDisponibles,
        getPestanasPorRol,

        // ==============================================
        // REPORTES
        // ==============================================
        getKPIs,
        getRanking,
        getEvolutivo,
        getTopFallas,
        getLideres,
        getResumenPorLider,
        getResumenPorUbicacion,
        getResumenPorLocalidad,
        getMesesDisponibles,
        getErroresAuditores,
        getAuditoresActivos,

        // ==============================================
        // PDA
        // ==============================================
        getPDAPendientes,
        getPDASeguimiento,
        getPDAHistorial,
        crearPDA,
        actualizarPDA,
        completarAccionPDA,
        getPDADetalle,

        // ==============================================
        // VERSIONES
        // ==============================================
        getVersiones,
        publicarVersion,
        activarVersion,
        eliminarVersion,
        getReglasEvaluacion,

        // ==============================================
        // EXPORTACIONES
        // ==============================================
        exportarPDA,
        exportarFrentes,
        exportarUsuarios,
        exportarAgentes,

        // ==============================================
        // SOLICITUDES
        // ==============================================
        getSolicitudesPorUsuario,
        getTodasSolicitudes,

        // ==============================================
        // ESTADO BD
        // ==============================================
        getEstadoBD,
        getTamanioTablas,

        // ==============================================
        // SESIONES
        // ==============================================
        getSesionesUsuario,
        cerrarSesion,
        cerrarTodasSesiones,
        iniciarMonitorSesion,
        generarSessionToken,
        obtenerIpPublica,
        obtenerInfoDispositivo,

        // ==============================================
        // MATRIZ DE EVALUACIÓN - ADMINISTRACIÓN
        // ==============================================
        getEstructuraEvaluacion,        
        getFrentes,
        crearFrente,
        actualizarFrente,
        eliminarFrente,
        getAtributos,
        crearAtributo,
        actualizarAtributo,
        eliminarAtributo,
        getSubMotivos,
        crearSubMotivo,
        actualizarSubMotivo,
        eliminarSubMotivo,
        getVersionesMatriz,
        crearVersionMatriz,
        activarVersionMatriz,
        recalcularTodasEvaluaciones,

        // ==============================================
        // VALIDACIONES DE MATRIZ
        // ==============================================
        validarSubMotivo,
        validarAtributo,
        validarFrente,

        // ==============================================
        // UTILIDADES
        // ==============================================
        hashSHA256,

        //reglas
        getReglasByVersion,
        crearRegla,
        actualizarRegla,
        eliminarRegla,

        // Nuevas funciones de matriz versionada
        getVersionActiva,
        getVersionPorFecha,
        getEstructuraVersion,
        congelarVersionActual,
        activarVersion,

        // ==============================================
        // TRANSCRIPCIÓN (NUEVO)
        // ==============================================
        crearTareaTranscripcion,
        ejecutarTareaTranscripcion,
        listarTranscripciones,
        obtenerTranscripcion,
        obtenerEstadisticasTranscripcion,
        subirAudio,
        transcribirAudioEspecifico,
        analizarTranscripcion,

        // =============================================
        // API - REPORTES AUTOMÁTICOS
        // =============================================
        obtenerEstadoReportes,
        ejecutarReporte,
        listarReportes,
        descargarReporte,
        verificarSchedulerReportes,

        // =============================================
        // CRUD - TAREAS PROGRAMADAS DE REPORTES
        // =============================================
        listarTareasReportes,
        crearTareaReporte,
        actualizarTareaReporte,
        eliminarTareaReporte,
        configurarCarpetaReportes,

        // Utilidad: cambiar modo de un módulo (para pruebas)
        setModo: (modulo, modo) => {
            if (MODO.hasOwnProperty(modulo)) {
                MODO[modulo] = modo;
                console.log(`🔄 Módulo ${modulo} cambiado a modo: ${modo}`);
            }
        },
        getModo: () => ({ ...MODO })
    };
})();

// ======================================================
// EXPOSICIÓN GLOBAL
// ======================================================
// 📌 Hace que API esté disponible en window para uso global
window.API = API;