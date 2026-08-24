const VersionsRepository = require('./versions.repository');
const VersionsService = require('./versions.service');
const VersionsController = require('./versions.controller');

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
    VersionsController.json(
      res,
      401,
      { error: 'Token requerido' }
    );
    return false;
  }

  return true;
}

function createVersionsHandler({ db } = {}) {
  if (!db) {
    throw new Error('VersionsModule requiere db');
  }

  const repository = new VersionsRepository(db);
  const service = new VersionsService(repository);
  const controller = new VersionsController(service);

  return async function handleVersionsRequest({
    ruta,
    metodo,
    peticion,
    respuesta,
    urlParseada
  }) {
    if (
      ruta === '/api/versiones' &&
      metodo === 'GET'
    ) {
      if (!requireToken(peticion, respuesta)) {
        return true;
      }

      const tipo = urlParseada?.query?.tipo;

      await controller.list(
        respuesta,
        tipo
      );

      return true;
    }

    if (
      ruta === '/api/versiones' &&
      metodo === 'POST'
    ) {
      if (!requireToken(peticion, respuesta)) {
        return true;
      }

      try {
        const body = await readJsonBody(peticion);

        await controller.publish(
          respuesta,
          body
        );
      } catch (error) {
        VersionsController.json(
          respuesta,
          400,
          { error: error.message }
        );
      }

      return true;
    }

    let match = ruta.match(
      /^\/api\/versiones\/(\d+)\/activar$/
    );

    if (match && metodo === 'PUT') {
      if (!requireToken(peticion, respuesta)) {
        return true;
      }

      const tipo = urlParseada?.query?.tipo;

      await controller.activate(
        respuesta,
        parseInt(match[1], 10),
        tipo
      );

      return true;
    }

    match = ruta.match(
      /^\/api\/versiones\/(\d+)$/
    );

    if (match && metodo === 'DELETE') {
      if (!requireToken(peticion, respuesta)) {
        return true;
      }

      await controller.delete(
        respuesta,
        parseInt(match[1], 10)
      );

      return true;
    }

    return false;
  };
}

module.exports = {
  createVersionsHandler
};
