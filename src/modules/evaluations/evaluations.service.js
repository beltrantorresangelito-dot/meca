class EvaluationsService {
  constructor(repository) {
    this.repository = repository;
  }

  async list(filters = {}) {
    return this.repository.list(filters);
  }

  async create(evaluation) {
    if (!evaluation || typeof evaluation !== 'object') {
      const error = new Error('Evaluación inválida');
      error.status = 400;
      throw error;
    }

    return this.repository.saveWithDetails(evaluation);
  }

  async delete(id) {
    if (!id) {
      const error = new Error('ID de evaluación requerido');
      error.status = 400;
      throw error;
    }

    return this.repository.deleteById(id);
  }

  async validateTicket(ticket) {
    if (!ticket) {
      return null;
    }

    return this.repository.findByTicket(ticket);
  }

  async listDetails(evaluationId) {
    if (!evaluationId) {
      const error = new Error('ID de evaluación requerido');
      error.status = 400;
      throw error;
    }

    return this.repository.listDetails(evaluationId);
  }
}

module.exports = EvaluationsService;
