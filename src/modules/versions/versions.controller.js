class VersionsController {
  constructor(service) {
    this.service = service;
  }

  static json(res, status, payload) {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(payload));
  }

  async list(res, tipo) {
    try {
      const rows = await this.service.list(tipo);
      VersionsController.json(res, 200, rows);
    } catch (error) {
      console.error('Error obteniendo versiones:', error);
      VersionsController.json(
        res,
        error.status || 500,
        { error: error.message }
      );
    }
  }

  async publish(res, data) {
    try {
      const id = await this.service.publish(data);

      console.log(`✅ Versión ${data.version} publicada`);

      VersionsController.json(
        res,
        201,
        { success: true, id }
      );
    } catch (error) {
      console.error('Error publicando versión:', error);
      VersionsController.json(
        res,
        error.status || 500,
        { error: error.message }
      );
    }
  }

  async activate(res, id, tipo) {
    try {
      const activatedId = await this.service.activate(id, tipo);

      if (!activatedId) {
        VersionsController.json(
          res,
          404,
          { error: 'Versión no encontrada' }
        );
        return;
      }

      console.log(`✅ Versión ID ${id} activada`);

      VersionsController.json(
        res,
        200,
        { success: true }
      );
    } catch (error) {
      console.error('Error activando versión:', error);
      VersionsController.json(
        res,
        error.status || 500,
        { error: error.message }
      );
    }
  }

  async delete(res, id) {
    try {
      const deletedId = await this.service.delete(id);

      if (!deletedId) {
        VersionsController.json(
          res,
          404,
          { error: 'Versión no encontrada' }
        );
        return;
      }

      console.log(`✅ Versión ID ${id} eliminada`);

      VersionsController.json(
        res,
        200,
        { success: true }
      );
    } catch (error) {
      console.error('Error eliminando versión:', error);
      VersionsController.json(
        res,
        error.status || 500,
        { error: error.message }
      );
    }
  }
}

module.exports = VersionsController;
