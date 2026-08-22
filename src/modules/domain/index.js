const DomainRepository = require('./domain.repository');
const DomainService = require('./domain.service');
const { registerDomainRoutes } = require('./domain.routes');

module.exports = {
  DomainRepository,
  DomainService,
  registerDomainRoutes
};
