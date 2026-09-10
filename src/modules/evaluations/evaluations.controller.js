class EvaluationsController {
  constructor(service) {
    this.service = service;
  }

  static json(res, status, payload) {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(payload));
  }

  async list(res, query = {}) {
    try {
      const rows = await this.service.list({
        agente: query.agente,
        evaluador: query.evaluador,
        ticket: query.ticket,
        limite: query.limite
      });

      EvaluationsController.json(res, 200, rows);
    } catch (error) {
      console.error('Error en evaluaciones:', error);
      EvaluationsController.json(
        res,
        error.status || 500,
        { error: error.message }
      );
    }
  }

  async create(res, evaluation) {
    try {
      const result = await this.service.create(evaluation);

      EvaluationsController.json(res, 201, result);
    } catch (error) {
      console.error('Error guardando evaluacion:', error);
      EvaluationsController.json(
        res,
        error.status || 500,
        { error: error.message }
      );
    }
  }

  async update(res, id, evaluation) {
  try {
    const result =
      await this.service.update(id, evaluation);

    EvaluationsController.json(
      res,
      200,
      result
    );
  } catch (error) {
    console.error(
      'Error actualizando evaluación:',
      error
    );

    EvaluationsController.json(
      res,
      error.status || 500,
      {
        error: error.message,
        code: error.code || null
      }
    );
  }
}

  async delete(res, id) {
    try {
      const result = await this.service.delete(id);

      EvaluationsController.json(res, 200, result);
    } catch (error) {
      console.error('Error eliminando evaluacion:', error);
      EvaluationsController.json(
        res,
        error.status || 500,
        { error: error.message }
      );
    }
  }

  async validateTicket(res, ticket) {
    try {
      const evaluation =
        await this.service.validateTicket(ticket);

      EvaluationsController.json(
        res,
        200,
        evaluation
      );
    } catch (error) {
      console.error('Error validando ticket:', error);
      EvaluationsController.json(
        res,
        error.status || 500,
        { error: error.message }
      );
    }
  }

  async listDetails(res, evaluationId) {
    try {
      const rows =
        await this.service.listDetails(evaluationId);

      EvaluationsController.json(res, 200, rows);
    } catch (error) {
      console.error(
        'Error obteniendo detalles:',
        error
      );

      EvaluationsController.json(
        res,
        error.status || 500,
        { error: error.message }
      );
    }
  }
}

module.exports = EvaluationsController;
