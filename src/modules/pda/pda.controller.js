class PdaController {
  constructor(service) {
    this.service = service;
  }

  static json(res, status, payload) {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(payload));
  }

  async listPending(res) {
    try {
      const exists = await this.service.tableExists();

      if (!exists) {
        console.log('⚠️ Tabla pda_cabecera no existe, devolviendo array vacío');
        PdaController.json(res, 200, []);
        return;
      }

      const rows = await this.service.listPending();
      PdaController.json(res, 200, rows);
    } catch (error) {
      console.error('Error en /api/pda/pendientes:', error);
      PdaController.json(res, 200, []);
    }
  }

  async listTracking(res) {
    try {
      const exists = await this.service.tableExists();

      if (!exists) {
        PdaController.json(res, 200, []);
        return;
      }

      const rows = await this.service.listTracking();
      PdaController.json(res, 200, rows);
    } catch (error) {
      console.error('Error en /api/pda/seguimiento:', error);
      PdaController.json(res, 200, []);
    }
  }

  async listHistory(res) {
    try {
      const exists = await this.service.tableExists();

      if (!exists) {
        PdaController.json(res, 200, []);
        return;
      }

      const rows = await this.service.listHistory();
      PdaController.json(res, 200, rows);
    } catch (error) {
      console.error('Error en /api/pda/historial:', error);
      PdaController.json(res, 200, []);
    }
  }

  async getDetail(res, pdaId) {
    try {
      const pda = await this.service.getDetail(pdaId);

      if (!pda) {
        PdaController.json(
          res,
          404,
          { error: 'PDA no encontrado' }
        );
        return;
      }

      PdaController.json(res, 200, pda);
    } catch (error) {
      console.error('Error en /api/pda/:id:', error);

      PdaController.json(
        res,
        error.status || 500,
        { error: error.message }
      );
    }
  }

  async exportRows(res) {
    try {
      const rows = await this.service.exportRows();
      PdaController.json(res, 200, rows);
    } catch (error) {
      console.error('Error en /api/pda/exportar:', error);
      PdaController.json(res, error.status || 500, []);
    }
  }

  async create(res, payload) {
    try {
      const creado =
        await this.service.create(
          payload
        );

      PdaController.json(
        res,
        201,
        creado
      );

    } catch (error) {
      console.error(
        'Error en POST /api/pda:',
        error
      );

      PdaController.json(
        res,
        error.status || 500,
        {
          error:
            error.message ||
            'Error creando PDA'
        }
      );
    }
  }
  async registerFeedback(
    peticion,
    respuesta,
    pdaId,
    body
  ) {
    try {
      const resultado =
        await this.service
          .registerFeedback(
            pdaId,
            body
          );


      PdaController.json(
        respuesta,
        200,
        {
          success:
            true,

          data:
            resultado
        }
      );


    } catch (error) {

      console.error(
        'Error registrando feedback PDA:',
        error
      );


      PdaController.json(
        respuesta,
        error.status ||
        500,
        {
          success:
            false,

          error:
            error.message
        }
      );
    }
  }
  async evaluateTracking(
    respuesta,
    pdaId
  ) {
    try {

      const resultado =
        await this.service
          .evaluateTracking(
            pdaId
          );


      PdaController.json(
        respuesta,
        200,
        {
          success:
            true,

          data:
            resultado
        }
      );


    } catch (error) {

      console.error(
        'Error evaluando seguimiento PDA:',
        error
      );


      PdaController.json(
        respuesta,
        error.status ||
        500,
        {
          success:
            false,

          error:
            error.message
        }
      );
    }
  }

  async registerTrackingCycle(
    peticion,
    respuesta,
    pdaId,
    body
  ) {
    try {
      const resultado =
        await this.service
          .registerTrackingCycle(
            pdaId,
            body
          );

      PdaController.json(
        respuesta,
        200,
        {
          success: true,
          data: resultado
        }
      );

    } catch (error) {
      console.error(
        'Error registrando ciclo de seguimiento PDA:',
        error
      );

      PdaController.json(
        respuesta,
        error.status || 500,
        {
          success: false,
          error: error.message
        }
      );
    }
  }

  async sendToTraining(
    respuesta,
    pdaId,
    body
  ) {
    try {

      const resultado =
        await this.service
          .sendToTraining(
            pdaId,
            body
          );


      PdaController.json(
        respuesta,
        200,
        {
          success:
            true,

          data:
            resultado
        }
      );


    } catch (error) {

      console.error(
        'Error derivando PDA a capacitación:',
        error
      );


      PdaController.json(
        respuesta,
        error.status ||
        500,
        {
          success:
            false,

          error:
            error.message
        }
      );
    }
  }
  async closeForImprovement(
    respuesta,
    pdaId,
    body
  ) {
    try {

      const resultado =
        await this.service
          .closeForImprovement(
            pdaId,
            body
          );


      PdaController.json(
        respuesta,
        200,
        {
          success:
            true,

          data:
            resultado
        }
      );


    } catch (error) {

      console.error(
        'Error cerrando PDA por mejora:',
        error
      );


      PdaController.json(
        respuesta,
        error.status ||
        500,
        {
          success:
            false,

          error:
            error.message
        }
      );
    }
  }
  async registerTraining(
    respuesta,
    pdaId,
    body
  ) {
    try {

      const resultado =
        await this.service
          .registerTraining(
            pdaId,
            body
          );


      PdaController.json(
        respuesta,
        200,
        {
          success:
            true,

          data:
            resultado
        }
      );


    } catch (error) {

      console.error(
        'Error registrando capacitación PDA:',
        error
      );


      PdaController.json(
        respuesta,
        error.status ||
        500,
        {
          success:
            false,

          error:
            error.message
        }
      );
    }
  }

  async escalate(
    respuesta,
    pdaId,
    body
  ) {
    try {

      const resultado =
        await this.service
          .escalate(
            pdaId,
            body
          );


      PdaController.json(
        respuesta,
        200,
        {
          success:
            true,

          data:
            resultado
        }
      );


    } catch (error) {

      console.error(
        'Error escalando PDA:',
        error
      );


      PdaController.json(
        respuesta,
        error.status ||
        500,
        {
          success:
            false,

          error:
            error.message
        }
      );
    }
  }
}

module.exports = PdaController;
