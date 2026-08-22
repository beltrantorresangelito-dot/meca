const DomainRepository = require('./legacy-matrix.repository');

class LegacyMatrixService {
  constructor(repository = new DomainRepository()) { this.repository = repository; }
  async getActiveVersion() { return this.repository.getLegacyActiveMatrixVersion(); }
}
module.exports = LegacyMatrixService;
