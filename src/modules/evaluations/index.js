const EvaluationsRepository = require('./evaluations.repository');
const EvaluationsService = require('./evaluations.service');
const EvaluationsController = require('./evaluations.controller');
const { createEvaluationsHandler } = require('./evaluations.routes');

module.exports = {
  EvaluationsRepository,
  EvaluationsService,
  EvaluationsController,
  createEvaluationsHandler
};
