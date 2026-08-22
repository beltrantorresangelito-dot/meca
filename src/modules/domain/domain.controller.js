class DomainController {
  constructor(service) {
    this.service = service;
  }

  static sendJson(res, status, payload) {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(payload));
  }

  static handleError(res, error) {
    const statusByCode = {
      VALIDATION_ERROR: 400,
      NOT_FOUND: 404,
      DOMAIN_CONFIGURATION_ERROR: 409
    };

    const status = statusByCode[error.code] || 500;
    DomainController.sendJson(res, status, {
      error: error.message,
      code: error.code || 'INTERNAL_ERROR'
    });
  }

  requireAuth(req, res) {
    if (!req.auth) {
      DomainController.sendJson(res, 401, { error: 'Token requerido' });
      return false;
    }
    return true;
  }

  async listBreaks(req, res) {
    if (!this.requireAuth(req, res)) return;
    try {
      const rows = await this.service.listBreaks({ activeOnly: true });
      DomainController.sendJson(res, 200, rows);
    } catch (error) {
      DomainController.handleError(res, error);
    }
  }

  async listCampaigns(req, res, query = {}) {
    if (!this.requireAuth(req, res)) return;
    try {
      const rows = await this.service.listCampaigns(query.quiebreId, { activeOnly: true });
      DomainController.sendJson(res, 200, rows);
    } catch (error) {
      DomainController.handleError(res, error);
    }
  }

  async listMatrices(req, res, query = {}) {
    if (!this.requireAuth(req, res)) return;
    try {
      const rows = await this.service.listMatrices(query.quiebreId, { activeOnly: true });
      DomainController.sendJson(res, 200, rows);
    } catch (error) {
      DomainController.handleError(res, error);
    }
  }

  async campaignMatrixHistory(req, res, query = {}) {
    if (!this.requireAuth(req, res)) return;
    try {
      const rows = await this.service.getCampaignMatrixHistory(query.campanaId);
      DomainController.sendJson(res, 200, rows);
    } catch (error) {
      DomainController.handleError(res, error);
    }
  }

  async resolveContext(req, res, query = {}) {
    if (!this.requireAuth(req, res)) return;
    try {
      const context = await this.service.resolveContext({
        campaignId: query.campanaId,
        date: query.fecha || null
      });
      DomainController.sendJson(res, 200, context);
    } catch (error) {
      DomainController.handleError(res, error);
    }
  }

  async consistency(req, res) {
    if (!this.requireAuth(req, res)) return;
    try {
      const result = await this.service.validateConsistency();
      DomainController.sendJson(res, result.ok ? 200 : 409, result);
    } catch (error) {
      DomainController.handleError(res, error);
    }
  }
}

module.exports = DomainController;
