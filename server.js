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
const { hashPassword, verifyPassword } = require('./security/passwords');
const { signToken, verifyToken } = require('./security/tokens');
const { applyCors } = require('./security/cors');
const { authorizeRequest } = require('./security/authorization');
const { registerDomainRoutes } = require('./src/modules/domain/domain.routes');
const { createMatrixReadHandler, createMatrixWriteHandler } = require('./src/modules/matrix');
const { createReportsHandler } = require('./src/modules/reports');
const { createAgentsHandler } = require('./src/modules/agents');
const { createListeningsHandler } = require('./src/modules/listenings');
const { createUsersHandler } = require('./src/modules/users');
const { createRolesHandler } = require('./src/modules/roles');
const { createEvaluationsHandler } = require('./src/modules/evaluations');
const { createSessionsHandler } = require('./src/modules/sessions');
const { createRequestsHandler } = require('./src/modules/requests');
const { createPdaHandler } = require('./src/modules/pda');
const { createQuartileCriteriaHandler } = require('./src/modules/quartile-criteria');
const handleMatrixReadRequest = createMatrixReadHandler();
const handleMatrixWriteRequest = createMatrixWriteHandler();
const handleReportsRequest = createReportsHandler({ db: pool });
const handleAgentsRequest = createAgentsHandler({ db: pool });
const handleListeningsRequest = createListeningsHandler({ db: pool });
const handleUsersRequest = createUsersHandler({
    db: pool,
    hashPassword,
    verifyPassword,
    signToken
});
const handleRolesRequest = createRolesHandler({ db: pool });
const handleEvaluationsRequest = createEvaluationsHandler({ db: pool });
const handleSessionsRequest = createSessionsHandler({ db: pool });
const handleRequestsRequest = createRequestsHandler({ db: pool });
const handlePdaRequest = createPdaHandler({ db: pool });
const handleQuartileCriteriaRequest = createQuartileCriteriaHandler({ db: pool });
// Configuración
const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || '0.0.0.0';
// Mapa de rutas de la API
const routes = {};
// F2.2: endpoints de lectura del dominio multi-Quiebre.
// Se registran en el mapa existente para evitar agregar más lógica al monolito.
registerDomainRoutes(routes);

// ======================================================
// FUNCIONES AUXILIARES
// ======================================================

