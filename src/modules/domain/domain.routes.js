const DomainService = require('./domain.service');
const DomainController = require('./domain.controller');

function readJsonBody(req) {
  return new Promise(
    (resolve, reject) => {
      let raw = '';

      req.on('data', chunk => {
        raw += chunk;
      });

      req.on('end', () => {
        if (!raw.trim()) {
          resolve({});
          return;
        }

        try {
          resolve(JSON.parse(raw));
        } catch (error) {
          const parseError =
            new Error(
              'JSON inválido'
            );

          parseError.code =
            'VALIDATION_ERROR';

          parseError.status = 400;

          reject(parseError);
        }
      });

      req.on('error', reject);
    }
  );
}

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
    // ======================================================
    // F12.2 - ADMINISTRACIÓN DE QUIEBRES
    // ======================================================

    if (
      ruta === '/api/domain/quiebres' &&
      metodo === 'POST'
    ) {
      let body;

      try {
        body =
          await readJsonBody(peticion);
      } catch (error) {
        DomainController.handleError(
          respuesta,
          error
        );

        return true;
      }

      await controller.createBreak(
        peticion,
        respuesta,
        body
      );

      return true;
    }


    const breakMatch =
      ruta.match(
        /^\/api\/domain\/quiebres\/(\d+)$/
      );

    if (
      breakMatch &&
      metodo === 'PUT'
    ) {
      let body;

      try {
        body =
          await readJsonBody(peticion);
      } catch (error) {
        DomainController.handleError(
          respuesta,
          error
        );

        return true;
      }

      await controller.updateBreak(
        peticion,
        respuesta,
        breakMatch[1],
        body
      );

      return true;
    }


    const breakStatusMatch =
      ruta.match(
        /^\/api\/domain\/quiebres\/(\d+)\/estado$/
      );

    if (
      breakStatusMatch &&
      metodo === 'PATCH'
    ) {
      let body;

      try {
        body =
          await readJsonBody(peticion);
      } catch (error) {
        DomainController.handleError(
          respuesta,
          error
        );

        return true;
      }

      await controller.setBreakActive(
        peticion,
        respuesta,
        breakStatusMatch[1],
        body
      );

      return true;
    }

    // ======================================================
    // F12.3 - ADMINISTRACIÓN DE CAMPAÑAS
    // ======================================================

    if (
      ruta === '/api/domain/campanas' &&
      metodo === 'POST'
    ) {
      let body;

      try {
        body =
          await readJsonBody(peticion);
      } catch (error) {
        DomainController.handleError(
          respuesta,
          error
        );

        return true;
      }

      await controller.createCampaign(
        peticion,
        respuesta,
        body
      );

      return true;
    }


    const campaignMatch =
      ruta.match(
        /^\/api\/domain\/campanas\/(\d+)$/
      );

    if (
      campaignMatch &&
      metodo === 'PUT'
    ) {
      let body;

      try {
        body =
          await readJsonBody(peticion);
      } catch (error) {
        DomainController.handleError(
          respuesta,
          error
        );

        return true;
      }

      await controller.updateCampaign(
        peticion,
        respuesta,
        campaignMatch[1],
        body
      );

      return true;
    }


    const campaignStatusMatch =
      ruta.match(
        /^\/api\/domain\/campanas\/(\d+)\/estado$/
      );

    if (
      campaignStatusMatch &&
      metodo === 'PATCH'
    ) {
      let body;

      try {
        body =
          await readJsonBody(peticion);
      } catch (error) {
        DomainController.handleError(
          respuesta,
          error
        );

        return true;
      }

      await controller.setCampaignActive(
        peticion,
        respuesta,
        campaignStatusMatch[1],
        body
      );

      return true;
    }

    // ======================================================
    // F12.4 - ADMINISTRACIÓN DE MATRICES
    // ======================================================

    if (
      ruta === '/api/domain/matrices' &&
      metodo === 'POST'
    ) {
      let body;

      try {
        body =
          await readJsonBody(peticion);
      } catch (error) {
        DomainController.handleError(
          respuesta,
          error
        );

        return true;
      }

      await controller.createMatrix(
        peticion,
        respuesta,
        body
      );

      return true;
    }


    const matrixMatch =
      ruta.match(
        /^\/api\/domain\/matrices\/(\d+)$/
      );

    if (
      matrixMatch &&
      metodo === 'PUT'
    ) {
      let body;

      try {
        body =
          await readJsonBody(peticion);
      } catch (error) {
        DomainController.handleError(
          respuesta,
          error
        );

        return true;
      }

      await controller.updateMatrix(
        peticion,
        respuesta,
        matrixMatch[1],
        body
      );

      return true;
    }


    const matrixStatusMatch =
      ruta.match(
        /^\/api\/domain\/matrices\/(\d+)\/estado$/
      );

    if (
      matrixStatusMatch &&
      metodo === 'PATCH'
    ) {
      let body;

      try {
        body =
          await readJsonBody(peticion);
      } catch (error) {
        DomainController.handleError(
          respuesta,
          error
        );

        return true;
      }

      await controller.setMatrixActive(
        peticion,
        respuesta,
        matrixStatusMatch[1],
        body
      );

      return true;
    }

        // ======================================================
    // F12.5 - ASIGNACIÓN CAMPAÑA ↔ MATRIZ
    // ======================================================

    if (
      ruta === '/api/domain/campana-matriz' &&
      metodo === 'POST'
    ) {
      let body;

      try {
        body =
          await readJsonBody(
            peticion
          );
      } catch (error) {
        DomainController.handleError(
          respuesta,
          error
        );

        return true;
      }

      await controller
        .createCampaignMatrixAssignment(
          peticion,
          respuesta,
          body
        );

      return true;
    }


    const campaignMatrixMatch =
      ruta.match(
        /^\/api\/domain\/campana-matriz\/(\d+)$/
      );

    if (
      campaignMatrixMatch &&
      metodo === 'PUT'
    ) {
      let body;

      try {
        body =
          await readJsonBody(
            peticion
          );
      } catch (error) {
        DomainController.handleError(
          respuesta,
          error
        );

        return true;
      }

      await controller
        .updateCampaignMatrixAssignment(
          peticion,
          respuesta,
          campaignMatrixMatch[1],
          body
        );

      return true;
    }


    const campaignMatrixStatusMatch =
      ruta.match(
        /^\/api\/domain\/campana-matriz\/(\d+)\/estado$/
      );

    if (
      campaignMatrixStatusMatch &&
      metodo === 'PATCH'
    ) {
      let body;

      try {
        body =
          await readJsonBody(
            peticion
          );
      } catch (error) {
        DomainController.handleError(
          respuesta,
          error
        );

        return true;
      }

      await controller
        .setCampaignMatrixAssignmentActive(
          peticion,
          respuesta,
          campaignMatrixStatusMatch[1],
          body
        );

      return true;
    }

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
        query
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

    targetRoutes[routePath].GET = handler;
    // ============================================
    // F12.2 - POST QUIEBRES
    // ============================================
    if (
      routePath ===
      '/api/domain/quiebres'
    ) {
      targetRoutes[routePath].POST =
        async (req, res) => {
          let body;

          try {
            body =
              await readJsonBody(req);
          } catch (error) {
            DomainController.handleError(
              res,
              error
            );

            return;
          }

          await controller.createBreak(
            req,
            res,
            body
          );
        };
    }

    // ============================================
    // F12.3 - POST CAMPAÑAS
    // ============================================
    if (
      routePath ===
      '/api/domain/campanas'
    ) {
      targetRoutes[routePath].POST =
        async (req, res) => {
          let body;

          try {
            body =
              await readJsonBody(req);
          } catch (error) {
            DomainController.handleError(
              res,
              error
            );

            return;
          }

          await controller.createCampaign(
            req,
            res,
            body
          );
        };
    }
        if (
      routePath ===
      '/api/domain/matrices'
    ) {
      targetRoutes[routePath].POST =
        async (req, res) => {
          let body;

          try {
            body =
              await readJsonBody(req);
          } catch (error) {
            DomainController.handleError(
              res,
              error
            );

            return;
          }

          await controller.createMatrix(
            req,
            res,
            body
          );
        };
    }

        if (
      routePath ===
      '/api/domain/campana-matriz'
    ) {
      targetRoutes[routePath].POST =
        async (req, res) => {
          let body;

          try {
            body =
              await readJsonBody(
                req
              );
          } catch (error) {
            DomainController.handleError(
              res,
              error
            );

            return;
          }

          await controller
            .createCampaignMatrixAssignment(
              req,
              res,
              body
            );
        };
    }
  }

  return definitions.map(
    ([routePath]) => routePath
  );
}

module.exports = {
  createDomainHandler,
  registerDomainRoutes
};