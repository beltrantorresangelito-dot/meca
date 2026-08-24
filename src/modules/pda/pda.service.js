class PdaService {
  constructor(repository) {
    this.repository = repository;
  }

  async tableExists() {
    return this.repository.tableExists();
  }

  async listPending() {
    return this.repository.listPending();
  }

  async listTracking() {
    return this.repository.listTracking();
  }

  async listHistory() {
    return this.repository.listHistory();
  }

  async getDetail(pdaId) {
    if (!pdaId) {
      const error = new Error('ID de PDA requerido');
      error.status = 400;
      throw error;
    }

    const pda = await this.repository.findHeaderById(pdaId);

    if (!pda) {
      return null;
    }

    const acciones = await this.repository.listActions(pdaId);

    pda.acciones = acciones;

    const totalAcciones = acciones.length;
    const completadas = acciones.filter(
      accion => accion.completado === true
    ).length;

    pda.progreso = totalAcciones > 0
      ? Math.round((completadas / totalAcciones) * 100)
      : 0;

    return pda;
  }

  async exportRows() {
    return this.repository.exportRows();
  }
}

module.exports = PdaService;
