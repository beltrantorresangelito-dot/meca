const HealthRepository =
  require('./health.repository');

const HealthService =
  require('./health.service');

const HealthController =
  require('./health.controller');

const {
  createHealthHandler
} = require('./health.routes');

module.exports = {
  HealthRepository,
  HealthService,
  HealthController,
  createHealthHandler
};
