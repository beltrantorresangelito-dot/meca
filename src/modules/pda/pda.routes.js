const PdaRepository =
  require('./pda.repository');

const PdaService =
  require('./pda.service');

const PdaController =
  require('./pda.controller');


// ======================================================
// TOKEN
// ======================================================

function requireToken(
  req,
  res
) {
  const token =
    req
      .headers
      ?.authorization
      ?.split(' ')[1];


  if (!token) {

    PdaController.json(
      res,
      401,
      {
        error:
          'Token requerido'
      }
    );


    return false;
  }


  return true;
}


// ======================================================
// LEER BODY JSON
// ======================================================

function readJsonBody(
  req
) {
  return new Promise(
    (
      resolve,
      reject
    ) => {

      let body =
        '';


      req.on(
        'data',
        chunk => {

          body +=
            chunk;
        }
      );


      req.on(
        'end',
        () => {

          try {

            if (
              !body.trim()
            ) {

              resolve(
                {}
              );

              return;
            }


            resolve(
              JSON.parse(
                body
              )
            );


          } catch (
          error
          ) {

            const invalidJson =
              new Error(
                'JSON inválido'
              );


            invalidJson.status =
              400;


            reject(
              invalidJson
            );
          }
        }
      );


      req.on(
        'error',
        reject
      );
    }
  );
}


// ======================================================
// HANDLER PDA
// ======================================================

