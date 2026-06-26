// ======================================================
// CONFIGURACIÓN INICIAL
// ======================================================
// server.js - Servidor MECA - PostgreSQL local
// Base de datos: meca_db en PostgreSQL local (puerto 5432)
require('dotenv').config();
// Pool de conexión PostgreSQL
const { pool } = require('./models/database');
const http = require('http');
const fs = require('fs');
const path = require('path');
const url = require('url');
const crypto = require('crypto');
// Configuración
const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || '0.0.0.0';
// Mapa de rutas de la API
const routes = {};

// ======================================================
// FUNCIONES AUXILIARES
// ======================================================

// Encriptar contraseñas
function hashSHA256(texto) { 
    return crypto.createHash('sha256').update(texto).digest('hex');
}

// Validar credenciales
async function procesarLogin(usuario, contrasena) {
    try {
        // 1. Buscar usuario
        const result = await pool.query(
            'SELECT id, usuario, nombre_completo, contrasena, rol, activo, primer_login FROM usuarios WHERE usuario = $1',
            [usuario]
        );

        const usuarioData = result.rows[0];

        if (!usuarioData) {
            return { success: false, error: 'Usuario no encontrado' };
        }

        if (!usuarioData.activo) {
            return { success: false, error: 'Usuario desactivado' };
        }

        // 2. Verificar contraseña (hash SHA-256)
        const hashIngresado = hashSHA256(contrasena);

        if (usuarioData.contrasena !== hashIngresado) {
            return { success: false, error: 'Contraseña incorrecta' };
        }

        // 3. Verificar primer login
        if (usuarioData.primer_login === true) {
            return {
                success: false,
                requiereCambioPassword: true,
                usuario: {
                    id: usuarioData.id,
                    usuario: usuarioData.usuario,
                    nombre_completo: usuarioData.nombre_completo,
                    rol: usuarioData.rol
                }
            };
        }

        // 4. Generar token JWT (simple, sin librería externa)
        const payload = {
            id: usuarioData.id,
            usuario: usuarioData.usuario,
            nombre_completo: usuarioData.nombre_completo,
            rol: usuarioData.rol,
            exp: Math.floor(Date.now() / 1000) + (8 * 60 * 60) // 8 horas
        };

        const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url');
        const payloadEncoded = Buffer.from(JSON.stringify(payload)).toString('base64url');
        const signature = Buffer.from('firma-simple').toString('base64url');
        const token = `${header}.${payloadEncoded}.${signature}`;

        // 5. Actualizar último login (no bloqueante)
        pool.query('UPDATE usuarios SET ultimo_login = NOW() WHERE id = $1', [usuarioData.id]).catch(err => {
            console.log('No se pudo actualizar ultimo_login:', err.message);
        });

        return {
            success: true,
            token: token,
            usuario: {
                id: usuarioData.id,
                usuario: usuarioData.usuario,
                nombre_completo: usuarioData.nombre_completo,
                rol: usuarioData.rol
            }
        };

    } catch (error) {
        console.error('Error en login:', error);
        return { success: false, error: error.message };
    }
}

// Función para registrar rutas
function registrarRuta(metodo, ruta, manejador) {
    if (!routes[ruta]) routes[ruta] = {};
    routes[ruta][metodo] = manejador;
}

// ======================================================
// BLOQUE 0: Servir archivos estáticos y vistas
// ======================================================

function servirArchivoEstatico(ruta, respuesta) {
    const extension = path.extname(ruta);
    const tiposContenido = {
        '.css': 'text/css',
        '.js': 'text/javascript',
        '.html': 'text/html',
        '.png': 'image/png',
        '.jpg': 'image/jpeg',
        '.svg': 'image/svg+xml',
        '.json': 'application/json'
    };

    const rutaCompleta = path.join(__dirname, 'public', ruta);
    const tipo = tiposContenido[extension] || 'text/plain';

    fs.readFile(rutaCompleta, (error, contenido) => {
        if (error) {
            respuesta.writeHead(404);
            respuesta.end(JSON.stringify({ error: 'Archivo no encontrado' }));
        } else {
            respuesta.writeHead(200, { 'Content-Type': tipo });
            respuesta.end(contenido);
        }
    });
}

function servirVista(nombreVista, respuesta) {
    const rutaVista = path.join(__dirname, 'views', nombreVista);
    console.log(`[VISTA] Buscando: ${rutaVista}`);

    fs.readFile(rutaVista, 'utf8', (error, contenido) => {
        if (error) {
            console.error(`[VISTA] Error cargando: ${nombreVista} - ${error.code}`);
            respuesta.writeHead(500);
            respuesta.end(`<h1>Error 500</h1><p>No se pudo cargar la vista: ${nombreVista}</p>`);
            return;
        }

        console.log(`[VISTA] Cargada: ${nombreVista} (${contenido.length} bytes)`);
        respuesta.writeHead(200, { 'Content-Type': 'text/html' });
        respuesta.end(contenido);
    });
}

// ======================================================
// BLOQUE 1: Endpoint de prueba (health check)
// ======================================================
registrarRuta('GET', '/api/health', async (req, res) => {
    let dbStatus = 'desconectado';
    try {
        const result = await pool.query('SELECT NOW()');
        dbStatus = 'conectado (' + result.rows[0].now.toISOString() + ')';
    } catch (e) {
        dbStatus = 'error: ' + e.message;
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
        status: 'ok',
        message: 'Servidor MECA funcionando (PostgreSQL local)',
        version: '2.0.0',
        database: dbStatus,
        timestamp: new Date().toISOString()
    }));
});

