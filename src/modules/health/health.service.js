class HealthService {
  constructor(repository) {
    this.repository = repository;
  }

  async getStatus() {
    let database = 'desconectado';

    try {
      const now =
        await this.repository.now();

      database =
        'conectado (' +
        now.toISOString() +
        ')';
    } catch (error) {
      database =
        'error: ' +
        error.message;
    }

    return {
      status: 'ok',
      message:
        'Servidor MECA funcionando (PostgreSQL local)',
      version: '2.0.0',
      database,
      timestamp:
        new Date().toISOString()
    };
  }
}

module.exports = HealthService;
