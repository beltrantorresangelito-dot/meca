class HealthController {
  constructor(service) {
    this.service = service;
  }

  async get(res) {
    const result =
      await this.service.getStatus();

    res.writeHead(200, {
      'Content-Type': 'application/json'
    });

    res.end(
      JSON.stringify(result)
    );
  }
}

module.exports = HealthController;