// Validar credenciales
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
    // CORS restringido por CORS_ORIGINS; ya no se utiliza wildcard '*'.
    applyCors(peticion, respuesta);

    if (peticion.method === 'OPTIONS') {
        respuesta.writeHead(204);
        respuesta.end();
        return;
    }

    const urlParseada = url.parse(peticion.url || '', true);
    const ruta = urlParseada.pathname || '/';
    const metodo = peticion.method || 'GET';

    // Validación central de cualquier Bearer token recibido.
    // Las rutas legacy que hoy solo comprueban presencia del token quedan protegidas
    // contra tokens alterados sin tener que reescribir todos los endpoints en esta fase.
    const authHeader = peticion.headers['authorization'];
    if (authHeader) {
        const bearer = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
        const expectedPurpose = ruta === '/api/auth/cambiar-password' ? 'password_change' : 'access';
        const verification = verifyToken(bearer, { expectedPurpose });
        if (!verification.valid) {
            respuesta.writeHead(401, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: verification.error || 'Token inválido' }));
            return;
        }
        peticion.auth = verification.payload;
    }

    // F1.4-B: autorización mínima para operaciones administrativas sensibles.
    // La autenticación demuestra quién es el usuario; esta política verifica
    // además si su rol actual puede ejecutar la operación solicitada.
    const authorization = authorizeRequest({
        auth: peticion.auth,
        route: ruta,
        method: metodo
    });
    if (!authorization.allowed) {
        respuesta.writeHead(authorization.status || 403, { 'Content-Type': 'application/json' });
        respuesta.end(JSON.stringify({ error: authorization.error || 'Operación no autorizada' }));
        return;
    }

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

    // F6.4 - USERS/AUTH MODULE
    if (await handleUsersRequest({
        ruta,
        metodo,
        peticion,
        respuesta
    })) {
        return;
    }

    // F6.8 - ROLES/PERMISSIONS MODULE
    if (await handleRolesRequest({
        ruta,
        metodo,
        peticion,
        respuesta
    })) {
        return;
    }

    // ======================================================
    // API - AUTENTICACIÓN
    // ======================================================

    // Endpoint de redirección según rol
    // server.js - Endpoint para actualizar redirect_url de un rol
    // ======================================================
    // PROXY DE AUDIO - CONEXIÓN CON PYTHON
    // ======================================================
    // 📌 PROPÓSITO: Reenviar solicitudes de audio al servidor Python
    // 📌 URL: /api/audio/reprocur/:ticketId
    // 📌 MÉTODO: GET
    // 📌 DESTINO: Python en puerto 5001 (configurable)
    // ======================================================

    // 1. CONFIGURACIÓN DINÁMICA (detecta entorno)
    const PYTHON_API_URL = process.env.PYTHON_API_URL ||
        (process.env.NODE_ENV === 'production'
            ? 'http://10.4.240.68:5001'  // ← IP de producción (cámbiala)
            : 'http://localhost:5001'       // ← IP de desarrollo
        );

    console.log(`🐍 [AUDIO] Python API URL: ${PYTHON_API_URL}`);

    // 2. ENDPOINT: REPRODUCIR AUDIO (PROXY) - USANDO startsWith
    if (ruta.startsWith('/api/audio/reproducir/') && metodo === 'GET') {
        console.log(`[API] GET /api/audio/reproducir/*`);

        // Extraer ticketId de la URL: /api/audio/reproducir/123
        const ticketId = ruta.split('/').pop();

        if (!ticketId || isNaN(ticketId)) {
            respuesta.writeHead(400, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: 'Ticket ID inválido' }));
            return;
        }

        try {
            console.log(`🎧 [PROXY] Solicitando audio para ticket: ${ticketId}`);
            console.log(`   → Python: ${PYTHON_API_URL}/api/audio/reproducir/${ticketId}`);

            // Hacer fetch al servidor Python
            const response = await fetch(`${PYTHON_API_URL}/api/audio/reproducir/${ticketId}`);

            // Si Python devuelve error, propagarlo
            if (!response.ok) {
                let errorText = '';
                try {
                    errorText = await response.text();
                } catch (e) {
                    errorText = 'Sin detalles adicionales';
                }

                console.error(`❌ [PROXY] Error desde Python: ${response.status} - ${errorText.substring(0, 200)}`);

                respuesta.writeHead(response.status, { 'Content-Type': 'application/json' });
                respuesta.end(JSON.stringify({
                    error: `Error desde servidor de audio: ${response.status}`,
                    details: errorText.substring(0, 300)
                }));
                return;
            }

            // Obtener el tipo de contenido (audio/mpeg, audio/wav, etc.)
            const contentType = response.headers.get('content-type') || 'application/octet-stream';

            // Obtener el body como buffer
            const buffer = await response.arrayBuffer();
            const data = Buffer.from(buffer);

            // Establecer headers para el navegador
            respuesta.setHeader('Content-Type', contentType);
            respuesta.setHeader('Accept-Ranges', 'bytes');
            respuesta.setHeader('Cache-Control', 'public, max-age=86400');
            respuesta.setHeader('Content-Length', data.length);

            // Mantener Content-Disposition si Python lo envía
            const contentDisposition = response.headers.get('content-disposition');
            if (contentDisposition) {
                respuesta.setHeader('Content-Disposition', contentDisposition);
            }

            console.log(`✅ [PROXY] Audio servido para ticket: ${ticketId} (${contentType}, ${(data.length / 1024).toFixed(1)} KB)`);

            respuesta.writeHead(200);
            respuesta.end(data);

        } catch (error) {
            console.error(`❌ [PROXY] Error sirviendo audio:`, error.message);

            respuesta.writeHead(error.status || 500, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({
                error: 'Error al obtener el audio',
                details: error.message
            }));
        }
        return;
    }

    // 3. ENDPOINT: VERIFICAR AUDIO (PROXY - OPCIONAL)
    if (ruta.startsWith('/api/audio/verificar/') && metodo === 'GET') {
        console.log(`[API] GET /api/audio/verificar/*`);

        const ticketId = ruta.split('/').pop();

        try {
            const response = await fetch(`${PYTHON_API_URL}/api/audio/verificar/${ticketId}`);
            const data = await response.json();

            respuesta.writeHead(response.status, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify(data));

        } catch (error) {
            console.error(`❌ [PROXY] Error verificando audio:`, error.message);

            respuesta.writeHead(500, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({
                existe: false,
                error: error.message
            }));
        }
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
    // F9.5 - REQUESTS MODULE
    if (await handleRequestsRequest({
        ruta,
        metodo,
        peticion,
        respuesta,
        query: urlParseada.query
    })) {
        return;
    }

    // F7.5 - EVALUATIONS MODULE
    if (await handleEvaluationsRequest({
        ruta,
        metodo,
        peticion,
        respuesta,
        query: urlParseada.query
    })) {
        return;
    }

    // F4.4 - AGENTS MODULE
    if (await handleAgentsRequest({
        ruta,
        metodo,
        peticion,
        respuesta,
        query: urlParseada.query
    })) {
        return;
    }

    // F5.5 - LISTENINGS MODULE
    if (await handleListeningsRequest({
        ruta,
        metodo,
        peticion,
        respuesta,
        query: urlParseada.query
    })) {
        return;
    }

    // server.js - Endpoint para obtener TODAS las pestañas (sin filtrar por rol)
    // ======================================================
    // API - OBTENER PESTAÑAS DE UN ROL ESPECÍFICO
    // ======================================================
    // ======================================================
    // API - ROLES - Obtener todos los roles (GET)
    // ======================================================
    // ======================================================
    // API - ROLES - Actualizar rol (PUT) - NUEVO
    // ======================================================
    // ======================================================
    // API - ROLES - Crear nuevo rol (POST)
    // ======================================================
    // ======================================================
    // API - ROLES - Desactivar rol (PUT)
    // ======================================================
    // ======================================================
    // API - ROLES - Reactivar rol (PUT)
    // ======================================================
    // F3.4 - REPORTS MODULE
    if (await handleReportsRequest({
        ruta,
        metodo,
        peticion,
        respuesta,
        query: urlParseada.query
    })) {
        return;
    }

    // F10.5 - PDA MODULE
    if (await handlePdaRequest({
        ruta,
        metodo,
        peticion,
        respuesta
    })) {
        return;
    }

// API - SESIONES ACTIVAS (migración de funciones de supervisor.js)
    // ======================================================

    // Crear sesión activa
    // F8.5 - SESSIONS MODULE
    if (await handleSessionsRequest({
        ruta,
        metodo,
        peticion,
        respuesta,
        query: urlParseada.query
    })) {
        return;
    }

    // API - USUARIOS - Cambiar password
    // ======================================================
    // API - ADMINISTRACIÓN DE MATRIZ DE EVALUACIÓN
    // ======================================================

    // ========== FRENTES: lecturas delegadas a MatrixModule ==========

    // ========== FRENTES: lecturas y escrituras delegadas a MatrixModule ==========

    // ========== ATRIBUTOS: lecturas delegadas a MatrixModule ==========

    // ========== ATRIBUTOS: lecturas y escrituras delegadas a MatrixModule ==========

    // ========== SUB-MOTIVOS: lecturas y escrituras delegadas a MatrixModule ==========

    // F2.12: snapshot/versionado delegado a MatrixModule.

    // F2.12: creación/activación de versiones delegada a MatrixModule.

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
            respuesta.writeHead(error.status || 500, { 'Content-Type': 'application/json' });
            respuesta.end(JSON.stringify({ error: error.message }));
        }
        return;
    }

    // F2.12: validadores de pesos delegados a MatrixModule.

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
    // API - ROLES - Eliminar rol físicamente (DELETE)
    // SOLO PARA ADMINISTRADORES, CON VALIDACIÓN
    // ======================================================
    // ======================================================
    // API - ROL PESTAÑAS
    // ======================================================

    // Eliminar todos los permisos de un rol (DELETE)
    // Insertar nuevos permisos (POST)
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
                tablas: tablas
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
    // F2.13: /api/evaluacion/estructura delegado a MatrixModule.

    // ======================================================
    // F2.9 - MATRIX MODULE: lecturas versionadas consolidadas
    // ======================================================
    if (await handleMatrixReadRequest({
        ruta,
        metodo,
        peticion,
        respuesta,
        query: urlParseada.query
    })) {
        return;
    }

    // F2.11-A - escrituras de Frentes delegadas a MatrixModule.
    if (await handleMatrixWriteRequest({
        ruta,
        metodo,
        peticion,
        respuesta
    })) {
        return;
    }

    // F2.13: CRUD de reglas de evaluación delegado a MatrixModule.

    // F10.11 - QUARTILE CRITERIA MODULE
    if (await handleQuartileCriteriaRequest({
        ruta,
        metodo,
        peticion,
        respuesta
    })) {
        return;
    }

// API - ESCUCHAS - Obtener tickets por lote
    // ======================================================
    // server.js - ENDPOINT PARA ENVIAR CORREO
    // ======================================================

    // Instalar dependencias (ejecutar en terminal):
    // npm install nodemailer

    // Agregar al inicio de server.js:
    const nodemailer = require('nodemailer');

    // Configurar transporte de correo
    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: false,
        auth: {
            user: process.env.SMTP_USER || 'tu-correo@gmail.com',
            pass: process.env.SMTP_PASS || 'tu-contraseña'
        }
    });


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