function createPdaHandler({
  db
} = {}) {

  // ====================================================
  // DEPENDENCIA DB
  // ====================================================

  if (!db) {

    throw new Error(
      'PdaModule requiere db'
    );
  }


  const repository =
    new PdaRepository(
      db
    );


  const service =
    new PdaService(
      repository
    );


  const controller =
    new PdaController(
      service
    );


  // ====================================================
  // DISPATCHER
  // ====================================================

  return async function handlePdaRequest({
    ruta,
    metodo,
    peticion,
    respuesta
  }) {

    // ==================================================
    // POST /api/pda
    // CREAR PDA
    // ==================================================

    if (
      ruta ===
      '/api/pda' &&
      metodo ===
      'POST'
    ) {

      if (
        !requireToken(
          peticion,
          respuesta
        )
      ) {

        return true;
      }


      try {

        const payload =
          await readJsonBody(
            peticion
          );


        await controller
          .create(
            respuesta,
            payload
          );


      } catch (
      error
      ) {

        PdaController.json(
          respuesta,
          error.status ||
          400,
          {
            error:
              error.message ||
              'Solicitud inválida'
          }
        );
      }


      return true;
    }


    // ==================================================
    // GET /api/pda/pendientes
    // ==================================================

    if (
      ruta ===
      '/api/pda/pendientes' &&
      metodo ===
      'GET'
    ) {

      if (
        !requireToken(
          peticion,
          respuesta
        )
      ) {

        return true;
      }


      await controller
        .listPending(
          respuesta
        );


      return true;
    }


    // ==================================================
    // GET /api/pda/seguimiento
    // ==================================================

    if (
      ruta ===
      '/api/pda/seguimiento' &&
      metodo ===
      'GET'
    ) {

      if (
        !requireToken(
          peticion,
          respuesta
        )
      ) {

        return true;
      }


      await controller
        .listTracking(
          respuesta
        );


      return true;
    }


    // ==================================================
    // GET /api/pda/historial
    // ==================================================

    if (
      ruta ===
      '/api/pda/historial' &&
      metodo ===
      'GET'
    ) {

      if (
        !requireToken(
          peticion,
          respuesta
        )
      ) {

        return true;
      }


      await controller
        .listHistory(
          respuesta
        );


      return true;
    }

    // ==================================================
    // POST /api/pda/:id/seguimiento/ciclo
    // ==================================================

    const trackingCycleMatch =
      ruta.match(
        /^\/api\/pda\/(\d+)\/seguimiento\/ciclo$/
      );


    if (
      trackingCycleMatch &&
      metodo ===
      'POST'
    ) {
      if (
        !requireToken(
          peticion,
          respuesta
        )
      ) {
        return true;
      }


      try {
        const payload =
          await readJsonBody(
            peticion
          );


        await controller
          .registerTrackingCycle(
            peticion,
            respuesta,
            trackingCycleMatch[1],
            payload
          );


      } catch (error) {

        PdaController.json(
          respuesta,
          error.status ||
          400,
          {
            success:
              false,

            error:
              error.message ||
              'No se pudo registrar el ciclo de seguimiento'
          }
        );
      }


      return true;
    }


    // ==================================================
    // POST /api/pda/:id/feedback
    //
    // NUEVO:
    // Registra feedback + temas trabajados
    // ==================================================

    const feedbackMatch =
      ruta.match(
        /^\/api\/pda\/(\d+)\/feedback$/
      );


    if (
      feedbackMatch &&
      metodo ===
      'POST'
    ) {

      if (
        !requireToken(
          peticion,
          respuesta
        )
      ) {

        return true;
      }


      try {

        const payload =
          await readJsonBody(
            peticion
          );


        if (
          typeof controller
            .registerFeedback !==
          'function'
        ) {

          PdaController.json(
            respuesta,
            501,
            {
              error:
                'Registro de feedback PDA no implementado'
            }
          );


          return true;
        }


        await controller
          .registerFeedback(
            peticion,
            respuesta,
            feedbackMatch[1],
            payload
          );


      } catch (
      error
      ) {

        PdaController.json(
          respuesta,
          error.status ||
          400,
          {
            success:
              false,

            error:
              error.message ||
              'No se pudo registrar el feedback'
          }
        );
      }


      return true;
    }

    // ==================================================
    // POST /api/pda/:id/escalar
    // ==================================================

    const escalateMatch =
      ruta.match(
        /^\/api\/pda\/(\d+)\/escalar$/
      );


    if (
      escalateMatch &&
      metodo ===
      'POST'
    ) {
      if (
        !requireToken(
          peticion,
          respuesta
        )
      ) {
        return true;
      }


      try {

        const payload =
          await readJsonBody(
            peticion
          );


        await controller
          .escalate(
            respuesta,
            escalateMatch[1],
            payload
          );


      } catch (error) {

        PdaController.json(
          respuesta,
          error.status ||
          400,
          {
            success:
              false,

            error:
              error.message ||
              'No se pudo escalar el PDA'
          }
        );
      }


      return true;
    }

    // ==================================================
    // GET /api/pda/:id/seguimiento/evaluacion
    // ==================================================

    const trackingEvaluationMatch =
      ruta.match(
        /^\/api\/pda\/(\d+)\/seguimiento\/evaluacion$/
      );


    if (
      trackingEvaluationMatch &&
      metodo ===
      'GET'
    ) {
      if (
        !requireToken(
          peticion,
          respuesta
        )
      ) {
        return true;
      }


      await controller
        .evaluateTracking(
          respuesta,
          trackingEvaluationMatch[1]
        );


      return true;
    }

    // ==================================================
    // POST /api/pda/:id/capacitacion/derivar
    // ==================================================

    const trainingMatch =
      ruta.match(
        /^\/api\/pda\/(\d+)\/capacitacion\/derivar$/
      );


    if (
      trainingMatch &&
      metodo ===
      'POST'
    ) {
      if (
        !requireToken(
          peticion,
          respuesta
        )
      ) {
        return true;
      }


      try {

        const payload =
          await readJsonBody(
            peticion
          );


        await controller
          .sendToTraining(
            respuesta,
            trainingMatch[1],
            payload
          );


      } catch (error) {

        PdaController.json(
          respuesta,
          error.status ||
          400,
          {
            success:
              false,

            error:
              error.message ||
              'No se pudo derivar el PDA a capacitación'
          }
        );
      }


      return true;
    }

    // ==================================================
    // POST /api/pda/:id/cerrar-mejora
    // ==================================================

    const closeImprovementMatch =
      ruta.match(
        /^\/api\/pda\/(\d+)\/cerrar-mejora$/
      );


    if (
      closeImprovementMatch &&
      metodo ===
      'POST'
    ) {
      if (
        !requireToken(
          peticion,
          respuesta
        )
      ) {
        return true;
      }


      try {

        const payload =
          await readJsonBody(
            peticion
          );


        await controller
          .closeForImprovement(
            respuesta,
            closeImprovementMatch[1],
            payload
          );


      } catch (error) {

        PdaController.json(
          respuesta,
          error.status ||
          400,
          {
            success:
              false,

            error:
              error.message ||
              'No se pudo cerrar el PDA'
          }
        );
      }


      return true;
    }

    // ==================================================
    // POST /api/pda/:id/capacitacion
    // ==================================================

    const registerTrainingMatch =
      ruta.match(
        /^\/api\/pda\/(\d+)\/capacitacion$/
      );


    if (
      registerTrainingMatch &&
      metodo ===
      'POST'
    ) {
      if (
        !requireToken(
          peticion,
          respuesta
        )
      ) {
        return true;
      }


      try {

        const payload =
          await readJsonBody(
            peticion
          );


        await controller
          .registerTraining(
            respuesta,
            registerTrainingMatch[1],
            payload
          );


      } catch (error) {

        PdaController.json(
          respuesta,
          error.status ||
          400,
          {
            success:
              false,

            error:
              error.message ||
              'No se pudo registrar la capacitación'
          }
        );
      }


      return true;
    }

    // ==================================================
    // GET /api/pda/:id
    // DETALLE COMPLETO
    //
    // IMPORTANTE:
    // Este matcher va DESPUÉS de /feedback.
    // ==================================================

    const detailMatch =
      ruta.match(
        /^\/api\/pda\/(\d+)$/
      );


    if (
      detailMatch &&
      metodo ===
      'GET'
    ) {

      if (
        !requireToken(
          peticion,
          respuesta
        )
      ) {

        return true;
      }


      await controller
        .getDetail(
          respuesta,
          detailMatch[1]
        );


      return true;
    }


    // ==================================================
    // GET /api/pda/exportar
    // ==================================================

    if (
      ruta ===
      '/api/pda/exportar' &&
      metodo ===
      'GET'
    ) {

      if (
        !requireToken(
          peticion,
          respuesta
        )
      ) {

        return true;
      }


      await controller
        .exportRows(
          respuesta
        );


      return true;
    }


    // ==================================================
    // NO PERTENECE AL MÓDULO PDA
    // ==================================================

    return false;
  };
}


// ======================================================
// EXPORTS
// ======================================================

module.exports = {
  createPdaHandler
};