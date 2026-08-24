const SessionsRepository = require('./sessions.repository');
const SessionsService = require('./sessions.service');
const SessionsController = require('./sessions.controller');

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      try { resolve(body ? JSON.parse(body) : {}); }
      catch (error) { reject(error); }
    });
    req.on('error', reject);
  });
}

function requireToken(req, res) {
  const token = req.headers?.authorization?.split(' ')[1];
  if (!token) {
    SessionsController.json(res, 401, { error: 'Token requerido' });
    return false;
  }
  return true;
}

function createSessionsHandler({ db } = {}) {
  if (!db) throw new Error('SessionsModule requiere db');

  const repository = new SessionsRepository(db);
  const service = new SessionsService(repository);
  const controller = new SessionsController(service);

  return async function handleSessionsRequest({
    ruta, metodo, peticion, respuesta, query = {}
  }) {
    if (ruta === '/api/sesiones/crear' && metodo === 'POST') {
      try {
        const body = await readJsonBody(peticion);
        await controller.createSession(respuesta, {
          usuarioId: body.usuario_id,
          tokenSesion: body.token_sesion,
          ip: body.ip,
          dispositivo: body.dispositivo
        });
      } catch (error) {
        SessionsController.json(respuesta, 400, {
          success: false, error: error.message
        });
      }
      return true;
    }

    let match = ruta.match(/^\/api\/sesiones\/usuarios\/(\d+)$/);
    if (match && metodo === 'GET') {
      if (!requireToken(peticion, respuesta)) return true;
      await controller.listUserSessions(
        respuesta,
        parseInt(match[1], 10),
        { activas: query.activas }
      );
      return true;
    }

    if (ruta === '/api/sesiones/cerrar' && metodo === 'POST') {
      if (!requireToken(peticion, respuesta)) return true;
      try {
        const body = await readJsonBody(peticion);
        await controller.closeSession(respuesta, body.sessionToken);
      } catch (error) {
        SessionsController.json(respuesta, 400, {
          success: false, error: error.message
        });
      }
      return true;
    }

    match = ruta.match(/^\/api\/sesiones\/usuarios\/(\d+)\/cerrar-todas$/);
    if (match && metodo === 'POST') {
      await controller.closeAllForUser(
        respuesta,
        parseInt(match[1], 10)
      );
      return true;
    }

    if (ruta === '/api/historial-login' && metodo === 'POST') {
      try {
        const body = await readJsonBody(peticion);
        await controller.registerLoginHistory(respuesta, {
          usuarioId: body.usuario_id,
          usuario: body.usuario,
          tipo: body.tipo,
          ip: body.ip,
          dispositivo: body.dispositivo
        });
      } catch (error) {
        SessionsController.json(respuesta, 200, {
          success: false, error: error.message
        });
      }
      return true;
    }

    return false;
  };
}

module.exports = { createSessionsHandler };