// ======================================================
// SERVIDOR PRINCIPAL
// ======================================================
const servidor = http.createServer(async (peticion, respuesta) => {
    // CORS headers
    respuesta.setHeader('Access-Control-Allow-Origin', '*');
    respuesta.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    respuesta.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (peticion.method === 'OPTIONS') {
        respuesta.writeHead(204);
        respuesta.end();
        return;
    }

    const urlParseada = url.parse(peticion.url || '', true);
    const ruta = urlParseada.pathname || '/';
    const metodo = peticion.method || 'GET';

    console.log(`${metodo} ${ruta}`);

    // 1. Verificar si es una ruta de API registrada
    if (routes[ruta] && routes[ruta][metodo]) {
        try {
            await routes[ruta][metodo](peticion, respuesta, urlParseada.query);
        } catch (error) {
            console.error('Error en manejador:', error);
            respuesta.writeHead(500, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: 'Error interno del servidor' }));
        }
        return;
    }

    // ======================================================
    // API - AUTENTICACIÓN
    // ======================================================

    // Endpoint de login
    if (ruta === '/api/auth/login' && metodo === 'POST') {
        console.log('[API] POST /api/auth/login');

        let body = '';
        peticion.on('data', chunk => body += chunk);
        peticion.on('end', async () => {
            try {
                const { usuario, contrasena } = JSON.parse(body);
                const resultado = await procesarLogin(usuario, contrasena);

                respuesta.writeHead(200, { 'Content-Type': 'application/json' });
                respuesta.end(JSON.stringify(resultado));

            } catch (error) {
                console.error('Error en login:', error);
                respuesta.writeHead(500, { 'Content-Type': 'application/json' });
                respuesta.end(JSON.stringify({ success: false, error: error.message }));
            }
        });
        return;
    }

    // Endpoint de verificación de token
    if (ruta === '/api/auth/verify' && metodo === 'GET') {
        console.log('[API] GET /api/auth/verify');

        const token = peticion.headers['authorization']?.split(' ')[1];

        if (!token) {
            respuesta.writeHead(401, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ valid: false, error: 'Token requerido' }));
            return;
        }

        try {
            const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
            const expirado = payload.exp * 1000 < Date.now();

            if (expirado) {
                respuesta.writeHead(401, { 'Content-Type': 'application/json' });
                respuesta.end(JSON.stringify({ valid: false, error: 'Token expirado' }));
                return;
            }

            respuesta.writeHead(200, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ valid: true, usuario: payload }));

        } catch (error) {
            console.error('Error verificando token:', error);
            respuesta.writeHead(401, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ valid: false, error: 'Token invalido' }));
        }
        return;
    }

    // Endpoint de redirección según rol
    if (ruta === '/api/auth/redirect' && metodo === 'GET') {
        console.log('[API] GET /api/auth/redirect');

        const token = peticion.headers['authorization']?.split(' ')[1];

        if (!token) {
            respuesta.writeHead(401, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: 'Token requerido' }));
            return;
        }

        try {
            const parts = token.split('.');
            const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
            const rol = payload.rol;

            let redirectUrl = '/login';
            if (rol === 'AUDITOR') redirectUrl = '/auditor';
            else if (rol === 'ADMIN' || rol === 'SUPERVISOR' || rol === 'GERENCIA') redirectUrl = '/supervisor';

            console.log(`Redireccion: ${rol} -> ${redirectUrl}`);

            respuesta.writeHead(200, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ redirectUrl }));

        } catch (error) {
            respuesta.writeHead(401, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: 'Token invalido' }));
        }
        return;
    }

    // ======================================================
    // API - CAMBIO DE CONTRASEÑA
    // ======================================================
    if (ruta === '/api/auth/cambiar-password' && metodo === 'POST') {
        console.log('[API] POST /api/auth/cambiar-password');

        let body = '';
        peticion.on('data', chunk => body += chunk);
        peticion.on('end', async () => {
            try {
                const { usuarioId, nuevaPassword } = JSON.parse(body);
                const hashNuevo = hashSHA256(nuevaPassword);

                await pool.query(
                    'UPDATE usuarios SET contrasena = $1, primer_login = false, updated_at = NOW() WHERE id = $2',
                    [hashNuevo, usuarioId]
                );

                respuesta.writeHead(200, { 'Content-Type': 'application/json' });
                respuesta.end(JSON.stringify({ success: true, message: 'Contrasena actualizada' }));

            } catch (error) {
                console.error('Error cambiando password:', error);
                respuesta.writeHead(500, { 'Content-Type': 'application/json' });
                respuesta.end(JSON.stringify({ success: false, error: error.message }));
            }
        });
        return;
    }

    // ======================================================
    // Archivos estáticos (CSS, JS, IMG)
    // ======================================================
    if (ruta.startsWith('/css/') || ruta.startsWith('/js/') || ruta.startsWith('/img/')) {
        servirArchivoEstatico(ruta, respuesta);
        return;
    }

    // ✅ SERVIR PARTIALS USANDO servirVista() (REUTILIZA LA FUNCIÓN EXISTENTE)
    if (ruta.startsWith('/partials/')) {
        const vistaPath = ruta.substring(1); // Elimina el primer '/'
        // Ejemplo: '/partials/header-auditor.html' → 'partials/header-auditor.html'
        console.log(`[PARTIAL] Reutilizando servirVista para: ${vistaPath}`);
        servirVista(vistaPath, respuesta);
        return;
    }

    // ======================================================
    // API - SOLICITUDES
    // ======================================================

    // Obtener solicitudes de un usuario
    if (ruta.match(/^\/api\/solicitudes\/usuario\/\d+$/) && metodo === 'GET') {
        console.log('[API] GET solicitudes por usuario');

        const usuarioId = parseInt(ruta.split('/').pop());

        try {
            const result = await pool.query(
                'SELECT * FROM solicitudes_requerimientos WHERE solicitante_id = $1 ORDER BY created_at DESC',
                [usuarioId]
            );

            respuesta.writeHead(200, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify(result.rows || []));

        } catch (error) {
            console.error('Error en solicitudes/usuario:', error);
            respuesta.writeHead(500, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: error.message }));
        }
        return;
    }

    // Obtener todas las solicitudes
    if (ruta === '/api/solicitudes' && metodo === 'GET') {
        console.log('[API] GET todas las solicitudes');

        try {
            const result = await pool.query(
                'SELECT * FROM solicitudes_requerimientos ORDER BY created_at DESC'
            );

            respuesta.writeHead(200, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify(result.rows || []));

        } catch (error) {
            console.error('Error en solicitudes:', error);
            respuesta.writeHead(500, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: error.message }));
        }
        return;
    }

    // Crear nueva solicitud
    if (ruta === '/api/solicitudes' && metodo === 'POST') {
        console.log('[API] POST nueva solicitud');

        let body = '';
        peticion.on('data', chunk => body += chunk);
        peticion.on('end', async () => {
            try {
                const nueva = JSON.parse(body);
                const keys = Object.keys(nueva);
                const values = Object.values(nueva);
                const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
                const colNames = keys.join(', ');

                const result = await pool.query(
                    `INSERT INTO solicitudes_requerimientos (${colNames}) VALUES (${placeholders}) RETURNING *`,
                    values
                );

                respuesta.writeHead(201, { 'Content-Type': 'application/json' });
                respuesta.end(JSON.stringify({ success: true, solicitud: result.rows[0] }));

            } catch (error) {
                console.error('Error creando solicitud:', error);
                respuesta.writeHead(500, { 'Content-Type': 'application/json' });
                respuesta.end(JSON.stringify({ error: error.message }));
            }
        });
        return;
    }

    // ======================================================
    // API - EVALUACIONES
    // ======================================================

    // Obtener evaluaciones con filtros
    if (ruta === '/api/evaluaciones' && metodo === 'GET') {
        console.log('[API] GET evaluaciones');

        try {
            const { agente, evaluador, ticket, limite } = urlParseada.query;
            let query = 'SELECT * FROM evaluaciones WHERE 1=1';
            const params = [];
            let idx = 1;

            if (agente) { query += ` AND agente = $${idx++}`; params.push(agente); }
            if (evaluador) { query += ` AND evaluador = $${idx++}`; params.push(evaluador); }
            if (ticket) { query += ` AND ticket_psi = $${idx++}`; params.push(ticket); }

            query += ' ORDER BY timestamp DESC';

            if (limite) { query += ` LIMIT $${idx++}`; params.push(parseInt(limite)); }

            const result = await pool.query(query, params);

            respuesta.writeHead(200, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify(result.rows));

        } catch (error) {
            console.error('Error en evaluaciones:', error);
            respuesta.writeHead(500, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: error.message }));
        }
        return;
    }

    // Guardar evaluación (con detalles)
    if (ruta === '/api/evaluaciones' && metodo === 'POST') {
        console.log('[API] POST evaluacion');

        let body = '';
        peticion.on('data', chunk => body += chunk);
        peticion.on('end', async () => {
            const client = await pool.connect();
            try {
                await client.query('BEGIN');
                const evaluacion = JSON.parse(body);

                // 1. Insertar evaluación principal
                await client.query(`
                    INSERT INTO evaluaciones (id, timestamp, fecha, fecha_formateada, ticket_psi, agente, evaluador,
                        id_llamada, fecha_descarga, total_enc, total_ecuf, total_ecn, nota_final, rango,
                        tiempo_auditoria, tiempo_auditoria_formateado, fecha_registro, version_matriz_id)
                    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
                `, [
                    evaluacion.id, evaluacion.timestamp, evaluacion.fecha, evaluacion.fechaFormateada,
                    evaluacion.ticketPSI, evaluacion.agente, evaluacion.evaluador, evaluacion.idLlamada,
                    evaluacion.fechaDescarga || null, evaluacion.totalENC, evaluacion.totalECUF,
                    evaluacion.totalECN, evaluacion.notaFinal, evaluacion.rango, evaluacion.tiempoAuditoria,
                    evaluacion.tiempoAuditoriaFormateado, evaluacion.fechaRegistro,
                    evaluacion.versionMatrizId || null  // 🔴 NUEVO CAMPO
                ]);

                // 2. Insertar detalles
                if (evaluacion.detalles && evaluacion.detalles.length > 0) {
                    for (const d of evaluacion.detalles) {
                        if (!d.submotivo) continue;
                        await client.query(`
                            INSERT INTO detalles_evaluacion (evaluacion_id, bloque, atributo, submotivo, peso, cumple)
                            VALUES ($1, $2, $3, $4, $5, $6)
                        `, [
                            evaluacion.id, String(d.bloque || ''), String(d.atributo || ''),
                            String(d.submotivo), Number(d.peso) || 0,
                            d.cumple === true || d.cumple === 'true' || d.cumple === 1 || d.cumple === '1'
                        ]);
                    }
                }

                await client.query('COMMIT');

                respuesta.writeHead(201, { 'Content-Type': 'application/json' });
                respuesta.end(JSON.stringify({ success: true }));

            } catch (error) {
                await client.query('ROLLBACK');
                console.error('Error guardando evaluacion:', error);
                respuesta.writeHead(500, { 'Content-Type': 'application/json' });
                respuesta.end(JSON.stringify({ error: error.message }));
            } finally {
                client.release();
            }
        });
        return;
    }

    // Eliminar evaluación
    if (ruta.match(/^\/api\/evaluaciones\/[\w-]+$/) && metodo === 'DELETE') {
        console.log('[API] DELETE evaluacion');

        const evalId = ruta.split('/').pop();

        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            await client.query('DELETE FROM detalles_evaluacion WHERE evaluacion_id = $1', [evalId]);
            await client.query('DELETE FROM evaluaciones WHERE id = $1', [evalId]);
            await client.query('COMMIT');

            respuesta.writeHead(200, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ success: true }));

        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Error eliminando evaluacion:', error);
            respuesta.writeHead(500, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: error.message }));
        } finally {
            client.release();
        }
        return;
    }

    // Validar ticket duplicado
    if (ruta === '/api/evaluaciones/validar-ticket' && metodo === 'GET') {
        console.log('[API] GET validar-ticket');

        const ticket = urlParseada.query.ticket;

        try {
            const result = await pool.query(
                'SELECT id, ticket_psi, agente, nota_final, fecha_formateada FROM evaluaciones WHERE ticket_psi = $1 LIMIT 1',
                [ticket]
            );

            respuesta.writeHead(200, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify(result.rows[0] || null));

        } catch (error) {
            console.error('Error validando ticket:', error);
            respuesta.writeHead(500, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: error.message }));
        }
        return;
    }

    // Obtener detalles de evaluación
    if (ruta.match(/^\/api\/evaluaciones\/[\w-]+\/detalles$/) && metodo === 'GET') {
        console.log('[API] GET detalles evaluacion');

        const parts = ruta.split('/');
        const evaluacionId = parts[3];

        try {
            const result = await pool.query(
                'SELECT * FROM detalles_evaluacion WHERE evaluacion_id = $1',
                [evaluacionId]
            );

            respuesta.writeHead(200, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify(result.rows));

        } catch (error) {
            console.error('Error obteniendo detalles:', error);
            respuesta.writeHead(500, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: error.message }));
        }
        return;
    }

    // ======================================================
    // API - ESCUCHAS
    // ======================================================

    // Obtener asignaciones
    if (ruta === '/api/escuchas/asignaciones' && metodo === 'GET') {
        const token = peticion.headers['authorization']?.split(' ')[1];
        if (!token) {
            respuesta.writeHead(401, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: 'Token requerido' }));
            return;
        }
        
        try {
            const result = await pool.query('SELECT * FROM asignaciones_escucha ORDER BY fecha_asignacion DESC');
            respuesta.writeHead(200, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify(result.rows));
        } catch (error) {
            respuesta.writeHead(500, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify([]));
        }
        return;
    }

    // Crear asignaciones
    if (ruta === '/api/escuchas/asignaciones' && metodo === 'POST') {
        const token = peticion.headers['authorization']?.split(' ')[1];
        if (!token) {
            respuesta.writeHead(401, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: 'Token requerido' }));
            return;
        }
        
        let body = '';
        peticion.on('data', chunk => body += chunk);
        peticion.on('end', async () => {
            try {
                const { asignaciones } = JSON.parse(body);
                
                for (const asig of asignaciones) {
                    await pool.query(`
                        INSERT INTO asignaciones_escucha (
                            tarea_id, ticket, supervisor_responsable, gestor_auditado,
                            auditor_asignado, motivos, submotivos, subnivel, peticion,
                            usuario_dni, usuario_mov, motivo_call, fecha_descarga,
                            estado, fecha_asignacion, created_at, updated_at
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)
                    `, [
                        asig.tarea_id, asig.ticket, asig.supervisor_responsable, asig.gestor_auditado,
                        asig.auditor_asignado, asig.motivos, asig.submotivos, asig.subnivel, asig.peticion,
                        asig.usuario_dni, asig.usuario_mov, asig.motivo_call, asig.fecha_descarga,
                        asig.estado, asig.fecha_asignacion, asig.created_at, asig.updated_at
                    ]);
                }
                
                respuesta.writeHead(201, { 'Content-Type': 'application/json' });
                respuesta.end(JSON.stringify({ success: true, total: asignaciones.length }));
            } catch (error) {
                console.error('Error:', error);
                respuesta.writeHead(500, { 'Content-Type': 'application/json' });
                respuesta.end(JSON.stringify({ error: error.message }));
            }
        });
        return;
    }

    // Crear tarea (lote)
    if (ruta === '/api/escuchas/tareas' && metodo === 'POST') {
        const token = peticion.headers['authorization']?.split(' ')[1];
        if (!token) {
            respuesta.writeHead(401, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: 'Token requerido' }));
            return;
        }
        
        let body = '';
        peticion.on('data', chunk => body += chunk);
        peticion.on('end', async () => {
            try {
                const { fecha_carga, nombre_archivo, total_registros, estado, creado_por, created_at } = JSON.parse(body);
                
                const result = await pool.query(`
                    INSERT INTO tareas_escucha (fecha_carga, nombre_archivo, total_registros, estado, creado_por, created_at)
                    VALUES ($1, $2, $3, $4, $5, $6)
                    RETURNING id
                `, [fecha_carga, nombre_archivo, total_registros, estado, creado_por, created_at]);
                
                respuesta.writeHead(201, { 'Content-Type': 'application/json' });
                respuesta.end(JSON.stringify({ id: result.rows[0].id }));
            } catch (error) {
                console.error('Error:', error);
                respuesta.writeHead(500, { 'Content-Type': 'application/json' });
                respuesta.end(JSON.stringify({ error: error.message }));
            }
        });
        return;
    }

    // Mis escuchas (por auditor)
    if (ruta === '/api/escuchas/mis-escuchas' && metodo === 'GET') {
        console.log('[API] GET mis-escuchas');

        const auditor = urlParseada.query.auditor;

        try {
            const result = await pool.query(
                `SELECT * FROM asignaciones_escucha
                 WHERE auditor_asignado = $1 AND audio_disponible = true AND estado IN ('pendiente', 'en_proceso')`,
                [auditor]
            );

            respuesta.writeHead(200, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify(result.rows));

        } catch (error) {
            console.error('Error en mis-escuchas:', error);
            respuesta.writeHead(500, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: error.message }));
        }
        return;
    }

    // Iniciar gestión de escucha
    if (ruta.match(/^\/api\/escuchas\/[\w-]+\/iniciar$/) && metodo === 'POST') {
        console.log('[API] POST iniciar escucha');

        const id = ruta.split('/')[3];

        try {
            await pool.query(
                "UPDATE asignaciones_escucha SET estado = 'en_proceso', updated_at = NOW() WHERE id = $1",
                [id]
            );

            respuesta.writeHead(200, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ success: true }));

        } catch (error) {
            console.error('Error iniciando escucha:', error);
            respuesta.writeHead(500, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: error.message }));
        }
        return;
    }

    // Reportar incidencia
    if (ruta.match(/^\/api\/escuchas\/[\w-]+\/incidencia$/) && metodo === 'POST') {
        console.log('[API] POST incidencia escucha');

        const id = ruta.split('/')[3];
        let body = '';
        peticion.on('data', chunk => body += chunk);
        peticion.on('end', async () => {
            try {
                const { motivo } = JSON.parse(body);

                await pool.query(
                    `UPDATE asignaciones_escucha
                     SET audio_disponible = false, motivo_incidencia = $1, fecha_incidencia = NOW(), updated_at = NOW()
                     WHERE id = $2`,
                    [motivo, id]
                );

                respuesta.writeHead(200, { 'Content-Type': 'application/json' });
                respuesta.end(JSON.stringify({ success: true }));

            } catch (error) {
                console.error('Error reportando incidencia:', error);
                respuesta.writeHead(500, { 'Content-Type': 'application/json' });
                respuesta.end(JSON.stringify({ error: error.message }));
            }
        });
        return;
    }

    // Marcar escucha como gestionada
    if (ruta.match(/^\/api\/escuchas\/[\w-]+\/gestionar$/) && metodo === 'PUT') {
        console.log('[API] PUT gestionar escucha');

        const id = ruta.split('/')[3];

        try {
            await pool.query(
                `UPDATE asignaciones_escucha
                 SET estado = 'gestionado', fecha_gestion = NOW(), updated_at = NOW()
                 WHERE id = $1`,
                [id]
            );

            respuesta.writeHead(200, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ success: true }));

        } catch (error) {
            console.error('Error gestionando escucha:', error);
            respuesta.writeHead(500, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: error.message }));
        }
        return;
    }

    // Cancelar gestión de escucha
    if (ruta.match(/^\/api\/escuchas\/[\w-]+\/cancelar$/) && metodo === 'PUT') {
        console.log('[API] PUT cancelar escucha');

        const id = ruta.split('/')[3];

        try {
            await pool.query(
                "UPDATE asignaciones_escucha SET estado = 'pendiente', updated_at = NOW() WHERE id = $1",
                [id]
            );

            respuesta.writeHead(200, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ success: true }));

        } catch (error) {
            console.error('Error cancelando escucha:', error);
            respuesta.writeHead(500, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: error.message }));
        }
        return;
    }

    // Reactivar escucha por ticket
    if (ruta === '/api/escuchas/reactivar' && metodo === 'PUT') {
        console.log('[API] PUT reactivar escucha');

        const ticket = urlParseada.query.ticket;

        try {
            const check = await pool.query(
                'SELECT id FROM asignaciones_escucha WHERE ticket = $1 LIMIT 1',
                [ticket]
            );

            if (check.rows.length > 0) {
                await pool.query(
                    "UPDATE asignaciones_escucha SET estado = 'pendiente', updated_at = NOW() WHERE ticket = $1",
                    [ticket]
                );
            }

            respuesta.writeHead(200, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ success: true }));

        } catch (error) {
            console.error('Error reactivando escucha:', error);
            respuesta.writeHead(500, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: error.message }));
        }
        return;
    }

    // ======================================================
    // API - AGENTES
    // ======================================================

    // Obtener agentes (con filtros por líder, ubicación, localidad)
    if (ruta === '/api/agentes' && metodo === 'GET') {
        console.log('[API] GET agentes');
        
        const token = peticion.headers['authorization']?.split(' ')[1];
        if (!token) {
            respuesta.writeHead(401, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: 'Token requerido' }));
            return;
        }
        
        try {
            const { lider, ubicacion, localidad } = urlParseada.query;
            // 🔴 MODIFICADO: Incluir id, estado, created_at
            let query = `SELECT id, nombre, lider_2026, ubicacion, localidad, estado, created_at, categoria_label 
                        FROM agentes 
                        WHERE 1=1`;
            const params = [];
            let idx = 1;
            
            if (lider) {
                query += ` AND lider_2026 = $${idx++}`;
                params.push(lider);
            }
            if (ubicacion) {
                query += ` AND ubicacion = $${idx++}`;
                params.push(ubicacion);
            }
            if (localidad) {
                query += ` AND localidad = $${idx++}`;
                params.push(localidad);
            }
            
            query += ' ORDER BY nombre';
            
            const result = await pool.query(query, params);
            
            console.log(`   ✅ ${result.rows.length} agentes encontrados`);
            
            respuesta.writeHead(200, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify(result.rows));
            
        } catch (error) {
            console.error('❌ Error en agentes:', error);
            respuesta.writeHead(500, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: error.message }));
        }
        return;
    }
    
    // ======================================================
    // API - AGENTES - Actualizar agente
    // ======================================================
    if (ruta.match(/^\/api\/agentes\/\d+$/) && metodo === 'PUT') {
        console.log('[API] PUT /api/agentes/:id');
        
        const token = peticion.headers['authorization']?.split(' ')[1];
        if (!token) {
            respuesta.writeHead(401, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: 'Token requerido' }));
            return;
        }
        
        const id = parseInt(ruta.split('/').pop());
        
        let body = '';
        peticion.on('data', chunk => body += chunk);
        peticion.on('end', async () => {
            try {
                const datos = JSON.parse(body);
                
                // Construir la consulta de actualización
                const updates = [];
                const values = [];
                let idx = 1;
                
                if (datos.nombre !== undefined) {
                    updates.push(`nombre = $${idx++}`);
                    values.push(datos.nombre);
                }
                if (datos.estado !== undefined) {
                    updates.push(`estado = $${idx++}`);
                    values.push(datos.estado);
                }
                if (datos.lider_2026 !== undefined) {
                    updates.push(`lider_2026 = $${idx++}`);
                    values.push(datos.lider_2026);
                }
                if (datos.ubicacion !== undefined) {
                    updates.push(`ubicacion = $${idx++}`);
                    values.push(datos.ubicacion);
                }
                if (datos.localidad !== undefined) {
                    updates.push(`localidad = $${idx++}`);
                    values.push(datos.localidad);
                }
                if (datos.categoria_label !== undefined) {
                    updates.push(`categoria_label = $${idx++}`);
                    values.push(datos.categoria_label);
                }
                if (datos.funciones !== undefined) {
                    updates.push(`funciones = $${idx++}`);
                    values.push(datos.funciones);
                }
                
                updates.push(`updated_at = NOW()`);
                
                if (updates.length === 1) {
                    respuesta.writeHead(400, { 'Content-Type': 'application/json' });
                    respuesta.end(JSON.stringify({ error: 'No hay datos para actualizar' }));
                    return;
                }
                
                values.push(id);
                
                const query = `UPDATE agentes SET ${updates.join(', ')} WHERE id = $${idx}`;
                
                const result = await pool.query(query, values);
                
                if (result.rowCount === 0) {
                    respuesta.writeHead(404, { 'Content-Type': 'application/json' });
                    respuesta.end(JSON.stringify({ error: 'Agente no encontrado' }));
                    return;
                }
                
                console.log(`✅ Agente ID ${id} actualizado`);
                
                respuesta.writeHead(200, { 'Content-Type': 'application/json' });
                respuesta.end(JSON.stringify({ success: true, message: 'Agente actualizado correctamente' }));
                
            } catch (error) {
                console.error('Error actualizando agente:', error);
                respuesta.writeHead(500, { 'Content-Type': 'application/json' });
                respuesta.end(JSON.stringify({ error: error.message }));
            }
        });
        return;
    }

    // ======================================================
    // API - AGENTES - Eliminar agente
    // ======================================================
    if (ruta.match(/^\/api\/agentes\/\d+$/) && metodo === 'DELETE') {
        console.log('[API] DELETE /api/agentes/:id');
        
        const token = peticion.headers['authorization']?.split(' ')[1];
        if (!token) {
            respuesta.writeHead(401, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: 'Token requerido' }));
            return;
        }
        
        const id = parseInt(ruta.split('/').pop());
        
        try {
            const result = await pool.query('DELETE FROM agentes WHERE id = $1 RETURNING id', [id]);
            
            if (result.rowCount === 0) {
                respuesta.writeHead(404, { 'Content-Type': 'application/json' });
                respuesta.end(JSON.stringify({ error: 'Agente no encontrado' }));
                return;
            }
            
            console.log(`✅ Agente ID ${id} eliminado`);
            
            respuesta.writeHead(200, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ success: true, message: 'Agente eliminado correctamente' }));
            
        } catch (error) {
            console.error('Error eliminando agente:', error);
            respuesta.writeHead(500, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: error.message }));
        }
        return;
    }

    // GET /api/rol-pestanas
    if (ruta === '/api/rol-pestanas' && metodo === 'GET') {
        const token = peticion.headers['authorization']?.split(' ')[1];
        if (!token) {
            respuesta.writeHead(401, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: 'Token requerido' }));
            return;
        }
        
        try {
            const result = await pool.query('SELECT * FROM rol_pestanas');
            respuesta.writeHead(200, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify(result.rows));
        } catch (error) {
            respuesta.writeHead(500, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify([]));
        }
        return;
    }

    // ======================================================
    // API - AGENTES - Obtener agente por ID
    // ======================================================
    if (ruta.match(/^\/api\/agentes\/\d+$/) && metodo === 'GET') {
        const token = peticion.headers['authorization']?.split(' ')[1];
        if (!token) {
            respuesta.writeHead(401, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: 'Token requerido' }));
            return;
        }
        
        const id = parseInt(ruta.split('/').pop());
        
        try {
            const result = await pool.query('SELECT * FROM agentes WHERE id = $1', [id]);
            if (result.rows.length === 0) {
                respuesta.writeHead(404, { 'Content-Type': 'application/json' });
                respuesta.end(JSON.stringify({ error: 'Agente no encontrado' }));
                return;
            }
            respuesta.writeHead(200, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify(result.rows[0]));
        } catch (error) {
            respuesta.writeHead(500, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: error.message }));
        }
        return;
    }

    // ======================================================
    // API - AGENTES - Obtener categorías únicas
    // ======================================================
    if (ruta === '/api/agentes/categorias' && metodo === 'GET') {
        console.log('[API] GET /api/agentes/categorias');
        
        const token = peticion.headers['authorization']?.split(' ')[1];
        if (!token) {
            respuesta.writeHead(401, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: 'Token requerido' }));
            return;
        }
        
        try {
            const result = await pool.query(`
                SELECT DISTINCT categoria_label 
                FROM agentes 
                WHERE categoria_label IS NOT NULL 
                AND categoria_label != ''
                ORDER BY categoria_label
            `);
            
            const categorias = result.rows.map(row => row.categoria_label);
            console.log(`✅ ${categorias.length} categorías encontradas`);
            
            respuesta.writeHead(200, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify(categorias));
            
        } catch (error) {
            console.error('❌ Error en categorias:', error);
            respuesta.writeHead(500, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify([]));
        }
        return;
    }

    // Obtener agentes completo
    if (ruta === '/api/agentes/completo' && metodo === 'GET') {
        console.log('[API] GET agentes completo');

        try {
            const result = await pool.query('SELECT * FROM agentes ORDER BY id');
            respuesta.writeHead(200, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify(result.rows));
        } catch (error) {
            console.error('Error en agentes completo:', error);
            respuesta.writeHead(500, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: error.message }));
        }
        return;
    }

    // ======================================================
    // API - AGENTES - Exportar a CSV
    // ======================================================
    if (ruta === '/api/agentes/exportar' && metodo === 'GET') {
        console.log('[API] GET /api/agentes/exportar');
        
        const token = peticion.headers['authorization']?.split(' ')[1];
        if (!token) {
            respuesta.writeHead(401, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: 'Token requerido' }));
            return;
        }
        
        try {
            const result = await pool.query(`
                SELECT 
                    id, 
                    nombre, 
                    dni, 
                    carnet, 
                    correo, 
                    estado, 
                    lider_2026, 
                    ubicacion, 
                    localidad, 
                    categoria_label, 
                    funciones,
                    TO_CHAR(created_at, 'DD/MM/YYYY') as fecha_registro
                FROM agentes 
                ORDER BY nombre
            `);
            
            const agentes = result.rows;
            
            // Crear CSV
            const headers = ['ID', 'Nombre', 'DNI', 'Carnet', 'Correo', 'Estado', 'Líder', 'Ubicación', 'Localidad', 'Categoría', 'Funciones', 'Fecha Registro'];
            const csvRows = [headers.join(',')];
            
            for (const agente of agentes) {
                const values = headers.map(header => {
                    let value = '';
                    switch (header) {
                        case 'ID': value = agente.id; break;
                        case 'Nombre': value = agente.nombre; break;
                        case 'DNI': value = agente.dni || ''; break;
                        case 'Carnet': value = agente.carnet || ''; break;
                        case 'Correo': value = agente.correo || ''; break;
                        case 'Estado': value = agente.estado || ''; break;
                        case 'Líder': value = agente.lider_2026 || ''; break;
                        case 'Ubicación': value = agente.ubicacion || ''; break;
                        case 'Localidad': value = agente.localidad || ''; break;
                        case 'Categoría': value = agente.categoria_label || ''; break;
                        case 'Funciones': value = agente.funciones || ''; break;
                        case 'Fecha Registro': value = agente.fecha_registro || ''; break;
                    }
                    // Escapar comillas
                    if (typeof value === 'string') {
                        value = value.replace(/"/g, '""');
                    }
                    return `"${value}"`;
                }).join(',');
                csvRows.push(values);
            }
            
            const csvContent = "\uFEFF" + csvRows.join('\n');
            
            respuesta.writeHead(200, {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="agentes_${new Date().toISOString().slice(0, 10)}.csv"`
            });
            respuesta.end(csvContent);
            
        } catch (error) {
            console.error('❌ Error exportando agentes:', error);
            respuesta.writeHead(500, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: error.message }));
        }
        return;
    }


    // ======================================================
    // API - USUARIOS
    // ======================================================

    // Obtener auditores
    if (ruta === '/api/usuarios/auditores' && metodo === 'GET') {
        console.log('[API] GET auditores');

        try {
            const result = await pool.query(
                "SELECT nombre FROM usuarios WHERE tipo = 'AUDITOR' ORDER BY nombre"
            );
            respuesta.writeHead(200, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify(result.rows));
        } catch (error) {
            console.error('Error en auditores:', error);
            respuesta.writeHead(500, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: error.message }));
        }
        return;
    }

    // ======================================================
    // API - USUARIOS - Auditores Activos (VERSIÓN CORREGIDA - SIN EMAIL)
    // ======================================================

    if (ruta === '/api/usuarios/auditores-activos' && metodo === 'GET') {
        console.log('[API] GET /api/usuarios/auditores-activos');
        
        // Verificar token
        const token = peticion.headers['authorization']?.split(' ')[1];
        
        if (!token) {
            respuesta.writeHead(401, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: 'Token requerido' }));
            return;
        }
        
        try {
            // Decodificar token para validar
            const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
            
            if (payload.exp * 1000 < Date.now()) {
                respuesta.writeHead(401, { 'Content-Type': 'application/json' });
                respuesta.end(JSON.stringify({ error: 'Token expirado' }));
                return;
            }
            
            // 🔴 CONSULTA SIN LA COLUMNA 'email' (no existe en la tabla)
            const result = await pool.query(
                `SELECT id, usuario, nombre_completo, activo, ultimo_login, created_at
                FROM usuarios 
                WHERE rol = 'AUDITOR' AND activo = true 
                ORDER BY nombre_completo`
            );
            
            console.log(`✅ ${result.rows.length} auditores activos encontrados`);
            
            respuesta.writeHead(200, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify(result.rows));
            
        } catch (error) {
            console.error('❌ Error en auditores-activos:', error);
            console.error('Detalle:', error.message);
            
            respuesta.writeHead(500, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ 
                error: 'Error interno del servidor',
                details: error.message 
            }));
        }
        return;
    }

    // ======================================================
    // API - USUARIOS - Obtener todos los usuarios
    // ======================================================
    if (ruta === '/api/usuarios' && metodo === 'GET') {
        console.log('[API] GET /api/usuarios');
        
        const token = peticion.headers['authorization']?.split(' ')[1];
        if (!token) {
            respuesta.writeHead(401, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: 'Token requerido' }));
            return;
        }
        
        try {
            const result = await pool.query(`
                SELECT 
                    u.id, 
                    u.usuario, 
                    u.nombre_completo, 
                    u.activo, 
                    u.created_at,
                    u.ultimo_login,
                    r.id as rol_id,
                    r.codigo as rol_codigo,
                    r.nombre as rol_nombre
                FROM usuarios u
                LEFT JOIN roles r ON u.rol_id = r.id
                ORDER BY u.usuario
            `);
            
            respuesta.writeHead(200, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify(result.rows));
            
        } catch (error) {
            console.error('Error en /api/usuarios:', error);
            respuesta.writeHead(500, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: error.message }));
        }
        return;
    }

    // ======================================================
    // API - USUARIOS - Crear nuevo usuario
    // ======================================================
    if (ruta === '/api/usuarios' && metodo === 'POST') {
        console.log('[API] POST /api/usuarios');
        
        const token = peticion.headers['authorization']?.split(' ')[1];
        if (!token) {
            respuesta.writeHead(401, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: 'Token requerido' }));
            return;
        }
        
        let body = '';
        peticion.on('data', chunk => body += chunk);
        peticion.on('end', async () => {
            try {
                const { usuario, nombre_completo, contrasena, rol_id, activo } = JSON.parse(body);
                
                // Validaciones básicas
                if (!usuario || !nombre_completo || !contrasena || !rol_id) {
                    respuesta.writeHead(400, { 'Content-Type': 'application/json' });
                    respuesta.end(JSON.stringify({ error: 'Faltan campos requeridos' }));
                    return;
                }
                
                // Verificar si ya existe
                const existe = await pool.query('SELECT id FROM usuarios WHERE usuario = $1', [usuario]);
                if (existe.rows.length > 0) {
                    respuesta.writeHead(400, { 'Content-Type': 'application/json' });
                    respuesta.end(JSON.stringify({ error: 'El usuario ya existe' }));
                    return;
                }
                
                // Hashear contraseña
                const hashPassword = crypto.createHash('sha256').update(contrasena).digest('hex');
                
                // Obtener siguiente ID
                const maxId = await pool.query('SELECT COALESCE(MAX(id), 0) + 1 as next_id FROM usuarios');
                const nuevoId = maxId.rows[0].next_id;
                
                // Insertar usuario
                const result = await pool.query(`
                    INSERT INTO usuarios (id, usuario, nombre_completo, contrasena, rol_id, activo, created_at, updated_at)
                    VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
                    RETURNING id, usuario, nombre_completo, activo
                `, [nuevoId, usuario, nombre_completo, hashPassword, rol_id, activo]);
                
                console.log(`✅ Usuario creado: ${usuario} (ID: ${nuevoId})`);
                
                respuesta.writeHead(201, { 'Content-Type': 'application/json' });
                respuesta.end(JSON.stringify({ success: true, usuario: result.rows[0] }));
                
            } catch (error) {
                console.error('Error creando usuario:', error);
                respuesta.writeHead(500, { 'Content-Type': 'application/json' });
                respuesta.end(JSON.stringify({ error: error.message }));
            }
        });
        return;
    }


    // ======================================================
    // API - ROLES - Obtener todos los roles (GET)
    // ======================================================
    if (ruta === '/api/roles' && metodo === 'GET') {
        console.log('[API] GET /api/roles');
        
        const token = peticion.headers['authorization']?.split(' ')[1];
        if (!token) {
            respuesta.writeHead(401, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: 'Token requerido' }));
            return;
        }
        
        try {
            const result = await pool.query(`
                SELECT id, codigo, nombre, activo, created_at, updated_at
                FROM roles
                ORDER BY id
            `);
            
            respuesta.writeHead(200, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify(result.rows));
            
        } catch (error) {
            console.error('Error obteniendo roles:', error);
            respuesta.writeHead(500, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: error.message }));
        }
        return;
    }

    // ======================================================
    // API - USUARIOS - Eliminar usuario (DELETE)
    // ======================================================
    if (ruta.match(/^\/api\/usuarios\/\d+$/) && metodo === 'DELETE') {
        console.log('[API] DELETE /api/usuarios/:id');
        
        const token = peticion.headers['authorization']?.split(' ')[1];
        if (!token) {
            respuesta.writeHead(401, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: 'Token requerido' }));
            return;
        }
        
        const id = parseInt(ruta.split('/').pop());
        
        try {
            const check = await pool.query('SELECT id FROM usuarios WHERE id = $1', [id]);
            if (check.rows.length === 0) {
                respuesta.writeHead(404, { 'Content-Type': 'application/json' });
                respuesta.end(JSON.stringify({ error: 'Usuario no encontrado' }));
                return;
            }
            
            await pool.query('DELETE FROM usuarios WHERE id = $1', [id]);
            
            console.log(`✅ Usuario ID ${id} eliminado`);
            
            respuesta.writeHead(200, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ success: true, message: 'Usuario eliminado' }));
            
        } catch (error) {
            console.error('Error:', error);
            respuesta.writeHead(500, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: error.message }));
        }
        return;
    }

    // ======================================================
    // API - USUARIOS - Exportar a CSV
    // ======================================================
    if (ruta === '/api/usuarios/exportar' && metodo === 'GET') {
        console.log('[API] GET /api/usuarios/exportar');
        
        const token = peticion.headers['authorization']?.split(' ')[1];
        if (!token) {
            respuesta.writeHead(401, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: 'Token requerido' }));
            return;
        }
        
        try {
            const result = await pool.query(`
                SELECT 
                    u.id, 
                    u.usuario, 
                    u.nombre_completo, 
                    CASE WHEN u.activo = true THEN 'Activo' ELSE 'Inactivo' END as estado,
                    r.codigo as rol,
                    TO_CHAR(u.created_at, 'DD/MM/YYYY') as fecha_registro,
                    TO_CHAR(u.ultimo_login, 'DD/MM/YYYY HH24:MI') as ultimo_login
                FROM usuarios u
                LEFT JOIN roles r ON u.rol_id = r.id
                ORDER BY u.id
            `);
            
            const usuarios = result.rows;
            
            // Crear CSV
            const headers = ['ID', 'Usuario', 'Nombre Completo', 'Estado', 'Rol', 'Fecha Registro', 'Último Login'];
            const csvRows = [headers.join(',')];
            
            for (const user of usuarios) {
                const values = headers.map(header => {
                    let value = '';
                    switch (header) {
                        case 'ID': value = user.id; break;
                        case 'Usuario': value = user.usuario; break;
                        case 'Nombre Completo': value = user.nombre_completo || ''; break;
                        case 'Estado': value = user.estado; break;
                        case 'Rol': value = user.rol || ''; break;
                        case 'Fecha Registro': value = user.fecha_registro || ''; break;
                        case 'Último Login': value = user.ultimo_login || ''; break;
                    }
                    // Escapar comillas
                    if (typeof value === 'string') {
                        value = value.replace(/"/g, '""');
                    }
                    return `"${value}"`;
                }).join(',');
                csvRows.push(values);
            }
            
            const csvContent = "\uFEFF" + csvRows.join('\n');
            
            respuesta.writeHead(200, {
                'Content-Type': 'text/csv; charset=utf-8',
                'Content-Disposition': `attachment; filename="usuarios_${new Date().toISOString().slice(0, 10)}.csv"`
            });
            respuesta.end(csvContent);
            
        } catch (error) {
            console.error('Error exportando usuarios:', error);
            respuesta.writeHead(500, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: error.message }));
        }
        return;
    }

    // ======================================================
    // API - ROLES - Crear nuevo rol (POST)
    // ======================================================
    if (ruta === '/api/roles' && metodo === 'POST') {
        console.log('[API] POST /api/roles');
        
        const token = peticion.headers['authorization']?.split(' ')[1];
        if (!token) {
            respuesta.writeHead(401, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: 'Token requerido' }));
            return;
        }
        
        let body = '';
        peticion.on('data', chunk => body += chunk);
        peticion.on('end', async () => {
            try {
                const { codigo, nombre, activo } = JSON.parse(body);
                
                console.log(`📝 Creando rol: ${codigo} - ${nombre}`);
                
                // Verificar si ya existe
                const existe = await pool.query('SELECT id FROM roles WHERE codigo = $1', [codigo]);
                if (existe.rows.length > 0) {
                    respuesta.writeHead(400, { 'Content-Type': 'application/json' });
                    respuesta.end(JSON.stringify({ error: 'El código de rol ya existe' }));
                    return;
                }
                
                // Insertar nuevo rol
                const result = await pool.query(`
                    INSERT INTO roles (codigo, nombre, activo, created_at, updated_at)
                    VALUES ($1, $2, $3, NOW(), NOW())
                    RETURNING id, codigo, nombre, activo
                `, [codigo, nombre, activo]);
                
                console.log(`✅ Rol "${nombre}" creado con ID ${result.rows[0].id}`);
                
                respuesta.writeHead(201, { 'Content-Type': 'application/json' });
                respuesta.end(JSON.stringify({ success: true, rol: result.rows[0] }));
                
            } catch (error) {
                console.error('Error creando rol:', error);
                respuesta.writeHead(500, { 'Content-Type': 'application/json' });
                respuesta.end(JSON.stringify({ error: error.message }));
            }
        });
        return;
    }

    // ======================================================
    // API - REPORTES (Supervisor)
    // ======================================================

    // KPIs
    if (ruta === '/api/reportes/kpis' && metodo === 'GET') {
        console.log('[API] GET kpis');

        try {
            const result = await pool.query(
                'SELECT * FROM evaluaciones ORDER BY timestamp DESC'
            );
            respuesta.writeHead(200, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify(result.rows));
        } catch (error) {
            console.error('Error en kpis:', error);
            respuesta.writeHead(500, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: error.message }));
        }
        return;
    }

    // Ranking
    if (ruta === '/api/reportes/ranking' && metodo === 'GET') {
        console.log('[API] GET ranking');

        try {
            const result = await pool.query(
                'SELECT * FROM evaluaciones ORDER BY timestamp DESC'
            );
            respuesta.writeHead(200, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify(result.rows));
        } catch (error) {
            console.error('Error en ranking:', error);
            respuesta.writeHead(500, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: error.message }));
        }
        return;
    }

// ======================================================
// API - REPORTES - Meses disponibles (VERSIÓN CORREGIDA)
// ======================================================
if (ruta === '/api/reportes/meses-disponibles' && metodo === 'GET') {
    console.log('[API] GET /api/reportes/meses-disponibles');
    
    const token = peticion.headers['authorization']?.split(' ')[1];
    if (!token) {
        respuesta.writeHead(401, { 'Content-Type': 'application/json' });
        respuesta.end(JSON.stringify({ error: 'Token requerido' }));
        return;
    }
    
    try {
        // 🔴 CONSULTA CORREGIDA - Obtener TODAS las fechas
        const result = await pool.query(`
            SELECT fecha_formateada 
            FROM evaluaciones 
            WHERE fecha_formateada IS NOT NULL 
            AND fecha_formateada != ''
            ORDER BY fecha_formateada DESC
        `);
        
        console.log(`📊 Se obtuvieron ${result.rows.length} registros con fecha_formateada`);
        
        // Procesar resultados para obtener meses únicos
        const mesesMap = new Map();
        const mesesNombres = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        
        for (const row of result.rows) {
            const fechaStr = row.fecha_formateada;
            if (fechaStr && fechaStr.includes('/')) {
                const partes = fechaStr.split('/');
                if (partes.length >= 3) {
                    const dia = partes[0];
                    const mes = parseInt(partes[1]);
                    const anio = parseInt(partes[2]);
                    
                    if (!isNaN(anio) && !isNaN(mes) && mes >= 1 && mes <= 12) {
                        const key = `${anio}-${mes.toString().padStart(2, '0')}`;
                        if (!mesesMap.has(key)) {
                            mesesMap.set(key, {
                                anio: anio,
                                mes: mes,
                                valor: key,
                                label: `${mesesNombres[mes-1]} ${anio}`
                            });
                        }
                    }
                }
            }
        }
        
        // Convertir a array y ordenar (más reciente primero)
        const meses = Array.from(mesesMap.values()).sort((a, b) => {
            if (a.anio !== b.anio) return b.anio - a.anio;
            return b.mes - a.mes;
        });
        
        console.log(`✅ ${meses.length} meses disponibles únicos`);
        
        respuesta.writeHead(200, { 'Content-Type': 'application/json' });
        respuesta.end(JSON.stringify(meses));
        
    } catch (error) {
        console.error('❌ Error en meses-disponibles:', error);
        // En caso de error, devolver array vacío
        respuesta.writeHead(200, { 'Content-Type': 'application/json' });
        respuesta.end(JSON.stringify([]));
    }
    return;
}

    // Evolutivo
    if (ruta === '/api/reportes/evolutivo' && metodo === 'GET') {
        console.log('[API] GET evolutivo');

        const periodo = urlParseada.query.periodo || 'dia';

        try {
            const result = await pool.query(
                'SELECT * FROM evaluaciones ORDER BY timestamp ASC'
            );
            respuesta.writeHead(200, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify(result.rows));
        } catch (error) {
            console.error('Error en evolutivo:', error);
            respuesta.writeHead(500, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: error.message }));
        }
        return;
    }

    // Top fallas
    if (ruta === '/api/reportes/top-fallas' && metodo === 'GET') {
        console.log('[API] GET top-fallas');

        try {
            const result = await pool.query(
                'SELECT * FROM detalles_evaluacion WHERE cumple = false'
            );
            respuesta.writeHead(200, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify(result.rows));
        } catch (error) {
            console.error('Error en top-fallas:', error);
            respuesta.writeHead(500, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: error.message }));
        }
        return;
    }

    // ======================================================
    // API - REPORTES - Errores por auditor (VERSIÓN COMPLETA CON DETALLES)
    // ======================================================
    if (ruta === '/api/reportes/errores-auditores' && metodo === 'GET') {
        console.log('[API] GET /api/reportes/errores-auditores');
        
        const token = peticion.headers['authorization']?.split(' ')[1];
        if (!token) {
            respuesta.writeHead(401, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: 'Token requerido' }));
            return;
        }
        
        try {
            const { periodo, auditor } = urlParseada.query;
            const periodoDias = parseInt(periodo) || 30;
            
            // Obtener evaluaciones con detalles
            const result = await pool.query(`
                SELECT 
                    e.id,
                    e.evaluador,
                    e.fecha_formateada,
                    e.agente,
                    d.id as detalle_id,
                    d.bloque,
                    d.atributo,
                    d.submotivo,
                    d.peso,
                    d.cumple
                FROM evaluaciones e
                LEFT JOIN detalles_evaluacion d ON e.id = d.evaluacion_id
                WHERE e.fecha_formateada IS NOT NULL
                ORDER BY e.fecha DESC
            `);
            
            // Calcular fecha límite
            const fechaLimite = new Date();
            fechaLimite.setDate(fechaLimite.getDate() - periodoDias);
            
            // Procesar en JavaScript
            const erroresPorAuditorPorFecha = {};
            const auditoresSet = new Set();
            const fechasSet = new Set();
            const detallesPorAuditorPorFecha = {};  // 🔴 CLAVE: Inicializar detalles
            
            for (const row of result.rows) {
                // Filtrar por auditor
                if (auditor !== 'todos' && row.evaluador !== auditor) continue;
                
                // Parsear fecha
                let fechaStr = '';
                let fechaEval = null;
                
                if (row.fecha_formateada) {
                    fechaStr = row.fecha_formateada.split(' ')[0];
                    const partes = fechaStr.split('/');
                    if (partes.length === 3) {
                        fechaEval = new Date(partes[2], partes[1] - 1, partes[0]);
                    }
                }
                
                // Filtrar por período
                if (fechaEval && fechaEval < fechaLimite) continue;
                if (!fechaStr) continue;
                
                if (row.evaluador) auditoresSet.add(row.evaluador);
                fechasSet.add(fechaStr);
                
                const esError = row.cumple === false || row.cumple === 0 || row.cumple === 'false';
                
                if (esError && row.detalle_id) {
                    // Contar errores por fecha
                    if (!erroresPorAuditorPorFecha[row.evaluador]) {
                        erroresPorAuditorPorFecha[row.evaluador] = {};
                    }
                    if (!erroresPorAuditorPorFecha[row.evaluador][fechaStr]) {
                        erroresPorAuditorPorFecha[row.evaluador][fechaStr] = 0;
                    }
                    erroresPorAuditorPorFecha[row.evaluador][fechaStr]++;
                    
                    // 🔴 GUARDAR DETALLES
                    if (!detallesPorAuditorPorFecha[row.evaluador]) {
                        detallesPorAuditorPorFecha[row.evaluador] = {};
                    }
                    if (!detallesPorAuditorPorFecha[row.evaluador][fechaStr]) {
                        detallesPorAuditorPorFecha[row.evaluador][fechaStr] = [];
                    }
                    detallesPorAuditorPorFecha[row.evaluador][fechaStr].push({
                        agente: row.agente,
                        errores: [{
                            bloque: row.bloque || '',
                            atributo: row.atributo || '',
                            submotivo: row.submotivo || '',
                            peso: row.peso || 0
                        }]
                    });
                }
            }
            
            // Ordenar fechas
            const fechasOrdenadas = Array.from(fechasSet).sort((a, b) => {
                const [diaA, mesA, anioA] = a.split('/');
                const [diaB, mesB, anioB] = b.split('/');
                return new Date(anioB, mesB-1, diaB) - new Date(anioA, mesA-1, diaA);
            });
            
            const auditoresLista = Array.from(auditoresSet).sort();
            
            console.log(`✅ Auditores: ${auditoresLista.length}, Fechas: ${fechasOrdenadas.length}`);
            
            // 🔴 CLAVE: Incluir detallesPorAuditorPorFecha en la respuesta
            respuesta.writeHead(200, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({
                erroresPorAuditorPorFecha,
                fechasOrdenadas,
                auditores: auditoresLista,
                detallesPorAuditorPorFecha  // <--- ESTO ES LO QUE FALTA
            }));
            
        } catch (error) {
            console.error('❌ Error:', error);
            respuesta.writeHead(200, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({
                erroresPorAuditorPorFecha: {},
                fechasOrdenadas: [],
                auditores: [],
                detallesPorAuditorPorFecha: {}
            }));
        }
        return;
    }
    

    // Evaluaciones con detalles
    if (ruta === '/api/reportes/evaluaciones-con-detalles' && metodo === 'GET') {
        console.log('[API] GET evaluaciones-con-detalles');

        try {
            const evalResult = await pool.query(
                'SELECT * FROM evaluaciones ORDER BY timestamp DESC'
            );

            const evaluaciones = evalResult.rows;
            for (const ev of evaluaciones) {
                const detResult = await pool.query(
                    'SELECT * FROM detalles_evaluacion WHERE evaluacion_id = $1',
                    [ev.id]
                );
                ev.detalles_evaluacion = detResult.rows;
            }

            respuesta.writeHead(200, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify(evaluaciones));
        } catch (error) {
            console.error('Error en evaluaciones-con-detalles:', error);
            respuesta.writeHead(500, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: error.message }));
        }
        return;
    }

    // Líderes
    if (ruta === '/api/reportes/lideres' && metodo === 'GET') {
        console.log('[API] GET lideres');

        try {
            const result = await pool.query(
                `SELECT DISTINCT a.lider_2026
                 FROM agentes a
                 INNER JOIN evaluaciones e ON e.agente = a.nombre
                 WHERE a.lider_2026 IS NOT NULL AND a.lider_2026 != ''
                 ORDER BY a.lider_2026`
            );
            const lideres = result.rows.map(r => r.lider_2026);
            respuesta.writeHead(200, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify(lideres));
        } catch (error) {
            console.error('Error en lideres:', error);
            respuesta.writeHead(500, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: error.message }));
        }
        return;
    }

    // ======================================================
    // API - REPORTES - Resumen por Líder (VERSIÓN AGRUPADA)
    // ======================================================
    if (ruta === '/api/reportes/resumen-por-lider' && metodo === 'GET') {
        console.log('[API] GET /api/reportes/resumen-por-lider');
        
        const token = peticion.headers['authorization']?.split(' ')[1];
        if (!token) {
            respuesta.writeHead(401, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: 'Token requerido' }));
            return;
        }
        
        try {
            const { fechaInicio, fechaFin } = urlParseada.query;
            
            // 🔴 CONSULTA AGRUPADA POR LÍDER
            const query = `
                SELECT 
                    COALESCE(a.lider_2026, 'Sin líder') as nombre,
                    COUNT(DISTINCT a.nombre) as total_agentes,
                    COUNT(e.id) as total_eval,
                    ROUND(AVG(e.nota_final), 1) as promedio_general,
                    ROUND(AVG(e.total_enc), 1) as promedio_enc,
                    ROUND(AVG(e.total_ecuf), 1) as promedio_ecuf,
                    ROUND(AVG(e.total_ecn), 1) as promedio_ecn,
                    ROUND(COUNT(CASE WHEN e.nota_final < 85 THEN 1 END) * 100.0 / COUNT(e.id), 1) as pct_quiebres,
                    COUNT(CASE WHEN ranking.cuartil = 'Q4' THEN 1 END) as gestores_q4,
                    ROUND(COUNT(CASE WHEN ranking.cuartil = 'Q4' THEN 1 END) * 100.0 / COUNT(DISTINCT a.nombre), 1) as pct_q4
                FROM evaluaciones e
                INNER JOIN agentes a ON e.agente = a.nombre
                LEFT JOIN (
                    SELECT 
                        agente,
                        CASE 
                            WHEN AVG(nota_final) >= 97 THEN 'Q1'
                            WHEN AVG(nota_final) >= 90 THEN 'Q2'
                            WHEN AVG(nota_final) >= 85 THEN 'Q3'
                            ELSE 'Q4'
                        END as cuartil
                    FROM evaluaciones
                    GROUP BY agente
                ) ranking ON e.agente = ranking.agente
                WHERE e.fecha_formateada IS NOT NULL
                    AND a.lider_2026 IS NOT NULL
                    AND a.lider_2026 != ''
                GROUP BY a.lider_2026
                ORDER BY promedio_general DESC
            `;
            
            const result = await pool.query(query);
            
            const datos = result.rows.map(row => ({
                nombre: row.nombre,
                totalAgentes: parseInt(row.total_agentes),
                totalEval: parseInt(row.total_eval),
                promedioGeneral: parseFloat(row.promedio_general),
                promedioENC: parseFloat(row.promedio_enc),
                promedioECUF: parseFloat(row.promedio_ecuf),
                promedioECN: parseFloat(row.promedio_ecn),
                pctQuiebres: parseFloat(row.pct_quiebres) || 0,
                gestoresQ4: parseInt(row.gestores_q4) || 0,
                pctQ4: parseFloat(row.pct_q4) || 0
            }));
            
            console.log(`✅ ${datos.length} líderes encontrados`);
            
            respuesta.writeHead(200, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify(datos));
            
        } catch (error) {
            console.error('❌ Error:', error);
            respuesta.writeHead(500, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify([]));
        }
        return;
    }

    // ======================================================
    // API - REPORTES - Resumen por Ubicación
    // ======================================================
    if (ruta === '/api/reportes/resumen-por-ubicacion' && metodo === 'GET') {
        console.log('[API] GET /api/reportes/resumen-por-ubicacion');
        
        const token = peticion.headers['authorization']?.split(' ')[1];
        if (!token) {
            respuesta.writeHead(401, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: 'Token requerido' }));
            return;
        }
        
        try {
            const query = `
                SELECT 
                    COALESCE(a.ubicacion, 'Sin ubicación') as nombre,
                    COUNT(DISTINCT a.nombre) as total_agentes,
                    COUNT(e.id) as total_eval,
                    ROUND(AVG(e.nota_final), 1) as promedio_general,
                    ROUND(AVG(e.total_enc), 1) as promedio_enc,
                    ROUND(AVG(e.total_ecuf), 1) as promedio_ecuf,
                    ROUND(AVG(e.total_ecn), 1) as promedio_ecn,
                    ROUND(COUNT(CASE WHEN e.nota_final < 85 THEN 1 END) * 100.0 / COUNT(e.id), 1) as pct_quiebres,
                    COUNT(CASE WHEN ranking.cuartil = 'Q4' THEN 1 END) as gestores_q4,
                    ROUND(COUNT(CASE WHEN ranking.cuartil = 'Q4' THEN 1 END) * 100.0 / COUNT(DISTINCT a.nombre), 1) as pct_q4
                FROM evaluaciones e
                INNER JOIN agentes a ON e.agente = a.nombre
                LEFT JOIN (
                    SELECT 
                        agente,
                        CASE 
                            WHEN AVG(nota_final) >= 97 THEN 'Q1'
                            WHEN AVG(nota_final) >= 90 THEN 'Q2'
                            WHEN AVG(nota_final) >= 85 THEN 'Q3'
                            ELSE 'Q4'
                        END as cuartil
                    FROM evaluaciones
                    GROUP BY agente
                ) ranking ON e.agente = ranking.agente
                WHERE e.fecha_formateada IS NOT NULL
                    AND a.ubicacion IS NOT NULL
                    AND a.ubicacion != ''
                GROUP BY a.ubicacion
                ORDER BY promedio_general DESC
            `;
            
            const result = await pool.query(query);
            
            const datos = result.rows.map(row => ({
                nombre: row.nombre,
                totalAgentes: parseInt(row.total_agentes),
                totalEval: parseInt(row.total_eval),
                promedioGeneral: parseFloat(row.promedio_general),
                promedioENC: parseFloat(row.promedio_enc),
                promedioECUF: parseFloat(row.promedio_ecuf),
                promedioECN: parseFloat(row.promedio_ecn),
                pctQuiebres: parseFloat(row.pct_quiebres) || 0,
                gestoresQ4: parseInt(row.gestores_q4) || 0,
                pctQ4: parseFloat(row.pct_q4) || 0
            }));
            
            console.log(`✅ ${datos.length} ubicaciones encontradas`);
            
            respuesta.writeHead(200, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify(datos));
            
        } catch (error) {
            console.error('❌ Error:', error);
            respuesta.writeHead(500, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify([]));
        }
        return;
    }

    // ======================================================
    // API - REPORTES - Resumen por Localidad
    // ======================================================
    if (ruta === '/api/reportes/resumen-por-localidad' && metodo === 'GET') {
        console.log('[API] GET /api/reportes/resumen-por-localidad');
        
        const token = peticion.headers['authorization']?.split(' ')[1];
        if (!token) {
            respuesta.writeHead(401, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: 'Token requerido' }));
            return;
        }
        
        try {
            const query = `
                SELECT 
                    COALESCE(a.localidad, 'Sin localidad') as nombre,
                    COUNT(DISTINCT a.nombre) as total_agentes,
                    COUNT(e.id) as total_eval,
                    ROUND(AVG(e.nota_final), 1) as promedio_general,
                    ROUND(AVG(e.total_enc), 1) as promedio_enc,
                    ROUND(AVG(e.total_ecuf), 1) as promedio_ecuf,
                    ROUND(AVG(e.total_ecn), 1) as promedio_ecn,
                    ROUND(COUNT(CASE WHEN e.nota_final < 85 THEN 1 END) * 100.0 / COUNT(e.id), 1) as pct_quiebres,
                    COUNT(CASE WHEN ranking.cuartil = 'Q4' THEN 1 END) as gestores_q4,
                    ROUND(COUNT(CASE WHEN ranking.cuartil = 'Q4' THEN 1 END) * 100.0 / COUNT(DISTINCT a.nombre), 1) as pct_q4
                FROM evaluaciones e
                INNER JOIN agentes a ON e.agente = a.nombre
                LEFT JOIN (
                    SELECT 
                        agente,
                        CASE 
                            WHEN AVG(nota_final) >= 97 THEN 'Q1'
                            WHEN AVG(nota_final) >= 90 THEN 'Q2'
                            WHEN AVG(nota_final) >= 85 THEN 'Q3'
                            ELSE 'Q4'
                        END as cuartil
                    FROM evaluaciones
                    GROUP BY agente
                ) ranking ON e.agente = ranking.agente
                WHERE e.fecha_formateada IS NOT NULL
                    AND a.localidad IS NOT NULL
                    AND a.localidad != ''
                GROUP BY a.localidad
                ORDER BY promedio_general DESC
            `;
            
            const result = await pool.query(query);
            
            const datos = result.rows.map(row => ({
                nombre: row.nombre,
                totalAgentes: parseInt(row.total_agentes),
                totalEval: parseInt(row.total_eval),
                promedioGeneral: parseFloat(row.promedio_general),
                promedioENC: parseFloat(row.promedio_enc),
                promedioECUF: parseFloat(row.promedio_ecuf),
                promedioECN: parseFloat(row.promedio_ecn),
                pctQuiebres: parseFloat(row.pct_quiebres) || 0,
                gestoresQ4: parseInt(row.gestores_q4) || 0,
                pctQ4: parseFloat(row.pct_q4) || 0
            }));
            
            console.log(`✅ ${datos.length} localidades encontradas`);
            
            respuesta.writeHead(200, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify(datos));
            
        } catch (error) {
            console.error('❌ Error:', error);
            respuesta.writeHead(500, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify([]));
        }
        return;
    }

        // ======================================================
    // API - PDA (Plan de Desarrollo y Acción)
    // ======================================================

    // Obtener PDA pendientes
    if (ruta === '/api/pda/pendientes' && metodo === 'GET') {
        console.log('[API] GET /api/pda/pendientes');
        
        const token = peticion.headers['authorization']?.split(' ')[1];
        if (!token) {
            respuesta.writeHead(401, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: 'Token requerido' }));
            return;
        }
        
        try {
            // Verificar si la tabla existe
            const checkTable = await pool.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'pda_cabecera'
                );
            `);
            
            if (!checkTable.rows[0].exists) {
                console.log('⚠️ Tabla pda_cabecera no existe, devolviendo array vacío');
                respuesta.writeHead(200, { 'Content-Type': 'application/json' });
                respuesta.end(JSON.stringify([]));
                return;
            }
            
            const result = await pool.query(
                `SELECT * FROM pda_cabecera 
                 WHERE estado IN ('pendiente', 'notificado', 'en_gestion') 
                 ORDER BY created_at DESC`
            );
            respuesta.writeHead(200, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify(result.rows));
        } catch (error) {
            console.error('Error en /api/pda/pendientes:', error);
            respuesta.writeHead(200, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify([]));
        }
        return;
    }

    // Obtener PDA en seguimiento
    if (ruta === '/api/pda/seguimiento' && metodo === 'GET') {
        console.log('[API] GET /api/pda/seguimiento');
        
        const token = peticion.headers['authorization']?.split(' ')[1];
        if (!token) {
            respuesta.writeHead(401, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: 'Token requerido' }));
            return;
        }
        
        try {
            const checkTable = await pool.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'pda_cabecera'
                );
            `);
            
            if (!checkTable.rows[0].exists) {
                respuesta.writeHead(200, { 'Content-Type': 'application/json' });
                respuesta.end(JSON.stringify([]));
                return;
            }
            
            const result = await pool.query(
                `SELECT * FROM pda_cabecera 
                 WHERE estado = 'en_seguimiento' 
                 ORDER BY created_at DESC`
            );
            respuesta.writeHead(200, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify(result.rows));
        } catch (error) {
            console.error('Error en /api/pda/seguimiento:', error);
            respuesta.writeHead(200, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify([]));
        }
        return;
    }

    // Obtener historial de PDA
    if (ruta === '/api/pda/historial' && metodo === 'GET') {
        console.log('[API] GET /api/pda/historial');
        
        const token = peticion.headers['authorization']?.split(' ')[1];
        if (!token) {
            respuesta.writeHead(401, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: 'Token requerido' }));
            return;
        }
        
        try {
            const checkTable = await pool.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'pda_cabecera'
                );
            `);
            
            if (!checkTable.rows[0].exists) {
                respuesta.writeHead(200, { 'Content-Type': 'application/json' });
                respuesta.end(JSON.stringify([]));
                return;
            }
            
            const result = await pool.query(
                `SELECT * FROM pda_cabecera 
                 WHERE estado IN ('completado', 'escalado', 'corregido') 
                 ORDER BY created_at DESC 
                 LIMIT 50`
            );
            respuesta.writeHead(200, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify(result.rows));
        } catch (error) {
            console.error('Error en /api/pda/historial:', error);
            respuesta.writeHead(200, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify([]));
        }
        return;
    }

    // Obtener detalle de un PDA específico
    if (ruta.match(/^\/api\/pda\/\d+$/) && metodo === 'GET') {
        console.log('[API] GET /api/pda/:id');
        
        const token = peticion.headers['authorization']?.split(' ')[1];
        if (!token) {
            respuesta.writeHead(401, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: 'Token requerido' }));
            return;
        }
        
        const pdaId = ruta.split('/').pop();
        
        try {
            // Obtener cabecera
            const headerResult = await pool.query(
                'SELECT * FROM pda_cabecera WHERE id = $1',
                [pdaId]
            );
            
            if (headerResult.rows.length === 0) {
                respuesta.writeHead(404, { 'Content-Type': 'application/json' });
                respuesta.end(JSON.stringify({ error: 'PDA no encontrado' }));
                return;
            }
            
            // Obtener acciones
            const accionesResult = await pool.query(
                'SELECT * FROM pda_acciones WHERE pda_id = $1 ORDER BY id',
                [pdaId]
            );
            
            const pda = headerResult.rows[0];
            pda.acciones = accionesResult.rows;
            
            // Calcular progreso
            const totalAcciones = accionesResult.rows.length;
            const completadas = accionesResult.rows.filter(a => a.completado === true).length;
            pda.progreso = totalAcciones > 0 ? Math.round((completadas / totalAcciones) * 100) : 0;
            
            respuesta.writeHead(200, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify(pda));
        } catch (error) {
            console.error('Error en /api/pda/:id:', error);
            respuesta.writeHead(500, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: error.message }));
        }
        return;
    }

    // Exportar reporte PDA
    if (ruta === '/api/pda/exportar' && metodo === 'GET') {
        console.log('[API] GET /api/pda/exportar');
        
        const token = peticion.headers['authorization']?.split(' ')[1];
        if (!token) {
            respuesta.writeHead(401, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: 'Token requerido' }));
            return;
        }
        
        try {
            const result = await pool.query(`
                SELECT 
                    pc.id,
                    pc.agente,
                    pc.fecha_deteccion,
                    pc.estado,
                    pc.promedio_basal,
                    pc.cuartil_basal,
                    COUNT(pa.id) as total_acciones,
                    SUM(CASE WHEN pa.completado = true THEN 1 ELSE 0 END) as acciones_completadas
                FROM pda_cabecera pc
                LEFT JOIN pda_acciones pa ON pc.id = pa.pda_id
                GROUP BY pc.id, pc.agente, pc.fecha_deteccion, pc.estado, pc.promedio_basal, pc.cuartil_basal
                ORDER BY pc.created_at DESC
            `);
            
            respuesta.writeHead(200, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify(result.rows));
        } catch (error) {
            console.error('Error en /api/pda/exportar:', error);
            respuesta.writeHead(500, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify([]));
        }
        return;
    }

    // ======================================================
    // API - SESIONES ACTIVAS (migración de funciones de supervisor.js)
    // ======================================================

    // Crear sesión activa
    if (ruta === '/api/sesiones/crear' && metodo === 'POST') {
        console.log('[API] POST crear sesion');

        let body = '';
        peticion.on('data', chunk => body += chunk);
        peticion.on('end', async () => {
            try {
                const { usuario_id, token_sesion, ip, dispositivo } = JSON.parse(body);

                await pool.query(`
                    INSERT INTO sesiones_activas (usuario_id, token_sesion, ip, dispositivo, fecha_login, estado)
                    VALUES ($1, $2, $3, $4, NOW(), 'activa')
                    ON CONFLICT (usuario_id) DO UPDATE
                    SET token_sesion = $2, ip = $3, dispositivo = $4, fecha_login = NOW(), estado = 'activa'
                `, [usuario_id, token_sesion, ip, dispositivo]);

                respuesta.writeHead(200, { 'Content-Type': 'application/json' });
                respuesta.end(JSON.stringify({ success: true }));

            } catch (error) {
                console.error('Error creando sesion:', error);
                respuesta.writeHead(500, { 'Content-Type': 'application/json' });
                respuesta.end(JSON.stringify({ success: false, error: error.message }));
            }
        });
        return;
    }

    // ======================================================
    // API - SESIONES - Obtener sesiones de un usuario
    // ======================================================
    if (ruta.match(/^\/api\/sesiones\/usuarios\/\d+$/) && metodo === 'GET') {
        console.log('[API] GET /api/sesiones/usuarios/:id');
        
        const token = peticion.headers['authorization']?.split(' ')[1];
        if (!token) {
            respuesta.writeHead(401, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: 'Token requerido' }));
            return;
        }
        
        const usuarioId = parseInt(ruta.split('/').pop());
        const { activas } = urlParseada.query;
        
        try {
            // 🔴 CONSULTA SIN motivo_cierre (no existe en la tabla)
            let query = `
                SELECT 
                    id, 
                    usuario_id, 
                    session_token, 
                    ip_address, 
                    user_agent, 
                    dispositivo, 
                    fecha_inicio, 
                    ultima_actividad, 
                    fecha_fin, 
                    estado,
                    created_at
                FROM sesiones_activas 
                WHERE usuario_id = $1
            `;
            const params = [usuarioId];
            
            if (activas === 'true') {
                query += ` AND estado = 'activa'`;
            }
            
            query += ` ORDER BY fecha_inicio DESC`;
            
            const result = await pool.query(query, params);
            
            console.log(`✅ ${result.rows.length} sesiones encontradas para usuario ${usuarioId}`);
            
            respuesta.writeHead(200, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify(result.rows));
            
        } catch (error) {
            console.error('❌ Error obteniendo sesiones:', error);
            respuesta.writeHead(500, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: error.message }));
        }
        return;
    }

    // ======================================================
    // API - SESIONES - Cerrar sesión específica
    // ======================================================
    if (ruta === '/api/sesiones/cerrar' && metodo === 'POST') {
        console.log('[API] POST /api/sesiones/cerrar');
        
        const token = peticion.headers['authorization']?.split(' ')[1];
        if (!token) {
            respuesta.writeHead(401, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: 'Token requerido' }));
            return;
        }
        
        let body = '';
        peticion.on('data', chunk => body += chunk);
        peticion.on('end', async () => {
            try {
                const { sessionToken } = JSON.parse(body);
                
                // 🔴 SIN motivo_cierre
                const result = await pool.query(`
                    UPDATE sesiones_activas 
                    SET estado = 'cerrada', 
                        fecha_fin = NOW()
                    WHERE session_token = $1 AND estado = 'activa'
                    RETURNING id
                `, [sessionToken]);
                
                console.log(`✅ Sesión cerrada: ${result.rowCount} afectadas`);
                
                respuesta.writeHead(200, { 'Content-Type': 'application/json' });
                respuesta.end(JSON.stringify({ 
                    success: true, 
                    afectadas: result.rowCount 
                }));
                
            } catch (error) {
                console.error('Error cerrando sesión:', error);
                respuesta.writeHead(500, { 'Content-Type': 'application/json' });
                respuesta.end(JSON.stringify({ error: error.message }));
            }
        });
        return;
    }

    // ======================================================
    // API - SESIONES - Cerrar todas las sesiones de un usuario
    // ======================================================
    if (ruta.startsWith('/api/sesiones/usuarios/') && ruta.endsWith('/cerrar-todas') && metodo === 'POST') {
        console.log('[API] POST /api/sesiones/usuarios/:id/cerrar-todas');
        
        const token = peticion.headers['authorization']?.split(' ')[1];
        if (!token) {
            respuesta.writeHead(401, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: 'Token requerido' }));
            return;
        }
        
        // 🔴 EXTRAER ID DE FORMA ROBUSTA
        // Ejemplo: /api/sesiones/usuarios/5/cerrar-todas
        const partes = ruta.split('/');
        // partes = ['', 'api', 'sesiones', 'usuarios', '5', 'cerrar-todas']
        const usuarioId = parseInt(partes[4]); // El ID está en la posición 4
        
        console.log('URL:', ruta);
        console.log('Partes:', partes);
        console.log('ID extraído:', usuarioId);
        
        if (isNaN(usuarioId)) {
            console.error('❌ No se pudo extraer el ID');
            respuesta.writeHead(400, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: 'ID de usuario inválido', ruta: ruta }));
            return;
        }
        
        try {
            const result = await pool.query(`
                UPDATE sesiones_activas 
                SET estado = 'cerrada', 
                    fecha_fin = NOW()
                WHERE usuario_id = $1 AND estado = 'activa'
                RETURNING id
            `, [usuarioId]);
            
            console.log(`✅ Cerradas ${result.rowCount} sesiones para usuario ${usuarioId}`);
            
            respuesta.writeHead(200, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ 
                success: true, 
                cerradas: result.rowCount 
            }));
            
        } catch (error) {
            console.error('❌ Error:', error);
            respuesta.writeHead(500, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: error.message }));
        }
        return;
    }

    // Registrar historial de login
    if (ruta === '/api/historial-login' && metodo === 'POST') {
        console.log('[API] POST historial-login');

        let body = '';
        peticion.on('data', chunk => body += chunk);
        peticion.on('end', async () => {
            try {
                const { usuario_id, usuario, tipo, ip, dispositivo } = JSON.parse(body);

                await pool.query(`
                    INSERT INTO historial_login (usuario_id, usuario, tipo, ip, dispositivo, fecha)
                    VALUES ($1, $2, $3, $4, $5, NOW())
                `, [usuario_id, usuario, tipo, ip, dispositivo]);

                respuesta.writeHead(200, { 'Content-Type': 'application/json' });
                respuesta.end(JSON.stringify({ success: true }));

            } catch (error) {
                console.error('Error registrando historial login:', error);
                // No fallar el login por esto
                respuesta.writeHead(200, { 'Content-Type': 'application/json' });
                respuesta.end(JSON.stringify({ success: false, error: error.message }));
            }
        });
        return;
    }

    // ======================================================
    // API - USUARIOS - Cambiar password
    // ======================================================
    if (ruta.match(/^\/api\/usuarios\/\d+\/password$/) && metodo === 'PUT') {
        console.log('[API] PUT /api/usuarios/:id/password');
        
        const token = peticion.headers['authorization']?.split(' ')[1];
        if (!token) {
            respuesta.writeHead(401, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: 'Token requerido' }));
            return;
        }
        
        const id = parseInt(ruta.split('/')[3]);
        
        let body = '';
        peticion.on('data', chunk => body += chunk);
        peticion.on('end', async () => {
            try {
                const { password } = JSON.parse(body);
                
                const hashPassword = crypto.createHash('sha256').update(password).digest('hex');
                
                const result = await pool.query(`
                    UPDATE usuarios 
                    SET contrasena = $1, updated_at = NOW() 
                    WHERE id = $2
                    RETURNING id
                `, [hashPassword, id]);
                
                if (result.rowCount === 0) {
                    respuesta.writeHead(404, { 'Content-Type': 'application/json' });
                    respuesta.end(JSON.stringify({ error: 'Usuario no encontrado' }));
                    return;
                }
                
                console.log(`✅ Password actualizado para usuario ID ${id}`);
                
                respuesta.writeHead(200, { 'Content-Type': 'application/json' });
                respuesta.end(JSON.stringify({ success: true }));
                
            } catch (error) {
                console.error('Error:', error);
                respuesta.writeHead(500, { 'Content-Type': 'application/json' });
                respuesta.end(JSON.stringify({ error: error.message }));
            }
        });
        return;
    }

    // ======================================================
    // API - USUARIOS - Obtener usuario por ID
    // ======================================================
    if (ruta.match(/^\/api\/usuarios\/\d+$/) && metodo === 'GET') {
        console.log('[API] GET /api/usuarios/:id');
        
        const token = peticion.headers['authorization']?.split(' ')[1];
        if (!token) {
            respuesta.writeHead(401, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: 'Token requerido' }));
            return;
        }
        
        const id = parseInt(ruta.split('/').pop());
        
        try {
            const result = await pool.query(`
                SELECT id, usuario, nombre_completo, activo, created_at, rol_id
                FROM usuarios 
                WHERE id = $1
            `, [id]);
            
            if (result.rows.length === 0) {
                respuesta.writeHead(404, { 'Content-Type': 'application/json' });
                respuesta.end(JSON.stringify({ error: 'Usuario no encontrado' }));
                return;
            }
            
            respuesta.writeHead(200, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify(result.rows[0]));
            
        } catch (error) {
            console.error('Error:', error);
            respuesta.writeHead(500, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: error.message }));
        }
        return;
    }

    // ======================================================
    // API - USUARIOS - Actualizar usuario (PUT)
    // ======================================================
    if (ruta.match(/^\/api\/usuarios\/\d+$/) && metodo === 'PUT') {
        console.log('[API] PUT /api/usuarios/:id');
        
        const token = peticion.headers['authorization']?.split(' ')[1];
        if (!token) {
            respuesta.writeHead(401, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: 'Token requerido' }));
            return;
        }
        
        const id = parseInt(ruta.split('/').pop());
        
        let body = '';
        peticion.on('data', chunk => body += chunk);
        peticion.on('end', async () => {
            try {
                const { usuario, nombre_completo, rol_id, activo, contrasena } = JSON.parse(body);
                
                console.log(`📝 Actualizando usuario ID ${id}:`, { usuario, nombre_completo, rol_id, activo, tienePassword: !!contrasena });
                
                // Construir la consulta dinámicamente
                const updates = [];
                const values = [];
                let idx = 1;
                
                // 🔴 INCLUIR EL CAMPO usuario
                if (usuario !== undefined) {
                    updates.push(`usuario = $${idx++}`);
                    values.push(usuario);
                }
                
                if (nombre_completo !== undefined) {
                    updates.push(`nombre_completo = $${idx++}`);
                    values.push(nombre_completo);
                }
                
                if (rol_id !== undefined) {
                    updates.push(`rol_id = $${idx++}`);
                    values.push(rol_id);
                }
                
                if (activo !== undefined) {
                    updates.push(`activo = $${idx++}`);
                    values.push(activo);
                }
                
                if (contrasena) {
                    const hashPassword = crypto.createHash('sha256').update(contrasena).digest('hex');
                    updates.push(`contrasena = $${idx++}`);
                    values.push(hashPassword);
                }
                
                updates.push(`updated_at = NOW()`);
                
                values.push(id);
                
                const query = `UPDATE usuarios SET ${updates.join(', ')} WHERE id = $${idx}`;
                
                console.log('📝 Query:', query);
                console.log('📝 Values:', values);
                
                const result = await pool.query(query, values);
                
                if (result.rowCount === 0) {
                    respuesta.writeHead(404, { 'Content-Type': 'application/json' });
                    respuesta.end(JSON.stringify({ error: 'Usuario no encontrado' }));
                    return;
                }
                
                console.log(`✅ Usuario ID ${id} actualizado. Campos modificados: ${updates.filter(u => u !== 'updated_at = NOW()').join(', ')}`);
                
                respuesta.writeHead(200, { 'Content-Type': 'application/json' });
                respuesta.end(JSON.stringify({ success: true, message: 'Usuario actualizado' }));
                
            } catch (error) {
                console.error('❌ Error actualizando usuario:', error);
                respuesta.writeHead(500, { 'Content-Type': 'application/json' });
                respuesta.end(JSON.stringify({ error: error.message }));
            }
        });
        return;
    }


        // ======================================================
    // API - ADMINISTRACIÓN DE MATRIZ DE EVALUACIÓN
    // ======================================================

    // ========== FRENTES ==========
    if (ruta === '/api/matriz/frentes' && metodo === 'GET') {
        console.log('[API] GET /api/matriz/frentes');
        
        const token = peticion.headers['authorization']?.split(' ')[1];
        if (!token) {
            respuesta.writeHead(401, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: 'Token requerido' }));
            return;
        }
        
        try {
            const result = await pool.query(
                'SELECT id, codigo, nombre, peso_maximo, orden, activo FROM frentes ORDER BY orden'
            );
            respuesta.writeHead(200, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify(result.rows));
        } catch (error) {
            console.error('Error:', error);
            respuesta.writeHead(500, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: error.message }));
        }
        return;
    }

    // ======================================================
    // FRENTES - POST (CREAR) - CON VALIDACIÓN POR VERSIÓN
    // ======================================================
    if (ruta === '/api/matriz/frentes' && metodo === 'POST') {
        console.log('[API] POST /api/matriz/frentes');
        
        const token = peticion.headers['authorization']?.split(' ')[1];
        if (!token) {
            respuesta.writeHead(401, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: 'Token requerido' }));
            return;
        }
        
        let body = '';
        peticion.on('data', chunk => body += chunk);
        peticion.on('end', async () => {
            try {
                const { codigo, nombre, peso_maximo, orden, activo } = JSON.parse(body);
                
                if (!codigo || !nombre || !peso_maximo) {
                    respuesta.writeHead(400, { 'Content-Type': 'application/json' });
                    respuesta.end(JSON.stringify({ error: 'Faltan campos obligatorios' }));
                    return;
                }
                
                if (peso_maximo <= 0 || peso_maximo > 100) {
                    respuesta.writeHead(400, { 'Content-Type': 'application/json' });
                    respuesta.end(JSON.stringify({ error: 'El peso debe ser mayor a 0 y menor o igual a 100' }));
                    return;
                }
                
                // 1. Obtener versión activa
                const versionResult = await pool.query(
                    'SELECT id FROM versiones_matriz WHERE activa = true LIMIT 1'
                );
                
                if (versionResult.rows.length === 0) {
                    respuesta.writeHead(404, { 'Content-Type': 'application/json' });
                    respuesta.end(JSON.stringify({ error: 'No hay versión activa' }));
                    return;
                }
                
                const versionId = versionResult.rows[0].id;
                
                // 2. Verificar que no exista un frente con el mismo código en la versión activa
                const existenteResult = await pool.query(
                    'SELECT id FROM version_frentes WHERE version_id = $1 AND codigo = $2',
                    [versionId, codigo]
                );
                
                if (existenteResult.rows.length > 0) {
                    respuesta.writeHead(400, { 'Content-Type': 'application/json' });
                    respuesta.end(JSON.stringify({ error: `Ya existe un frente con el código "${codigo}" en esta versión` }));
                    return;
                }
                
                // 3. 🔴 VALIDAR SUMA TOTAL DE FRENTES SOLO EN LA VERSIÓN ACTIVA
                const frentesResult = await pool.query(
                    'SELECT COALESCE(SUM(peso_maximo), 0) as total FROM version_frentes WHERE version_id = $1 AND activo = true',
                    [versionId]
                );
                
                const sumaActual = parseFloat(frentesResult.rows[0].total) || 0;
                const nuevoPeso = parseFloat(peso_maximo);
                const nuevaSuma = sumaActual + nuevoPeso;
                
                if (nuevaSuma > 100) {
                    respuesta.writeHead(400, { 'Content-Type': 'application/json' });
                    respuesta.end(JSON.stringify({ 
                        error: `La suma total de los frentes en la versión activa excede el 100%. Actual: ${sumaActual}% + ${nuevoPeso}% = ${nuevaSuma}%`,
                        suma_actual: sumaActual,
                        nuevo_peso: nuevoPeso,
                        peso_maximo: 100,
                        suma_total: nuevaSuma
                    }));
                    return;
                }
                
                // 4. Insertar frente en la versión activa
                const result = await pool.query(`
                    INSERT INTO version_frentes (
                        version_id,
                        codigo,
                        nombre,
                        peso_maximo,
                        orden,
                        activo,
                        created_at,
                        updated_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
                    RETURNING id, codigo, nombre, peso_maximo, orden, activo
                `, [versionId, codigo, nombre, nuevoPeso, orden || 0, activo !== false]);
                
                console.log(`✅ Frente creado en versión ${versionId}: ${codigo} (ID: ${result.rows[0].id})`);
                
                respuesta.writeHead(201, { 'Content-Type': 'application/json' });
                respuesta.end(JSON.stringify(result.rows[0]));
                
            } catch (error) {
                console.error('Error creando frente:', error);
                respuesta.writeHead(500, { 'Content-Type': 'application/json' });
                respuesta.end(JSON.stringify({ error: error.message }));
            }
        });
        return;
    }

    // ======================================================
    // FRENTES - PUT (ACTUALIZAR) - CON VALIDACIÓN POR VERSIÓN
    // ======================================================
    if (ruta.match(/^\/api\/matriz\/frentes\/\d+$/) && metodo === 'PUT') {
        console.log('[API] PUT /api/matriz/frentes/:id');
        
        const token = peticion.headers['authorization']?.split(' ')[1];
        if (!token) {
            respuesta.writeHead(401, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: 'Token requerido' }));
            return;
        }
        
        const id = parseInt(ruta.split('/').pop());
        
        let body = '';
        peticion.on('data', chunk => body += chunk);
        peticion.on('end', async () => {
            try {
                const { codigo, nombre, peso_maximo, orden, activo } = JSON.parse(body);
                
                // 1. Obtener versión activa
                const versionResult = await pool.query(
                    'SELECT id FROM versiones_matriz WHERE activa = true LIMIT 1'
                );
                
                if (versionResult.rows.length === 0) {
                    respuesta.writeHead(404, { 'Content-Type': 'application/json' });
                    respuesta.end(JSON.stringify({ error: 'No hay versión activa' }));
                    return;
                }
                
                const versionId = versionResult.rows[0].id;
                
                // 2. Verificar que el frente existe en la versión activa
                const frenteResult = await pool.query(
                    'SELECT id, peso_maximo, codigo FROM version_frentes WHERE id = $1 AND version_id = $2',
                    [id, versionId]
                );
                
                if (frenteResult.rows.length === 0) {
                    respuesta.writeHead(404, { 'Content-Type': 'application/json' });
                    respuesta.end(JSON.stringify({ error: 'Frente no encontrado en la versión activa' }));
                    return;
                }
                
                const frenteActual = frenteResult.rows[0];
                const pesoActual = parseFloat(frenteActual.peso_maximo);
                const nuevoPeso = peso_maximo !== undefined ? parseFloat(peso_maximo) : pesoActual;
                const nuevoCodigo = codigo || frenteActual.codigo;
                
                // 3. Verificar que no exista otro frente con el mismo código en la versión activa
                if (codigo && codigo !== frenteActual.codigo) {
                    const existenteResult = await pool.query(
                        'SELECT id FROM version_frentes WHERE version_id = $1 AND codigo = $2 AND id != $3',
                        [versionId, codigo, id]
                    );
                    
                    if (existenteResult.rows.length > 0) {
                        respuesta.writeHead(400, { 'Content-Type': 'application/json' });
                        respuesta.end(JSON.stringify({ error: `Ya existe un frente con el código "${codigo}" en esta versión` }));
                        return;
                    }
                }
                
                // 4. 🔴 VALIDAR SUMA TOTAL DE FRENTES SOLO EN LA VERSIÓN ACTIVA (excluyendo el actual)
                const frentesResult = await pool.query(
                    'SELECT COALESCE(SUM(peso_maximo), 0) as total FROM version_frentes WHERE version_id = $1 AND activo = true AND id != $2',
                    [versionId, id]
                );
                
                const sumaOtros = parseFloat(frentesResult.rows[0].total) || 0;
                const nuevaSuma = sumaOtros + nuevoPeso;
                
                if (nuevaSuma > 100) {
                    respuesta.writeHead(400, { 'Content-Type': 'application/json' });
                    respuesta.end(JSON.stringify({ 
                        error: `La suma total de los frentes en la versión activa excede el 100%. Otros: ${sumaOtros}% + ${nuevoPeso}% = ${nuevaSuma}%`,
                        suma_actual: sumaOtros,
                        nuevo_peso: nuevoPeso,
                        peso_maximo: 100,
                        suma_total: nuevaSuma
                    }));
                    return;
                }
                
                // 5. Actualizar frente en la versión activa
                const result = await pool.query(`
                    UPDATE version_frentes 
                    SET codigo = $1,
                        nombre = $2,
                        peso_maximo = $3,
                        orden = $4,
                        activo = $5,
                        updated_at = NOW()
                    WHERE id = $6
                    RETURNING id, codigo, nombre, peso_maximo, orden, activo
                `, [
                    nuevoCodigo,
                    nombre || frenteActual.nombre,
                    nuevoPeso,
                    orden !== undefined ? orden : 0,
                    activo !== undefined ? activo : true,
                    id
                ]);
                
                console.log(`✅ Frente actualizado en versión ${versionId}: ${nuevoCodigo} (ID: ${id})`);
                
                respuesta.writeHead(200, { 'Content-Type': 'application/json' });
                respuesta.end(JSON.stringify(result.rows[0]));
                
            } catch (error) {
                console.error('Error actualizando frente:', error);
                respuesta.writeHead(500, { 'Content-Type': 'application/json' });
                respuesta.end(JSON.stringify({ error: error.message }));
            }
        });
        return;
    }

    // Eliminar Frente (con cascada y mensaje informativo)
    if (ruta.match(/^\/api\/matriz\/frentes\/\d+$/) && metodo === 'DELETE') {
        console.log('[API] DELETE /api/matriz/frentes/:id');
        
        const token = peticion.headers['authorization']?.split(' ')[1];
        if (!token) {
            respuesta.writeHead(401, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: 'Token requerido' }));
            return;
        }
        
        const id = ruta.split('/').pop();
        try {
            // Obtener información del frente
            const frenteInfo = await pool.query(
                'SELECT nombre FROM frentes WHERE id = $1',
                [id]
            );
            
            if (frenteInfo.rows.length === 0) {
                respuesta.writeHead(404, { 'Content-Type': 'application/json' });
                respuesta.end(JSON.stringify({ error: 'Frente no encontrado' }));
                return;
            }
            
            // Obtener IDs de atributos para eliminar sub-motivos
            const atributos = await pool.query(
                'SELECT id FROM atributos WHERE frente_id = $1',
                [id]
            );
            
            // Eliminar sub-motivos primero
            for (const attr of atributos.rows) {
                await pool.query('DELETE FROM sub_motivos WHERE atributo_id = $1', [attr.id]);
            }
            
            // Eliminar atributos
            await pool.query('DELETE FROM atributos WHERE frente_id = $1', [id]);
            
            // Finalmente eliminar el frente
            await pool.query('DELETE FROM frentes WHERE id = $1', [id]);
            
            respuesta.writeHead(200, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ 
                success: true, 
                message: `✅ Frente "${frenteInfo.rows[0].nombre}" eliminado correctamente.`
            }));
            
        } catch (error) {
            console.error('Error:', error);
            respuesta.writeHead(500, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: error.message }));
        }
        return;
    }

    // ========== ATRIBUTOS ==========
    if (ruta === '/api/matriz/atributos' && metodo === 'GET') {
        console.log('[API] GET /api/matriz/atributos');
        
        const token = peticion.headers['authorization']?.split(' ')[1];
        if (!token) {
            respuesta.writeHead(401, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: 'Token requerido' }));
            return;
        }
        
        const { frente_id } = urlParseada.query;
        try {
            let query = 'SELECT id, frente_id, nombre, peso_maximo, orden, activo FROM atributos';
            let params = [];
            if (frente_id) {
                query += ' WHERE frente_id = $1 ORDER BY orden';
                params.push(frente_id);
            } else {
                query += ' ORDER BY frente_id, orden';
            }
            const result = await pool.query(query, params);
            respuesta.writeHead(200, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify(result.rows));
        } catch (error) {
            console.error('Error:', error);
            respuesta.writeHead(500, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: error.message }));
        }
        return;
    }

    // ======================================================
    // ATRIBUTOS - POST (CREAR) - CON VALIDACIÓN POR VERSIÓN
    // ======================================================
    if (ruta === '/api/matriz/atributos' && metodo === 'POST') {
        console.log('[API] POST /api/matriz/atributos');
        
        const token = peticion.headers['authorization']?.split(' ')[1];
        if (!token) {
            respuesta.writeHead(401, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: 'Token requerido' }));
            return;
        }
        
        let body = '';
        peticion.on('data', chunk => body += chunk);
        peticion.on('end', async () => {
            try {
                const { frente_id, nombre, peso_maximo, orden, activo } = JSON.parse(body);
                
                if (!frente_id || !nombre || !peso_maximo) {
                    respuesta.writeHead(400, { 'Content-Type': 'application/json' });
                    respuesta.end(JSON.stringify({ error: 'Faltan campos obligatorios' }));
                    return;
                }
                
                if (peso_maximo <= 0) {
                    respuesta.writeHead(400, { 'Content-Type': 'application/json' });
                    respuesta.end(JSON.stringify({ error: 'El peso debe ser mayor a 0' }));
                    return;
                }
                
                // 1. Obtener versión activa
                const versionResult = await pool.query(
                    'SELECT id FROM versiones_matriz WHERE activa = true LIMIT 1'
                );
                
                if (versionResult.rows.length === 0) {
                    respuesta.writeHead(404, { 'Content-Type': 'application/json' });
                    respuesta.end(JSON.stringify({ error: 'No hay versión activa' }));
                    return;
                }
                
                const versionId = versionResult.rows[0].id;
                
                // 2. Verificar que el frente existe en la versión activa
                const frenteResult = await pool.query(
                    'SELECT id, peso_maximo FROM version_frentes WHERE id = $1 AND version_id = $2 AND activo = true',
                    [frente_id, versionId]
                );
                
                if (frenteResult.rows.length === 0) {
                    respuesta.writeHead(404, { 'Content-Type': 'application/json' });
                    respuesta.end(JSON.stringify({ error: 'Frente no encontrado en la versión activa' }));
                    return;
                }
                
                const pesoMaximoFrente = parseFloat(frenteResult.rows[0].peso_maximo);
                
                // 3. Verificar que no exista un atributo con el mismo nombre en la versión activa
                const existenteResult = await pool.query(
                    'SELECT id FROM version_atributos va JOIN version_frentes vf ON va.version_frente_id = vf.id WHERE vf.version_id = $1 AND va.nombre = $2 AND va.version_frente_id = $3',
                    [versionId, nombre, frente_id]
                );
                
                if (existenteResult.rows.length > 0) {
                    respuesta.writeHead(400, { 'Content-Type': 'application/json' });
                    respuesta.end(JSON.stringify({ error: `Ya existe un atributo con el nombre "${nombre}" en este frente en la versión activa` }));
                    return;
                }
                
                // 4. 🔴 VALIDAR SUMA DE ATRIBUTOS SOLO EN LA VERSIÓN ACTIVA
                const atributosResult = await pool.query(
                    'SELECT COALESCE(SUM(va.peso_maximo), 0) as total FROM version_atributos va JOIN version_frentes vf ON va.version_frente_id = vf.id WHERE vf.version_id = $1 AND va.version_frente_id = $2 AND va.activo = true',
                    [versionId, frente_id]
                );
                
                const sumaActual = parseFloat(atributosResult.rows[0].total) || 0;
                const nuevoPeso = parseFloat(peso_maximo);
                const nuevaSuma = sumaActual + nuevoPeso;
                
                if (nuevaSuma > pesoMaximoFrente) {
                    respuesta.writeHead(400, { 'Content-Type': 'application/json' });
                    respuesta.end(JSON.stringify({ 
                        error: `La suma de los atributos en la versión activa excede el peso del frente (${pesoMaximoFrente}%). Actual: ${sumaActual}% + ${nuevoPeso}% = ${nuevaSuma}%`,
                        suma_actual: sumaActual,
                        nuevo_peso: nuevoPeso,
                        peso_maximo_frente: pesoMaximoFrente,
                        suma_total: nuevaSuma
                    }));
                    return;
                }
                
                // 5. Insertar atributo en la versión activa
                const result = await pool.query(`
                    INSERT INTO version_atributos (
                        version_frente_id,
                        nombre,
                        peso_maximo,
                        orden,
                        activo,
                        created_at,
                        updated_at
                    ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
                    RETURNING id, nombre, peso_maximo, orden, activo
                `, [frente_id, nombre, nuevoPeso, orden || 0, activo !== false]);
                
                console.log(`✅ Atributo creado en versión ${versionId}: ${nombre} (ID: ${result.rows[0].id})`);
                
                respuesta.writeHead(201, { 'Content-Type': 'application/json' });
                respuesta.end(JSON.stringify(result.rows[0]));
                
            } catch (error) {
                console.error('Error creando atributo:', error);
                respuesta.writeHead(500, { 'Content-Type': 'application/json' });
                respuesta.end(JSON.stringify({ error: error.message }));
            }
        });
        return;
    }

    // Eliminar Atributo (con cascada)
    if (ruta.match(/^\/api\/matriz\/atributos\/\d+$/) && metodo === 'DELETE') {
        console.log('[API] DELETE /api/matriz/atributos/:id');
        
        const token = peticion.headers['authorization']?.split(' ')[1];
        if (!token) {
            respuesta.writeHead(401, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: 'Token requerido' }));
            return;
        }
        
        const id = ruta.split('/').pop();
        try {
            // Obtener información del atributo
            const atributoInfo = await pool.query(
                'SELECT nombre FROM atributos WHERE id = $1',
                [id]
            );
            
            if (atributoInfo.rows.length === 0) {
                respuesta.writeHead(404, { 'Content-Type': 'application/json' });
                respuesta.end(JSON.stringify({ error: 'Atributo no encontrado' }));
                return;
            }
            
            // Obtener conteo de sub-motivos
            const conteo = await pool.query(
                'SELECT COUNT(*) as total FROM sub_motivos WHERE atributo_id = $1',
                [id]
            );
            
            // Eliminar (ON DELETE CASCADE eliminará los sub-motivos)
            await pool.query('DELETE FROM atributos WHERE id = $1', [id]);
            
            respuesta.writeHead(200, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ 
                success: true, 
                message: `✅ Atributo "${atributoInfo.rows[0].nombre}" eliminado.\n📊 Se eliminaron: ${conteo.rows[0].total} sub-motivos.`
            }));
        } catch (error) {
            console.error('Error:', error);
            respuesta.writeHead(500, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: error.message }));
        }
        return;
    }

    // ========== SUB-MOTIVOS ==========
    if (ruta === '/api/matriz/sub-motivos' && metodo === 'GET') {
        console.log('[API] GET /api/matriz/sub-motivos');
        
        const token = peticion.headers['authorization']?.split(' ')[1];
        if (!token) {
            respuesta.writeHead(401, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: 'Token requerido' }));
            return;
        }
        
        const { atributo_id } = urlParseada.query;
        try {
            let query = 'SELECT id, atributo_id, codigo, descripcion, peso_individual, orden, activo FROM sub_motivos';
            let params = [];
            if (atributo_id) {
                query += ' WHERE atributo_id = $1 ORDER BY orden';
                params.push(atributo_id);
            } else {
                query += ' ORDER BY atributo_id, orden';
            }
            const result = await pool.query(query, params);
            respuesta.writeHead(200, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify(result.rows));
        } catch (error) {
            console.error('Error:', error);
            respuesta.writeHead(500, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: error.message }));
        }
        return;
    }

    // ======================================================
    // SUB-MOTIVOS - POST (CREAR) - CON VALIDACIÓN POR VERSIÓN
    // ======================================================
    if (ruta === '/api/matriz/sub-motivos' && metodo === 'POST') {
        console.log('[API] POST /api/matriz/sub-motivos');
        
        const token = peticion.headers['authorization']?.split(' ')[1];
        if (!token) {
            respuesta.writeHead(401, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: 'Token requerido' }));
            return;
        }
        
        let body = '';
        peticion.on('data', chunk => body += chunk);
        peticion.on('end', async () => {
            try {
                const { atributo_id, codigo, descripcion, peso_individual, orden, activo } = JSON.parse(body);
                
                if (!atributo_id || !codigo || !descripcion || !peso_individual) {
                    respuesta.writeHead(400, { 'Content-Type': 'application/json' });
                    respuesta.end(JSON.stringify({ error: 'Faltan campos obligatorios' }));
                    return;
                }
                
                if (peso_individual <= 0) {
                    respuesta.writeHead(400, { 'Content-Type': 'application/json' });
                    respuesta.end(JSON.stringify({ error: 'El peso debe ser mayor a 0' }));
                    return;
                }
                
                // 1. Obtener versión activa
                const versionResult = await pool.query(
                    'SELECT id FROM versiones_matriz WHERE activa = true LIMIT 1'
                );
                
                if (versionResult.rows.length === 0) {
                    respuesta.writeHead(404, { 'Content-Type': 'application/json' });
                    respuesta.end(JSON.stringify({ error: 'No hay versión activa' }));
                    return;
                }
                
                const versionId = versionResult.rows[0].id;
                
                // 2. Verificar que el atributo existe en la versión activa
                const atributoResult = await pool.query(`
                    SELECT va.id, va.peso_maximo
                    FROM version_atributos va
                    JOIN version_frentes vf ON va.version_frente_id = vf.id
                    WHERE va.id = $1 AND vf.version_id = $2 AND va.activo = true
                `, [atributo_id, versionId]);
                
                if (atributoResult.rows.length === 0) {
                    respuesta.writeHead(404, { 'Content-Type': 'application/json' });
                    respuesta.end(JSON.stringify({ error: 'Atributo no encontrado en la versión activa' }));
                    return;
                }
                
                const pesoMaximoAtributo = parseFloat(atributoResult.rows[0].peso_maximo);
                
                // 3. Verificar que no exista un sub-motivo con el mismo código en la versión activa
                const existenteResult = await pool.query(`
                    SELECT vsm.id FROM version_sub_motivos vsm 
                    JOIN version_atributos va ON vsm.version_atributo_id = va.id
                    JOIN version_frentes vf ON va.version_frente_id = vf.id
                    WHERE vf.version_id = $1 AND vsm.codigo = $2 AND vsm.version_atributo_id = $3
                `, [versionId, codigo, atributo_id]);
                
                if (existenteResult.rows.length > 0) {
                    respuesta.writeHead(400, { 'Content-Type': 'application/json' });
                    respuesta.end(JSON.stringify({ error: `Ya existe un sub-motivo con el código "${codigo}" en este atributo en la versión activa` }));
                    return;
                }
                
                // 4. 🔴 VALIDAR SUMA DE SUB-MOTIVOS SOLO EN LA VERSIÓN ACTIVA
                const subMotivosResult = await pool.query(`
                    SELECT COALESCE(SUM(vsm.peso_individual), 0) as total 
                    FROM version_sub_motivos vsm 
                    JOIN version_atributos va ON vsm.version_atributo_id = va.id
                    JOIN version_frentes vf ON va.version_frente_id = vf.id
                    WHERE vf.version_id = $1 AND vsm.version_atributo_id = $2 AND vsm.activo = true
                `, [versionId, atributo_id]);
                
                const sumaActual = parseFloat(subMotivosResult.rows[0].total) || 0;
                const nuevoPeso = parseFloat(peso_individual);
                const nuevaSuma = sumaActual + nuevoPeso;
                
                if (nuevaSuma > pesoMaximoAtributo) {
                    respuesta.writeHead(400, { 'Content-Type': 'application/json' });
                    respuesta.end(JSON.stringify({ 
                        error: `La suma de los sub-motivos en la versión activa excede el peso del atributo (${pesoMaximoAtributo}%). Actual: ${sumaActual}% + ${nuevoPeso}% = ${nuevaSuma}%`,
                        suma_actual: sumaActual,
                        nuevo_peso: nuevoPeso,
                        peso_maximo_atributo: pesoMaximoAtributo,
                        suma_total: nuevaSuma
                    }));
                    return;
                }
                
                // 5. Insertar sub-motivo en la versión activa
                const result = await pool.query(`
                    INSERT INTO version_sub_motivos (
                        version_atributo_id,
                        codigo,
                        descripcion,
                        peso_individual,
                        orden,
                        activo,
                        created_at,
                        updated_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
                    RETURNING id, codigo, descripcion, peso_individual, orden, activo
                `, [atributo_id, codigo, descripcion, nuevoPeso, orden || 0, activo !== false]);
                
                console.log(`✅ Sub-motivo creado en versión ${versionId}: ${codigo} (ID: ${result.rows[0].id})`);
                
                respuesta.writeHead(201, { 'Content-Type': 'application/json' });
                respuesta.end(JSON.stringify(result.rows[0]));
                
            } catch (error) {
                console.error('Error creando sub-motivo:', error);
                respuesta.writeHead(500, { 'Content-Type': 'application/json' });
                respuesta.end(JSON.stringify({ error: error.message }));
            }
        });
        return;
    }

    // Eliminar Sub-motivo (simple)
    if (ruta.match(/^\/api\/matriz\/sub-motivos\/\d+$/) && metodo === 'DELETE') {
        console.log('[API] DELETE /api/matriz/sub-motivos/:id');
        
        const token = peticion.headers['authorization']?.split(' ')[1];
        if (!token) {
            respuesta.writeHead(401, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: 'Token requerido' }));
            return;
        }
        
        const id = ruta.split('/').pop();
        try {
            const subMotivoInfo = await pool.query(
                'SELECT codigo, descripcion FROM sub_motivos WHERE id = $1',
                [id]
            );
            
            if (subMotivoInfo.rows.length === 0) {
                respuesta.writeHead(404, { 'Content-Type': 'application/json' });
                respuesta.end(JSON.stringify({ error: 'Sub-motivo no encontrado' }));
                return;
            }
            
            await pool.query('DELETE FROM sub_motivos WHERE id = $1', [id]);
            
            respuesta.writeHead(200, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ 
                success: true, 
                message: `✅ Sub-motivo "${subMotivoInfo.rows[0].codigo}" eliminado.`
            }));
        } catch (error) {
            console.error('Error:', error);
            respuesta.writeHead(500, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: error.message }));
        }
        return;
    }

    // ======================================================
