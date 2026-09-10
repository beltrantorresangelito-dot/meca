function sendJson(respuesta, status, payload) {
  respuesta.writeHead(
    status,
    {
      'Content-Type':
        'application/json; charset=utf-8'
    }
  );

  respuesta.end(
    JSON.stringify(payload)
  );
}


function createAnalyticsHandler({
  controller
}) {
  if (!controller) {
    throw new Error(
      'createAnalyticsHandler requiere controller'
    );
  }

  return async function handleAnalyticsRequest({
    ruta,
    metodo,
    peticion,
    respuesta,
    query = {}
  }) {
    if (
      metodo !== 'GET'
    ) {
      return false;
    }

    if (
      ruta === '/api/analytics/poblacion'
    ) {
      try {
        const result =
          await controller.getPopulation(
            query
          );

        sendJson(
          respuesta,
          200,
          result
        );
      } catch (error) {
        sendJson(
          respuesta,
          error.status || 500,
          {
            success: false,
            error:
              error.message ||
              'Error interno de Analytics',
            code:
              error.code ||
              'ANALYTICS_INTERNAL_ERROR'
          }
        );
      }

      return true;
    }
    if (
      ruta === '/api/analytics/resumen-ejecutivo'
    ) {
      try {
        const result =
          await controller.getExecutiveSummary(
            query
          );

        sendJson(
          respuesta,
          200,
          result
        );
      } catch (error) {
        sendJson(
          respuesta,
          error.status || 500,
          {
            success: false,
            error:
              error.message ||
              'Error interno de Analytics',
            code:
              error.code ||
              'ANALYTICS_INTERNAL_ERROR'
          }
        );
      }

      return true;
    }
    if (ruta === '/api/analytics/filtros') {
      try {
        const result =
          await controller.getFilters(query);

        sendJson(
          respuesta,
          200,
          result
        );
      } catch (error) {
        sendJson(
          respuesta,
          error.status || 500,
          {
            success: false,
            error:
              error.message ||
              'Error interno de Analytics',
            code:
              error.code ||
              'ANALYTICS_INTERNAL_ERROR'
          }
        );
      }

      return true;
    }

    if (ruta === '/api/analytics/evolucion') {
      try {
        const result =
          await controller.getEvolution(query);

        sendJson(
          respuesta,
          200,
          result
        );
      } catch (error) {
        sendJson(
          respuesta,
          error.status || 500,
          {
            success: false,
            error:
              error.message ||
              'Error interno de Analytics',
            code:
              error.code ||
              'ANALYTICS_INTERNAL_ERROR'
          }
        );
      }

      return true;
    }

    if (ruta === '/api/analytics/diagnostico') {
      try {
        const result =
          await controller.getDiagnostic(query);

        sendJson(
          respuesta,
          200,
          result
        );
      } catch (error) {
        sendJson(
          respuesta,
          error.status || 500,
          {
            success: false,
            error:
              error.message ||
              'Error interno de Analytics',
            code:
              error.code ||
              'ANALYTICS_INTERNAL_ERROR'
          }
        );
      }

      return true;
    }

    if (ruta === '/api/analytics/concentracion') {
      try {
        const result =
          await controller.getConcentration(query);

        sendJson(
          respuesta,
          200,
          result
        );
      } catch (error) {
        sendJson(
          respuesta,
          error.status || 500,
          {
            success: false,
            error:
              error.message ||
              'Error interno de Analytics',
            code:
              error.code ||
              'ANALYTICS_INTERNAL_ERROR'
          }
        );
      }

      return true;
    }

    if (
      ruta ===
      '/api/analytics/detalle-hallazgo'
    ) {
      try {
        const result =
          await controller
            .getFindingDetail(query);

        sendJson(
          respuesta,
          200,
          result
        );
      } catch (error) {
        sendJson(
          respuesta,
          error.status || 500,
          {
            success: false,

            error:
              error.message ||
              'Error interno de Analytics',

            code:
              error.code ||
              'ANALYTICS_INTERNAL_ERROR'
          }
        );
      }

      return true;
    }

    if (
      ruta ===
      '/api/analytics/intervencion'
    ) {
      try {
        const result =
          await controller
            .getIntervention(query);

        sendJson(
          respuesta,
          200,
          result
        );

      } catch (error) {
        sendJson(
          respuesta,
          error.status || 500,
          {
            success: false,

            error:
              error.message ||
              'Error interno de Analytics',

            code:
              error.code ||
              'ANALYTICS_INTERNAL_ERROR'
          }
        );
      }

      return true;
    }
    return false;
  };

}


module.exports = {
  createAnalyticsHandler
};