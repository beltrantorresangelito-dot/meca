const GenericQueryRepository =
  require('./generic-query.repository');

const GenericQueryService =
  require('./generic-query.service');

const GenericQueryController =
  require('./generic-query.controller');

const {
  createGenericQueryHandler
} = require('./generic-query.routes');

module.exports = {
  GenericQueryRepository,
  GenericQueryService,
  GenericQueryController,
  createGenericQueryHandler
};
