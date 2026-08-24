const QuartileCriteriaRepository = require('./quartile-criteria.repository');
const QuartileCriteriaService = require('./quartile-criteria.service');
const QuartileCriteriaController = require('./quartile-criteria.controller');

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
  const token = req.headers?.authorization?.split(' ')[1];

  if (!token) {
    QuartileCriteriaController.json(
      res,
      401,
      { error: 'Token requerido' }
    );
    return false;
  }

  return true;
}

function createQuartileCriteriaHandler({ db } = {}) {
  if (!db) {
    throw new Error('QuartileCriteriaModule requiere db');
  }

  const repository = new QuartileCriteriaRepository(db);
  const service = new QuartileCriteriaService(repository);
  const controller = new QuartileCriteriaController(service);

  return async function handleQuartileCriteriaRequest({
    ruta,
    metodo,
    peticion,
    respuesta
  }) {
    if (
      ruta === '/api/criterios-cuartiles' &&
      metodo === 'GET'
    ) {
      if (!requireToken(peticion, respuesta)) {
        return true;
      }

      await controller.listAll(respuesta);
      return true;
    }

    if (
      ruta === '/api/criterios-cuartiles/activos' &&
      metodo === 'GET'
    ) {
      if (!requireToken(peticion, respuesta)) {
        return true;
      }

      await controller.listActive(respuesta);
      return true;
    }

    if (
      ruta === '/api/criterios-cuartiles' &&
      metodo === 'POST'
    ) {
      if (!requireToken(peticion, respuesta)) {
        return true;
      }

      try {
        const body = await readJsonBody(peticion);
        await controller.create(respuesta, body);
      } catch (error) {
        QuartileCriteriaController.json(
          respuesta,
          400,
          { success: false, error: error.message }
        );
      }

      return true;
    }

    let match = ruta.match(
      /^\/api\/criterios-cuartiles\/(\d+)$/
    );

    if (match && metodo === 'PUT') {
      if (!requireToken(peticion, respuesta)) {
        return true;
      }

      try {
        const body = await readJsonBody(peticion);

        await controller.update(
          respuesta,
          parseInt(match[1], 10),
          body
        );
      } catch (error) {
        QuartileCriteriaController.json(
          respuesta,
          400,
          { success: false, error: error.message }
        );
      }

      return true;
    }

    if (match && metodo === 'DELETE') {
      if (!requireToken(peticion, respuesta)) {
        return true;
      }

      await controller.deactivate(
        respuesta,
        parseInt(match[1], 10)
      );

      return true;
    }

    match = ruta.match(
      /^\/api\/criterios-cuartiles\/(\d+)\/activar$/
    );

    if (match && metodo === 'POST') {
      if (!requireToken(peticion, respuesta)) {
        return true;
      }

      await controller.activate(
        respuesta,
        parseInt(match[1], 10)
      );

      return true;
    }

    return false;
  };
}

module.exports = {
  createQuartileCriteriaHandler
};
