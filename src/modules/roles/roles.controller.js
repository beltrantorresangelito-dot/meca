class RolesController {
  constructor(service) {
    this.service = service;
  }

  static json(res, status, payload) {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(payload));
  }

  requireToken(req, res) {
    const token = req.headers['authorization']?.split(' ')[1];

    if (!token) {
      RolesController.json(res, 401, { error: 'Token requerido' });
      return false;
    }

    return true;
  }

  async redirect(req, res) {
    if (!this.requireToken(req, res)) return;

    try {
      const payload = req.auth || {};
      RolesController.json(
        res,
        200,
        await this.service.resolveRedirect(
          payload.rol_codigo || payload.rol || 'AUDITOR'
        )
      );
    } catch (error) {
      console.error('❌ Error en redirect:', error);
      RolesController.json(res, 401, { error: 'Token inválido' });
    }
  }

  async updateRedirect(req, res, id, body = {}) {
    if (!this.requireToken(req, res)) return;

    try {
      RolesController.json(
        res,
        200,
        await this.service.updateRedirect(id, body.redirect_url)
      );
    } catch (error) {
      RolesController.json(
        res,
        error.status || 500,
        { error: error.message }
      );
    }
  }

  async listRoles(req, res) {
    if (!this.requireToken(req, res)) return;

    try {
      const rows = await this.service.listAllRoles();
      console.log(`✅ ${rows.length} roles obtenidos (con redirect_url)`);
      RolesController.json(res, 200, rows);
    } catch (error) {
      console.error('Error obteniendo roles:', error);
      RolesController.json(res, 500, { error: error.message });
    }
  }

  async createRole(req, res, body = {}) {
    if (!this.requireToken(req, res)) return;

    try {
      RolesController.json(res, 201, await this.service.createRole(body));
    } catch (error) {
      RolesController.json(
        res,
        error.status || 500,
        { error: error.message }
      );
    }
  }

  async updateRole(req, res, id, body = {}) {
    if (!this.requireToken(req, res)) return;

    try {
      RolesController.json(res, 200, await this.service.updateRole(id, body));
    } catch (error) {
      RolesController.json(
        res,
        error.status || 500,
        { error: error.message }
      );
    }
  }

  async setActive(req, res, id, body = {}) {
    if (!this.requireToken(req, res)) return;

    try {
      RolesController.json(
        res,
        200,
        await this.service.setRoleActive(id, body.activo)
      );
    } catch (error) {
      RolesController.json(
        res,
        error.status || 500,
        { error: error.message }
      );
    }
  }

  async reactivate(req, res, id) {
    if (!this.requireToken(req, res)) return;

    try {
      RolesController.json(res, 200, await this.service.reactivateRole(id));
    } catch (error) {
      RolesController.json(
        res,
        error.status || 500,
        { error: error.message }
      );
    }
  }

  async deleteRole(req, res, id) {
    if (!this.requireToken(req, res)) return;

    try {
      RolesController.json(res, 200, await this.service.deleteRole(id));
    } catch (error) {
      RolesController.json(
        res,
        error.status || 500,
        { error: error.message }
      );
    }
  }

  async listAllTabs(req, res) {
    if (!this.requireToken(req, res)) return;

    try {
      RolesController.json(res, 200, await this.service.listAllTabs());
    } catch (error) {
      RolesController.json(res, 500, { error: error.message });
    }
  }

  async listVisibleTabs(req, res) {
    if (!this.requireToken(req, res)) return;

    try {
      RolesController.json(
        res,
        200,
        await this.service.listVisibleTabs(req.auth?.id)
      );
    } catch (error) {
      RolesController.json(
        res,
        error.status || 500,
        { error: error.message }
      );
    }
  }

  async listRoleTabs(req, res, roleId) {
    if (!this.requireToken(req, res)) return;

    try {
      RolesController.json(res, 200, await this.service.listRoleTabs(roleId));
    } catch (error) {
      RolesController.json(
        res,
        error.status || 500,
        { error: error.message }
      );
    }
  }

  async replaceRoleTabs(req, res, body = {}) {
    if (!this.requireToken(req, res)) return;

    try {
      RolesController.json(
        res,
        200,
        await this.service.replaceRoleTabs(
          body.rol_id,
          Array.isArray(body.pestanas) ? body.pestanas : []
        )
      );
    } catch (error) {
      RolesController.json(res, 500, { error: error.message });
    }
  }

  async deleteRoleTabs(req, res, roleId) {
    if (!this.requireToken(req, res)) return;

    try {
      RolesController.json(
        res,
        200,
        await this.service.deleteRoleTabs(roleId)
      );
    } catch (error) {
      RolesController.json(
        res,
        error.status || 500,
        { error: error.message }
      );
    }
  }
}

module.exports = RolesController;
