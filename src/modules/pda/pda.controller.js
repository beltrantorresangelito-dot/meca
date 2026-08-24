class PdaController {
  constructor(service) {
    this.service = service;
  }

  static json(res, status, payload) {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(payload));
  }

  async listPending(res) {
    try {
      const exists = await this.service.tableExists();

      if (!exists) {
        console.log('⚠️ Tabla pda_cabecera no existe, devolviendo array vacío');
        PdaController.json(res, 200, []);
        return;
      }

      const rows = await this.service.listPending();
      PdaController.json(res, 200, rows);
    } catch (error) {
      console.error('Error en /api/pda/pendientes:', error);
      PdaController.json(res, 200, []);
    }
  }

  async listTracking(res) {
    try {
      const exists = await this.service.tableExists();

      if (!exists) {
        PdaController.json(res, 200, []);
        return;
      }

      const rows = await this.service.listTracking();
      PdaController.json(res, 200, rows);
    } catch (error) {
      console.error('Error en /api/pda/seguimiento:', error);
      PdaController.json(res, 200, []);
    }
  }

  async listHistory(res) {
    try {
      const exists = await this.service.tableExists();

      if (!exists) {
        PdaController.json(res, 200, []);
        return;
      }

      const rows = await this.service.listHistory();
      PdaController.json(res, 200, rows);
    } catch (error) {
      console.error('Error en /api/pda/historial:', error);
      PdaController.json(res, 200, []);
    }
  }

  async getDetail(res, pdaId) {
    try {
      const pda = await this.service.getDetail(pdaId);

      if (!pda) {
        PdaController.json(
          res,
          404,
          { error: 'PDA no encontrado' }
        );
        return;
      }

      PdaController.json(res, 200, pda);
    } catch (error) {
      console.error('Error en /api/pda/:id:', error);

      PdaController.json(
        res,
        error.status || 500,
        { error: error.message }
      );
    }
  }

  async exportRows(res) {
    try {
      const rows = await this.service.exportRows();
      PdaController.json(res, 200, rows);
    } catch (error) {
      console.error('Error en /api/pda/exportar:', error);
      PdaController.json(res, error.status || 500, []);
    }
  }
}

module.exports = PdaController;
