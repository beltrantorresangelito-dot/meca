// ======================================================
// CONFIGURACIÓN INICIAL
// ======================================================
// server.js - Servidor MECA - PostgreSQL local
// Base de datos: meca_db en PostgreSQL local (puerto 5432)
require('dotenv').config();
// Pool de conexión PostgreSQL
const { pool } = require('./models/database');
const http = require('http');
const url = require('url');
const { hashPassword, verifyPassword } = require('./security/passwords');
const { signToken, verifyToken } = require('./security/tokens');
const { applyCors } = require('./security/cors');
const { authorizeRequest } = require('./security/authorization');
const { createMatrixReadHandler, createMatrixWriteHandler } = require('./src/modules/matrix');
const { createReportsHandler } = require('./src/modules/reports');
const { createAnalyticsHandler } = require('./src/modules/analytics');
const { createAgentsHandler } = require('./src/modules/agents');
const { createListeningsHandler } = require('./src/modules/listenings');
const { createUsersHandler } = require('./src/modules/users');
const { createRolesHandler } = require('./src/modules/roles');
const { createEvaluationsHandler } = require('./src/modules/evaluations');
const { createSessionsHandler } = require('./src/modules/sessions');
const { createRequestsHandler } = require('./src/modules/requests');
const { createPdaHandler } = require('./src/modules/pda');
const { createQuartileCriteriaHandler } = require('./src/modules/quartile-criteria');
const { createGestoresHandler } = require('./src/modules/gestores');
const { createVersionsHandler } = require('./src/modules/versions');
const { createDatabaseStatusHandler } = require('./src/modules/database-status');
const { createAudioProxyHandler } = require('./src/modules/audio-proxy');
const { createMatrixRecalculationHandler } = require('./src/modules/matrix-recalculation');
const { createGenericQueryHandler } = require('./src/modules/generic-query');
const { createGenericRpcHandler } = require('./src/modules/generic-rpc');
const { createHttpStaticViewsHandler } = require('./src/modules/http-shell/http-static-views');
const { createHealthHandler } = require('./src/modules/health');
const { createDomainHandler } = require('./src/modules/domain/domain.routes');
// Configuración del servidor Python de audio.
// Debe inicializarse antes de crear AudioProxyHandler.
const PYTHON_API_URL = process.env.PYTHON_API_URL ||
    (process.env.NODE_ENV === 'production'
        ? 'http://10.4.240.68:5001'
        : 'http://localhost:5001'
    );

const handleMatrixReadRequest = createMatrixReadHandler();
const handleMatrixWriteRequest = createMatrixWriteHandler();
const handleReportsRequest = createReportsHandler({ db: pool });
const handleAnalyticsRequest = createAnalyticsHandler({ db: pool });
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
const handleGestoresRequest = createGestoresHandler({ db: pool });
const handleQuartileCriteriaRequest = createQuartileCriteriaHandler({ db: pool });
const handleVersionsRequest = createVersionsHandler({ db: pool });
const handleDatabaseStatusRequest = createDatabaseStatusHandler({ db: pool });
const handleAudioProxyRequest = createAudioProxyHandler({ baseUrl: PYTHON_API_URL, fetchImpl: fetch });
const handleMatrixRecalculationRequest = createMatrixRecalculationHandler({ db: pool });
const handleGenericQueryRequest = createGenericQueryHandler({ db: pool });
const handleGenericRpcRequest = createGenericRpcHandler({ db: pool });
const handleHttpStaticViewsRequest = createHttpStaticViewsHandler({ baseDir: __dirname });
const handleHealthRequest = createHealthHandler({ db: pool });
const handleDomainRequest = createDomainHandler();
// Configuración
const PORT = process.env.PORT || 8080;
const HOST = process.env.HOST || '0.0.0.0';

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

    // F10.52 - HEALTH MODULE
    if (await handleHealthRequest({
        ruta,
        metodo,
        respuesta
    })) {
        return;
    }

    if (await handleDomainRequest({
        ruta,
        metodo,
        peticion,
        respuesta,
        query: urlParseada.query
    })) {
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

    // F10.28 - AUDIO PROXY MODULE
    if (await handleAudioProxyRequest({
        ruta,
        metodo,
        respuesta
    })) {
        return;
    }

    // ======================================================
    // Archivos estáticos (CSS, JS, IMG)
    // ======================================================
    if (await handleHttpStaticViewsRequest({
        ruta,
        respuesta
    })) {
        return;
    }

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

    // ANALYTICS 2.0 - ANALYTICS MODULE
    if (await handleAnalyticsRequest({
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

    // ========== RECALCULAR EVALUACIONES COMPLETO ==========
    // F10.34 - MATRIX RECALCULATION MODULE
    if (await handleMatrixRecalculationRequest({
        ruta,
        metodo,
        peticion,
        respuesta
    })) {
        return;
    }

    // ======================================================
    // API - CONSULTA GENÉRICA (PostgreSQL Query Layer)
    // Recibe parámetros de consulta y los convierte a SQL
    // ======================================================
    // F10.40 - GENERIC QUERY MODULE
    if (await handleGenericQueryRequest({
        ruta,
        metodo,
        peticion,
        respuesta
    })) {
        return;
    }

    // API - RPC GENÉRICO (PostgreSQL Query Layer)
    // Soporta funciones almacenadas como cerrar_mes, limpiar_sesiones_expiradas, etc.
    // ======================================================

    // F10.46 - GENERIC RPC MODULE
    if (await handleGenericRpcRequest({
        ruta,
        metodo,
        peticion,
        respuesta
    })) {
        return;
    }

    // F10.23 - DATABASE STATUS MODULE
    if (await handleDatabaseStatusRequest({
        ruta,
        metodo,
        peticion,
        respuesta
    })) {
        return;
    }

    // F10.17 - VERSIONS MODULE
    if (await handleVersionsRequest({
        ruta,
        metodo,
        peticion,
        respuesta,
        urlParseada
    })) {
        return;
    }

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

    if (await handleMatrixWriteRequest({
        ruta,
        metodo,
        peticion,
        respuesta
    })) {
        return;
    }

    // F10.11 - QUARTILE CRITERIA MODULE
    if (await handleQuartileCriteriaRequest({
        ruta,
        metodo,
        peticion,
        respuesta,
        query: urlParseada.query
    })) {
        return;
    }

    if (await handleGestoresRequest({
        ruta,
        metodo,
        peticion,
        respuesta,
        query: urlParseada.query
    })) {
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