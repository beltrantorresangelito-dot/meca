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

  await controller.listFrentes(
    peticion,
    respuesta,
    query
  );

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

  await controller.listEvaluationRulesAdmin(
    peticion,
    respuesta,
    query
  );

  return true;
}

    if (ruta === '/api/evaluacion/version-activa') {
      console.log('[API] GET /api/evaluacion/version-activa');
      await controller.evaluationActiveVersion(
          peticion,
          respuesta,
          query
      );
      return true;
    }

    if (ruta === '/api/matriz/versiones/activa') {
      console.log('[API] GET /api/matriz/versiones/activa');
      await controller.activeVersion(
          peticion,
          respuesta,
          query
      );
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

      await controller.listVersions(
        peticion,
        respuesta,
        query
      );

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


if (ruta === '/api/evaluacion/estructura') {
  console.log(
    '[API] GET /api/evaluacion/estructura'
  );

  await controller.getActiveEvaluationStructure(
    peticion,
    respuesta,
    query
  );

  return true;
}

    return false;
  };
}



function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';

    req.on('data', chunk => {
      body += chunk;
    });

    req.on('end', () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch (error) {
        reject(error);
      }
    });

    req.on('error', reject);
  });
}

function createMatrixWriteHandler({
  service = new MatrixService()
} = {}) {
  const controller = new MatrixController(service);

  return async function handleMatrixWriteRequest({
    ruta,
    metodo,
    peticion,
    respuesta
  }) {
    if (ruta === '/api/matriz/frentes' && metodo === 'POST') {
      console.log('[API] POST /api/matriz/frentes');

      let body;
      try {
        body = await readJsonBody(peticion);
      } catch (error) {
        MatrixController.json(respuesta, 500, { error: error.message });
        return true;
      }

      await controller.createFront(peticion, respuesta, body);
      return true;
    }

    const frontMatch = ruta.match(/^\/api\/matriz\/frentes\/(\d+)$/);

    if (frontMatch && metodo === 'PUT') {
      console.log('[API] PUT /api/matriz/frentes/:id');

      let body;
      try {
        body = await readJsonBody(peticion);
      } catch (error) {
        MatrixController.json(respuesta, 500, { error: error.message });
        return true;
      }

      await controller.updateFront(
        peticion,
        respuesta,
        frontMatch[1],
        body
      );
      return true;
    }

    if (
  frontMatch &&
  metodo === 'DELETE'
) {
  console.log(
    '[API] DELETE /api/matriz/frentes/:id'
  );

  let body;

  try {
    body =
      await readJsonBody(
        peticion
      );
  } catch (error) {
    MatrixController.json(
      respuesta,
      400,
      {
        error:
          'Body JSON inválido'
      }
    );

    return true;
  }

  await controller.deleteFront(
    peticion,
    respuesta,
    frontMatch[1],
    body
  );

  return true;
}


if (ruta === '/api/matriz/atributos' && metodo === 'POST') {
  console.log('[API] POST /api/matriz/atributos');

  let body;
  try {
    body = await readJsonBody(peticion);
  } catch (error) {
    MatrixController.json(respuesta, 500, { error: error.message });
    return true;
  }

  await controller.createAttribute(peticion, respuesta, body);
  return true;
}

const attributeMatch = ruta.match(/^\/api\/matriz\/atributos\/(\d+)$/);

if (attributeMatch && metodo === 'PUT') {
  console.log('[API] PUT /api/matriz/atributos/:id');

  let body;
  try {
    body = await readJsonBody(peticion);
  } catch (error) {
    MatrixController.json(respuesta, 500, { error: error.message });
    return true;
  }

  await controller.updateAttribute(
    peticion,
    respuesta,
    attributeMatch[1],
    body
  );
  return true;
}

if (attributeMatch && metodo === 'DELETE') {
  console.log('[API] DELETE /api/matriz/atributos/:id');

  let body = {};

  try {
    body = await readJsonBody(peticion);
  } catch (error) {
    // DELETE legacy puede llegar sin body.
    // Conservamos compatibilidad durante la transición.
    body = {};
  }

  await controller.deleteAttribute(
    peticion,
    respuesta,
    attributeMatch[1],
    body
  );

  return true;
}


if (ruta === '/api/matriz/sub-motivos' && metodo === 'POST') {
  console.log('[API] POST /api/matriz/sub-motivos');

  let body;
  try {
    body = await readJsonBody(peticion);
  } catch (error) {
    MatrixController.json(respuesta, 500, { error: error.message });
    return true;
  }

  await controller.createSubReason(peticion, respuesta, body);
  return true;
}

const subReasonMatch = ruta.match(/^\/api\/matriz\/sub-motivos\/(\d+)$/);

if (subReasonMatch && metodo === 'PUT') {
  console.log('[API] PUT /api/matriz/sub-motivos/:id');

  let body;
  try {
    body = await readJsonBody(peticion);
  } catch (error) {
    MatrixController.json(respuesta, 500, { error: error.message });
    return true;
  }

  await controller.updateSubReason(
    peticion,
    respuesta,
    subReasonMatch[1],
    body
  );
  return true;
}

if (subReasonMatch && metodo === 'DELETE') {
  console.log('[API] DELETE /api/matriz/sub-motivos/:id');

  let body = {};

  try {
    body = await readJsonBody(peticion);
  } catch (error) {
    // Compatibilidad legacy:
    // DELETE puede llegar sin body.
    body = {};
  }

  await controller.deleteSubReason(
    peticion,
    respuesta,
    subReasonMatch[1],
    body
  );

  return true;
}



if (ruta === '/api/matriz/versiones/congelar' && metodo === 'POST') {
  let body;
  try { body = await readJsonBody(peticion); }
  catch (error) {
    MatrixController.json(respuesta, 500, { error: error.message });
    return true;
  }
  await controller.freezeVersion(peticion, respuesta, body);
  return true;
}

if (ruta === '/api/matriz/versiones' && metodo === 'POST') {
  let body;
  try { body = await readJsonBody(peticion); }
  catch (error) {
    MatrixController.json(respuesta, 500, { error: error.message });
    return true;
  }
  await controller.createEmptyVersion(peticion, respuesta, body);
  return true;
}

const activateVersionMatch = ruta.match(
  /^\/api\/matriz\/versiones\/(\d+)\/activar$/
);
if (activateVersionMatch && metodo === 'PUT') {
  await controller.activateVersion(
    peticion, respuesta, activateVersionMatch[1]
  );
  return true;
}

const integrityMatch = ruta.match(
  /^\/api\/matriz\/versiones\/(\d+)\/integridad$/
);
if (integrityMatch && metodo === 'GET') {
  await controller.validateVersionIntegrity(
    peticion, respuesta, integrityMatch[1]
  );
  return true;
}

if (ruta === '/api/matriz/validar/frentes' && metodo === 'POST') {
  let body;
  try { body = await readJsonBody(peticion); }
  catch (error) {
    MatrixController.json(respuesta, 500, { error: error.message });
    return true;
  }
  await controller.validateFrontWeight(peticion, respuesta, body);
  return true;
}

if (ruta === '/api/matriz/validar/atributos' && metodo === 'POST') {
  let body;
  try { body = await readJsonBody(peticion); }
  catch (error) {
    MatrixController.json(respuesta, 500, { error: error.message });
    return true;
  }
  await controller.validateAttributeWeight(peticion, respuesta, body);
  return true;
}

if (ruta === '/api/matriz/validar/sub-motivos' && metodo === 'POST') {
  let body;
  try { body = await readJsonBody(peticion); }
  catch (error) {
    MatrixController.json(respuesta, 500, { error: error.message });
    return true;
  }
  await controller.validateSubReasonWeight(peticion, respuesta, body);
  return true;
}


if (ruta === '/api/reglas-evaluacion' && metodo === 'POST') {
  let body;
  try { body = await readJsonBody(peticion); }
  catch (error) {
    MatrixController.json(respuesta, 500, { error: error.message });
    return true;
  }

  await controller.createEvaluationRule(peticion, respuesta, body);
  return true;
}

const evaluationRuleMatch = ruta.match(
  /^\/api\/reglas-evaluacion\/(\d+)$/
);

if (evaluationRuleMatch && metodo === 'PUT') {
  let body;
  try { body = await readJsonBody(peticion); }
  catch (error) {
    MatrixController.json(respuesta, 500, { error: error.message });
    return true;
  }

  await controller.updateEvaluationRule(
    peticion,
    respuesta,
    evaluationRuleMatch[1],
    body
  );
  return true;
}

if (
  evaluationRuleMatch &&
  metodo === 'DELETE'
) {
  let body = {};

  try {
    body = await readJsonBody(peticion);
  } catch (error) {
    body = {};
  }

  await controller.deleteEvaluationRule(
    peticion,
    respuesta,
    evaluationRuleMatch[1],
    body
  );

  return true;
}

    return false;
  };
}

module.exports = {
  createMatrixReadHandler,
  createMatrixWriteHandler
};
