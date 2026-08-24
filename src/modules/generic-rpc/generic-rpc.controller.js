class GenericRpcController {
  constructor(service) {
    this.service = service;
  }

  static json(res, status, payload) {
    res.writeHead(status, {
      'Content-Type': 'application/json'
    });

    res.end(
      JSON.stringify(payload)
    );
  }

  async execute(
    res,
    functionName,
    params
  ) {
    try {
      const result =
        await this.service.execute(
          functionName,
          params
        );

      GenericRpcController.json(
        res,
        200,
        result.payload
      );
    } catch (error) {
      console.error(
        `[API /api/rpc/${functionName}] Error:`,
        error.message
      );

      GenericRpcController.json(
        res,
        500,
        {
          error: error.message,
          code: error.code || 'ERROR'
        }
      );
    }
  }
}

module.exports = GenericRpcController;
