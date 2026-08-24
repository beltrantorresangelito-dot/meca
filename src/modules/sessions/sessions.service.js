class SessionsService {
  constructor(repository) {
    this.repository = repository;
  }

  async createSession(data) {
    if (!data || typeof data !== 'object') {
      const error = new Error('Datos de sesión inválidos');
      error.status = 400;
      throw error;
    }

    const {
      usuarioId,
      tokenSesion,
      ip,
      dispositivo
    } = data;

    if (!usuarioId || !tokenSesion) {
      const error = new Error('usuarioId y tokenSesion son requeridos');
      error.status = 400;
      throw error;
    }

    return this.repository.upsertSession({
      usuarioId,
      tokenSesion,
      ip,
      dispositivo
    });
  }

  async listUserSessions(usuarioId, options = {}) {
    if (!usuarioId) {
      const error = new Error('ID de usuario requerido');
      error.status = 400;
      throw error;
    }

    return this.repository.listUserSessions(
      usuarioId,
      options
    );
  }

  async closeSession(sessionToken) {
    if (!sessionToken) {
      const error = new Error('Token de sesión requerido');
      error.status = 400;
      throw error;
    }

    return this.repository.closeSession(sessionToken);
  }

  async closeAllForUser(usuarioId) {
    if (!usuarioId) {
      const error = new Error('ID de usuario requerido');
      error.status = 400;
      throw error;
    }

    return this.repository.closeAllForUser(usuarioId);
  }

  async registerLoginHistory(data) {
    if (!data || typeof data !== 'object') {
      const error = new Error('Datos de historial inválidos');
      error.status = 400;
      throw error;
    }

    return this.repository.insertLoginHistory(data);
  }
}

module.exports = SessionsService;
