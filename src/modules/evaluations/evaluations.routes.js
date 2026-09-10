const EvaluationsRepository = require('./evaluations.repository');
const EvaluationsService = require('./evaluations.service');
const EvaluationsController = require('./evaluations.controller');

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

function createEvaluationsHandler({ db } = {}) {
  if (!db) {
    throw new Error('EvaluationsModule requiere db');
  }

  const repository = new EvaluationsRepository(db);
  const service = new EvaluationsService(repository);
  const controller = new EvaluationsController(service);

  return async function handleEvaluationsRequest({
    ruta,
    metodo,
    peticion,
    respuesta,
    query = {}
  }) {
    if (ruta === '/api/evaluaciones' && metodo === 'GET') {
      await controller.list(respuesta, query);
      return true;
    }

    if (ruta === '/api/evaluaciones' && metodo === 'POST') {
      try {
        const evaluation = await readJsonBody(peticion);
        await controller.create(respuesta, evaluation);
      } catch (error) {
        EvaluationsController.json(
          respuesta,
          400,
          { error: error.message }
        );
      }

      return true;
    }

    if (
      ruta === '/api/evaluaciones/validar-ticket' &&
      metodo === 'GET'
    ) {
      await controller.validateTicket(
        respuesta,
        query.ticket
      );
      return true;
    }

    let match = ruta.match(
      /^\/api\/evaluaciones\/([\w-]+)\/detalles$/
    );

    if (match && metodo === 'GET') {
      await controller.listDetails(
        respuesta,
        match[1]
      );
      return true;
    }

    match = ruta.match(
      /^\/api\/evaluaciones\/([\w-]+)$/
    );

    if (match && metodo === 'PUT') {
      try {
        const evaluation =
          await readJsonBody(peticion);

        await controller.update(
          respuesta,
          match[1],
          evaluation
        );
      } catch (error) {
        EvaluationsController.json(
          respuesta,
          400,
          { error: error.message }
        );
      }

      return true;
    }

    if (match && metodo === 'DELETE') {
      await controller.delete(
        respuesta,
        match[1]
      );
      return true;
    }

    return false;
  };
}

module.exports = {
  createEvaluationsHandler
};
