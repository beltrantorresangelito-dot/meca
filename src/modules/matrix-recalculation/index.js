const MatrixRecalculationRepository =
  require('./matrix-recalculation.repository');

const MatrixRecalculationService =
  require('./matrix-recalculation.service');

const MatrixRecalculationController =
  require('./matrix-recalculation.controller');

const {
  createMatrixRecalculationHandler
} = require('./matrix-recalculation.routes');

module.exports = {
  MatrixRecalculationRepository,
  MatrixRecalculationService,
  MatrixRecalculationController,
  createMatrixRecalculationHandler
};
