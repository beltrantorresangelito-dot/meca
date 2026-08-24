class VersionsService {
  constructor(repository) {
    this.repository = repository;
  }

  async list(tipo) {
    return this.repository.list(tipo);
  }

  async publish(data) {
    if (!data || typeof data !== 'object') {
      const error = new Error('Versión inválida');
      error.status = 400;
      throw error;
    }

    if (typeof data.contenido_html !== 'string') {
      const error = new Error('contenido_html requerido');
      error.status = 400;
      throw error;
    }

    return this.repository.create(data);
  }

  async activate(id, tipo) {
    if (!id) {
      const error = new Error('ID de versión requerido');
      error.status = 400;
      throw error;
    }

    if (!tipo) {
      const error = new Error('Tipo requerido');
      error.status = 400;
      throw error;
    }

    await this.repository.deactivateByType(tipo);
    return this.repository.activateById(id);
  }

  async delete(id) {
    if (!id) {
      const error = new Error('ID de versión requerido');
      error.status = 400;
      throw error;
    }

    return this.repository.deleteById(id);
  }
}

module.exports = VersionsService;