// CONGELAR VERSIÓN ACTUAL (CREAR SNAPSHOT) - CORREGIDO
// ======================================================

if (ruta === '/api/matriz/versiones/congelar' && metodo === 'POST') {
    console.log('[API] POST /api/matriz/versiones/congelar');
    
    const token = peticion.headers['authorization']?.split(' ')[1];
    if (!token) {
        respuesta.writeHead(401, { 'Content-Type': 'application/json' });
        respuesta.end(JSON.stringify({ error: 'Token requerido' }));
        return;
    }
    
    let body = '';
    peticion.on('data', chunk => body += chunk);
    peticion.on('end', async () => {
        const client = await pool.connect();
        try {
            await client.query('BEGIN');
            
            const { version, descripcion, fecha_vigencia } = JSON.parse(body);
            
            if (!version || !fecha_vigencia) {
                await client.query('ROLLBACK');
                respuesta.writeHead(400, { 'Content-Type': 'application/json' });
                respuesta.end(JSON.stringify({ error: 'Versión y fecha vigencia son requeridos' }));
                client.release();
                return;
            }
            
            // 1. Obtener versión activa actual
            const versionActivaResult = await client.query(
                'SELECT id FROM versiones_matriz WHERE activa = true LIMIT 1'
            );
            
            if (versionActivaResult.rows.length === 0) {
                await client.query('ROLLBACK');
                respuesta.writeHead(400, { 'Content-Type': 'application/json' });
                respuesta.end(JSON.stringify({ error: 'No hay una versión activa para congelar' }));
                client.release();
                return;
            }
            
            const versionActivaId = versionActivaResult.rows[0].id;
            
            // 2. Verificar que la nueva versión no exista ya
            const existeResult = await client.query(
                'SELECT id FROM versiones_matriz WHERE version = $1',
                [version]
            );
            
            if (existeResult.rows.length > 0) {
                await client.query('ROLLBACK');
                respuesta.writeHead(400, { 'Content-Type': 'application/json' });
                respuesta.end(JSON.stringify({ error: `La versión "${version}" ya existe` }));
                client.release();
                return;
            }
            
            // 3. Crear la nueva versión (INACTIVA por defecto)
            const nuevaVersionResult = await client.query(`
                INSERT INTO versiones_matriz (
                    version,
                    descripcion,
                    fecha_vigencia,
                    activa,
                    creado_por,
                    creado_en
                ) VALUES ($1, $2, $3, false, $4, NOW())
                RETURNING id
            `, [version, descripcion || `Snapshot de versión ${versionActivaId}`, fecha_vigencia, 'Sistema']);
            
            const nuevaVersionId = nuevaVersionResult.rows[0].id;
            
            // 4. COPIAR FRENTES Y GUARDAR MAPA DE IDs
            const frentes = await client.query(
                'SELECT id, codigo, nombre, peso_maximo, orden, activo FROM version_frentes WHERE version_id = $1',
                [versionActivaId]
            );
            
            const mapaFrentes = {}; // old_id -> new_id
            
            for (const frente of frentes.rows) {
                const nuevoFrenteResult = await client.query(`
                    INSERT INTO version_frentes (
                        version_id,
                        codigo,
                        nombre,
                        peso_maximo,
                        orden,
                        activo,
                        created_at,
                        updated_at
                    ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
                    RETURNING id
                `, [
                    nuevaVersionId,
                    frente.codigo,
                    frente.nombre,
                    frente.peso_maximo,
                    frente.orden,
                    frente.activo
                ]);
                
                const nuevoFrenteId = nuevoFrenteResult.rows[0].id;
                mapaFrentes[frente.id] = nuevoFrenteId;
            }
            
            console.log(`   📦 Frentes copiados: ${frentes.rows.length}`);
            
            // 5. COPIAR ATRIBUTOS USANDO EL MAPA DE FRENTES
            let totalAtributos = 0;
            const mapaAtributos = {}; // old_id -> new_id
            
            for (const [oldFrenteId, newFrenteId] of Object.entries(mapaFrentes)) {
                const atributos = await client.query(
                    'SELECT id, nombre, peso_maximo, orden, activo FROM version_atributos WHERE version_frente_id = $1',
                    [oldFrenteId]
                );
                
                for (const attr of atributos.rows) {
                    const nuevoAtributoResult = await client.query(`
                        INSERT INTO version_atributos (
                            version_frente_id,
                            nombre,
                            peso_maximo,
                            orden,
                            activo,
                            created_at,
                            updated_at
                        ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
                        RETURNING id
                    `, [
                        newFrenteId,
                        attr.nombre,
                        attr.peso_maximo,
                        attr.orden,
                        attr.activo
                    ]);
                    
                    const nuevoAtributoId = nuevoAtributoResult.rows[0].id;
                    mapaAtributos[attr.id] = nuevoAtributoId;
                    totalAtributos++;
                }
            }
            
            console.log(`   📄 Atributos copiados: ${totalAtributos}`);
            
            // 6. COPIAR SUB-MOTIVOS USANDO EL MAPA DE ATRIBUTOS
            let totalSubMotivos = 0;
            
            for (const [oldAttrId, newAttrId] of Object.entries(mapaAtributos)) {
                const subMotivos = await client.query(
                    'SELECT codigo, descripcion, peso_individual, orden, activo FROM version_sub_motivos WHERE version_atributo_id = $1',
                    [oldAttrId]
                );
                
                for (const sub of subMotivos.rows) {
                    await client.query(`
                        INSERT INTO version_sub_motivos (
                            version_atributo_id,
                            codigo,
                            descripcion,
                            peso_individual,
                            orden,
                            activo,
                            created_at,
                            updated_at
                        ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
                    `, [
                        newAttrId,
                        sub.codigo,
                        sub.descripcion,
                        sub.peso_individual,
                        sub.orden,
                        sub.activo
                    ]);
                    totalSubMotivos++;
                }
            }
            
            console.log(`   🔹 Sub-motivos copiados: ${totalSubMotivos}`);
            
            // 7. Confirmar transacción
            await client.query('COMMIT');
            
            console.log(`✅ Versión "${version}" creada como snapshot (ID: ${nuevaVersionId})`);
            console.log(`   📊 Resumen: ${frentes.rows.length} frentes, ${totalAtributos} atributos, ${totalSubMotivos} sub-motivos`);
            
            respuesta.writeHead(200, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({
                success: true,
                message: `Versión "${version}" creada exitosamente como snapshot`,
                version_id: nuevaVersionId,
                resumen: {
                    frentes: frentes.rows.length,
                    atributos: totalAtributos,
                    sub_motivos: totalSubMotivos
                }
            }));
            
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('❌ Error congelando versión:', error);
            respuesta.writeHead(500, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: error.message }));
        } finally {
            client.release();
        }
    });
    return;
}



    // ======================================================
    // API - MATRIZ - OBTENER VERSIONES (CORREGIDO)
    // ======================================================

    if (ruta === '/api/matriz/versiones' && metodo === 'GET') {
        console.log('[API] GET /api/matriz/versiones');
        
        const token = peticion.headers['authorization']?.split(' ')[1];
        if (!token) {
            respuesta.writeHead(401, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: 'Token requerido' }));
            return;
        }
        
        try {
            // Verificar si la tabla existe
            const checkTable = await pool.query(`
                SELECT EXISTS (
                    SELECT FROM information_schema.tables 
                    WHERE table_name = 'versiones_matriz'
                );
            `);
            
            if (!checkTable.rows[0].exists) {
                console.log('⚠️ Tabla versiones_matriz no existe, devolviendo array vacío');
                respuesta.writeHead(200, { 'Content-Type': 'application/json' });
                respuesta.end(JSON.stringify([]));
                return;
            }
            
            const result = await pool.query(`
                SELECT id, version, descripcion, fecha_vigencia, activa, 
                    creado_por, creado_en, publicado_por, publicado_en
                FROM versiones_matriz 
                ORDER BY creado_en DESC
            `);
            
            console.log(`✅ ${result.rows.length} versiones encontradas`);
            
            respuesta.writeHead(200, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify(result.rows));
            
        } catch (error) {
            console.error('❌ Error en /api/matriz/versiones:', error);
            // En caso de error, devolver array vacío en lugar de error 500
            respuesta.writeHead(200, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify([]));
        }
        return;
    }

    if (ruta === '/api/matriz/versiones' && metodo === 'POST') {
        console.log('[API] POST /api/matriz/versiones');
        
        const token = peticion.headers['authorization']?.split(' ')[1];
        if (!token) {
            respuesta.writeHead(401, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: 'Token requerido' }));
            return;
        }
        
        let body = '';
        peticion.on('data', chunk => body += chunk);
        peticion.on('end', async () => {
            try {
                const { version, descripcion } = JSON.parse(body);
                const result = await pool.query(
                    'INSERT INTO versiones_matriz (version, descripcion, activa) VALUES ($1, $2, false) RETURNING *',
                    [version, descripcion]
                );
                respuesta.writeHead(200, { 'Content-Type': 'application/json' });
                respuesta.end(JSON.stringify(result.rows[0]));
            } catch (error) {
                console.error('Error:', error);
                respuesta.writeHead(500, { 'Content-Type': 'application/json' });
                respuesta.end(JSON.stringify({ error: error.message }));
            }
        });
        return;
    }

    if (ruta.match(/^\/api\/matriz\/versiones\/\d+\/activar$/) && metodo === 'PUT') {
        console.log('[API] PUT /api/matriz/versiones/:id/activar');
        
        const token = peticion.headers['authorization']?.split(' ')[1];
        if (!token) {
            respuesta.writeHead(401, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: 'Token requerido' }));
            return;
        }
        
        const id = ruta.split('/')[4];
        try {
            await pool.query('UPDATE versiones_matriz SET activa = false');
            await pool.query('UPDATE versiones_matriz SET activa = true WHERE id = $1', [id]);
            respuesta.writeHead(200, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ success: true }));
        } catch (error) {
            console.error('Error:', error);
            respuesta.writeHead(500, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: error.message }));
        }
        return;
    }

    // ========== RECALCULAR EVALUACIONES COMPLETO ==========
    if (ruta === '/api/matriz/recalcular' && metodo === 'POST') {
        console.log('[API] POST /api/matriz/recalcular - INICIO');
        
        const token = peticion.headers['authorization']?.split(' ')[1];
        if (!token) {
            respuesta.writeHead(401, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: 'Token requerido' }));
            return;
        }
        
        try {
            let actualizados = 0;
            let errores = 0;
            
            // ======================================================
            // PASO 1: Actualizar los pesos en detalles_evaluacion
            // ======================================================
            console.log('📊 PASO 1: Actualizando pesos en detalles_evaluacion...');
            
            const detalles = await pool.query(`
                SELECT d.id, d.submotivo, d.evaluacion_id
                FROM detalles_evaluacion d
                WHERE d.submotivo IS NOT NULL
            `);
            
            console.log(`   Total detalles a procesar: ${detalles.rowCount}`);
            
            for (const detalle of detalles.rows) {
                try {
                    // Buscar el peso actual del submotivo
                    const subMotivo = await pool.query(`
                        SELECT peso_individual FROM sub_motivos 
                        WHERE codigo = $1 AND activo = true
                    `, [detalle.submotivo]);
                    
                    if (subMotivo.rows.length > 0) {
                        const nuevoPeso = parseFloat(subMotivo.rows[0].peso_individual);
                        
                        // Actualizar el peso en detalles_evaluacion
                        await pool.query(`
                            UPDATE detalles_evaluacion 
                            SET peso = $1
                            WHERE id = $2
                        `, [nuevoPeso, detalle.id]);
                        
                        actualizados++;
                        
                        if (actualizados % 1000 === 0) {
                            console.log(`   Procesados ${actualizados} detalles...`);
                        }
                    } else {
                        console.log(`   ⚠️ Submotivo no encontrado: ${detalle.submotivo}`);
                    }
                } catch (err) {
                    errores++;
                    console.error(`   ❌ Error en detalle ${detalle.id}:`, err.message);
                }
            }
            
            console.log(`   ✅ ${actualizados} detalles actualizados, ${errores} errores`);
            
            // ======================================================
            // PASO 2: Recalcular totales por evaluación
            // ======================================================
            console.log('📊 PASO 2: Recalculando totales por evaluación...');
            
            const evaluaciones = await pool.query(`
                SELECT DISTINCT evaluacion_id FROM detalles_evaluacion
            `);
            
            console.log(`   Total evaluaciones a procesar: ${evaluaciones.rowCount}`);
            
            let evaluacionesActualizadas = 0;
            
            for (const eval of evaluaciones.rows) {
                try {
                    // Calcular totales por bloque
                    const totales = await pool.query(`
                        SELECT 
                            COALESCE(SUM(CASE WHEN bloque = 'ENC' AND cumple = true THEN peso ELSE 0 END), 0) as total_enc,
                            COALESCE(SUM(CASE WHEN bloque = 'ECUF' AND cumple = true THEN peso ELSE 0 END), 0) as total_ecuf,
                            COALESCE(SUM(CASE WHEN bloque = 'ECN' AND cumple = true THEN peso ELSE 0 END), 0) as total_ecn,
                            COALESCE(SUM(CASE WHEN cumple = true THEN peso ELSE 0 END), 0) as nota_final
                        FROM detalles_evaluacion
                        WHERE evaluacion_id = $1
                    `, [eval.evaluacion_id]);
                    
                    const t = totales.rows[0];
                    
                    // Actualizar evaluación
                    await pool.query(`
                        UPDATE evaluaciones 
                        SET total_enc = $1,
                            total_ecuf = $2,
                            total_ecn = $3,
                            nota_final = $4
                        WHERE id = $5
                    `, [t.total_enc, t.total_ecuf, t.total_ecn, t.nota_final, eval.evaluacion_id]);
                    
                    evaluacionesActualizadas++;
                    
                    if (evaluacionesActualizadas % 100 === 0) {
                        console.log(`   Procesadas ${evaluacionesActualizadas} evaluaciones...`);
                    }
                    
                } catch (err) {
                    console.error(`   ❌ Error en evaluación ${eval.evaluacion_id}:`, err.message);
                }
            }
            
            console.log(`   ✅ ${evaluacionesActualizadas} evaluaciones actualizadas`);
            
            // ======================================================
            // PASO 3: Resumen final
            // ======================================================
            const resumen = await pool.query(`
                SELECT 
                    COUNT(*) as total_evaluaciones,
                    ROUND(AVG(nota_final), 2) as promedio_notas,
                    MIN(nota_final) as nota_min,
                    MAX(nota_final) as nota_max
                FROM evaluaciones
            `);
            
            console.log('📊 RESUMEN FINAL:');
            console.log(`   Total evaluaciones: ${resumen.rows[0].total_evaluaciones}`);
            console.log(`   Promedio notas: ${resumen.rows[0].promedio_notas}%`);
            console.log(`   Nota mínima: ${resumen.rows[0].nota_min}%`);
            console.log(`   Nota máxima: ${resumen.rows[0].nota_max}%`);
            
            respuesta.writeHead(200, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ 
                success: true, 
                detalles_actualizados: actualizados,
                evaluaciones_actualizadas: evaluacionesActualizadas,
                errores: errores,
                resumen: resumen.rows[0],
                message: `${evaluacionesActualizadas} evaluaciones y ${actualizados} detalles actualizados`
            }));
            
        } catch (error) {
            console.error('❌ Error en recalcular:', error);
            respuesta.writeHead(500, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: error.message }));
        }
        return;
    }

    // ======================================================
    // VALIDACIONES PARA MATRIZ DE EVALUACIÓN
    // ======================================================

    // Validar sub-motivos de un atributo
    if (ruta === '/api/matriz/validar/sub-motivos' && metodo === 'POST') {
        console.log('[API] POST /api/matriz/validar/sub-motivos');
        
        const token = peticion.headers['authorization']?.split(' ')[1];
        if (!token) {
            respuesta.writeHead(401, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: 'Token requerido' }));
            return;
        }
        
        let body = '';
        peticion.on('data', chunk => body += chunk);
        peticion.on('end', async () => {
            try {
                const { atributo_id, sub_motivo_id, nuevo_peso, excluir_id } = JSON.parse(body);
                
                // Obtener peso máximo del atributo
                const atributo = await pool.query(
                    'SELECT peso_maximo FROM atributos WHERE id = $1',
                    [atributo_id]
                );
                
                if (atributo.rows.length === 0) {
                    respuesta.writeHead(404, { 'Content-Type': 'application/json' });
                    respuesta.end(JSON.stringify({ error: 'Atributo no encontrado' }));
                    return;
                }
                
                const pesoMaximo = parseFloat(atributo.rows[0].peso_maximo);
                
                // Sumar pesos de sub-motivos (excluyendo el que se está editando)
                let query = 'SELECT COALESCE(SUM(peso_individual), 0) as total FROM sub_motivos WHERE atributo_id = $1';
                let params = [atributo_id];
                
                if (excluir_id) {
                    query += ' AND id != $2';
                    params.push(excluir_id);
                }
                
                const sumaActual = await pool.query(query, params);
                let totalActual = parseFloat(sumaActual.rows[0].total);
                
                if (sub_motivo_id) {
                    // Es una actualización
                    const subActual = await pool.query(
                        'SELECT peso_individual FROM sub_motivos WHERE id = $1',
                        [sub_motivo_id]
                    );
                    if (subActual.rows.length > 0) {
                        totalActual -= parseFloat(subActual.rows[0].peso_individual);
                    }
                }
                
                const nuevoTotal = totalActual + nuevo_peso;
                
                if (nuevoTotal > pesoMaximo) {
                    respuesta.writeHead(400, { 'Content-Type': 'application/json' });
                    respuesta.end(JSON.stringify({ 
                        valid: false, 
                        error: `La suma de los sub-motivos (${nuevoTotal}%) excede el peso máximo del atributo (${pesoMaximo}%)`,
                        total_actual: nuevoTotal,
                        peso_maximo: pesoMaximo
                    }));
                    return;
                }
                
                respuesta.writeHead(200, { 'Content-Type': 'application/json' });
                respuesta.end(JSON.stringify({ valid: true, total: nuevoTotal, peso_maximo: pesoMaximo }));
                
            } catch (error) {
                console.error('Error:', error);
                respuesta.writeHead(500, { 'Content-Type': 'application/json' });
                respuesta.end(JSON.stringify({ error: error.message }));
            }
        });
        return;
    }

    // Validar atributos de un frente
    if (ruta === '/api/matriz/validar/atributos' && metodo === 'POST') {
        console.log('[API] POST /api/matriz/validar/atributos');
        
        const token = peticion.headers['authorization']?.split(' ')[1];
        if (!token) {
            respuesta.writeHead(401, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: 'Token requerido' }));
            return;
        }
        
        let body = '';
        peticion.on('data', chunk => body += chunk);
        peticion.on('end', async () => {
            try {
                const { frente_id, atributo_id, nuevo_peso, excluir_id } = JSON.parse(body);
                
                const frente = await pool.query(
                    'SELECT peso_maximo FROM frentes WHERE id = $1',
                    [frente_id]
                );
                
                if (frente.rows.length === 0) {
                    respuesta.writeHead(404, { 'Content-Type': 'application/json' });
                    respuesta.end(JSON.stringify({ error: 'Frente no encontrado' }));
                    return;
                }
                
                const pesoMaximo = parseFloat(frente.rows[0].peso_maximo);
                
                let query = 'SELECT COALESCE(SUM(peso_maximo), 0) as total FROM atributos WHERE frente_id = $1';
                let params = [frente_id];
                
                if (excluir_id) {
                    query += ' AND id != $2';
                    params.push(excluir_id);
                }
                
                const sumaActual = await pool.query(query, params);
                let totalActual = parseFloat(sumaActual.rows[0].total);
                
                if (atributo_id) {
                    const attrActual = await pool.query(
                        'SELECT peso_maximo FROM atributos WHERE id = $1',
                        [atributo_id]
                    );
                    if (attrActual.rows.length > 0) {
                        totalActual -= parseFloat(attrActual.rows[0].peso_maximo);
                    }
                }
                
                const nuevoTotal = totalActual + nuevo_peso;
                
                if (nuevoTotal > pesoMaximo) {
                    respuesta.writeHead(400, { 'Content-Type': 'application/json' });
                    respuesta.end(JSON.stringify({ 
                        valid: false, 
                        error: `La suma de los atributos (${nuevoTotal}%) excede el peso máximo del frente (${pesoMaximo}%)`,
                        total_actual: nuevoTotal,
                        peso_maximo: pesoMaximo
                    }));
                    return;
                }
                
                respuesta.writeHead(200, { 'Content-Type': 'application/json' });
                respuesta.end(JSON.stringify({ valid: true, total: nuevoTotal, peso_maximo: pesoMaximo }));
                
            } catch (error) {
                console.error('Error:', error);
                respuesta.writeHead(500, { 'Content-Type': 'application/json' });
                respuesta.end(JSON.stringify({ error: error.message }));
            }
        });
        return;
    }

    // Validar suma total de frentes
    if (ruta === '/api/matriz/validar/frentes' && metodo === 'POST') {
        console.log('[API] POST /api/matriz/validar/frentes');
        
        const token = peticion.headers['authorization']?.split(' ')[1];
        if (!token) {
            respuesta.writeHead(401, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: 'Token requerido' }));
            return;
        }
        
        let body = '';
        peticion.on('data', chunk => body += chunk);
        peticion.on('end', async () => {
            try {
                const { frente_id, nuevo_peso, excluir_id } = JSON.parse(body);
                
                let query = 'SELECT COALESCE(SUM(peso_maximo), 0) as total FROM frentes WHERE activo = true';
                let params = [];
                
                if (excluir_id) {
                    query += ' AND id != $1';
                    params.push(excluir_id);
                }
                
                const sumaActual = await pool.query(query, params);
                let totalActual = parseFloat(sumaActual.rows[0].total);
                
                if (frente_id) {
                    const frenteActual = await pool.query(
                        'SELECT peso_maximo FROM frentes WHERE id = $1',
                        [frente_id]
                    );
                    if (frenteActual.rows.length > 0) {
                        totalActual -= parseFloat(frenteActual.rows[0].peso_maximo);
                    }
                }
                
                const nuevoTotal = totalActual + nuevo_peso;
                
                if (nuevoTotal > 100) {
                    respuesta.writeHead(400, { 'Content-Type': 'application/json' });
                    respuesta.end(JSON.stringify({ 
                        valid: false, 
                        error: `La suma total de los frentes (${nuevoTotal}%) excede el 100%`,
                        total_actual: nuevoTotal,
                        peso_maximo: 100
                    }));
                    return;
                }
                
                respuesta.writeHead(200, { 'Content-Type': 'application/json' });
                respuesta.end(JSON.stringify({ valid: true, total: nuevoTotal, peso_maximo: 100 }));
                
            } catch (error) {
                console.error('Error:', error);
                respuesta.writeHead(500, { 'Content-Type': 'application/json' });
                respuesta.end(JSON.stringify({ error: error.message }));
            }
        });
        return;
    }

    // ======================================================
    // VISTAS
    // ======================================================

    // Página principal - Login
    if (ruta === '/' || ruta === '/login' || ruta === '/login.html') {
        servirVista('login.html', respuesta);
        return;
    }

    // Dashboard Auditor
    if (ruta === '/auditor' || ruta === '/auditor.html') {
        servirVista('auditor/dashboard.html', respuesta);
        return;
    }

    // Dashboard Supervisor
    if (ruta === '/supervisor' || ruta === '/supervisor.html') {
        servirVista('supervisor/dashboard.html', respuesta);
        return;
    }

    // ======================================================
    // API - CONSULTA GENÉRICA (PostgreSQL Query Layer)
    // Recibe parámetros de consulta y los convierte a SQL
    // ======================================================
    if (ruta === '/api/query' && metodo === 'POST') {
        let body = '';
        peticion.on('data', chunk => body += chunk);
        peticion.on('end', async () => {
            try {
                const q = JSON.parse(body);
                const { table, operation, selectFields, filters, data, orderBy, orderAscending, limit, isSingle, isMaybeSingle, isHead, countOption } = q;

                if (!table) {
                    respuesta.writeHead(400, { 'Content-Type': 'application/json' });
                    respuesta.end(JSON.stringify({ error: 'Tabla no especificada' }));
                    return;
                }

                // Sanitizar nombre de tabla (solo alfanuméricos y guion bajo)
                const tableName = table.replace(/[^a-zA-Z0-9_]/g, '');
                let sql = '';
                let params = [];
                let idx = 1;

                switch (operation) {
                    case 'select': {
                        // Construir SELECT
                        // Manejar selectFields - si contiene *, usar *; si es lista, sanitizar
                        let fields = '*';
                        if (selectFields && selectFields !== '*') {
                            // Sanitizar campos (solo alfanuméricos, guion bajo, coma, espacio, paréntesis para relaciones)
                            fields = selectFields.replace(/[^a-zA-Z0-9_,.*\s()]/g, '');
                        }

                        sql = `SELECT ${fields} FROM ${tableName} WHERE 1=1`;

                        // Aplicar filtros
                        for (const f of (filters || [])) {
                            const col = (f.column || '').replace(/[^a-zA-Z0-9_]/g, '');
                            if (!col) continue;

                            switch (f.type) {
                                case 'eq':
                                    sql += ` AND ${col} = $${idx++}`;
                                    params.push(f.value);
                                    break;
                                case 'neq':
                                    sql += ` AND ${col} != $${idx++}`;
                                    params.push(f.value);
                                    break;
                                case 'gt':
                                    sql += ` AND ${col} > $${idx++}`;
                                    params.push(f.value);
                                    break;
                                case 'gte':
                                    sql += ` AND ${col} >= $${idx++}`;
                                    params.push(f.value);
                                    break;
                                case 'lt':
                                    sql += ` AND ${col} < $${idx++}`;
                                    params.push(f.value);
                                    break;
                                case 'lte':
                                    sql += ` AND ${col} <= $${idx++}`;
                                    params.push(f.value);
                                    break;
                                case 'like':
                                    sql += ` AND ${col} LIKE $${idx++}`;
                                    params.push(f.value);
                                    break;
                                case 'ilike':
                                    sql += ` AND ${col} ILIKE $${idx++}`;
                                    params.push(f.value);
                                    break;
                                case 'in':
                                    if (f.values && f.values.length > 0) {
                                        const placeholders = f.values.map(() => `$${idx++}`).join(', ');
                                        sql += ` AND ${col} IN (${placeholders})`;
                                        params.push(...f.values);
                                    }
                                    break;
                                case 'is':
                                    if (f.value === null) {
                                        sql += ` AND ${col} IS NULL`;
                                    } else {
                                        sql += ` AND ${col} IS $${idx++}`;
                                        params.push(f.value);
                                    }
                                    break;
                                case 'not':
                                    if (f.operator === 'is' && (f.value === null || f.value === 'null')) {
                                        sql += ` AND ${col} IS NOT NULL`;
                                    } else if (f.operator === 'in') {
                                        if (f.values && f.values.length > 0) {
                                            const placeholders = f.values.map(() => `$${idx++}`).join(', ');
                                            sql += ` AND ${col} NOT IN (${placeholders})`;
                                            params.push(...f.values);
                                        }
                                    } else {
                                        sql += ` AND ${col} != $${idx++}`;
                                        params.push(f.value);
                                    }
                                    break;
                                case 'contains':
                                    sql += ` AND ${col} @> $${idx++}`;
                                    params.push(JSON.stringify(f.value));
                                    break;
                            }
                        }

                        // ORDER BY
                        if (orderBy) {
                            const orderCol = orderBy.replace(/[^a-zA-Z0-9_]/g, '');
                            const direction = orderAscending !== false ? 'ASC' : 'DESC';
                            sql += ` ORDER BY ${orderCol} ${direction}`;
                        }

                        // LIMIT
                        if (limit) {
                            sql += ` LIMIT $${idx++}`;
                            params.push(parseInt(limit));
                        }

                        // Ejecutar
                        let result;
                        if (isHead && countOption) {
                            // Solo count, sin datos
                            const countSql = sql.replace(/^SELECT .+ FROM/, 'SELECT COUNT(*) as count FROM');
                            result = await pool.query(countSql, params);
                            respuesta.writeHead(200, { 'Content-Type': 'application/json' });
                            respuesta.end(JSON.stringify({ data: [], count: parseInt(result.rows[0]?.count || 0) }));
                            return;
                        }

                        result = await pool.query(sql, params);

                        // Si es single/maybeSingle, verificar
                        let rows = result.rows;
                        let count = result.rowCount;

                        respuesta.writeHead(200, { 'Content-Type': 'application/json' });
                        respuesta.end(JSON.stringify({ data: rows, count: count }));
                        return;
                    }

                    case 'insert': {
                        if (!data) {
                            respuesta.writeHead(400, { 'Content-Type': 'application/json' });
                            respuesta.end(JSON.stringify({ error: 'No hay datos para insertar' }));
                            return;
                        }

                        const dataArray = Array.isArray(data) ? data : [data];
                        const results = [];

                        for (const item of dataArray) {
                            const keys = Object.keys(item);
                            const values = Object.values(item);
                            const colNames = keys.map(k => k.replace(/[^a-zA-Z0-9_]/g, '')).join(', ');
                            const placeholders = keys.map((_, i) => `$${idx++}`).join(', ');

                            const insertResult = await pool.query(
                                `INSERT INTO ${tableName} (${colNames}) VALUES (${placeholders}) RETURNING *`,
                                values
                            );
                            results.push(...insertResult.rows);
                        }

                        respuesta.writeHead(200, { 'Content-Type': 'application/json' });
                        respuesta.end(JSON.stringify({ data: results, count: results.length }));
                        return;
                    }

                    case 'update': {
                        if (!data) {
                            respuesta.writeHead(400, { 'Content-Type': 'application/json' });
                            respuesta.end(JSON.stringify({ error: 'No hay datos para actualizar' }));
                            return;
                        }

                        const keys = Object.keys(data);
                        const values = Object.values(data);
                        const setClause = keys.map((k, i) => `${k.replace(/[^a-zA-Z0-9_]/g, '')} = $${idx++}`).join(', ');
                        params = [...values];

                        sql = `UPDATE ${tableName} SET ${setClause} WHERE 1=1`;

                        // Aplicar filtros
                        for (const f of (filters || [])) {
                            const col = (f.column || '').replace(/[^a-zA-Z0-9_]/g, '');
                            if (!col) continue;

                            switch (f.type) {
                                case 'eq':
                                    sql += ` AND ${col} = $${idx++}`;
                                    params.push(f.value);
                                    break;
                                case 'neq':
                                    sql += ` AND ${col} != $${idx++}`;
                                    params.push(f.value);
                                    break;
                                case 'in':
                                    if (f.values && f.values.length > 0) {
                                        const placeholders = f.values.map(() => `$${idx++}`).join(', ');
                                        sql += ` AND ${col} IN (${placeholders})`;
                                        params.push(...f.values);
                                    }
                                    break;
                                default:
                                    // Para otros filtros en UPDATE, usar eq como fallback
                                    sql += ` AND ${col} = $${idx++}`;
                                    params.push(f.value);
                                    break;
                            }
                        }

                        sql += ' RETURNING *';

                        const updateResult = await pool.query(sql, params);

                        respuesta.writeHead(200, { 'Content-Type': 'application/json' });
                        respuesta.end(JSON.stringify({ data: updateResult.rows, count: updateResult.rowCount }));
                        return;
                    }

                    case 'delete': {
                        sql = `DELETE FROM ${tableName} WHERE 1=1`;

                        for (const f of (filters || [])) {
                            const col = (f.column || '').replace(/[^a-zA-Z0-9_]/g, '');
                            if (!col) continue;

                            switch (f.type) {
                                case 'eq':
                                    sql += ` AND ${col} = $${idx++}`;
                                    params.push(f.value);
                                    break;
                                case 'neq':
                                    sql += ` AND ${col} != $${idx++}`;
                                    params.push(f.value);
                                    break;
                                case 'in':
                                    if (f.values && f.values.length > 0) {
                                        const placeholders = f.values.map(() => `$${idx++}`).join(', ');
                                        sql += ` AND ${col} IN (${placeholders})`;
                                        params.push(...f.values);
                                    }
                                    break;
                                default:
                                    sql += ` AND ${col} = $${idx++}`;
                                    params.push(f.value);
                                    break;
                            }
                        }

                        sql += ' RETURNING *';

                        const deleteResult = await pool.query(sql, params);

                        respuesta.writeHead(200, { 'Content-Type': 'application/json' });
                        respuesta.end(JSON.stringify({ data: deleteResult.rows, count: deleteResult.rowCount }));
                        return;
                    }

                    case 'upsert': {
                        if (!data) {
                            respuesta.writeHead(400, { 'Content-Type': 'application/json' });
                            respuesta.end(JSON.stringify({ error: 'No hay datos para upsert' }));
                            return;
                        }

                        const dataArray = Array.isArray(data) ? data : [data];

                        for (const item of dataArray) {
                            const keys = Object.keys(item);
                            const values = Object.values(item);
                            const colNames = keys.map(k => k.replace(/[^a-zA-Z0-9_]/g, '')).join(', ');
                            const placeholders = keys.map((_, i) => `$${idx++}`).join(', ');

                            // Intentar INSERT, si falla por conflicto, hacer UPDATE
                            try {
                                await pool.query(
                                    `INSERT INTO ${tableName} (${colNames}) VALUES (${placeholders})`,
                                    values
                                );
                            } catch (insertErr) {
                                // Si es error de conflicto (unique violation), intentar UPDATE
                                if (insertErr.code === '23505' && filters && filters.length > 0) {
                                    let updateSql = `UPDATE ${tableName} SET `;
                                    let updateParams = [];
                                    let updateIdx = 1;

                                    const setClause = keys.map((k, i) => `${k.replace(/[^a-zA-Z0-9_]/g, '')} = $${updateIdx++}`).join(', ');
                                    updateParams = [...values];
                                    updateSql += setClause + ' WHERE 1=1';

                                    for (const f of filters) {
                                        const col = (f.column || '').replace(/[^a-zA-Z0-9_]/g, '');
                                        if (!col) continue;
                                        updateSql += ` AND ${col} = $${updateIdx++}`;
                                        updateParams.push(f.value);
                                    }

                                    await pool.query(updateSql, updateParams);
                                } else {
                                    throw insertErr;
                                }
                            }
                        }

                        respuesta.writeHead(200, { 'Content-Type': 'application/json' });
                        respuesta.end(JSON.stringify({ data: [], count: dataArray.length }));
                        return;
                    }

                    default:
                        respuesta.writeHead(400, { 'Content-Type': 'application/json' });
                        respuesta.end(JSON.stringify({ error: `Operacion no soportada: ${operation}` }));
                        return;
                }

            } catch (error) {
                console.error('[API /api/query] Error:', error.message);
                respuesta.writeHead(500, { 'Content-Type': 'application/json' });
                respuesta.end(JSON.stringify({ error: error.message, code: error.code || 'ERROR', details: error.detail || '', hint: error.hint || '' }));
            }
        });
        return;
    }

    // ======================================================
    // API - ROLES - Eliminar rol (DELETE)
    // ======================================================
    if (ruta.match(/^\/api\/roles\/\d+$/) && metodo === 'DELETE') {
        console.log('[API] DELETE /api/roles/:id');
        
        const token = peticion.headers['authorization']?.split(' ')[1];
        if (!token) {
            respuesta.writeHead(401, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: 'Token requerido' }));
            return;
        }
        
        const id = parseInt(ruta.split('/').pop());
        
        try {
            // Verificar si el rol existe
            const check = await pool.query('SELECT id, nombre FROM roles WHERE id = $1', [id]);
            if (check.rows.length === 0) {
                respuesta.writeHead(404, { 'Content-Type': 'application/json' });
                respuesta.end(JSON.stringify({ error: 'Rol no encontrado' }));
                return;
            }
            
            const rolNombre = check.rows[0].nombre;
            
            // Eliminar permisos de pestañas asociados
            await pool.query('DELETE FROM rol_pestanas WHERE rol_id = $1', [id]);
            
            // Eliminar el rol
            await pool.query('DELETE FROM roles WHERE id = $1', [id]);
            
            console.log(`✅ Rol "${rolNombre}" (ID: ${id}) eliminado`);
            
            respuesta.writeHead(200, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ success: true, message: 'Rol eliminado' }));
            
        } catch (error) {
            console.error('Error eliminando rol:', error);
            respuesta.writeHead(500, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: error.message }));
        }
        return;
    }

    // ======================================================
    // API - ROL PESTAÑAS
    // ======================================================

    // Eliminar todos los permisos de un rol (DELETE)
    if (ruta.match(/^\/api\/rol-pestanas\/\d+$/) && metodo === 'DELETE') {
        console.log('[API] DELETE /api/rol-pestanas/:rolId');
        
        const token = peticion.headers['authorization']?.split(' ')[1];
        if (!token) {
            respuesta.writeHead(401, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: 'Token requerido' }));
            return;
        }
        
        const rolId = parseInt(ruta.split('/').pop());
        
        try {
            const result = await pool.query('DELETE FROM rol_pestanas WHERE rol_id = $1 RETURNING id', [rolId]);
            console.log(`✅ Eliminados ${result.rowCount} permisos para rol ${rolId}`);
            
            respuesta.writeHead(200, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ success: true, eliminados: result.rowCount }));
            
        } catch (error) {
            console.error('Error:', error);
            respuesta.writeHead(500, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: error.message }));
        }
        return;
    }

    // Insertar nuevos permisos (POST)
    if (ruta === '/api/rol-pestanas' && metodo === 'POST') {
        console.log('[API] POST /api/rol-pestanas');
        
        const token = peticion.headers['authorization']?.split(' ')[1];
        if (!token) {
            respuesta.writeHead(401, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: 'Token requerido' }));
            return;
        }
        
        let body = '';
        peticion.on('data', chunk => body += chunk);
        peticion.on('end', async () => {
            try {
                const { rol_id, pestanas } = JSON.parse(body);
                
                if (!rol_id || !pestanas || pestanas.length === 0) {
                    respuesta.writeHead(400, { 'Content-Type': 'application/json' });
                    respuesta.end(JSON.stringify({ error: 'Datos inválidos' }));
                    return;
                }
                
                let insertados = 0;
                for (const codigo of pestanas) {
                    await pool.query(
                        'INSERT INTO rol_pestanas (rol_id, pestana_codigo) VALUES ($1, $2) ON CONFLICT DO NOTHING',
                        [rol_id, codigo]
                    );
                    insertados++;
                }
                
                console.log(`✅ Insertados ${insertados} permisos para rol ${rol_id}`);
                
                respuesta.writeHead(200, { 'Content-Type': 'application/json' });
                respuesta.end(JSON.stringify({ success: true, insertados }));
                
            } catch (error) {
                console.error('Error:', error);
                respuesta.writeHead(500, { 'Content-Type': 'application/json' });
                respuesta.end(JSON.stringify({ error: error.message }));
            }
        });
        return;
    }

    // ======================================================
    // API - RPC GENÉRICO (PostgreSQL Query Layer)
    // Soporta funciones almacenadas como cerrar_mes, limpiar_sesiones_expiradas, etc.
    // ======================================================
    if (ruta.match(/^\/api\/rpc\/[\w_]+$/) && metodo === 'POST') {
        console.log('[API] POST /api/rpc');
        
        const functionName = ruta.split('/').pop().replace(/[^a-zA-Z0-9_]/g, '');
        let body = '';
        peticion.on('data', chunk => body += chunk);
        peticion.on('end', async () => {
            try {
                const params = body ? JSON.parse(body) : {};

                // Funciones RPC conocidas
                if (functionName === 'cerrar_mes') {
                    const { periodo, anio, mes } = params;

                    // 🔴 CORREGIR ESTA PARTE - No debe usar UPDATE con estado
                    // Elimina o comenta este bloque si existe:
                    /*
                    let updateQuery = "UPDATE evaluaciones SET estado = 'cerrado' WHERE estado IS NULL OR estado = 'abierto'";
                    ...
                    */

                    // 🔴 En su lugar, llamar directamente a la función de PostgreSQL
                    const result = await pool.query(
                        'SELECT cerrar_mes($1, $2, $3) as resultado',
                        [anio || params.p_anio, mes || params.p_mes, params.p_usuario || 'admin']
                    );
                    
                    respuesta.writeHead(200, { 'Content-Type': 'application/json' });
                    respuesta.end(JSON.stringify(result.rows[0].resultado));
                    return;
                }

                if (functionName === 'limpiar_sesiones_expiradas') {
                    // Cerrar sesiones inactivas por más de 30 minutos
                    const result = await pool.query(
                        "UPDATE sesiones_activas SET estado = 'cerrada', fecha_logout = NOW() WHERE estado = 'activa' AND ultima_actividad < NOW() - INTERVAL '30 minutes'"
                    );

                    respuesta.writeHead(200, { 'Content-Type': 'application/json' });
                    respuesta.end(JSON.stringify({ data: { limpiadas: result.rowCount }, error: null }));
                    return;
                }

                // Para funciones RPC desconocidas, intentar llamar a la función de PostgreSQL directamente
                const paramKeys = Object.keys(params);
                const paramValues = Object.values(params);

                if (paramKeys.length > 0) {
                    const placeholders = paramKeys.map((_, i) => `$${i + 1}`).join(', ');
                    const callSql = `SELECT * FROM ${functionName}(${placeholders})`;
                    const result = await pool.query(callSql, paramValues);
                    respuesta.writeHead(200, { 'Content-Type': 'application/json' });
                    respuesta.end(JSON.stringify({ data: result.rows, error: null }));
                } else {
                    const callSql = `SELECT * FROM ${functionName}()`;
                    const result = await pool.query(callSql);
                    respuesta.writeHead(200, { 'Content-Type': 'application/json' });
                    respuesta.end(JSON.stringify({ data: result.rows, error: null }));
                }

            } catch (error) {
                console.error(`[API /api/rpc/${functionName}] Error:`, error.message);
                respuesta.writeHead(500, { 'Content-Type': 'application/json' });
                respuesta.end(JSON.stringify({ error: error.message, code: error.code || 'ERROR' }));
            }
        });
        return;
    }

    // ======================================================
    // API - PESTAÑAS (para generarTabsSupervisor) - VERSIÓN CORRECTA
    // ======================================================

    // Obtener todas las pestañas disponibles (CON autenticación y filtro por rol)
    if (ruta === '/api/pestanas' && metodo === 'GET') {
        console.log('[API] GET pestanas - Con autenticación y filtro por rol');

        // 🔐 Verificar token
        const token = peticion.headers['authorization']?.split(' ')[1];
        
        if (!token) {
            respuesta.writeHead(401, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: 'Token requerido' }));
            return;
        }

        try {
            // Decodificar token para obtener el usuario
            const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString());
            const usuarioId = payload.id;
            
            // 1. Obtener el rol del usuario
            const userResult = await pool.query(
                'SELECT rol_id FROM usuarios WHERE id = $1 AND activo = true',
                [usuarioId]
            );
            
            if (userResult.rows.length === 0) {
                respuesta.writeHead(401, { 'Content-Type': 'application/json' });
                respuesta.end(JSON.stringify({ error: 'Usuario no encontrado o inactivo' }));
                return;
            }
            
            const rolId = userResult.rows[0].rol_id;
            
            // 2. Obtener pestañas permitidas para ese rol
            const result = await pool.query(
                `SELECT p.* FROM pestanas_sistema p
                 INNER JOIN rol_pestanas rp ON p.codigo = rp.pestana_codigo
                 WHERE rp.rol_id = $1 AND p.visible = true
                 ORDER BY p.orden`,
                [rolId]
            );
            
            console.log(`✅ Usuario ${payload.usuario} (rol_id: ${rolId}) - ${result.rows.length} pestañas permitidas`);
            
            respuesta.writeHead(200, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify(result.rows));
            
        } catch (error) {
            console.error('Error en pestanas con auth:', error);
            respuesta.writeHead(500, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: error.message }));
        }
        return;
    }

    // ======================================================
    // API - ESTADO BD (Versión corregida)
    // ======================================================
    if (ruta === '/api/estado-bd' && metodo === 'GET') {
        console.log('[API] GET /api/estado-bd');
        
        const token = peticion.headers['authorization']?.split(' ')[1];
        if (!token) {
            respuesta.writeHead(401, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: 'Token requerido' }));
            return;
        }
        
        try {
            // 1. Tamaño total de la base de datos
            const sizeResult = await pool.query(`
                SELECT pg_database_size(current_database()) as size_bytes
            `);
            const totalSizeBytes = parseInt(sizeResult.rows[0].size_bytes);
            const totalSizeMB = totalSizeBytes / (1024 * 1024);
            
            let totalSizeFormatted = '';
            if (totalSizeMB >= 1024) {
                totalSizeFormatted = `${(totalSizeMB / 1024).toFixed(2)} GB`;
            } else {
                totalSizeFormatted = `${totalSizeMB.toFixed(2)} MB`;
            }
            
            // 2. Obtener todas las tablas del esquema public
            // Dentro del endpoint /api/estado-bd, reemplaza la sección de tablas:

            const tablesResult = await pool.query(`
                SELECT 
                    tablename,
                    pg_total_relation_size('public.' || tablename) as total_bytes,
                    pg_table_size('public.' || tablename) as table_bytes,
                    pg_indexes_size('public.' || tablename) as index_bytes
                FROM pg_tables
                WHERE schemaname = 'public'
                ORDER BY total_bytes DESC
            `);

            const tablas = [];
            let totalRows = 0;

            for (const t of tablesResult.rows) {
                try {
                    // Obtener conteo de filas
                    const countResult = await pool.query(`SELECT COUNT(*) as count FROM "${t.tablename}"`);
                    const rowCount = parseInt(countResult.rows[0].count);
                    totalRows += rowCount;
                    
                    const totalMB = t.total_bytes / (1024 * 1024);
                    const tableMB = t.table_bytes / (1024 * 1024);
                    const indexMB = t.index_bytes / (1024 * 1024);
                    
                    let totalFormatted = '';
                    if (totalMB >= 1024) {
                        totalFormatted = `${(totalMB / 1024).toFixed(2)} GB`;
                    } else {
                        totalFormatted = `${totalMB.toFixed(2)} MB`;
                    }
                    
                    let tableFormatted = '';
                    if (tableMB >= 1024) {
                        tableFormatted = `${(tableMB / 1024).toFixed(2)} GB`;
                    } else if (tableMB >= 1) {
                        tableFormatted = `${tableMB.toFixed(2)} MB`;
                    } else {
                        tableFormatted = `${(tableMB * 1024).toFixed(0)} KB`;
                    }
                    
                    let indexFormatted = '';
                    if (indexMB >= 1024) {
                        indexFormatted = `${(indexMB / 1024).toFixed(2)} GB`;
                    } else if (indexMB >= 1) {
                        indexFormatted = `${indexMB.toFixed(2)} MB`;
                    } else {
                        indexFormatted = `${(indexMB * 1024).toFixed(0)} KB`;
                    }
                    
                    tablas.push({
                        tablename: t.tablename,
                        total_size_mb: parseFloat(totalMB.toFixed(2)),
                        total_size_formatted: totalFormatted,
                        total_size_bytes: parseInt(t.total_bytes),
                        table_size_mb: parseFloat(tableMB.toFixed(2)),
                        table_size_formatted: tableFormatted,
                        indexes_size_mb: parseFloat(indexMB.toFixed(2)),
                        indexes_size_formatted: indexFormatted,
                        row_count: rowCount
                    });
                    
                } catch (err) {
                    console.warn(`Error procesando ${t.tablename}:`, err.message);
                    tablas.push({
                        tablename: t.tablename,
                        total_size_mb: 0,
                        total_size_formatted: '0 B',
                        table_size_formatted: '0 B',
                        indexes_size_formatted: '0 B',
                        row_count: 0
                    });
                }
            }
            
            // Ordenar por tamaño descendente
            tablas.sort((a, b) => b.total_size_mb - a.total_size_mb);
            
            console.log(`✅ BD Size: ${totalSizeFormatted} | Total registros: ${totalRows.toLocaleString()} | Tablas: ${tablas.length}`);
            
            respuesta.writeHead(200, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({
                totalSizeMB: parseFloat(totalSizeMB.toFixed(2)),
                totalSizeFormatted: totalSizeFormatted,
                totalSizeBytes: totalSizeBytes,
                totalRows: totalRows,
                totalTables: tablas.length,
                tablas: tablas.slice(0, 15)
            }));
            
        } catch (error) {
            console.error('❌ Error en /api/estado-bd:', error);
            respuesta.writeHead(500, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: error.message }));
        }
        return;
    }
    
    // ======================================================
    // API - ESTADO BD - Tamaño de tablas específico
    // ======================================================
    if (ruta === '/api/estado-bd/tablas' && metodo === 'GET') {
        console.log('[API] GET /api/estado-bd/tablas');
        
        const token = peticion.headers['authorization']?.split(' ')[1];
        if (!token) {
            respuesta.writeHead(401, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: 'Token requerido' }));
            return;
        }
        
        try {
            const result = await pool.query(`
                SELECT 
                    tablename,
                    pg_total_relation_size('public.' || tablename) as total_bytes
                FROM pg_tables
                WHERE schemaname = 'public'
                ORDER BY total_bytes DESC
            `);
            
            const tablas = result.rows.map(t => ({
                tablename: t.tablename,
                total_size_mb: parseFloat((t.total_bytes / (1024 * 1024)).toFixed(2)),
                total_size_bytes: parseInt(t.total_bytes)
            }));
            
            respuesta.writeHead(200, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify(tablas));
            
        } catch (error) {
            console.error('Error:', error);
            respuesta.writeHead(500, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify([]));
        }
        return;
    }

    // ======================================================
    // API - VERSIONES DEL SISTEMA
    // ======================================================

    // Obtener todas las versiones
    if (ruta === '/api/versiones' && metodo === 'GET') {
        console.log('[API] GET /api/versiones');
        
        const token = peticion.headers['authorization']?.split(' ')[1];
        if (!token) {
            respuesta.writeHead(401, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: 'Token requerido' }));
            return;
        }
        
        const { tipo } = urlParseada.query;
        
        try {
            let query = 'SELECT * FROM versiones_sistema';
            const params = [];
            
            if (tipo && tipo !== 'todos') {
                query += ' WHERE tipo = $1';
                params.push(tipo);
            }
            
            query += ' ORDER BY fecha_publicacion DESC';
            
            const result = await pool.query(query, params);
            
            respuesta.writeHead(200, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify(result.rows));
            
        } catch (error) {
            console.error('Error obteniendo versiones:', error);
            respuesta.writeHead(500, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: error.message }));
        }
        return;
    }

    // Publicar nueva versión
    if (ruta === '/api/versiones' && metodo === 'POST') {
        console.log('[API] POST /api/versiones');
        
        const token = peticion.headers['authorization']?.split(' ')[1];
        if (!token) {
            respuesta.writeHead(401, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: 'Token requerido' }));
            return;
        }
        
        // Para multipart/form-data, necesitamos procesar el body de otra forma
        let body = '';
        peticion.on('data', chunk => body += chunk);
        peticion.on('end', async () => {
            try {
                // Parsear multipart manualmente o usar una librería
                // Por simplicidad, asumimos JSON
                const { version, tipo, descripcion, publicado_por, contenido_html, nombre_archivo } = JSON.parse(body);
                
                const result = await pool.query(`
                    INSERT INTO versiones_sistema (version, tipo, nombre_archivo, contenido_html, descripcion, publicado_por, tamano_bytes, es_activo, fecha_publicacion)
                    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
                    RETURNING id
                `, [version, tipo, nombre_archivo, contenido_html, descripcion, publicado_por, contenido_html.length, false]);
                
                console.log(`✅ Versión ${version} publicada`);
                
                respuesta.writeHead(201, { 'Content-Type': 'application/json' });
                respuesta.end(JSON.stringify({ success: true, id: result.rows[0].id }));
                
            } catch (error) {
                console.error('Error publicando versión:', error);
                respuesta.writeHead(500, { 'Content-Type': 'application/json' });
                respuesta.end(JSON.stringify({ error: error.message }));
            }
        });
        return;
    }

    // Activar una versión
    if (ruta.match(/^\/api\/versiones\/\d+\/activar$/) && metodo === 'PUT') {
        console.log('[API] PUT /api/versiones/:id/activar');
        
        const token = peticion.headers['authorization']?.split(' ')[1];
        if (!token) {
            respuesta.writeHead(401, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: 'Token requerido' }));
            return;
        }
        
        const id = parseInt(ruta.split('/')[3]);
        const { tipo } = urlParseada.query;
        
        try {
            // Desactivar todas las versiones del mismo tipo
            await pool.query('UPDATE versiones_sistema SET es_activo = false WHERE tipo = $1', [tipo]);
            
            // Activar la versión seleccionada
            const result = await pool.query('UPDATE versiones_sistema SET es_activo = true WHERE id = $1 RETURNING id', [id]);
            
            if (result.rowCount === 0) {
                respuesta.writeHead(404, { 'Content-Type': 'application/json' });
                respuesta.end(JSON.stringify({ error: 'Versión no encontrada' }));
                return;
            }
            
            console.log(`✅ Versión ID ${id} activada`);
            
            respuesta.writeHead(200, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ success: true }));
            
        } catch (error) {
            console.error('Error activando versión:', error);
            respuesta.writeHead(500, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: error.message }));
        }
        return;
    }

    // Eliminar una versión
    if (ruta.match(/^\/api\/versiones\/\d+$/) && metodo === 'DELETE') {
        console.log('[API] DELETE /api/versiones/:id');
        
        const token = peticion.headers['authorization']?.split(' ')[1];
        if (!token) {
            respuesta.writeHead(401, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: 'Token requerido' }));
            return;
        }
        
        const id = parseInt(ruta.split('/').pop());
        
        try {
            const result = await pool.query('DELETE FROM versiones_sistema WHERE id = $1 RETURNING id', [id]);
            
            if (result.rowCount === 0) {
                respuesta.writeHead(404, { 'Content-Type': 'application/json' });
                respuesta.end(JSON.stringify({ error: 'Versión no encontrada' }));
                return;
            }
            
            console.log(`✅ Versión ID ${id} eliminada`);
            
            respuesta.writeHead(200, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ success: true }));
            
        } catch (error) {
            console.error('Error eliminando versión:', error);
            respuesta.writeHead(500, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: error.message }));
        }
        return;
    }

    // ======================================================
    // API - SOLICITUDES - Obtener una solicitud por ID
    // ======================================================
    if (ruta.match(/^\/api\/solicitudes\/\d+$/) && metodo === 'GET') {
        console.log('[API] GET /api/solicitudes/:id');
        
        const token = peticion.headers['authorization']?.split(' ')[1];
        const id = parseInt(ruta.split('/').pop());
        
        if (!token) {
            respuesta.writeHead(401, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: 'Token requerido' }));
            return;
        }
        
        try {
            const result = await pool.query(
                'SELECT * FROM solicitudes_requerimientos WHERE id = $1',
                [id]
            );
            
            if (result.rows.length === 0) {
                respuesta.writeHead(404, { 'Content-Type': 'application/json' });
                respuesta.end(JSON.stringify({ error: 'Solicitud no encontrada' }));
                return;
            }
            
            respuesta.writeHead(200, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify(result.rows[0]));
            
        } catch (error) {
            console.error('Error obteniendo solicitud:', error);
            respuesta.writeHead(500, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: error.message }));
        }
        return;
    }

    // ======================================================
    // API - SOLICITUDES - Actualizar estado
    // ======================================================
    if (ruta.match(/^\/api\/solicitudes\/\d+$/) && metodo === 'PUT') {
        console.log('[API] PUT /api/solicitudes/:id');
        
        const token = peticion.headers['authorization']?.split(' ')[1];
        const id = parseInt(ruta.split('/').pop());
        
        if (!token) {
            respuesta.writeHead(401, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: 'Token requerido' }));
            return;
        }
        
        let body = '';
        peticion.on('data', chunk => body += chunk);
        peticion.on('end', async () => {
            try {
                const { estado, fecha_aprobacion, fecha_inicio_desarrollo, fecha_entrega, 
                        responsable_asignado, tiempo_estimado_horas, motivo_rechazo } = JSON.parse(body);
                
                let query = 'UPDATE solicitudes_requerimientos SET estado = $1, updated_at = NOW()';
                const values = [estado];
                let idx = 2;
                
                if (fecha_aprobacion) {
                    query += `, fecha_aprobacion = $${idx++}`;
                    values.push(fecha_aprobacion);
                }
                if (fecha_inicio_desarrollo) {
                    query += `, fecha_inicio_desarrollo = $${idx++}`;
                    values.push(fecha_inicio_desarrollo);
                }
                if (fecha_entrega) {
                    query += `, fecha_entrega = $${idx++}`;
                    values.push(fecha_entrega);
                }
                if (responsable_asignado !== undefined) {
                    query += `, responsable_asignado = $${idx++}`;
                    values.push(responsable_asignado);
                }
                if (tiempo_estimado_horas !== undefined) {
                    query += `, tiempo_estimado_horas = $${idx++}`;
                    values.push(tiempo_estimado_horas);
                }
                if (motivo_rechazo !== undefined) {
                    query += `, motivo_rechazo = $${idx++}`;
                    values.push(motivo_rechazo);
                }
                
                query += ` WHERE id = $${idx}`;
                values.push(id);
                
                const result = await pool.query(query, values);
                
                if (result.rowCount === 0) {
                    respuesta.writeHead(404, { 'Content-Type': 'application/json' });
                    respuesta.end(JSON.stringify({ error: 'Solicitud no encontrada' }));
                    return;
                }
                
                console.log(`✅ Solicitud ${id} actualizada a estado: ${estado}`);
                
                respuesta.writeHead(200, { 'Content-Type': 'application/json' });
                respuesta.end(JSON.stringify({ success: true }));
                
            } catch (error) {
                console.error('Error:', error);
                respuesta.writeHead(500, { 'Content-Type': 'application/json' });
                respuesta.end(JSON.stringify({ error: error.message }));
            }
        });
        return;
    }

    // ======================================================
    // API - ESTRUCTURA DE EVALUACIÓN (NUEVA MATRIZ CONFIGURABLE)
    // ======================================================

    // Obtener estructura completa de evaluación (versión activa)
    if (ruta === '/api/evaluacion/estructura' && metodo === 'GET') {
        console.log('[API] GET /api/evaluacion/estructura');
        
        const token = peticion.headers['authorization']?.split(' ')[1];
        if (!token) {
            respuesta.writeHead(401, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: 'Token requerido' }));
            return;
        }
        
        try {
            // Verificar si las tablas existen
            const checkTables = await pool.query(`
                SELECT EXISTS (
                    SELECT 1 FROM information_schema.tables 
                    WHERE table_name = 'versiones_matriz'
                );
            `);
            
            if (!checkTables.rows[0].exists) {
                console.log('⚠️ Tablas de estructura no encontradas');
                respuesta.writeHead(200, { 'Content-Type': 'application/json' });
                respuesta.end(JSON.stringify({ 
                    version: 'default', 
                    frentes: [],
                    message: 'Tablas de estructura no configuradas aún'
                }));
                return;
            }
            
            // Obtener versión activa
            const versionActiva = await pool.query(`
                SELECT id, version FROM versiones_matriz WHERE activa = true LIMIT 1
            `);
            
            const versionNombre = versionActiva.rows[0]?.version || 'default';
            
            // Obtener frentes
            const frentes = await pool.query(`
                SELECT id, codigo, nombre, peso_maximo, orden 
                FROM frentes WHERE activo = true ORDER BY orden
            `);
            
            const resultado = {
                version: versionNombre,
                frentes: []
            };
            
            for (const frente of frentes.rows) {
                // Obtener atributos del frente
                const atributos = await pool.query(`
                    SELECT id, nombre, peso_maximo, orden 
                    FROM atributos 
                    WHERE frente_id = $1 AND activo = true 
                    ORDER BY orden
                `, [frente.id]);
                
                const frenteData = {
                    id: frente.id,
                    codigo: frente.codigo,
                    nombre: frente.nombre,
                    peso_maximo: parseFloat(frente.peso_maximo),
                    atributos: []
                };
                
                for (const attr of atributos.rows) {
                    // Obtener sub-motivos del atributo
                    const subMotivos = await pool.query(`
                        SELECT id, codigo, descripcion, peso_individual, orden 
                        FROM sub_motivos 
                        WHERE atributo_id = $1 AND activo = true 
                        ORDER BY orden
                    `, [attr.id]);
                    
                    frenteData.atributos.push({
                        id: attr.id,
                        nombre: attr.nombre,
                        peso_maximo: parseFloat(attr.peso_maximo),
                        sub_motivos: subMotivos.rows.map(sm => ({
                            id: sm.id,
                            codigo: sm.codigo,
                            descripcion: sm.descripcion,
                            peso_individual: parseFloat(sm.peso_individual)
                        }))
                    });
                }
                
                resultado.frentes.push(frenteData);
            }
            
            // Obtener reglas especiales
            const reglas = await pool.query(`
                SELECT sub_motivo_origen, tipo_regla, sub_motivos_afectados, configuracion
                FROM reglas_evaluacion WHERE activo = true
            `);
            
            resultado.reglas = reglas.rows;
            
            console.log(`✅ Estructura de evaluación cargada - Versión: ${versionNombre}, Frentes: ${resultado.frentes.length}`);
            
            respuesta.writeHead(200, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify(resultado));
            
        } catch (error) {
            console.error('❌ Error en /api/evaluacion/estructura:', error);
            respuesta.writeHead(500, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: error.message }));
        }
        return;
    }

    // Obtener versión activa
    if (ruta === '/api/evaluacion/version-activa' && metodo === 'GET') {
        console.log('[API] GET /api/evaluacion/version-activa');
        
        const token = peticion.headers['authorization']?.split(' ')[1];
        if (!token) {
            respuesta.writeHead(401, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: 'Token requerido' }));
            return;
        }
        
        try {
            const result = await pool.query(`
                SELECT id, version, descripcion, activa, created_at 
                FROM versiones_matriz 
                WHERE activa = true 
                LIMIT 1
            `);
            
            if (result.rows.length === 0) {
                respuesta.writeHead(200, { 'Content-Type': 'application/json' });
                respuesta.end(JSON.stringify({ version: 'default', activa: false, message: 'No hay versión activa configurada' }));
                return;
            }
            
            console.log(`✅ Versión activa: ${result.rows[0].version}`);
            
            respuesta.writeHead(200, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify(result.rows[0]));
            
        } catch (error) {
            console.error('❌ Error en /api/evaluacion/version-activa:', error);
            respuesta.writeHead(500, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: error.message }));
        }
        return;
    }    

    // ======================================================
    // API - MATRIZ VERSIONADA (NUEVO SISTEMA DE VERSIONADO)
    // ======================================================

    // ---------- OBTENER VERSIÓN ACTIVA ----------
    if (ruta === '/api/matriz/versiones/activa' && metodo === 'GET') {
        console.log('[API] GET /api/matriz/versiones/activa');
        
        const token = peticion.headers['authorization']?.split(' ')[1];
        if (!token) {
            respuesta.writeHead(401, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: 'Token requerido' }));
            return;
        }
        
        try {
            const result = await pool.query(`
                SELECT * FROM versiones_matriz WHERE activa = true LIMIT 1
            `);
            
            if (result.rows.length === 0) {
                respuesta.writeHead(404, { 'Content-Type': 'application/json' });
                respuesta.end(JSON.stringify({ error: 'No hay versión activa' }));
                return;
            }
            
            respuesta.writeHead(200, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify(result.rows[0]));
            
        } catch (error) {
            console.error('Error en /api/matriz/versiones/activa:', error);
            respuesta.writeHead(500, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: error.message }));
        }
        return;
    }

    // ---------- OBTENER VERSIÓN POR FECHA ----------
    if (ruta === '/api/matriz/versiones/por-fecha' && metodo === 'GET') {
        console.log('[API] GET /api/matriz/versiones/por-fecha');
        
        const token = peticion.headers['authorization']?.split(' ')[1];
        if (!token) {
            respuesta.writeHead(401, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: 'Token requerido' }));
            return;
        }
        
        const { fecha } = urlParseada.query;
        if (!fecha) {
            respuesta.writeHead(400, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: 'Fecha requerida' }));
            return;
        }
        
        try {
            const result = await pool.query(`
                SELECT * FROM versiones_matriz 
                WHERE fecha_vigencia <= $1 
                ORDER BY fecha_vigencia DESC 
                LIMIT 1
            `, [fecha]);
            
            if (result.rows.length === 0) {
                respuesta.writeHead(404, { 'Content-Type': 'application/json' });
                respuesta.end(JSON.stringify({ error: 'No hay versión para esta fecha' }));
                return;
            }
            
            respuesta.writeHead(200, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify(result.rows[0]));
            
        } catch (error) {
            console.error('Error en /api/matriz/versiones/por-fecha:', error);
            respuesta.writeHead(500, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: error.message }));
        }
        return;
    }

    // ---------- OBTENER ESTRUCTURA COMPLETA DE UNA VERSIÓN ----------
    if (ruta.match(/^\/api\/matriz\/versiones\/\d+\/estructura$/) && metodo === 'GET') {
        console.log('[API] GET /api/matriz/versiones/:id/estructura');
        
        const token = peticion.headers['authorization']?.split(' ')[1];
        if (!token) {
            respuesta.writeHead(401, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: 'Token requerido' }));
            return;
        }
        
        // Extraer ID de la URL: /api/matriz/versiones/3/estructura
        const parts = ruta.split('/');
        // parts = ['', 'api', 'matriz', 'versiones', '3', 'estructura']
        const versionId = parseInt(parts[4]);
        
        if (!versionId || isNaN(versionId)) {
            respuesta.writeHead(400, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: 'ID de versión inválido' }));
            return;
        }
        
        console.log(`📡 Obteniendo estructura de versión ID: ${versionId}`);
        
        try {
            // 1. Obtener la versión
            const versionResult = await pool.query(
                'SELECT * FROM versiones_matriz WHERE id = $1',
                [versionId]
            );
            
            if (versionResult.rows.length === 0) {
                respuesta.writeHead(404, { 'Content-Type': 'application/json' });
                respuesta.end(JSON.stringify({ error: 'Versión no encontrada' }));
                return;
            }
            
            const version = versionResult.rows[0];
            console.log(`✅ Versión encontrada: ${version.version}`);
            
            // 2. Obtener frentes de la versión
            const frentesResult = await pool.query(`
                SELECT id, codigo, nombre, peso_maximo, orden 
                FROM version_frentes 
                WHERE version_id = $1 AND activo = true 
                ORDER BY orden
            `, [versionId]);
            
            console.log(`   📋 Frentes encontrados: ${frentesResult.rows.length}`);
            
            const estructura = {
                version: version,
                frentes: []
            };
            
            for (const frente of frentesResult.rows) {
                // 3. Obtener atributos del frente
                const atributosResult = await pool.query(`
                    SELECT id, nombre, peso_maximo, orden 
                    FROM version_atributos 
                    WHERE version_frente_id = $1 AND activo = true 
                    ORDER BY orden
                `, [frente.id]);
                
                console.log(`      📋 Atributos para ${frente.codigo}: ${atributosResult.rows.length}`);
                
                const frenteData = {
                    ...frente,
                    atributos: []
                };
                
                for (const attr of atributosResult.rows) {
                    // 4. Obtener sub-motivos del atributo
                    const subMotivosResult = await pool.query(`
                        SELECT id, codigo, descripcion, peso_individual, orden 
                        FROM version_sub_motivos 
                        WHERE version_atributo_id = $1 AND activo = true 
                        ORDER BY orden
                    `, [attr.id]);
                    
                    frenteData.atributos.push({
                        ...attr,
                        sub_motivos: subMotivosResult.rows
                    });
                }
                
                estructura.frentes.push(frenteData);
            }
            
            console.log(`✅ Estructura completada: ${estructura.frentes.length} frentes`);
            
            respuesta.writeHead(200, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify(estructura));
            
        } catch (error) {
            console.error('❌ Error obteniendo estructura:', error);
            respuesta.writeHead(500, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: error.message }));
        }
        return;
    }

    // ---------- OBTENER VERSIONES DE MATRIZ ----------
    if (ruta === '/api/matriz/versiones' && metodo === 'GET') {
        console.log('[API] GET /api/matriz/versiones');
        
        const token = peticion.headers['authorization']?.split(' ')[1];
        if (!token) {
            respuesta.writeHead(401, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: 'Token requerido' }));
            return;
        }
        
        try {
            const result = await pool.query(`
                SELECT id, version, descripcion, fecha_vigencia, activa, creado_por, creado_en, publicado_por, publicado_en
                FROM versiones_matriz 
                ORDER BY creado_en DESC
            `);
            
            respuesta.writeHead(200, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify(result.rows));
            
        } catch (error) {
            console.error('Error en /api/matriz/versiones:', error);
            respuesta.writeHead(500, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: error.message }));
        }
        return;
    }
    

    // ======================================================
