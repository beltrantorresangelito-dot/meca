const ListeningsRepository = require('./listenings.repository');
const ListeningsService = require('./listenings.service');
const ListeningsController = require('./listenings.controller');

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

function createListeningsHandler({ db } = {}) {
  if (!db) {
    throw new Error('ListeningsModule requiere db');
  }

  const repository = new ListeningsRepository(db);
  const service = new ListeningsService(repository);
  const controller = new ListeningsController(service);

  return async function handleListeningsRequest({
    ruta,
    metodo,
    peticion,
    respuesta,
    query = {}
  }) {
    if (ruta === '/api/escuchas/asignaciones' && metodo === 'POST') {
      let body;
      try {
        body = await readJsonBody(peticion);
      } catch (error) {
        ListeningsController.json(respuesta, 500, { error: error.message });
        return true;
      }

      await controller.saveAssignments(peticion, respuesta, body);
      return true;
    }

    if (ruta === '/api/escuchas/asignaciones' && metodo === 'GET') {
      await controller.listAssignments(peticion, respuesta);
      return true;
    }

    if (ruta === '/api/escuchas/tareas' && metodo === 'GET') {
      await controller.listTasks(peticion, respuesta);
      return true;
    }

    if (ruta === '/api/escuchas/tareas' && metodo === 'POST') {
      let body;
      try {
        body = await readJsonBody(peticion);
      } catch (error) {
        ListeningsController.json(respuesta, 500, { error: error.message });
        return true;
      }

      await controller.createTask(peticion, respuesta, body);
      return true;
    }

    const lotDelete = ruta.match(/^\/api\/escuchas\/lotes\/(\d+)$/);
    if (lotDelete && metodo === 'DELETE') {
      await controller.deleteTask(
        peticion,
        respuesta,
        lotDelete[1]
      );
      return true;
    }

    if (ruta === '/api/escuchas/mis-escuchas' && metodo === 'GET') {
      await controller.listMyListenings(
        peticion,
        respuesta,
        query
      );
      return true;
    }

    let match = ruta.match(/^\/api\/escuchas\/([\w-]+)\/iniciar$/);
    if (match && metodo === 'POST') {
      await controller.start(peticion, respuesta, match[1]);
      return true;
    }

    match = ruta.match(/^\/api\/escuchas\/([\w-]+)\/incidencia$/);
    if (match && metodo === 'POST') {
      let body;
      try {
        body = await readJsonBody(peticion);
      } catch (error) {
        ListeningsController.json(respuesta, 500, { error: error.message });
        return true;
      }

      await controller.reportIncident(
        peticion,
        respuesta,
        match[1],
        body
      );
      return true;
    }

    match = ruta.match(/^\/api\/escuchas\/([\w-]+)\/gestionar$/);
    if (match && metodo === 'PUT') {
      await controller.manage(peticion, respuesta, match[1]);
      return true;
    }

    match = ruta.match(/^\/api\/escuchas\/([\w-]+)\/cancelar$/);
    if (match && metodo === 'PUT') {
      await controller.cancel(peticion, respuesta, match[1]);
      return true;
    }

    if (ruta === '/api/escuchas/reactivar' && metodo === 'PUT') {
      let body;
      try {
        body = await readJsonBody(peticion);
      } catch (error) {
        ListeningsController.json(respuesta, 500, { error: error.message });
        return true;
      }

      await controller.reactivate(peticion, respuesta, body);
      return true;
    }

    const ticketsMatch =
      ruta.match(/^\/api\/escuchas\/lotes\/(\d+)\/tickets$/);

    if (ticketsMatch && metodo === 'GET') {
      await controller.listTicketsByTask(
        peticion,
        respuesta,
        ticketsMatch[1]
      );
      return true;
    }

    return false;
  };
}

module.exports = {
  createListeningsHandler
};
