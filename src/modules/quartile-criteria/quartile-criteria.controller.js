class QuartileCriteriaController {
  constructor(service) {
    this.service = service;
  }

  static json(res, status, payload) {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(payload));
  }

  async listAll(res) {
    try {
      const rows = await this.service.listAll();
      QuartileCriteriaController.json(
        res,
        200,
        { success: true, data: rows }
      );
    } catch (error) {
      console.error('Error en /api/criterios-cuartiles:', error);
      QuartileCriteriaController.json(
        res,
        error.status || 500,
        { success: false, error: error.message }
      );
    }
  }

  async listActive(res) {
    try {
      const rows = await this.service.listActive();
      QuartileCriteriaController.json(
        res,
        200,
        { success: true, data: rows }
      );
    } catch (error) {
      console.error('Error en /api/criterios-cuartiles/activos:', error);
      QuartileCriteriaController.json(
        res,
        error.status || 500,
        { success: false, error: error.message }
      );
    }
  }

  async create(res, data) {
    try {
      const criterio = await this.service.create(data);

      console.log(
        `✅ Criterio creado: ${data.nombre} (${data.cuartil})`
      );

      QuartileCriteriaController.json(
        res,
        201,
        { success: true, data: criterio }
      );
    } catch (error) {
      console.error('❌ Error creando criterio:', error);
      QuartileCriteriaController.json(
        res,
        error.status || 500,
        { success: false, error: error.message }
      );
    }
  }

  async update(res, id, data) {
    try {
      const criterio = await this.service.update(id, data);

      if (!criterio) {
        QuartileCriteriaController.json(
          res,
          404,
          { success: false, error: 'Criterio no encontrado' }
        );
        return;
      }

      console.log(
        `✅ Criterio actualizado: ${data.nombre} (${data.cuartil})`
      );

      QuartileCriteriaController.json(
        res,
        200,
        { success: true, data: criterio }
      );
    } catch (error) {
      console.error('❌ Error actualizando criterio:', error);
      QuartileCriteriaController.json(
        res,
        error.status || 500,
        { success: false, error: error.message }
      );
    }
  }

  async deactivate(res, id) {
    try {
      const criterio = await this.service.deactivate(id);

      if (!criterio) {
        QuartileCriteriaController.json(
          res,
          404,
          { success: false, error: 'Criterio no encontrado' }
        );
        return;
      }

      console.log(
        `✅ Criterio "${criterio.nombre}" desactivado (ID: ${id})`
      );

      QuartileCriteriaController.json(
        res,
        200,
        {
          success: true,
          message: `Criterio "${criterio.nombre}" desactivado correctamente`
        }
      );
    } catch (error) {
      console.error('❌ Error desactivando criterio:', error);
      QuartileCriteriaController.json(
        res,
        error.status || 500,
        { success: false, error: error.message }
      );
    }
  }

  async activate(res, id) {
    try {
      const criterio = await this.service.activate(id);

      if (!criterio) {
        QuartileCriteriaController.json(
          res,
          404,
          { success: false, error: 'Criterio no encontrado' }
        );
        return;
      }

      QuartileCriteriaController.json(
        res,
        200,
        { success: true, data: criterio }
      );
    } catch (error) {
      console.error('Error activando criterio:', error);
      QuartileCriteriaController.json(
        res,
        error.status || 500,
        { success: false, error: error.message }
      );
    }
  }
}

module.exports = QuartileCriteriaController;