// API - REGLAS DE EVALUACIÓN POR VERSIÓN
// ======================================================

if (ruta.match(/^\/api\/reglas-evaluacion\/version\/\d+$/) && metodo === 'GET') {
    console.log('[API] GET /api/reglas-evaluacion/version/:id');
    
    const token = peticion.headers['authorization']?.split(' ')[1];
    if (!token) {
        respuesta.writeHead(401, { 'Content-Type': 'application/json' });
        respuesta.end(JSON.stringify({ error: 'Token requerido' }));
        return;
    }
    
    const versionId = parseInt(ruta.split('/').pop());
    
    try {
        // Verificar si la tabla existe
        const checkTable = await pool.query(`
            SELECT EXISTS (
                SELECT FROM information_schema.tables 
                WHERE table_name = 'reglas_evaluacion'
            );
        `);
        
        if (!checkTable.rows[0].exists) {
            console.log('⚠️ Tabla reglas_evaluacion no existe, devolviendo array vacío');
            respuesta.writeHead(200, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify([]));
            return;
        }
        
        const result = await pool.query(`
            SELECT 
                id,
                version_id,
                submotivo_origen,
                bloque_origen,
                atributo_origen,
                valor_condicion,
                accion_tipo,
                accion_valor,
                submotivos_afectados,
                excepciones,
                orden,
                activo
            FROM reglas_evaluacion 
            WHERE version_id = $1 AND activo = true 
            ORDER BY orden
        `, [versionId]);
        
        console.log(`✅ ${result.rows.length} reglas encontradas para versión ${versionId}`);
        
        respuesta.writeHead(200, { 'Content-Type': 'application/json' });
        respuesta.end(JSON.stringify(result.rows));
        
    } catch (error) {
        console.error('❌ Error en /api/reglas-evaluacion/version/:id:', error);
        // En caso de error, devolver array vacío
        respuesta.writeHead(200, { 'Content-Type': 'application/json' });
        respuesta.end(JSON.stringify([]));
    }
    return;
}

