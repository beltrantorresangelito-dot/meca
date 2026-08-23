class UsersController {
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
      UsersController.json(res, 401, { error: 'Token requerido' });
      return false;
    }

    return true;
  }

  async login(req, res, body = {}) {
    try {
      const result = await this.service.login(
        body.usuario,
        body.contrasena
      );

      UsersController.json(res, 200, result);
    } catch (error) {
      console.error('Error en login:', error);
      UsersController.json(
        res,
        500,
        { success: false, error: error.message }
      );
    }
  }

  async verify(req, res) {
    if (!req.auth) {
      UsersController.json(
        res,
        401,
        { valid: false, error: 'Token requerido' }
      );
      return;
    }

    UsersController.json(
      res,
      200,
      { valid: true, usuario: req.auth }
    );
  }

  async changePassword(req, res, body = {}) {
    try {
      const result = await this.service.changePassword({
        usuarioId: body.usuarioId,
        nuevaPassword: body.nuevaPassword,
        auth: req.auth
      });

      UsersController.json(res, 200, result);
    } catch (error) {
      console.error('Error cambiando password:', error);
      UsersController.json(
        res,
        error.status || 500,
        { success: false, error: error.message }
      );
    }
  }

  async listLegacyAuditors(req, res) {
    try {
      UsersController.json(
        res,
        200,
        await this.service.listLegacyAuditors()
      );
    } catch (error) {
      console.error('Error en auditores:', error);
      UsersController.json(res, 500, { error: error.message });
    }
  }

  async listActiveAuditors(req, res) {
    if (!this.requireToken(req, res)) return;

    try {
      const rows = await this.service.listActiveAuditors();

      console.log(`✅ ${rows.length} auditores activos encontrados`);

      UsersController.json(res, 200, rows);
    } catch (error) {
      console.error('❌ Error en auditores-activos:', error);
      UsersController.json(res, 500, { error: error.message });
    }
  }

  async listUsers(req, res) {
    if (!this.requireToken(req, res)) return;

    try {
      UsersController.json(
        res,
        200,
        await this.service.listUsers()
      );
    } catch (error) {
      console.error('Error en /api/usuarios:', error);
      UsersController.json(res, 500, { error: error.message });
    }
  }

  async createUser(req, res, body = {}) {
    if (!this.requireToken(req, res)) return;

    try {
      console.log('📝 Creando usuario:', {
        usuario: body.usuario,
        nombre_completo: body.nombre_completo,
        rol_id: body.rol_id,
        activo: body.activo
      });

      const result = await this.service.createUser(body);

      UsersController.json(res, 201, result);
    } catch (error) {
      console.error('❌ Error creando usuario:', error);
      UsersController.json(
        res,
        error.status || 500,
        { error: error.message }
      );
    }
  }

  async deleteUser(req, res, id) {
    if (!this.requireToken(req, res)) return;

    try {
      const result = await this.service.deleteUser(id);

      console.log(`✅ Usuario ID ${id} eliminado`);

      UsersController.json(res, 200, result);
    } catch (error) {
      console.error('Error eliminando usuario:', error);
      UsersController.json(
        res,
        error.status || 500,
        { error: error.message }
      );
    }
  }

  async exportUsers(req, res) {
    if (!this.requireToken(req, res)) return;

    try {
      const usuarios = await this.service.listUsersForExport();

      const headers = [
        'ID',
        'Usuario',
        'Nombre Completo',
        'Estado',
        'Rol',
        'Fecha Registro',
        'Último Login'
      ];

      const csvRows = [headers.join(',')];

      for (const user of usuarios) {
        const values = headers.map(header => {
          let value = '';

          switch (header) {
            case 'ID': value = user.id; break;
            case 'Usuario': value = user.usuario; break;
            case 'Nombre Completo': value = user.nombre_completo || ''; break;
            case 'Estado': value = user.estado; break;
            case 'Rol': value = user.rol || ''; break;
            case 'Fecha Registro': value = user.fecha_registro || ''; break;
            case 'Último Login': value = user.ultimo_login || ''; break;
          }

          if (typeof value === 'string') {
            value = value.replace(/"/g, '""');
          }

          return `"${value}"`;
        }).join(',');

        csvRows.push(values);
      }

      const csvContent = '\uFEFF' + csvRows.join('\n');

      res.writeHead(200, {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition':
          `attachment; filename="usuarios_${new Date().toISOString().slice(0, 10)}.csv"`
      });

      res.end(csvContent);
    } catch (error) {
      console.error('Error exportando usuarios:', error);
      UsersController.json(res, 500, { error: error.message });
    }
  }

  async updateUserPassword(req, res, id, body = {}) {
    if (!this.requireToken(req, res)) return;

    try {
      const result = await this.service.updateUserPassword(
        id,
        body.password
      );

      UsersController.json(res, 200, result);
    } catch (error) {
      console.error('Error actualizando contraseña:', error);
      UsersController.json(
        res,
        error.status || 500,
        { error: error.message }
      );
    }
  }

  async getUserById(req, res, id) {
    if (!this.requireToken(req, res)) return;

    try {
      UsersController.json(
        res,
        200,
        await this.service.getUserById(id)
      );
    } catch (error) {
      console.error('Error obteniendo usuario:', error);
      UsersController.json(
        res,
        error.status || 500,
        { error: error.message }
      );
    }
  }

  async updateUser(req, res, id, body = {}) {
    if (!this.requireToken(req, res)) return;

    try {
      const result = await this.service.updateUser(id, body);

      UsersController.json(res, 200, result);
    } catch (error) {
      console.error('Error actualizando usuario:', error);
      UsersController.json(
        res,
        error.status || 500,
        { error: error.message }
      );
    }
  }
}

module.exports = UsersController;
