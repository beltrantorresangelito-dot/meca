const DomainService = require('./domain.service');
const DomainController = require('./domain.controller');

function createDomainHandler({
  service = new DomainService()
} = {}) {
  const controller = new DomainController(service);

  const routes = new Map([
    ['/api/domain/quiebres', controller.listBreaks.bind(controller)],
    ['/api/domain/campanas', controller.listCampaigns.bind(controller)],
    ['/api/domain/matrices', controller.listMatrices.bind(controller)],
    ['/api/domain/campana-matriz', controller.campaignMatrixHistory.bind(controller)],
    ['/api/domain/contexto-evaluacion', controller.resolveContext.bind(controller)],
    ['/api/domain/consistencia', controller.consistency.bind(controller)]
  ]);

  return async function handleDomainRequest({
    ruta,
    metodo,
    peticion,
    respuesta,
    query
  }) {
    if (metodo !== 'GET') {
      return false;
    }

    const handler = routes.get(ruta);

    if (!handler) {
      return false;
    }

    await handler(
      peticion,
      respuesta,
      query || {}
    );

    return true;
  };
}


function registerDomainRoutes(
  targetRoutes,
  {
    service = new DomainService()
  } = {}
) {
  if (!targetRoutes || typeof targetRoutes !== 'object') {
    throw new Error('routes es obligatorio');
  }

  const controller =
    new DomainController(service);

  const definitions = [
    [
      '/api/domain/quiebres',
      controller.listBreaks.bind(controller)
    ],
    [
      '/api/domain/campanas',
      controller.listCampaigns.bind(controller)
    ],
    [
      '/api/domain/matrices',
      controller.listMatrices.bind(controller)
    ],
    [
      '/api/domain/campana-matriz',
      controller.campaignMatrixHistory.bind(controller)
    ],
    [
      '/api/domain/contexto-evaluacion',
      controller.resolveContext.bind(controller)
    ],
    [
      '/api/domain/consistencia',
      controller.consistency.bind(controller)
    ]
  ];

  for (const [routePath, handler] of definitions) {
    targetRoutes[routePath] =
      targetRoutes[routePath] || {};

    targetRoutes[routePath].GET =
      handler;
  }

  return definitions.map(
    ([routePath]) => routePath
  );
}

module.exports = {
  createDomainHandler,
  registerDomainRoutes
};