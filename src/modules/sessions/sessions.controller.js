class SessionsController {
  constructor(service) {
    this.service = service;
  }

  static json(res, status, payload) {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(payload));
  }

  async createSession(res, data) {
    try {
      await this.service.createSession(data);

      SessionsController.json(
        res,
        200,
        { success: true }
      );
    } catch (error) {
      console.error('Error creando sesión:', error);

      SessionsController.json(
        res,
        error.status || 500,
        { success: false, error: error.message }
      );
    }
  }

  async listUserSessions(res, usuarioId, options = {}) {
    try {
      const rows = await this.service.listUserSessions(
        usuarioId,
        options
      );

      console.log(
        `✅ ${rows.length} sesiones encontradas para usuario ${usuarioId}`
      );

      SessionsController.json(res, 200, rows);
    } catch (error) {
      console.error('Error obteniendo sesiones:', error);

      SessionsController.json(
        res,
        error.status || 500,
        { error: error.message }
      );
    }
  }

  async closeSession(res, sessionToken) {
    try {
      const afectadas =
        await this.service.closeSession(sessionToken);

      console.log(
        `✅ Sesión cerrada: ${afectadas} afectadas`
      );

      SessionsController.json(
        res,
        200,
        { success: true, afectadas }
      );
    } catch (error) {
      console.error('Error cerrando sesión:', error);

      SessionsController.json(
        res,
        error.status || 500,
        { success: false, error: error.message }
      );
    }
  }

  async closeAllForUser(res, usuarioId) {
    try {
      const cerradas =
        await this.service.closeAllForUser(usuarioId);

      console.log(
        `✅ Cerradas ${cerradas} sesiones para usuario ${usuarioId}`
      );

      SessionsController.json(
        res,
        200,
        { success: true, cerradas }
      );
    } catch (error) {
      console.error(
        'Error cerrando todas las sesiones:',
        error
      );

      SessionsController.json(
        res,
        error.status || 500,
        { success: false, error: error.message }
      );
    }
  }

  async registerLoginHistory(res, data) {
    try {
      await this.service.registerLoginHistory(data);

      SessionsController.json(
        res,
        200,
        { success: true }
      );
    } catch (error) {
      console.error(
        'Error registrando historial login:',
        error
      );

      // Contrato legacy deliberado:
      // un fallo en historial-login no debe romper el login.
      SessionsController.json(
        res,
        200,
        { success: false, error: error.message }
      );
    }
  }
}

module.exports = SessionsController;
