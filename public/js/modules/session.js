// =============================================
// MÓDULO: SESIÓN - session.js
// =============================================
// Login, autenticación, manejo de sesiones
// =============================================

(function() {
    'use strict';

    // =============================================
    // 1. VERIFICACIÓN DE SESIÓN
    // =============================================

    /**
     * Verifica si hay una sesión activa para el supervisor
     */
    window.verificarSesionSupervisor = async function() {
    const token = localStorage.getItem('meca_token');
    const usuarioGuardado = localStorage.getItem('meca_usuario');

    console.log('🔍 [SUPERVISOR] Token encontrado:', token ? 'SÍ' : 'NO');

    if (!token || !usuarioGuardado) {
        console.log('⚠️ [SUPERVISOR] No hay sesión, redirigiendo a login');
        window.location.href = '/login';
        return false;
    }

    try {
        window.usuarioActual = JSON.parse(usuarioGuardado);
        console.log('✅ [SUPERVISOR] Usuario restaurado:', window.usuarioActual.nombre_completo);

        // 🔴🔴🔴 DESACTIVAR COMPLETAMENTE LA VERIFICACIÓN 🔴🔴🔴
        // No llamar a verificarSesionEnBD, no llamar a /api/auth/verify
        // Simplemente asumir que la sesión es válida
        
        window.mostrarInterfazSupervisor();
        
        if (typeof window.iniciarMonitorSesion === 'function') {
            window.iniciarMonitorSesion();
        }

        return true;

    } catch (error) {
        console.error('❌ [SUPERVISOR] Error:', error);
        window.location.href = '/login';
        return false;
    }
};

    // =============================================
    // 2. VERIFICACIÓN EN BASE DE DATOS
    // =============================================

    /**
     * Verifica si la sesión actual sigue activa en BD
     */
    window.verificarSesionEnBD = async function() {
        const sessionToken = sessionStorage.getItem('session_token_actual');
        if (!sessionToken) return false;

        const db = window.getDB();
        if (!db) return false;

        try {
            const { data: sesion, error } = await db
                .from('sesiones_activas')
                .select('id, estado, usuario_id')
                .eq('session_token', sessionToken)
                .eq('estado', 'activa')
                .single();

            if (error || !sesion) {
                console.log('❌ Sesión no encontrada o inactiva en BD');
                return false;
            }

            if (window.usuarioActual && sesion.usuario_id !== window.usuarioActual.id) {
                console.log('❌ Conflicto: usuario en sesión no coincide con BD');
                return false;
            }

            return true;

        } catch (error) {
            console.error('Error verificando sesión en BD:', error);
            return false;
        }
    };

    // =============================================
    // 3. MOSTRAR INTERFAZ
    // =============================================

    window.mostrarInterfazSupervisor = function() {
        console.log('👤 Mostrando interfaz para supervisor:', window.usuarioActual?.nombre_completo);

        // Ocultar login
        const loginOverlay = document.getElementById('loginOverlay');
        if (loginOverlay) loginOverlay.style.display = 'none';

        // Mostrar info del usuario en el header
        const userInfo = document.getElementById('userInfo');
        const userName = document.getElementById('userName');
        const userRol = document.getElementById('userRol');

        if (userInfo) userInfo.style.display = 'flex';
        if (userName) userName.textContent = window.usuarioActual?.nombre_completo || 'Usuario';
        if (userRol) userRol.textContent = window.usuarioActual?.rol_nombre || window.usuarioActual?.rol || '';

        // Mostrar el contenido principal
        const container = document.querySelector('.container');
        if (container) container.style.display = 'block';

        // Generar las pestañas
        if (typeof window.generarTabsSupervisor === 'function') {
            window.generarTabsSupervisor();
        }
    };

    // =============================================
    // 4. GESTIÓN DE SESIONES
    // =============================================

    /**
     * Genera un token único de sesión
     */
    window.generarSessionToken = function() {
        return 'ses_' + Date.now() + '_' + Math.random().toString(36).substr(2, 16) + '_' + crypto.randomUUID();
    };

    /**
     * Obtiene información del dispositivo
     */
    window.obtenerInfoDispositivo = function() {
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
    };

    /**
     * Obtiene la IP pública
     */
    window.obtenerIpPublica = async function() {
        try {
            const response = await fetch('https://api.ipify.org?format=json');
            const data = await response.json();
            return data.ip;
        } catch (error) {
            console.warn('No se pudo obtener IP pública:', error);
            return '0.0.0.0';
        }
    };

    /**
     * Registra historial de login
     */
    window.registrarHistorialLogin = async function(usuarioId, usuario, evento, ip, dispositivo, detalles = '') {
        const db = window.getDB();
        if (!db) return;

        try {
            await db.from('historial_login').insert({
                usuario_id: usuarioId,
                usuario: usuario,
                evento: evento,
                ip_address: ip || '0.0.0.0',
                user_agent: navigator.userAgent,
                dispositivo: dispositivo,
                detalles: detalles,
                created_at: new Date().toISOString()
            });
            console.log(`✅ Historial registrado: ${evento} para ${usuario}`);
        } catch (error) {
            console.error('Error registrando historial:', error);
        }
    };

    /**
     * Crea una sesión activa en la BD
     */
    window.crearSesionActiva = async function(usuarioId, sessionToken, ip, dispositivo) {
        const db = window.getDB();
        if (!db) {
            console.error('❌ Base de datos no disponible');
            return false;
        }

        try {
            // Verificar si hay sesiones activas anteriores
            const { data: sesionesExistentes, error: findError } = await db
                .from('sesiones_activas')
                .select('id')
                .eq('usuario_id', usuarioId)
                .eq('estado', 'activa');

            if (!findError && sesionesExistentes && sesionesExistentes.length > 0) {
                console.log(`⚠️ Usuario tiene ${sesionesExistentes.length} sesión(es) activa(s). Cerrando...`);
                for (const sesion of sesionesExistentes) {
                    await db.from('sesiones_activas')
                        .update({ estado: 'cerrada', fecha_fin: new Date(), motivo_cierre: 'Nuevo inicio de sesión' })
                        .eq('id', sesion.id);
                }
            }

            // Insertar nueva sesión
            const ahora = new Date();
            const nuevaSesion = {
                usuario_id: usuarioId,
                session_token: sessionToken,
                ip_address: ip,
                user_agent: navigator.userAgent,
                dispositivo: dispositivo,
                fecha_inicio: ahora,
                ultima_actividad: ahora,
                estado: 'activa'
            };

            const { error } = await db.from('sesiones_activas').insert(nuevaSesion);

            if (error) {
                console.error('❌ Error insertando sesión:', error);
                return false;
            }

            sessionStorage.setItem('session_token_actual', sessionToken);
            sessionStorage.setItem('session_inicio', Date.now().toString());
            sessionStorage.setItem('ultima_actividad', Date.now().toString());

            console.log('✅ Sesión creada correctamente');
            return true;

        } catch (error) {
            console.error('❌ Error inesperado:', error);
            return false;
        }
    };

    /**
     * Valida y bloquea múltiples sesiones del mismo usuario
     */
    window.validarYBloquearMultiplesSesiones = async function(usuarioId, sessionTokenNuevo) {
        console.log(`🔒 Validando sesiones activas para usuario ID: ${usuarioId}`);
        const db = window.getDB();
        if (!db) return true;

        try {
            const { data: sesionesActivas, error } = await db
                .from('sesiones_activas')
                .select('*')
                .eq('usuario_id', usuarioId)
                .eq('estado', 'activa');

            if (error) throw error;

            if (sesionesActivas && sesionesActivas.length > 0) {
                console.log(`⚠️ Usuario ya tiene ${sesionesActivas.length} sesión(es) activa(s). Cerrando...`);
                for (const sesion of sesionesActivas) {
                    if (sesion.session_token === sessionTokenNuevo) continue;
                    await db.from('sesiones_activas')
                        .update({
                            estado: 'cerrada',
                            fecha_fin: new Date().toISOString(),
                            motivo_cierre: 'Nuevo login desde otro dispositivo'
                        })
                        .eq('id', sesion.id);
                }
            }
            return true;

        } catch (error) {
            console.error('❌ Error en validación de sesiones:', error);
            return true;
        }
    };

    // =============================================
    // 5. HASH DE CONTRASEÑA
    // =============================================

    /**
     * Hashea una contraseña usando SHA-256
     */
    window.hashPassword = async function(password) {
        const encoder = new TextEncoder();
        const data = encoder.encode(password);
        const hashBuffer = await crypto.subtle.digest('SHA-256', data);
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    };

    // =============================================
    // 6. MONITOR DE SESIÓN
    // =============================================

    /**
     * Inicia el monitor que verifica la sesión cada 10 segundos
     */
    window.iniciarMonitorSesion = function() {
        console.log('🔧 [GLOBAL] iniciarMonitorSesion - EJECUTADA');

        if (window.monitorInterval) {
            clearInterval(window.monitorInterval);
            window.monitorInterval = null;
        }

        if (!window.usuarioActual) {
            console.log('⚠️ No hay usuario actual, monitor no iniciado');
            return false;
        }

        console.log('🟢 INICIANDO MONITOR DE SESIÓN (cada 10 segundos)');

        window.monitorInterval = setInterval(async () => {
            const sessionToken = sessionStorage.getItem('session_token_actual');
            if (!sessionToken) return;

            const db = window.getDB();
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
    };

    console.log('✅ Módulo session.js cargado');

    // =============================================
    // PROCESAR LOGIN - FUNCIÓN COMPLETA
    // =============================================

    window.procesarLogin = async function(usuario, contrasena) {
        console.log('🔐 Procesando login para:', usuario);

        try {
            // 1. Hash de la contraseña
            const hashedPassword = await window.hashPassword(contrasena);

            // 2. Llamar a la API de login
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    usuario: usuario,
                    contrasena: hashedPassword
                })
            });

            const data = await response.json();

            if (!response.ok) {
                window.mostrarErrorLogin(data.error || 'Credenciales incorrectas');
                return false;
            }

            console.log('📦 Respuesta del servidor:', data);

            // 3. Guardar token y datos del usuario
            localStorage.setItem('meca_token', data.token);
            localStorage.setItem('meca_usuario', JSON.stringify(data.usuario));

            // 4. Guardar en sessionStorage
            sessionStorage.setItem('usuario_actual_supervisor', JSON.stringify(data.usuario));
            sessionStorage.setItem('session_token_actual', data.token);
            sessionStorage.setItem('session_inicio', Date.now().toString());
            sessionStorage.setItem('ultima_actividad', Date.now().toString());

            // 5. Crear sesión activa en BD
            const ip = await window.obtenerIpPublica();
            const dispositivo = window.obtenerInfoDispositivo();

            await window.crearSesionActiva(
                data.usuario.id,
                data.token,
                ip,
                dispositivo
            );

            // 6. Registrar historial
            await window.registrarHistorialLogin(
                data.usuario.id,
                data.usuario.usuario,
                'login_exitoso',
                ip,
                dispositivo
            );

            // 7. Establecer usuario actual
            window.usuarioActual = data.usuario;

            console.log('✅ Login exitoso para:', data.usuario.nombre_completo);
            return true;

        } catch (error) {
            console.error('❌ Error en login:', error);
            window.mostrarErrorLogin('Error al iniciar sesión: ' + error.message);
            return false;
        }
    };

    // =============================================
    // MOSTRAR ERROR DE LOGIN
    // =============================================

    window.mostrarErrorLogin = function(mensaje) {
        console.error('❌ Error de login:', mensaje);
        
        const errorDiv = document.getElementById('loginError');
        if (errorDiv) {
            errorDiv.textContent = mensaje;
            errorDiv.style.display = 'block';
            setTimeout(() => {
                errorDiv.style.display = 'none';
            }, 3000);
        }
    };

})();

