class RolesService {
  constructor(repository) {
    this.repository = repository;
  }

  static error(message, status = 400) {
    const error = new Error(message);
    error.status = status;
    return error;
  }

  async resolveRedirect(roleCode) {
    const rolCodigo = roleCode || 'AUDITOR';
    const rol = await this.repository.findActiveRoleByCode(rolCodigo);

    let redirectUrl = '/login';
    let rolNombre = rolCodigo;

    if (rol) {
      rolNombre = rol.nombre || rolCodigo;

      if (rol.redirect_url) {
        redirectUrl = rol.redirect_url;
      } else {
        redirectUrl =
          rolCodigo === 'AUDITOR'
            ? '/auditor'
            : '/supervisor';
      }
    } else {
      redirectUrl =
        rolCodigo === 'AUDITOR'
          ? '/auditor'
          : '/supervisor';
    }

    return {
      redirectUrl,
      rol: rolCodigo,
      rolNombre
    };
  }

  async updateRedirect(id, redirectUrl) {
    if (!redirectUrl) {
      throw RolesService.error(
        'redirect_url es requerido',
        400
      );
    }

    if (!redirectUrl.startsWith('/')) {
      throw RolesService.error(
        'redirect_url debe comenzar con /',
        400
      );
    }

    const rol = await this.repository.updateRedirect(
      id,
      redirectUrl
    );

    if (!rol) {
      throw RolesService.error(
        'Rol no encontrado',
        404
      );
    }

    return {
      success: true,
      rol
    };
  }

  async listAllRoles() {
    return this.repository.listAllRoles();
  }

  async createRole(input = {}) {
    const {
      codigo,
      nombre,
      activo
    } = input;

    if (!codigo || !nombre) {
      throw RolesService.error(
        'Código y nombre son requeridos',
        400
      );
    }

    if (
      await this.repository.roleExistsByCode(codigo)
    ) {
      throw RolesService.error(
        'El código de rol ya existe',
        400
      );
    }

    const rol = await this.repository.createRole({
      codigo,
      nombre,
      activo
    });

    return {
      success: true,
      rol
    };
  }

  async updateRole(id, input = {}) {
    const {
      codigo,
      nombre,
      activo,
      pestanas
    } = input;

    if (!codigo || !nombre) {
      throw RolesService.error(
        'Código y nombre son requeridos',
        400
      );
    }

    if (!(await this.repository.roleExists(id))) {
      throw RolesService.error(
        'Rol no encontrado',
        404
      );
    }

    const codigoNormalizado =
      codigo.toUpperCase();

    const duplicate =
      await this.repository.findRoleByCodeExcludingId(
        codigoNormalizado,
        id
      );

    if (duplicate) {
      throw RolesService.error(
        `Ya existe un rol con el código "${codigo}"`,
        400
      );
    }

    const rol =
      await this.repository.updateRole(id, {
        codigo: codigoNormalizado,
        nombre,
        activo: activo !== false
      });

    if (Array.isArray(pestanas)) {
      await this.repository.deleteRolePermissions(id);

      if (pestanas.length > 0) {
        await this.repository.insertRolePermissions(
          id,
          pestanas
        );
      }
    }

    return {
      success: true,
      rol,
      message: 'Rol actualizado correctamente'
    };
  }

  async setRoleActive(id, activo) {
    const rol = await this.repository.findRoleById(id);

    if (!rol) {
      throw RolesService.error(
        'Rol no encontrado',
        404
      );
    }

    const rolActualizado =
      await this.repository.setRoleActive(
        id,
        activo
      );

    const estadoTexto =
      activo ? 'reactivado' : 'desactivado';

    return {
      success: true,
      rol: rolActualizado,
      message:
        `Rol "${rol.nombre}" ${estadoTexto} correctamente`
    };
  }

  async reactivateRole(id) {
    const rol = await this.repository.findRoleById(id);

    if (!rol) {
      throw RolesService.error(
        'Rol no encontrado',
        404
      );
    }

    if (rol.activo === true) {
      throw RolesService.error(
        `El rol "${rol.nombre}" ya está activo`,
        400
      );
    }

    const rolActualizado =
      await this.repository.reactivateRole(id);

    return {
      success: true,
      rol: rolActualizado,
      message:
        `Rol "${rol.nombre}" reactivado correctamente`
    };
  }

  async deleteRole(id) {
    const rol = await this.repository.findRoleById(id);

    if (!rol) {
      throw RolesService.error(
        'Rol no encontrado',
        404
      );
    }

    const cantidadUsuarios =
      await this.repository.countUsersByRole(id);

    if (cantidadUsuarios > 0) {
      throw RolesService.error(
        `No se puede eliminar el rol "${rol.nombre}" porque tiene ${cantidadUsuarios} usuario(s) asignado(s)`,
        400
      );
    }

    await this.repository.deleteRolePermissions(id);
    await this.repository.deleteRole(id);

    return {
      success: true,
      message: `Rol "${rol.nombre}" eliminado correctamente`
    };
  }

  async listAllTabs() {
    return this.repository.listAllTabs();
  }

  async listVisibleTabs(userId) {
    const roleId = await this.repository.getActiveUserRole(userId);

    if (!roleId) {
      throw RolesService.error(
        'Usuario no encontrado o inactivo',
        401
      );
    }

    return this.repository.listVisibleTabs(roleId);
  }

  async listRoleTabs(roleId) {
    return this.repository.listRoleTabs(roleId);
  }

  async replaceRoleTabs(roleId, tabs = []) {
    await this.repository.deleteRolePermissions(roleId);

    if (tabs.length > 0) {
      await this.repository.insertRolePermissions(
        roleId,
        tabs,
        { ignoreConflicts: true }
      );
    }

    return {
      success: true,
      insertados: tabs.length
    };
  }

  async deleteRoleTabs(roleId) {
    const eliminados =
      await this.repository.deleteRolePermissions(roleId);

    return {
      success: true,
      eliminados
    };
  }
}

module.exports = RolesService;
