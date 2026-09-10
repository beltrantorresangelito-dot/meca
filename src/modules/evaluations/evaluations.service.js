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
        error.code = 'INVALID_EVALUATION';
        throw error;
    }

    const campanaId =
        evaluation.campana_id ??
        evaluation.campanaId ??
        null;

    const quiebreId =
        evaluation.quiebre_id ??
        evaluation.quiebreId ??
        null;

    const tieneCampana =
        campanaId !== null &&
        campanaId !== undefined &&
        String(campanaId).trim() !== '';

    const tieneQuiebre =
        quiebreId !== null &&
        quiebreId !== undefined &&
        String(quiebreId).trim() !== '';

    if (!tieneCampana && !tieneQuiebre) {
        const error = new Error(
            'La evaluación debe tener campana_id o quiebre_id'
        );

        error.status = 400;
        error.code = 'EVALUATION_CONTEXT_REQUIRED';

        throw error;
    }

    return this.repository.saveWithDetails(evaluation);
}

async update(id, evaluation) {
  if (!id) {
    const error = new Error(
      'ID de evaluación requerido'
    );
    error.status = 400;
    throw error;
  }

  if (!evaluation || typeof evaluation !== 'object') {
    const error = new Error(
      'Evaluación inválida'
    );
    error.status = 400;
    throw error;
  }

  return this.repository.updateWithDetails(
    id,
    evaluation
  );
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
