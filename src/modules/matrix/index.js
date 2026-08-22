const MatrixRepository = require('./matrix.repository');
const MatrixService = require('./matrix.service');
const MatrixController = require('./matrix.controller');
const { createMatrixReadHandler } = require('./matrix.routes');

module.exports = {
  MatrixRepository,
  MatrixService,
  MatrixController,
  createMatrixReadHandler
};
