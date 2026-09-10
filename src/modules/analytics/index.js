const AnalyticsRepository =
  require('./analytics.repository');

const AnalyticsService =
  require('./analytics.service');

const AnalyticsController =
  require('./analytics.controller');

const {
  createAnalyticsHandler
} =
  require('./analytics.routes');


function createAnalyticsModule({ db }) {
  if (!db) {
    throw new Error(
      'createAnalyticsModule requiere db'
    );
  }

  const repository =
    new AnalyticsRepository(db);

  const service =
    new AnalyticsService(repository);

  const controller =
    new AnalyticsController(service);

  return {
    repository,
    service,
    controller,

    handler:
      createAnalyticsHandler({
        controller
      })
  };
}


function createAnalyticsHandlerWithDependencies({
  db
}) {
  return createAnalyticsModule({
    db
  }).handler;
}


module.exports = {
  AnalyticsRepository,
  AnalyticsService,
  AnalyticsController,
  createAnalyticsModule,

  createAnalyticsHandler:
    createAnalyticsHandlerWithDependencies
};