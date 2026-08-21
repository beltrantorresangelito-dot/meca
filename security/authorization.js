'use strict';

function getRoleCode(auth) {
    if (!auth || typeof auth !== 'object') return null;
    const role = auth.rol_codigo || auth.rol || auth.role || null;
    return role ? String(role).trim().toUpperCase() : null;
}

function isAdminManagementRoute(route, method) {
    const m = String(method || 'GET').toUpperCase();
    const r = String(route || '');

    // Administración de usuarios. Se dejan fuera los endpoints de consulta
    // de auditores porque son consumidos por flujos operativos.
    if (r === '/api/usuarios' && ['GET', 'POST'].includes(m)) return true;
    if (/^\/api\/usuarios\/\d+$/.test(r) && ['GET', 'PUT', 'DELETE'].includes(m)) return true;
    if (r === '/api/usuarios/exportar' && m === 'GET') return true;
    if (/^\/api\/usuarios\/\d+\/password$/.test(r) && ['PUT', 'POST'].includes(m)) return true;

    // Administración de roles y permisos de interfaz.
    if (r === '/api/roles' && ['GET', 'POST'].includes(m)) return true;
    if (/^\/api\/roles\/\d+$/.test(r) && ['PUT', 'DELETE'].includes(m)) return true;
    if (/^\/api\/roles\/\d+\/(activar|desactivar|redirect)$/.test(r) && ['PUT', 'POST'].includes(m)) return true;
    if (r === '/api/rol-pestanas' && ['GET', 'POST'].includes(m)) return true;
    if (/^\/api\/rol-pestanas\/\d+$/.test(r) && ['GET', 'DELETE'].includes(m)) return true;
    if (r === '/api/pestanas/todas' && m === 'GET') return true;

    return false;
}

function authorizeRequest({ auth, route, method }) {
    if (!isAdminManagementRoute(route, method)) {
        return { allowed: true };
    }

    if (!auth) {
        return {
            allowed: false,
            status: 401,
            error: 'Autenticación requerida'
        };
    }

    const role = getRoleCode(auth);
    if (!role) {
        return {
            allowed: false,
            status: 403,
            error: 'Rol no disponible en la sesión'
        };
    }

    // Compatibilidad F1.4-B: el sistema actual trata cualquier rol no AUDITOR
    // como rol administrativo/supervisor. En una fase posterior esto será
    // reemplazado por permisos funcionales explícitos por rol y por Quiebre.
    if (role === 'AUDITOR') {
        return {
            allowed: false,
            status: 403,
            error: 'No tiene permisos para realizar esta operación'
        };
    }

    return { allowed: true };
}

module.exports = {
    getRoleCode,
    isAdminManagementRoute,
    authorizeRequest
};
