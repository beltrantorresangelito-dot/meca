const MatrixService = require('./matrix.service');
const MatrixController = require('./matrix.controller');

function createMatrixReadHandler({
  service = new MatrixService()
} = {}) {
  const controller = new MatrixController(service);

  return async function handleMatrixReadRequest({
    ruta,
    metodo,
    peticion,
    respuesta,
    query = {}
  }) {
    if (metodo !== 'GET') return false;


if (ruta === '/api/matriz/frentes') {
  console.log('[API] GET /api/matriz/frentes');
  await controller.listFrentes(peticion, respuesta);
  return true;
}

if (ruta === '/api/matriz/atributos') {
  console.log('[API] GET /api/matriz/atributos');
  await controller.listAtributos(peticion, respuesta, query);
  return true;
}

if (ruta === '/api/matriz/sub-motivos') {
  console.log('[API] GET /api/matriz/sub-motivos');
  await controller.listSubMotivos(peticion, respuesta, query);
  return true;
}

if (ruta === '/api/reglas-evaluacion') {
  console.log('[API] GET /api/reglas-evaluacion');
  await controller.listEvaluationRulesAdmin(peticion, respuesta);
  return true;
}

    if (ruta === '/api/evaluacion/version-activa') {
      console.log('[API] GET /api/evaluacion/version-activa');
      await controller.evaluationActiveVersion(peticion, respuesta);
      return true;
    }

    if (ruta === '/api/matriz/versiones/activa') {
      console.log('[API] GET /api/matriz/versiones/activa');
      await controller.activeVersion(peticion, respuesta);
      return true;
    }

    if (ruta === '/api/matriz/versiones/por-fecha') {
      console.log('[API] GET /api/matriz/versiones/por-fecha');
      await controller.versionByDate(peticion, respuesta, query);
      return true;
    }

    const structureMatch = ruta.match(
      /^\/api\/matriz\/versiones\/(\d+)\/estructura$/
    );

    if (structureMatch) {
      console.log('[API] GET /api/matriz/versiones/:id/estructura');
      await controller.structure(
        peticion,
        respuesta,
        structureMatch[1]
      );
      return true;
    }

    if (ruta === '/api/matriz/versiones') {
      console.log('[API] GET /api/matriz/versiones');
      await controller.listVersions(peticion, respuesta);
      return true;
    }

    const rulesMatch = ruta.match(
      /^\/api\/reglas-evaluacion\/version\/(\d+)$/
    );

    if (rulesMatch) {
      console.log('[API] GET /api/reglas-evaluacion/version/:id');
      await controller.rulesByVersion(
        peticion,
        respuesta,
        rulesMatch[1]
      );
      return true;
    }

    return false;
  };
}

module.exports = {
  createMatrixReadHandler
};
