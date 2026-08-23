const ReportsRepository = require('./reports.repository');
const ReportsService = require('./reports.service');
const ReportsController = require('./reports.controller');
const { createReportsHandler } = require('./reports.routes');

module.exports = {
  ReportsRepository,
  ReportsService,
  ReportsController,
  createReportsHandler
};
