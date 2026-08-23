const RolesRepository = require('./roles.repository');
const RolesService = require('./roles.service');
const RolesController = require('./roles.controller');
const { createRolesHandler } = require('./roles.routes');

module.exports = {
  RolesRepository,
  RolesService,
  RolesController,
  createRolesHandler
};
