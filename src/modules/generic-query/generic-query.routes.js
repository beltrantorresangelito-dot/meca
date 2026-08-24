const GenericQueryRepository =
  require('./generic-query.repository');

const GenericQueryService =
  require('./generic-query.service');

const GenericQueryController =
  require('./generic-query.controller');

function readJsonBody(req) {
  return new Promise(resolve => {
    let body = '';

    req.on(
      'data',
      chunk => body += chunk
    );

    req.on(
      'end',
      () => {
        try {
          resolve(JSON.parse(body));
        } catch (error) {
          resolve(null);
        }
      }
    );
  });
}

function createGenericQueryHandler({ db } = {}) {
  if (!db) {
    throw new Error(
      'GenericQueryModule requiere db'
    );
  }

  const repository =
    new GenericQueryRepository(db);

  const service =
    new GenericQueryService(repository);

  const controller =
    new GenericQueryController(service);

  return async function handleGenericQueryRequest({
    ruta,
    metodo,
    peticion,
    respuesta
  }) {
    if (
      ruta === '/api/query' &&
      metodo === 'POST'
    ) {
      const query =
        await readJsonBody(peticion);

      await controller.execute(
        respuesta,
        query
      );

      return true;
    }

    return false;
  };
}

module.exports = {
  createGenericQueryHandler
};
