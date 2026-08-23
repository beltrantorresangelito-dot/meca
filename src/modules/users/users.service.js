class UsersService {
  constructor(repository, security = {}) {
    this.repository = repository;
    this.hashPassword = security.hashPassword;
    this.verifyPassword = security.verifyPassword;
    this.signToken = security.signToken;
  }

  static error(message, status = 400) {
    const error = new Error(message);
    error.status = status;
    return error;
  }

  async login(usuario, contrasena) {
    const usuarioData =
      await this.repository.findLoginUserByUsername(usuario);

    if (!usuarioData) {
      return { success: false, error: 'Usuario no encontrado' };
    }

    if (!usuarioData.usuario_activo) {
      return { success: false, error: 'Usuario desactivado' };
    }

    if (usuarioData.rol_activo === false) {
      return {
        success: false,
        error: 'El rol asignado a este usuario está desactivado'
      };
    }

    if (!usuarioData.rol_id) {
      return {
        success: false,
        error: 'Usuario sin rol asignado'
      };
    }

    const passwordCheck = await this.verifyPassword(
      contrasena,
      usuarioData.contrasena
    );

    if (!passwordCheck.valid) {
      return {
        success: false,
        error: 'Contraseña incorrecta'
      };
    }

    if (passwordCheck.needsRehash) {
      const migratedHash = await this.hashPassword(contrasena);

      await this.repository.updatePasswordHash(
        usuarioData.id,
        migratedHash
      );
    }

    if (usuarioData.primer_login === true) {
      const passwordChangeToken = this.signToken(
        {
          id: usuarioData.id,
          usuario: usuarioData.usuario
        },
        {
          purpose: 'password_change',
          expiresInSeconds: 10 * 60
        }
      );

      return {
        success: false,
        requiereCambioPassword: true,
        passwordChangeToken,
        usuario: {
          id: usuarioData.id,
          usuario: usuarioData.usuario,
          nombre_completo: usuarioData.nombre_completo,
          rol_id: usuarioData.rol_id,
          rol_codigo: usuarioData.rol_codigo,
          rol_nombre: usuarioData.rol_nombre
        }
      };
    }

    const token = this.signToken({
      id: usuarioData.id,
      usuario: usuarioData.usuario,
      nombre_completo: usuarioData.nombre_completo,
      rol_id: usuarioData.rol_id,
      rol_codigo: usuarioData.rol_codigo,
      rol_nombre: usuarioData.rol_nombre
    });

    this.repository.touchLastLogin(usuarioData.id).catch(() => {});

    return {
      success: true,
      token,
      usuario: {
        id: usuarioData.id,
        usuario: usuarioData.usuario,
        nombre_completo: usuarioData.nombre_completo,
        rol_id: usuarioData.rol_id,
        rol: usuarioData.rol_codigo,
        rol_codigo: usuarioData.rol_codigo,
        rol_nombre: usuarioData.rol_nombre
      }
    };
  }

  async changePassword({ usuarioId, nuevaPassword, auth }) {
    if (
      !auth ||
      auth.purpose !== 'password_change' ||
      Number(auth.id) !== Number(usuarioId)
    ) {
      throw UsersService.error(
        'Cambio de contraseña no autorizado',
        403
      );
    }

    const hashNuevo = await this.hashPassword(nuevaPassword);

    await this.repository.updatePasswordHash(
      usuarioId,
      hashNuevo,
      { clearFirstLogin: true }
    );

    return {
      success: true,
      message: 'Contrasena actualizada'
    };
  }

  async listLegacyAuditors() {
    return this.repository.listLegacyAuditors();
  }

  async listActiveAuditors() {
    return this.repository.listActiveAuditors();
  }

  async listUsers() {
    return this.repository.listUsers();
  }

  async createUser(input = {}) {
    const {
      usuario,
      nombre_completo,
      contrasena,
      rol_id,
      activo
    } = input;

    if (!usuario || !nombre_completo || !contrasena || !rol_id) {
      throw UsersService.error('Faltan campos requeridos', 400);
    }

    if (await this.repository.userExistsByUsername(usuario)) {
      throw UsersService.error('El usuario ya existe', 400);
    }

    if (!(await this.repository.roleExists(rol_id))) {
      throw UsersService.error(
        'El rol seleccionado no existe',
        400
      );
    }

    const passwordHash =
      await this.hashPassword(contrasena);

    const nuevoId =
      await this.repository.nextUserId();

    const nuevoUsuario =
      await this.repository.insertUser({
        id: nuevoId,
        usuario,
        nombreCompleto: nombre_completo,
        passwordHash,
        rolId: rol_id,
        activo
      });

    return {
      success: true,
      usuario: nuevoUsuario
    };
  }

  async deleteUser(id) {
    const parsedId = Number(id);

    if (!Number.isInteger(parsedId) || parsedId <= 0) {
      throw UsersService.error(
        'ID de usuario inválido',
        400
      );
    }

    if (!(await this.repository.userExistsById(parsedId))) {
      throw UsersService.error(
        'Usuario no encontrado',
        404
      );
    }

    await this.repository.deleteUser(parsedId);

    return {
      success: true,
      message: 'Usuario eliminado'
    };
  }

  async getUserById(id) {
    const parsedId = Number(id);

    if (!Number.isInteger(parsedId) || parsedId <= 0) {
      throw UsersService.error(
        'ID de usuario inválido',
        400
      );
    }

    const usuario =
      await this.repository.getUserById(parsedId);

    if (!usuario) {
      throw UsersService.error(
        'Usuario no encontrado',
        404
      );
    }

    return usuario;
  }

  async updateUser(id, data = {}) {
    const parsedId = Number(id);

    if (!Number.isInteger(parsedId) || parsedId <= 0) {
      throw UsersService.error(
        'ID de usuario inválido',
        400
      );
    }

    const {
      usuario,
      nombre_completo,
      rol_id,
      activo,
      contrasena
    } = data;

    if (rol_id !== undefined) {
      const rolExiste =
        await this.repository.roleExists(rol_id);

      if (!rolExiste) {
        throw UsersService.error(
          'El rol seleccionado no existe',
          400
        );
      }
    }

    let passwordHash;

    if (contrasena) {
      passwordHash =
        await this.hashPassword(contrasena);
    }

    const updated =
      await this.repository.updateUser(parsedId, {
        usuario,
        nombre_completo,
        rol_id,
        activo,
        passwordHash
      });

    if (updated === 0) {
      throw UsersService.error(
        'Usuario no encontrado',
        404
      );
    }

    return {
      success: true,
      message: 'Usuario actualizado correctamente'
    };
  }

  async updateUserPassword(id, password) {
    const parsedId = Number(id);

    if (!Number.isInteger(parsedId) || parsedId <= 0) {
      throw UsersService.error(
        'ID de usuario inválido',
        400
      );
    }

    if (!password) {
      throw UsersService.error(
        'La contraseña es requerida',
        400
      );
    }

    const passwordHash =
      await this.hashPassword(password);

    const updated =
      await this.repository.updatePasswordHash(
        parsedId,
        passwordHash
      );

    if (updated === 0) {
      throw UsersService.error(
        'Usuario no encontrado',
        404
      );
    }

    return {
      success: true,
      message: 'Contraseña actualizada correctamente'
    };
  }

  async listUsersForExport() {
    return this.repository.listUsersForExport();
  }
}

module.exports = UsersService;
