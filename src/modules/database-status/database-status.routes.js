const DatabaseStatusRepository =
  require('./database-status.repository');

const DatabaseStatusService =
  require('./database-status.service');

const DatabaseStatusController =
  require('./database-status.controller');

function requireToken(req, res) {
  const token =
    req.headers?.authorization?.split(' ')[1];

  if (!token) {
    DatabaseStatusController.json(
      res,
      401,
      { error: 'Token requerido' }
    );
    return false;
  }

  return true;
}

function createDatabaseStatusHandler({ db } = {}) {
  if (!db) {
    throw new Error(
      'DatabaseStatusModule requiere db'
    );
  }

  const repository =
    new DatabaseStatusRepository(db);

  const service =
    new DatabaseStatusService(repository);

  const controller =
    new DatabaseStatusController(service);

  return async function handleDatabaseStatusRequest({
    ruta,
    metodo,
    peticion,
    respuesta
  }) {
    if (
      ruta === '/api/estado-bd' &&
      metodo === 'GET'
    ) {
      if (!requireToken(peticion, respuesta)) {
        return true;
      }

      await controller.getStatus(respuesta);
      return true;
    }

    if (
      ruta === '/api/estado-bd/tablas' &&
      metodo === 'GET'
    ) {
      if (!requireToken(peticion, respuesta)) {
        return true;
      }

      await controller.getTableSizes(
        respuesta
      );

      return true;
    }

    return false;
  };
}

module.exports = {
  createDatabaseStatusHandler
};
