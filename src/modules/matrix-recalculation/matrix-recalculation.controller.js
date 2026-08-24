class MatrixRecalculationController {
  constructor(service) {
    this.service = service;
  }

  static json(res, status, payload) {
    res.writeHead(status, {
      'Content-Type': 'application/json'
    });
    res.end(JSON.stringify(payload));
  }

  async recalculate(res) {
    try {
      const result =
        await this.service.recalculate();

      MatrixRecalculationController.json(
        res,
        200,
        result
      );
    } catch (error) {
      console.error(
        '❌ Error en recalcular:',
        error
      );

      MatrixRecalculationController.json(
        res,
        error.status || 500,
        { error: error.message }
      );
    }
  }
}

module.exports = MatrixRecalculationController;
