const DomainRepository = require('./domain.repository');

class DomainService {
  constructor(repository = new DomainRepository()) { this.repository = repository; }

  static parsePositiveId(value, fieldName) {
    const parsed = Number(value);
    if (!Number.isInteger(parsed) || parsed <= 0) {
      const error = new Error(`${fieldName} debe ser un entero positivo`);
      error.code = 'VALIDATION_ERROR';
      throw error;
    }
    return parsed;
  }

  static normalizeDate(value) {
    if (value === null || value === undefined || value === '') return null;
    const text = String(value);
    if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
      const error = new Error('fecha debe tener formato YYYY-MM-DD');
      error.code = 'VALIDATION_ERROR';
      throw error;
    }
    return text;
  }

  async listBreaks(options = {}) {
    return this.repository.listBreaks(options);
  }

  async getBreak(id) {
    const breakId = DomainService.parsePositiveId(id, 'quiebreId');
    const item = await this.repository.getBreakById(breakId);
    if (!item) {
      const error = new Error(`Quiebre ${breakId} no encontrado`);
      error.code = 'NOT_FOUND';
      throw error;
    }
    return item;
  }

  async listCampaigns(breakId, options = {}) {
    const id = DomainService.parsePositiveId(breakId, 'quiebreId');
    return this.repository.listCampaignsByBreak(id, options);
  }

  async listMatrices(breakId, options = {}) {
    const id = DomainService.parsePositiveId(breakId, 'quiebreId');
    return this.repository.listMatricesByBreak(id, options);
  }

  async getCampaignMatrixHistory(campaignId) {
    const id = DomainService.parsePositiveId(campaignId, 'campanaId');
    return this.repository.listCampaignMatrixAssignments(id);
  }

  async resolveContext({ campaignId, date = null }) {
    const id = DomainService.parsePositiveId(campaignId, 'campanaId');
    const normalizedDate = DomainService.normalizeDate(date);
    const rows = await this.repository.resolveEvaluationContext(id, normalizedDate);

    if (rows.length !== 1) {
      const error = new Error(
        `El contexto de evaluación para campaña ${id} esperaba 1 resultado y obtuvo ${rows.length}`
      );
      error.code = 'DOMAIN_CONFIGURATION_ERROR';
      throw error;
    }

    return rows[0];
  }

  async validateConsistency() {
    const checks = await this.repository.getDomainConsistency();
    const violations = Object.entries(checks)
      .filter(([, value]) => Number(value) !== 0)
      .map(([check, value]) => ({ check, count: Number(value) }));

    return {
      ok: violations.length === 0,
      checks,
      violations
    };
  }
}

module.exports = DomainService;
