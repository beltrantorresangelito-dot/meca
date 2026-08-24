const PdaRepository = require('./pda.repository');
const PdaService = require('./pda.service');
const PdaController = require('./pda.controller');

function requireToken(req, res) {
  const token = req.headers?.authorization?.split(' ')[1];

  if (!token) {
    PdaController.json(
      res,
      401,
      { error: 'Token requerido' }
    );
    return false;
  }

  return true;
}

function createPdaHandler({ db } = {}) {
  if (!db) {
    throw new Error('PdaModule requiere db');
  }

  const repository = new PdaRepository(db);
  const service = new PdaService(repository);
  const controller = new PdaController(service);

  return async function handlePdaRequest({
    ruta,
    metodo,
    peticion,
    respuesta
  }) {
    if (ruta === '/api/pda/pendientes' && metodo === 'GET') {
      if (!requireToken(peticion, respuesta)) return true;
      await controller.listPending(respuesta);
      return true;
    }

    if (ruta === '/api/pda/seguimiento' && metodo === 'GET') {
      if (!requireToken(peticion, respuesta)) return true;
      await controller.listTracking(respuesta);
      return true;
    }

    if (ruta === '/api/pda/historial' && metodo === 'GET') {
      if (!requireToken(peticion, respuesta)) return true;
      await controller.listHistory(respuesta);
      return true;
    }

    const detailMatch = ruta.match(/^\/api\/pda\/(\d+)$/);

    if (detailMatch && metodo === 'GET') {
      if (!requireToken(peticion, respuesta)) return true;

      await controller.getDetail(
        respuesta,
        detailMatch[1]
      );
      return true;
    }

    if (ruta === '/api/pda/exportar' && metodo === 'GET') {
      if (!requireToken(peticion, respuesta)) return true;
      await controller.exportRows(respuesta);
      return true;
    }

    return false;
  };
}

module.exports = {
  createPdaHandler
};
