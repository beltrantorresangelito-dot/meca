const QuartileCriteriaRepository = require('./quartile-criteria.repository');
const QuartileCriteriaService = require('./quartile-criteria.service');
const QuartileCriteriaController = require('./quartile-criteria.controller');
const { createQuartileCriteriaHandler } = require('./quartile-criteria.routes');

module.exports = {
  QuartileCriteriaRepository,
  QuartileCriteriaService,
  QuartileCriteriaController,
  createQuartileCriteriaHandler
};
