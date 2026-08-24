class GenericQueryController {
  constructor(service) {
    this.service = service;
  }

  static json(res, status, payload) {
    res.writeHead(status, {
      'Content-Type': 'application/json'
    });
    res.end(JSON.stringify(payload));
  }

  async execute(res, query) {
    try {
      const result =
        await this.service.execute(query);

      GenericQueryController.json(
        res,
        200,
        result
      );
    } catch (error) {
      console.error(
        '[API /api/query] Error:',
        error.message
      );

      GenericQueryController.json(
        res,
        error.status || 500,
        {
          error: error.message,
          code: error.code || 'ERROR',
          details: error.detail || '',
          hint: error.hint || ''
        }
      );
    }
  }
}

module.exports = GenericQueryController;
