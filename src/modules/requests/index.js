const RequestsRepository = require('./requests.repository');
const RequestsService = require('./requests.service');
const RequestsController = require('./requests.controller');
const { createRequestsHandler } = require('./requests.routes');

module.exports = {
  RequestsRepository,
  RequestsService,
  RequestsController,
  createRequestsHandler
};
