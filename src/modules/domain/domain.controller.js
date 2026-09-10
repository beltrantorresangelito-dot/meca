class DomainController {
  constructor(service) {
    this.service = service;
  }

  static sendJson(res, status, payload) {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(payload));
  }

  static handleError(res, error) {
    const explicitStatus =
      Number(error?.status);

    let status;

    if (
      Number.isInteger(explicitStatus) &&
      explicitStatus >= 400 &&
      explicitStatus <= 599
    ) {
      status = explicitStatus;
    } else {
      switch (error?.code) {
        case 'VALIDATION_ERROR':
          status = 400;
          break;

        case 'NOT_FOUND':
          status = 404;
          break;

        case 'DUPLICATE_ERROR':
        case 'ASSIGNMENT_OVERLAP':
          status = 409;
          break;

        default:
          status = 500;
          break;
      }
    }

    DomainController.sendJson(
      res,
      status,
      {
        error:
          error?.message ||
          'Error interno del servidor',

        ...(error?.code
          ? { code: error.code }
          : {})
      }
    );
  }

  requireAuth(req, res) {
    if (!req.auth) {
      DomainController.sendJson(res, 401, { error: 'Token requerido' });
      return false;
    }
    return true;
  }

  async listBreaks(req, res, query = {}) {
  if (!this.requireAuth(req, res)) {
    return;
  }

  try {
    const incluirInactivos =
      String(
        query.incluirInactivos ?? ''
      ).trim().toLowerCase() === 'true';

    const rows =
      await this.service.listBreaks({
        activeOnly:
          !incluirInactivos
      });

    DomainController.sendJson(
      res,
      200,
      rows
    );

  } catch (error) {
    DomainController.handleError(
      res,
      error
    );
  }
}

  async listCampaigns(req, res, query = {}) {
    if (!this.requireAuth(req, res)) return;

    try {
      const incluirInactivas =
        String(
          query.incluirInactivas ?? ''
        ).toLowerCase() === 'true';

      const rows =
        await this.service.listCampaigns(
          query.quiebreId,
          {
            activeOnly:
              !incluirInactivas
          }
        );

      DomainController.sendJson(
        res,
        200,
        rows
      );
    } catch (error) {
      DomainController.handleError(
        res,
        error
      );
    }
  }

  async listMatrices(req, res, query = {}) {
  if (!this.requireAuth(req, res)) {
    return;
  }

  try {
    const incluirInactivas =
      String(
        query.incluirInactivas ?? ''
      ).trim().toLowerCase() === 'true';

    const rows =
      await this.service.listMatrices(
        query.quiebreId,
        {
          activeOnly:
            !incluirInactivas
        }
      );

    DomainController.sendJson(
      res,
      200,
      rows
    );

  } catch (error) {
    DomainController.handleError(
      res,
      error
    );
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
    const context =
      await this.service.resolveContext({
        campaignId:
          query.campanaId ??
          query.campana_id ??
          null,

        breakId:
          query.quiebreId ??
          query.quiebre_id ??
          null,

        date:
          query.fecha || null
      });

    DomainController.sendJson(
      res,
      200,
      context
    );

  } catch (error) {
    DomainController.handleError(
      res,
      error
    );
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
  async createBreak(req, res, body = {}) {
    if (!this.requireAuth(req, res)) return;

    try {
      const row =
        await this.service.createBreak(body);

      DomainController.sendJson(
        res,
        201,
        row
      );
    } catch (error) {
      DomainController.handleError(
        res,
        error
      );
    }
  }

  async createCampaign(req, res, body = {}) {
    if (!this.requireAuth(req, res)) return;

    try {
      const row =
        await this.service.createCampaign(body);

      DomainController.sendJson(
        res,
        201,
        row
      );
    } catch (error) {
      DomainController.handleError(
        res,
        error
      );
    }
  }


  async updateCampaign(req, res, id, body = {}) {
    if (!this.requireAuth(req, res)) return;

    try {
      const row =
        await this.service.updateCampaign(
          id,
          body
        );

      DomainController.sendJson(
        res,
        200,
        row
      );
    } catch (error) {
      DomainController.handleError(
        res,
        error
      );
    }
  }


  async setCampaignActive(req, res, id, body = {}) {
    if (!this.requireAuth(req, res)) return;

    try {
      const row =
        await this.service.setCampaignActive(
          id,
          body.activa
        );

      DomainController.sendJson(
        res,
        200,
        row
      );
    } catch (error) {
      DomainController.handleError(
        res,
        error
      );
    }
  }

  async updateBreak(req, res, id, body = {}) {
    if (!this.requireAuth(req, res)) return;

    try {
      const row =
        await this.service.updateBreak(
          id,
          body
        );

      DomainController.sendJson(
        res,
        200,
        row
      );
    } catch (error) {
      DomainController.handleError(
        res,
        error
      );
    }
  }

  async createMatrix(req, res, body = {}) {
    if (!this.requireAuth(req, res)) return;

    try {
      const row =
        await this.service.createMatrix(body);

      DomainController.sendJson(
        res,
        201,
        row
      );
    } catch (error) {
      DomainController.handleError(
        res,
        error
      );
    }
  }


  async updateMatrix(req, res, id, body = {}) {
    if (!this.requireAuth(req, res)) return;

    try {
      const row =
        await this.service.updateMatrix(
          id,
          body
        );

      DomainController.sendJson(
        res,
        200,
        row
      );
    } catch (error) {
      DomainController.handleError(
        res,
        error
      );
    }
  }


  async setMatrixActive(req, res, id, body = {}) {
    if (!this.requireAuth(req, res)) return;

    try {
      const row =
        await this.service.setMatrixActive(
          id,
          body.activa
        );

      DomainController.sendJson(
        res,
        200,
        row
      );
    } catch (error) {
      DomainController.handleError(
        res,
        error
      );
    }
  }

  async setBreakActive(req, res, id, body = {}) {
    if (!this.requireAuth(req, res)) return;

    try {
      const row =
        await this.service.setBreakActive(
          id,
          body.activo
        );

      DomainController.sendJson(
        res,
        200,
        row
      );
    } catch (error) {
      DomainController.handleError(
        res,
        error
      );
    }
  }
  async createCampaignMatrixAssignment(
    req,
    res,
    body = {}
  ) {
    if (!this.requireAuth(req, res)) return;

    try {
      const row =
        await this.service
          .createCampaignMatrixAssignment(
            body
          );

      DomainController.sendJson(
        res,
        201,
        row
      );
    } catch (error) {
      DomainController.handleError(
        res,
        error
      );
    }
  }


  async updateCampaignMatrixAssignment(
    req,
    res,
    id,
    body = {}
  ) {
    if (!this.requireAuth(req, res)) return;

    try {
      const row =
        await this.service
          .updateCampaignMatrixAssignment(
            id,
            body
          );

      DomainController.sendJson(
        res,
        200,
        row
      );
    } catch (error) {
      DomainController.handleError(
        res,
        error
      );
    }
  }


  async setCampaignMatrixAssignmentActive(
    req,
    res,
    id,
    body = {}
  ) {
    if (!this.requireAuth(req, res)) return;

    try {
      const row =
        await this.service
          .setCampaignMatrixAssignmentActive(
            id,
            body.activa
          );

      DomainController.sendJson(
        res,
        200,
        row
      );
    } catch (error) {
      DomainController.handleError(
        res,
        error
      );
    }
  }

    async breakMatrixHistory(
    req,
    res,
    query = {}
  ) {
    if (!this.requireAuth(req, res)) return;

    try {
      const rows =
        await this.service
          .getBreakMatrixHistory(
            query.quiebreId ??
            query.quiebre_id
          );

      DomainController.sendJson(
        res,
        200,
        rows
      );

    } catch (error) {
      DomainController.handleError(
        res,
        error
      );
    }
  }


  async createBreakMatrixAssignment(
    req,
    res,
    body = {}
  ) {
    if (!this.requireAuth(req, res)) return;

    try {
      const row =
        await this.service
          .createBreakMatrixAssignment(
            body
          );

      DomainController.sendJson(
        res,
        201,
        row
      );

    } catch (error) {
      DomainController.handleError(
        res,
        error
      );
    }
  }


  async updateBreakMatrixAssignment(
    req,
    res,
    id,
    body = {}
  ) {
    if (!this.requireAuth(req, res)) return;

    try {
      const row =
        await this.service
          .updateBreakMatrixAssignment(
            id,
            body
          );

      DomainController.sendJson(
        res,
        200,
        row
      );

    } catch (error) {
      DomainController.handleError(
        res,
        error
      );
    }
  }


  async setBreakMatrixAssignmentActive(
    req,
    res,
    id,
    body = {}
  ) {
    if (!this.requireAuth(req, res)) return;

    try {
      const row =
        await this.service
          .setBreakMatrixAssignmentActive(
            id,
            body.activa
          );

      DomainController.sendJson(
        res,
        200,
        row
      );

    } catch (error) {
      DomainController.handleError(
        res,
        error
      );
    }
  }
}

module.exports = DomainController;
