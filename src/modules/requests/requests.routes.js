const RequestsRepository = require('./requests.repository');
const RequestsService = require('./requests.service');
const RequestsController = require('./requests.controller');

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

function requireToken(req, res) {
  const token =
    req.headers?.authorization?.split(' ')[1];

  if (!token) {
    RequestsController.json(
      res,
      401,
      { error: 'Token requerido' }
    );
    return false;
  }

  return true;
}

function createRequestsHandler({ db } = {}) {
  if (!db) {
    throw new Error('RequestsModule requiere db');
  }

  const repository = new RequestsRepository(db);
  const service = new RequestsService(repository);
  const controller = new RequestsController(service);

  return async function handleRequestsRequest({
    ruta,
    metodo,
    peticion,
    respuesta,
    query = {}
  }) {
    let match = ruta.match(
      /^\/api\/solicitudes\/usuario\/(\d+)$/
    );

    if (match && metodo === 'GET') {
      await controller.listByUser(
        respuesta,
        parseInt(match[1], 10)
      );
      return true;
    }

    if (
      ruta === '/api/solicitudes' &&
      metodo === 'GET'
    ) {
      await controller.listAll(respuesta);
      return true;
    }

    if (
      ruta === '/api/solicitudes' &&
      metodo === 'POST'
    ) {
      try {
        const body = await readJsonBody(peticion);

        await controller.create(
          respuesta,
          body
        );
      } catch (error) {
        RequestsController.json(
          respuesta,
          400,
          { error: error.message }
        );
      }

      return true;
    }

    match = ruta.match(
      /^\/api\/solicitudes\/(\d+)$/
    );

    if (match && metodo === 'GET') {
      if (!requireToken(peticion, respuesta)) {
        return true;
      }

      await controller.getById(
        respuesta,
        parseInt(match[1], 10)
      );

      return true;
    }

    if (match && metodo === 'PUT') {
      if (!requireToken(peticion, respuesta)) {
        return true;
      }

      try {
        const body = await readJsonBody(peticion);

        await controller.updateStatus(
          respuesta,
          parseInt(match[1], 10),
          body
        );
      } catch (error) {
        RequestsController.json(
          respuesta,
          400,
          { error: error.message }
        );
      }

      return true;
    }

    return false;
  };
}

module.exports = {
  createRequestsHandler
};