// ======================================================
// API - REGLAS DE EVALUACIÓN - CRUD
// ======================================================

// GET - Obtener todas las reglas (para administración)
if (ruta === '/api/reglas-evaluacion' && metodo === 'GET') {
    console.log('[API] GET /api/reglas-evaluacion');
    
    const token = peticion.headers['authorization']?.split(' ')[1];
    if (!token) {
        respuesta.writeHead(401, { 'Content-Type': 'application/json' });
        respuesta.end(JSON.stringify({ error: 'Token requerido' }));
        return;
    }
    
    try {
        const result = await pool.query(`
            SELECT 
                re.*,
                vm.version as version_nombre
            FROM reglas_evaluacion re
            JOIN versiones_matriz vm ON re.version_id = vm.id
            ORDER BY vm.id, re.orden
        `);
        
        respuesta.writeHead(200, { 'Content-Type': 'application/json' });
        respuesta.end(JSON.stringify(result.rows));
        
    } catch (error) {
        console.error('Error:', error);
        respuesta.writeHead(500, { 'Content-Type': 'application/json' });
        respuesta.end(JSON.stringify([]));
    }
    return;
}

// POST - Crear nueva regla
if (ruta === '/api/reglas-evaluacion' && metodo === 'POST') {
    console.log('[API] POST /api/reglas-evaluacion');
    
    const token = peticion.headers['authorization']?.split(' ')[1];
    if (!token) {
        respuesta.writeHead(401, { 'Content-Type': 'application/json' });
        respuesta.end(JSON.stringify({ error: 'Token requerido' }));
        return;
    }
    
    let body = '';
    peticion.on('data', chunk => body += chunk);
    peticion.on('end', async () => {
        try {
            const data = JSON.parse(body);
            
            // 🔴 Asegurar que los campos JSON sean válidos
            const submotivosAfectados = data.submotivos_afectados ? JSON.stringify(data.submotivos_afectados) : null;
            const excepciones = data.excepciones ? JSON.stringify(data.excepciones) : null;
            
            console.log('📝 Insertando regla:', {
                version_id: data.version_id,
                submotivo_origen: data.submotivo_origen,
                accion_tipo: data.accion_tipo,
                submotivos_afectados: submotivosAfectados,
                excepciones: excepciones
            });
            
            const result = await pool.query(`
                INSERT INTO reglas_evaluacion (
                    version_id,
                    submotivo_origen,
                    bloque_origen,
                    atributo_origen,
                    valor_condicion,
                    accion_tipo,
                    accion_valor,
                    submotivos_afectados,
                    excepciones,
                    orden,
                    activo,
                    created_at,
                    updated_at
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, $9::jsonb, $10, $11, NOW(), NOW())
                RETURNING *
            `, [
                data.version_id,
                data.submotivo_origen,
                data.bloque_origen,
                data.atributo_origen,
                data.valor_condicion || '0',
                data.accion_tipo || 'marcar_no_aplica',
                data.accion_valor || 'NA',
                submotivosAfectados,
                excepciones,
                data.orden || 0,
                data.activo !== false
            ]);
            
            console.log(`✅ Regla creada: ${data.submotivo_origen} → ${data.accion_tipo}`);
            
            respuesta.writeHead(201, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify(result.rows[0]));
            
        } catch (error) {
            console.error('❌ Error creando regla:', error);
            respuesta.writeHead(500, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: error.message }));
        }
    });
    return;
}

