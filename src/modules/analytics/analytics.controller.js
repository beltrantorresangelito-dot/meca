class AnalyticsController {
  constructor(service) {
    if (!service) {
      throw new Error(
        'AnalyticsController requiere service'
      );
    }

    this.service = service;
  }

  async getPopulation(query = {}) {
    return this.service.getPopulation(query);
  }
  async getExecutiveSummary(query = {}) {
    return this.service.getExecutiveSummary(query);
  }
  async getFilters(query = {}) {
    return this.service.getFilters(query);
  }
  async getEvolution(query = {}) {
    return this.service.getEvolution(query);
  }

  async getDiagnostic(query = {}) {
      return this.service.getDiagnostic(query);
  }
  async getConcentration(query = {}) {
      return this.service.getConcentration(query);
  }
  async getFindingDetail(query = {}) {
    return this.service.getFindingDetail(
      query
    );
  }

  async getIntervention(
    query = {}
  ) {
    return this.service
      .getIntervention(query);
  }
}

module.exports = AnalyticsController;