const MatrixRecalculationRepository =
  require('./matrix-recalculation.repository');

const MatrixRecalculationService =
  require('./matrix-recalculation.service');

const MatrixRecalculationController =
  require('./matrix-recalculation.controller');

function requireToken(req, res) {
  const token =
    req.headers?.authorization?.split(' ')[1];

  if (!token) {
    MatrixRecalculationController.json(
      res,
      401,
      { error: 'Token requerido' }
    );

    return false;
  }

  return true;
}

function createMatrixRecalculationHandler({ db } = {}) {
  if (!db) {
    throw new Error(
      'MatrixRecalculationModule requiere db'
    );
  }

  const repository =
    new MatrixRecalculationRepository(db);

  const service =
    new MatrixRecalculationService(repository);

  const controller =
    new MatrixRecalculationController(service);

  return async function handleMatrixRecalculationRequest({
    ruta,
    metodo,
    peticion,
    respuesta
  }) {
    if (
      ruta === '/api/matriz/recalcular' &&
      metodo === 'POST'
    ) {
      if (!requireToken(peticion, respuesta)) {
        return true;
      }

      await controller.recalculate(respuesta);
      return true;
    }

    return false;
  };
}

module.exports = {
  createMatrixRecalculationHandler
};
