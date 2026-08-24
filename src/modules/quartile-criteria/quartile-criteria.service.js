class QuartileCriteriaService {
  constructor(repository) {
    this.repository = repository;
  }

  async listAll() {
    return this.repository.listAll();
  }

  async listActive() {
    const hoy = new Date().toISOString().split('T')[0];
    return this.repository.listActiveByDate(hoy);
  }

  async create(data) {
    if (!data || typeof data !== 'object') {
      const error = new Error('Criterio inválido');
      error.status = 400;
      throw error;
    }

    return this.repository.create(data);
  }

  async update(id, data) {
    if (!id) {
      const error = new Error('ID de criterio requerido');
      error.status = 400;
      throw error;
    }

    if (!data || typeof data !== 'object') {
      const error = new Error('Criterio inválido');
      error.status = 400;
      throw error;
    }

    return this.repository.update(id, data);
  }

  async deactivate(id) {
    if (!id) {
      const error = new Error('ID de criterio requerido');
      error.status = 400;
      throw error;
    }

    const criterio = await this.repository.findBasicById(id);

    if (!criterio) {
      return null;
    }

    await this.repository.deactivate(id);

    return {
      id: criterio.id,
      nombre: criterio.nombre
    };
  }

  async activate(id) {
    if (!id) {
      const error = new Error('ID de criterio requerido');
      error.status = 400;
      throw error;
    }

    return this.repository.activate(id);
  }
}

module.exports = QuartileCriteriaService;
