const DomainService = require('./domain.service');
const DomainController = require('./domain.controller');

function registerDomainRoutes(routes, { service = new DomainService() } = {}) {
  if (!routes || typeof routes !== 'object') {
    throw new Error('routes es obligatorio');
  }

  const controller = new DomainController(service);

  const definitions = [
    ['/api/domain/quiebres', controller.listBreaks.bind(controller)],
    ['/api/domain/campanas', controller.listCampaigns.bind(controller)],
    ['/api/domain/matrices', controller.listMatrices.bind(controller)],
    ['/api/domain/campana-matriz', controller.campaignMatrixHistory.bind(controller)],
    ['/api/domain/contexto-evaluacion', controller.resolveContext.bind(controller)],
    ['/api/domain/consistencia', controller.consistency.bind(controller)]
  ];

  for (const [path, handler] of definitions) {
    routes[path] = routes[path] || {};
    routes[path].GET = handler;
  }

  return definitions.map(([path]) => path);
}

module.exports = { registerDomainRoutes };
