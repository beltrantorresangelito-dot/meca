
// ======================================================
// BLOQUE 1: VARIABLES GLOBALES
// ======================================================
// 
// 📌 PROPÓSITO: Almacenar el estado global de la aplicación de auditoría
// 📌 ALCANCE: Disponibles en todo el módulo auditor.js
// ======================================================

// ======================================================
// 1. VARIABLES DE EVALUACIÓN Y AUDITORÍA
// ======================================================

/**
 * evaluaciones - Almacena todas las evaluaciones cargadas en memoria
 * @type {Array}
 * @uso: Cache local para evitar múltiples consultas a la BD
 */
let evaluaciones = [];

/**
 * tiempoInicio - Marca el momento exacto cuando comienza una auditoría
 * @type {Date|null}
 * @uso: Calcular el tiempo total de auditoría
 */
let tiempoInicio = null;

/**
 * tiempoFin - Marca el momento exacto cuando finaliza una auditoría
 * @type {Date|null}
 * @uso: Calcular el tiempo total de auditoría
 */
let tiempoFin = null;

/**
 * temporizadorInterval - Referencia al intervalo que actualiza el temporizador
 * @type {number|null}
 * @uso: Controlar la actualización del contador de tiempo en UI
 */
let temporizadorInterval = null;

/**
 * auditando - Indica si hay una auditoría activa
 * @type {boolean}
 * @uso: Bloquear acciones que no son válidas durante una auditoría
 */
let auditando = false;

// ======================================================
// 2. VARIABLES DE ESCUCHAS
// ======================================================

/**
 * misEscuchasData - Escuchas asignadas al auditor actual
 * @type {Array}
 * @uso: Mostrar en la pestaña "Mis Escuchas"
 */
let misEscuchasData = [];

/**
 * filtroActual - Filtro aplicado a la lista de escuchas
 * @type {string}
 * @values: 'pendiente', 'en_proceso', 'gestionado', 'todos'
 * @uso: Filtrar la tabla de escuchas
 */
let filtroActual = 'pendiente';

/**
 * misEscuchasFiltradas - Escuchas después de aplicar el filtro
 * @type {Array}
 * @uso: Datos mostrados en la tabla de escuchas
 */
let misEscuchasFiltradas = [];

/**
 * timeoutBusquedaEscucha - Timeout para debounce en búsqueda de escuchas
 * @type {number|null}
 * @uso: Evitar múltiples llamadas mientras el usuario escribe
 */
let timeoutBusquedaEscucha = null;

// ======================================================
// 3. VARIABLES DE INCIDENCIAS
// ======================================================

/**
 * incidenciasData - Incidencias reportadas por el auditor
 * @type {Array}
 * @uso: Mostrar en la pestaña de incidencias
 */
let incidenciasData = [];

/**
 * escuchaSeleccionadaParaIncidencia - Escucha para la cual se reporta incidencia
 * @type {Object|null}
 * @uso: Almacenar la escucha actual para reporte de incidencia
 */
let escuchaSeleccionadaParaIncidencia = null;

/**
 * incidenciasFiltroTipo - Filtro aplicado a las incidencias
 * @type {string}
 * @values: 'activas', 'resueltas', 'todas'
 * @uso: Filtrar la lista de incidencias
 */
let incidenciasFiltroTipo = 'activas';

// ======================================================
// 4. VARIABLES DE SESIÓN
// ======================================================

/**
 * monitorIntervalSesion - Intervalo para monitorear sesión activa
 * @type {number|null}
 * @uso: Verificar periódicamente que la sesión siga activa
 */
let monitorIntervalSesion = null;

// ======================================================
// 5. CONTROL DE ESTADO POR ATRIBUTO (PENALIZACIÓN)
// ======================================================

/**
 * estadoAtributos - Control de penalización por atributo de evaluación
 * @type {Object}
 * @structure:
 *   {
 *     'ECUF': {                    // Frente ECUF
 *       'CORTE / ABANDONO DE LLAMADA': { penalizado: false },
 *       'RESPETO AL CLIENTE': { penalizado: false },
 *       'BRINDA INFORMACION': { penalizado: false }
 *     },
 *     'ECN': {                     // Frente ECN
 *       'SONDEO': { penalizado: false },
 *       'NEGOCIACION Y REBATE': { penalizado: false },
 *       'MOTIVO DE NO PAGO': { penalizado: false },
 *       'LUGARES DE PAGO': { penalizado: false },
 *       'CIERRE': { penalizado: false },
 *       'IMAGEN CORPORATIVA': { penalizado: false },
 *       'TIPIFICACION': { penalizado: false }
 *     }
 *   }
 * @uso: Controlar la penalización de atributos durante la evaluación
 * @detalle: Cuando un atributo es penalizado, su puntaje se reduce automáticamente
 * @actualización: Los nombres coinciden con los que vienen de la BD (matriz de evaluación)
 */
let estadoAtributos = {
    // ======================================================
    // FRENTE ECUF (Negocio) - 3 atributos
    // ======================================================
    'ECUF': {
        'CORTE / ABANDONO DE LLAMADA': { penalizado: false },  // Penaliza si el agente corta la llamada
        'RESPETO AL CLIENTE': { penalizado: false },           // Penaliza si falta el respeto
        'BRINDA INFORMACION': { penalizado: false }            // Penaliza si no brinda información correcta
    },
    // ======================================================
    // FRENTE ECN (Proceso) - 7 atributos
    // ======================================================
    'ECN': {
        'SONDEO': { penalizado: false },                       // Penaliza si no hace sondeo
        'NEGOCIACION Y REBATE': { penalizado: false },         // Penaliza si no negocia
        'MOTIVO DE NO PAGO': { penalizado: false },            // Penaliza si no pregunta motivo
        'LUGARES DE PAGO': { penalizado: false },              // Penaliza si no prioriza pagos digitales
        'CIERRE': { penalizado: false },                       // Penaliza si no cierra correctamente
        'IMAGEN CORPORATIVA': { penalizado: false },           // Penaliza si daña la imagen de Movistar
        'TIPIFICACION': { penalizado: false }                  // Penaliza si no tipifica correctamente
    }
};

// ======================================================
// BLOQUE 2: VERIFICACIÓN DE SESIÓN (AUDITOR)
// ======================================================
// 
// 📌 PROPÓSITO: Validar la sesión del auditor al cargar la página
// 📌 FLUJO: 1. Buscar token → 2. Decodificar JWT → 3. Validar rol → 4. Mostrar UI
// 📌 DEPENDENCIAS: localStorage, JWT, usuarioActual (global)
// ======================================================

// ======================================================
// 1. FUNCIÓN: verificarSesionAuditor()
// ======================================================
// 📌 PROPÓSITO: Verificar que el usuario tenga una sesión válida como AUDITOR
// 📌 RETORNO: true (sesión válida) o false (redirige a login)
// 📌 EJECUCIÓN: Se llama al cargar la página (window.onload)
// ======================================================

async function verificarSesionAuditor() {
    const token = localStorage.getItem('meca_token');
    const usuarioGuardado = localStorage.getItem('meca_usuario');
    
    console.log('🔍 [AUDITOR] Token encontrado:', token ? 'SÍ' : 'NO');
    
    if (!token || !usuarioGuardado) {
        console.log('⚠️ [AUDITOR] No hay sesión, redirigiendo a login');
        window.location.href = '/login';
        return false;
    }
    
    try {
        // Decodificar token manualmente para obtener el rol
        const parts = token.split('.');
        if (parts.length !== 3) {
            throw new Error('Token inválido');
        }
        
        let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
        const payloadJson = atob(base64);
        const payload = JSON.parse(payloadJson);
        
        // 🔴 CORREGIDO: Obtener nombre_completo desde localStorage o BD
        let nombreCompleto = payload.nombre_completo || payload.nombre || null;
        
        // Si el nombre no viene en el token, buscar en localStorage
        if (!nombreCompleto || nombreCompleto === 'undefined') {
            try {
                const usuarioGuardadoObj = JSON.parse(usuarioGuardado);
                nombreCompleto = usuarioGuardadoObj.nombre_completo || null;
                console.log('📋 nombre_completo obtenido desde localStorage:', nombreCompleto);
            } catch (e) {
                console.warn('Error parseando usuarioGuardado:', e);
            }
        }
        
        // 🔴 FALLBACK: Si aún no hay nombre, consultar BD
        if (!nombreCompleto || nombreCompleto === 'undefined' || nombreCompleto === 'null') {
            console.log('🔍 Buscando nombre_completo en BD...');
            const db = getDB();
            if (db) {
                const { data: usuario, error } = await db
                    .from('usuarios')
                    .select('nombre_completo')
                    .eq('id', payload.id)
                    .single();
                
                if (!error && usuario && usuario.nombre_completo) {
                    nombreCompleto = usuario.nombre_completo;
                    console.log('📋 nombre_completo obtenido desde BD:', nombreCompleto);
                }
            }
        }
        
        // 🔴 ULTIMO FALLBACK: Usar el nombre de usuario
        if (!nombreCompleto || nombreCompleto === 'undefined' || nombreCompleto === 'null') {
            nombreCompleto = payload.usuario;
            console.warn('⚠️ Usando usuario como fallback:', nombreCompleto);
        }
        
        usuarioActual = {
            id: payload.id,
            usuario: payload.usuario,
            nombre_completo: nombreCompleto,  // ✅ AHORA TIENE EL VALOR CORRECTO
            rol: payload.rol
        };
        
        console.log('✅ [AUDITOR] Usuario restaurado:', usuarioActual.nombre_completo);
        
        if (usuarioActual.rol !== 'AUDITOR') {
            console.log('⚠️ [AUDITOR] Rol incorrecto:', usuarioActual.rol);
            window.location.href = '/login';
            return false;
        }
        
        // Guardar en localStorage con el nombre correcto
        localStorage.setItem('meca_usuario', JSON.stringify({
            id: usuarioActual.id,
            usuario: usuarioActual.usuario,
            nombre_completo: usuarioActual.nombre_completo,
            rol: usuarioActual.rol
        }));
        
        mostrarInterfazAuditor();
        return true;
        
    } catch (error) {
        console.error('❌ [AUDITOR] Error:', error);
        localStorage.removeItem('meca_token');
        localStorage.removeItem('meca_usuario');
        window.location.href = '/login';
        return false;
    }
}

// ======================================================
// 2. FUNCIÓN: mostrarInterfazAuditor()
// ======================================================
// 📌 PROPÓSITO: Configurar la interfaz de usuario para el rol AUDITOR
// 📌 EJECUCIÓN: Llamada desde verificarSesionAuditor() después de validar el rol
// 📌 EFECTOS: 
//    1. Oculta el overlay de login
//    2. Muestra información del usuario
//    3. Configura campos específicos de auditor (oculta selector de evaluador)
// ======================================================

// ======================================================
// FUNCIÓN: mostrarInterfazAuditor()
// ======================================================
// 📌 PROPÓSITO: Configurar la interfaz de usuario para el rol AUDITOR
// 📌 EJECUCIÓN: Llamada desde verificarSesionAuditor() después de validar el rol
// 📌 EFECTOS: 
//    1. Oculta el overlay de login
//    2. Muestra información del usuario
//    3. Configura campos específicos de auditor (oculta selector de evaluador)
//    4. 🔴 CORREGIDO: Verifica y corrige nombre_completo si es "undefined"
// ======================================================

function mostrarInterfazAuditor() {
    console.log('👤 Mostrando interfaz para auditor:', usuarioActual?.nombre_completo);

    // ======================================================
    // 🔴 PASO 0: VERIFICAR Y CORREGIR nombre_completo
    // ======================================================
    // 📌 Si nombre_completo es "undefined" o null, recuperarlo desde localStorage o BD
    // ======================================================
    if (usuarioActual && (!usuarioActual.nombre_completo || usuarioActual.nombre_completo === 'undefined' || usuarioActual.nombre_completo === 'null')) {
        console.warn('⚠️ nombre_completo es inválido, corrigiendo...');
        
        // 0a. Intentar recuperar de localStorage
        try {
            const guardado = localStorage.getItem('meca_usuario');
            if (guardado) {
                const data = JSON.parse(guardado);
                if (data.nombre_completo && data.nombre_completo !== 'undefined' && data.nombre_completo !== 'null') {
                    usuarioActual.nombre_completo = data.nombre_completo;
                    console.log('✅ nombre_completo recuperado desde localStorage:', usuarioActual.nombre_completo);
                }
            }
        } catch (e) {
            console.warn('Error recuperando desde localStorage:', e);
        }
        
        // 0b. Si sigue siendo inválido, consultar BD
        if (!usuarioActual.nombre_completo || usuarioActual.nombre_completo === 'undefined' || usuarioActual.nombre_completo === 'null') {
            console.log('🔍 Buscando nombre_completo en BD...');
            const db = getDB();
            if (db) {
                db.from('usuarios')
                    .select('nombre_completo')
                    .eq('id', usuarioActual.id)
                    .single()
                    .then(({ data, error }) => {
                        if (!error && data && data.nombre_completo) {
                            usuarioActual.nombre_completo = data.nombre_completo;
                            console.log('✅ nombre_completo obtenido desde BD:', usuarioActual.nombre_completo);
                            
                            // Actualizar localStorage con el nombre correcto
                            try {
                                const guardado = localStorage.getItem('meca_usuario');
                                if (guardado) {
                                    const dataGuardado = JSON.parse(guardado);
                                    dataGuardado.nombre_completo = usuarioActual.nombre_completo;
                                    localStorage.setItem('meca_usuario', JSON.stringify(dataGuardado));
                                }
                            } catch (e) {}
                            
                            // Actualizar el nombre mostrado en el header
                            const userName = document.getElementById('userName');
                            if (userName) userName.textContent = usuarioActual.nombre_completo;
                        }
                    })
                    .catch(err => console.warn('Error consultando BD:', err));
            }
        }
        
        // 0c. Último fallback: usar el nombre de usuario
        if (!usuarioActual.nombre_completo || usuarioActual.nombre_completo === 'undefined' || usuarioActual.nombre_completo === 'null') {
            usuarioActual.nombre_completo = usuarioActual.usuario;
            console.warn('⚠️ Usando usuario como fallback:', usuarioActual.nombre_completo);
        }
    }

    // ======================================================
    // PASO 1: OCULTAR LOGIN OVERLAY
    // ======================================================
    // 📌 El overlay de login cubre toda la pantalla durante la autenticación
    // 📌 Al tener sesión válida, lo ocultamos para mostrar el contenido
    // ======================================================
    const loginOverlay = document.getElementById('loginOverlay');
    if (loginOverlay) loginOverlay.style.display = 'none';

    // ======================================================
    // PASO 2: MOSTRAR INFORMACIÓN DEL USUARIO EN HEADER
    // ======================================================
    // 📌 userInfo: Contenedor con foto, nombre y rol
    // 📌 userName: Nombre completo del auditor
    // 📌 userRol: Rol del usuario (AUDITOR)
    // ======================================================
    const userInfo = document.getElementById('userInfo');
    const userName = document.getElementById('userName');
    const userRol = document.getElementById('userRol');

    if (userInfo) userInfo.style.display = 'flex';
    if (userName) {
        // 🔴 CORREGIDO: Usar el nombre_completo corregido
        const nombreMostrar = usuarioActual?.nombre_completo || usuarioActual?.usuario || 'Usuario';
        userName.textContent = nombreMostrar;
        console.log(`✅ Nombre mostrado en header: "${nombreMostrar}"`);
    }
    if (userRol) userRol.textContent = usuarioActual?.rol || '';

    // ======================================================
    // PASO 3: MOSTRAR CONTENIDO PRINCIPAL
    // ======================================================
    // 📌 El contenedor principal (.container) está oculto inicialmente
    // 📌 Lo mostramos después de validar la sesión
    // ======================================================
    const container = document.querySelector('.container');
    if (container) container.style.display = 'block';

    // ======================================================
    // PASO 4: CONFIGURAR CAMPOS ESPECÍFICOS DE AUDITOR
    // ======================================================
    // 📌 Los auditores NO deben seleccionar su nombre (es automático)
    // 📌 Oculta el campo "Evaluador" y fija el valor automáticamente
    // ======================================================
    if (usuarioActual?.rol === 'AUDITOR') {
        
        // 4a. Ocultar el contenedor del selector de auditor
        const divAuditor = document.querySelector('#tab-evaluacion .card > div:first-child > div:first-child');
        if (divAuditor) divAuditor.style.display = 'none';

        // 4b. Fijar el valor del auditor en un campo oculto
        const selectAuditor = document.getElementById('evalEvaluador');
        if (selectAuditor) {
            // Crear input hidden si no existe
            let hiddenInput = document.getElementById('hiddenAuditor');
            if (!hiddenInput) {
                hiddenInput = document.createElement('input');
                hiddenInput.type = 'hidden';
                hiddenInput.id = 'hiddenAuditor';
                selectAuditor.parentNode.appendChild(hiddenInput);
            }
            // 🔴 CORREGIDO: Usar el nombre_completo corregido
            const nombreAuditor = usuarioActual.nombre_completo || usuarioActual.usuario;
            hiddenInput.value = nombreAuditor;
            console.log(`✅ Valor guardado en hiddenAuditor: "${nombreAuditor}"`);
            
            // Ocultar el select visible
            selectAuditor.style.display = 'none';
        }

        // 4c. Ocultar la etiqueta del campo
        const label = document.querySelector('label[for="evalEvaluador"]');
        if (label) label.style.display = 'none';

        console.log('✅ Campo AUDITOR ocultado, valor guardado:', usuarioActual.nombre_completo || usuarioActual.usuario);
    }
}


// ======================================================
// BLOQUE 3: SISTEMA DE GESTIÓN DE SESIONES
// ======================================================
// 
// 📌 PROPÓSITO: Gestionar sesiones de usuario con seguimiento en BD
// 📌 TECNOLOGÍA: PostgreSQL (tabla sesiones_activas) + sessionStorage
// 📌 FLUJO: Crear token → Guardar en BD → Monitorear actividad
// ======================================================

// ======================================================
// 1. FUNCIÓN: generarSessionToken()
// ======================================================
// 📌 PROPÓSITO: Generar un token único para identificar la sesión
// 📌 FORMATO: ses_timestamp_random_uuid
// 📌 USO: Identificar la sesión en la base de datos
// ======================================================

function generarSessionToken() {
    return 'ses_' + 
           Date.now() + '_' +                           // Timestamp (milisegundos)
           Math.random().toString(36).substr(2, 16) +   // Aleatorio (16 caracteres)
           '_' + 
           crypto.randomUUID();                         // UUID v4 (único universal)
}

// ======================================================
// 2. FUNCIÓN: obtenerInfoDispositivo()
// ======================================================
// 📌 PROPÓSITO: Identificar el dispositivo del usuario desde el User-Agent
// 📌 RETORNO: String con formato "Dispositivo - SO / Navegador"
// 📌 USO: Registrar en historial de login para auditoría
// ======================================================

function obtenerInfoDispositivo() {
    const ua = navigator.userAgent;  // User-Agent del navegador
    
    // ======================================================
    // 2a. DETECTAR TIPO DE DISPOSITIVO
    // ======================================================
    let dispositivo = 'Desktop';
    
    // Patrón para tablets
    if (/(tablet|ipad|playbook|silk)|(android(?!.*mobi))/i.test(ua)) {
        dispositivo = 'Tablet';
    } 
    // Patrón para móviles
    else if (/Mobile|Android|iP(hone|od)|IEMobile|BlackBerry|Kindle|Silk-Accelerated|(hpw|web)OS|Opera M(obi|ini)/.test(ua)) {
        dispositivo = 'Móvil';
    }
    
    // ======================================================
    // 2b. DETECTAR SISTEMA OPERATIVO
    // ======================================================
    let so = 'Desconocido';
    if (ua.indexOf('Windows') !== -1) so = 'Windows';
    else if (ua.indexOf('Mac') !== -1) so = 'Mac';
    else if (ua.indexOf('Linux') !== -1) so = 'Linux';
    else if (ua.indexOf('Android') !== -1) so = 'Android';
    else if (ua.indexOf('iOS') !== -1 || ua.indexOf('iPhone') !== -1 || ua.indexOf('iPad') !== -1) so = 'iOS';
    
    // ======================================================
    // 2c. DETECTAR NAVEGADOR
    // ======================================================
    let navegador = 'Desconocido';
    if (ua.indexOf('Chrome') !== -1 && ua.indexOf('Edg') === -1) navegador = 'Chrome';
    else if (ua.indexOf('Firefox') !== -1) navegador = 'Firefox';
    else if (ua.indexOf('Safari') !== -1 && ua.indexOf('Chrome') === -1) navegador = 'Safari';
    else if (ua.indexOf('Edg') !== -1) navegador = 'Edge';
    else if (ua.indexOf('Opera') !== -1 || ua.indexOf('OPR') !== -1) navegador = 'Opera';
    
    // ======================================================
    // 2d. RETORNAR INFORMACIÓN COMBINADA
    // ======================================================
    return `${dispositivo} - ${so} / ${navegador}`;
}

// ======================================================
// 3. FUNCIÓN: obtenerIpPublica()
// ======================================================
// 📌 PROPÓSITO: Obtener la IP pública del usuario
// 📌 API: ipify.org (servicio gratuito)
// 📌 RETORNO: IP (string) o '0.0.0.0' en caso de error
// 📌 USO: Registrar en historial de login
// ======================================================

async function obtenerIpPublica() {
    try {
        const response = await fetch('https://api.ipify.org?format=json');
        const data = await response.json();
        return data.ip;
    } catch (error) {
        console.warn('No se pudo obtener IP pública:', error);
        return '0.0.0.0';  // IP por defecto en caso de error
    }
}

// ======================================================
// 4. FUNCIÓN: registrarHistorialLogin()
// ======================================================
// 📌 PROPÓSITO: Registrar eventos de login/logout en la base de datos
// 📌 TABLA: historial_login
// 📌 USO: Auditoría de acceso al sistema
// ======================================================

async function registrarHistorialLogin(usuarioId, usuario, evento, ip, dispositivo, detalles = '') {
    const db = getDB();  // Obtener conexión a PostgreSQL
    if (!db) return;
    
    try {
        // Insertar registro en la tabla historial_login
        await db
            .from('historial_login')
            .insert({
                usuario_id: usuarioId,          // ID del usuario
                usuario: usuario,               // Nombre de usuario
                evento: evento,                 // 'login', 'logout', 'sesion_cerrada'
                ip_address: ip || '0.0.0.0',    // IP del usuario
                user_agent: navigator.userAgent, // User-Agent completo
                dispositivo: dispositivo,       // Dispositivo detectado
                detalles: detalles,             // Información adicional
                created_at: new Date().toISOString() // Fecha y hora
            });
        console.log(`✅ Historial registrado: ${evento} para ${usuario}`);
    } catch (error) {
        console.error('Error registrando historial:', error);
    }
}

// ======================================================
// 5. FUNCIÓN: crearSesionActiva()
// ======================================================
// 📌 PROPÓSITO: Crear una sesión activa en la base de datos
// 📌 TABLA: sesiones_activas
// 📌 FLUJO: 
//    1. Cerrar sesiones anteriores del mismo usuario
//    2. Insertar nueva sesión con token único
//    3. Guardar token en sessionStorage
// ======================================================

async function crearSesionActiva(usuarioId, sessionToken, ip, dispositivo) {
    console.log('🔧 crearSesionActiva - Iniciando...');
    console.log('📝 Parámetros:', { usuarioId, sessionToken, ip, dispositivo });
    
    const db = getDB();
    if (!db) {
        console.error('❌ Base de datos no disponible');
        return false;
    }
    
    try {
        // ======================================================
        // 5a. CERRAR SESIONES ANTERIORES DEL MISMO USUARIO
        // ======================================================
        // ⚠️ Evita múltiples sesiones activas del mismo usuario
        // 📌 Motivo: Seguridad - control de sesiones simultáneas
        // ======================================================
        const { data: sesionesExistentes, error: findError } = await db
            .from('sesiones_activas')
            .select('id')
            .eq('usuario_id', usuarioId)
            .eq('estado', 'activa');
        
        if (!findError && sesionesExistentes && sesionesExistentes.length > 0) {
            console.log(`⚠️ Usuario tiene ${sesionesExistentes.length} sesión(es) activa(s). Cerrando...`);
            
            for (const sesion of sesionesExistentes) {
                await db
                    .from('sesiones_activas')
                    .update({ 
                        estado: 'cerrada',           // Cambiar estado
                        fecha_fin: new Date(),       // Registrar fin
                        motivo_cierre: 'Nuevo inicio de sesión'  // Motivo
                    })
                    .eq('id', sesion.id);
            }
            console.log(`✅ ${sesionesExistentes.length} sesión(es) anterior(es) cerrada(s)`);
        }
        
        // ======================================================
        // 5b. INSERTAR NUEVA SESIÓN
        // ======================================================
        const ahora = new Date();
        
        const nuevaSesion = {
            usuario_id: usuarioId,              // ID del usuario
            session_token: sessionToken,        // Token único de sesión
            ip_address: ip,                     // IP pública
            user_agent: navigator.userAgent,    // User-Agent completo
            dispositivo: dispositivo,           // Dispositivo detectado
            fecha_inicio: ahora,                // Fecha de inicio
            ultima_actividad: ahora,            // Última actividad (mismo momento)
            estado: 'activa'                    // Estado activo
        };
        
        console.log('📤 Insertando sesión en la base de datos:', nuevaSesion);
        
        const { data, error } = await db
            .from('sesiones_activas')
            .insert(nuevaSesion)
            .select();  // Retorna el ID de la sesión creada
        
        if (error) {
            console.error('❌ Error detallado al insertar:', error);
            return false;
        }
        
        console.log('✅ Sesión insertada correctamente. ID:', data?.[0]?.id);
        
        // ======================================================
        // 5c. GUARDAR TOKEN EN SESSIONSTORAGE
        // ======================================================
        // 📌 sessionStorage: Persiste solo durante la sesión del navegador
        // 📌 Diferencia con localStorage: se limpia al cerrar la pestaña
        // ======================================================
        sessionStorage.setItem('session_token_actual', sessionToken);
        sessionStorage.setItem('session_inicio', Date.now().toString());
        sessionStorage.setItem('ultima_actividad', Date.now().toString());
        
        return true;
        
    } catch (error) {
        console.error('❌ Error inesperado en crearSesionActiva:', error);
        return false;
    }
}

// ======================================================
// 6. FUNCIÓN: iniciarMonitorSesion()
// ======================================================
// 📌 PROPÓSITO: Monitorear periódicamente si la sesión sigue activa
// 📌 INTERVALO: Cada 10 segundos
// 📌 ACCIÓN: Si la sesión fue cerrada remotamente, alertar y recargar
// 📌 USO: Detectar cierre de sesión por administrador o inicio en otro dispositivo
// ======================================================

function iniciarMonitorSesion() {
    console.log('🔧 iniciarMonitorSesion - EJECUTADA');
    
    // ======================================================
    // 6a. LIMPIAR MONITOR EXISTENTE
    // ======================================================
    // 📌 Evita múltiples intervalos ejecutándose simultáneamente
    // ======================================================
    if (window.monitorIntervalSesion) {
        console.log('🔧 Limpiando monitor existente...');
        clearInterval(window.monitorIntervalSesion);
        window.monitorIntervalSesion = null;
    }
    
    // ======================================================
    // 6b. VALIDAR USUARIO ACTUAL
    // ======================================================
    if (!usuarioActual) {
        console.log('⚠️ No hay usuario actual, monitor no iniciado');
        return false;
    }
    
    console.log('🟢 INICIANDO MONITOR DE SESIÓN (cada 10 segundos)');
    
    // ======================================================
    // 6c. CREAR INTERVALO DE MONITOREO
    // ======================================================
    // 📌 Cada 10 segundos verifica si el token sigue activo en BD
    // ======================================================
    window.monitorIntervalSesion = setInterval(async () => {
        // Obtener token actual desde sessionStorage
        const sessionToken = sessionStorage.getItem('session_token_actual');
        if (!sessionToken) return;  // No hay token, salir
        
        const db = getDB();
        if (!db) return;
        
        try {
            // ======================================================
            // CONSULTAR ESTADO DE LA SESIÓN EN BD
            // ======================================================
            const { data: sesion, error } = await db
                .from('sesiones_activas')
                .select('estado')
                .eq('session_token', sessionToken)
                .maybeSingle();  // maybeSingle = 0 o 1 resultado
            
            if (error) return;  // Error en consulta, salir
            
            // ======================================================
            // VERIFICAR SI LA SESIÓN SIGUE ACTIVA
            // ======================================================
            // ❌ Si no existe o estado != 'activa' → sesión cerrada
            // ======================================================
            if (!sesion || sesion.estado !== 'activa') {
                console.log('⚠️ Sesión cerrada remotamente');
                
                // Mostrar alerta al usuario
                alert('⚠️ Su sesión ha sido cerrada por un administrador o por inicio de sesión en otro dispositivo');
                
                // Limpiar storage y recargar (redirige a login)
                sessionStorage.clear();
                location.reload();
            }
        } catch(e) {
            console.error('Monitor error:', e);
        }
    }, 10000);  // Intervalo: 10 segundos
    
    console.log('✅ Monitor creado con ID:', window.monitorIntervalSesion);
    return true;
}

// ======================================================
// BLOQUE 4: FUNCIONES DE CARGA DE DATOS
// ======================================================
// 
// 📌 PROPÓSITO: Cargar auditores y agentes desde PostgreSQL
// 📌 TECNOLOGÍA: API REST + PostgreSQL
// 📌 DEPENDENCIAS: API (cliente global), getDB()
// ======================================================

// ======================================================
// 1. FUNCIÓN: mostrarErrorLogin()
// ======================================================
// 📌 PROPÓSITO: Mostrar un mensaje de error en el login
// 📌 UBICACIÓN: En el formulario de login
// 📌 DURACIÓN: 3 segundos (se oculta automáticamente)
// ======================================================

function mostrarErrorLogin(mensaje) {
    // Buscar el elemento donde se muestra el error
    const errorDiv = document.getElementById('loginError');
    
    if (errorDiv) {
        // 1. Establecer el texto del error
        errorDiv.textContent = mensaje;
        
        // 2. Mostrar el elemento (cambiar display a 'block')
        errorDiv.style.display = 'block';
        
        // 3. Ocultar automáticamente después de 3 segundos
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 3000);
    }
}

// ======================================================
// 2. FUNCIÓN: cargarAuditores()
// ======================================================
// 📌 PROPÓSITO: Cargar la lista de auditores desde PostgreSQL
// 📌 DESTINO: Selector "evalEvaluador" (campo Evaluador)
// 📌 FILTRO: Solo usuarios con rol 'AUDITOR'
// 📌 RETORNO: true (éxito) o false (error)
// ======================================================

async function cargarAuditores() {
    try {
        // ======================================================
        // 2a. VALIDAR CONEXIÓN A BASE DE DATOS
        // ======================================================
        const client = getDB();  // Obtener cliente de BD

        if (!client || typeof client.from !== 'function') {
            console.warn('⚠️ Base de datos no disponible para cargar auditores');
            return false;
        }

        console.log('🔍 Cargando auditores...');

        // ======================================================
        // 2b. OBTENER AUDITORES DESDE LA API
        // ======================================================
        // 📌 API.getAuditores() retorna lista de usuarios con rol 'AUDITOR'
        // ======================================================
        const auditores = await API.getAuditores();

        // ======================================================
        // 2c. OBTENER REFERENCIA AL SELECT
        // ======================================================
        const selectAuditor = document.getElementById('evalEvaluador');
        if (!selectAuditor) return false;

        // ======================================================
        // 2d. LIMPIAR OPCIONES EXISTENTES
        // ======================================================
        // 📌 Mantener solo la primera opción (placeholder)
        // ======================================================
        while (selectAuditor.options.length > 1) {
            selectAuditor.remove(1);
        }

        // ======================================================
        // 2e. VALIDAR SI HAY AUDITORES
        // ======================================================
        if (!auditores || auditores.length === 0) {
            console.warn('⚠️ No hay auditores registrados en la base de datos');
            
            // Agregar opción deshabilitada informativa
            const option = document.createElement('option');
            option.value = '';
            option.textContent = '⚠️ No hay auditores registrados';
            option.disabled = true;
            selectAuditor.appendChild(option);
            return false;
        }

        // ======================================================
        // 2f. AGREGAR AUDITORES AL SELECT
        // ======================================================
        auditores.forEach(auditor => {
            const option = document.createElement('option');
            option.value = auditor.nombre;       // Valor: nombre del auditor
            option.textContent = auditor.nombre; // Texto visible
            selectAuditor.appendChild(option);
        });

        console.log(`✅ ${auditores.length} auditores cargados en el selector`);
        return true;

    } catch (error) {
        console.error('❌ Error cargando auditores:', error);
        return false;
    }
}

// ======================================================
// 3. FUNCIÓN: cargarAgentes()
// ======================================================
// 📌 PROPÓSITO: Cargar la lista de agentes desde PostgreSQL
// 📌 DESTINO: Campo de autocompletado "evalAgenteInput"
// 📌 ALMACENAMIENTO: window.listaAgentesCompleta (global)
// 📌 RETORNO: true (éxito) o false (error)
// ======================================================

async function cargarAgentes() {
    try {
        // ======================================================
        // 3a. VALIDAR CONEXIÓN A BASE DE DATOS
        // ======================================================
        const client = getDB();

        if (!client || typeof client.from !== 'function') {
            console.warn('⚠️ Base de datos no disponible para cargar agentes');
            return false;
        }

        console.log('🔍 Cargando agentes...');

        // ======================================================
        // 3b. OBTENER AGENTES DESDE LA API
        // ======================================================
        // 📌 API.getAgentes() retorna lista de todos los agentes
        // ======================================================
        const agentes = await API.getAgentes();

        // ⚠️ NOTA: En el código original hay un error: la variable 'error' no está definida.
        // La línea "if (error) { ... }" debe eliminarse o corregirse.
        // ======================================================

        console.log('📊 Datos recibidos de PostgreSQL:', agentes);

        // ======================================================
        // 3c. VALIDAR SI HAY AGENTES
        // ======================================================
        if (!agentes || agentes.length === 0) {
            console.warn('⚠️ No hay agentes en la base de datos');
            window.listaAgentesCompleta = [];  // Limpiar lista global
            return false;
        }

        // ======================================================
        // 3d. ASIGNAR A VARIABLE GLOBAL
        // ======================================================
        // 📌 window.listaAgentesCompleta se usa en todo el módulo
        // 📌 Se extrae solo el campo 'nombre' de cada agente
        // ======================================================
        window.listaAgentesCompleta = agentes.map(a => a.nombre);

        console.log(`✅ ${window.listaAgentesCompleta.length} agentes cargados desde la base de datos`);
        console.log('📋 Primeros 5 agentes:', window.listaAgentesCompleta.slice(0, 5));

        // ======================================================
        // 3e. GUARDAR EN LOCALSTORAGE COMO RESPALDO
        // ======================================================
        // 📌 Útil si la BD falla o para carga offline
        // ======================================================
        const dataToSave = {
            agentes: window.listaAgentesCompleta,
            auditores: [],  // Vacío, solo agentes
            fechaActualizacion: new Date().toISOString(),
            origen: 'db'
        };
        localStorage.setItem('agentes_cobranza', JSON.stringify(dataToSave));

        // ======================================================
        // 3f. ACTUALIZAR SELECT OCULTO (compatibilidad)
        // ======================================================
        // 📌 Algunas funciones usan el select 'evalAgente'
        // ======================================================
        const selectAgente = document.getElementById('evalAgente');
        if (selectAgente) {
            selectAgente.innerHTML = '<option value="">Seleccione Agente</option>';
            window.listaAgentesCompleta.forEach(agente => {
                selectAgente.innerHTML += `<option value="${agente}">${agente}</option>`;
            });
        }

        // ======================================================
        // 3g. ACTUALIZAR DROPDOWN DE BÚSQUEDA
        // ======================================================
        // 📌 Si el input de búsqueda existe, mostrar todos los agentes
        // ======================================================
        const input = document.getElementById('evalAgenteInput');
        if (input) {
            // Limpiar y mostrar todos los agentes (sin filtro)
            filtrarAgentes('');
        }

        return true;

    } catch (error) {
        console.error('❌ Error cargando agentes desde la base de datos:', error);
        window.listaAgentesCompleta = [];  // Limpiar en caso de error
        return false;
    }
}

// ======================================================
// BLOQUE 5: FUNCIONES DE UTILIDAD, PESTAÑAS Y TEMPORIZADOR
// ======================================================
// 
// 📌 PROPÓSITO: Proporcionar funciones auxiliares y control de UI
// 📌 COMPONENTES: 
//    1. Utilidades (DOM, fechas, HTML)
//    2. Sistema de pestañas (navegación)
//    3. Temporizador de auditoría
// ======================================================

// ======================================================
// 1. FUNCIONES DE UTILIDAD
// ======================================================

// ----------------------------------------------------------------------
// $ - Selector abreviado para document.getElementById
// ----------------------------------------------------------------------
// 📌 PROPÓSITO: Simplificar la selección de elementos por ID
// 📌 USO: const elemento = $('miId');
// 📌 EQUIVALENTE: document.getElementById('miId')
// ----------------------------------------------------------------------
const $ = id => document.getElementById(id);

// ----------------------------------------------------------------------
// formatDateForInput - Formatea fecha para input datetime-local
// ----------------------------------------------------------------------
// 📌 PROPÓSITO: Convertir un objeto Date al formato requerido por inputs
// 📌 FORMATO: YYYY-MM-DDTHH:MM (ej: 2026-06-19T14:30)
// 📌 USO: input.value = formatDateForInput(new Date())
// ----------------------------------------------------------------------
function formatDateForInput(date) {
    // 1. Extraer componentes de la fecha
    const year = date.getFullYear();                    // Año (4 dígitos)
    const month = String(date.getMonth() + 1).padStart(2, '0');   // Mes (01-12)
    const day = String(date.getDate()).padStart(2, '0');          // Día (01-31)
    const hours = String(date.getHours()).padStart(2, '0');       // Horas (00-23)
    const minutes = String(date.getMinutes()).padStart(2, '0');   // Minutos (00-59)
    
    // 2. Combinar en formato ISO con 'T' (datetime-local)
    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

// ----------------------------------------------------------------------
// escapeHtml - Escapa caracteres especiales de HTML
// ----------------------------------------------------------------------
// 📌 PROPÓSITO: Prevenir ataques XSS al mostrar texto del usuario
// 📌 TÉCNICA: Crear elemento DOM y usar textContent (seguro)
// 📌 USO: html = escapeHtml(textoDelUsuario)
// ----------------------------------------------------------------------
function escapeHtml(text) {
    // 1. Si no hay texto, retornar vacío
    if (!text) return '';
    
    // 2. Crear elemento div temporal
    const div = document.createElement('div');
    
    // 3. Asignar texto (esto lo escapa automáticamente)
    div.textContent = text;
    
    // 4. Retornar el HTML escapado
    return div.innerHTML;
}

// ======================================================
// 2. SISTEMA DE PESTAÑAS (NAVEGACIÓN)
// ======================================================

// ----------------------------------------------------------------------
// showTab - Cambiar entre pestañas de la interfaz
// ----------------------------------------------------------------------
// 📌 PROPÓSITO: Navegar entre las diferentes secciones de la aplicación
// 📌 PESTAÑAS: misEscuchas, evaluacion, historial, incidencias
// 📌 ACCIONES: 
//    - Muestra/oculta paneles
//    - Carga datos específicos según la pestaña
//    - Controla visibilidad del temporizador
// ----------------------------------------------------------------------
function showTab(tabName, event) {
    // ======================================================
    // 2a. CAMBIAR PESTAÑAS VISUALES
    // ======================================================
    // 📌 Ocultar todos los paneles (tab-pane)
    document.querySelectorAll('.tab-pane').forEach(pane => pane.classList.remove('active'));
    
    // 📌 Desactivar todos los botones (tab-button)
    document.querySelectorAll('.tab-button').forEach(btn => btn.classList.remove('active'));
    
    // 📌 Activar el panel seleccionado
    document.getElementById(`tab-${tabName}`).classList.add('active');
    
    // 📌 Activar el botón seleccionado (si hay evento)
    if (event) event.target.classList.add('active');

    // ======================================================
    // 2b. ACCIONES ESPECÍFICAS POR PESTAÑA
    // ======================================================

    // ------------------------------------------------------
    // PESTAÑA: Mis Escuchas
    // ------------------------------------------------------
    if (tabName === 'misEscuchas') {
        // Cargar escuchas si hay usuario
        if (usuarioActual) {
            cargarMisEscuchas();
        }
        // Ocultar temporizador (no aplica en esta pestaña)
        const timerElement = document.getElementById('temporizadorAuditoria');
        if (timerElement) {
            timerElement.style.display = 'none';
        }
    }

    // ------------------------------------------------------
    // PESTAÑA: Evaluación (auditoría activa)
    // ------------------------------------------------------
    if (tabName === 'evaluacion') {
        // Mostrar temporizador solo si hay auditoría activa
        const timerElement = document.getElementById('temporizadorAuditoria');
        if (timerElement && auditando) {
            timerElement.style.display = 'block';
        }
    }

    // ------------------------------------------------------
    // PESTAÑA: Historial
    // ------------------------------------------------------
    if (tabName === 'historial') {
        // Cargar historial de evaluaciones
        cargarHistorialEvaluaciones();
        
        // Ocultar temporizador
        const timerElement = document.getElementById('temporizadorAuditoria');
        if (timerElement) {
            timerElement.style.display = 'none';
        }
    }

    // ------------------------------------------------------
    // PESTAÑA: Incidencias
    // ------------------------------------------------------
    if (tabName === 'incidencias') {
        cargarIncidencias();
    }
}

// ======================================================
// 3. FUNCIONES DE TEMPORIZADOR Y AUDITORÍA
// ======================================================

// ----------------------------------------------------------------------
// iniciarAuditoria - Inicia una nueva auditoría
// ----------------------------------------------------------------------
// 📌 PROPÓSITO: Comenzar el proceso de auditoría de una llamada
// 📌 PRERREQUISITOS: 
//    - Una escucha seleccionada (o ticket PSI)
//    - No hay auditoría en curso
// 📌 ACCIONES:
//    1. Validar que no haya auditoría activa
//    2. Verificar que hay una escucha/ticket seleccionado
//    3. Iniciar temporizador
//    4. Habilitar campos de evaluación
//    5. Cambiar visibilidad de botones
// ----------------------------------------------------------------------
function iniciarAuditoria() {
    // ======================================================
    // 3a. VALIDAR: No hay auditoría en curso
    // ======================================================
    if (auditando) {
        alert('⚠️ Ya hay una auditoría en curso. Finalícela antes de iniciar una nueva.');
        return;
    }

    // ======================================================
    // 3b. VALIDAR: Hay escucha o ticket PSI
    // ======================================================
    // 📌 window.gestionEscuchaActiva: true si viene de "Mis Escuchas"
    // 📌 evalTicketPSI: ticket manual ingresado por el auditor
    // ======================================================
    const esGestionEscucha = window.gestionEscuchaActiva === true;
    const ticketPSI = document.getElementById('evalTicketPSI')?.value;

    if (!esGestionEscucha && !ticketPSI) {
        alert('⚠️ Debe seleccionar una escucha de la pestaña "Mis Escuchas" antes de auditar.');
        return;
    }

    // ======================================================
    // 3c. ELIMINAR TEMPORIZADOR EXISTENTE
    // ======================================================
    // 📌 Evitar duplicados si se reinicia la auditoría
    // ======================================================
    const timerExistente = document.getElementById('temporizadorAuditoria');
    if (timerExistente) {
        timerExistente.remove();
    }

    // ======================================================
    // 3d. INICIAR TEMPORIZADOR Y ESTADO
    // ======================================================
    tiempoInicio = new Date();      // Marcar inicio
    auditando = true;              // Cambiar estado

    // ======================================================
    // 3e. CAMBIAR BOTONES
    // ======================================================
    const btnAuditar = document.getElementById('btnAuditar');
    const btnFinalizar = document.getElementById('btnFinalizar');

    // Ocultar botón "Auditar"
    if (btnAuditar) btnAuditar.style.display = 'none';
    
    // Mostrar botón "Finalizar"
    if (btnFinalizar) {
        btnFinalizar.style.display = 'inline-flex';
        
        // Si es modo edición, cambiar texto y color
        if (modoEdicionActivo) {
            btnFinalizar.innerHTML = '✏️ Actualizar Evaluación';
            btnFinalizar.style.background = 'var(--warning)';
        } else {
            btnFinalizar.innerHTML = '⏱️ Finalizar y Guardar';
            btnFinalizar.style.background = '';  // Color por defecto
        }
    }

    // ======================================================
    // 3f. HABILITAR SELECTS DE EVALUACIÓN
    // ======================================================
    const selects = document.querySelectorAll('.cumple-select');
    selects.forEach(select => {
        select.disabled = false;                         // Activar
        select.style.backgroundColor = '#fcfdfe';        // Fondo claro (editable)
    });

    // ======================================================
    // 3g. MOSTRAR TEMPORIZADOR (con retraso)
    // ======================================================
    // 📌 Retraso de 50ms para asegurar que el DOM esté listo
    // ======================================================
    setTimeout(() => {
        mostrarTemporizador();
    }, 50);

    // ======================================================
    // 3h. INICIAR ACTUALIZACIÓN CADA 1 SEGUNDO
    // ======================================================
    if (temporizadorInterval) clearInterval(temporizadorInterval);
    temporizadorInterval = setInterval(actualizarTemporizador, 1000);

    console.log('✅ Auditoría iniciada');
}

// ----------------------------------------------------------------------
// habilitarSelectsEvaluacion - Habilita solo los selects de evaluación
// ----------------------------------------------------------------------
// 📌 PROPÓSITO: Activar los campos de evaluación sin afectar campos básicos
// 📌 USO: Cuando se inicia una auditoría desde una escucha
// 📌 DIFERENCIA: No toca campos como Ticket PSI, Agente, Fecha, etc.
// ----------------------------------------------------------------------
function habilitarSelectsEvaluacion() {
    // Seleccionar todos los selects con clase 'cumple-select'
    const selects = document.querySelectorAll('.cumple-select');
    
    // Habilitar cada uno
    selects.forEach(select => {
        select.disabled = false;
    });

    console.log('✅ Selects de evaluación habilitados');
}


// ======================================================
// BLOQUE 6: TEMPORIZADOR, FECHAS Y FINALIZAR AUDITORÍA
// ======================================================
// 
// 📌 PROPÓSITO: Control del temporizador, conversión de fechas y finalización de auditoría
// 📌 COMPONENTES: 
//    1. Mostrar/Actualizar temporizador
//    2. Formateo de tiempo y fechas
//    3. Finalización de auditoría (función principal)
// ======================================================

// ======================================================
// 1. FUNCIONES DE TEMPORIZADOR
// ======================================================

// ----------------------------------------------------------------------
// mostrarTemporizador - Crea y muestra el temporizador en UI
// ----------------------------------------------------------------------
// 📌 PROPÓSITO: Mostrar el tiempo transcurrido de la auditoría
// 📌 ESTILO: Gradiente azul, centrado, con sombra
// 📌 UBICACIÓN: Debajo de los botones de auditoría
// 📌 ACTUALIZACIÓN: Se actualiza cada segundo con setInterval
// ----------------------------------------------------------------------
function mostrarTemporizador() {
    // ======================================================
    // 1a. ELIMINAR TEMPORIZADOR EXISTENTE
    // ======================================================
    // 📌 Evitar duplicados si se llama varias veces
    let timerElement = document.getElementById('temporizadorAuditoria');
    if (timerElement) {
        timerElement.remove();
    }

    // ======================================================
    // 1b. CREAR ELEMENTO DEL TEMPORIZADOR
    // ======================================================
    timerElement = document.createElement('div');
    timerElement.id = 'temporizadorAuditoria';
    timerElement.style.cssText = `
        background: linear-gradient(135deg, #019DF4, #00B4F0);  /* Gradiente azul */
        color: white;                                           /* Texto blanco */
        padding: 12px 20px;                                     /* Espaciado interno */
        border-radius: 12px;                                    /* Bordes redondeados */
        font-weight: bold;                                      /* Texto en negrita */
        font-size: 18px;                                        /* Tamaño de fuente */
        text-align: center;                                     /* Centrado */
        margin: 15px 0;                                         /* Margen vertical */
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);                  /* Sombra suave */
        position: relative;                                     /* Para z-index */
        z-index: 100;                                           /* Por encima de otros elementos */
    `;

    // ======================================================
    // 1c. MOSTRAR TIEMPO TRANSCURRIDO
    // ======================================================
    if (tiempoInicio) {
        // Calcular diferencia desde el inicio
        const ahora = new Date();
        const diferencia = Math.floor((ahora - tiempoInicio) / 1000);
        const minutos = Math.floor(diferencia / 60);
        const segundos = diferencia % 60;
        timerElement.innerHTML = `⏱️ Tiempo de auditoría: ${minutos.toString().padStart(2, '0')}:${segundos.toString().padStart(2, '0')}`;
    } else {
        // Si no hay inicio, mostrar 00:00
        timerElement.innerHTML = `⏱️ Tiempo de auditoría: 00:00`;
    }

    // ======================================================
    // 1d. INSERTAR EN EL DOM
    // ======================================================
    // 📌 Buscar un contenedor seguro para insertar el temporizador
    // 📌 Prioridad: 
    //    1. Contenedor de botones
    //    2. Header con clase flex-between
    //    3. Después del título h3
    // ======================================================
    const botonesContainer = document.querySelector('#tab-evaluacion .card > div:first-child > div:first-child');
    if (botonesContainer) {
        // Insertar después de los botones
        botonesContainer.insertAdjacentElement('afterend', timerElement);
    } else {
        // Fallback: buscar cualquier contenedor con los botones
        const headerDiv = document.querySelector('#tab-evaluacion .card .flex-between');
        if (headerDiv) {
            headerDiv.insertAdjacentElement('afterend', timerElement);
        } else {
            // Último fallback: insertar después del título
            const titulo = document.querySelector('#tab-evaluacion .card h3');
            if (titulo) {
                titulo.insertAdjacentElement('afterend', timerElement);
            }
        }
    }

    console.log('✅ Temporizador mostrado correctamente');
}

// ----------------------------------------------------------------------
// actualizarTemporizador - Actualiza el temporizador cada segundo
// ----------------------------------------------------------------------
// 📌 PROPÓSITO: Mantener el temporizador actualizado en tiempo real
// 📌 EJECUCIÓN: Llamada por setInterval cada 1 segundo
// 📌 CÁLCULO: Diferencia entre hora actual y tiempoInicio
// ----------------------------------------------------------------------
function actualizarTemporizador() {
    // Si no hay inicio, no hacer nada
    if (!tiempoInicio) return;

    // Calcular tiempo transcurrido
    const ahora = new Date();
    const diferencia = Math.floor((ahora - tiempoInicio) / 1000);
    const minutos = Math.floor(diferencia / 60);
    const segundos = diferencia % 60;

    // Actualizar el elemento en el DOM
    const timerElement = document.getElementById('temporizadorAuditoria');
    if (timerElement) {
        timerElement.innerHTML = `⏱️ Tiempo de auditoría: ${minutos.toString().padStart(2, '0')}:${segundos.toString().padStart(2, '0')}`;
    }
}

// ======================================================
// 2. FUNCIONES DE FORMATEO
// ======================================================

// ----------------------------------------------------------------------
// formatearTiempo - Convierte segundos a formato legible
// ----------------------------------------------------------------------
// 📌 PROPÓSITO: Mostrar tiempo de auditoría en formato humano
// 📌 FORMATOS:
//    - > 1 hora: "1h 23m 45s"
//    - > 1 minuto: "23m 45s"
//    - < 1 minuto: "45s"
// 📌 USO: Al finalizar la auditoría, mostrar el tiempo total
// ----------------------------------------------------------------------
function formatearTiempo(segundos) {
    const horas = Math.floor(segundos / 3600);          // Horas completas
    const minutos = Math.floor((segundos % 3600) / 60); // Minutos restantes
    const segs = segundos % 60;                         // Segundos restantes

    if (horas > 0) {
        return `${horas}h ${minutos.toString().padStart(2, '0')}m ${segs.toString().padStart(2, '0')}s`;
    } else if (minutos > 0) {
        return `${minutos}m ${segs.toString().padStart(2, '0')}s`;
    } else {
        return `${segs}s`;
    }
}

// ----------------------------------------------------------------------
// convertirFecha - Convierte varios formatos de fecha a ISO
// ----------------------------------------------------------------------
// 📌 PROPÓSITO: Estandarizar fechas para guardar en la base de datos
// 📌 FORMATOS SOPORTADOS:
//    - YYYY-MM-DD HH:MM:SS (ISO)
//    - DD/MM/YYYY HH:MM (latino)
//    - YYYY-MM-DDTHH:MM (datetime-local)
// 📌 RETORNO: null si no se puede convertir
// ----------------------------------------------------------------------
function convertirFecha(fechaStr) {
    // 1. Validar entrada
    if (!fechaStr || fechaStr === 'No registrada') return null;
    
    try {
        // ======================================================
        // CASO 1: Ya está en formato ISO
        // ======================================================
        if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(fechaStr)) {
            return fechaStr;  // Devuelve tal cual
        }
        
        // ======================================================
        // CASO 2: Formato DD/MM/YYYY HH:MM
        // ======================================================
        if (fechaStr.includes('/')) {
            const partes = fechaStr.split(' ');
            const fechaParte = partes[0];        // DD/MM/YYYY
            const horaParte = partes[1] || '00:00';  // HH:MM o 00:00
            
            const [dia, mes, anio] = fechaParte.split('/');
            if (dia && mes && anio) {
                // Convertir a ISO: YYYY-MM-DD HH:MM:SS
                return `${anio}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')} ${horaParte}:00`;
            }
        }
        
        // ======================================================
        // CASO 3: Formato YYYY-MM-DDTHH:MM (datetime-local)
        // ======================================================
        if (fechaStr.includes('T')) {
            const fechaObj = new Date(fechaStr);
            if (!isNaN(fechaObj.getTime())) {
                const anio = fechaObj.getFullYear();
                const mes = String(fechaObj.getMonth() + 1).padStart(2, '0');
                const dia = String(fechaObj.getDate()).padStart(2, '0');
                const horas = String(fechaObj.getHours()).padStart(2, '0');
                const minutos = String(fechaObj.getMinutes()).padStart(2, '0');
                return `${anio}-${mes}-${dia} ${horas}:${minutos}:00`;
            }
        }
        
        // Si no se pudo convertir, retornar null
        return null;
        
    } catch (error) {
        console.error('Error convirtiendo fecha:', error);
        return null;
    }
}

// ======================================================
// 3. FUNCIÓN PRINCIPAL: FINALIZAR AUDITORÍA
// ======================================================

// ----------------------------------------------------------------------
// finalizarAuditoria - Finaliza y guarda la auditoría
// ----------------------------------------------------------------------
// 📌 PROPÓSITO: Finalizar la auditoría, calcular resultados y guardar
// 📌 FLUJO:
//    1. Validar modo edición
//    2. Validar campos obligatorios
//    3. Validar selects completos
//    4. Validar ticket duplicado
//    5. Calcular resultados
//    6. Construir objeto evaluación
//    7. Guardar en BD
//    8. Actualizar escucha (si aplica)
//    9. Limpiar y resetear
// ----------------------------------------------------------------------
async function finalizarAuditoria() {
    // ======================================================
    // 3a. VALIDAR MODO EDICIÓN
    // ======================================================
    // 📌 Si estamos editando una evaluación existente, usar función específica
    if (modoEdicionActivo && idEvaluacionEditando) {
        await actualizarEvaluacionExistente();
        return;
    }

    // ======================================================
    // 3b. VALIDAR AUDITORÍA ACTIVA
    // ======================================================
    if (!auditando) {
        alert('⚠️ No hay una auditoría activa.');
        return;
    }

    // ======================================================
    // 3c. VALIDACIONES INICIALES
    // ======================================================

    // Obtener evaluador (prioridad: hiddenAuditor > usuarioActual > select)
    let evaluador;
    if (usuarioActual && usuarioActual.rol === 'AUDITOR') {
        const hiddenAuditor = document.getElementById('hiddenAuditor');
        if (hiddenAuditor && hiddenAuditor.value) {
            evaluador = hiddenAuditor.value;
        } else {
            evaluador = usuarioActual.nombre_completo;
        }
    } else {
        evaluador = document.getElementById('evalEvaluador')?.value;
    }

    // Validar campos obligatorios
    const ticketPSI = document.getElementById('evalTicketPSI')?.value;
    const agente = document.getElementById('evalAgente')?.value;
    const fechaRaw = document.getElementById('evalFecha')?.value;
    const idLlamada = document.getElementById('evalIdLlamada')?.value;

    // Priorizar el input de búsqueda para el agente
    const agenteInput = document.getElementById('evalAgenteInput');
    const agenteSeleccionado = agenteInput?.value || agente;

    // Verificar que todos los campos estén completos
    if (!evaluador || !ticketPSI || !agenteSeleccionado || !fechaRaw || !idLlamada) {
        alert('⚠️ Complete todos los campos obligatorios: Auditor, Ticket PSI, Agente, Fecha e ID Llamada');
        return;
    }

    // Validar que la fecha sea válida
    const fechaObj = new Date(fechaRaw);
    if (isNaN(fechaObj.getTime())) {
        alert('❌ La fecha seleccionada no es válida.');
        return;
    }

    // ======================================================
    // 3d. VALIDAR SELECTS COMPLETOS
    // ======================================================
    // 📌 Verificar que todos los selects tengan un valor seleccionado
    // 📌 Resaltar en rojo los selects vacíos
    // ======================================================
    const todosLosSelects = document.querySelectorAll('.cumple-select');
    const selectsVacios = [];

    todosLosSelects.forEach(select => {
        // Si no está deshabilitado y no tiene valor
        if (!select.disabled && (!select.value || select.value === '')) {
            selectsVacios.push(select);
            select.style.border = '2px solid var(--danger)';      // Borde rojo
            select.style.backgroundColor = '#fff0f0';              // Fondo rojo claro
        }
    });

    if (selectsVacios.length > 0) {
        alert(`⚠️ Faltan ${selectsVacios.length} campos por evaluar. Complete todos los campos.`);
        // Scroll al primer select vacío
        selectsVacios[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
    }

    // ======================================================
    // 3e. VALIDAR TICKET DUPLICADO
    // ======================================================
    const esDuplicado = await validarTicketNoDuplicado(ticketPSI);
    if (esDuplicado) {
        const btnAuditarFinal = document.getElementById('btnAuditar');
        if (btnAuditarFinal) {
            btnAuditarFinal.disabled = false;
            btnAuditarFinal.style.opacity = '1';
        }
        return;
    }

    // ======================================================
    // 3f. DETENER TEMPORIZADOR Y CALCULAR RESULTADOS
    // ======================================================
    if (temporizadorInterval) {
        clearInterval(temporizadorInterval);
        temporizadorInterval = null;
    }

    // Marcar fin de auditoría
    tiempoFin = new Date();
    const tiempoTotalSegundos = Math.floor((tiempoFin - tiempoInicio) / 1000);
    const tiempoFormateado = formatearTiempo(tiempoTotalSegundos);

    // Calcular resultados usando funciones específicas
    const totalENC = recalcularTotalENC();           // ENC (Cliente)
    const totalECUF = actualizarResultadoECUF();     // ECUF (Negocio)
    const totalECN = actualizarResultadoECN();       // ECN (Proceso)
    const notaFinal = totalENC + totalECUF + totalECN;

    // Determinar rango según nota final
    let rango = '';
    if (notaFinal >= 97) rango = 'Excelente';
    else if (notaFinal >= 90) rango = 'Bien';
    else if (notaFinal >= 85) rango = 'Regular';
    else rango = 'Bajo';

    // ======================================================
    // 3g. CONSTRUIR DETALLES DE EVALUACIÓN
    // ======================================================
    const detalles = [];

    todosLosSelects.forEach(select => {
        if (select.value) {
            detalles.push({
                bloque: select.dataset.bloque,        // Ej: "ECUF", "ECN"
                atributo: select.dataset.atributo,    // Ej: "SONDEO"
                submotivo: select.dataset.submotivo,  // Ej: "Identifica_Responsable_de_Pago"
                peso: parseFloat(select.dataset.peso), // Peso del item
                cumple: select.value === '1' || select.value === 'NA'  // NA = Cumple
            });
        }
    });

    // Crear fecha formateada para mostrar (DD/MM/YYYY HH:MM)
    const fechaFormateada = `${fechaObj.getDate().toString().padStart(2, '0')}/${(fechaObj.getMonth() + 1).toString().padStart(2, '0')}/${fechaObj.getFullYear()} ${fechaObj.getHours().toString().padStart(2, '0')}:${fechaObj.getMinutes().toString().padStart(2, '0')}`;

    // ======================================================
    // 3h. CONSTRUIR OBJETO EVALUACIÓN
    // ======================================================
    const evaluacion = {
        id: Date.now(),
        timestamp: fechaObj.getTime(),
        evaluador: evaluador,
        ticketPSI: ticketPSI,
        agente: agenteSeleccionado,
        fecha: fechaRaw,
        fechaFormateada: fechaFormateada,
        idLlamada: idLlamada,
        fechaDescarga: convertirFecha(document.getElementById('evalFechaDescargaAudio')?.value),
        totalENC: totalENC,
        totalECUF: totalECUF,
        totalECN: totalECN.toFixed(1),
        notaFinal: notaFinal.toFixed(1),
        rango: rango,
        detalles: detalles,
        fechaRegistro: new Date().toLocaleString('es-ES'),
        tiempoAuditoria: tiempoTotalSegundos,
        tiempoAuditoriaFormateado: tiempoFormateado,
        fechaInicioAuditoria: tiempoInicio.toISOString(),
        fechaFinAuditoria: tiempoFin.toISOString(),  
        // 🔴 NUEVO: Guardar el ID de la versión utilizada
        versionMatrizId: window.versionMatrizActualId || null
    };

    // ======================================================
    // 3i. GUARDAR EN LA BASE DE DATOS
    // ======================================================
    const btnFinalizar = document.getElementById('btnFinalizar');
    let evaluacionGuardada = false;

    try {
        console.log('💾 Guardando evaluación en API...');
        
        // Llamar a la API para guardar
        await API.guardarEvaluacion(evaluacion);
        
        console.log('✅ Evaluación guardada correctamente');
        evaluacionGuardada = true;

        // Mostrar mensaje de éxito con resultados
        let mensajeExito = `📊 RESULTADOS DE EVALUACIÓN:\n\n`;
        mensajeExito += `📅 Fecha: ${fechaFormateada}\n`;
        mensajeExito += `🎫 Ticket PSI: ${ticketPSI}\n`;
        mensajeExito += `✅ ENC: ${totalENC}/15%\n`;
        mensajeExito += `⚠️ ECUF: ${totalECUF}/15%\n`;
        mensajeExito += `💰 ECN: ${totalECN}/70%\n`;
        mensajeExito += `━━━━━━━━━━━━━━━━━━━━━━━━\n`;
        mensajeExito += `🎯 NOTA FINAL: ${notaFinal.toFixed(1)}% (${rango})\n`;
        mensajeExito += `⏱️ TIEMPO: ${tiempoFormateado}\n`;
        mensajeExito += `━━━━━━━━━━━━━━━━━━━━━━━━\n`;
        mensajeExito += `✅ GUARDADO EN LA NUBE CORRECTAMENTE`;

        alert(mensajeExito);

    } catch (error) {
        console.error('❌ Error al guardar en la base de datos:', error);

        // Mostrar mensaje de error
        let mensajeError = `❌ ERROR AL GUARDAR LA EVALUACIÓN\n\n`;
        mensajeError += `Motivo: ${error.message}\n\n`;
        mensajeError += `La evaluación NO se ha guardado.\n`;
        mensajeError += `Complete todos los campos y vuelva a intentar.`;

        alert(mensajeError);

        // Resetear auditoría y restaurar botones
        resetearAuditoria();

        const btnAuditarFinal = document.getElementById('btnAuditar');
        if (btnAuditarFinal) {
            btnAuditarFinal.disabled = false;
            btnAuditarFinal.style.opacity = '1';
            btnAuditarFinal.style.cursor = 'pointer';
        }

        if (btnFinalizar) {
            btnFinalizar.innerHTML = '⏱️ Finalizar y Guardar';
        }

        return;
    }

    // ======================================================
    // 3j. ACTUALIZAR ESCUCHA SI FUE GESTIONADA
    // ======================================================
    // 📌 Si la auditoría vino de una escucha, marcarla como gestionada
    // ======================================================
    if (evaluacionGuardada && window.gestionEscuchaActiva && window.idEscuchaGestionando) {
        await API.marcarEscuchaGestionada(window.idEscuchaGestionando);
        
        console.log('✅ Escucha marcada como gestionada');

        // Limpiar estado de gestión
        window.gestionEscuchaActiva = false;
        window.idEscuchaGestionando = null;

        // Recargar escuchas y cambiar a esa pestaña
        await cargarMisEscuchas();
        showTab('misEscuchas', null);
    }

    // ======================================================
    // 3k. LIMPIAR Y RESETEAR FORMULARIO
    // ======================================================
    limpiarFormularioCompleto();
    resetearAuditoria();
    await actualizarContadorHeader();

    // Deshabilitar botón Auditar hasta nueva selección
    const btnAuditarFinal = document.getElementById('btnAuditar');
    if (btnAuditarFinal) {
        btnAuditarFinal.disabled = true;
        btnAuditarFinal.style.opacity = '0.5';
        btnAuditarFinal.style.cursor = 'not-allowed';
    }

    // Restaurar texto del botón Finalizar
    if (btnFinalizar) {
        btnFinalizar.innerHTML = '⏱️ Finalizar y Guardar';
    }

    // Ocultar elementos de gestión de escucha
    const btnCancelarGestion = document.getElementById('btnCancelarGestion');
    if (btnCancelarGestion) {
        btnCancelarGestion.style.display = 'none';
    }

    const seccionPSI = document.getElementById('seccionDatosPSI');
    if (seccionPSI) {
        seccionPSI.style.display = 'none';
    }

    // Limpiar estado de gestión
    window.gestionEscuchaActiva = false;
    window.idEscuchaGestionando = null;
}

// ======================================================
// BLOQUE 7: RESETEO, LIMPIEZA Y BUSCADOR DE AGENTES
// ======================================================
// 
// 📌 PROPÓSITO: Resetear auditoría, limpiar formulario y buscar agentes
// 📌 COMPONENTES: 
//    1. resetearAuditoria() - Reinicia estado de auditoría
//    2. limpiarFormularioCompleto() - Limpia todos los campos
//    3. inicializarBuscadorAgentes() - Buscador de agentes con autocompletado
// ======================================================

// ======================================================
// 1. FUNCIÓN: resetearAuditoria()
// ======================================================
// 📌 PROPÓSITO: Reiniciar completamente el estado de auditoría
// 📌 ACCIONES:
//    - Salir del modo edición (si está activo)
//    - Detener temporizador
//    - Restaurar botones
//    - Deshabilitar selects
// 📌 USO: Al finalizar auditoría o cancelar
// ======================================================

function resetearAuditoria() {
    // ======================================================
    // 1a. SALIR DEL MODO EDICIÓN
    // ======================================================
    // 📌 Si estamos editando una evaluación, salir de ese modo
    if (modoEdicionActivo) {
        salirModoEdicion();
    }

    // ======================================================
    // 1b. DETENER TEMPORIZADOR
    // ======================================================
    // 📌 Limpiar el intervalo del temporizador
    if (temporizadorInterval) {
        clearInterval(temporizadorInterval);
        temporizadorInterval = null;
    }

    // ======================================================
    // 1c. ELIMINAR TEMPORIZADOR DE LA UI
    // ======================================================
    const timerElement = document.getElementById('temporizadorAuditoria');
    if (timerElement) {
        timerElement.remove();
    }

    // ======================================================
    // 1d. REINICIAR VARIABLES DE ESTADO
    // ======================================================
    auditando = false;      // Ya no hay auditoría activa
    tiempoInicio = null;    // Limpiar tiempo de inicio
    tiempoFin = null;       // Limpiar tiempo de fin

    // ======================================================
    // 1e. OCULTAR SECCIÓN DE DATOS PSI
    // ======================================================
    // 📌 La sección de datos PSI solo se muestra durante la auditoría
    const seccionPSI = document.getElementById('seccionDatosPSI');
    if (seccionPSI) {
        seccionPSI.style.display = 'none';
    }

    // ======================================================
    // 1f. RESTAURAR BOTONES
    // ======================================================
    const btnAuditar = document.getElementById('btnAuditar');
    const btnFinalizar = document.getElementById('btnFinalizar');

    if (btnAuditar) {
        btnAuditar.style.display = 'inline-flex';  // Mostrar botón Auditar
    }
    if (btnFinalizar) {
        btnFinalizar.style.display = 'none';       // Ocultar botón Finalizar
    }

    // ======================================================
    // 1g. DESHABILITAR FORMULARIO
    // ======================================================
    // 📌 Deshabilitar todos los campos del formulario
    deshabilitarFormularioCompleto(true);

    // ======================================================
    // 1h. DESHABILITAR SELECTS DE EVALUACIÓN
    // ======================================================
    const selects = document.querySelectorAll('.cumple-select');
    selects.forEach(select => {
        select.disabled = true;                         // Desactivar
        select.style.backgroundColor = '#f0f0f0';       // Fondo gris (no editable)
    });

    console.log('✅ Auditoría reseteada');
}

// ======================================================
// 2. FUNCIÓN: limpiarFormularioCompleto()
// ======================================================
// 📌 PROPÓSITO: Limpiar completamente todos los campos del formulario
// 📌 ACCIONES:
//    - Limpiar campos de texto
//    - Resetear selects
//    - Limpiar resultados
//    - Resetear estado de atributos
//    - Ocultar elementos de gestión
// 📌 USO: Después de guardar una evaluación o cancelar
// ======================================================

function limpiarFormularioCompleto() {
    console.log('🧹 Limpiando formulario completo...');

    // ======================================================
    // 2a. SALIR DEL MODO EDICIÓN
    // ======================================================
    if (modoEdicionActivo) {
        salirModoEdicion();
    }

    // ======================================================
    // 2b. REMOVER ESTILOS DE ERROR (rojos)
    // ======================================================
    const todosLosCampos = document.querySelectorAll('input, select, textarea');
    todosLosCampos.forEach(campo => {
        campo.style.border = '';           // Quitar borde rojo
        campo.style.backgroundColor = '';  // Quitar fondo rojo
        campo.style.outline = '';          // Quitar outline
    });

    // Remover estilos específicos de selects con error
    const selectsConError = document.querySelectorAll('.cumple-select');
    selectsConError.forEach(select => {
        select.style.border = '';
        select.style.backgroundColor = '';
    });

    // ======================================================
    // 2c. LIMPIAR CAMPOS DE TEXTO BÁSICOS
    // ======================================================
    const evaluador = document.getElementById('evalEvaluador');
    const ticketPSI = document.getElementById('evalTicketPSI');
    const agente = document.getElementById('evalAgente');
    const agenteInput = document.getElementById('evalAgenteInput');
    const idLlamada = document.getElementById('evalIdLlamada');
    const fechaDescarga = document.getElementById('evalFechaDescargaAudio');

    if (evaluador) evaluador.value = '';
    if (ticketPSI) ticketPSI.value = '';
    if (agente) agente.value = '';
    
    // Campo de búsqueda de agente (con autocompletado)
    if (agenteInput) {
        agenteInput.value = '';
        agenteInput.disabled = true;
        agenteInput.placeholder = "Habilite la auditoría para buscar agentes";
        agenteInput.style.background = "#f0f0f0";
        agenteInput.style.cursor = "not-allowed";
    }
    
    if (idLlamada) idLlamada.value = '';
    if (fechaDescarga) {
        fechaDescarga.value = '';
        fechaDescarga.readOnly = true;
        fechaDescarga.disabled = true;
    }

    // ======================================================
    // 2d. LIMPIAR SECCIÓN DE DATOS PSI
    // ======================================================
    const seccionPSI = document.getElementById('seccionDatosPSI');
    if (seccionPSI) {
        seccionPSI.style.display = 'none';
    }

    const psiMotivos = document.getElementById('psiMotivos');
    const psiSubmotivos = document.getElementById('psiSubmotivos');
    const psiSubnivel = document.getElementById('psiSubnivel');
    const psiPeticion = document.getElementById('psiPeticion');

    if (psiMotivos) psiMotivos.value = '';
    if (psiSubmotivos) psiSubmotivos.value = '';
    if (psiSubnivel) psiSubnivel.value = '';
    if (psiPeticion) psiPeticion.value = '';

    // ======================================================
    // 2e. RESETEAR FECHA A LA ACTUAL
    // ======================================================
    const fecha = document.getElementById('evalFecha');
    if (fecha) {
        fecha.value = formatDateForInput(new Date());
    }

    // ======================================================
    // 2f. LIMPIAR TODOS LOS SELECTS DE EVALUACIÓN
    // ======================================================
    const selects = document.querySelectorAll('.cumple-select');
    selects.forEach(select => {
        select.value = '';                  // Resetear valor
        select.disabled = true;             // Deshabilitar
        select.style.border = '';
        select.style.backgroundColor = '#f0f0f0';
    });

    // ======================================================
    // 2g. LIMPIAR INDICADORES DE PESO
    // ======================================================
    const pesos = document.querySelectorAll('.peso-indicador');
    pesos.forEach(peso => {
        peso.textContent = '0%';
        peso.style.color = '';
    });

    // ======================================================
    // 2h. RESETEAR TODOS LOS RESULTADOS
    // ======================================================
    const resultados = [
        'resultadoENC', 'resultadoECUF', 'resultadoECN',
        'resultadoFrenteCliente', 'resultadoFrenteNegocio', 'resultadoFrenteProceso',
        'resultadoProtocolos', 'resultadoEscuchaActiva', 'resultadoGestionEspera', 'resultadoLenguaje',
        'resultadoCorte', 'resultadoRespeto', 'resultadoInformacion',
        'resultadoSondeo', 'resultadoNegociacion', 'resultadoMotivoNoPago',
        'resultadoLugaresPago', 'resultadoCierre', 'resultadoImagen', 'resultadoTipificacion'
    ];

    resultados.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            if (id.includes('resultado') &&
                !id.includes('ENC') && !id.includes('ECUF') && !id.includes('ECN')) {
                el.textContent = '0/0%';
                el.style.color = '';
            } else {
                el.textContent = '0%';
                el.style.backgroundColor = '';
            }
        }
    });

    // ======================================================
    // 2i. RESETEAR ESTADO DE ATRIBUTOS (penalizaciones)
    // ======================================================
    estadoAtributos = {
        'ECUF': {
            'CORTE / ABANDONO DE LLAMADA': { penalizado: false },
            'RESPETO AL CLIENTE': { penalizado: false },
            'BRINDA INFORMACION': { penalizado: false }
        },
        'ECN': {
            'SONDEO': { penalizado: false },
            'NEGOCIACION Y REBATE': { penalizado: false },
            'MOTIVO DE NO PAGO': { penalizado: false },
            'LUGARES DE PAGO': { penalizado: false },
            'CIERRE': { penalizado: false },
            'IMAGEN CORPORATIVA': { penalizado: false },
            'TIPIFICACION': { penalizado: false }
        }
    };

    // ======================================================
    // 2j. REMOVER MENSAJES DE ERROR FLOTANTES
    // ======================================================
    const mensajesError = document.querySelectorAll('.error-message, .validation-error');
    mensajesError.forEach(msg => msg.remove());

    // ======================================================
    // 2k. DESHABILITAR FORMULARIO
    // ======================================================
    deshabilitarFormularioCompleto(true);

    // ======================================================
    // 2l. OCULTAR BOTONES DE ACCIÓN
    // ======================================================
    const btnFinalizar = document.getElementById('btnFinalizar');
    const btnLimpiar = document.getElementById('btnLimpiar');
    const btnAuditar = document.getElementById('btnAuditar');
    const btnCancelarGestion = document.getElementById('btnCancelarGestion');

    if (btnFinalizar) btnFinalizar.style.display = 'none';
    if (btnLimpiar) btnLimpiar.style.display = 'none';
    if (btnAuditar) {
        btnAuditar.disabled = true;
        btnAuditar.style.opacity = '0.5';
        btnAuditar.style.cursor = 'not-allowed';
        btnAuditar.style.display = 'inline-flex';
    }
    if (btnCancelarGestion) btnCancelarGestion.style.display = 'none';

    // ======================================================
    // 2m. RESETEAR ESTILOS DEL CARD
    // ======================================================
    const formularioCard = document.querySelector('.card');
    if (formularioCard) {
        formularioCard.style.border = '';
        formularioCard.style.backgroundColor = '';
    }

    // ======================================================
    // 2n. RESETEAR VARIABLES DE GESTIÓN (CRUCIAL)
    // ======================================================
    window.gestionEscuchaActiva = false;
    window.idEscuchaGestionando = null;
    
    // ======================================================
    // 2o. FORZAR RECARGA VISUAL (CRUCIAL)
    // ======================================================
    // 📌 Esto asegura que cualquier dato residual desaparezca
    // 📌 Recalcular resultados (dejarán de mostrar datos viejos)
    setTimeout(() => {
        recalcularTotalENC();
        actualizarResultadoECUF();
        actualizarResultadoECN();
    }, 50);

    console.log('✅ Formulario limpiado completamente');
}

// ======================================================
// 3. BUSCADOR DE AGENTES
// ======================================================

// ======================================================
// 3a. VARIABLE GLOBAL
// ======================================================
// 📌 Almacena la lista completa de agentes para el buscador
window.listaAgentesCompleta = [];

// ======================================================
// 3b. FUNCIÓN: inicializarBuscadorAgentes()
// ======================================================
// 📌 PROPÓSITO: Configurar el buscador de agentes con autocompletado
// 📌 COMPORTAMIENTO:
//    - Al hacer focus: muestra todos los agentes
//    - Al escribir: filtra agentes coincidentes
//    - Al hacer clic fuera: cierra el dropdown
// 📌 ELEMENTOS: 
//    - evalAgenteInput (campo de texto)
//    - agenteDropdown (lista desplegable)
// ======================================================

function inicializarBuscadorAgentes() {
    const input = document.getElementById('evalAgenteInput');
    const dropdown = document.getElementById('agenteDropdown');

    if (!input || !dropdown) {
        console.error('❌ Elementos no encontrados');
        return;
    }

    console.log('✅ Inicializando buscador...');

    // ======================================================
    // 3b.1. REMOVER EVENTOS ANTERIORES (clonando)
    // ======================================================
    // 📌 Evitar duplicación de event listeners
    const nuevoInput = input.cloneNode(true);
    input.parentNode.replaceChild(nuevoInput, input);

    const inputFinal = document.getElementById('evalAgenteInput');

    // ======================================================
    // 3b.2. EVENTO: FOCUS - Mostrar dropdown
    // ======================================================
    inputFinal.addEventListener('focus', function () {
        console.log('📌 Focus - Mostrando dropdown');
        const dropdownDiv = document.getElementById('agenteDropdown');
        
        if (window.listaAgentesCompleta && window.listaAgentesCompleta.length > 0) {
            // Si ya hay agentes cargados, mostrarlos
            mostrarAgentesEnDropdown(window.listaAgentesCompleta);
        } else {
            // Si no hay agentes, cargarlos primero
            cargarAgentes().then(() => {
                mostrarAgentesEnDropdown(window.listaAgentesCompleta);
            });
        }
        
        if (dropdownDiv) dropdownDiv.classList.add('show');
    });

    // ======================================================
    // 3b.3. EVENTO: INPUT - Filtrar agentes
    // ======================================================
    inputFinal.addEventListener('input', function (e) {
        const texto = this.value;
        console.log('✏️ Escribiendo:', texto);
        
        // Filtrar agentes según el texto ingresado
        filtrarAgentes(texto);
        
        // Mostrar el dropdown
        const dropdownDiv = document.getElementById('agenteDropdown');
        if (dropdownDiv) dropdownDiv.classList.add('show');
    });

    // ======================================================
    // 3b.4. EVENTO: CLICK FUERA - Cerrar dropdown
    // ======================================================
    document.addEventListener('click', function (e) {
        const container = document.getElementById('agente-container');
        const dropdownDiv = document.getElementById('agenteDropdown');
        
        // Si el clic fue fuera del contenedor, cerrar dropdown
        if (container && dropdownDiv && !container.contains(e.target)) {
            dropdownDiv.classList.remove('show');
        }
    });
}

// ======================================================
// 4. FUNCIONES AUXILIARES DEL BUSCADOR
// ======================================================

// ----------------------------------------------------------------------
// mostrarAgentesEnDropdown - Muestra agentes en el dropdown
// ----------------------------------------------------------------------
// 📌 PROPÓSITO: Renderizar la lista de agentes en el dropdown
// 📌 PARÁMETROS: agentes (array de strings)
// ======================================================
function mostrarAgentesEnDropdown(agentes) {
    const dropdown = document.getElementById('agenteDropdown');
    if (!dropdown) return;

    if (!agentes || agentes.length === 0) {
        dropdown.innerHTML = '<div class="dropdown-empty">No hay agentes disponibles</div>';
        return;
    }

    let html = '';
    agentes.forEach(agente => {
        html += `<div class="dropdown-item" onclick="seleccionarAgente('${agente}')">${agente}</div>`;
    });

    dropdown.innerHTML = html;
}

// ----------------------------------------------------------------------
// filtrarAgentes - Filtra agentes por texto de búsqueda
// ----------------------------------------------------------------------
// 📌 PROPÓSITO: Mostrar solo los agentes que coinciden con la búsqueda
// 📌 PARÁMETROS: texto (string) - texto a buscar
// ======================================================
function filtrarAgentes(texto) {
    if (!texto || texto.trim() === '') {
        // Si no hay texto, mostrar todos
        mostrarAgentesEnDropdown(window.listaAgentesCompleta);
        return;
    }

    const textoLower = texto.toLowerCase().trim();
    const filtrados = window.listaAgentesCompleta.filter(agente =>
        agente.toLowerCase().includes(textoLower)
    );

    mostrarAgentesEnDropdown(filtrados);
}

// ----------------------------------------------------------------------
// seleccionarAgente - Selecciona un agente del dropdown
// ----------------------------------------------------------------------
// 📌 PROPÓSITO: Asignar el agente seleccionado al campo de texto
// 📌 PARÁMETROS: agente (string) - nombre del agente seleccionado
// ======================================================
function seleccionarAgente(agente) {
    const input = document.getElementById('evalAgenteInput');
    if (input) {
        input.value = agente;
    }

    // Cerrar dropdown
    const dropdown = document.getElementById('agenteDropdown');
    if (dropdown) {
        dropdown.classList.remove('show');
    }

    console.log('✅ Agente seleccionado:', agente);
}

// ======================================================
// BLOQUE 8: FILTRADO Y SELECCIÓN DE AGENTES + CONTROL DE FORMULARIO
// ======================================================
// 
// 📌 PROPÓSITO: Gestionar el buscador de agentes y el control del formulario
// 📌 COMPONENTES: 
//    1. filtrarAgentes() - Filtra agentes en tiempo real
//    2. seleccionarAgente() - Selecciona un agente del dropdown
//    3. actualizarListaAgentes() - Carga agentes desde localStorage
//    4. deshabilitarFormularioCompleto() - Controla estado del formulario
//    5. habilitarFormularioParaAuditoria() - Habilita campos para auditoría
// ======================================================

// ======================================================
// 1. FUNCIÓN: filtrarAgentes()
// ======================================================
// 📌 PROPÓSITO: Filtrar la lista de agentes según texto de búsqueda
// 📌 CARACTERÍSTICAS:
//    - Búsqueda sin acentos (normalización Unicode)
//    - Resalta coincidencias en negrita
//    - Muestra contador de resultados
//    - Mensaje cuando no hay resultados
// 📌 PARÁMETROS: busqueda (string) - texto a buscar
// 📌 DEPENDENCIAS: window.listaAgentesCompleta, escapeHtml()
// ======================================================

function filtrarAgentes(busqueda) {
    // Obtener referencia al dropdown
    const dropdown = document.getElementById('agenteDropdown');

    if (!dropdown) {
        console.error('❌ Dropdown no encontrado');
        return;
    }

    // Usar la lista global de agentes
    const agentes = window.listaAgentesCompleta || [];

    console.log('🔍 Filtrando agentes. Búsqueda:', busqueda, 'Total:', agentes.length);

    // ======================================================
    // 1a. VALIDAR: No hay agentes cargados
    // ======================================================
    if (agentes.length === 0) {
        dropdown.innerHTML = `
            <div class="select-buscador-empty">
                ⚠️ No hay agentes cargados.<br>
                Haga clic en "Auditar" para cargar los agentes desde la base de datos.
            </div>
        `;
        dropdown.classList.add('show');
        return;
    }

    // ======================================================
    // 1b. NORMALIZAR BÚSQUEDA (eliminar acentos)
    // ======================================================
    // 📌 "Normalize NFD" descompone caracteres acentuados
    // 📌 Luego se eliminan los diacríticos (tildes)
    const busquedaLower = busqueda.toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

    // ======================================================
    // 1c. FILTRAR AGENTES
    // ======================================================
    let filtrados = agentes;
    if (busquedaLower) {
        filtrados = agentes.filter(agente =>
            agente.toLowerCase()
                .normalize("NFD")
                .replace(/[\u0300-\u036f]/g, "")
                .includes(busquedaLower)
        );
    }

    console.log(`📊 Resultados filtrados: ${filtrados.length} de ${agentes.length}`);

    // ======================================================
    // 1d. NO HAY RESULTADOS
    // ======================================================
    if (filtrados.length === 0) {
        dropdown.innerHTML = `
            <div class="select-buscador-empty">
                ❌ No se encontraron resultados para "${escapeHtml(busqueda)}"
            </div>
        `;
        dropdown.classList.add('show');
        return;
    }

    // ======================================================
    // 1e. GENERAR HTML DE RESULTADOS
    // ======================================================
    
    // Mostrar contador de resultados
    let html = `<div class="select-buscador-resultados">🔍 ${filtrados.length} resultado${filtrados.length !== 1 ? 's' : ''}</div>`;

    // Generar cada opción
    filtrados.forEach(agente => {
        let nombreResaltado = escapeHtml(agente);
        
        // Si hay búsqueda, resaltar coincidencias en negrita
        if (busquedaLower) {
            const regex = new RegExp(`(${busquedaLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
            nombreResaltado = nombreResaltado.replace(regex, '<strong>$1</strong>');
        }

        html += `
            <div class="select-buscador-option" 
                data-value="${escapeHtml(agente)}" 
                data-text="${escapeHtml(agente)}"
                onclick="seleccionarAgente('${escapeHtml(agente).replace(/'/g, "\\'")}', '${escapeHtml(agente).replace(/'/g, "\\'")}')">
                ${nombreResaltado}
            </div>
        `;
    });

    // Actualizar dropdown y mostrarlo
    dropdown.innerHTML = html;
    dropdown.classList.add('show');
}

// ======================================================
// 2. FUNCIÓN: seleccionarAgente()
// ======================================================
// 📌 PROPÓSITO: Seleccionar un agente del dropdown
// 📌 PARÁMETROS: 
//    - valor (string): valor para el campo hidden
//    - texto (string): texto para mostrar en el input
// 📌 ACCIONES:
//    - Llena el campo de texto visible
//    - Llena el campo hidden (para el formulario)
//    - Marca la opción como seleccionada
//    - Oculta el dropdown
// ======================================================

function seleccionarAgente(valor, texto) {
    // Obtener referencias a los elementos
    const input = document.getElementById('evalAgenteInput');
    const hiddenInput = document.getElementById('evalAgente');
    const dropdown = document.getElementById('agenteDropdown');

    // Asignar valores
    if (input) input.value = texto;          // Campo visible
    if (hiddenInput) hiddenInput.value = valor;  // Campo oculto (para el formulario)

    console.log('✅ Agente seleccionado:', valor);

    // ======================================================
    // 2a. REMOVER SELECCIÓN DE TODAS LAS OPCIONES
    // ======================================================
    const options = dropdown.querySelectorAll('.select-buscador-option');
    options.forEach(opt => opt.classList.remove('selected'));

    // ======================================================
    // 2b. MARCAR LA OPCIÓN SELECCIONADA
    // ======================================================
    const selected = dropdown.querySelector(`.select-buscador-option[data-value="${valor.replace(/"/g, '&quot;')}"]`);
    if (selected) selected.classList.add('selected');

    // ======================================================
    // 2c. OCULTAR DROPDOWN (con retraso para que se vea la selección)
    // ======================================================
    setTimeout(() => {
        dropdown.classList.remove('show');
    }, 200);
}

// ======================================================
// 3. FUNCIÓN: actualizarListaAgentes()
// ======================================================
// 📌 PROPÓSITO: Cargar agentes desde localStorage
// 📌 RETORNO: true (éxito) o false (error)
// 📌 USO: Al iniciar el formulario o recargar agentes
// ======================================================

function actualizarListaAgentes() {
    // Obtener datos guardados en localStorage
    const agentesGuardados = localStorage.getItem('agentes_cobranza');

    if (agentesGuardados) {
        try {
            // Parsear JSON
            const data = JSON.parse(agentesGuardados);
            window.listaAgentesCompleta = data.agentes || [];  // Asignar a variable global

            console.log(`✅ Buscador actualizado: ${window.listaAgentesCompleta.length} agentes cargados`);

            // ======================================================
            // 3a. ACTUALIZAR SELECT ORIGINAL (compatibilidad)
            // ======================================================
            const selectAgente = document.getElementById('evalAgente');
            if (selectAgente) {
                selectAgente.innerHTML = '<option value="">Seleccione Agente</option>';
                window.listaAgentesCompleta.forEach(agente => {
                    selectAgente.innerHTML += `<option value="${agente}">${agente}</option>`;
                });
            }
            return true;
        } catch (e) {
            console.error('Error al parsear agentes:', e);
            window.listaAgentesCompleta = [];
        }
    } else {
        console.warn('⚠️ No hay agentes guardados en localStorage');
        window.listaAgentesCompleta = [];
    }
    return false;
}

// ======================================================
// 4. FUNCIÓN: agregarEstilosDropdown()
// ======================================================
// 📌 PROPÓSITO: Agregar estilos CSS para el dropdown
// 📌 EJECUCIÓN: Una sola vez al cargar la página
// ======================================================

function agregarEstilosDropdown() {
    // Verificar si ya existen los estilos
    if (document.getElementById('dropdown-styles')) return;

    // Crear y agregar estilos
    const style = document.createElement('style');
    style.id = 'dropdown-styles';
    style.textContent = `
        .select-buscador-dropdown.show {
            display: block !important;
        }
        .select-buscador-option.selected {
            background: var(--accent) !important;
            color: white !important;
        }
        .select-buscador-option {
            cursor: pointer;
            transition: background 0.2s;
        }
        .select-buscador-option:hover {
            background: #e3f2fd !important;
        }
    `;
    document.head.appendChild(style);
}

// ======================================================
// 5. SOBRESCRITURA: habilitarFormularioParaAuditoria()
// ======================================================
// 📌 PROPÓSITO: Habilitar el formulario para auditoría
// 📌 ACCIONES:
//    - Recargar agentes desde localStorage
//    - Habilitar campos según el modo (gestión de escucha o no)
//    - Mostrar mensaje si no hay agentes
// ======================================================

// Guardar referencia a la función original
const originalHabilitarFormulario = habilitarFormularioParaAuditoria;

// Sobrescribir función
habilitarFormularioParaAuditoria = function () {
    console.log('🔓 Habilitando formulario para auditoría...');

    // ======================================================
    // 5a. RECARGAR AGENTES
    // ======================================================
    actualizarListaAgentes();

    // ======================================================
    // 5b. LLAMAR A LA FUNCIÓN ORIGINAL
    // ======================================================
    if (originalHabilitarFormulario) originalHabilitarFormulario();

    // ======================================================
    // 5c. HABILITAR INPUT DE AGENTE
    // ======================================================
    const agenteInput = document.getElementById('evalAgenteInput');
    if (agenteInput) {
        agenteInput.disabled = false;
        agenteInput.placeholder = "Buscar agente... (escriba para filtrar)";
        agenteInput.style.background = "#fcfdfe";
        agenteInput.style.cursor = "text";
        agenteInput.value = ''; // Limpiar cualquier valor previo
    }

    // ======================================================
    // 5d. MOSTRAR MENSAJE SI NO HAY AGENTES
    // ======================================================
    if (window.listaAgentesCompleta.length === 0) {
        console.warn('⚠️ No hay agentes cargados');
        const dropdown = document.getElementById('agenteDropdown');
        if (dropdown) {
            dropdown.innerHTML = `
                <div class="select-buscador-empty">
                    ⚠️ No hay agentes cargados.<br>
                    Vaya a la pestaña "Cargar Agentes" y cargue un archivo Excel.
                </div>
            `;
        }
    }
};

// ======================================================
// 6. SOBRESCRITURA: limpiarFormulario()
// ======================================================
// 📌 PROPÓSITO: Limpiar formulario y resetear auditoría
// ======================================================

// Guardar referencia a la función original
const originalLimpiarFormulario = limpiarFormulario;

// Sobrescribir función
limpiarFormulario = function () {
    // ======================================================
    // 6a. RESETEAR AUDITORÍA SI ESTÁ ACTIVA
    // ======================================================
    if (auditando) {
        resetearAuditoria();
    }

    // ======================================================
    // 6b. LLAMAR A LA FUNCIÓN ORIGINAL
    // ======================================================
    originalLimpiarFormulario();

    // ======================================================
    // 6c. DESHABILITAR FORMULARIO
    // ======================================================
    deshabilitarFormularioCompleto(true);
};

// ======================================================
// 7. FUNCIÓN: deshabilitarFormularioCompleto()
// ======================================================
// 📌 PROPÓSITO: Deshabilitar/habilitar todos los campos del formulario
// 📌 PARÁMETROS: deshabilitar (boolean)
// 📌 ACCIONES:
//    - Campos básicos (Evaluador, Ticket, Agente, Fecha, ID Llamada)
//    - Input de búsqueda de agentes
//    - Todos los selects de evaluación
// ======================================================

function deshabilitarFormularioCompleto(deshabilitar) {
    // ======================================================
    // 7a. CAMPOS BÁSICOS
    // ======================================================
    const camposBasicos = ['evalEvaluador', 'evalTicketPSI', 'evalAgente', 'evalFecha', 'evalIdLlamada'];
    camposBasicos.forEach(campoId => {
        const campo = document.getElementById(campoId);
        if (campo) campo.disabled = deshabilitar;
    });

    // ======================================================
    // 7b. SI SE DESHABILITA, RESETEAR SELECTS
    // ======================================================
    if (deshabilitar) {
        // Resetear select de auditores
        const selectAuditor = document.getElementById('evalEvaluador');
        if (selectAuditor) {
            while (selectAuditor.options.length > 1) {
                selectAuditor.remove(1);
            }
            selectAuditor.value = '';
        }

        // Limpiar buscador de agentes
        const agenteInput = document.getElementById('evalAgenteInput');
        if (agenteInput) {
            agenteInput.value = '';
        }

        const agenteHidden = document.getElementById('evalAgente');
        if (agenteHidden) {
            agenteHidden.value = '';
        }
    }

    // ======================================================
    // 7c. INPUT DE BÚSQUEDA DE AGENTES
    // ======================================================
    const agenteInput = document.getElementById('evalAgenteInput');
    if (agenteInput) {
        agenteInput.disabled = deshabilitar;
        if (deshabilitar) {
            agenteInput.placeholder = "Habilite la auditoría para buscar agentes";
            agenteInput.style.background = "#f0f0f0";
            agenteInput.style.cursor = "not-allowed";
        } else {
            agenteInput.placeholder = "Buscar agente... (escriba para filtrar)";
            agenteInput.style.background = "#fcfdfe";
            agenteInput.style.cursor = "text";
        }
    }

    // ======================================================
    // 7d. SELECTS DE EVALUACIÓN
    // ======================================================
    const selects = document.querySelectorAll('.cumple-select');
    selects.forEach(select => {
        select.disabled = deshabilitar;
    });
}

// ======================================================
// 8. FUNCIÓN: habilitarFormularioParaAuditoria()
// ======================================================
// 📌 PROPÓSITO: Habilitar el formulario para auditoría
// 📌 DIFERENCIA: 
//    - Si viene de "Mis Escuchas" → campos básicos bloqueados (datos precargados)
//    - Si es manual → todos los campos habilitados
// ======================================================

function habilitarFormularioParaAuditoria() {
    console.log('🔓 Habilitando formulario para auditoría...');

    // ======================================================
    // 8a. MODO MANUAL (NO gestión de escucha)
    // ======================================================
    if (!window.gestionEscuchaActiva) {
        // Cargar auditores
        cargarAuditores();

        // Cargar agentes
        cargarAgentes().then(() => {
            console.log('✅ Agentes listos');
            const input = document.getElementById('evalAgenteInput');
            if (input && document.activeElement === input) {
                mostrarAgentesEnDropdown(window.listaAgentesCompleta);
            }
        });

        // Habilitar campos básicos
        const campos = ['evalEvaluador', 'evalTicketPSI', 'evalAgente', 'evalFecha', 'evalIdLlamada'];
        campos.forEach(id => {
            const campo = document.getElementById(id);
            if (campo) campo.disabled = false;
        });

        const agenteInput = document.getElementById('evalAgenteInput');
        if (agenteInput) {
            agenteInput.disabled = false;
            agenteInput.placeholder = "Buscar agente...";
            agenteInput.style.background = "#fcfdfe";
        }
    } else {
        // ======================================================
        // 8b. MODO GESTIÓN DE ESCUCHA (datos precargados)
        // ======================================================
        console.log('🔒 Modo gestión de escucha - campos básicos bloqueados');

        // Asegurar que los campos precargados sigan bloqueados
        const ticketPSI = document.getElementById('evalTicketPSI');
        const agenteInput = document.getElementById('evalAgenteInput');
        const idLlamada = document.getElementById('evalIdLlamada');
        const fechaInput = document.getElementById('evalFecha');

        if (ticketPSI) {
            ticketPSI.readOnly = true;
            ticketPSI.disabled = true;
        }
        if (agenteInput) {
            agenteInput.disabled = true;
        }
        if (idLlamada) {
            idLlamada.readOnly = true;
            idLlamada.disabled = true;
        }
        if (fechaInput) {
            fechaInput.disabled = true;
        }
    }

    // ======================================================
    // 8c. SIEMPRE HABILITAR SELECTS DE EVALUACIÓN
    // ======================================================
    const selects = document.querySelectorAll('.cumple-select');
    selects.forEach(select => select.disabled = false);

    // ======================================================
    // 8d. MOSTRAR BOTÓN LIMPIAR
    // ======================================================
    const btnLimpiar = document.getElementById('btnLimpiar');
    if (btnLimpiar) btnLimpiar.style.display = 'inline-flex';
}

// ======================================================
// BLOQUE 9: FUNCIONES DE CÁLCULO - ERRORES NO CRÍTICOS (ENC)
// ======================================================
// 
// 📌 PROPÓSITO: Calcular puntajes de cada frente (ENC, ECUF, ECN)
// 📌 ESTRUCTURA:
//    1. actualizarResultadoAtributo() - Punto de entrada principal
//    2. manejarGrupoCritico() - Versión antigua (con penalización de grupo)
//    3. manejarGrupoCriticoECUF() - Versión nueva (items independientes)
//    4. manejarGrupoCriticoECN() - Versión nueva (items independientes)
//    5. actualizarTotalAtributoECUF() - Suma ponderada por atributo
// ======================================================

// ======================================================
// 1. FUNCIÓN: actualizarResultadoAtributo()
// ======================================================
// 📌 PROPÓSITO: Actualizar el resultado cuando un select cambia
// 📌 PARÁMETROS: select (elemento DOM), atributo (string)
// 📌 FLUJO: Determina el bloque (ENC, ECUF, ECN) y llama a la función correspondiente
// ======================================================

function actualizarResultadoAtributo(select, atributo) {
    // Obtener el bloque al que pertenece el select
    const bloque = select.dataset.bloque;

    // ======================================================
    // 1a. BLOQUE ENC (Cliente) - Error No Crítico
    // ======================================================
    // 📌 Cada item es independiente (suma individual)
    // 📌 No hay penalización de grupo
    // ======================================================
    if (bloque === 'ENC') {
        const submotivo = select.dataset.submotivo;
        const peso = parseFloat(select.dataset.peso);
        const valor = select.value === '1' ? peso : 0;

        // Actualizar indicador visual de peso
        const pesoElement = document.getElementById(`peso-${submotivo}`);
        if (pesoElement) {
            pesoElement.textContent = valor + '%';
            pesoElement.style.color = valor > 0 ? 'var(--ok)' : (select.value === '0' ? 'var(--danger)' : '');
        }

        // Recalcular todo el bloque ENC
        recalcularAtributoENC(atributo);
        return;
    }

    // ======================================================
    // 1b. BLOQUE ECUF (Negocio) - Error Crítico
    // ======================================================
    // 📌 Cada item es independiente (suma individual)
    // 📌 No hay penalización de grupo (CORREGIDO)
    // ======================================================
    if (bloque === 'ECUF') {
        manejarGrupoCriticoECUF(select);
        return;
    }

    // ======================================================
    // 1c. BLOQUE ECN (Proceso) - Error Crítico
    // ======================================================
    // 📌 Cada item es independiente (suma individual)
    // 📌 No hay penalización de grupo (CORREGIDO)
    // ======================================================
    if (bloque === 'ECN') {
        manejarGrupoCriticoECN(select);
        return;
    }
}

// ======================================================
// 2. FUNCIÓN: manejarGrupoCritico()
// ======================================================
// 📌 PROPÓSITO: Manejar la selección de items críticos (VERSIÓN ANTIGUA)
// 📌 CARACTERÍSTICA: PENALIZACIÓN DE GRUPO
//    - Si un item falla, TODO el grupo falla
//    - Si el grupo está penalizado y se cambia uno a CUMPLE, se libera el grupo
// 📌 PARÁMETROS: selectActual (elemento DOM que cambió)
// 📌 NOTA: Esta función es la versión original, se mantiene por compatibilidad
// ======================================================

function manejarGrupoCritico(selectActual) {
    // Obtener datos del select
    const bloque = selectActual.dataset.bloque;
    const atributo = selectActual.dataset.atributo;
    const valorActual = selectActual.value;

    // Buscar todos los selects del mismo grupo (bloque + atributo)
    const selectsGrupo = document.querySelectorAll(
        `.cumple-select[data-bloque="${bloque}"][data-atributo="${atributo}"]`
    );

    // Obtener el estado del grupo (penalizado o no)
    const estadoGrupo = estadoAtributos[bloque][atributo];

    // ======================================================
    // CASO A: Usuario marcó NO CUMPLE (valor = '0')
    // ======================================================
    // 📌 Todo el grupo pasa a NO CUMPLE y queda penalizado
    // ======================================================
    if (valorActual === '0') {
        estadoGrupo.penalizado = true;

        selectsGrupo.forEach(select => {
            select.value = '0';

            const submotivo = select.dataset.submotivo;
            const pesoElement = document.getElementById(`peso-${submotivo}`);
            if (pesoElement) {
                pesoElement.textContent = '0%';
                pesoElement.style.color = 'var(--danger)';
            }
        });
    }

    // ======================================================
    // CASO B: Grupo penalizado y usuario cambia uno a CUMPLE
    // ======================================================
    // 📌 Ese item queda en CUMPLE, los demás vuelven a SELECT (vacío)
    // 📌 Se libera la penalización del grupo
    // ======================================================
    else if (valorActual === '1' && estadoGrupo.penalizado) {
        estadoGrupo.penalizado = false;

        selectsGrupo.forEach(select => {
            if (select === selectActual) {
                select.value = '1';
            } else {
                select.value = '';
            }

            const submotivo = select.dataset.submotivo;
            const pesoElement = document.getElementById(`peso-${submotivo}`);
            if (pesoElement) {
                if (select.value === '1') {
                    pesoElement.textContent = `${select.dataset.peso}%`;
                    pesoElement.style.color = 'var(--ok)';
                } else {
                    pesoElement.textContent = '0%';
                    pesoElement.style.color = '';
                }
            }
        });
    }

    // ======================================================
    // CASO C: Selección normal (sin penalización)
    // ======================================================
    // 📌 Solo se actualiza el item seleccionado
    // ======================================================
    else {
        const submotivo = selectActual.dataset.submotivo;
        const pesoElement = document.getElementById(`peso-${submotivo}`);

        if (pesoElement) {
            if (valorActual === '1') {
                pesoElement.textContent = `${selectActual.dataset.peso}%`;
                pesoElement.style.color = 'var(--ok)';
            } else if (valorActual === '0') {
                pesoElement.textContent = '0%';
                pesoElement.style.color = 'var(--danger)';
            } else {
                pesoElement.textContent = '0%';
                pesoElement.style.color = '';
            }
        }
    }

    // ======================================================
    // 2d. RECALCULAR BLOQUE COMPLETO
    // ======================================================
    if (bloque === 'ECUF') {
        actualizarResultadoECUF();
    } else if (bloque === 'ECN') {
        actualizarResultadoECN();
    }
}

// ======================================================
// 3. FUNCIÓN: manejarGrupoCriticoECUF()
// ======================================================
// 📌 PROPÓSITO: Manejar la selección de items ECUF (Negocio)
// 📌 CARACTERÍSTICA: Cada item es INDEPENDIENTE (sin penalización de grupo)
// 📌 PARÁMETROS: selectActual (elemento DOM que cambió)
// ======================================================

function manejarGrupoCriticoECUF(selectActual) {
    // Obtener datos del select
    const atributo = selectActual.dataset.atributo;
    const valorActual = selectActual.value;
    const submotivo = selectActual.dataset.submotivo;
    const pesoElement = document.getElementById(`peso-${submotivo}`);

    // ======================================================
    // 3a. ACTUALIZAR INDICADOR VISUAL DE PESO
    // ======================================================
    if (pesoElement) {
        if (valorActual === '1') {
            // ✅ Cumple: muestra el peso completo en verde
            pesoElement.textContent = `${selectActual.dataset.peso}%`;
            pesoElement.style.color = 'var(--ok)';
        } else if (valorActual === '0') {
            // ❌ No Cumple: muestra 0% en rojo
            pesoElement.textContent = '0%';
            pesoElement.style.color = 'var(--danger)';
        } else {
            // ⚪ Sin seleccionar: muestra 0% sin color
            pesoElement.textContent = '0%';
            pesoElement.style.color = '';
        }
    }

    // ======================================================
    // 3b. ACTUALIZAR TOTAL DEL ATRIBUTO
    // ======================================================
    // 📌 Recalcular la suma de todos los items del mismo atributo
    actualizarTotalAtributoECUF(atributo);

    // ======================================================
    // 3c. RECALCULAR BLOQUE COMPLETO ECUF
    // ======================================================
    // 📌 Actualizar el resultado total del frente ECUF
    actualizarResultadoECUF();
}

// ======================================================
// 4. FUNCIÓN: manejarGrupoCriticoECN()
// ======================================================
// 📌 PROPÓSITO: Manejar la selección de items ECN (Proceso)
// 📌 CARACTERÍSTICA: Cada item es INDEPENDIENTE (sin penalización de grupo)
// 📌 PARÁMETROS: selectActual (elemento DOM que cambió)
// ======================================================

function manejarGrupoCriticoECN(selectActual) {
    // Obtener datos del select
    const atributo = selectActual.dataset.atributo;
    const valorActual = selectActual.value;
    const submotivo = selectActual.dataset.submotivo;
    const pesoElement = document.getElementById(`peso-${submotivo}`);

    // ======================================================
    // 4a. ACTUALIZAR INDICADOR VISUAL DE PESO
    // ======================================================
    if (pesoElement) {
        if (valorActual === '1') {
            // ✅ Cumple: muestra el peso completo en verde
            pesoElement.textContent = `${selectActual.dataset.peso}%`;
            pesoElement.style.color = 'var(--ok)';
        } else if (valorActual === '0') {
            // ❌ No Cumple: muestra 0% en rojo
            pesoElement.textContent = '0%';
            pesoElement.style.color = 'var(--danger)';
        } else {
            // ⚪ Sin seleccionar: muestra 0% sin color
            pesoElement.textContent = '0%';
            pesoElement.style.color = '';
        }
    }

    // ======================================================
    // 4b. ACTUALIZAR TOTAL DEL ATRIBUTO
    // ======================================================
    // 📌 Recalcular la suma de todos los items del mismo atributo
    actualizarTotalAtributoECN(atributo);

    // ======================================================
    // 4c. RECALCULAR BLOQUE COMPLETO ECN
    // ======================================================
    // 📌 Actualizar el resultado total del frente ECN
    actualizarResultadoECN();
}

// ======================================================
// 5. FUNCIÓN: actualizarTotalAtributoECUF()
// ======================================================
// 📌 PROPÓSITO: Calcular el total de un atributo específico de ECUF
// 📌 PARÁMETROS: atributo (string) - nombre del atributo
// 📌 MECANISMO: Suma todos los items del atributo (independiente)
// 📌 ACTUALIZA: Elemento de resultado correspondiente
// ======================================================

function actualizarTotalAtributoECUF(atributo) {
    let pesoTotal = 0;      // Peso máximo posible del atributo
    let pesoObtenido = 0;   // Peso obtenido según selecciones

    // Buscar todos los selects del atributo específico en ECUF
    const selects = document.querySelectorAll(
        `.cumple-select[data-bloque="ECUF"][data-atributo="${atributo}"]`
    );

    // ======================================================
    // 5a. SUMAR PESOS DE TODOS LOS ITEMS
    // ======================================================
    selects.forEach(select => {
        const peso = parseFloat(select.dataset.peso);
        pesoTotal += peso;

        // Cada item suma INDEPENDIENTEMENTE (sin penalización)
        if (select.value === '1') {
            pesoObtenido += peso;
        }
    });

    // ======================================================
    // 5b. MAPEAR ATRIBUTOS A IDs DE RESULTADO
    // ======================================================
    const mapaIDs = {
        'CORTE / ABANDONO DE LLAMADA': 'resultadoCorte',
        'RESPETO AL CLIENTE': 'resultadoRespeto',
        'BRINDA INFORMACION': 'resultadoInformacion'
    };

    const resultadoId = mapaIDs[atributo];
    if (resultadoId) {
        const resultadoElement = document.getElementById(resultadoId);
        if (resultadoElement) {
            // Mostrar formato: "obtenido/total%"
            resultadoElement.textContent = `${pesoObtenido}/${pesoTotal}%`;

            // Cambiar color según resultado
            if (pesoObtenido === pesoTotal) {
                // ✅ Todos los items cumplen
                resultadoElement.style.color = 'var(--ok)';
            } else if (pesoObtenido > 0) {
                // 🟡 Algunos items cumplen
                resultadoElement.style.color = 'var(--warning)';
            } else {
                // 🔴 Ningún item cumple
                resultadoElement.style.color = 'var(--danger)';
            }
        }
    }
}



// ======================================================
// BLOQUE 10: FUNCIONES DE CÁLCULO DE TOTALES
// ======================================================
// 
// 📌 PROPÓSITO: Calcular los totales de cada frente (ENC, ECUF, ECN)
// 📌 ESTRUCTURA:
//    1. actualizarTotalAtributoECN() - Total por atributo en ECN
//    2. recalcularAtributoENC() - Recalcula un atributo ENC específico
//    3. recalcularTotalENC() - Total del frente ENC
//    4. recalcularTotalENCDesdeContainer() - ENC desde contenedor específico
//    5. actualizarResultadoECUF() - Total del frente ECUF
//    6. recalcularTotalECUFDesdeContainer() - ECUF desde contenedor específico
// ======================================================

// ======================================================
// 1. FUNCIÓN: actualizarTotalAtributoECN()
// ======================================================
// 📌 PROPÓSITO: Calcular el total de un atributo específico de ECN
// 📌 PARÁMETROS: atributo (string) - nombre del atributo
// 📌 CARACTERÍSTICA: Cada item es INDEPENDIENTE (sin penalización de grupo)
// 📌 ACTUALIZA: Elemento de resultado correspondiente
// ======================================================

function actualizarTotalAtributoECN(atributo) {
    let pesoTotal = 0;      // Peso máximo posible del atributo
    let pesoObtenido = 0;   // Peso obtenido según selecciones

    // Buscar todos los selects del atributo específico en ECN
    const selects = document.querySelectorAll(
        `.cumple-select[data-bloque="ECN"][data-atributo="${atributo}"]`
    );

    // ======================================================
    // 1a. SUMAR PESOS DE TODOS LOS ITEMS
    // ======================================================
    selects.forEach(select => {
        const peso = parseFloat(select.dataset.peso);
        pesoTotal += peso;

        // Cada item suma INDEPENDIENTEMENTE (sin penalización)
        if (select.value === '1') {
            pesoObtenido += peso;
        }
    });

    // ======================================================
    // 1b. MAPEAR ATRIBUTOS A IDs DE RESULTADO
    // ======================================================
    const mapaIDs = {
        'SONDEO': 'resultadoSondeo',
        'NEGOCIACION Y REBATE': 'resultadoNegociacion',
        'MOTIVO DE NO PAGO': 'resultadoMotivoNoPago',
        'LUGARES DE PAGO': 'resultadoLugaresPago',
        'CIERRE': 'resultadoCierre',
        'IMAGEN CORPORATIVA': 'resultadoImagen',
        'TIPIFICACION': 'resultadoTipificacion'
    };

    const resultadoId = mapaIDs[atributo];
    if (resultadoId) {
        const resultadoElement = document.getElementById(resultadoId);
        if (resultadoElement) {
            // Mostrar formato: "obtenido/total%"
            resultadoElement.textContent = `${pesoObtenido}/${pesoTotal}%`;

            // Cambiar color según resultado
            if (pesoObtenido === pesoTotal) {
                // ✅ Todos los items cumplen
                resultadoElement.style.color = 'var(--ok)';
            } else if (pesoObtenido > 0) {
                // 🟡 Algunos items cumplen
                resultadoElement.style.color = 'var(--warning)';
            } else {
                // 🔴 Ningún item cumple
                resultadoElement.style.color = 'var(--danger)';
            }
        }
    }
}

// ======================================================
// 2. FUNCIÓN: recalcularAtributoENC()
// ======================================================
// 📌 PROPÓSITO: Recalcular un atributo específico de ENC
// 📌 PARÁMETROS: atributo (string) - nombre del atributo
// 📌 MECANISMO: Suma todos los items del atributo
// 📌 ACTUALIZA: Elemento de resultado correspondiente
// ======================================================

function recalcularAtributoENC(atributo) {
    let totalPeso = 0;      // Peso máximo posible del atributo
    let totalObtenido = 0;  // Peso obtenido según selecciones

    // Buscar todos los selects del atributo específico en ENC
    const selects = document.querySelectorAll(
        `.cumple-select[data-bloque="ENC"][data-atributo="${atributo}"]`
    );

    // ======================================================
    // 2a. SUMAR PESOS DE TODOS LOS ITEMS
    // ======================================================
    selects.forEach(select => {
        const peso = parseFloat(select.dataset.peso);
        totalPeso += peso;
        if (select.value === '1') {
            totalObtenido += peso;
        }
    });

    // ======================================================
    // 2b. MAPEAR ATRIBUTOS A IDs DE RESULTADO
    // ======================================================
    let resultadoElement;
    switch (atributo) {
        case 'PROTOCOLOS DE ATENCION':
            resultadoElement = document.getElementById('resultadoProtocolos');
            break;
        case 'ESCUCHA ACTIVA':
            resultadoElement = document.getElementById('resultadoEscuchaActiva');
            break;
        case 'GESTION DE ESPERA':
            resultadoElement = document.getElementById('resultadoGestionEspera');
            break;
        case 'LENGUAJE Y COMUNICACIÓN':
            resultadoElement = document.getElementById('resultadoLenguaje');
            break;
        default:
            console.log('Atributo no reconocido:', atributo);
            return;
    }

    // ======================================================
    // 2c. ACTUALIZAR RESULTADO VISUAL
    // ======================================================
    if (resultadoElement) {
        resultadoElement.textContent = `${totalObtenido}/${totalPeso}%`;
    }

    // ======================================================
    // 2d. RECALCULAR TOTAL DEL FRENTE ENC
    // ======================================================
    recalcularTotalENC();
}

// ======================================================
// 3. FUNCIÓN: recalcularTotalENC()
// ======================================================
// 📌 PROPÓSITO: Calcular el total del frente ENC (Cliente)
// 📌 MECANISMO: Suma todos los atributos del frente ENC
// 📌 ACTUALIZA: Elemento de resultado del frente ENC
// 📌 RETORNO: Total obtenido (número)
// ======================================================

function recalcularTotalENC() {
    // Buscar el contenedor del frente ENC
    const frenteENC = document.querySelector('.frente-container[data-frente="ENC"]');
    if (!frenteENC) return 0;
    
    let totalObtenido = 0;
    
    // Recorrer todos los atributos dentro del frente ENC
    const atributos = frenteENC.querySelectorAll('.atributo-card');
    
    atributos.forEach(atributo => {
        // Buscar el span de resultado dentro del atributo
        const resultadoSpan = atributo.querySelector('[id^="resultado_"]');
        if (resultadoSpan) {
            // Extraer el número obtenido (antes del '/')
            const obtenido = parseInt(resultadoSpan.textContent.split('/')[0]) || 0;
            totalObtenido += obtenido;
        }
    });
    
    // Actualizar el resultado del frente ENC
    const resultadoFrente = document.getElementById('resultadoFrente_ENC');
    if (resultadoFrente) {
        resultadoFrente.textContent = totalObtenido + '%';
        
        // Cambiar color según el total
        if (totalObtenido >= 12) {
            resultadoFrente.style.color = 'var(--ok)';        // Verde - Bueno
        } else if (totalObtenido >= 9) {
            resultadoFrente.style.color = 'var(--warning)';   // Naranja - Regular
        } else {
            resultadoFrente.style.color = 'var(--danger)';    // Rojo - Crítico
        }
    }
    
    return totalObtenido;
}

// ======================================================
// 4. FUNCIÓN: recalcularTotalENCDesdeContainer()
// ======================================================
// 📌 PROPÓSITO: Recalcular total ENC desde un contenedor específico
// 📌 PARÁMETROS: container (elemento DOM) - contenedor del frente
// 📌 USO: Para recálculos específicos cuando se conoce el contenedor
// 📌 RETORNO: Total obtenido (número)
// ======================================================

function recalcularTotalENCDesdeContainer(container) {
    let totalObtenido = 0;
    
    // Recorrer todos los atributos dentro del contenedor
    const atributos = container.querySelectorAll('.atributo-card');
    console.log(`📊 ENC: ${atributos.length} atributos encontrados`);
    
    atributos.forEach(atributo => {
        const resultadoSpan = atributo.querySelector('[id^="resultado_"]');
        if (resultadoSpan) {
            const obtenido = parseInt(resultadoSpan.textContent.split('/')[0]) || 0;
            totalObtenido += obtenido;
            console.log(`   ${atributo.querySelector('strong')?.textContent}: ${obtenido}`);
        }
    });
    
    // Actualizar el resultado del frente
    const resultadoFrente = document.getElementById('resultadoFrente_ENC');
    if (resultadoFrente) {
        resultadoFrente.textContent = totalObtenido + '%';
        if (totalObtenido >= 12) {
            resultadoFrente.style.color = 'var(--ok)';
        } else if (totalObtenido >= 9) {
            resultadoFrente.style.color = 'var(--warning)';
        } else {
            resultadoFrente.style.color = 'var(--danger)';
        }
    }
    
    console.log(`📊 Total ENC: ${totalObtenido}%`);
    return totalObtenido;
}

// ======================================================
// 5. FUNCIÓN: actualizarResultadoECUF()
// ======================================================
// 📌 PROPÓSITO: Calcular el total del frente ECUF (Negocio)
// 📌 MECANISMO: Suma todos los atributos del frente ECUF
// 📌 ACTUALIZA: Elemento de resultado del frente ECUF
// 📌 RETORNO: Total obtenido (número)
// ======================================================

function actualizarResultadoECUF() {
    // Buscar el contenedor del frente ECUF
    const frenteECUF = document.querySelector('.frente-container[data-frente="ECUF"]');
    if (!frenteECUF) return 0;
    
    let totalObtenido = 0;
    
    // Recorrer todos los atributos dentro del frente ECUF
    const atributos = frenteECUF.querySelectorAll('.atributo-card');
    
    atributos.forEach(atributo => {
        // Buscar el span de resultado dentro del atributo
        const resultadoSpan = atributo.querySelector('[id^="resultado_"]');
        if (resultadoSpan) {
            // Extraer el número obtenido (antes del '/')
            const obtenido = parseInt(resultadoSpan.textContent.split('/')[0]) || 0;
            totalObtenido += obtenido;
        }
    });
    
    // Actualizar el resultado del frente ECUF
    const resultadoFrente = document.getElementById('resultadoFrente_ECUF');
    if (resultadoFrente) {
        resultadoFrente.textContent = totalObtenido + '%';
        
        // Cambiar color según el total
        if (totalObtenido >= 12) {
            resultadoFrente.style.color = 'var(--ok)';        // Verde - Bueno
        } else if (totalObtenido >= 9) {
            resultadoFrente.style.color = 'var(--warning)';   // Naranja - Regular
        } else {
            resultadoFrente.style.color = 'var(--danger)';    // Rojo - Crítico
        }
    }
    
    return totalObtenido;
}

// ======================================================
// 6. FUNCIÓN: recalcularTotalECUFDesdeContainer()
// ======================================================
// 📌 PROPÓSITO: Recalcular total ECUF desde un contenedor específico
// 📌 PARÁMETROS: container (elemento DOM) - contenedor del frente
// 📌 USO: Para recálculos específicos cuando se conoce el contenedor
// 📌 RETORNO: Total obtenido (número)
// ======================================================

function recalcularTotalECUFDesdeContainer(container) {
    let totalObtenido = 0;
    
    // Recorrer todos los atributos dentro del contenedor
    const atributos = container.querySelectorAll('.atributo-card');
    console.log(`📊 ECUF: ${atributos.length} atributos encontrados`);
    
    atributos.forEach(atributo => {
        const resultadoSpan = atributo.querySelector('[id^="resultado_"]');
        if (resultadoSpan) {
            const obtenido = parseInt(resultadoSpan.textContent.split('/')[0]) || 0;
            totalObtenido += obtenido;
            console.log(`   ${atributo.querySelector('strong')?.textContent}: ${obtenido}`);
        }
    });
    
    // Actualizar el resultado del frente
    const resultadoFrente = document.getElementById('resultadoFrente_ECUF');
    if (resultadoFrente) {
        resultadoFrente.textContent = totalObtenido + '%';
        if (totalObtenido >= 12) {
            resultadoFrente.style.color = 'var(--ok)';
        } else if (totalObtenido >= 9) {
            resultadoFrente.style.color = 'var(--warning)';
        } else {
            resultadoFrente.style.color = 'var(--danger)';
        }
    }
    
    console.log(`📊 Total ECUF: ${totalObtenido}%`);
    return totalObtenido;
}

// ======================================================
// BLOQUE 11: FUNCIONES DE CÁLCULO - ATRIBUTOS ECUF Y ECN
// ======================================================
// 
// 📌 PROPÓSITO: Actualizar los resultados de atributos específicos de ECUF y ECN
// 📌 ESTRUCTURA:
//    1. actualizarResultadosAtributosECUF() - Actualiza todos los atributos ECUF
//    2. actualizarResultadoECN() - Total del frente ECN
//    3. recalcularTotalECNDesdeContainer() - ECN desde contenedor específico
//    4. actualizarResultadosAtributosECN() - Actualiza todos los atributos ECN
// ======================================================

// ======================================================
// 1. FUNCIÓN: actualizarResultadosAtributosECUF()
// ======================================================
// 📌 PROPÓSITO: Actualizar los resultados de todos los atributos del frente ECUF
// 📌 ATRIBUTOS:
//    1. CORTE/ABANDONO (5%) - Un solo item
//    2. RESPETO AL CLIENTE (9%) - Múltiples items (suma ponderada)
//    3. BRINDA INFORMACIÓN (16%) - Múltiples items (suma ponderada)
// 📌 MECANISMO: Recorre los selects y suma los pesos de los items que cumplen
// ======================================================

function actualizarResultadosAtributosECUF() {
    // ======================================================
    // 1a. CORTE/ABANDONO (5%) - Un solo item
    // ======================================================
    // 📌 Buscar el select del atributo "Corte"
    const corteSelect = document.querySelector('.cumple-select[data-bloque="ECUF"][data-atributo="Corte"]');
    const resultadoCorte = document.getElementById('resultadoCorte');
    
    if (corteSelect && resultadoCorte) {
        const peso = parseFloat(corteSelect.dataset.peso);
        // Mostrar: "obtenido/peso%" (ej: "5/5%" o "0/5%")
        resultadoCorte.textContent = (corteSelect.value === '1' ? peso : 0) + '/' + peso + '%';
    }

    // ======================================================
    // 1b. RESPETO AL CLIENTE (9%) - Múltiples items
    // ======================================================
    // 📌 Buscar TODOS los selects del atributo "Respeto"
    const respetoSelects = document.querySelectorAll('.cumple-select[data-bloque="ECUF"][data-atributo="Respeto"]');
    let respetoTotal = 0;        // Peso obtenido
    let respetoPesoTotal = 0;    // Peso máximo posible
    
    respetoSelects.forEach(select => {
        const peso = parseFloat(select.dataset.peso);
        respetoPesoTotal += peso;
        if (select.value === '1') respetoTotal += peso;
    });
    
    const resultadoRespeto = document.getElementById('resultadoRespeto');
    if (resultadoRespeto) {
        // Mostrar: "obtenido/pesoTotal%" (ej: "7/9%")
        resultadoRespeto.textContent = respetoTotal + '/' + respetoPesoTotal + '%';
    }

    // ======================================================
    // 1c. BRINDA INFORMACIÓN (16%) - Múltiples items
    // ======================================================
    // 📌 Buscar TODOS los selects del atributo "Informacion"
    const infoSelects = document.querySelectorAll('.cumple-select[data-bloque="ECUF"][data-atributo="Informacion"]');
    let infoTotal = 0;
    let infoPesoTotal = 0;
    
    infoSelects.forEach(select => {
        const peso = parseFloat(select.dataset.peso);
        infoPesoTotal += peso;
        if (select.value === '1') infoTotal += peso;
    });
    
    const resultadoInfo = document.getElementById('resultadoInformacion');
    if (resultadoInfo) {
        resultadoInfo.textContent = infoTotal + '/' + infoPesoTotal + '%';
    }
}

// ======================================================
// 2. FUNCIÓN: actualizarResultadoECN()
// ======================================================
// 📌 PROPÓSITO: Calcular el total del frente ECN (Proceso)
// 📌 MECANISMO: Suma todos los atributos del frente ECN
// 📌 ACTUALIZA: Elemento de resultado del frente ECN
// 📌 UMBRALES:
//    - Verde (✅): ≥ 56 puntos (80% o más)
//    - Naranja (⚠️): 42-55 puntos (60-80%)
//    - Rojo (🔴): < 42 puntos (menos del 60%)
// 📌 RETORNO: Total obtenido (número)
// ======================================================

function actualizarResultadoECN() {
    // Buscar el contenedor del frente ECN
    const frenteECN = document.querySelector('.frente-container[data-frente="ECN"]');
    if (!frenteECN) return 0;
    
    let totalObtenido = 0;
    
    // Recorrer todos los atributos dentro del frente ECN
    const atributos = frenteECN.querySelectorAll('.atributo-card');
    
    atributos.forEach(atributo => {
        // Buscar el span de resultado dentro del atributo
        const resultadoSpan = atributo.querySelector('[id^="resultado_"]');
        if (resultadoSpan) {
            // Extraer el número obtenido (antes del '/')
            const obtenido = parseInt(resultadoSpan.textContent.split('/')[0]) || 0;
            totalObtenido += obtenido;
        }
    });
    
    // Actualizar el resultado del frente ECN
    const resultadoFrente = document.getElementById('resultadoFrente_ECN');
    if (resultadoFrente) {
        resultadoFrente.textContent = totalObtenido + '%';
        
        // Cambiar color según el total
        if (totalObtenido >= 56) {
            resultadoFrente.style.color = 'var(--ok)';        // Verde - Bueno
        } else if (totalObtenido >= 42) {
            resultadoFrente.style.color = 'var(--warning)';   // Naranja - Regular
        } else {
            resultadoFrente.style.color = 'var(--danger)';    // Rojo - Crítico
        }
    }
    
    return totalObtenido;
}

// ======================================================
// 3. FUNCIÓN: recalcularTotalECNDesdeContainer()
// ======================================================
// 📌 PROPÓSITO: Recalcular total ECN desde un contenedor específico
// 📌 PARÁMETROS: container (elemento DOM) - contenedor del frente
// 📌 USO: Para recálculos específicos cuando se conoce el contenedor
// 📌 RETORNO: Total obtenido (número)
// ======================================================

function recalcularTotalECNDesdeContainer(container) {
    let totalObtenido = 0;
    
    // Recorrer todos los atributos dentro del contenedor
    const atributos = container.querySelectorAll('.atributo-card');
    console.log(`📊 ECN: ${atributos.length} atributos encontrados`);
    
    atributos.forEach(atributo => {
        const resultadoSpan = atributo.querySelector('[id^="resultado_"]');
        if (resultadoSpan) {
            const obtenido = parseInt(resultadoSpan.textContent.split('/')[0]) || 0;
            totalObtenido += obtenido;
            console.log(`   ${atributo.querySelector('strong')?.textContent}: ${obtenido}`);
        }
    });
    
    // Actualizar el resultado del frente
    const resultadoFrente = document.getElementById('resultadoFrente_ECN');
    if (resultadoFrente) {
        resultadoFrente.textContent = totalObtenido + '%';
        if (totalObtenido >= 56) {
            resultadoFrente.style.color = 'var(--ok)';
        } else if (totalObtenido >= 42) {
            resultadoFrente.style.color = 'var(--warning)';
        } else {
            resultadoFrente.style.color = 'var(--danger)';
        }
    }
    
    console.log(`📊 Total ECN: ${totalObtenido}%`);
    return totalObtenido;
}

// ======================================================
// 4. FUNCIÓN: actualizarResultadosAtributosECN()
// ======================================================
// 📌 PROPÓSITO: Actualizar los resultados de todos los atributos del frente ECN
// 📌 ATRIBUTOS:
//    1. SONDEO (10%) - Múltiples items (suma ponderada)
//    2. NEGOCIACIÓN Y REBATE (12%) - Múltiples items (suma ponderada)
//    3. MOTIVO DE NO PAGO (4%) - Múltiples items (suma ponderada)
//    4. LUGARES DE PAGO (2%) - Múltiples items (suma ponderada)
//    5. CIERRE (4%) - Múltiples items (suma ponderada)
//    6. IMAGEN CORPORATIVA (6%) - Múltiples items (suma ponderada)
//    7. TIPIFICACIÓN (2%) - Un solo item
// 📌 MECANISMO: Recorre los selects y suma los pesos de los items que cumplen
// ======================================================

function actualizarResultadosAtributosECN() {
    // ======================================================
    // 4a. SONDEO (10%) - Múltiples items
    // ======================================================
    const sondeoSelects = document.querySelectorAll('.cumple-select[data-bloque="ECN"][data-atributo="Sondeo"]');
    let sondeoTotal = 0;
    let sondeoPesoTotal = 0;
    
    sondeoSelects.forEach(select => {
        const peso = parseFloat(select.dataset.peso);
        sondeoPesoTotal += peso;
        if (select.value === '1') sondeoTotal += peso;
    });
    
    const resultadoSondeo = document.getElementById('resultadoSondeo');
    if (resultadoSondeo) {
        resultadoSondeo.textContent = sondeoTotal + '/' + sondeoPesoTotal + '%';
    }

    // ======================================================
    // 4b. NEGOCIACIÓN Y REBATE (12%) - Múltiples items
    // ======================================================
    const negocSelects = document.querySelectorAll('.cumple-select[data-bloque="ECN"][data-atributo="Negociacion"]');
    let negocTotal = 0;
    let negocPesoTotal = 0;
    
    negocSelects.forEach(select => {
        const peso = parseFloat(select.dataset.peso);
        negocPesoTotal += peso;
        if (select.value === '1') negocTotal += peso;
    });
    
    const resultadoNegoc = document.getElementById('resultadoNegociacion');
    if (resultadoNegoc) {
        resultadoNegoc.textContent = negocTotal + '/' + negocPesoTotal + '%';
    }

    // ======================================================
    // 4c. MOTIVO DE NO PAGO (4%) - Múltiples items
    // ======================================================
    const motivoSelects = document.querySelectorAll('.cumple-select[data-bloque="ECN"][data-atributo="MotivoNoPago"]');
    let motivoTotal = 0;
    let motivoPesoTotal = 0;
    
    motivoSelects.forEach(select => {
        const peso = parseFloat(select.dataset.peso);
        motivoPesoTotal += peso;
        if (select.value === '1') motivoTotal += peso;
    });
    
    const resultadoMotivo = document.getElementById('resultadoMotivoNoPago');
    if (resultadoMotivo) {
        resultadoMotivo.textContent = motivoTotal + '/' + motivoPesoTotal + '%';
    }

    // ======================================================
    // 4d. LUGARES DE PAGO (2%) - Múltiples items
    // ======================================================
    const lugaresSelects = document.querySelectorAll('.cumple-select[data-bloque="ECN"][data-atributo="LugaresPago"]');
    let lugaresTotal = 0;
    let lugaresPesoTotal = 0;
    
    lugaresSelects.forEach(select => {
        const peso = parseFloat(select.dataset.peso);
        lugaresPesoTotal += peso;
        if (select.value === '1') lugaresTotal += peso;
    });
    
    const resultadoLugares = document.getElementById('resultadoLugaresPago');
    if (resultadoLugares) {
        resultadoLugares.textContent = lugaresTotal + '/' + lugaresPesoTotal + '%';
    }

    // ======================================================
    // 4e. CIERRE (4%) - Múltiples items
    // ======================================================
    const cierreSelects = document.querySelectorAll('.cumple-select[data-bloque="ECN"][data-atributo="Cierre"]');
    let cierreTotal = 0;
    let cierrePesoTotal = 0;
    
    cierreSelects.forEach(select => {
        const peso = parseFloat(select.dataset.peso);
        cierrePesoTotal += peso;
        if (select.value === '1') cierreTotal += peso;
    });
    
    const resultadoCierre = document.getElementById('resultadoCierre');
    if (resultadoCierre) {
        resultadoCierre.textContent = cierreTotal + '/' + cierrePesoTotal + '%';
    }

    // ======================================================
    // 4f. IMAGEN CORPORATIVA (6%) - Múltiples items
    // ======================================================
    const imagenSelects = document.querySelectorAll('.cumple-select[data-bloque="ECN"][data-atributo="Imagen"]');
    let imagenTotal = 0;
    let imagenPesoTotal = 0;
    
    imagenSelects.forEach(select => {
        const peso = parseFloat(select.dataset.peso);
        imagenPesoTotal += peso;
        if (select.value === '1') imagenTotal += peso;
    });
    
    const resultadoImagen = document.getElementById('resultadoImagen');
    if (resultadoImagen) {
        resultadoImagen.textContent = imagenTotal + '/' + imagenPesoTotal + '%';
    }

    // ======================================================
    // 4g. TIPIFICACIÓN (2%) - Un solo item
    // ======================================================
    const tipifSelect = document.querySelector('.cumple-select[data-bloque="ECN"][data-atributo="Tipificacion"]');
    const resultadoTipif = document.getElementById('resultadoTipificacion');
    
    if (tipifSelect && resultadoTipif) {
        const peso = parseFloat(tipifSelect.dataset.peso);
        resultadoTipif.textContent = (tipifSelect.value === '1' ? peso : 0) + '/' + peso + '%';
    }
}

// ======================================================
// BLOQUE 12: FUNCIONES DE RESULTADOS, CÁLCULOS Y CONTADOR HEADER
// ======================================================
// 
// 📌 PROPÓSITO: Calcular resultados totales, obtener rangos/cuartiles,
//    gestionar formulario y actualizar contador del header
// 📌 ESTRUCTURA:
//    1. calcularResultados() - Muestra resumen de resultados
//    2. obtenerRango() - Obtiene rango según puntaje
//    3. obtenerCuartil() - Obtiene cuartil según nota
//    4. calcularTodo() - Recálculo completo de todos los frentes
//    5. formatearFechaConHora() - Formatea fechas para mostrar
//    6. limpiarFormulario() - Limpia todos los campos del formulario
//    7. actualizarContadorHeader() - Actualiza contador en header
// ======================================================

// ======================================================
// 1. FUNCIÓN: calcularResultados()
// ======================================================
// 📌 PROPÓSITO: Calcular y mostrar un resumen completo de resultados
// 📌 MECANISMO: Suma los totales de ENC, ECUF y ECN
// 📌 MUESTRA: Alert con el desglose de puntajes y rango
// 📌 RETORNO: Nota final (número)
// ======================================================

function calcularResultados() {
    // ======================================================
    // 1a. CALCULAR TOTALES DE CADA FRENTE
    // ======================================================
    const totalENC = recalcularTotalENC();        // Frente Cliente (30%)
    const totalECUF = actualizarResultadoECUF();  // Frente Negocio (30%)
    const totalECN = actualizarResultadoECN();    // Frente Proceso (40%)

    // ======================================================
    // 1b. CALCULAR NOTA FINAL
    // ======================================================
    const notaFinal = totalENC + totalECUF + totalECN;

    // ======================================================
    // 1c. CONSTRUIR MENSAJE DE RESULTADOS
    // ======================================================
    let mensaje = `📊 RESULTADOS DE EVALUACIÓN:\n\n`;
    mensaje += `✅ Errores No Críticos (ENC): ${totalENC}/30%\n`;
    mensaje += `⚠️ Errores Críticos Usuario (ECUF): ${totalECUF}/30%\n`;
    mensaje += `💰 Errores Críticos Negocio (ECN): ${totalECN}/40%\n`;
    mensaje += `━━━━━━━━━━━━━━━━━━━━━━━━\n`;
    mensaje += `🎯 NOTA FINAL: ${notaFinal}%\n`;

    // ======================================================
    // 1d. DETERMINAR RANGO
    // ======================================================
    if (notaFinal >= 97) mensaje += `⭐ Rango: EXCELENTE`;
    else if (notaFinal >= 90) mensaje += `👍 Rango: BIEN`;
    else if (notaFinal >= 85) mensaje += `🆗 Rango: REGULAR`;
    else mensaje += `🔴 Rango: BAJO`;

    // ======================================================
    // 1e. MOSTRAR RESULTADOS
    // ======================================================
    alert(mensaje);

    return notaFinal;
}

// ======================================================
// 2. FUNCIÓN: obtenerRango()
// ======================================================
// 📌 PROPÓSITO: Obtener el rango según el puntaje de la evaluación
// 📌 PARÁMETROS: puntaje (number) - Nota obtenida
// 📌 RETORNO: Objeto con nombre, color, min y max del rango
// 📌 USO: Determinar el rango de desempeño del agente
// ======================================================

function obtenerRango(puntaje) {
    if (puntaje >= 97) {
        return { 
            nombre: 'Excelente', 
            color: 'var(--ok)', 
            min: 97, 
            max: 100 
        };
    }
    if (puntaje >= 90) {
        return { 
            nombre: 'Bien', 
            color: '#019DF4', 
            min: 90, 
            max: 96 
        };
    }
    if (puntaje >= 85) {
        return { 
            nombre: 'Regular', 
            color: 'var(--warning)', 
            min: 85, 
            max: 89 
        };
    }
    return { 
        nombre: 'Bajo', 
        color: 'var(--danger)', 
        min: 0, 
        max: 84 
    };
}

// ======================================================
// 3. FUNCIÓN: obtenerCuartil()
// ======================================================
// 📌 PROPÓSITO: Obtener el cuartil según la nota del agente
// 📌 PARÁMETROS: nota (number) - Nota obtenida
// 📌 RETORNO: String con el cuartil (Q1, Q2, Q3, Q4)
// 📌 USO: Clasificar agentes en cuartiles para ranking
// ======================================================

function obtenerCuartil(nota) {
    if (nota >= 90) return 'Q1';   // Excelente
    if (nota >= 80) return 'Q2';   // Bueno
    if (nota >= 70) return 'Q3';   // Regular
    return 'Q4';                   // Bajo / Riesgo
}

// ======================================================
// 4. FUNCIÓN: calcularTodo()
// ======================================================
// 📌 PROPÓSITO: Recalcular todos los frentes de evaluación
// 📌 USO: Cuando se cambia un select y se necesita actualizar todo
// 📌 EJECUCIÓN: Llamada desde el evento onchange de los selects
// ======================================================

function calcularTodo() {
    // Actualizar todos los bloques de evaluación
    recalcularTotalENC();        // Frente Cliente (ENC)
    actualizarResultadoECUF();   // Frente Negocio (ECUF)
    actualizarResultadoECN();    // Frente Proceso (ECN)
}

// ======================================================
// 5. FUNCIÓN: formatearFechaConHora()
// ======================================================
// 📌 PROPÓSITO: Formatear fecha en formato DD/MM/YYYY HH:MM
// 📌 PARÁMETROS: fechaTime (string o Date) - Fecha a formatear
// 📌 RETORNO: String con fecha formateada o valor original si es inválido
// 📌 SOPORTE: 
//    - Formato ISO: 2024-01-15T14:30
//    - Formato DD/MM/YYYY HH:MM
//    - Objeto Date
// ======================================================

function formatearFechaConHora(fechaTime) {
    // ======================================================
    // 5a. SI YA ESTÁ FORMATEADO, DEVOLVERLO
    // ======================================================
    if (typeof fechaTime === 'string' && /^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/.test(fechaTime)) {
        return fechaTime;
    }

    // ======================================================
    // 5b. SI ES NULL O UNDEFINED
    // ======================================================
    if (!fechaTime) {
        return '';
    }

    try {
        let date;

        // ======================================================
        // 5c. FORMATO ISO: 2024-01-15T14:30
        // ======================================================
        if (typeof fechaTime === 'string' && fechaTime.includes('T')) {
            date = new Date(fechaTime);
        } 
        // ======================================================
        // 5d. FORMATO DD/MM/YYYY HH:MM
        // ======================================================
        else if (typeof fechaTime === 'string' && fechaTime.includes('/')) {
            const [fecha, hora] = fechaTime.split(' ');
            const [dia, mes, anio] = fecha.split('/');
            date = new Date(parseInt(anio), parseInt(mes) - 1, parseInt(dia));
            if (hora) {
                const [horas, minutos] = hora.split(':');
                date.setHours(parseInt(horas), parseInt(minutos));
            }
        } 
        // ======================================================
        // 5e. OTRO FORMATO
        // ======================================================
        else {
            date = new Date(fechaTime);
        }

        // ======================================================
        // 5f. VERIFICAR SI LA FECHA ES VÁLIDA
        // ======================================================
        if (isNaN(date.getTime())) {
            console.error('Fecha inválida, no se puede formatear:', fechaTime);
            return String(fechaTime); // Devolver el original
        }

        // ======================================================
        // 5g. FORMATEAR A DD/MM/YYYY HH:MM
        // ======================================================
        const day = String(date.getDate()).padStart(2, '0');
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const year = date.getFullYear();
        const hours = String(date.getHours()).padStart(2, '0');
        const minutes = String(date.getMinutes()).padStart(2, '0');
        
        return `${day}/${month}/${year} ${hours}:${minutes}`;
        
    } catch (e) {
        console.error('Error formateando fecha:', e, fechaTime);
        return String(fechaTime);
    }
}

// ======================================================
// 6. FUNCIÓN: limpiarFormulario()
// ======================================================
// 📌 PROPÓSITO: Limpiar todos los campos del formulario de evaluación
// 📌 ACCIONES:
//    - Limpiar campos de texto (Evaluador, Ticket, Agente, Fecha, ID Llamada)
//    - Limpiar y ocultar sección de datos PSI
//    - Resetear selects de evaluación
//    - Resetear indicadores de peso
//    - Resetear todos los resultados
// ======================================================

function limpiarFormulario() {
    // ======================================================
    // 6a. LIMPIAR CAMPOS DE TEXTO
    // ======================================================
    const evaluador = document.getElementById('evalEvaluador');
    const ticketPSI = document.getElementById('evalTicketPSI');
    const agente = document.getElementById('evalAgente');
    const agenteInput = document.getElementById('evalAgenteInput');
    const fecha = document.getElementById('evalFecha');
    const idLlamada = document.getElementById('evalIdLlamada');

    if (evaluador) evaluador.value = '';
    if (ticketPSI) ticketPSI.value = '';
    if (agente) agente.value = '';
    if (agenteInput) {
        agenteInput.value = '';
        agenteInput.disabled = true;
        agenteInput.placeholder = "Habilite la auditoría para buscar agentes";
        agenteInput.style.background = "#f0f0f0";
        agenteInput.style.cursor = "not-allowed";
    }
    if (fecha) fecha.value = formatDateForInput(new Date());
    if (idLlamada) idLlamada.value = '';

    // ======================================================
    // 6b. LIMPIAR SECCIÓN DE DATOS PSI
    // ======================================================
    const seccionPSI = document.getElementById('seccionDatosPSI');
    if (seccionPSI) {
        seccionPSI.style.display = 'none';
    }

    const psiMotivos = document.getElementById('psiMotivos');
    const psiSubmotivos = document.getElementById('psiSubmotivos');
    const psiSubnivel = document.getElementById('psiSubnivel');
    const psiPeticion = document.getElementById('psiPeticion');

    if (psiMotivos) psiMotivos.value = '';
    if (psiSubmotivos) psiSubmotivos.value = '';
    if (psiSubnivel) psiSubnivel.value = '';
    if (psiPeticion) psiPeticion.value = '';

    // ======================================================
    // 6c. RESETEAR SELECTS DE EVALUACIÓN
    // ======================================================
    const selects = document.querySelectorAll('.cumple-select');
    selects.forEach(select => {
        select.value = '';
    });

    // ======================================================
    // 6d. RESETEAR INDICADORES DE PESO
    // ======================================================
    const pesos = document.querySelectorAll('.peso-indicador');
    pesos.forEach(peso => {
        peso.textContent = '0%';
        peso.style.color = '';
    });

    // ======================================================
    // 6e. RESETEAR RESULTADOS
    // ======================================================
    const resultados = [
        'resultadoENC', 'resultadoECUF', 'resultadoECN',
        'resultadoFrenteCliente', 'resultadoFrenteNegocio', 'resultadoFrenteProceso',
        'resultadoProtocolos', 'resultadoEscuchaActiva', 'resultadoGestionEspera', 'resultadoLenguaje',
        'resultadoCorte', 'resultadoRespeto', 'resultadoInformacion',
        'resultadoSondeo', 'resultadoNegociacion', 'resultadoMotivoNoPago',
        'resultadoLugaresPago', 'resultadoCierre', 'resultadoImagen', 'resultadoTipificacion'
    ];

    resultados.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            if (id.includes('resultado') &&
                !id.includes('ENC') && !id.includes('ECUF') && !id.includes('ECN')) {
                el.textContent = '0/0%';
            } else {
                el.textContent = '0%';
            }
        }
    });

    console.log('✅ Formulario limpiado completamente');
}

// ======================================================
// 7. FUNCIÓN: actualizarContadorHeader()
// ======================================================
// 📌 PROPÓSITO: Actualizar el contador de evaluaciones en el header
// 📌 MECANISMO: 
//    - Si es AUDITOR: cuenta solo sus evaluaciones
//    - Si es ADMIN/SUPERVISOR: cuenta todas las evaluaciones
// 📌 ACTUALIZA: Elemento 'totalEvaluacionesHeader' en el DOM
// ======================================================

async function actualizarContadorHeader() {
    console.log('🔄 Ejecutando actualizarContadorHeader...');

    try {
        let total = 0;
        
        // ======================================================
        // 7a. CONTAR SEGÚN EL ROL DEL USUARIO
        // ======================================================
        if (usuarioActual && usuarioActual.rol === 'AUDITOR') {
            // Si es AUDITOR, contar SOLO sus evaluaciones
            console.log('🔍 Contando SOLO evaluaciones del auditor:', usuarioActual.nombre_completo);
            const evaluaciones = await API.getHistorial({ evaluador: usuarioActual.nombre_completo });
            total = evaluaciones.length;
        } else {
            // Si es ADMIN o SUPERVISOR, contar TODAS
            console.log('🔍 Contando TODAS las evaluaciones');
            const evaluaciones = await API.getHistorial();
            total = evaluaciones.length;
        }

        // ======================================================
        // 7b. ACTUALIZAR ELEMENTO EN EL DOM
        // ======================================================
        const headerSpan = document.getElementById('totalEvaluacionesHeader');
        if (headerSpan) {
            headerSpan.textContent = total;
            console.log(`✅ CONTADOR ACTUALIZADO: ${total} evaluaciones`);
        }

    } catch (error) {
        console.error('❌ Error en actualizarContadorHeader:', error);
        const headerSpan = document.getElementById('totalEvaluacionesHeader');
        if (headerSpan) headerSpan.textContent = '?';
    }
}

// ======================================================
// BLOQUE 13: HISTORIAL DE EVALUACIONES Y FUNCIONES RELACIONADAS
// ======================================================
// 
// 📌 PROPÓSITO: Gestionar el historial de evaluaciones, ver detalles,
//    eliminar evaluaciones y reactivar escuchas
// 📌 ESTRUCTURA:
//    1. cargarHistorialEvaluaciones() - Carga y muestra el historial
//    2. verDetalleEvaluacion() - Muestra detalle de una evaluación
//    3. eliminarEvaluacion() - Elimina evaluación y reactiva escucha
//    4. numeroSeguro() - Convierte valor a número seguro
//    5. calcularItemsPorFrente() - Cuenta items por frente
// ======================================================

// ======================================================
// FUNCIÓN: cargarHistorialEvaluaciones()
// ======================================================
// 📌 PROPÓSITO: Cargar y mostrar todas las evaluaciones en la tabla de historial
// 📌 FUENTE: API.getHistorial() con filtro según rol del usuario
// 📌 TABLA: tablaHistorialBody en el DOM
// 📌 COLUMNAS: Fecha, Ticket, Agente, Evaluador, ID Llamada, Fecha Descarga, Nota, TMO, Ediciones, Acciones
// ======================================================

async function cargarHistorialEvaluaciones() {
    const tbody = document.getElementById('tablaHistorialBody');
    if (!tbody) return;

    try {
        tbody.innerHTML = '<tr><td colspan="11" style="text-align: center; padding: 50px;">⏳ Cargando datos...</td></tr>';

        let evaluaciones;

        if (usuarioActual && usuarioActual.rol === 'AUDITOR') {
            // ======================================================
            // 🔴 OBTENER NOMBRE COMPLETO DIRECTAMENTE DESDE LA BD
            // ======================================================
            const db = getDB();
            let evaluador = null;
            
            if (db) {
                const { data: usuario, error } = await db
                    .from('usuarios')
                    .select('nombre_completo')
                    .eq('id', usuarioActual.id)
                    .single();
                
                if (!error && usuario && usuario.nombre_completo) {
                    evaluador = usuario.nombre_completo;
                    console.log(`✅ Nombre completo obtenido desde BD: "${evaluador}"`);
                }
            }
            
            // 🔴 FALLBACK: Si no se pudo obtener desde BD, usar usuario
            if (!evaluador) {
                evaluador = usuarioActual.usuario;
                console.warn(`⚠️ Usando usuario como fallback: "${evaluador}"`);
            }
            
            console.log(`🔍 Buscando evaluaciones del auditor: "${evaluador}"`);
            evaluaciones = await API.getHistorial({ evaluador: evaluador });
            console.log(`✅ Encontradas ${evaluaciones?.length || 0} evaluaciones`);
        } else {
            evaluaciones = await API.getHistorial();
        }

        if (!evaluaciones || evaluaciones.length === 0) {
            tbody.innerHTML = `<tr><td colspan="11" style="text-align: center; padding: 50px;">
                📭 No hay evaluaciones registradas${usuarioActual?.rol === 'AUDITOR' ? ' para usted' : ''}
            </td></tr>`;
            document.getElementById('totalHistorialCount').textContent = '0';
            document.getElementById('mostrandoHistorialCount').textContent = '0';
            return;
        }

        // ======================================================
        // GENERAR FILAS (código existente)
        // ======================================================
        let html = '';
        for (const eval of evaluaciones) {
            let notaColor = '';
            if (eval.nota_final >= 90) notaColor = '#1a7f37';
            else if (eval.nota_final >= 85) notaColor = '#f39c12';
            else notaColor = '#d93025';

            const idLlamada = eval.id_llamada || '';
            const idLlamadaTruncada = idLlamada.length > 50 ? idLlamada.substring(0, 47) + '...' : idLlamada;

            let fechaDescarga = '-';
            if (eval.fecha_descarga) {
                try {
                    if (eval.fecha_descarga.includes('-')) {
                        const [anio, mes, dia] = eval.fecha_descarga.split('T')[0].split('-');
                        fechaDescarga = `${dia}/${mes}/${anio}`;
                    } else if (eval.fecha_descarga.includes('/')) {
                        fechaDescarga = eval.fecha_descarga;
                    } else {
                        fechaDescarga = eval.fecha_descarga;
                    }
                } catch(e) {
                    fechaDescarga = eval.fecha_descarga || '-';
                }
            }

            html += `<tr>
                <td style="padding: 10px 8px; white-space: nowrap;">${eval.fecha_formateada || eval.fecha || '-'}</td>
                <td style="padding: 10px 8px;"><strong>${escapeHtml(eval.ticket_psi || '')}</strong></td>
                <td style="padding: 10px 8px;">${escapeHtml(eval.agente || '-')}</td>
                <td style="padding: 10px 8px;">${escapeHtml(eval.evaluador || '-')}</td>
                <td style="padding: 10px 8px; word-break: break-word; max-width: 250px;" title="${escapeHtml(idLlamada)}">
                    ${escapeHtml(idLlamadaTruncada)}
                </td>
                <td style="padding: 10px 8px; text-align: center;">${escapeHtml(fechaDescarga)}</td>
                <td style="padding: 10px 8px; font-weight: bold; color: var(--text); text-align: center;">${eval.nota_final}%</td>
                <td style="padding: 10px 8px; text-align: center;">${eval.tiempo_auditoria_formateado || '-'}</td>
                <td style="padding: 10px 8px; text-align: center;">${eval.veces_editado > 0 ? `✏️ ${eval.veces_editado}` : '-'}</td>
                <td style="padding: 10px 8px; white-space: nowrap; text-align: center;">
                    <button onclick="editarEvaluacion(${eval.id})" style="padding: 5px 10px; background: #019DF4; color: white; margin-right: 5px; border: none; border-radius: 6px; cursor: pointer; font-size: 12px;">✏️</button>
                    <button onclick="eliminarEvaluacion(${eval.id})" style="padding: 5px 10px; background: #fee; color: #d93025; border: 1px solid #ffcfcf; border-radius: 6px; cursor: pointer; font-size: 12px;">🗑️</button>
                </td>
            </tr>`;
        }

        tbody.innerHTML = html;
        document.getElementById('totalHistorialCount').textContent = evaluaciones.length;
        document.getElementById('mostrandoHistorialCount').textContent = evaluaciones.length;

    } catch (error) {
        console.error('Error cargando historial:', error);
        tbody.innerHTML = `<tr><td colspan="11" style="text-align: center; padding: 50px; color: #d93025;">❌ Error al cargar datos: ${error.message}</td></tr>`;
    }
}


// ======================================================
// 2. FUNCIÓN: verDetalleEvaluacion()
// ======================================================
// 📌 PROPÓSITO: Mostrar el detalle completo de una evaluación
// 📌 PARÁMETROS: id (number) - ID de la evaluación
// 📌 MUESTRA: Alert con toda la información de la evaluación
// 📌 INCLUYE: Datos generales, resultados y detalles de items
// ======================================================

async function verDetalleEvaluacion(id) {
    try {
        // ======================================================
        // 2a. OBTENER CONEXIÓN A BD
        // ======================================================
        const client = getDB();

        if (!client || typeof client.from !== 'function') {
            throw new Error('Base de datos no disponible');
        }

        // ======================================================
        // 2b. CARGAR EVALUACIÓN
        // ======================================================
        const { data: evaluacion, error } = await client
            .from('evaluaciones')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        // ======================================================
        // 2c. CARGAR DETALLES DE LA EVALUACIÓN
        // ======================================================
        const { data: detalles } = await client
            .from('detalles_evaluacion')
            .select('*')
            .eq('evaluacion_id', id);

        // ======================================================
        // 2d. FORMATEAR FECHA PARA MOSTRAR
        // ======================================================
        const fechaMostrar = evaluacion.fecha_formateada || evaluacion.fecha;

        // ======================================================
        // 2e. CONSTRUIR MENSAJE
        // ======================================================
        let detalle = `📋 DETALLE DE EVALUACIÓN\n`;
        detalle += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
        detalle += `📅 Fecha y Hora: ${fechaMostrar}\n`;
        detalle += `🎫 Ticket PSI: ${evaluacion.ticket_psi || 'N/D'}\n`;
        detalle += `👤 Agente: ${evaluacion.agente}\n`;
        detalle += `👥 Evaluador: ${evaluacion.evaluador}\n`;
        detalle += `🎫 ID Llamada: ${evaluacion.id_llamada || 'N/D'}\n\n`;

        detalle += `📊 RESULTADOS:\n`;
        detalle += `✅ ENC: ${evaluacion.total_enc}/30%\n`;
        detalle += `⚠️ ECUF: ${evaluacion.total_ecuf}/30%\n`;
        detalle += `💰 ECN: ${evaluacion.total_ecn}/40%\n`;
        detalle += `━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;
        detalle += `🎯 NOTA FINAL: ${evaluacion.nota_final}% (${evaluacion.rango})\n`;
        detalle += `⏱️ TMO: ${evaluacion.tiempo_auditoria_formateado || 'N/D'}\n\n`;

        // ======================================================
        // 2f. AGREGAR DETALLE DE ÍTEMS (NO CUMPLE)
        // ======================================================
        if (detalles && detalles.length > 0) {
            detalle += `📝 DETALLE POR ÍTEM:\n`;
            const noCumple = detalles.filter(d => !d.cumple);
            if (noCumple.length > 0) {
                detalle += `❌ NO CUMPLE:\n`;
                noCumple.forEach(d => {
                    detalle += `   • ${d.bloque} - ${d.atributo}: ${d.submotivo} (${d.peso}%)\n`;
                });
            } else {
                detalle += `✅ TODOS LOS ÍTEMS CUMPLEN\n`;
            }
        }

        // ======================================================
        // 2g. MOSTRAR DETALLE
        // ======================================================
        alert(detalle);

    } catch (error) {
        console.error('Error al cargar detalle:', error);
        alert(`❌ Error al cargar detalle: ${error.message}`);
    }
}

// ======================================================
// 3. FUNCIÓN: eliminarEvaluacion()
// ======================================================
// 📌 PROPÓSITO: Eliminar una evaluación y reactivar la escucha asociada
// 📌 PARÁMETROS: id (number) - ID de la evaluación
// 📌 FLUJO:
//    1. Confirmar eliminación
//    2. Buscar el ticket PSI de la evaluación
//    3. Buscar la escucha asociada al ticket
//    4. Eliminar evaluación
//    5. Reactivar escucha (cancelar gestión)
//    6. Actualizar interfaces
// ======================================================

async function eliminarEvaluacion(id) {
    // ======================================================
    // 3a. CONFIRMAR ELIMINACIÓN
    // ======================================================
    if (!confirm('⚠️ ¿Está seguro de eliminar esta evaluación?\n\nEsta acción no se puede deshacer.')) {
        return;
    }

    try {
        // ======================================================
        // 3b. OBTENER TICKET PSI DE LA EVALUACIÓN
        // ======================================================
        const evaluaciones = await API.getHistorial();
        const evaluacion = evaluaciones.find(e => e.id == id);
        const ticketPSI = evaluacion ? evaluacion.ticket_psi : null;

        // ======================================================
        // 3c. BUSCAR ESCUCHA ASOCIADA AL TICKET
        // ======================================================
        let escuchaId = null;
        if (ticketPSI) {
            const token = localStorage.getItem('meca_token');
            const response = await fetch('/api/escuchas/asignaciones', {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const asignaciones = await response.json();
            const escucha = asignaciones.find(a => a.ticket === ticketPSI);
            if (escucha) {
                escuchaId = escucha.id;
                console.log(`🔍 Escucha encontrada: ID ${escuchaId}, estado actual: ${escucha.estado}`);
            }
        }

        // ======================================================
        // 3d. ELIMINAR EVALUACIÓN
        // ======================================================
        await API.eliminarEvaluacion(id);
        console.log('✅ Evaluación eliminada');

        // ======================================================
        // 3e. REACTIVAR ESCUCHA (cancelar gestión)
        // ======================================================
        if (escuchaId) {
            try {
                await API.cancelarGestionEscucha(escuchaId);
                console.log(`✅ Escucha ${escuchaId} reactivada a estado pendiente`);
            } catch (err) {
                console.error('❌ Error al reactivar escucha:', err);
            }
        }

        // ======================================================
        // 3f. ACTUALIZAR INTERFACES
        // ======================================================
        await actualizarContadorHeader();
        await cargarHistorialEvaluaciones();
        await cargarMisEscuchas();

        alert('✅ Evaluación eliminada correctamente. La escucha ha vuelto a tus pendientes.');

    } catch (error) {
        console.error('❌ Error al eliminar:', error);
        alert(`❌ Error al eliminar: ${error.message}`);
    }
}

// ======================================================
// 4. FUNCIÓN: numeroSeguro()
// ======================================================
// 📌 PROPÓSITO: Convertir un valor a número de forma segura
// 📌 PARÁMETROS: valor (any) - Valor a convertir
// 📌 RETORNO: number - 0 si no es un número válido
// 📌 USO: Evitar NaN en cálculos
// ======================================================

function numeroSeguro(valor) {
    const n = Number(valor);
    return isNaN(n) ? 0 : n;
}

// ======================================================
// 5. FUNCIÓN: calcularItemsPorFrente()
// ======================================================
// 📌 PROPÓSITO: Contar cuántos items tiene cada frente (ENC, ECUF, ECN)
// 📌 MECANISMO: Recorre todos los selects y los agrupa por bloque
// 📌 ACTUALIZA: Elementos 'cliente-count', 'negocio-count', 'proceso-count'
// 📌 USO: Mostrar cantidad de items en cada frente
// ======================================================

function calcularItemsPorFrente() {
    // ======================================================
    // 5a. INICIALIZAR CONTADORES
    // ======================================================
    const conteo = {
        ENC: 0,
        ECUF: 0,
        ECN: 0
    };

    // ======================================================
    // 5b. CONTAR SELECTS POR BLOQUE
    // ======================================================
    const selects = document.querySelectorAll('.cumple-select');

    selects.forEach(select => {
        const bloque = select.dataset.bloque;
        if (Object.prototype.hasOwnProperty.call(conteo, bloque)) {
            conteo[bloque]++;
        }
    });

    // ======================================================
    // 5c. ACTUALIZAR ELEMENTOS EN EL DOM
    // ======================================================
    const cliente = document.getElementById('cliente-count');
    const negocio = document.getElementById('negocio-count');
    const proceso = document.getElementById('proceso-count');

    if (cliente) cliente.textContent = `${conteo.ENC} items`;
    if (negocio) negocio.textContent = `${conteo.ECUF} items`;
    if (proceso) proceso.textContent = `${conteo.ECN} items`;
}

// ======================================================
// BLOQUE 14: ANÁLISIS Y FUNCIONES DE UTILIDAD
// ======================================================
// 
// 📌 PROPÓSITO: Funciones de análisis, alertas operativas,
//    gestión de frentes colapsables y normalización de datos
// 📌 ESTRUCTURA:
//    1. obtenerTopSubmotivos() - Top de submotivos fallados
//    2. construirRankingAgentes() - Ranking de agentes
//    3. construirAlertasOperativas() - Alertas operativas
//    4. toggleFrente() - Expandir/contraer frente
//    5. restaurarFrentes() - Restaurar estado de frentes
//    6. normalizarEvaluaciones() - Normalizar datos de evaluaciones
// ======================================================

// ======================================================
// 1. FUNCIÓN: obtenerTopSubmotivos()
// ======================================================
// 📌 PROPÓSITO: Obtener los submotivos más fallados
// 📌 PARÁMETROS: evaluaciones (Array) - Lista de evaluaciones
// 📌 RETORNO: Array con top 10 submotivos más fallados
// 📌 ESTRUCTURA: { bloque, atributo, submotivo, fallas }
// ======================================================

function obtenerTopSubmotivos(evaluaciones) {
    // ======================================================
    // 1a. CONTAR FALLAS POR SUBMOTIVO
    // ======================================================
    const conteo = {};

    evaluaciones.forEach(ev => {
        // Recorrer detalles de cada evaluación
        (ev.detalles || []).forEach(d => {
            // Solo contar si NO cumple (falla)
            if (d.cumple === false) {
                // Clave única: bloque|atributo|submotivo
                const key = `${d.bloque}|${d.atributo}|${d.submotivo}`;
                
                if (!conteo[key]) {
                    conteo[key] = {
                        bloque: d.bloque || '',
                        atributo: d.atributo || '',
                        submotivo: d.submotivo || '',
                        fallas: 0
                    };
                }
                conteo[key].fallas++;
            }
        });
    });

    // ======================================================
    // 1b. ORDENAR Y DEVOLVER TOP 10
    // ======================================================
    return Object.values(conteo)
        .sort((a, b) => b.fallas - a.fallas)  // Orden descendente
        .slice(0, 10);                         // Top 10
}

// ======================================================
// 2. FUNCIÓN: construirRankingAgentes()
// ======================================================
// 📌 PROPÓSITO: Construir ranking de agentes por desempeño
// 📌 PARÁMETROS: evaluaciones (Array) - Lista de evaluaciones
// 📌 RETORNO: Array de agentes con métricas y cuartil
// 📌 MÉTRICAS: promedio, cuartil, fallas ECUF/ECN, bajos (<85%)
// ======================================================

function construirRankingAgentes(evaluaciones) {
    // ======================================================
    // 2a. AGRUPAR EVALUACIONES POR AGENTE
    // ======================================================
    const agentes = {};

    evaluaciones.forEach(e => {
        const nombre = e.agente || 'Sin nombre';

        // Inicializar agente si no existe
        if (!agentes[nombre]) {
            agentes[nombre] = {
                agente: nombre,
                suma: 0,           // Suma de notas para promedio
                count: 0,          // Cantidad de evaluaciones
                ecuf: 0,           // Veces con ECUF < 30
                ecn: 0,            // Veces con ECN < 40
                bajos: 0,          // Veces con nota < 85
                ultima: e.fecha || ''  // Última fecha de evaluación
            };
        }

        // ======================================================
        // 2b. ACUMULAR MÉTRICAS
        // ======================================================
        const nota = numeroSeguro(e.notaFinal);
        const totalECUF = numeroSeguro(e.totalECUF);
        const totalECN = numeroSeguro(e.totalECN);

        agentes[nombre].suma += nota;
        agentes[nombre].count++;

        // Contar fallas críticas
        if (totalECUF < 30) agentes[nombre].ecuf++;
        if (totalECN < 40) agentes[nombre].ecn++;
        if (nota < 85) agentes[nombre].bajos++;

        // Actualizar última fecha
        if ((e.fecha || '') > agentes[nombre].ultima) {
            agentes[nombre].ultima = e.fecha || '';
        }
    });

    // ======================================================
    // 2c. CALCULAR PROMEDIO Y CUARTIL
    // ======================================================
    return Object.values(agentes)
        .map(a => {
            const promedio = Number((a.suma / a.count).toFixed(1));
            return {
                ...a,
                promedio,
                cuartil: obtenerCuartil(promedio)
            };
        })
        .sort((a, b) => b.promedio - a.promedio);  // Orden descendente por promedio
}

// ======================================================
// 3. FUNCIÓN: construirAlertasOperativas()
// ======================================================
// 📌 PROPÓSITO: Generar alertas operativas basadas en datos
// 📌 PARÁMETROS: 
//    - evaluaciones (Array) - Lista de evaluaciones
//    - ranking (Array) - Ranking de agentes
//    - topSubmotivos (Array) - Top submotivos fallados
// 📌 RETORNO: Array de strings con alertas
// ======================================================

function construirAlertasOperativas(evaluaciones, ranking, topSubmotivos) {
    const alertas = [];

    // ======================================================
    // 3a. ALERTA: TOP SUBMOTIVO FALLADO
    // ======================================================
    if (topSubmotivos.length > 0) {
        const top = topSubmotivos[0];
        alertas.push(
            `El submotivo más fallado es <strong>${escapeHtml(top.submotivo)}</strong> ` +
            `(${escapeHtml(top.bloque)} / ${escapeHtml(top.atributo)}) ` +
            `con <strong>${top.fallas}</strong> incidencias.`
        );
    }

    // ======================================================
    // 3b. ALERTA: EVALUACIONES CON IMPACTO EN ECUF
    // ======================================================
    const conECUF = evaluaciones.filter(e => numeroSeguro(e.totalECUF) < 30).length;
    if (conECUF > 0) {
        alertas.push(
            `Hay <strong>${conECUF}</strong> evaluaciones con impacto en <strong>ECUF</strong>.`
        );
    }

    // ======================================================
    // 3c. ALERTA: EVALUACIONES CON IMPACTO EN ECN
    // ======================================================
    const conECN = evaluaciones.filter(e => numeroSeguro(e.totalECN) < 40).length;
    if (conECN > 0) {
        alertas.push(
            `Hay <strong>${conECN}</strong> evaluaciones con impacto en <strong>ECN</strong>.`
        );
    }

    // ======================================================
    // 3d. ALERTA: AGENTE CON MAYOR RIESGO OPERATIVO
    // ======================================================
    if (ranking.length > 0) {
        // Ordenar por suma de (ecuf + ecn + bajos) descendente
        const agenteRiesgo = [...ranking].sort((a, b) => 
            (b.ecuf + b.ecn + b.bajos) - (a.ecuf + a.ecn + a.bajos)
        )[0];
        
        if (agenteRiesgo) {
            alertas.push(
                `El agente con mayor riesgo operativo actual es ` +
                `<strong>${escapeHtml(agenteRiesgo.agente)}</strong> ` +
                `(ECUF: ${agenteRiesgo.ecuf}, ECN: ${agenteRiesgo.ecn}, Bajos: ${agenteRiesgo.bajos}).`
            );
        }
    }

    return alertas;
}

// ======================================================
// 4. FUNCIÓN: toggleFrente()
// ======================================================
// 📌 PROPÓSITO: Expandir o contraer un frente en la interfaz
// 📌 PARÁMETROS: frente (string) - Nombre del frente (cliente, negocio, proceso)
// 📌 ACCIONES:
//    - Alterna clase 'collapsed' en el contenido
//    - Cambia icono (▶/▼)
//    - Guarda estado en localStorage
// ======================================================

function toggleFrente(frente) {
    // Obtener elementos del DOM
    const contenido = document.getElementById(`frente-${frente}`);
    const icono = document.getElementById(`icono-${frente}`);

    if (contenido.classList.contains('collapsed')) {
        // Expandir
        contenido.classList.remove('collapsed');
        icono.textContent = '▼';
        localStorage.setItem(`frente_${frente}_collapsed`, 'false');
    } else {
        // Contraer
        contenido.classList.add('collapsed');
        icono.textContent = '▶';
        localStorage.setItem(`frente_${frente}_collapsed`, 'true');
    }
}

// ======================================================
// 5. FUNCIÓN: restaurarFrentes()
// ======================================================
// 📌 PROPÓSITO: Restaurar el estado de los frentes al cargar la página
// 📌 FUENTE: localStorage (guarda preferencias del usuario)
// 📌 FRENTES: cliente, negocio, proceso
// ======================================================

function restaurarFrentes() {
    const frentes = ['cliente', 'negocio', 'proceso'];
    
    frentes.forEach(frente => {
        // Leer estado guardado (por defecto: expandido = false)
        const collapsed = localStorage.getItem(`frente_${frente}_collapsed`) === 'true';
        const contenido = document.getElementById(`frente-${frente}`);
        const icono = document.getElementById(`icono-${frente}`);

        if (collapsed && contenido) {
            contenido.classList.add('collapsed');
            if (icono) icono.textContent = '▶';
        }
    });
}

// ======================================================
// 6. FUNCIÓN: normalizarEvaluaciones()
// ======================================================
// 📌 PROPÓSITO: Normalizar datos de evaluaciones guardadas
// 📌 FUENTE: localStorage ('evaluaciones_calidad')
// 📌 ACCIONES:
//    - Corregir fechas inválidas
//    - Crear fechaFormateada si falta
//    - Corregir timestamp inválido
// 📌 RETORNO: Número de evaluaciones modificadas
// ======================================================

function normalizarEvaluaciones() {
    // ======================================================
    // 6a. CARGAR EVALUACIONES DESDE LOCALSTORAGE
    // ======================================================
    let evaluaciones = JSON.parse(localStorage.getItem('evaluaciones_calidad') || '[]');
    let modificadas = 0;

    evaluaciones.forEach(eval => {
        let modificado = false;

        // ======================================================
        // 6b. CORREGIR FECHA COMPLETAMENTE INVÁLIDA
        // ======================================================
        const fechaEsCompletamenteInvalida = !eval.fecha ||
            eval.fecha === 'undefined' ||
            eval.fecha === 'null' ||
            (typeof eval.fecha === 'string' && eval.fecha.toLowerCase() === 'nan/NaN/NaN nan:nan');

        if (fechaEsCompletamenteInvalida) {
            console.warn('Fecha completamente inválida encontrada, esto no debería ocurrir:', eval);
            const ahora = new Date();
            eval.fecha = formatDateForInput(ahora);
            eval.fechaFormateada = `${ahora.getDate().toString().padStart(2, '0')}/${(ahora.getMonth() + 1).toString().padStart(2, '0')}/${ahora.getFullYear()} ${ahora.getHours().toString().padStart(2, '0')}:${ahora.getMinutes().toString().padStart(2, '0')}`;
            modificado = true;
        }
        // ======================================================
        // 6c. CREAR fechaFormateada SI FALTA
        // ======================================================
        else if (!eval.fechaFormateada) {
            eval.fechaFormateada = formatearFechaConHora(eval.fecha);
            modificado = true;
        }

        // ======================================================
        // 6d. CORREGIR TIMESTAMP INVÁLIDO
        // ======================================================
        if (!eval.timestamp || isNaN(eval.timestamp)) {
            // Intentar crear timestamp desde la fecha guardada
            if (eval.fecha) {
                const fechaObj = new Date(eval.fecha);
                if (!isNaN(fechaObj.getTime())) {
                    eval.timestamp = fechaObj.getTime();
                } else {
                    eval.timestamp = Date.now();
                }
            } else {
                eval.timestamp = Date.now();
            }
            modificado = true;
        }

        if (modificado) modificadas++;
    });

    // ======================================================
    // 6e. GUARDAR CAMBIOS SI HUBO MODIFICACIONES
    // ======================================================
    if (modificadas > 0) {
        localStorage.setItem('evaluaciones_calidad', JSON.stringify(evaluaciones));
        console.log(`✅ Normalizadas ${modificadas} evaluaciones (solo correcciones necesarias)`);
    }

    return modificadas;
}


// ======================================================
// BLOQUE 15: FUNCIONES DE SEGURIDAD, SESIÓN E INICIALIZACIÓN
// ======================================================
// 
// 📌 PROPÓSITO: Funciones de encriptación, gestión de sesión
//    e inicialización completa del sistema auditor
// 📌 ESTRUCTURA:
//    1. hashSHA256() - Encriptación SHA-256
//    2. verificarSesion() - Verifica sesión existente
//    3. cerrarSesion() - Cierra sesión con registro
//    4. window.onload - Inicialización principal
//    5. cargarDatosInicialesAuditor() - Carga datos del auditor
// ======================================================

// ======================================================
// 1. FUNCIÓN: hashSHA256()
// ======================================================
// 📌 PROPÓSITO: Encriptar texto usando SHA-256
// 📌 PARÁMETROS: texto (string) - Texto a encriptar
// 📌 RETORNO: string - Hash en hexadecimal
// 📌 USO: Encriptar contraseñas antes de enviarlas
// 📌 TECNOLOGÍA: Web Crypto API (nativo del navegador)
// ======================================================

async function hashSHA256(texto) {
    // 1. Crear codificador de texto
    const encoder = new TextEncoder();
    
    // 2. Codificar el texto a bytes
    const data = encoder.encode(texto);
    
    // 3. Calcular hash SHA-256
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    
    // 4. Convertir a array de bytes
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    
    // 5. Convertir a hexadecimal
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    return hashHex;
}

// ======================================================
// 2. FUNCIÓN: verificarSesion()
// ======================================================
// 📌 PROPÓSITO: Verificar si hay una sesión activa en sessionStorage
// 📌 RETORNO: true (sesión válida) o false (sin sesión)
// 📌 ACCIONES:
//    - Restaura usuarioActual desde sessionStorage
//    - Muestra interfaz de usuario
//    - Carga datos iniciales
// ======================================================

function verificarSesion() {
    // Obtener sesión guardada
    const sesion = sessionStorage.getItem('usuario_actual');
    
    if (sesion) {
        try {
            // Restaurar usuario actual
            usuarioActual = JSON.parse(sesion);
            
            // Mostrar interfaz según el rol
            mostrarInterfazUsuario();
            
            // Cargar datos iniciales del auditor
            cargarDatosInicialesAuditor();
            
            return true;
        } catch (e) {
            // Si hay error, limpiar sesión
            sessionStorage.removeItem('usuario_actual');
            return false;
        }
    }
    return false;
}

// ======================================================
// 3. FUNCIÓN: cerrarSesion()
// ======================================================
// 📌 PROPÓSITO: Cerrar sesión de forma segura
// 📌 PARÁMETROS: event (Event) - Evento del click (opcional)
// 📌 ACCIONES:
//    1. Confirmar cierre de sesión
//    2. Registrar logout en historial
//    3. Actualizar estado de sesión en BD
//    4. Limpiar storage
//    5. Detener monitor de sesión
//    6. Redirigir a login
// ======================================================

async function cerrarSesion(event) {
    // ======================================================
    // 3a. PREVENIR PROPAGACIÓN DEL EVENTO
    // ======================================================
    if (event) {
        event.preventDefault();
        event.stopPropagation();
    }

    // ======================================================
    // 3b. CONFIRMAR CIERRE DE SESIÓN
    // ======================================================
    if (confirm('¿Cerrar sesión? Los datos no guardados se perderán.')) {
        // Obtener datos de la sesión actual
        const sessionToken = sessionStorage.getItem('session_token_actual');
        const db = getDB();

        // ======================================================
        // 3c. REGISTRAR LOGOUT EN HISTORIAL
        // ======================================================
        if (sessionToken && db && usuarioActual) {
            // Obtener IP y dispositivo
            const ip = await obtenerIpPublica();
            const dispositivo = obtenerInfoDispositivo();

            // Registrar evento de logout
            await registrarHistorialLogin(
                usuarioActual.id,
                usuarioActual.usuario,
                'logout',
                ip,
                dispositivo,
                'Cierre de sesión voluntario'
            );

            // ======================================================
            // 3d. ACTUALIZAR ESTADO DE SESIÓN EN BD
            // ======================================================
            await db
                .from('sesiones_activas')
                .update({
                    estado: 'cerrada',
                    fecha_fin: new Date().toISOString()
                })
                .eq('session_token', sessionToken);
        }

        // ======================================================
        // 3e. LIMPIAR LOCALSTORAGE Y SESSIONSTORAGE
        // ======================================================
        localStorage.removeItem('meca_token');
        localStorage.removeItem('meca_usuario');
        localStorage.removeItem('usuario_actual');
        localStorage.removeItem('session_token_actual');
        localStorage.removeItem('session_inicio');
        localStorage.removeItem('ultima_actividad');
        localStorage.removeItem('requiere_cambio_password');
        localStorage.removeItem('usuario_temp');
        localStorage.clear();
        sessionStorage.clear();

        // ======================================================
        // 3f. LIMPIAR USUARIO ACTUAL
        // ======================================================
        usuarioActual = null;

        // ======================================================
        // 3g. DETENER MONITOR DE SESIÓN
        // ======================================================
        if (window.monitorIntervalSesion) {
            clearInterval(window.monitorIntervalSesion);
            window.monitorIntervalSesion = null;
        }

        // ======================================================
        // 3h. REDIRIGIR A LOGIN
        // ======================================================
        window.location.href = '/login';
    }
}

// ======================================================
// 4. INICIALIZACIÓN - window.onload
// ======================================================
// 📌 PROPÓSITO: Punto de entrada principal del módulo auditor
// 📌 EJECUCIÓN: Al cargar la página
// 📌 FLUJO:
//    1. Verificar sesión del auditor
//    2. Inicializar componentes UI
//    3. Configurar pestaña inicial (Mis Escuchas)
//    4. Cargar datos
// ======================================================

window.onload = async function () {
    console.log('🚀 Iniciando sistema de auditoría...');

    // ======================================================
    // 4a. VERIFICAR SESIÓN DEL AUDITOR
    // ======================================================
    const sesionValida = await verificarSesionAuditor();
    
    if (!sesionValida) {
        console.log('❌ Sesión no válida, redirigiendo a login');
        return;
    }
    
    console.log('✅ Sesión válida, cargando datos...');
    
    // ======================================================
    // 4b. INICIALIZAR COMPONENTES UI
    // ======================================================
    if (typeof agregarEstilosDropdown === 'function') agregarEstilosDropdown();
    if (typeof restaurarFrentes === 'function') restaurarFrentes();
    if (typeof calcularItemsPorFrente === 'function') calcularItemsPorFrente();
    
    // ======================================================
    // 4c. DESHABILITAR FORMULARIO INICIALMENTE
    // ======================================================
    if (typeof deshabilitarFormularioCompleto === 'function') {
        deshabilitarFormularioCompleto(true);
    }
    
    // ======================================================
    // 4d. OCULTAR BOTÓN FINALIZAR
    // ======================================================
    const btnFinalizar = document.getElementById('btnFinalizar');
    if (btnFinalizar) btnFinalizar.style.display = 'none';
    
    // ======================================================
    // 4e. INICIALIZAR BUSCADOR DE AGENTES
    // ======================================================
    if (typeof inicializarBuscadorAgentes === 'function') inicializarBuscadorAgentes();
    
    // ======================================================
    // 4f. CARGAR DATOS
    // ======================================================
    if (typeof actualizarContadorHeader === 'function') await actualizarContadorHeader();
    if (typeof cargarHistorialEvaluaciones === 'function') await cargarHistorialEvaluaciones();
    if (typeof cargarMisEscuchas === 'function') await cargarMisEscuchas();
    
    // ======================================================
    // 4g. GENERAR FORMULARIO DINÁMICO
    // ======================================================
    if (typeof generarFormularioDinamico === 'function') {
        await generarFormularioDinamico();
    }
    
    // ======================================================
    // 4h. CONFIGURAR PESTAÑA INICIAL (Mis Escuchas)
    // ======================================================
    const misEscuchasTab = document.getElementById('tab-misEscuchas');
    const evaluacionTab = document.getElementById('tab-evaluacion');
    const misEscuchasBtn = document.querySelector('.tab-button[onclick*="misEscuchas"]');
    const evaluacionBtn = document.querySelector('.tab-button[onclick*="evaluacion"]');
    
    if (misEscuchasTab) misEscuchasTab.classList.add('active');
    if (evaluacionTab) evaluacionTab.classList.remove('active');
    if (misEscuchasBtn) misEscuchasBtn.classList.add('active');
    if (evaluacionBtn) evaluacionBtn.classList.remove('active');
    
    // ======================================================
    // 4i. DESHABILITAR BOTÓN AUDITAR INICIALMENTE
    // ======================================================
    const btnAuditar = document.getElementById('btnAuditar');
    if (btnAuditar) {
        btnAuditar.disabled = true;
        btnAuditar.style.opacity = '0.5';
        btnAuditar.style.cursor = 'not-allowed';
        btnAuditar.title = 'Debe seleccionar una escucha de la pestaña "Mis Escuchas"';
    }
    
    console.log('✅ Sistema de auditoría inicializado');
};

// ======================================================
// 5. FUNCIÓN: cargarDatosInicialesAuditor()
// ======================================================
// 📌 PROPÓSITO: Cargar todos los datos necesarios para el auditor
// 📌 ACCIONES:
//    1. Configurar fecha actual en el formulario
//    2. Normalizar evaluaciones guardadas
//    3. Restaurar estado de frentes
//    4. Deshabilitar formulario
//    5. Inicializar buscador
//    6. Cargar contador y historial
//    7. Cargar escuchas
//    8. Iniciar monitor de sesión
// ======================================================

async function cargarDatosInicialesAuditor() {
    console.log('📂 Cargando datos para auditor...');

    // ======================================================
    // 5a. CONFIGURAR FECHA ACTUAL EN EL FORMULARIO
    // ======================================================
    const fechaInput = document.getElementById('evalFecha');
    if (fechaInput) {
        fechaInput.value = formatDateForInput(new Date());
    }

    // ======================================================
    // 5b. NORMALIZAR EVALUACIONES GUARDADAS
    // ======================================================
    const normalizadas = normalizarEvaluaciones();
    if (normalizadas > 0) {
        console.log(`Se normalizaron ${normalizadas} evaluaciones`);
    }

    // ======================================================
    // 5c. RESTAURAR ESTADO DE FRENTES
    // ======================================================
    restaurarFrentes();
    calcularItemsPorFrente();

    // ======================================================
    // 5d. DESHABILITAR FORMULARIO
    // ======================================================
    deshabilitarFormularioCompleto(true);

    // ======================================================
    // 5e. CONFIGURAR BOTONES
    // ======================================================
    document.getElementById('btnFinalizar').style.display = 'none';

    // ======================================================
    // 5f. INICIALIZAR BUSCADOR DE AGENTES
    // ======================================================
    inicializarBuscadorAgentes();

    // ======================================================
    // 5g. CONFIGURAR DROPDOWN DE AGENTES
    // ======================================================
    const dropdown = document.getElementById('agenteDropdown');
    if (dropdown) {
        dropdown.innerHTML = `
            <div class="select-buscador-empty">
                🔒 Haga clic en "Auditar" para cargar los agentes disponibles
            </div>
        `;
    }

    // ======================================================
    // 5h. CARGAR CONTADOR Y HISTORIAL
    // ======================================================
    await actualizarContadorHeader();
    await cargarHistorialEvaluaciones();

    // ======================================================
    // 5i. CARGAR ESCUCHAS
    // ======================================================
    await cargarMisEscuchas();

    // ======================================================
    // 5j. ACTIVAR PESTAÑA "MIS ESCUCHAS"
    // ======================================================
    const misEscuchasTab = document.getElementById('tab-misEscuchas');
    const evaluacionTab = document.getElementById('tab-evaluacion');
    const misEscuchasBtn = document.querySelector('.tab-button[onclick*="misEscuchas"]');
    const evaluacionBtn = document.querySelector('.tab-button[onclick*="evaluacion"]');

    if (misEscuchasTab) misEscuchasTab.classList.add('active');
    if (evaluacionTab) evaluacionTab.classList.remove('active');
    if (misEscuchasBtn) misEscuchasBtn.classList.add('active');
    if (evaluacionBtn) evaluacionBtn.classList.remove('active');

    // ======================================================
    // 5k. DESHABILITAR BOTÓN AUDITAR
    // ======================================================
    const btnAuditar = document.getElementById('btnAuditar');
    if (btnAuditar) {
        btnAuditar.disabled = true;
        btnAuditar.style.opacity = '0.5';
        btnAuditar.style.cursor = 'not-allowed';
        btnAuditar.title = 'Debe seleccionar una escucha de la pestaña "Mis Escuchas"';
    }

    // ======================================================
    // 5l. INICIAR MONITOR DE SESIÓN
    // ======================================================
    if (usuarioActual) {
        iniciarMonitorSesion();
    }

    console.log('✅ Datos cargados - Pestaña Mis Escuchas activa');
}

// ======================================================
// BLOQUE 16: GESTIÓN DE EXCEL, FILTROS, ESCUCHAS Y REGISTROS
// ======================================================
// 
// 📌 PROPÓSITO: Gestionar carga de Excel (deprecado), filtros de historial,
//    y funciones principales de Mis Escuchas para el auditor
// 📌 ESTRUCTURA:
//    1. inicializarCargadorExcel() - Gestión de agentes vía PostgreSQL
//    2. filtrarHistorial() - Filtro con debounce
//    3. cargarHistorialConFiltro() - Carga historial filtrado
//    4. eliminarTodosRegistros() - Elimina todos los registros
//    5. cargarMisEscuchas() - Carga escuchas del auditor
// ======================================================

// ======================================================
// 1. FUNCIÓN: inicializarCargadorExcel()
// ======================================================
// 📌 PROPÓSITO: Inicializar el cargador de Excel (DEPRECADO)
// 📌 NOTA: Ahora los agentes vienen de PostgreSQL
// 📌 USO: Mantenido por compatibilidad, pero no hace nada
// ======================================================

function inicializarCargadorExcel() {
    // Ya no se carga Excel, los agentes vienen de PostgreSQL
    console.log('✅ Gestión de agentes vía PostgreSQL');
}

// ======================================================
// 2. FUNCIONES DE FILTRO DE HISTORIAL
// ======================================================

let timeoutFiltro = null;  // Timeout para debounce

// ----------------------------------------------------------------------
// 2a. FUNCIÓN: filtrarHistorial()
// ----------------------------------------------------------------------
// 📌 PROPÓSITO: Filtrar el historial con debounce (300ms)
// 📌 MECANISMO: Espera 300ms después de la última tecla para filtrar
// 📌 USO: Evento 'input' en el campo de búsqueda
// ======================================================

function filtrarHistorial() {
    // Obtener texto de búsqueda
    const busqueda = document.getElementById('buscarHistorial').value.toLowerCase();

    // Debounce: cancelar timeout anterior
    if (timeoutFiltro) clearTimeout(timeoutFiltro);
    
    // Crear nuevo timeout
    timeoutFiltro = setTimeout(() => {
        cargarHistorialConFiltro(busqueda);
    }, 300);
}

// ----------------------------------------------------------------------
// 2b. FUNCIÓN: cargarHistorialConFiltro()
// ----------------------------------------------------------------------
// 📌 PROPÓSITO: Cargar historial con filtro aplicado
// 📌 PARÁMETROS: busqueda (string) - Texto a buscar
// 📌 CAMPOS BUSCADOS: agente, evaluador, id_llamada, ticket_psi
// 📌 FUENTE: API (PostgreSQL)
// ======================================================

async function cargarHistorialConFiltro(busqueda) {
    // Obtener referencia al cuerpo de la tabla
    const tbody = document.getElementById('tablaHistorialBody');
    if (!tbody) return;

    try {
        // ======================================================
        // 2b.1. VALIDAR CONEXIÓN A BD
        // ======================================================
        const client = getDB();

        if (!client || typeof client.from !== 'function') {
            throw new Error('Base de datos no disponible');
        }

        // ======================================================
        // 2b.2. MOSTRAR INDICADOR DE CARGA
        // ======================================================
        tbody.innerHTML = '<tr><td colspan="11" style="text-align: center; padding: 50px;">⏳ Buscando...</td></tr>';

        // ======================================================
        // 2b.3. CONSTRUIR CONSULTA
        // ======================================================
        let query = client
            .from('evaluaciones')
            .select('*')
            .order('timestamp', { ascending: false });

        // Aplicar filtro si hay búsqueda
        if (busqueda && busqueda !== '') {
            query = query.or(
                `agente.ilike.%${busqueda}%,` +
                `evaluador.ilike.%${busqueda}%,` +
                `id_llamada.ilike.%${busqueda}%,` +
                `ticket_psi.ilike.%${busqueda}%`
            );
        }

        // ======================================================
        // 2b.4. EJECUTAR CONSULTA
        // ======================================================
        const { data: evaluaciones, error } = await query;

        if (error) throw error;

        // ======================================================
        // 2b.5. VALIDAR RESULTADOS
        // ======================================================
        if (!evaluaciones || evaluaciones.length === 0) {
            tbody.innerHTML = `<tr><td colspan="11" style="text-align: center; padding: 50px;">
                ${busqueda ? '🔍 No se encontraron resultados para "' + escapeHtml(busqueda) + '"' : '📭 No hay evaluaciones registradas'}
            </td></tr>`;
            document.getElementById('totalHistorialCount').textContent = '0';
            document.getElementById('mostrandoHistorialCount').textContent = '0';
            return;
        }

        // ======================================================
        // 2b.6. GENERAR FILAS
        // ======================================================
        let html = '';
        for (const eval of evaluaciones) {
            // Color de nota (todas con el mismo estilo en filtro)
            let notaColor = 'var(--text)';

            const idLlamada = eval.id_llamada || '';
            const idLlamadaTruncada = idLlamada.length > 50 ? idLlamada.substring(0, 47) + '...' : idLlamada;

            // Formatear fecha descarga
            let fechaDescarga = '-';
            if (eval.fecha_descarga) {
                try {
                    if (eval.fecha_descarga.includes('-')) {
                        const [anio, mes, dia] = eval.fecha_descarga.split('T')[0].split('-');
                        fechaDescarga = `${dia}/${mes}/${anio}`;
                    } else if (eval.fecha_descarga.includes('/')) {
                        fechaDescarga = eval.fecha_descarga;
                    } else {
                        fechaDescarga = eval.fecha_descarga;
                    }
                } catch(e) {
                    fechaDescarga = eval.fecha_descarga || '-';
                }
            }

            html += `<tr>
                <td style="padding: 10px 8px; white-space: nowrap;">${eval.fecha_formateada || eval.fecha || '-'}</td>
                <td style="padding: 10px 8px;"><strong>${escapeHtml(eval.ticket_psi || '')}</strong></td>
                <td style="padding: 10px 8px;">${escapeHtml(eval.agente || '-')}</td>
                <td style="padding: 10px 8px;">${escapeHtml(eval.evaluador || '-')}</td>
                <td style="padding: 10px 8px; word-break: break-word; max-width: 250px;" title="${escapeHtml(idLlamada)}">
                    ${escapeHtml(idLlamadaTruncada)}
                </td>
                <td style="padding: 10px 8px; text-align: center;">${escapeHtml(fechaDescarga)}</td>
                <td style="padding: 10px 8px; font-weight: bold; color: var(--text); text-align: center;">${eval.nota_final}%</td>
                <td style="padding: 10px 8px; text-align: center;">${eval.tiempo_auditoria_formateado || '-'}</td>
                <td style="padding: 10px 8px; text-align: center;">${eval.veces_editado > 0 ? `✏️ ${eval.veces_editado}` : '-'}</td>
                <td style="padding: 10px 8px; white-space: nowrap; text-align: center;">
                    <button onclick="editarEvaluacion(${eval.id})" style="padding: 5px 10px; background: #019DF4; color: white; margin-right: 5px; border: none; border-radius: 6px; cursor: pointer; font-size: 12px;">✏️</button>
                    <button onclick="eliminarEvaluacion(${eval.id})" style="padding: 5px 10px; background: #fee; color: #d93025; border: 1px solid #ffcfcf; border-radius: 6px; cursor: pointer; font-size: 12px;">🗑️</button>
                </td>
            </tr>`;
        }

        // ======================================================
        // 2b.7. ACTUALIZAR TABLA Y CONTADORES
        // ======================================================
        tbody.innerHTML = html;
        document.getElementById('totalHistorialCount').textContent = evaluaciones.length;
        document.getElementById('mostrandoHistorialCount').textContent = evaluaciones.length;

    } catch (error) {
        console.error('Error:', error);
        tbody.innerHTML = `<tr><td colspan="11" style="text-align: center; padding: 50px; color: #d93025;">❌ Error: ${error.message}</td></tr>`;
    }
}

// ======================================================
// 3. FUNCIÓN: eliminarTodosRegistros()
// ======================================================
// 📌 PROPÓSITO: Eliminar todos los registros de evaluaciones
// 📌 ACCIONES:
//    1. Confirmar acción
//    2. Eliminar localStorage
//    3. Actualizar interfaces
// 📌 ADVERTENCIA: Esta acción NO se puede deshacer
// ======================================================

function eliminarTodosRegistros() {
    // ======================================================
    // 3a. CONFIRMAR ELIMINACIÓN
    // ======================================================
    if (!confirm('¿ELIMINAR TODOS LOS REGISTROS? Esta acción no se puede deshacer.')) return;

    // ======================================================
    // 3b. ELIMINAR Y ACTUALIZAR
    // ======================================================
    localStorage.removeItem('evaluaciones_calidad');
    actualizarContadorHeader();
    cargarHistorialEvaluaciones();
    
    // Si la pestaña de reportes está activa, regenerar reportes
    if (document.getElementById('tab-reportes').classList.contains('active')) {
        generarReportes();
    }
    
    alert('✅ Todos los registros eliminados');
}

// ======================================================
// 4. FUNCIÓN: cargarMisEscuchas()
// ======================================================
// 📌 PROPÓSITO: Cargar las escuchas asignadas al auditor actual
// 📌 FUENTE: API.getMisEscuchas()
// 📌 FILTROS: Por 'usuario' (no por nombre_completo)
// 📌 ACTUALIZA: misEscuchasData, tabla de escuchas, tarjetas de resumen
// ======================================================

async function cargarMisEscuchas() {
    console.log('🎧 cargarMisEscuchas - INICIO');
    console.log('👤 usuarioActual.usuario:', usuarioActual?.usuario);

    // ======================================================
    // 4a. VALIDAR CONEXIÓN A BD
    // ======================================================
    const db = getDB();
    if (!db) {
        console.error('❌ Base de datos no disponible');
        return;
    }

    try {
        // ======================================================
        // 4b. OBTENER ESCUCHAS DEL AUDITOR
        // ======================================================
        // ✅ IMPORTANTE: Usar 'usuario' (nombre de usuario) no 'nombre_completo'
        const auditorUsuario = usuarioActual.usuario;

        console.log('📡 Consultando asignaciones_escucha para auditor_usuario:', auditorUsuario);

        // Obtener escuchas de la API
        const data = await API.getMisEscuchas(auditorUsuario);
        
        console.log('📊 Resultado:', data?.length || 0, 'registros');

        // ======================================================
        // 4c. GUARDAR DATOS Y ACTUALIZAR UI
        // ======================================================
        misEscuchasData = data || [];

        // Actualizar tarjetas de resumen (KPIs)
        actualizarTarjetasResumen();
        
        // Aplicar filtro actual y mostrar en tabla
        filtrarEscuchasPorEstado(filtroActual);

        // ======================================================
        // 4d. MANEJAR CASO SIN ESCUCHAS
        // ======================================================
        if (misEscuchasData.length === 0) {
            const tbody = document.getElementById('tablaMisEscuchas');
            if (tbody) {
                tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 40px;">
                    📭 No tienes escuchas asignadas.
                </td></tr>`;
            }
        }

    } catch (error) {
        console.error('❌ Error cargando escuchas:', error);
        const tbody = document.getElementById('tablaMisEscuchas');
        if (tbody) {
            tbody.innerHTML = `<td><td colspan="7" style="text-align: center; color: var(--danger);">❌ Error: ${error.message}</td></tr>`;
        }
    }
}

// ======================================================
// BLOQUE 17: GESTIÓN DE ESCUCHAS - TARJETAS, FILTROS Y TABLA
// ======================================================
// 
// 📌 PROPÓSITO: Gestionar las escuchas del auditor (tarjetas resumen, 
//    filtros, tabla y cancelación de gestión)
// 📌 ESTRUCTURA:
//    1. actualizarTarjetasResumen() - Actualiza KPIs de escuchas
//    2. filtrarEscuchasPorEstado() - Filtra escuchas por estado
//    3. actualizarTablaMisEscuchas() - Renderiza tabla de escuchas
//    4. cancelarGestionEscucha() - Cancela gestión de escucha
// ======================================================

// ======================================================
// 1. FUNCIÓN: actualizarTarjetasResumen()
// ======================================================
// 📌 PROPÓSITO: Actualizar las tarjetas de resumen de escuchas
// 📌 KPIs: 
//    - Pendientes (⏳)
//    - En Proceso (🔄)
//    - Total Asignados (📊)
// 📌 NOTA: Los gestionados se ven en el historial, no aquí
// ======================================================

function actualizarTarjetasResumen() {
    // ======================================================
    // 1a. CONTAR ESCUCHAS POR ESTADO
    // ======================================================
    const pendientes = misEscuchasData.filter(e => e.estado === 'pendiente').length;
    const enProceso = misEscuchasData.filter(e => e.estado === 'en_proceso').length;
    const total = misEscuchasData.length;

    // ======================================================
    // 1b. ACTUALIZAR ELEMENTOS DEL DOM
    // ======================================================
    document.getElementById('totalPendientes').textContent = pendientes;
    document.getElementById('totalEnProceso').textContent = enProceso;
    document.getElementById('totalAsignados').textContent = total;

    // 🔴 Gestionados se ven en el historial, no aquí
}

// ======================================================
// 2. FUNCIÓN: filtrarEscuchasPorEstado()
// ======================================================
// 📌 PROPÓSITO: Filtrar y mostrar escuchas según estado
// 📌 PARÁMETROS: estado (string) - 'pendiente', 'en_proceso', 'gestionado'
// 📌 ACCIONES:
//    - Si es 'gestionado' → redirige al historial
//    - Actualiza estilos de los tabs
//    - Filtra y muestra las escuchas
// ======================================================

function filtrarEscuchasPorEstado(estado) {
    // ======================================================
    // 2a. REDIRIGIR GESTIONADOS AL HISTORIAL
    // ======================================================
    // 📌 Los tickets gestionados se ven en la pestaña "Historial"
    if (estado === 'gestionado') {
        mostrarMensajeTemporal(
            '📋 Los tickets gestionados se encuentran en la pestaña "Historial de Evaluaciones"', 
            'var(--accent)'
        );
        showTab('historial', null);
        return;
    }

    // ======================================================
    // 2b. ACTUALIZAR FILTRO ACTUAL
    // ======================================================
    filtroActual = estado;

    // ======================================================
    // 2c. ACTUALIZAR ESTILOS DE TABS
    // ======================================================
    document.querySelectorAll('.tab-escucha-btn').forEach(btn => {
        btn.classList.remove('active');
        btn.style.borderBottom = 'none';
        btn.style.color = 'var(--muted)';
    });

    // Resaltar el tab activo
    const btnActivo = document.querySelector(`.tab-escucha-btn[data-estado="${estado}"]`);
    if (btnActivo) {
        btnActivo.classList.add('active');
        
        // Colores según estado
        if (estado === 'pendiente') {
            btnActivo.style.borderBottom = '3px solid var(--warning)';
            btnActivo.style.color = 'var(--warning)';
        } else if (estado === 'en_proceso') {
            btnActivo.style.borderBottom = '3px solid var(--accent)';
            btnActivo.style.color = 'var(--accent)';
        }
    }

    // ======================================================
    // 2d. FILTRAR Y MOSTRAR ESCUCHAS
    // ======================================================
    const filtrados = misEscuchasData.filter(e => e.estado === estado);
    actualizarTablaMisEscuchas(filtrados);
}

// ======================================================
// 3. FUNCIÓN: actualizarTablaMisEscuchas()
// ======================================================
// 📌 PROPÓSITO: Renderizar la tabla de escuchas filtradas
// 📌 PARÁMETROS: escuchas (Array) - Lista de escuchas a mostrar
// 📌 COLUMNAS: Ticket, Gestor, Supervisor, Motivos, Fecha, Estado, Acciones
// 📌 ACCIONES: Gestionar, Continuar, Cancelar, Reportar Incidencia
// ======================================================

function actualizarTablaMisEscuchas(escuchas) {
    const tbody = document.getElementById('tablaMisEscuchas');
    if (!tbody) return;

    // ======================================================
    // 3a. MANEJAR CASO SIN ESCUCHAS
    // ======================================================
    if (escuchas.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 40px;">
            📭 No hay escuchas ${filtroActual === 'pendiente' ? 'pendientes' : 'en proceso'}
        </td></tr>`;
        return;
    }

    // ======================================================
    // 3b. GENERAR FILAS DE LA TABLA
    // ======================================================
    let html = '';
    for (const escucha of escuchas) {
        let estadoBadge = '';
        let acciones = '';

        // ======================================================
        // 3c. FORMATEAR FECHA DE ASIGNACIÓN
        // ======================================================
        let fechaAsignacion = '-';
        if (escucha.fecha_asignacion) {
            try {
                const fecha = new Date(escucha.fecha_asignacion);
                if (!isNaN(fecha.getTime())) {
                    fechaAsignacion = `${fecha.getDate().toString().padStart(2, '0')}/${(fecha.getMonth() + 1).toString().padStart(2, '0')}/${fecha.getFullYear()}`;
                }
            } catch (e) { fechaAsignacion = '-'; }
        }

        // ======================================================
        // 3d. GENERAR BADGE Y ACCIONES SEGÚN ESTADO
        // ======================================================
        switch (escucha.estado) {
            case 'pendiente':
                estadoBadge = '<span class="badge-estado badge-pendiente">⏳ Pendiente</span>';
                acciones = `
                    <div class="acciones-container">
                        <button class="btn-gestionar" onclick="iniciarGestionEscucha(${escucha.id})">🎧 Gestionar</button>
                        <button class="btn-incidencia" onclick="abrirModalIncidencia(${escucha.id})">⚠️ Reportar</button>
                    </div>
                `;
                break;
                
            case 'en_proceso':
                estadoBadge = '<span class="badge-estado badge-proceso">🔄 En proceso</span>';
                acciones = `
                    <div class="acciones-container">
                        <button class="btn-continuar" onclick="continuarGestionEscucha(${escucha.id})">✏️ Continuar</button>
                        <button class="btn-cancelar" onclick="cancelarGestionEscucha(${escucha.id})">❌ Cancelar</button>
                        <button class="btn-incidencia" onclick="abrirModalIncidencia(${escucha.id})">⚠️ Reportar</button>
                    </div>
                `;
                break;
                
            default:
                continue;  // Saltar otros estados (no deberían aparecer)
        }

        // ======================================================
        // 3e. GENERAR FILA
        // ======================================================
        html += `
            <tr>
                <td><strong>${escapeHtml(escucha.ticket)}</strong></td>
                <td>${escapeHtml(escucha.gestor_auditado || '-')}</td>
                <td>${escapeHtml(escucha.supervisor_responsable || '-')}</td>
                <td class="motivos-cell" title="${escapeHtml(escucha.motivos || '')}">
                    ${escapeHtml((escucha.motivos || '-').substring(0, 60))}${(escucha.motivos || '').length > 60 ? '...' : ''}
                </td>
                <td>${fechaAsignacion}</td>
                <td>${estadoBadge}</td>
                <td>${acciones}</td>
            </tr>
        `;
    }

    tbody.innerHTML = html;
}

// ======================================================
// 4. FUNCIÓN: cancelarGestionEscucha()
// ======================================================
// 📌 PROPÓSITO: Cancelar una escucha en proceso y volverla a pendiente
// 📌 PARÁMETROS: id (number) - ID de la escucha
// 📌 ACCIONES:
//    1. Limpiar datos PSI
//    2. Confirmar cancelación
//    3. Cancelar en API (cambia estado a 'pendiente')
//    4. Detener temporizador
//    5. Resetear estado de auditoría
//    6. Recargar escuchas y limpiar formulario
// ======================================================

async function cancelarGestionEscucha(id) {
    // ======================================================
    // 4a. LIMPIAR SECCIÓN DE DATOS PSI
    // ======================================================
    const seccionPSI = document.getElementById('seccionDatosPSI');
    if (seccionPSI) {
        seccionPSI.style.display = 'none';
    }

    // Limpiar campos PSI
    const psiMotivos = document.getElementById('psiMotivos');
    const psiSubmotivos = document.getElementById('psiSubmotivos');
    const psiSubnivel = document.getElementById('psiSubnivel');
    const psiPeticion = document.getElementById('psiPeticion');
    
    if (psiMotivos) psiMotivos.value = '';
    if (psiSubmotivos) psiSubmotivos.value = '';
    if (psiSubnivel) psiSubnivel.value = '';
    if (psiPeticion) psiPeticion.value = '';

    console.log('❌ Cancelando gestión de escucha ID:', id);

    // ======================================================
    // 4b. CONFIRMAR CANCELACIÓN
    // ======================================================
    const confirmar = confirm(
        '⚠️ ¿Está seguro de cancelar esta gestión?\n\n' +
        'La escucha volverá a estado "Pendiente" para que pueda ser nuevamente gestionada.'
    );

    if (!confirmar) return;

    // ======================================================
    // 4c. VALIDAR CONEXIÓN A BD
    // ======================================================
    const db = getDB();
    if (!db) {
        alert('❌ Base de datos no disponible');
        return;
    }

    try {
        // ======================================================
        // 4d. CANCELAR GESTIÓN EN API
        // ======================================================
        await API.cancelarGestionEscucha(id);
        console.log('✅ Escucha cancelada, vuelve a estado pendiente');

        // ======================================================
        // 4e. DETENER TEMPORIZADOR
        // ======================================================
        if (temporizadorInterval) {
            clearInterval(temporizadorInterval);
            temporizadorInterval = null;
        }

        const timerElement = document.getElementById('temporizadorAuditoria');
        if (timerElement) {
            timerElement.remove();
        }

        // ======================================================
        // 4f. RESETEAR ESTADO DE AUDITORÍA
        // ======================================================
        auditando = false;
        tiempoInicio = null;
        tiempoFin = null;

        // ======================================================
        // 4g. MOSTRAR MENSAJE DE CONFIRMACIÓN
        // ======================================================
        mostrarMensajeTemporal('✅ Escucha cancelada. Volvió a estado "Pendiente".', 'var(--warning)');

        // ======================================================
        // 4h. RECARGAR ESCUCHAS Y LIMPIAR FORMULARIO
        // ======================================================
        await cargarMisEscuchas();
        limpiarFormularioCompleto();

        // ======================================================
        // 4i. VOLVER A PESTAÑA DE ESCUCHAS SI ESTAMOS EN EVALUACIÓN
        // ======================================================
        const evaluacionTab = document.getElementById('tab-evaluacion');
        if (evaluacionTab && evaluacionTab.classList.contains('active')) {
            limpiarFormularioCompleto();
            showTab('misEscuchas', null);
        }

        // ======================================================
        // 4j. RESETEAR FLAGS DE GESTIÓN
        // ======================================================
        if (window.idEscuchaGestionando === id) {
            window.gestionEscuchaActiva = false;
            window.idEscuchaGestionando = null;

            // Restaurar el botón Auditar
            const btnAuditar = document.getElementById('btnAuditar');
            if (btnAuditar) {
                btnAuditar.disabled = true;
                btnAuditar.style.opacity = '0.5';
                btnAuditar.style.cursor = 'not-allowed';
            }
        }

    } catch (error) {
        console.error('❌ Error al cancelar:', error);
        alert('❌ Error al cancelar la gestión: ' + error.message);
    }
}

// ======================================================
// BLOQUE 18: GESTIÓN DE ESCUCHAS - INICIAR, CONTINUAR Y CARGAR DATOS
// ======================================================
// 
// 📌 PROPÓSITO: Gestionar el inicio y continuación de escuchas,
//    cargando los datos en el formulario de evaluación
// 📌 ESTRUCTURA:
//    1. iniciarGestionEscucha() - Inicia gestión de escucha pendiente
//    2. continuarGestionEscucha() - Continúa escucha en proceso
//    3. cargarDatosEscuchaEnFormulario() - Carga datos en formulario
// ======================================================

// ======================================================
// 1. FUNCIÓN: iniciarGestionEscucha()
// ======================================================
// 📌 PROPÓSITO: Iniciar la gestión de una escucha pendiente
// 📌 PARÁMETROS: id (number) - ID de la escucha
// 📌 FLUJO:
//    1. Buscar escucha en misEscuchasData
//    2. Cambiar estado a "en_proceso" en BD
//    3. Cargar datos en formulario
//    4. Cambiar a pestaña de evaluación
//    5. Habilitar botón Auditar
// ======================================================

async function iniciarGestionEscucha(id) {
    console.log('🎧 misEscuchasData:', misEscuchasData);
    console.log('🎧 Buscando ID:', id);
    console.log('🎧 IDs disponibles:', misEscuchasData.map(e => e.id));

    try {
        // ======================================================
        // 1a. BUSCAR ESCUCHA EN DATOS CARGADOS
        // ======================================================
        const escucha = misEscuchasData.find(e => e.id == id);
        
        if (!escucha) {
            throw new Error('No se encontró la escucha');
        }

        console.log('📅 Fecha audio:', escucha.fecha_descarga);

        // ======================================================
        // 1b. CAMBIAR ESTADO A "EN PROCESO"
        // ======================================================
        await API.iniciarGestionEscucha(id);

        // ======================================================
        // 1c. MARCAR MODO GESTIÓN DE ESCUCHA
        // ======================================================
        window.gestionEscuchaActiva = true;
        window.idEscuchaGestionando = id;

        // ======================================================
        // 1d. CARGAR DATOS EN FORMULARIO
        // ======================================================
        cargarDatosEscuchaEnFormulario(escucha);

        // ======================================================
        // 1e. CAMBIAR A PESTAÑA DE EVALUACIÓN
        // ======================================================
        showTab('evaluacion', null);

        // ======================================================
        // 1f. DESHABILITAR SELECTS INICIALMENTE
        // ======================================================
        const selects = document.querySelectorAll('.cumple-select');
        selects.forEach(select => {
            select.disabled = true;
            select.style.backgroundColor = '#f0f0f0';
        });

        // ======================================================
        // 1g. HABILITAR BOTÓN AUDITAR
        // ======================================================
        const btnAuditar = document.getElementById('btnAuditar');
        if (btnAuditar) {
            btnAuditar.disabled = false;
            btnAuditar.style.opacity = '1';
            btnAuditar.style.cursor = 'pointer';
            btnAuditar.style.display = 'inline-flex';
            btnAuditar.title = 'Iniciar auditoría con los datos precargados';
        }

        // ======================================================
        // 1h. MOSTRAR BOTÓN CANCELAR
        // ======================================================
        const btnCancelarGestion = document.getElementById('btnCancelarGestion');
        if (btnCancelarGestion) {
            btnCancelarGestion.style.display = 'inline-flex';
        }

        // ======================================================
        // 1i. MOSTRAR MENSAJE DE CONFIRMACIÓN
        // ======================================================
        mostrarMensajeTemporal(
            '🎧 Escucha cargada. Presione "Auditar" para comenzar la evaluación.',
            'var(--ok)'
        );

        // ======================================================
        // 1j. ELIMINAR TEMPORIZADOR SI EXISTE
        // ======================================================
        const timerElement = document.getElementById('temporizadorAuditoria');
        if (timerElement) {
            timerElement.remove();
        }

    } catch (error) {
        console.error('❌ Error al iniciar gestión:', error);
        alert('❌ Error al cargar la escucha: ' + error.message);
        
        // Limpiar flags en caso de error
        window.gestionEscuchaActiva = false;
        window.idEscuchaGestionando = null;
    }
}

// ======================================================
// 2. FUNCIÓN: continuarGestionEscucha()
// ======================================================
// 📌 PROPÓSITO: Continuar la gestión de una escucha en proceso
// 📌 PARÁMETROS: id (number) - ID de la escucha
// 📌 FLUJO:
//    1. Obtener datos de la escucha desde BD
//    2. Verificar si existe evaluación previa
//    3. Si existe → cargar para edición
//    4. Si no → cargar datos frescos
//    5. Habilitar botón Auditar
// ======================================================

async function continuarGestionEscucha(id) {
    console.log('🔄 Continuando gestión de escucha ID:', id);

    // ======================================================
    // 2a. VALIDAR CONEXIÓN A BD
    // ======================================================
    const db = getDB();
    if (!db) {
        alert('❌ Base de datos no disponible');
        return;
    }

    try {
        // ======================================================
        // 2b. OBTENER DATOS DE LA ESCUCHA
        // ======================================================
        const { data: escucha, error } = await db
            .from('asignaciones_escucha')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        console.log('📅 Fecha descarga audio:', escucha.fecha_descarga);

        // ======================================================
        // 2c. VERIFICAR SI EXISTE EVALUACIÓN PREVIA
        // ======================================================
        const { data: evaluacionExistente } = await db
            .from('evaluaciones')
            .select('*')
            .eq('ticket_psi', escucha.ticket)
            .maybeSingle();

        // ======================================================
        // 2d. MARCAR MODO GESTIÓN DE ESCUCHA
        // ======================================================
        window.gestionEscuchaActiva = true;
        window.idEscuchaGestionando = id;

        // ======================================================
        // 2e. CAMBIAR A PESTAÑA DE EVALUACIÓN
        // ======================================================
        showTab('evaluacion', null);

        // ======================================================
        // 2f. CARGAR DATOS EN FORMULARIO
        // ======================================================
        if (evaluacionExistente) {
            console.log('📝 Evaluación existente encontrada, cargando para edición...');
            await editarEvaluacion(evaluacionExistente.id);
        } else {
            console.log('🆕 No hay evaluación previa, cargando datos frescos...');
            cargarDatosEscuchaEnFormulario(escucha);
        }

        // ======================================================
        // 2g. DESHABILITAR SELECTS INICIALMENTE
        // ======================================================
        const selects = document.querySelectorAll('.cumple-select');
        selects.forEach(select => {
            select.disabled = true;
            select.style.backgroundColor = '#f0f0f0';
        });

        // ======================================================
        // 2h. HABILITAR BOTÓN AUDITAR
        // ======================================================
        const btnAuditar = document.getElementById('btnAuditar');
        if (btnAuditar) {
            btnAuditar.disabled = false;
            btnAuditar.style.opacity = '1';
            btnAuditar.style.cursor = 'pointer';
            btnAuditar.style.display = 'inline-flex';
            btnAuditar.title = 'Iniciar auditoría con los datos precargados';
        }

        // ======================================================
        // 2i. MOSTRAR BOTÓN CANCELAR
        // ======================================================
        const btnCancelarGestion = document.getElementById('btnCancelarGestion');
        if (btnCancelarGestion) {
            btnCancelarGestion.style.display = 'inline-flex';
        }

        // ======================================================
        // 2j. MOSTRAR MENSAJE DE CONFIRMACIÓN
        // ======================================================
        mostrarMensajeTemporal(
            '🎧 Escucha cargada. Presione "Auditar" para comenzar la evaluación.',
            'var(--ok)'
        );

        // ======================================================
        // 2k. ELIMINAR TEMPORIZADOR SI EXISTE
        // ======================================================
        const timerElement = document.getElementById('temporizadorAuditoria');
        if (timerElement) {
            timerElement.remove();
        }

    } catch (error) {
        console.error('❌ Error al continuar gestión:', error);
        alert('❌ Error al continuar la gestión: ' + error.message);

        // Limpiar flags en caso de error
        window.gestionEscuchaActiva = false;
        window.idEscuchaGestionando = null;
    }
}

// ======================================================
// 3. FUNCIÓN: cargarDatosEscuchaEnFormulario()
// ======================================================
// 📌 PROPÓSITO: Cargar los datos de la escucha en el formulario
// 📌 PARÁMETROS: escucha (Object) - Datos de la escucha
// 📌 CAMPOS: Ticket PSI, Agente, ID Llamada, Fecha Descarga,
//    Datos PSI (Motivos, Submotivos, Subnivel, Petición)
// 📌 NOTA: Todos los campos se bloquean (readOnly/disabled)
// ======================================================

function cargarDatosEscuchaEnFormulario(escucha) {
    // ======================================================
    // 3a. TICKET PSI
    // ======================================================
    const ticketPSI = document.getElementById('evalTicketPSI');
    if (ticketPSI) {
        ticketPSI.value = escucha.ticket;
        ticketPSI.readOnly = true;
        ticketPSI.disabled = true;
        ticketPSI.style.backgroundColor = '#f0f0f0';
    }

    // ======================================================
    // 3b. GESTOR AUDITADO (AGENTE)
    // ======================================================
    const agenteInput = document.getElementById('evalAgenteInput');
    const agenteHidden = document.getElementById('evalAgente');
    
    if (agenteInput) {
        agenteInput.value = escucha.gestor_auditado || '';
        agenteInput.disabled = true;
        agenteInput.style.backgroundColor = '#f0f0f0';
        agenteInput.readOnly = true;
    }
    if (agenteHidden) {
        agenteHidden.value = escucha.gestor_auditado || '';
    }

    // ======================================================
    // 3c. ID LLAMADA (motivo_call)
    // ======================================================
    const idLlamada = document.getElementById('evalIdLlamada');
    if (idLlamada) {
        idLlamada.value = escucha.motivo_call || '';
        idLlamada.readOnly = true;
        idLlamada.disabled = true;
        idLlamada.style.backgroundColor = '#f0f0f0';
    }

    // ======================================================
    // 3d. FECHA DESCARGA AUDIO (CORREGIDO ZONA HORARIA)
    // ======================================================
    const fechaDescarga = document.getElementById('evalFechaDescargaAudio');
    if (fechaDescarga) {
        if (escucha.fecha_descarga) {
            try {
                let fechaStr = escucha.fecha_descarga;
                let anio, mes, dia, horas, minutos;

                // Parsear diferentes formatos
                if (fechaStr.includes('T')) {
                    const [fechaParte, horaParte] = fechaStr.split('T');
                    [anio, mes, dia] = fechaParte.split('-');
                    if (horaParte) {
                        [horas, minutos] = horaParte.split(':');
                    } else {
                        horas = '00';
                        minutos = '00';
                    }
                } else if (fechaStr.includes(' ')) {
                    const [fechaParte, horaParte] = fechaStr.split(' ');
                    [anio, mes, dia] = fechaParte.split('-');
                    if (horaParte) {
                        [horas, minutos] = horaParte.split(':');
                    } else {
                        horas = '00';
                        minutos = '00';
                    }
                } else {
                    [anio, mes, dia] = fechaStr.split('-');
                    horas = '00';
                    minutos = '00';
                }

                if (anio && mes && dia) {
                    // Crear fecha UTC
                    const fechaUTC = new Date(Date.UTC(
                        parseInt(anio),
                        parseInt(mes) - 1,
                        parseInt(dia),
                        parseInt(horas) || 0,
                        parseInt(minutos) || 0
                    ));

                    if (!isNaN(fechaUTC.getTime())) {
                        const diaFormateado = String(fechaUTC.getUTCDate()).padStart(2, '0');
                        const mesFormateado = String(fechaUTC.getUTCMonth() + 1).padStart(2, '0');
                        const anioFormateado = fechaUTC.getUTCFullYear();
                        const horasFormateadas = String(fechaUTC.getUTCHours()).padStart(2, '0');
                        const minutosFormateados = String(fechaUTC.getUTCMinutes()).padStart(2, '0');

                        fechaDescarga.value = `${diaFormateado}/${mesFormateado}/${anioFormateado} ${horasFormateadas}:${minutosFormateados}`;
                    } else {
                        fechaDescarga.value = escucha.fecha_descarga;
                    }
                } else {
                    fechaDescarga.value = escucha.fecha_descarga;
                }
            } catch (error) {
                console.error('Error formateando fecha:', error);
                fechaDescarga.value = escucha.fecha_descarga;
            }
        } else {
            fechaDescarga.value = 'No registrada';
        }
        fechaDescarga.readOnly = true;
        fechaDescarga.disabled = true;
        fechaDescarga.style.backgroundColor = '#f0f0f0';
    }

    // ======================================================
    // 3e. DATOS PSI (Motivos, Submotivos, Subnivel, Petición)
    // ======================================================
    const psiMotivos = document.getElementById('psiMotivos');
    const psiSubmotivos = document.getElementById('psiSubmotivos');
    const psiSubnivel = document.getElementById('psiSubnivel');
    const psiPeticion = document.getElementById('psiPeticion');

    if (psiMotivos) {
        psiMotivos.value = escucha.motivos || '';
        psiMotivos.style.backgroundColor = '#f0f0f0';
    }
    if (psiSubmotivos) {
        psiSubmotivos.value = escucha.submotivos || '';
        psiSubmotivos.style.backgroundColor = '#f0f0f0';
    }
    if (psiSubnivel) {
        psiSubnivel.value = escucha.subnivel || '';
        psiSubnivel.style.backgroundColor = '#f0f0f0';
    }
    if (psiPeticion) {
        psiPeticion.value = escucha.peticion || '';
        psiPeticion.style.backgroundColor = '#f0f0f0';
    }

    // ======================================================
    // 3f. MOSTRAR SECCIÓN DE DATOS PSI
    // ======================================================
    const seccionPSI = document.getElementById('seccionDatosPSI');
    if (seccionPSI) {
        seccionPSI.style.display = 'block';
    }

    // ======================================================
    // 3g. FECHA DE EVALUACIÓN (actual)
    // ======================================================
    const fechaInput = document.getElementById('evalFecha');
    if (fechaInput) {
        fechaInput.value = formatDateForInput(new Date());
        fechaInput.disabled = false;
        fechaInput.style.backgroundColor = '#fcfdfe';
    }

    // ======================================================
    // 3h. LIMPIAR SELECTS (PERO NO HABILITAR)
    // ======================================================
    const selects = document.querySelectorAll('.cumple-select');
    selects.forEach(select => {
        select.value = '';
        select.disabled = true;
        select.style.backgroundColor = '#f0f0f0';
    });

    // ======================================================
    // 3i. LIMPIAR PESOS
    // ======================================================
    const pesos = document.querySelectorAll('.peso-indicador');
    pesos.forEach(peso => {
        peso.textContent = '0%';
        peso.style.color = '';
    });

    // ======================================================
    // 3j. RESETEAR RESULTADOS
    // ======================================================
    const resultados = [
        'resultadoENC', 'resultadoECUF', 'resultadoECN',
        'resultadoFrenteCliente', 'resultadoFrenteNegocio', 'resultadoFrenteProceso'
    ];
    resultados.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = '0%';
    });

    console.log('✅ Datos de escucha cargados (incluyendo fecha descarga y datos PSI)');
}

// ======================================================
// BLOQUE 19: DETALLE DE ESCUCHA, MENSAJES Y MANEJADOR ESPECIAL
// ======================================================
// 
// 📌 PROPÓSITO: Gestionar detalles de escucha, mensajes temporales,
//    y manejar el caso especial "Cliente corta llamada"
// 📌 ESTRUCTURA:
//    1. verDetalleEscucha() - Ver detalle de escucha gestionada
//    2. cancelarGestionActual() - Cancelar gestión activa
//    3. mostrarMensajeTemporal() - Mostrar mensaje flotante
//    4. limpiarFormularioDespuesDeGuardar() - Limpiar después de guardar
//    5. manejarClienteCortaLlamada() - Manejar caso especial
// ======================================================

// ======================================================
// 1. FUNCIÓN: verDetalleEscucha()
// ======================================================
// 📌 PROPÓSITO: Mostrar el detalle de una escucha ya gestionada
// 📌 PARÁMETROS: id (number) - ID de la escucha
// 📌 INCLUYE: Datos de la escucha + resultados de evaluación (si existe)
// 📌 USO: Desde la tabla de historial o listado de gestionados
// ======================================================

async function verDetalleEscucha(id) {
    // ======================================================
    // 1a. VALIDAR CONEXIÓN A BD
    // ======================================================
    const db = getDB();
    if (!db) return;

    try {
        // ======================================================
        // 1b. OBTENER DATOS DE LA ESCUCHA
        // ======================================================
        const { data: escucha, error } = await db
            .from('asignaciones_escucha')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        // ======================================================
        // 1c. BUSCAR EVALUACIÓN ASOCIADA
        // ======================================================
        const { data: evaluacion } = await db
            .from('evaluaciones')
            .select('*')
            .eq('ticket_psi', escucha.ticket)
            .single();

        // ======================================================
        // 1d. CONSTRUIR MENSAJE
        // ======================================================
        let mensaje = `📋 DETALLE DE ESCUCHA GESTIONADA\n`;
        mensaje += `═══════════════════════════════════\n`;
        mensaje += `🎫 Ticket PSI: ${escucha.ticket}\n`;
        mensaje += `👤 Gestor: ${escucha.gestor_auditado}\n`;
        mensaje += `👥 Supervisor: ${escucha.supervisor_responsable}\n`;
        mensaje += `📅 Fecha asignación: ${escucha.fecha_asignacion ? new Date(escucha.fecha_asignacion).toLocaleString() : '-'}\n`;
        mensaje += `📅 Fecha gestión: ${escucha.fecha_gestion ? new Date(escucha.fecha_gestion).toLocaleString() : '-'}\n`;
        mensaje += `📊 Estado: Gestionado\n`;

        // ======================================================
        // 1e. AGREGAR RESULTADOS DE EVALUACIÓN (si existe)
        // ======================================================
        if (evaluacion) {
            mensaje += `\n📊 RESULTADOS EVALUACIÓN:\n`;
            mensaje += `   ✅ ENC: ${evaluacion.total_enc}/30%\n`;
            mensaje += `   ⚠️ ECUF: ${evaluacion.total_ecuf}/30%\n`;
            mensaje += `   💰 ECN: ${evaluacion.total_ecn}/40%\n`;
            mensaje += `   🎯 NOTA FINAL: ${evaluacion.nota_final}% (${evaluacion.rango})\n`;
        }

        // ======================================================
        // 1f. MOSTRAR DETALLE
        // ======================================================
        alert(mensaje);

    } catch (error) {
        console.error('Error:', error);
        alert('❌ Error al cargar detalle: ' + error.message);
    }
}

// ======================================================
// 2. FUNCIÓN: cancelarGestionActual()
// ======================================================
// 📌 PROPÓSITO: Cancelar la gestión activa actual
// 📌 VERIFICA: Si hay gestión activa y auditoría en curso
// 📌 USO: Botón "Cancelar" en la pestaña de evaluación
// ======================================================

function cancelarGestionActual() {
    // ======================================================
    // 2a. VERIFICAR SI HAY GESTIÓN ACTIVA
    // ======================================================
    if (!window.gestionEscuchaActiva || !window.idEscuchaGestionando) {
        alert('⚠️ No hay una gestión activa para cancelar');
        return;
    }

    // ======================================================
    // 2b. VERIFICAR AUDITORÍA ACTIVA
    // ======================================================
    if (auditando) {
        const confirmar = confirm(
            '⚠️ Hay una auditoría en curso.\n\n' +
            '¿Cancelar la gestión también detendrá la auditoría actual?\n\n' +
            'Los datos NO se guardarán.'
        );
        if (!confirmar) return;
    }

    // ======================================================
    // 2c. CANCELAR GESTIÓN
    // ======================================================
    cancelarGestionEscucha(window.idEscuchaGestionando);
}

// ======================================================
// 3. FUNCIÓN: mostrarMensajeTemporal()
// ======================================================
// 📌 PROPÓSITO: Mostrar un mensaje flotante temporal (3 segundos)
// 📌 PARÁMETROS: 
//    - mensaje (string) - Texto a mostrar
//    - color (string) - Color de fondo (ej: 'var(--ok)')
// 📌 ANIMACIÓN: SlideIn desde la derecha + fade out
// ======================================================

function mostrarMensajeTemporal(mensaje, color) {
    // ======================================================
    // 3a. CREAR ELEMENTO
    // ======================================================
    const msgDiv = document.createElement('div');
    msgDiv.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: ${color};
        color: white;
        padding: 12px 20px;
        border-radius: 8px;
        z-index: 10000;
        box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        animation: slideIn 0.3s ease;
        max-width: 400px;
    `;
    msgDiv.innerHTML = mensaje;
    
    // ======================================================
    // 3b. AGREGAR AL DOM
    // ======================================================
    document.body.appendChild(msgDiv);

    // ======================================================
    // 3c. ELIMINAR DESPUÉS DE 3 SEGUNDOS
    // ======================================================
    setTimeout(() => {
        msgDiv.style.opacity = '0';
        setTimeout(() => msgDiv.remove(), 300);
    }, 3000);
}

// ======================================================
// 4. FUNCIÓN: limpiarFormularioDespuesDeGuardar()
// ======================================================
// 📌 PROPÓSITO: Limpiar el formulario después de guardar una evaluación
// 📌 ACCIONES:
//    - Limpiar campos de escucha
//    - Resetear selects
//    - Resetear pesos y resultados
// 📌 USO: Después de finalizar auditoría
// ======================================================

function limpiarFormularioDespuesDeGuardar() {
    // ======================================================
    // 4a. LIMPIAR CAMPOS DE ESCUCHA
    // ======================================================
    const ticketPSI = document.getElementById('evalTicketPSI');
    const agenteInput = document.getElementById('evalAgenteInput');
    const idLlamada = document.getElementById('evalIdLlamada');
    const fechaInput = document.getElementById('evalFecha');

    if (ticketPSI) {
        ticketPSI.value = '';
        ticketPSI.readOnly = false;
        ticketPSI.style.backgroundColor = '';
    }
    if (agenteInput) {
        agenteInput.value = '';
        agenteInput.disabled = true;
        agenteInput.style.backgroundColor = '#f0f0f0';
    }
    if (idLlamada) {
        idLlamada.value = '';
        idLlamada.readOnly = false;
        idLlamada.style.backgroundColor = '';
    }
    if (fechaInput) {
        fechaInput.disabled = false;
        fechaInput.value = formatDateForInput(new Date());
    }

    // ======================================================
    // 4b. LIMPIAR SELECTS DE EVALUACIÓN
    // ======================================================
    const selects = document.querySelectorAll('.cumple-select');
    selects.forEach(select => {
        select.value = '';
        select.disabled = true;
    });

    // ======================================================
    // 4c. LIMPIAR PESOS
    // ======================================================
    const pesos = document.querySelectorAll('.peso-indicador');
    pesos.forEach(peso => {
        peso.textContent = '0%';
        peso.style.color = '';
    });

    // ======================================================
    // 4d. RESETEAR RESULTADOS
    // ======================================================
    const resultados = [
        'resultadoENC', 'resultadoECUF', 'resultadoECN',
        'resultadoFrenteCliente', 'resultadoFrenteNegocio', 'resultadoFrenteProceso'
    ];
    resultados.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.textContent = '0%';
    });
}

// ======================================================
// 5. FUNCIÓN: manejarClienteCortaLlamada()
// ======================================================
// 📌 PROPÓSITO: Manejar el caso especial "Cliente corta llamada"
// 📌 PARÁMETROS: select (elemento DOM) - El select que cambió
// 📌 COMPORTAMIENTO:
//    - Si selecciona "No Cumple": marca otros campos como "No Aplica"
//    - EXCEPCIONES: 3 campos no se modifican (Speech, Cierre, PSI)
//    - Si cambia a otro valor: rehabilitar campos
// 📌 EXCEPCIONES:
//    1. "Brinda Speech de saludo/despedida" (3%)
//    2. "No generar cierre incorrecto" (1%)
//    3. "No presenta datos incompletos en PSI" (2%)
// ======================================================

function manejarClienteCortaLlamada(select) {
    // ======================================================
    // 5a. OBTENER VALOR Y TEXTO SELECCIONADO
    // ======================================================
    const valor = select.value;
    const textoSeleccionado = select.options[select.selectedIndex]?.text;
    const esNoCumple = (valor === '0' && textoSeleccionado === 'No Cumple');

    const todosLosSelects = document.querySelectorAll('.cumple-select');

    // ======================================================
    // 5b. CASO: NO CUMPLE
    // ======================================================
    if (esNoCumple) {
        let camposModificados = 0;
        let camposExcluidos = 0;

        todosLosSelects.forEach(otroSelect => {
            if (otroSelect !== select) {
                const parentRow = otroSelect.closest('.eval-row');
                const labelSpan = parentRow ? parentRow.querySelector('span:first-child') : null;
                const textoCampo = labelSpan ? labelSpan.innerText : '';

                // ======================================================
                // EXCEPCIONES: Campos que NO se modifican
                // ======================================================
                const esExcluido =
                    textoCampo.includes('Brinda Speech de saludo/despedida') ||
                    textoCampo.includes('No generar cierre incorrecto o por motivo que no corresponde') ||
                    textoCampo.includes('No presenta datos incompletos o incorrectos en PSI');

                if (esExcluido) {
                    camposExcluidos++;
                    return; // Saltar este campo
                }

                // Buscar opción "No Aplica" (value="1")
                for (let i = 0; i < otroSelect.options.length; i++) {
                    if (otroSelect.options[i].text === 'No Aplica') {
                        otroSelect.selectedIndex = i;
                        camposModificados++;
                        break;
                    }
                }

                // Disparar evento change para actualizar cálculos
                const evento = new Event('change');
                otroSelect.dispatchEvent(evento);
                otroSelect.disabled = true;
            }
        });

        // ======================================================
        // 5c. MOSTRAR ALERTA CON EXCEPCIONES
        // ======================================================
        alert(`⚠️ Cliente NO permitió continuar la llamada.\n\n` +
            `Se han marcado automáticamente ${camposModificados} campos como "No Aplica".\n\n` +
            `✅ Campos EXCLUIDOS (no se modificaron):\n` +
            `   • Brinda Speech de saludo/despedida (3%)\n` +
            `   • No generar cierre incorrecto (1%)\n` +
            `   • No presenta datos incompletos en PSI (2%)\n\n` +
            `📝 Los campos marcados como "No Aplica" NO afectan la calificación final.`);

        // ======================================================
        // 5d. RESALTAR FORMULARIO (advertencia)
        // ======================================================
        const formularioCard = document.querySelector('.card');
        if (formularioCard) {
            formularioCard.style.border = '2px solid var(--warning)';
            formularioCard.style.backgroundColor = '#fffef7';
        }

    // ======================================================
    // 5e. CASO: REHABILITAR CAMPOS
    // ======================================================
    } else if (valor === '' || (valor === '1' && textoSeleccionado !== 'Cumple')) {
        let algunoHabilitado = false;

        todosLosSelects.forEach(otroSelect => {
            if (otroSelect !== select && otroSelect.disabled) {
                // Verificar si fue deshabilitado por la regla
                const parentRow = otroSelect.closest('.eval-row');
                const labelSpan = parentRow ? parentRow.querySelector('span:first-child') : null;
                const textoCampo = labelSpan ? labelSpan.innerText : '';

                const esExcluido =
                    textoCampo.includes('Brinda Speech de saludo/despedida') ||
                    textoCampo.includes('No generar cierre incorrecto o por motivo que no corresponde') ||
                    textoCampo.includes('No presenta datos incompletos o incorrectos en PSI');

                if (!esExcluido) {
                    otroSelect.disabled = false;
                    otroSelect.selectedIndex = 0;
                    const evento = new Event('change');
                    otroSelect.dispatchEvent(evento);
                    algunoHabilitado = true;
                }
            }
        });

        if (algunoHabilitado) {
            const formularioCard = document.querySelector('.card');
            if (formularioCard) {
                formularioCard.style.border = '';
                formularioCard.style.backgroundColor = '';
            }
            alert('⚠️ Se han rehabilitado los campos. Deberá revisar las selecciones manualmente.');
        }
    }

    // ======================================================
    // 5f. ACTUALIZAR PESO VISUAL DEL CAMPO ACTUAL
    // ======================================================
    const submotivo = select.dataset.submotivo;
    const pesoElement = document.getElementById(`peso-${submotivo}`);
    if (pesoElement) {
        if (valor === '1' && textoSeleccionado === 'Cumple') {
            pesoElement.textContent = `${select.dataset.peso}%`;
            pesoElement.style.color = 'var(--ok)';
        } else if (valor === '0') {
            pesoElement.textContent = '0%';
            pesoElement.style.color = 'var(--danger)';
        } else {
            pesoElement.textContent = '0%';
            pesoElement.style.color = '';
        }
    }

    // ======================================================
    // 5g. RECALCULAR RESULTADOS
    // ======================================================
    recalcularAtributoENC('PROTOCOLOS DE ATENCION');
    recalcularTotalENC();
    actualizarResultadoECUF();
    actualizarResultadoECN();
}

// ======================================================
// BLOQUE 20: MODO EDICIÓN DE EVALUACIONES
// ======================================================
// 
// 📌 PROPÓSITO: Permitir editar evaluaciones existentes
// 📌 ESTRUCTURA:
//    1. Variables globales de modo edición
//    2. editarEvaluacion() - Cargar evaluación para editar
//    3. cargarDatosEvaluacionEnFormulario() - Cargar datos en formulario
// ======================================================

// ======================================================
// 1. VARIABLES GLOBALES DE MODO EDICIÓN
// ======================================================

/**
 * modoEdicionActivo - Indica si estamos en modo edición
 * @type {boolean}
 * @uso: Controlar comportamiento de botones y formulario
 */
let modoEdicionActivo = false;

/**
 * idEvaluacionEditando - ID de la evaluación que se está editando
 * @type {number|null}
 * @uso: Identificar la evaluación a actualizar
 */
let idEvaluacionEditando = null;

// ======================================================
// 2. FUNCIÓN: editarEvaluacion()
// ======================================================
// 📌 PROPÓSITO: Cargar una evaluación existente para editar
// 📌 PARÁMETROS: id (number) - ID de la evaluación
// 📌 FLUJO:
//    1. Obtener evaluación y detalles desde API
//    2. Validar que el auditor sea el creador
//    3. Cambiar a pestaña de evaluación
//    4. Activar modo edición
//    5. Cargar datos en formulario
//    6. Configurar UI para modo edición
// ======================================================

async function editarEvaluacion(id) {
    try {
        console.log('📝 Editando evaluación ID:', id);

        // ======================================================
        // 2a. INDICADOR DE CARGA EN BOTÓN
        // ======================================================
        const btnEditar = event?.target;
        if (btnEditar) {
            btnEditar.innerHTML = '⏳ Cargando...';
            btnEditar.disabled = true;
        }

        // ======================================================
        // 2b. VALIDAR CONEXIÓN A BD
        // ======================================================
        const client = getDB();
        if (!client || typeof client.from !== 'function') {
            throw new Error('Base de datos no disponible');
        }

        // ======================================================
        // 2c. OBTENER EVALUACIÓN DESDE API
        // ======================================================
        const todasLasEvaluaciones = await API.getHistorial();
        const evaluacion = todasLasEvaluaciones.find(e => String(e.id) === String(id));

        if (!evaluacion) {
            throw new Error('Evaluación no encontrada');
        }

        // ======================================================
        // 2d. VALIDAR: SOLO EL CREADOR PUEDE EDITAR
        // ======================================================
        if (usuarioActual && usuarioActual.rol === 'AUDITOR') {
            if (evaluacion.evaluador !== usuarioActual.nombre_completo) {
                alert('❌ No puede editar evaluaciones de otros auditores');
                if (btnEditar) {
                    btnEditar.innerHTML = '✏️ Editar';
                    btnEditar.disabled = false;
                }
                return;
            }
        }

        // ======================================================
        // 2e. CARGAR DETALLES POR SEPARADO
        // ======================================================
        let detalles = [];
        try {
            detalles = await API.getDetallesEvaluacion(id);
            console.log(`✅ ${detalles.length} detalles cargados`);
        } catch (error) {
            console.warn('⚠️ No se pudieron cargar detalles:', error.message);
            detalles = [];
        }

        console.log(`✅ Evaluación cargada: ${evaluacion.ticket_psi}, ${detalles.length} detalles`);

        // ======================================================
        // 2f. CONVERTIR AL FORMATO DEL FORMULARIO
        // ======================================================
        const evaluacionFormateada = {
            id: evaluacion.id,
            timestamp: evaluacion.timestamp,
            evaluador: evaluacion.evaluador,
            ticketPSI: evaluacion.ticket_psi,
            agente: evaluacion.agente,
            fecha: evaluacion.fecha,
            fechaFormateada: evaluacion.fecha_formateada,
            idLlamada: evaluacion.id_llamada,
            totalENC: evaluacion.total_enc,
            totalECUF: evaluacion.total_ecuf,
            totalECN: evaluacion.total_ecn,
            notaFinal: evaluacion.nota_final,
            rango: evaluacion.rango,
            tiempoAuditoria: evaluacion.tiempo_auditoria,
            tiempoAuditoriaFormateado: evaluacion.tiempo_auditoria_formateado,
            vecesEditado: evaluacion.veces_editado || 0,
            detalles: detalles.map(d => ({
                bloque: d.bloque,
                atributo: d.atributo,
                submotivo: d.submotivo,
                peso: d.peso,
                cumple: d.cumple === true || d.cumple === 1 || d.cumple === 'true'
            }))
        };

        // ======================================================
        // 2g. CONFIRMAR EDICIÓN
        // ======================================================
        const confirmar = confirm(`✏️ EDITAR EVALUACIÓN\n\n` +
            `¿Desea editar la evaluación del Ticket PSI: ${evaluacion.ticket_psi}?\n\n` +
            `📅 Fecha original: ${evaluacion.fecha_formateada}\n` +
            `👤 Agente: ${evaluacion.agente}\n` +
            `🎯 Nota: ${evaluacion.nota_final}%\n` +
            `📝 Detalles: ${detalles.length} ítems evaluados\n\n` +
            `⚠️ ATENCIÓN: Al editar, los datos actuales serán reemplazados.`);

        if (!confirmar) {
            if (btnEditar) {
                btnEditar.innerHTML = '✏️ Editar';
                btnEditar.disabled = false;
            }
            return;
        }

        // ======================================================
        // 2h. CAMBIAR A PESTAÑA DE EVALUACIÓN
        // ======================================================
        showTab('evaluacion', null);

        // ======================================================
        // 2i. ACTIVAR MODO EDICIÓN
        // ======================================================
        modoEdicionActivo = true;
        idEvaluacionEditando = id;

        // ======================================================
        // 2j. CARGAR DATOS EN FORMULARIO
        // ======================================================
        cargarDatosEvaluacionEnFormulario(evaluacionFormateada);

        // ======================================================
        // 2k. CONFIGURAR UI PARA MODO EDICIÓN
        // ======================================================
        const btnAuditar = document.getElementById('btnAuditar');
        const btnFinalizar = document.getElementById('btnFinalizar');
        const btnCancelarGestion = document.getElementById('btnCancelarGestion');

        if (btnAuditar) btnAuditar.style.display = 'none';
        if (btnFinalizar) {
            btnFinalizar.style.display = 'inline-flex';
            btnFinalizar.innerHTML = '✏️ Actualizar Evaluación';
            btnFinalizar.style.background = 'var(--warning)';
        }
        if (btnCancelarGestion) btnCancelarGestion.style.display = 'none';

        // ======================================================
        // 2l. HABILITAR SELECTS
        // ======================================================
        const selects = document.querySelectorAll('.cumple-select');
        selects.forEach(select => {
            select.disabled = false;
            select.style.backgroundColor = '#fcfdfe';
        });

        // ======================================================
        // 2m. MOSTRAR MENSAJE DE MODO EDICIÓN
        // ======================================================
        const mensajeEdicion = document.createElement('div');
        mensajeEdicion.id = 'mensajeModoEdicion';
        mensajeEdicion.style.cssText = `
            background: linear-gradient(135deg, var(--warning), #e67e22);
            color: white;
            padding: 10px 20px;
            border-radius: 8px;
            margin: 10px 0;
            text-align: center;
            font-weight: bold;
            box-shadow: 0 2px 8px rgba(0,0,0,0.2);
        `;
        mensajeEdicion.innerHTML = `✏️ MODO EDICIÓN ACTIVADO - Editando Ticket PSI: ${evaluacion.ticket_psi}`;

        const titulo = document.querySelector('.card h3');
        if (titulo) {
            const msgAnterior = document.getElementById('mensajeModoEdicion');
            if (msgAnterior) msgAnterior.remove();
            titulo.insertAdjacentElement('afterend', mensajeEdicion);
        }

        // ======================================================
        // 2n. SCROLL AL FORMULARIO
        // ======================================================
        document.querySelector('.card')?.scrollIntoView({ behavior: 'smooth', block: 'start' });

        // ======================================================
        // 2o. RESTAURAR BOTÓN EDITAR
        // ======================================================
        if (btnEditar) {
            btnEditar.innerHTML = '✏️ Editar';
            btnEditar.disabled = false;
        }

        console.log('✅ Modo edición activado para evaluación ID:', id);

    } catch (error) {
        console.error('❌ Error al cargar evaluación para editar:', error);
        alert(`❌ Error al cargar la evaluación:\n\n${error.message}`);

        const btnEditar = event?.target;
        if (btnEditar) {
            btnEditar.innerHTML = '✏️ Editar';
            btnEditar.disabled = false;
        }
    }
}

// ======================================================
// 3. FUNCIÓN: cargarDatosEvaluacionEnFormulario()
// ======================================================
// 📌 PROPÓSITO: Cargar datos de evaluación en el formulario
// 📌 PARÁMETROS: evaluacion (Object) - Datos formateados
// 📌 ACCIONES:
//    1. Cargar campos básicos (Ticket, Agente, Fecha, ID Llamada)
//    2. Limpiar selects y resultados
//    3. Cargar detalles (seleccionar valores)
//    4. Recalcular resultados
// ======================================================

function cargarDatosEvaluacionEnFormulario(evaluacion) {
    console.log('📝 Cargando datos de evaluación para edición:', evaluacion);

    // ======================================================
    // 3a. CARGAR CAMPOS BÁSICOS
    // ======================================================
    const ticketPSIInput = document.getElementById('evalTicketPSI');
    const agenteInput = document.getElementById('evalAgenteInput');
    const agenteHidden = document.getElementById('evalAgente');
    const fechaInput = document.getElementById('evalFecha');
    const idLlamadaInput = document.getElementById('evalIdLlamada');

    // Ticket PSI
    if (ticketPSIInput) {
        ticketPSIInput.value = evaluacion.ticketPSI || '';
        ticketPSIInput.readOnly = true;
        ticketPSIInput.disabled = true;
        ticketPSIInput.style.backgroundColor = '#f0f0f0';
    }

    // Agente (input visible + hidden)
    if (agenteInput) {
        agenteInput.value = evaluacion.agente || '';
        agenteInput.disabled = true;
        agenteInput.style.backgroundColor = '#f0f0f0';
        agenteInput.readOnly = true;
    }
    if (agenteHidden) {
        agenteHidden.value = evaluacion.agente || '';
    }

    // ID Llamada
    if (idLlamadaInput) {
        idLlamadaInput.value = evaluacion.idLlamada || '';
        idLlamadaInput.readOnly = true;
        idLlamadaInput.disabled = true;
        idLlamadaInput.style.backgroundColor = '#f0f0f0';
    }

    // ======================================================
    // 3b. CARGAR FECHA (CORREGIDO)
    // ======================================================
    if (fechaInput && evaluacion.fecha) {
        console.log('📅 Fecha original desde BD:', evaluacion.fecha);
        console.log('📅 fechaFormateada desde BD:', evaluacion.fechaFormateada);

        let fechaParaInput = '';

        // Intentar desde fechaFormateada (DD/MM/YYYY HH:MM)
        if (evaluacion.fechaFormateada && evaluacion.fechaFormateada.includes('/')) {
            const partes = evaluacion.fechaFormateada.split(' ');
            const fechaParte = partes[0]; // DD/MM/YYYY
            const horaParte = partes[1] || '00:00'; // HH:MM

            const [dia, mes, anio] = fechaParte.split('/');
            if (dia && mes && anio) {
                fechaParaInput = `${anio}-${mes.padStart(2, '0')}-${dia.padStart(2, '0')}T${horaParte}`;
            }
        }
        // Intentar con fecha ISO
        else if (evaluacion.fecha && typeof evaluacion.fecha === 'string') {
            if (evaluacion.fecha.includes('T')) {
                fechaParaInput = evaluacion.fecha.substring(0, 16);
            } else if (evaluacion.fecha.includes('/')) {
                const partes = evaluacion.fecha.split(' ');
                const fechaParte = partes[0].split('/');
                const horaParte = partes[1] || '00:00';

                if (fechaParte.length === 3) {
                    const dia = fechaParte[0].padStart(2, '0');
                    const mes = fechaParte[1].padStart(2, '0');
                    const anio = fechaParte[2];
                    const horaMin = horaParte.substring(0, 5);
                    fechaParaInput = `${anio}-${mes}-${dia}T${horaMin}`;
                }
            }
        }

        // Fallback: crear Date
        if (!fechaParaInput) {
            try {
                const date = new Date(evaluacion.fecha);
                if (!isNaN(date.getTime())) {
                    const anio = date.getFullYear();
                    const mes = String(date.getMonth() + 1).padStart(2, '0');
                    const dia = String(date.getDate()).padStart(2, '0');
                    const horas = String(date.getHours()).padStart(2, '0');
                    const minutos = String(date.getMinutes()).padStart(2, '0');
                    fechaParaInput = `${anio}-${mes}-${dia}T${horas}:${minutos}`;
                }
            } catch (e) {
                console.error('Error parseando fecha:', e);
            }
        }

        console.log('📅 Fecha final para input:', fechaParaInput);

        if (fechaParaInput) {
            fechaInput.value = fechaParaInput;
            fechaInput.disabled = false;
            fechaInput.style.backgroundColor = '#fcfdfe';
        } else {
            fechaInput.value = formatDateForInput(new Date());
            console.warn('⚠️ No se pudo obtener la fecha guardada, usando fecha actual');
        }
    }

    // ======================================================
    // 3c. LIMPIAR SELECTS Y RESULTADOS
    // ======================================================
    const todosLosSelects = document.querySelectorAll('.cumple-select');
    todosLosSelects.forEach(select => {
        select.value = '';
        select.disabled = false;
        select.style.border = '';
        select.style.backgroundColor = '';
    });

    // Limpiar pesos
    const pesos = document.querySelectorAll('.peso-indicador');
    pesos.forEach(peso => {
        peso.textContent = '0%';
        peso.style.color = '';
    });

    // Limpiar resultados
    const resultados = [
        'resultadoProtocolos', 'resultadoEscuchaActiva', 'resultadoGestionEspera', 'resultadoLenguaje',
        'resultadoCorte', 'resultadoRespeto', 'resultadoInformacion',
        'resultadoSondeo', 'resultadoNegociacion', 'resultadoMotivoNoPago',
        'resultadoLugaresPago', 'resultadoCierre', 'resultadoImagen', 'resultadoTipificacion',
        'resultadoENC', 'resultadoECUF', 'resultadoECN',
        'resultadoFrenteCliente', 'resultadoFrenteNegocio', 'resultadoFrenteProceso'
    ];
    resultados.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            if (id.includes('resultado') && !id.includes('ENC') && !id.includes('ECUF') && !id.includes('ECN')) {
                el.textContent = '0/0%';
            } else {
                el.textContent = '0%';
            }
        }
    });

    // ======================================================
    // 3d. CARGAR DETALLES
    // ======================================================
    if (evaluacion.detalles && evaluacion.detalles.length > 0) {
        evaluacion.detalles.forEach(detalle => {
            const select = document.querySelector(
                `.cumple-select[data-bloque="${detalle.bloque}"][data-submotivo="${detalle.submotivo}"]`
            );

            if (select) {
                const valor = (detalle.cumple === true || detalle.cumple === 'true' || detalle.cumple === 1 || detalle.cumple === '1') ? '1' : '0';
                select.value = valor;

                const evento = new Event('change', { bubbles: true });
                select.dispatchEvent(evento);

                const pesoElement = document.getElementById(`peso-${detalle.submotivo}`);
                if (pesoElement) {
                    if (valor === '1') {
                        pesoElement.textContent = `${detalle.peso}%`;
                        pesoElement.style.color = 'var(--ok)';
                    } else {
                        pesoElement.textContent = '0%';
                        pesoElement.style.color = 'var(--danger)';
                    }
                }
            } else {
                console.warn('No se encontró select para:', detalle.bloque, detalle.submotivo);
            }
        });
    }

    // ======================================================
    // 3e. RECALCULAR RESULTADOS
    // ======================================================
    setTimeout(() => {
        recalcularTotalENC();
        actualizarResultadoECUF();
        actualizarResultadoECN();
        console.log('✅ Resultados recalculados');
    }, 100);

    console.log('✅ Datos cargados en el formulario correctamente');
}

// ======================================================
// BLOQUE 21: ACTUALIZAR EVALUACIÓN, VALIDACIÓN Y SALIR EDICIÓN
// ======================================================
// 
// 📌 PROPÓSITO: Actualizar evaluación existente, validar tickets duplicados
//    y gestionar la salida del modo edición
// 📌 ESTRUCTURA:
//    1. actualizarEvaluacionExistente() - Actualizar evaluación editada
//    2. validarTicketNoDuplicado() - Validar ticket duplicado
//    3. salirModoEdicion() - Salir del modo edición
// ======================================================

// ======================================================
// 1. FUNCIÓN: actualizarEvaluacionExistente()
// ======================================================
// 📌 PROPÓSITO: Actualizar una evaluación existente en la base de datos
// 📌 PRERREQUISITOS: modoEdicionActivo = true, idEvaluacionEditando ≠ null
// 📌 FLUJO:
//    1. Validar que hay una edición activa
//    2. Obtener evaluador (usuario actual o select)
//    3. Validar campos obligatorios
//    4. Validar selects completos
//    5. Calcular resultados
//    6. Actualizar en BD
//    7. Eliminar detalles viejos y guardar nuevos
//    8. Mostrar confirmación y salir del modo edición
// ======================================================

async function actualizarEvaluacionExistente() {
    // ======================================================
    // 1a. VALIDAR QUE HAY UNA EDICIÓN ACTIVA
    // ======================================================
    if (!modoEdicionActivo || !idEvaluacionEditando) {
        alert('⚠️ No hay una edición activa');
        return;
    }

    // ======================================================
    // 1b. OBTENER EVALUADOR
    // ======================================================
    let evaluador;
    if (usuarioActual && usuarioActual.rol === 'AUDITOR') {
        evaluador = usuarioActual.nombre_completo;
    } else {
        // Para admin/supervisor, usar el select
        const selectEvaluador = document.getElementById('evalEvaluador');
        evaluador = selectEvaluador?.value;
    }

    // ======================================================
    // 1c. VALIDAR CAMPOS OBLIGATORIOS
    // ======================================================
    const ticketPSI = document.getElementById('evalTicketPSI')?.value;
    const agenteInput = document.getElementById('evalAgenteInput');
    const agente = agenteInput?.value;
    const fechaRaw = document.getElementById('evalFecha')?.value;
    const idLlamada = document.getElementById('evalIdLlamada')?.value;

    if (!evaluador || !ticketPSI || !agente || !fechaRaw || !idLlamada) {
        alert('⚠️ Complete todos los campos obligatorios');
        return;
    }

    // ======================================================
    // 1d. VALIDAR SELECTS COMPLETOS
    // ======================================================
    const todosLosSelects = document.querySelectorAll('.cumple-select');
    const selectsVacios = [];

    todosLosSelects.forEach(select => {
        if (!select.disabled && (!select.value || select.value === '')) {
            selectsVacios.push(select);
            select.style.border = '2px solid var(--danger)';
            select.style.backgroundColor = '#fff0f0';
        }
    });

    if (selectsVacios.length > 0) {
        alert(`⚠️ Faltan ${selectsVacios.length} campos por evaluar. Complete todos los campos.`);
        selectsVacios[0].scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
    }

    // ======================================================
    // 1e. CALCULAR RESULTADOS
    // ======================================================
    const totalENC = recalcularTotalENC();
    const totalECUF = actualizarResultadoECUF();
    const totalECN = actualizarResultadoECN();
    const notaFinal = totalENC + totalECUF + totalECN;

    let rango = '';
    if (notaFinal >= 97) rango = 'Excelente';
    else if (notaFinal >= 90) rango = 'Bien';
    else if (notaFinal >= 85) rango = 'Regular';
    else rango = 'Bajo';

    // ======================================================
    // 1f. OBTENER DETALLES ACTUALIZADOS
    // ======================================================
    const detalles = [];
    todosLosSelects.forEach(select => {
        if (select.value) {
            detalles.push({
                bloque: select.dataset.bloque,
                atributo: select.dataset.atributo,
                submotivo: select.dataset.submotivo,
                peso: parseFloat(select.dataset.peso),
                cumple: select.value === '1'
            });
        }
    });

    // ======================================================
    // 1g. CREAR FECHA FORMATEADA
    // ======================================================
    const fechaObj = new Date(fechaRaw);
    const fechaFormateada = `${fechaObj.getDate().toString().padStart(2, '0')}/${(fechaObj.getMonth() + 1).toString().padStart(2, '0')}/${fechaObj.getFullYear()} ${fechaObj.getHours().toString().padStart(2, '0')}:${fechaObj.getMinutes().toString().padStart(2, '0')}`;

    // ======================================================
    // 1h. ACTUALIZAR EN BASE DE DATOS
    // ======================================================
    try {
        const client = getDB();

        if (!client || typeof client.from !== 'function') {
            throw new Error('Base de datos no disponible');
        }

        // Obtener la evaluación original para saber el contador de ediciones
        const { data: evaluacionOriginal } = await client
            .from('evaluaciones')
            .select('veces_editado')
            .eq('id', idEvaluacionEditando)
            .single();

        const nuevasEdiciones = (evaluacionOriginal?.veces_editado || 0) + 1;

        // ======================================================
        // ACTUALIZAR EVALUACIÓN
        // ======================================================
        const { error: updateError } = await client
            .from('evaluaciones')
            .update({
                total_enc: totalENC,
                total_ecuf: totalECUF,
                total_ecn: totalECN.toFixed(1),
                nota_final: notaFinal.toFixed(1),
                rango: rango,
                fecha: fechaRaw,
                fecha_formateada: fechaFormateada,
                fecha_modificacion: new Date().toLocaleString('es-ES'),
                veces_editado: nuevasEdiciones
            })
            .eq('id', idEvaluacionEditando);

        if (updateError) throw updateError;

        // ======================================================
        // ELIMINAR DETALLES VIEJOS
        // ======================================================
        await client
            .from('detalles_evaluacion')
            .delete()
            .eq('evaluacion_id', idEvaluacionEditando);

        // ======================================================
        // GUARDAR NUEVOS DETALLES
        // ======================================================
        const detallesParaInsertar = detalles.map(d => ({
            evaluacion_id: idEvaluacionEditando,
            bloque: d.bloque,
            atributo: d.atributo,
            submotivo: d.submotivo,
            peso: d.peso,
            cumple: d.cumple
        }));

        await client
            .from('detalles_evaluacion')
            .insert(detallesParaInsertar);

        // ======================================================
        // 1i. MOSTRAR CONFIRMACIÓN Y LIMPIAR
        // ======================================================
        alert(`✅ Evaluación actualizada correctamente\n\n🎯 Nueva nota: ${notaFinal.toFixed(1)}% (${rango})\n✏️ Veces editado: ${nuevasEdiciones}`);

        await actualizarContadorHeader();
        salirModoEdicion();
        cargarHistorialEvaluaciones();
        limpiarFormularioCompleto();

    } catch (error) {
        console.error('Error al actualizar:', error);
        alert(`❌ Error al actualizar: ${error.message}`);
    }
}

// ======================================================
// 2. FUNCIÓN: validarTicketNoDuplicado()
// ======================================================
// 📌 PROPÓSITO: Verificar si un ticket PSI ya tiene una evaluación registrada
// 📌 PARÁMETROS: ticketPSI (string) - Número de ticket
// 📌 RETORNO: true (duplicado) o false (no duplicado)
// 📌 USO: Antes de guardar una nueva evaluación
// ======================================================

async function validarTicketNoDuplicado(ticketPSI) {
    // ======================================================
    // 2a. VALIDAR CONEXIÓN A BD
    // ======================================================
    const db = getDB();
    if (!db) return false;

    try {
        // ======================================================
        // 2b. BUSCAR TICKET EN EVALUACIONES
        // ======================================================
        const { data, error } = await db
            .from('evaluaciones')
            .select('id, ticket_psi, agente, nota_final, fecha_formateada')
            .eq('ticket_psi', ticketPSI)
            .maybeSingle();

        if (error) {
            console.error('Error verificando duplicado:', error);
            return false;
        }

        // ======================================================
        // 2c. SI EXISTE, MOSTRAR ALERTA
        // ======================================================
        if (data) {
            let mensajeError = `❌ NO SE PUEDE GUARDAR LA EVALUACIÓN\n\n`;
            mensajeError += `═══════════════════════════════════════\n`;
            mensajeError += `⚠️ El Ticket PSI "${ticketPSI}" YA TIENE UNA EVALUACIÓN REGISTRADA\n\n`;
            mensajeError += `📋 DATOS DE LA EVALUACIÓN EXISTENTE:\n`;
            mensajeError += `   📅 Fecha: ${data.fecha_formateada || 'N/D'}\n`;
            mensajeError += `   👤 Agente: ${data.agente || 'N/D'}\n`;
            mensajeError += `   🎯 Nota Final: ${data.nota_final || 'N/D'}%\n\n`;
            mensajeError += `═══════════════════════════════════════\n`;
            mensajeError += `💡 Para reevaluar, primero elimine la evaluación anterior.`;

            alert(mensajeError);

            // ======================================================
            // 2d. RESALTAR CAMPO
            // ======================================================
            const ticketInput = document.getElementById('evalTicketPSI');
            if (ticketInput) {
                ticketInput.style.border = '2px solid var(--danger)';
                ticketInput.style.backgroundColor = '#fff0f0';
                ticketInput.focus();
            }

            return true; // Es duplicado
        }

        return false; // No es duplicado

    } catch (error) {
        console.error('Error en validación:', error);
        return false; // Si hay error, asumimos que no es duplicado para no bloquear
    }
}

// ======================================================
// 3. FUNCIÓN: salirModoEdicion()
// ======================================================
// 📌 PROPÓSITO: Desactivar el modo edición y restaurar la UI
// 📌 ACCIONES:
//    1. Resetear variables de modo edición
//    2. Restaurar botón Finalizar
//    3. Restaurar campos bloqueados
//    4. Eliminar mensaje de modo edición
//    5. Resetear auditoría si está activa
// ======================================================

function salirModoEdicion() {
    // ======================================================
    // 3a. RESETEAR VARIABLES
    // ======================================================
    modoEdicionActivo = false;
    idEvaluacionEditando = null;

    // ======================================================
    // 3b. RESTAURAR BOTÓN FINALIZAR
    // ======================================================
    const btnFinalizar = document.getElementById('btnFinalizar');
    if (btnFinalizar) {
        btnFinalizar.innerHTML = '⏱️ Finalizar y Guardar';
        btnFinalizar.style.background = '';
    }

    // ======================================================
    // 3c. RESTAURAR CAMPOS BLOQUEADOS
    // ======================================================
    const ticketPSIInput = document.getElementById('evalTicketPSI');
    if (ticketPSIInput) {
        ticketPSIInput.readOnly = false;
        ticketPSIInput.style.backgroundColor = '';
        ticketPSIInput.title = '';
    }

    const camposBloqueados = [
        'evalEvaluador',
        'evalAgenteInput',
        'evalAgente',
        'evalIdLlamada'
    ];
    camposBloqueados.forEach(campoId => {
        const campo = document.getElementById(campoId);
        if (campo) {
            campo.disabled = false;
            campo.style.backgroundColor = '';
            campo.title = '';
        }
    });

    // ======================================================
    // 3d. ELIMINAR MENSAJE DE MODO EDICIÓN
    // ======================================================
    const msgEdicion = document.getElementById('mensajeModoEdicion');
    if (msgEdicion) msgEdicion.remove();

    // ======================================================
    // 3e. RESETEAR AUDITORÍA SI ESTÁ ACTIVA
    // ======================================================
    if (auditando) {
        resetearAuditoria();
    }

    console.log('✅ Modo edición desactivado');
}

// ======================================================
// BLOQUE 22: TEMPORIZADOR EDICIÓN, FILTROS DE ESCUCHAS E INCIDENCIAS
// ======================================================
// 
// 📌 PROPÓSITO: Mostrar temporizador en modo edición, filtrar escuchas
//    y gestionar incidencias de audio
// 📌 ESTRUCTURA:
//    1. mostrarTemporizadorEdicion() - Mostrar temporizador en modo edición
//    2. filtrarMisEscuchas() - Filtrar escuchas con debounce
//    3. aplicarFiltrosEscuchas() - Aplicar filtros de búsqueda y fecha
//    4. limpiarFiltrosEscuchas() - Limpiar filtros de escuchas
//    5. cargarIncidencias() - Cargar incidencias de audio
// ======================================================

// ======================================================
// 1. FUNCIÓN: mostrarTemporizadorEdicion()
// ======================================================
// 📌 PROPÓSITO: Mostrar un temporizador específico para modo edición
// 📌 DIFERENCIA: Color naranja (warning) en lugar de azul (accent)
// 📌 TEXTO: "✏️ MODO EDICIÓN - Modificando evaluación existente"
// ======================================================

function mostrarTemporizadorEdicion() {
    // ======================================================
    // 1a. ELIMINAR TEMPORIZADOR EXISTENTE
    // ======================================================
    let timerElement = document.getElementById('temporizadorAuditoria');

    if (timerElement) {
        timerElement.remove();
    }

    // ======================================================
    // 1b. CREAR TEMPORIZADOR DE EDICIÓN
    // ======================================================
    timerElement = document.createElement('div');
    timerElement.id = 'temporizadorAuditoria';
    timerElement.style.cssText = `
        background: linear-gradient(135deg, var(--warning), #e67e22);
        color: white;
        padding: 12px 20px;
        border-radius: 12px;
        font-weight: bold;
        font-size: 18px;
        text-align: center;
        margin: 15px 0;
        box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    `;
    timerElement.innerHTML = `✏️ MODO EDICIÓN - Modificando evaluación existente`;

    // ======================================================
    // 1c. INSERTAR EN EL DOM
    // ======================================================
    const titulo = document.querySelector('.card h3');
    if (titulo) {
        titulo.insertAdjacentElement('afterend', timerElement);
    }
}

// ======================================================
// 2. FUNCIONES DE FILTRO PARA MIS ESCUCHAS
// ======================================================

// ----------------------------------------------------------------------
// 2a. FUNCIÓN: filtrarMisEscuchas()
// ----------------------------------------------------------------------
// 📌 PROPÓSITO: Filtrar escuchas por búsqueda y fecha
// 📌 EJECUCIÓN: Llamada desde el input de búsqueda o filtro de fecha
// 📌 COMPORTAMIENTO: Aplica filtros inmediatamente (sin timeout)
// ======================================================

function filtrarMisEscuchas() {
    console.log('🔍 filtrarMisEscuchas llamado');
    
    // Obtener valores de los filtros
    const busqueda = document.getElementById('buscarEscucha')?.value.toLowerCase() || '';
    const fechaFiltro = document.getElementById('filtroFechaEscucha')?.value || '';

    console.log('📝 Búsqueda:', busqueda, 'Fecha:', fechaFiltro);

    // Aplicar filtros inmediatamente (sin timeout para mejor respuesta)
    aplicarFiltrosEscuchas(busqueda, fechaFiltro);
}

// ----------------------------------------------------------------------
// 2b. FUNCIÓN: aplicarFiltrosEscuchas()
// ----------------------------------------------------------------------
// 📌 PROPÓSITO: Aplicar filtros de búsqueda y fecha a las escuchas
// 📌 PARÁMETROS: 
//    - busqueda (string) - Texto a buscar
//    - fechaFiltro (string) - Fecha en formato YYYY-MM-DD
// 📌 CAMPOS BUSCADOS: ticket, gestor_auditado, supervisor_responsable, motivos
// ======================================================

function aplicarFiltrosEscuchas(busqueda, fechaFiltro) {
    console.log('🔄 Aplicando filtros...');

    // ======================================================
    // 2b.1. OBTENER ESCUCHAS BASE (según estado actual)
    // ======================================================
    const estadoActual = filtroActual;
    let escuchasBase = misEscuchasData.filter(e => e.estado === estadoActual);

    console.log('📊 Escuchas base:', escuchasBase.length);

    // ======================================================
    // 2b.2. APLICAR FILTRO DE BÚSQUEDA
    // ======================================================
    let resultados = [...escuchasBase];
    let filtrosAplicados = [];

    if (busqueda && busqueda !== '') {
        resultados = resultados.filter(escucha =>
            (escucha.ticket && escucha.ticket.toLowerCase().includes(busqueda)) ||
            (escucha.gestor_auditado && escucha.gestor_auditado.toLowerCase().includes(busqueda)) ||
            (escucha.supervisor_responsable && escucha.supervisor_responsable.toLowerCase().includes(busqueda)) ||
            (escucha.motivos && escucha.motivos.toLowerCase().includes(busqueda))
        );
        filtrosAplicados.push(`🔍 "${busqueda}"`);
        console.log('📊 Después de búsqueda:', resultados.length);
    }

    // ======================================================
    // 2b.3. APLICAR FILTRO DE FECHA
    // ======================================================
    if (fechaFiltro && fechaFiltro !== '') {
        resultados = resultados.filter(escucha => {
            if (!escucha.fecha_asignacion) return false;
            const fechaEscucha = escucha.fecha_asignacion.split('T')[0];
            return fechaEscucha === fechaFiltro;
        });
        filtrosAplicados.push(`📅 ${fechaFiltro.split('-').reverse().join('/')}`);
        console.log('📊 Después de fecha:', resultados.length);
    }

    // ======================================================
    // 2b.4. GUARDAR Y ACTUALIZAR UI
    // ======================================================
    misEscuchasFiltradas = resultados;

    // Actualizar la tabla
    actualizarTablaMisEscuchas(resultados);

    // Actualizar información de resultados
    const infoDiv = document.getElementById('infoResultadosEscuchas');
    if (infoDiv) {
        if (filtrosAplicados.length > 0) {
            infoDiv.innerHTML = `✅ Mostrando ${resultados.length} de ${escuchasBase.length} escuchas (Filtros: ${filtrosAplicados.join(', ')})`;
            infoDiv.style.color = 'var(--accent)';
        } else {
            infoDiv.innerHTML = `📊 Mostrando ${resultados.length} escuchas`;
            infoDiv.style.color = 'var(--muted)';
        }
    }
}

// ----------------------------------------------------------------------
// 2c. FUNCIÓN: limpiarFiltrosEscuchas()
// ----------------------------------------------------------------------
// 📌 PROPÓSITO: Limpiar todos los filtros de escuchas
// 📌 ACCIONES:
//    1. Limpiar inputs de búsqueda y fecha
//    2. Resetear misEscuchasFiltradas
//    3. Mostrar todas las escuchas del estado actual
// ======================================================

function limpiarFiltrosEscuchas() {
    // ======================================================
    // 2c.1. LIMPIAR INPUTS
    // ======================================================
    const busquedaInput = document.getElementById('buscarEscucha');
    const fechaInput = document.getElementById('filtroFechaEscucha');

    if (busquedaInput) busquedaInput.value = '';
    if (fechaInput) fechaInput.value = '';

    // ======================================================
    // 2c.2. RESETEAR VARIABLES
    // ======================================================
    misEscuchasFiltradas = [];

    // ======================================================
    // 2c.3. MOSTRAR TODAS LAS ESCUCHAS DEL ESTADO ACTUAL
    // ======================================================
    const estadoActual = filtroActual;
    const escuchasBase = misEscuchasData.filter(e => e.estado === estadoActual);

    actualizarTablaMisEscuchas(escuchasBase);

    // ======================================================
    // 2c.4. ACTUALIZAR INFORMACIÓN
    // ======================================================
    const infoDiv = document.getElementById('infoResultadosEscuchas');
    if (infoDiv) {
        infoDiv.innerHTML = `📊 Mostrando ${escuchasBase.length} escuchas (sin filtros)`;
        infoDiv.style.color = 'var(--muted)';
    }

    console.log('🧹 Filtros de escuchas limpiados');
}

// ======================================================
// 3. FUNCIONES PARA INCIDENCIAS DE AUDIO
// ======================================================

// ----------------------------------------------------------------------
// 3a. FUNCIÓN: cargarIncidencias()
// ----------------------------------------------------------------------
// 📌 PROPÓSITO: Cargar todas las incidencias de audio del auditor
// 📌 FUENTE: Tabla 'asignaciones_escucha' con motivo_incidencia NOT NULL
// 📌 ACTUALIZA: incidenciasData, contador de incidencias
// ======================================================

async function cargarIncidencias() {
    console.log('⚠️ Cargando incidencias de audio...');

    // ======================================================
    // 3a.1. VALIDAR CONEXIÓN A BD
    // ======================================================
    const db = getDB();
    if (!db) {
        console.error('❌ Base de datos no disponible');
        return;
    }

    try {
        // ======================================================
        // 3a.2. OBTENER INCIDENCIAS DEL AUDITOR
        // ======================================================
        const auditorUsuario = usuarioActual.usuario;
        const { data, error } = await db
            .from('asignaciones_escucha')
            .select('*')
            .eq('auditor_asignado', auditorUsuario)
            .not('motivo_incidencia', 'is', null)  // Solo registros con incidencia
            .order('fecha_incidencia', { ascending: false });  // Más recientes primero

        if (error) throw error;

        // ======================================================
        // 3a.3. GUARDAR Y ACTUALIZAR UI
        // ======================================================
        incidenciasData = data || [];
        actualizarContadorIncidencias();
        filtrarIncidenciasPorTipo(incidenciasFiltroTipo);

        console.log(`✅ ${incidenciasData.length} incidencias cargadas (activas + históricas)`);

    } catch (error) {
        console.error('❌ Error cargando incidencias:', error);
        const tbody = document.getElementById('tablaIncidencias');
        if (tbody) {
            tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; color: var(--danger);">❌ Error: ${error.message}</td></tr>`;
        }
    }
}

// ======================================================
// BLOQUE 23: INCIDENCIAS - TABLA, CONTADOR, MODAL Y RESOLUCIÓN
// ======================================================
// 
// 📌 PROPÓSITO: Gestionar incidencias de audio (reportar, listar, resolver)
// 📌 ESTRUCTURA:
//    1. actualizarTablaIncidencias() - Renderizar tabla de incidencias
//    2. actualizarContadorIncidencias() - Actualizar badge de incidencias
//    3. abrirModalIncidencia() - Abrir modal para reportar incidencia
//    4. cerrarModalIncidencia() - Cerrar modal de incidencia
//    5. confirmarReporteIncidencia() - Confirmar y guardar incidencia
//    6. marcarAudioComoResuelto() - Marcar incidencia como resuelta
// ======================================================

// ======================================================
// 1. FUNCIÓN: actualizarTablaIncidencias()
// ======================================================
// 📌 PROPÓSITO: Renderizar la tabla de incidencias de audio
// 📌 PARÁMETROS: incidencias (Array) - Lista de incidencias
// 📌 COLUMNAS: Ticket, Gestor, Supervisor, Motivo, Auditor, Fecha, Estado
// 📌 ESTADOS: ⚠️ Pendiente (rojo) / ✅ Resuelto (verde)
// ======================================================

function actualizarTablaIncidencias(incidencias) {
    const tbody = document.getElementById('tablaIncidencias');
    if (!tbody) return;

    // ======================================================
    // 1a. MANEJAR CASO SIN INCIDENCIAS
    // ======================================================
    if (!incidencias || incidencias.length === 0) {
        tbody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 40px;">
            ${incidenciasFiltroTipo === 'activas' 
                ? '✅ No hay incidencias activas. Todos los audios están disponibles.' 
                : '📋 No hay incidencias resueltas en el historial.'}
        </td></tr>`;
        return;
    }

    // ======================================================
    // 1b. GENERAR FILAS
    // ======================================================
    let html = '';
    for (const incidencia of incidencias) {
        // Formatear fecha de reporte
        const fechaReporte = incidencia.fecha_incidencia
            ? new Date(incidencia.fecha_incidencia).toLocaleString('es-ES')
            : 'Fecha no registrada';

        // Determinar estado y color
        let estadoTexto = '';
        let estadoColor = '';

        if (incidencia.audio_disponible === false) {
            estadoTexto = '⚠️ Pendiente';
            estadoColor = 'var(--danger)';
        } else {
            estadoTexto = '✅ Resuelto';
            estadoColor = 'var(--ok)';
        }

        // Fila con fondo según estado
        const rowStyle = incidencia.audio_disponible === true 
            ? 'background: #f0fff0;'   // Verde claro para resueltos
            : 'background: #fff5f5;';   // Rojo claro para pendientes

        html += `
            <tr style="${rowStyle}">
                <td style="padding: 12px;"><strong>${escapeHtml(incidencia.ticket)}</strong></td>
                <td style="padding: 12px;">${escapeHtml(incidencia.gestor_auditado || '-')}</td>
                <td style="padding: 12px;">${escapeHtml(incidencia.supervisor_responsable || '-')}</td>
                <td style="padding: 12px;">
                    <span style="background: #fee; color: var(--danger); padding: 4px 8px; border-radius: 12px; font-size: 12px;">
                        ⚠️ ${escapeHtml(incidencia.motivo_incidencia || 'Motivo no especificado')}
                    </span>
                </td>
                <td style="padding: 12px;">${escapeHtml(incidencia.auditor_asignado || '-')}</td>
                <td style="padding: 12px;">${fechaReporte}</td>
                <td style="padding: 12px;">
                    <span style="background: ${estadoColor}; color: white; padding: 4px 8px; border-radius: 12px; font-size: 11px;">
                        ${estadoTexto}
                    </span>
                    ${incidencia.audio_disponible === false ? `
                        <button onclick="marcarAudioComoResuelto(${incidencia.id})" 
                                style="display: block; margin-top: 5px; padding: 4px 8px; background: var(--ok); color: white; border: none; border-radius: 6px; cursor: pointer; font-size: 10px;">
                            ✅ Resolver
                        </button>
                    ` : ''}
                </td>
            </tr>
        `;
    }

    // ======================================================
    // 1c. ACTUALIZAR TABLA Y CONTADOR
    // ======================================================
    tbody.innerHTML = html;
    document.getElementById('totalIncidenciasCount').textContent = incidencias.length;
}

// ======================================================
// 2. FUNCIÓN: actualizarContadorIncidencias()
// ======================================================
// 📌 PROPÓSITO: Actualizar el badge del tab "Incidencias"
// 📌 CONTEO: Solo incidencias activas (audio_disponible = false)
// 📌 COMPORTAMIENTO: Oculta el badge si no hay incidencias activas
// ======================================================

function actualizarContadorIncidencias() {
    // Contar incidencias activas (no resueltas)
    const activasCount = incidenciasData.filter(inc => inc.audio_disponible === false).length;
    const span = document.getElementById('incidenciasCount');
    
    if (span) {
        if (activasCount > 0) {
            span.textContent = activasCount;
            span.style.display = 'inline-block';
        } else {
            span.style.display = 'none';
        }
    }
}

// ======================================================
// 3. FUNCIÓN: abrirModalIncidencia()
// ======================================================
// 📌 PROPÓSITO: Abrir modal para reportar incidencia de audio
// 📌 PARÁMETROS: idEscucha (number) - ID de la escucha
// 📌 ACCIONES:
//    1. Buscar escucha en misEscuchasData
//    2. Mostrar ticket y gestor en el modal
//    3. Limpiar campo de motivo
// ======================================================

async function abrirModalIncidencia(idEscucha) {
    console.log('🔍 Abriendo modal para escucha ID:', idEscucha);
    
    // ======================================================
    // 3a. BUSCAR ESCUCHA
    // ======================================================
    const idNumber = Number(idEscucha);
    const escucha = misEscuchasData.find(e => Number(e.id) === idNumber);

    if (!escucha) {
        console.error('❌ Escucha no encontrada:', idEscucha);
        console.log('   IDs disponibles:', misEscuchasData.map(e => e.id));
        alert('Error: No se encontraron datos de la escucha');
        return;
    }

    console.log('✅ Escucha encontrada:', escucha.ticket);
    
    // ======================================================
    // 3b. GUARDAR ESCUCHA SELECCIONADA
    // ======================================================
    escuchaSeleccionadaParaIncidencia = escucha;

    // ======================================================
    // 3c. CARGAR DATOS EN MODAL
    // ======================================================
    document.getElementById('modalTicketPSI').textContent = escucha.ticket;
    document.getElementById('modalGestor').textContent = escucha.gestor_auditado || '-';
    document.getElementById('motivoIncidencia').value = '';

    // ======================================================
    // 3d. MOSTRAR MODAL
    // ======================================================
    document.getElementById('modalIncidencia').style.display = 'flex';
}

// ======================================================
// 4. FUNCIÓN: cerrarModalIncidencia()
// ======================================================
// 📌 PROPÓSITO: Cerrar el modal de reporte de incidencia
// 📌 ACCIONES: Ocultar modal y limpiar escucha seleccionada
// ======================================================

function cerrarModalIncidencia() {
    document.getElementById('modalIncidencia').style.display = 'none';
    escuchaSeleccionadaParaIncidencia = null;
}

// ======================================================
// 5. FUNCIÓN: confirmarReporteIncidencia()
// ======================================================
// 📌 PROPÓSITO: Confirmar y guardar el reporte de incidencia
// 📌 FLUJO:
//    1. Validar que se seleccionó un motivo
//    2. Validar que hay una escucha seleccionada
//    3. Llamar a API.reportarIncidencia()
//    4. Recargar listas de escuchas e incidencias
// ======================================================

async function confirmarReporteIncidencia() {
    // ======================================================
    // 5a. VALIDAR MOTIVO
    // ======================================================
    const motivo = document.getElementById('motivoIncidencia').value;

    if (!motivo) {
        alert('⚠️ Por favor, seleccione un motivo para la incidencia.');
        return;
    }

    // ======================================================
    // 5b. VALIDAR ESCUCHA SELECCIONADA
    // ======================================================
    if (!escuchaSeleccionadaParaIncidencia) {
        alert('❌ Error: No hay escucha seleccionada.');
        cerrarModalIncidencia();
        return;
    }

    // ======================================================
    // 5c. REPORTAR INCIDENCIA
    // ======================================================
    try {
        await API.reportarIncidencia(escuchaSeleccionadaParaIncidencia.id, motivo);

        alert(`✅ Incidencia reportada correctamente.\n\nTicket: ${escuchaSeleccionadaParaIncidencia.ticket}\nMotivo: ${motivo}`);

        // ======================================================
        // 5d. LIMPIAR Y RECARGAR
        // ======================================================
        cerrarModalIncidencia();

        await cargarMisEscuchas();
        await cargarIncidencias();

    } catch (error) {
        console.error('❌ Error al reportar incidencia:', error);
        alert(`❌ Error al reportar: ${error.message}`);
    }
}

// ======================================================
// 6. FUNCIÓN: marcarAudioComoResuelto()
// ======================================================
// 📌 PROPÓSITO: Marcar una incidencia como resuelta (audio disponible)
// 📌 PARÁMETROS: idEscucha (number) - ID de la escucha
// 📌 ACCIONES:
//    1. Confirmar acción
//    2. Actualizar BD (audio_disponible = true, motivo_incidencia = null)
//    3. Recargar listas de escuchas e incidencias
// ======================================================

async function marcarAudioComoResuelto(idEscucha) {
    // ======================================================
    // 6a. CONFIRMAR
    // ======================================================
    const confirmar = confirm(
        '✅ ¿Confirmar que el audio ya está disponible y la incidencia está resuelta?\n\n' +
        'La escucha volverá a la lista de "Mis Escuchas" como pendiente.'
    );

    if (!confirmar) return;

    // ======================================================
    // 6b. VALIDAR CONEXIÓN A BD
    // ======================================================
    const db = getDB();
    if (!db) {
        alert('❌ Base de datos no disponible');
        return;
    }

    // ======================================================
    // 6c. ACTUALIZAR EN BD
    // ======================================================
    try {
        const { error } = await db
            .from('asignaciones_escucha')
            .update({
                audio_disponible: true,
                motivo_incidencia: null,
                fecha_incidencia: null
            })
            .eq('id', idEscucha);

        if (error) throw error;

        alert('✅ Incidencia resuelta. El audio ahora está disponible para auditoría.');

        // ======================================================
        // 6d. RECARGAR LISTAS
        // ======================================================
        await cargarMisEscuchas();
        await cargarIncidencias();

    } catch (error) {
        console.error('❌ Error al resolver incidencia:', error);
        alert(`❌ Error: ${error.message}`);
    }
}

// ======================================================
// BLOQUE 24: FILTROS DE INCIDENCIAS Y GENERADOR DINÁMICO DE FORMULARIO
// ======================================================
// 
// 📌 PROPÓSITO: Filtrar incidencias por tipo (activas/resueltas) y
//    generar dinámicamente el formulario de evaluación desde la BD
// 📌 ESTRUCTURA:
//    1. filtrarIncidenciasPorTipo() - Filtrar incidencias por estado
//    2. filtrarIncidencias() - Buscar en incidencias
//    3. cargarEstructuraEvaluacion() - Cargar estructura desde BD/caché
//    4. generarFormularioDinamico() - Generar formulario desde estructura
//    5. conectarEventosSelects() - Conectar eventos a selects
//    6. toggleFrenteDinamico() - Expandir/contraer frente dinámico
//    7. recalcularTotalAtributo() - Recalcular total de atributo
// ======================================================

// ======================================================
// 1. FUNCIÓN: filtrarIncidenciasPorTipo()
// ======================================================
// 📌 PROPÓSITO: Filtrar incidencias por tipo (activas o resueltas)
// 📌 PARÁMETROS: tipo (string) - 'activas' o 'resueltas'
// 📌 ACCIONES:
//    1. Actualizar estilos de tabs
//    2. Filtrar incidencias por audio_disponible
//    3. Actualizar tabla y contadores
// ======================================================

function filtrarIncidenciasPorTipo(tipo) {
    // ======================================================
    // 1a. ACTUALIZAR FILTRO ACTUAL
    // ======================================================
    incidenciasFiltroTipo = tipo;

    // ======================================================
    // 1b. ACTUALIZAR ESTILOS DE TABS
    // ======================================================
    document.querySelectorAll('.tab-incidencia-btn').forEach(btn => {
        btn.classList.remove('active');
        btn.style.borderBottom = 'none';
        btn.style.color = 'var(--muted)';
    });

    const btnActivo = document.querySelector(`.tab-incidencia-btn[data-tipo="${tipo}"]`);
    if (btnActivo) {
        btnActivo.classList.add('active');
        if (tipo === 'activas') {
            btnActivo.style.borderBottom = '3px solid var(--danger)';
            btnActivo.style.color = 'var(--danger)';
        } else {
            btnActivo.style.borderBottom = '3px solid var(--ok)';
            btnActivo.style.color = 'var(--ok)';
        }
    }

    // ======================================================
    // 1c. FILTRAR INCIDENCIAS
    // ======================================================
    let filtradas = [];
    if (tipo === 'activas') {
        // Activas: audio_disponible = false
        filtradas = incidenciasData.filter(inc => inc.audio_disponible === false);
    } else {
        // Resueltas: audio_disponible = true
        filtradas = incidenciasData.filter(inc => inc.audio_disponible === true);
    }

    // ======================================================
    // 1d. ACTUALIZAR UI
    // ======================================================
    actualizarTablaIncidencias(filtradas);

    // Actualizar contadores de los tabs
    const activasCount = incidenciasData.filter(inc => inc.audio_disponible === false).length;
    const resueltasCount = incidenciasData.filter(inc => inc.audio_disponible === true).length;

    const spanActivas = document.getElementById('incidenciasActivasCount');
    if (spanActivas) spanActivas.textContent = activasCount;

    const spanResueltas = document.getElementById('incidenciasResueltasCount');
    if (spanResueltas) spanResueltas.textContent = resueltasCount;

    // Actualizar contador del tab principal
    actualizarContadorIncidencias();
}

// ======================================================
// 2. FUNCIÓN: filtrarIncidencias()
// ======================================================
// 📌 PROPÓSITO: Filtrar incidencias por búsqueda de texto
// 📌 PARÁMETROS: Ninguno (usa el valor del input)
// 📌 CAMPOS BUSCADOS: ticket, gestor_auditado, motivo_incidencia
// ======================================================

function filtrarIncidencias() {
    // Obtener texto de búsqueda
    const busqueda = document.getElementById('buscarIncidencia').value.toLowerCase();

    // Obtener incidencias base según el tipo de filtro actual
    let incidenciasBase = [];
    if (incidenciasFiltroTipo === 'activas') {
        incidenciasBase = incidenciasData.filter(inc => inc.audio_disponible === false);
    } else {
        incidenciasBase = incidenciasData.filter(inc => inc.audio_disponible === true);
    }

    // Si no hay búsqueda, mostrar todas las del tipo actual
    if (!busqueda) {
        actualizarTablaIncidencias(incidenciasBase);
        return;
    }

    // Filtrar por búsqueda
    const filtradas = incidenciasBase.filter(inc =>
        (inc.ticket && inc.ticket.toLowerCase().includes(busqueda)) ||
        (inc.gestor_auditado && inc.gestor_auditado.toLowerCase().includes(busqueda)) ||
        (inc.motivo_incidencia && inc.motivo_incidencia.toLowerCase().includes(busqueda))
    );

    actualizarTablaIncidencias(filtradas);
}

// ======================================================
// 3. FUNCIÓN: cargarEstructuraEvaluacion()
// ======================================================
// 📌 PROPÓSITO: Cargar estructura de evaluación desde BD o caché
// 📌 FUENTE: API.getEstructuraEvaluacion() o localStorage
// 📌 CACHÉ: 5 minutos (300000 ms)
// 📌 RETORNO: Estructura de evaluación (frentes, atributos, submotivos)
// ======================================================

let estructuraEvaluacionCache = null;  // Cache en memoria

async function cargarEstructuraEvaluacion() {
    try {
        console.log('📋 Cargando estructura de evaluación con versionado...');
        
        // 1. Obtener la fecha actual
        const hoy = new Date();
        const fechaISO = hoy.toISOString().split('T')[0]; // '2026-06-24'
        
        // 2. Obtener la versión activa para esta fecha
        const version = await API.getVersionPorFecha(fechaISO);
        
        if (!version) {
            console.warn('⚠️ No hay versión para la fecha actual, usando versión activa por defecto');
            const versionActiva = await API.getVersionActiva();
            if (!versionActiva) {
                throw new Error('No hay versión activa configurada en el sistema');
            }
            window.versionMatrizActualId = versionActiva.id;
            const estructura = await API.getEstructuraVersion(versionActiva.id);
            guardarEstructuraEnCache(versionActiva.id, estructura);
            return estructura;
        }
        
        // 3. Guardar el ID de la versión para usarlo al guardar la evaluación
        window.versionMatrizActualId = version.id;
        
        // 4. Intentar cargar desde caché local
        const cacheKey = `estructura_evaluacion_v${version.id}`;
        const cacheTimeKey = `estructura_evaluacion_v${version.id}_time`;
        const cached = localStorage.getItem(cacheKey);
        const cachedTime = localStorage.getItem(cacheTimeKey);
        
        // Caché válido por 1 hora (3600000 ms)
        if (cached && cachedTime && (Date.now() - parseInt(cachedTime)) < 3600000) {
            console.log(`📦 Estructura cargada desde caché local (versión ${version.version})`);
            return JSON.parse(cached);
        }
        
        // 5. Obtener la estructura completa de la versión desde el servidor
        console.log(`📡 Descargando estructura de versión ${version.version} (ID: ${version.id})`);
        const estructura = await API.getEstructuraVersion(version.id);
        
        // 6. Guardar en caché
        guardarEstructuraEnCache(version.id, estructura);
        
        console.log(`✅ Estructura cargada de versión: ${version.version} (ID: ${version.id})`);
        console.log(`   Frentes: ${estructura.frentes?.length || 0}`);
        return estructura;
        
    } catch (error) {
        console.error('❌ Error cargando estructura:', error);
        // Fallback: intentar cargar estructura de la versión activa
        try {
            const versionActiva = await API.getVersionActiva();
            if (versionActiva) {
                const estructura = await API.getEstructuraVersion(versionActiva.id);
                guardarEstructuraEnCache(versionActiva.id, estructura);
                return estructura;
            }
        } catch (fallbackError) {
            console.error('❌ Fallback también falló:', fallbackError);
        }
        return null;
    }
}

// Función auxiliar para guardar en caché
function guardarEstructuraEnCache(versionId, estructura) {
    localStorage.setItem(`estructura_evaluacion_v${versionId}`, JSON.stringify(estructura));
    localStorage.setItem(`estructura_evaluacion_v${versionId}_time`, Date.now().toString());
}

// ======================================================
// 4. FUNCIÓN: generarFormularioDinamico()
// ======================================================
// 📌 PROPÓSITO: Generar el formulario de evaluación dinámicamente
// 📌 FUENTE: Estructura cargada desde BD
// 📌 ESTRUCTURA: Frentes → Atributos → Submotivos
// 📌 CADA ELEMENTO: Select con opciones (Cumple/No Cumple/No Aplica)
// ======================================================

async function generarFormularioDinamico() {
    const container = document.getElementById('evaluacion-dinamica-container');
    if (!container) return false;
    
    try {
        // ======================================================
        // 4a. CARGAR ESTRUCTURA
        // ======================================================
        const estructura = await cargarEstructuraEvaluacion();
        if (!estructura || !estructura.frentes || estructura.frentes.length === 0) {
            container.innerHTML = '<div style="color: orange; padding: 20px;">⚠️ No hay estructura de evaluación disponible</div>';
            return false;
        }
        
        let html = '';
        
        // ======================================================
        // 4b. GENERAR FRENTES
        // ======================================================
        for (const frente of estructura.frentes) {
            // Determinar clase CSS según código
            const frenteClass = frente.codigo === 'ENC' ? 'cliente' : 
                               (frente.codigo === 'ECUF' ? 'negocio' : 'proceso');
            
            // Leer estado colapsado desde localStorage
            const collapsed = localStorage.getItem(`frente_${frente.codigo}_collapsed`) === 'true';
            
            // Icono según código
            const icono = frente.codigo === 'ENC' ? '👥' : 
                         (frente.codigo === 'ECUF' ? '💰' : '⚙️');
            
            html += `
            <div class="frente-container" data-frente="${frente.codigo}">
                <div class="frente-header ${frenteClass}" onclick="toggleFrente('${frente.codigo}')">
                    <div class="frente-titulo">
                        <span class="frente-icono">${icono}</span>
                        <span>${frente.nombre}</span>
                        <span class="frente-badge">${frente.peso_maximo}%</span>
                    </div>
                    <div class="frente-resultado">
                        <span class="frente-porcentaje" id="resultadoFrente_${frente.codigo}">0%</span>
                        <span class="frente-expand-icon" id="icono_${frente.codigo}">${collapsed ? '▶' : '▼'}</span>
                    </div>
                </div>
                <div id="frente_${frente.codigo}" class="frente-contenido ${collapsed ? 'collapsed' : ''}">
                    <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px;">
            `;
            
            // ======================================================
            // 4c. GENERAR ATRIBUTOS
            // ======================================================
            for (const atributo of frente.atributos) {
                // ID único para el atributo (sin acentos, espacios ni caracteres especiales)
                const atributoId = atributo.nombre.toLowerCase().replace(/[áéíóúñ\s\/]+/g, '_');
                
                html += `
                    <div class="atributo-card" data-atributo="${atributo.nombre}">
                        <div style="display: flex; justify-content: space-between; margin-bottom: 10px; background: #f0f7ff; padding: 8px 12px; border-radius: 8px;">
                            <strong>${atributo.nombre}</strong>
                            <span id="resultado_${atributoId}">0/${atributo.peso_maximo}%</span>
                        </div>
                        <div>
                `;
                
                // ======================================================
                // 4d. GENERAR SUBMOTIVOS (con sus selects)
                // ======================================================
                for (const sub of atributo.sub_motivos) {
                    html += `
                        <div class="eval-row" data-submotivo="${sub.codigo}">
                            <span>${sub.descripcion} (${sub.peso_individual}%)</span>
                            <select class="cumple-select" 
                                    data-bloque="${frente.codigo}"
                                    data-atributo="${atributo.nombre}"
                                    data-submotivo="${sub.codigo}"
                                    data-peso="${sub.peso_individual}"
                                    disabled
                                    onchange="actualizarResultadoDinamico(this)">
                                <option value="">Seleccione</option>
                                <option value="1">Cumple</option>
                                <option value="0">No Cumple</option>
                                <option value="NA">No Aplica</option>
                            </select>
                            <span class="peso-indicador" id="peso-${sub.codigo}">0%</span>
                        </div>
                    `;
                }
                
                html += `</div></div>`;
            }
            
            html += `
                    </div>
                </div>
            </div>
            `;
        }
        
        // ======================================================
        // 4e. INSERTAR EN EL DOM
        // ======================================================
        container.innerHTML = html;
        
        console.log('✅ Formulario generado dinámicamente con selects deshabilitados');
        return true;
        
    } catch (error) {
        console.error('❌ Error generando formulario:', error);
        container.innerHTML = `<div style="color: red; padding: 20px;">❌ Error: ${error.message}</div>`;
        return false;
    }
}

// ======================================================
// 5. FUNCIÓN: conectarEventosSelects()
// ======================================================
// 📌 PROPÓSITO: Conectar eventos change a todos los selects
// 📌 USO: Después de generar o recargar el formulario
// ======================================================

function conectarEventosSelects() {
    const selects = document.querySelectorAll('.cumple-select');
    selects.forEach(select => {
        // Remover eventos anteriores para evitar duplicados
        select.removeEventListener('change', actualizarResultadoDinamico);
        
        // Agregar nuevo evento
        select.addEventListener('change', function() {
            actualizarResultadoDinamico(this);
        });
    });
}

// ======================================================
// 6. FUNCIÓN: toggleFrenteDinamico()
// ======================================================
// 📌 PROPÓSITO: Expandir/contraer un frente dinámico
// 📌 PARÁMETROS: frenteCodigo (string) - Código del frente
// 📌 USO: Llamada desde el onclick del header del frente
// ======================================================

function toggleFrenteDinamico(frenteCodigo) {
    const contenido = document.getElementById(`frente_${frenteCodigo}`);
    const icono = document.getElementById(`icono_${frenteCodigo}`);
    
    if (contenido) {
        if (contenido.classList.contains('collapsed')) {
            // Expandir
            contenido.classList.remove('collapsed');
            if (icono) icono.textContent = '▼';
            localStorage.setItem(`frente_${frenteCodigo}_collapsed`, 'false');
        } else {
            // Contraer
            contenido.classList.add('collapsed');
            if (icono) icono.textContent = '▶';
            localStorage.setItem(`frente_${frenteCodigo}_collapsed`, 'true');
        }
    }
}

// ======================================================
// 7. FUNCIÓN: recalcularTotalAtributo()
// ======================================================
// 📌 PROPÓSITO: Recalcular el total de un atributo específico
// 📌 PARÁMETROS: 
//    - bloque (string) - Código del frente (ENC, ECUF, ECN)
//    - atributo (string) - Nombre del atributo
// 📌 RETORNO: totalObtenido (número)
// 📌 NOTA: NA (No Aplica) también suma el peso
// ======================================================

function recalcularTotalAtributo(bloque, atributo) {
    // ======================================================
    // 7a. OBTENER SELECTS DEL ATRIBUTO
    // ======================================================
    const selects = document.querySelectorAll(
        `.cumple-select[data-bloque="${bloque}"][data-atributo="${atributo}"]`
    );
    
    let totalPeso = 0;      // Peso máximo posible
    let totalObtenido = 0;  // Peso obtenido según selecciones
    
    // ======================================================
    // 7b. SUMAR PESOS
    // ======================================================
    selects.forEach(select => {
        const peso = parseFloat(select.dataset.peso);
        totalPeso += peso;
        
        // 🔴 MODIFICADO: NA (No Aplica) también suma el peso
        if (select.value === '1' || select.value === 'NA') {
            totalObtenido += peso;
        }
    });
    
    // ======================================================
    // 7c. ACTUALIZAR ELEMENTO DE RESULTADO
    // ======================================================
    const atributoId = atributo.toLowerCase().replace(/[áéíóúñ\s\/]+/g, '_');
    const resultadoElement = document.getElementById(`resultado_${atributoId}`);
    
    if (resultadoElement) {
        resultadoElement.textContent = `${totalObtenido}/${totalPeso}%`;
        
        // Cambiar color según resultado
        if (totalObtenido === totalPeso) {
            resultadoElement.style.color = 'var(--ok)';        // Verde - Todo cumple
        } else if (totalObtenido > 0) {
            resultadoElement.style.color = 'var(--warning)';   // Naranja - Parcial
        } else {
            resultadoElement.style.color = 'var(--danger)';    // Rojo - Nada cumple
        }
    }
    
    return totalObtenido;
}

// ======================================================
// BLOQUE 25: CÁLCULO DE FRENTES, NOTA FINAL Y MODALES DE CONTRASEÑA
// ======================================================
// 
// 📌 PROPÓSITO: Recalcular totales por frente, nota final global,
//    y gestionar modales de cambio de contraseña (primer login y voluntario)
// 📌 ESTRUCTURA:
//    1. recalcularTotalFrente() - Recalcular total de un frente
//    2. recalcularNotaFinalGlobal() - Calcular nota final global
//    3. actualizarResultadoDinamico() - Actualizar todo al cambiar un select
//    4. probarEstructuraBD() - Función de prueba para depuración
//    5. mostrarModalCambioPasswordPrimerLogin() - Modal de primer login
//    6. cerrarModalPrimerLogin() - Cerrar modal de primer login
//    7. cambiarPasswordPrimerLogin() - Cambiar contraseña en primer login
//    8. abrirModalCambioPasswordVoluntario() - Modal de cambio voluntario
//    9. cerrarModalCambioPasswordVoluntario() - Cerrar modal de cambio voluntario
// ======================================================

// ======================================================
// 1. FUNCIÓN: recalcularTotalFrente()
// ======================================================
// 📌 PROPÓSITO: Recalcular el total de un frente específico
// 📌 PARÁMETROS: bloque (string) - Código del frente (ENC, ECUF, ECN)
// 📌 MECANISMO: Suma todos los atributos del frente
// 📌 ACTUALIZA: Elemento de resultado del frente (resultadoFrente_${bloque})
// 📌 RETORNO: totalFrente (número)
// ======================================================

function recalcularTotalFrente(bloque) {
    // ======================================================
    // 1a. OBTENER TODOS LOS ATRIBUTOS DEL FRENTE
    // ======================================================
    // 📌 Busca todos los .atributo-card dentro del frente específico
    // 📌 Usa el selector de clase dinámico: .frente_${bloque}
    const atributoCards = document.querySelectorAll(`.frente_${bloque} .atributo-card`);
    let totalFrente = 0;
    
    // ======================================================
    // 1b. SUMAR LOS TOTALES DE CADA ATRIBUTO
    // ======================================================
    atributoCards.forEach(card => {
        // Buscar el span de resultado dentro del atributo (id^="resultado_")
        const resultadoSpan = card.querySelector('[id^="resultado_"]');
        if (resultadoSpan) {
            // Extraer el número antes del '/' (total obtenido)
            const obtenido = parseInt(resultadoSpan.textContent.split('/')[0]) || 0;
            totalFrente += obtenido;
        }
    });
    
    // ======================================================
    // 1c. ACTUALIZAR ELEMENTO DE RESULTADO DEL FRENTE
    // ======================================================
    const resultadoFrente = document.getElementById(`resultadoFrente_${bloque}`);
    if (resultadoFrente) {
        resultadoFrente.textContent = `${totalFrente}%`;
        
        // Obtener peso máximo del frente desde el badge
        const pesoMaximo = parseFloat(
            resultadoFrente.closest('.frente-container')
                ?.querySelector('.frente-badge')
                ?.textContent || 100
        );
        
        // Cambiar color según el porcentaje alcanzado
        if (totalFrente === pesoMaximo) {
            resultadoFrente.style.color = 'var(--ok)';        // Verde - 100%
        } else if (totalFrente >= pesoMaximo * 0.7) {
            resultadoFrente.style.color = 'var(--warning)';   // Naranja - ≥70%
        } else {
            resultadoFrente.style.color = 'var(--danger)';    // Rojo - <70%
        }
    }
    
    return totalFrente;
}

// ======================================================
// 2. FUNCIÓN: recalcularNotaFinalGlobal()
// ======================================================
// 📌 PROPÓSITO: Calcular la nota final sumando los tres frentes
// 📌 FUENTE: resultadoFrente_ENC, resultadoFrente_ECUF, resultadoFrente_ECN
// 📌 ACTUALIZA: Elemento 'notaFinalGlobal'
// 📌 RETORNO: notaTotal (número)
// ======================================================

function recalcularNotaFinalGlobal() {
    // ======================================================
    // 2a. OBTENER LOS TOTALES DE CADA FRENTE
    // ======================================================
    const enc = parseFloat(document.getElementById('resultadoFrente_ENC')?.textContent || 0);
    const ecuf = parseFloat(document.getElementById('resultadoFrente_ECUF')?.textContent || 0);
    const ecn = parseFloat(document.getElementById('resultadoFrente_ECN')?.textContent || 0);
    
    // ======================================================
    // 2b. CALCULAR NOTA TOTAL
    // ======================================================
    const notaTotal = enc + ecuf + ecn;
    
    // ======================================================
    // 2c. ACTUALIZAR ELEMENTO DE NOTA FINAL
    // ======================================================
    const notaFinalSpan = document.getElementById('notaFinalGlobal');
    if (notaFinalSpan) {
        notaFinalSpan.textContent = `${notaTotal.toFixed(1)}%`;
        
        // Cambiar color según el rango de nota
        if (notaTotal >= 90) {
            notaFinalSpan.style.color = '#1a7f37';        // Verde - Excelente
        } else if (notaTotal >= 70) {
            notaFinalSpan.style.color = '#f39c12';        // Naranja - Regular
        } else {
            notaFinalSpan.style.color = '#d93025';        // Rojo - Bajo
        }
    }
    
    return notaTotal;
}

// ======================================================
// 3. FUNCIÓN: actualizarResultadoDinamico()
// ======================================================
// 📌 PROPÓSITO: Actualizar todos los resultados al cambiar un select
// 📌 PARÁMETROS: select (elemento DOM) - El select que cambió
// 📌 FLUJO:
//    1. Actualizar peso visual del submotivo
//    2. Recalcular total del atributo
//    3. Recalcular total del frente
//    4. Recalcular nota final
// ======================================================

function actualizarResultadoDinamico(select) {
    // ======================================================
    // 3a. OBTENER DATOS DEL SELECT
    // ======================================================
    const bloque = select.dataset.bloque;
    const atributo = select.dataset.atributo;
    const submotivo = select.dataset.submotivo;
    const peso = parseFloat(select.dataset.peso);
    const valor = select.value;
    
    // ======================================================
    // 3b. ACTUALIZAR PESO VISUAL
    // ======================================================
    const pesoElement = document.getElementById(`peso-${submotivo}`);
    if (pesoElement) {
        if (valor === '1') {
            // ✅ Cumple: muestra el peso completo en verde
            pesoElement.textContent = `${peso}%`;
            pesoElement.style.color = 'var(--ok)';
        } else if (valor === '0') {
            // ❌ No Cumple: muestra 0% en rojo
            pesoElement.textContent = '0%';
            pesoElement.style.color = 'var(--danger)';
        } else if (valor === 'NA') {
            // 🔴 NUEVO: No Aplica - suma igual que Cumple, pero en gris
            pesoElement.textContent = `${peso}%`;
            pesoElement.style.color = 'var(--muted)';
        } else {
            // ⚪ Sin selección: muestra 0% sin color
            pesoElement.textContent = '0%';
            pesoElement.style.color = '';
        }
    }
    
    // ======================================================
    // 3c. RECALCULAR TOTAL DEL ATRIBUTO
    // ======================================================
    recalcularTotalAtributo(bloque, atributo);
    
    // ======================================================
    // 3d. RECALCULAR TOTAL DEL FRENTE
    // ======================================================
    if (bloque === 'ENC') {
        recalcularTotalENC();
    } else if (bloque === 'ECUF') {
        actualizarResultadoECUF();
    } else if (bloque === 'ECN') {
        actualizarResultadoECN();
    }
    
    // ======================================================
    // 3e. RECALCULAR NOTA FINAL
    // ======================================================
    recalcularNotaFinalGlobal();
}

// ======================================================
// 4. FUNCIÓN: probarEstructuraBD()
// ======================================================
// 📌 PROPÓSITO: Función de prueba para verificar conexión a BD
// 📌 USO: Depuración - muestra la estructura en el contenedor
// ======================================================

async function probarEstructuraBD() {
    try {
        // Obtener estructura desde la API
        const estructura = await API.getEstructuraEvaluacion();
        console.log('✅ Estructura cargada desde BD:', estructura);
        
        // Si el contenedor está vacío, mostrar la estructura en formato JSON
        const container = document.getElementById('evaluacion-dinamica-container');
        if (container && !container.innerHTML.includes('frente-container')) {
            container.innerHTML = `<pre style="background:#f0f0f0; padding:10px; font-size:11px; overflow:auto;">${JSON.stringify(estructura, null, 2)}</pre>`;
        }
    } catch (error) {
        console.error('❌ Error:', error);
    }
}

// ======================================================
// 5. MODALES DE CAMBIO DE CONTRASEÑA - PRIMER LOGIN
// ======================================================

// ----------------------------------------------------------------------
// mostrarModalCambioPasswordPrimerLogin()
// ----------------------------------------------------------------------
// 📌 PROPÓSITO: Mostrar el modal de cambio de contraseña en primer login
// 📌 PARÁMETROS: 
//    - usuarioId (number) - ID del usuario
//    - usuarioNombre (string) - Nombre del usuario
// ======================================================

function mostrarModalCambioPasswordPrimerLogin(usuarioId, usuarioNombre) {
    // Obtener elementos del DOM
    const modal = document.getElementById('modalPrimerLogin');
    const inputUsuario = document.getElementById('primerLoginUsuario');
    
    // Mostrar nombre del usuario
    if (inputUsuario) inputUsuario.value = usuarioNombre;
    
    // Guardar ID del usuario temporalmente
    window.usuarioPrimerLoginId = usuarioId;
    
    // Limpiar campos de contraseña
    document.getElementById('primerLoginNuevaPassword').value = '';
    document.getElementById('primerLoginConfirmarPassword').value = '';
    document.getElementById('primerLoginError').style.display = 'none';
    
    // Ocultar overlay de login si está visible
    const loginOverlay = document.getElementById('loginOverlay');
    if (loginOverlay) loginOverlay.style.display = 'none';
    
    // Mostrar modal
    modal.style.display = 'flex';
}

// ----------------------------------------------------------------------
// cerrarModalPrimerLogin()
// ----------------------------------------------------------------------
// 📌 PROPÓSITO: Cerrar el modal de primer login
// ======================================================

function cerrarModalPrimerLogin() {
    const modal = document.getElementById('modalPrimerLogin');
    modal.style.display = 'none';
    
    // Mostrar login nuevamente
    const loginOverlay = document.getElementById('loginOverlay');
    if (loginOverlay) loginOverlay.style.display = 'flex';
    
    // Limpiar sessionStorage
    sessionStorage.removeItem('requiere_cambio_password');
    sessionStorage.removeItem('usuario_temp');
    window.usuarioPrimerLoginId = null;
}

// ----------------------------------------------------------------------
// cambiarPasswordPrimerLogin()
// ----------------------------------------------------------------------
// 📌 PROPÓSITO: Cambiar la contraseña en el primer login
// 📌 ACCIONES:
//    1. Validar campos (completos, coincidentes, longitud ≥ 6)
//    2. Hashear nueva contraseña
//    3. Actualizar en BD (contrasena, primer_login = false)
//    4. Cerrar modal y mostrar login
// ======================================================

async function cambiarPasswordPrimerLogin() {
    // ======================================================
    // 5a. VALIDAR CAMPOS
    // ======================================================
    const nuevaPassword = document.getElementById('primerLoginNuevaPassword').value;
    const confirmarPassword = document.getElementById('primerLoginConfirmarPassword').value;
    const errorDiv = document.getElementById('primerLoginError');
    
    if (!nuevaPassword || !confirmarPassword) {
        errorDiv.textContent = '⚠️ Complete ambos campos';
        errorDiv.style.display = 'block';
        return;
    }
    
    if (nuevaPassword !== confirmarPassword) {
        errorDiv.textContent = '⚠️ Las contraseñas no coinciden';
        errorDiv.style.display = 'block';
        return;
    }
    
    if (nuevaPassword.length < 6) {
        errorDiv.textContent = '⚠️ La contraseña debe tener al menos 6 caracteres';
        errorDiv.style.display = 'block';
        return;
    }
    
    errorDiv.style.display = 'none';
    
    // Deshabilitar botón mientras se procesa
    const btn = document.getElementById('btnCambiarPasswordPrimerLogin');
    const textoOriginal = btn.innerHTML;
    btn.innerHTML = '⏳ Actualizando...';
    btn.disabled = true;
    
    try {
        // ======================================================
        // 5b. CONECTAR A BD Y ACTUALIZAR
        // ======================================================
        const db = getDB();
        if (!db) throw new Error('Base de datos no disponible');
        
        // Hashear nueva contraseña
        const hashedPassword = await hashPassword(nuevaPassword);
        
        // Actualizar en la base de datos
        const { error } = await db
            .from('usuarios')
            .update({
                contrasena: hashedPassword,
                primer_login: false,                           // ⭐ Ya no es primer login
                fecha_ultimo_cambio_password: new Date().toISOString(),
                updated_at: new Date().toISOString()
            })
            .eq('id', window.usuarioPrimerLoginId);
        
        if (error) throw error;
        
        // ======================================================
        // 5c. LIMPIAR Y CERRAR
        // ======================================================
        sessionStorage.removeItem('requiere_cambio_password');
        sessionStorage.removeItem('usuario_temp');
        
        cerrarModalPrimerLogin();
        
        alert('✅ Contraseña actualizada correctamente\n\nAhora puede iniciar sesión con su nueva contraseña.');
        
        // Limpiar campos de login
        const loginUsuario = document.getElementById('loginUsuario');
        const loginPassword = document.getElementById('loginPassword');
        if (loginUsuario) loginUsuario.value = '';
        if (loginPassword) loginPassword.value = '';
        
    } catch (error) {
        console.error('Error cambiando contraseña:', error);
        errorDiv.textContent = '❌ Error al actualizar: ' + error.message;
        errorDiv.style.display = 'block';
        
        // Restaurar botón
        btn.innerHTML = textoOriginal;
        btn.disabled = false;
    }
}

// ======================================================
// 6. MODALES DE CAMBIO DE CONTRASEÑA - VOLUNTARIO
// ======================================================

// ----------------------------------------------------------------------
// abrirModalCambioPasswordVoluntario()
// ----------------------------------------------------------------------
// 📌 PROPÓSITO: Abrir modal de cambio voluntario de contraseña
// 📌 USO: Desde el perfil o configuración del usuario
// ======================================================

function abrirModalCambioPasswordVoluntario() {
    // Mostrar modal
    document.getElementById('modalCambioPasswordVoluntario').style.display = 'flex';
    
    // Limpiar campos
    document.getElementById('cambioPassActual').value = '';
    document.getElementById('cambioPassNueva').value = '';
    document.getElementById('cambioPassConfirmar').value = '';
    document.getElementById('cambioPassError').style.display = 'none';
}

// ----------------------------------------------------------------------
// cerrarModalCambioPasswordVoluntario()
// ----------------------------------------------------------------------
// 📌 PROPÓSITO: Cerrar modal de cambio voluntario de contraseña
// ======================================================

function cerrarModalCambioPasswordVoluntario() {
    document.getElementById('modalCambioPasswordVoluntario').style.display = 'none';
}

// ----------------------------------------------------------------------
// NOTA: La función cambiarPasswordVoluntario() se encuentra en otro bloque
// (probablemente en el código de usuario o perfil)
// ======================================================

// ======================================================
// BLOQUE 26: CAMBIO DE CONTRASEÑA VOLUNTARIO (USUARIO LOGUEADO)
// ======================================================
// 
// 📌 PROPÓSITO: Permitir al usuario cambiar su contraseña estando logueado
// 📌 REQUISITOS:
//    1. Usuario debe estar logueado (usuarioActual)
//    2. Debe ingresar su contraseña actual
//    3. Nueva contraseña debe cumplir requisitos (mínimo 6 caracteres)
// 📌 FLUJO:
//    1. Validar campos completos
//    2. Validar que nueva contraseña coincida
//    3. Validar longitud mínima (6 caracteres)
//    4. Verificar contraseña actual en BD
//    5. Actualizar a nueva contraseña
//    6. Mostrar confirmación y cerrar modal
// ======================================================

// ----------------------------------------------------------------------
// cambiarPasswordVoluntario()
// ----------------------------------------------------------------------
// 📌 PROPÓSITO: Cambiar contraseña voluntariamente
// 📌 CONTEXTO: Usuario ya logueado, desde perfil/configuración
// 📌 VALIDACIONES:
//    1. Todos los campos completos
//    2. Nueva contraseña y confirmación coinciden
//    3. Nueva contraseña ≥ 6 caracteres
//    4. Contraseña actual es correcta (verificada en BD)
// 📌 SEGURIDAD: Usa hash SHA-256 para almacenar contraseñas
// ======================================================

async function cambiarPasswordVoluntario() {
    // ======================================================
    // 1. OBTENER VALORES DEL FORMULARIO
    // ======================================================
    // 📌 passwordActual: Contraseña actual del usuario
    // 📌 nuevaPassword: Nueva contraseña a establecer
    // 📌 confirmarPassword: Confirmación de la nueva contraseña
    // 📌 errorDiv: Elemento para mostrar mensajes de error
    // ======================================================
    const passwordActual = document.getElementById('cambioPassActual').value;
    const nuevaPassword = document.getElementById('cambioPassNueva').value;
    const confirmarPassword = document.getElementById('cambioPassConfirmar').value;
    const errorDiv = document.getElementById('cambioPassError');

    // ======================================================
    // 2. VALIDAR: CAMPOS COMPLETOS
    // ======================================================
    if (!passwordActual || !nuevaPassword || !confirmarPassword) {
        errorDiv.textContent = '⚠️ Complete todos los campos';
        errorDiv.style.display = 'block';
        return;
    }

    // ======================================================
    // 3. VALIDAR: CONTRASEÑAS NUEVAS COINCIDEN
    // ======================================================
    if (nuevaPassword !== confirmarPassword) {
        errorDiv.textContent = '⚠️ Las contraseñas nuevas no coinciden';
        errorDiv.style.display = 'block';
        return;
    }

    // ======================================================
    // 4. VALIDAR: LONGITUD MÍNIMA (6 CARACTERES)
    // ======================================================
    if (nuevaPassword.length < 6) {
        errorDiv.textContent = '⚠️ La nueva contraseña debe tener al menos 6 caracteres';
        errorDiv.style.display = 'block';
        return;
    }

    // ======================================================
    // 5. OCULTAR ERROR Y DESHABILITAR BOTÓN
    // ======================================================
    errorDiv.style.display = 'none';

    const btn = event.target;                    // Botón que disparó la acción
    const textoOriginal = btn.innerHTML;          // Guardar texto original
    btn.innerHTML = '⏳ Verificando...';          // Mostrar indicador de carga
    btn.disabled = true;                          // Deshabilitar botón

    try {
        // ======================================================
        // 6. CONECTAR A BASE DE DATOS
        // ======================================================
        const db = getDB();
        if (!db) throw new Error('Base de datos no disponible');

        // ======================================================
        // 7. VERIFICAR CONTRASEÑA ACTUAL
        // ======================================================
        // 📌 Hashear la contraseña ingresada para comparar con la BD
        const hashedActual = await hashSHA256(passwordActual);

        // 📌 Obtener la contraseña almacenada del usuario actual
        const { data: usuario, error: verifyError } = await db
            .from('usuarios')
            .select('contrasena')
            .eq('id', usuarioActual.id)  // 🔴 Usar usuarioActual (global)
            .single();

        if (verifyError) throw verifyError;

        // ======================================================
        // 8. VALIDAR: CONTRASEÑA ACTUAL ES CORRECTA
        // ======================================================
        if (usuario.contrasena !== hashedActual) {
            errorDiv.textContent = '❌ La contraseña actual es incorrecta';
            errorDiv.style.display = 'block';
            btn.innerHTML = textoOriginal;
            btn.disabled = false;
            return;
        }

        // ======================================================
        // 9. ACTUALIZAR A NUEVA CONTRASEÑA
        // ======================================================
        // 📌 Hashear la nueva contraseña
        const hashedNueva = await hashSHA256(nuevaPassword);

        // 📌 Actualizar en la base de datos
        const { error: updateError } = await db
            .from('usuarios')
            .update({
                contrasena: hashedNueva,                                     // Nueva contraseña (hasheada)
                fecha_ultimo_cambio_password: new Date().toISOString(),      // Registrar fecha de cambio
                updated_at: new Date().toISOString()                        // Actualizar timestamp
            })
            .eq('id', usuarioActual.id);  // 🔴 Actualizar al usuario actual

        if (updateError) throw updateError;

        // ======================================================
        // 10. MOSTRAR CONFIRMACIÓN Y CERRAR MODAL
        // ======================================================
        alert('✅ Contraseña actualizada correctamente');
        cerrarModalCambioPasswordVoluntario();

    } catch (error) {
        // ======================================================
        // 11. MANEJO DE ERRORES
        // ======================================================
        console.error('Error:', error);
        errorDiv.textContent = '❌ Error: ' + error.message;
        errorDiv.style.display = 'block';

    } finally {
        // ======================================================
        // 12. RESTAURAR BOTÓN (SIEMPRE SE EJECUTA)
        // ======================================================
        // 📌 finally: Se ejecuta tanto si hay error como si no
        btn.innerHTML = textoOriginal;
        btn.disabled = false;
    }
}

// ======================================================
// FUNCIÓN PARA ACTUALIZAR EL HEADER CUANDO SE CARGA
// ======================================================

function actualizarHeaderConUsuario() {
    console.log('🔄 actualizarHeaderConUsuario - EJECUTADA');
    
    // Obtener datos del usuario
    let nombreCompleto = null;
    let rol = null;
    
    // 1. Intentar desde usuarioActual (global)
    if (window.usuarioActual && window.usuarioActual.nombre_completo) {
        nombreCompleto = window.usuarioActual.nombre_completo;
        rol = window.usuarioActual.rol;
        console.log('📦 usuarioActual:', nombreCompleto);
    }
    
    // 2. Intentar desde localStorage
    if (!nombreCompleto) {
        try {
            const guardado = localStorage.getItem('meca_usuario');
            if (guardado) {
                const data = JSON.parse(guardado);
                nombreCompleto = data.nombre_completo || data.usuario;
                rol = data.rol;
                console.log('📦 localStorage:', nombreCompleto);
            }
        } catch (e) {}
    }
    
    // 3. Intentar desde sessionStorage
    if (!nombreCompleto) {
        try {
            const guardado = sessionStorage.getItem('usuario_actual');
            if (guardado) {
                const data = JSON.parse(guardado);
                nombreCompleto = data.nombre_completo || data.usuario;
                rol = data.rol;
                console.log('📦 sessionStorage:', nombreCompleto);
            }
        } catch (e) {}
    }
    
    // 4. Actualizar el DOM
    if (nombreCompleto) {
        const userNameEl = document.getElementById('userName');
        const userRolEl = document.getElementById('userRol');
        const userInfoEl = document.getElementById('userInfo');
        
        if (userNameEl) {
            userNameEl.textContent = nombreCompleto;
            console.log('✅ userName actualizado:', nombreCompleto);
        }
        if (userRolEl) {
            userRolEl.textContent = rol || 'AUDITOR';
            console.log('✅ userRol actualizado:', rol || 'AUDITOR');
        }
        if (userInfoEl) {
            userInfoEl.style.display = 'flex';
        }
    } else {
        console.warn('⚠️ No se encontraron datos de usuario');
        // Mostrar mensaje de no autenticado
        const userNameEl = document.getElementById('userName');
        if (userNameEl) {
            userNameEl.textContent = '👤 No autenticado';
        }
    }
}

// Escuchar evento personalizado cuando el header se carga
document.addEventListener('headerLoaded', function() {
    console.log('📢 Evento headerLoaded detectado');
    setTimeout(actualizarHeaderConUsuario, 50);
});

// También ejecutar cuando la página termine de cargar
window.addEventListener('load', function() {
    console.log('📢 Window load');
    setTimeout(actualizarHeaderConUsuario, 300);
});

// Exponer la función globalmente
window.actualizarHeaderConUsuario = actualizarHeaderConUsuario;

console.log('✅ Sistema de actualización de header registrado');