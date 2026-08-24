const HealthRepository =
  require('./health.repository');

const HealthService =
  require('./health.service');

const HealthController =
  require('./health.controller');

function createHealthHandler({ db } = {}) {
  if (!db) {
    throw new Error(
      'HealthModule requiere db'
    );
  }

  const repository =
    new HealthRepository(db);

  const service =
    new HealthService(repository);

  const controller =
    new HealthController(service);

  return async function handleHealthRequest({
    ruta,
    metodo,
    respuesta
  }) {
    if (
      ruta === '/api/health' &&
      metodo === 'GET'
    ) {
      await controller.get(respuesta);
      return true;
    }

    return false;
  };
}

module.exports = {
  createHealthHandler
};
