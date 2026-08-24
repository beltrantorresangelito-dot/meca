class RequestsController {
  constructor(service) { this.service = service; }

  static json(res, status, payload) {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(payload));
  }

  async listByUser(res, userId) {
    try {
      const rows = await this.service.listByUser(userId);
      RequestsController.json(res, 200, rows);
    } catch (error) {
      console.error('Error en solicitudes/usuario:', error);
      RequestsController.json(res, error.status || 500, { error: error.message });
    }
  }

  async listAll(res) {
    try {
      const rows = await this.service.listAll();
      RequestsController.json(res, 200, rows);
    } catch (error) {
      console.error('Error en solicitudes:', error);
      RequestsController.json(res, error.status || 500, { error: error.message });
    }
  }

  async create(res, data) {
    try {
      const solicitud = await this.service.create(data);
      RequestsController.json(res, 201, { success: true, solicitud });
    } catch (error) {
      console.error('Error creando solicitud:', error);
      RequestsController.json(res, error.status || 500, { error: error.message });
    }
  }

  async getById(res, id) {
    try {
      const solicitud = await this.service.getById(id);
      if (!solicitud) {
        RequestsController.json(res, 404, { error: 'Solicitud no encontrada' });
        return;
      }
      RequestsController.json(res, 200, solicitud);
    } catch (error) {
      console.error('Error obteniendo solicitud:', error);
      RequestsController.json(res, error.status || 500, { error: error.message });
    }
  }

  async updateStatus(res, id, data) {
    try {
      const rowCount = await this.service.updateStatus(id, data);
      if (rowCount === 0) {
        RequestsController.json(res, 404, { error: 'Solicitud no encontrada' });
        return;
      }
      console.log(`✅ Solicitud ${id} actualizada a estado: ${data.estado}`);
      RequestsController.json(res, 200, { success: true });
    } catch (error) {
      console.error('Error:', error);
      RequestsController.json(res, error.status || 500, { error: error.message });
    }
  }
}
module.exports = RequestsController;
