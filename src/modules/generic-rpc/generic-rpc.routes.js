const GenericRpcRepository =
  require('./generic-rpc.repository');

const GenericRpcService =
  require('./generic-rpc.service');

const GenericRpcController =
  require('./generic-rpc.controller');

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
        if (!body) {
          resolve({});
          return;
        }

        try {
          resolve(JSON.parse(body));
        } catch (error) {
          resolve({});
        }
      }
    );
  });
}

function createGenericRpcHandler({ db } = {}) {
  if (!db) {
    throw new Error(
      'GenericRpcModule requiere db'
    );
  }

  const repository =
    new GenericRpcRepository(db);

  const service =
    new GenericRpcService(repository);

  const controller =
    new GenericRpcController(service);

  return async function handleGenericRpcRequest({
    ruta,
    metodo,
    peticion,
    respuesta
  }) {
    if (
      ruta.match(/^\/api\/rpc\/[\w_]+$/) &&
      metodo === 'POST'
    ) {
      console.log('[API] POST /api/rpc');

      const functionName =
        ruta
          .split('/')
          .pop()
          .replace(
            /[^a-zA-Z0-9_]/g,
            ''
          );

      const params =
        await readJsonBody(peticion);

      await controller.execute(
        respuesta,
        functionName,
        params
      );

      return true;
    }

    return false;
  };
}

module.exports = {
  createGenericRpcHandler
};
