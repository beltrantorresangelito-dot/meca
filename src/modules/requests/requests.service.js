class RequestsService {
  constructor(repository) {
    this.repository = repository;
  }

  async listByUser(userId) {
    if (!userId) {
      const error = new Error('ID de usuario requerido');
      error.status = 400;
      throw error;
    }

    return this.repository.listByUser(userId);
  }

  async listAll() {
    return this.repository.listAll();
  }

  async create(data) {
    if (!data || typeof data !== 'object') {
      const error = new Error('Solicitud inválida');
      error.status = 400;
      throw error;
    }

    return this.repository.createDynamic(data);
  }

  async getById(id) {
    if (!id) {
      const error = new Error('ID de solicitud requerido');
      error.status = 400;
      throw error;
    }

    return this.repository.findById(id);
  }

  async updateStatus(id, data) {
    if (!id) {
      const error = new Error('ID de solicitud requerido');
      error.status = 400;
      throw error;
    }

    if (!data || typeof data !== 'object') {
      const error = new Error('Datos de actualización inválidos');
      error.status = 400;
      throw error;
    }

    return this.repository.updateStatus(id, data);
  }
}

module.exports = RequestsService;