// PUT - Actualizar regla
if (ruta.match(/^\/api\/reglas-evaluacion\/\d+$/) && metodo === 'PUT') {
    console.log('[API] PUT /api/reglas-evaluacion/:id');
    
    const token = peticion.headers['authorization']?.split(' ')[1];
    if (!token) {
        respuesta.writeHead(401, { 'Content-Type': 'application/json' });
        respuesta.end(JSON.stringify({ error: 'Token requerido' }));
        return;
    }
    
    const id = parseInt(ruta.split('/').pop());
    
    let body = '';
    peticion.on('data', chunk => body += chunk);
    peticion.on('end', async () => {
        try {
            const data = JSON.parse(body);
            
            // 🔴 Asegurar que los campos JSON sean válidos
            const submotivosAfectados = data.submotivos_afectados ? JSON.stringify(data.submotivos_afectados) : null;
            const excepciones = data.excepciones ? JSON.stringify(data.excepciones) : null;
            
            console.log('📝 Actualizando regla ID:', id);
            console.log('   submotivo_origen:', data.submotivo_origen);
            console.log('   submotivos_afectados:', submotivosAfectados);
            console.log('   excepciones:', excepciones);
            
            const result = await pool.query(`
                UPDATE reglas_evaluacion 
                SET 
                    submotivo_origen = $1,
                    bloque_origen = $2,
                    atributo_origen = $3,
                    valor_condicion = $4,
                    accion_tipo = $5,
                    accion_valor = $6,
                    submotivos_afectados = $7::jsonb,
                    excepciones = $8::jsonb,
                    orden = $9,
                    activo = $10,
                    updated_at = NOW()
                WHERE id = $11
                RETURNING *
            `, [
                data.submotivo_origen,
                data.bloque_origen,
                data.atributo_origen,
                data.valor_condicion || '0',
                data.accion_tipo || 'marcar_no_aplica',
                data.accion_valor || 'NA',
                submotivosAfectados,
                excepciones,
                data.orden || 0,
                data.activo !== false,
                id
            ]);
            
            if (result.rows.length === 0) {
                respuesta.writeHead(404, { 'Content-Type': 'application/json' });
                respuesta.end(JSON.stringify({ error: 'Regla no encontrada' }));
                return;
            }
            
            console.log(`✅ Regla actualizada: ${data.submotivo_origen} → ${data.accion_tipo} (ID: ${id})`);
            
            respuesta.writeHead(200, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify(result.rows[0]));
            
        } catch (error) {
            console.error('❌ Error actualizando regla:', error);
            respuesta.writeHead(500, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: error.message }));
        }
    });
    return;
}


