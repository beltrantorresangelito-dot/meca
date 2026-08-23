const AgentsRepository = require('./agents.repository');
const AgentsService = require('./agents.service');
const AgentsController = require('./agents.controller');
const { createAgentsHandler } = require('./agents.routes');

module.exports = {
  AgentsRepository,
  AgentsService,
  AgentsController,
  createAgentsHandler
};
