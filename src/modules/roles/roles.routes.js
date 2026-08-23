const RolesRepository = require('./roles.repository');
const RolesService = require('./roles.service');
const RolesController = require('./roles.controller');

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';

    req.on('data', chunk => {
      body += chunk;
    });

    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });

    req.on('error', reject);
  });
}

function createRolesHandler({ db } = {}) {
  if (!db) {
    throw new Error('RolesModule requiere db');
  }

  const repository = new RolesRepository(db);
  const service = new RolesService(repository);
  const controller = new RolesController(service);

  return async function handleRolesRequest({
    ruta,
    metodo,
    peticion,
    respuesta
  }) {
    if (ruta === '/api/auth/redirect' && metodo === 'GET') {
      await controller.redirect(peticion, respuesta);
      return true;
    }

    let match = ruta.match(/^\/api\/roles\/(\d+)\/redirect$/);
    if (match && metodo === 'PUT') {
      let body;
      try { body = await readJsonBody(peticion); }
      catch (error) {
        RolesController.json(respuesta, 500, { error: error.message });
        return true;
      }
      await controller.updateRedirect(peticion, respuesta, match[1], body);
      return true;
    }

    if (ruta === '/api/roles' && metodo === 'GET') {
      await controller.listRoles(peticion, respuesta);
      return true;
    }

    if (ruta === '/api/roles' && metodo === 'POST') {
      let body;
      try { body = await readJsonBody(peticion); }
      catch (error) {
        RolesController.json(respuesta, 500, { error: error.message });
        return true;
      }
      await controller.createRole(peticion, respuesta, body);
      return true;
    }

    match = ruta.match(/^\/api\/roles\/(\d+)$/);
    if (match && metodo === 'PUT') {
      let body;
      try { body = await readJsonBody(peticion); }
      catch (error) {
        RolesController.json(respuesta, 500, { error: error.message });
        return true;
      }
      await controller.updateRole(peticion, respuesta, match[1], body);
      return true;
    }

    if (match && metodo === 'DELETE') {
      await controller.deleteRole(peticion, respuesta, match[1]);
      return true;
    }

    match = ruta.match(/^\/api\/roles\/(\d+)\/desactivar$/);
    if (match && metodo === 'PUT') {
      let body;
      try { body = await readJsonBody(peticion); }
      catch (error) {
        RolesController.json(respuesta, 500, { error: error.message });
        return true;
      }
      await controller.setActive(peticion, respuesta, match[1], body);
      return true;
    }

    match = ruta.match(/^\/api\/roles\/(\d+)\/reactivar$/);
    if (match && metodo === 'PUT') {
      await controller.reactivate(peticion, respuesta, match[1]);
      return true;
    }

    if (ruta === '/api/pestanas/todas' && metodo === 'GET') {
      await controller.listAllTabs(peticion, respuesta);
      return true;
    }

    if (ruta === '/api/pestanas' && metodo === 'GET') {
      await controller.listVisibleTabs(peticion, respuesta);
      return true;
    }

    match = ruta.match(/^\/api\/rol-pestanas\/(\d+)$/);
    if (match && metodo === 'GET') {
      await controller.listRoleTabs(peticion, respuesta, match[1]);
      return true;
    }

    if (match && metodo === 'DELETE') {
      await controller.deleteRoleTabs(peticion, respuesta, match[1]);
      return true;
    }

    if (ruta === '/api/rol-pestanas' && metodo === 'POST') {
      let body;
      try { body = await readJsonBody(peticion); }
      catch (error) {
        RolesController.json(respuesta, 500, { error: error.message });
        return true;
      }
      await controller.replaceRoleTabs(peticion, respuesta, body);
      return true;
    }

    return false;
  };
}

module.exports = { createRolesHandler };