// DELETE - Eliminar regla
if (ruta.match(/^\/api\/reglas-evaluacion\/\d+$/) && metodo === 'DELETE') {
    console.log('[API] DELETE /api/reglas-evaluacion/:id');
    
    const token = peticion.headers['authorization']?.split(' ')[1];
    if (!token) {
        respuesta.writeHead(401, { 'Content-Type': 'application/json' });
        respuesta.end(JSON.stringify({ error: 'Token requerido' }));
        return;
    }
    
    const id = parseInt(ruta.split('/').pop());
    
    try {
        const result = await pool.query(`
            DELETE FROM reglas_evaluacion WHERE id = $1 RETURNING id
        `, [id]);
        
        if (result.rows.length === 0) {
            respuesta.writeHead(404, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: 'Regla no encontrada' }));
            return;
        }
        
        console.log(`✅ Regla eliminada: ID ${id}`);
        
        respuesta.writeHead(200, { 'Content-Type': 'application/json' });
        respuesta.end(JSON.stringify({ 
            success: true, 
            message: 'Regla eliminada correctamente',
            id: id
        }));
        
    } catch (error) {
        console.error('❌ Error eliminando regla:', error);
        respuesta.writeHead(500, { 'Content-Type': 'application/json' });
        respuesta.end(JSON.stringify({ error: error.message }));
    }
    return;
}

