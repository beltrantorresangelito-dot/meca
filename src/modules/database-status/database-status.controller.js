class DatabaseStatusController {
  constructor(service) {
    this.service = service;
  }

  static json(res, status, payload) {
    res.writeHead(status, {
      'Content-Type': 'application/json'
    });
    res.end(JSON.stringify(payload));
  }

  async getStatus(res) {
    try {
      const status = await this.service.getStatus();

      console.log(
        `✅ BD Size: ${status.totalSizeFormatted} | ` +
        `Total registros: ${status.totalRows.toLocaleString()} | ` +
        `Tablas: ${status.totalTables}`
      );

      DatabaseStatusController.json(
        res,
        200,
        status
      );
    } catch (error) {
      console.error(
        '❌ Error en /api/estado-bd:',
        error
      );

      DatabaseStatusController.json(
        res,
        error.status || 500,
        { error: error.message }
      );
    }
  }

  async getTableSizes(res) {
    try {
      const tablas =
        await this.service.getTableSizes();

      DatabaseStatusController.json(
        res,
        200,
        tablas
      );
    } catch (error) {
      console.error('Error:', error);

      // Contrato legacy preservado.
      DatabaseStatusController.json(
        res,
        error.status || 500,
        []
      );
    }
  }
}

module.exports = DatabaseStatusController;
