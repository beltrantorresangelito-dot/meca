const ReportsRepository = require('./reports.repository');
const ReportsService = require('./reports.service');
const ReportsController = require('./reports.controller');

function createReportsHandler({ db } = {}) {
  if (!db) {
    throw new Error('ReportsModule requiere db');
  }

  const repository = new ReportsRepository(db);
  const service = new ReportsService(repository);
  const controller = new ReportsController(service);

  return async function handleReportsRequest({
    ruta,
    metodo,
    peticion,
    respuesta,
    query = {}
  }) {
    if (metodo !== 'GET') return false;

    if (ruta === '/api/reportes/kpis') {
      await controller.getKpis(peticion, respuesta);
      return true;
    }

    if (ruta === '/api/reportes/ranking') {
      await controller.getRanking(peticion, respuesta);
      return true;
    }

    if (ruta === '/api/reportes/meses-disponibles') {
      await controller.getAvailableMonths(peticion, respuesta);
      return true;
    }

    if (ruta === '/api/reportes/evolutivo') {
      await controller.getEvolution(peticion, respuesta, query);
      return true;
    }

    if (ruta === '/api/reportes/top-fallas') {
      await controller.getTopFailures(peticion, respuesta);
      return true;
    }

    if (ruta === '/api/reportes/errores-auditores') {
      await controller.getAuditorErrors(peticion, respuesta, query);
      return true;
    }

    if (ruta === '/api/reportes/evaluaciones-con-detalles') {
      await controller.getEvaluationsWithDetails(peticion, respuesta);
      return true;
    }

    if (ruta === '/api/reportes/lideres') {
      await controller.getLeaders(peticion, respuesta);
      return true;
    }

    if (ruta === '/api/reportes/resumen-por-lider') {
      await controller.getSummaryByLeader(peticion, respuesta);
      return true;
    }

    if (ruta === '/api/reportes/resumen-por-ubicacion') {
      await controller.getSummaryByLocation(peticion, respuesta);
      return true;
    }

    if (ruta === '/api/reportes/resumen-por-localidad') {
      await controller.getSummaryByLocality(peticion, respuesta);
      return true;
    }

    return false;
  };
}

module.exports = {
  createReportsHandler
};