// ======================================================
// GET /api/reglas-evaluacion/version/:id - CORREGIDO
// ======================================================

if (ruta.startsWith('/api/reglas-evaluacion/version/') && metodo === 'GET') {
    console.log('[API] GET /api/reglas-evaluacion/version/:id');
    
    const token = peticion.headers['authorization']?.split(' ')[1];
    if (!token) {
        respuesta.writeHead(401, { 'Content-Type': 'application/json' });
        respuesta.end(JSON.stringify({ error: 'Token requerido' }));
        return;
    }
    
    const parts = ruta.split('/');
    const versionId = parseInt(parts[parts.length - 1]);
    
    if (!versionId || isNaN(versionId)) {
        respuesta.writeHead(400, { 'Content-Type': 'application/json' });
        respuesta.end(JSON.stringify({ error: 'ID de versión inválido' }));
        return;
    }
    
    try {
        const result = await pool.query(`
            SELECT 
                id,
                version_id,
                submotivo_origen,
                bloque_origen,
                atributo_origen,
                valor_condicion,
                accion_tipo,
                accion_valor,
                submotivos_afectados,
                excepciones,
                orden,
                activo
            FROM reglas_evaluacion 
            WHERE version_id = $1 AND activo = true 
            ORDER BY orden
        `, [versionId]);
        
        console.log(`✅ ${result.rows.length} reglas encontradas para versión ${versionId}`);
        
        respuesta.writeHead(200, { 'Content-Type': 'application/json' });
        respuesta.end(JSON.stringify(result.rows));
        
    } catch (error) {
        console.error('❌ Error:', error);
        respuesta.writeHead(500, { 'Content-Type': 'application/json' });
        respuesta.end(JSON.stringify({ error: error.message }));
    }
    return;
}
    
    // ======================================================
    // VISTAS HTML
    // ======================================================

    // Login
    if (ruta === '/login' || ruta === '/') {
        servirVista('login.html', respuesta);
        return;
    }

    // Dashboard supervisor
    if (ruta === '/supervisor') {
        servirVista('supervisor/dashboard.html', respuesta);
        return;
    }

    // Dashboard auditor
    if (ruta === '/auditor') {
        servirVista('auditor/dashboard.html', respuesta);
        return;
    }

    // Fallback para rutas no encontradas
    respuesta.writeHead(404, { 'Content-Type': 'application/json' });
    respuesta.end(JSON.stringify({ error: 'Ruta no encontrada', ruta: ruta }));

}); // Fin createServer

servidor.listen(PORT, HOST, () => {
    console.log('');
    console.log('=======================================================');
    console.log('SISTEMA MECA - SERVIDOR DE AUDITORIA (PostgreSQL Local)');
    console.log('=======================================================');
    console.log(`Servidor: http://${HOST}:${PORT}`);
    console.log(`Auditor: http://${HOST}:${PORT}/auditor`);
    console.log(`Health: http://${HOST}:${PORT}/api/health`);
    console.log(`BD: localhost:5433 / meca_db`);
    console.log('=======================================================');
    console.log('Presiona Ctrl+C para detener el servidor');
    console.log('');
});

