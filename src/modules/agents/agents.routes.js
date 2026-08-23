const AgentsRepository = require('./agents.repository');
const AgentsService = require('./agents.service');
const AgentsController = require('./agents.controller');

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

function createAgentsHandler({ db } = {}) {
  if (!db) {
    throw new Error('AgentsModule requiere db');
  }

  const repository = new AgentsRepository(db);
  const service = new AgentsService(repository);
  const controller = new AgentsController(service);

  return async function handleAgentsRequest({
    ruta,
    metodo,
    peticion,
    respuesta,
    query = {}
  }) {
    if (ruta === '/api/agentes' && metodo === 'GET') {
      await controller.list(peticion, respuesta, query);
      return true;
    }

    const idMatch = ruta.match(/^\/api\/agentes\/(\d+)$/);

    if (idMatch && metodo === 'PUT') {
      let body;
      try {
        body = await readJsonBody(peticion);
      } catch (error) {
        AgentsController.json(respuesta, 500, { error: error.message });
        return true;
      }

      await controller.update(
        peticion,
        respuesta,
        idMatch[1],
        body
      );
      return true;
    }

    if (idMatch && metodo === 'DELETE') {
      await controller.delete(
        peticion,
        respuesta,
        idMatch[1]
      );
      return true;
    }

    if (idMatch && metodo === 'GET') {
      await controller.getById(
        peticion,
        respuesta,
        idMatch[1]
      );
      return true;
    }

    if (ruta === '/api/agentes/categorias' && metodo === 'GET') {
      await controller.categories(peticion, respuesta);
      return true;
    }

    if (ruta === '/api/agentes/completo' && metodo === 'GET') {
      await controller.complete(peticion, respuesta);
      return true;
    }

    if (ruta === '/api/agentes/exportar' && metodo === 'GET') {
      await controller.exportCsv(peticion, respuesta);
      return true;
    }

    return false;
  };
}

module.exports = {
  createAgentsHandler
};
