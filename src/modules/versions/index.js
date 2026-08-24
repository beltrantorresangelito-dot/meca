const VersionsRepository = require('./versions.repository');
const VersionsService = require('./versions.service');
const VersionsController = require('./versions.controller');
const { createVersionsHandler } = require('./versions.routes');

module.exports = {
  VersionsRepository,
  VersionsService,
  VersionsController,
  createVersionsHandler
};
