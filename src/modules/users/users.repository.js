class UsersRepository {
  constructor(db) {
    this.db = db;
  }

  async findLoginUserByUsername(usuario) {
    const result = await this.db.query(`
      SELECT
        u.id,
        u.usuario,
        u.nombre_completo,
        u.contrasena,
        u.rol_id,
        u.activo as usuario_activo,
        u.primer_login,
        r.activo as rol_activo,
        r.nombre as rol_nombre,
        r.codigo as rol_codigo
      FROM usuarios u
      LEFT JOIN roles r ON u.rol_id = r.id
      WHERE u.usuario = $1
    `, [usuario]);

    return result.rows[0] || null;
  }

  async updatePasswordHash(id, passwordHash, { clearFirstLogin = false } = {}) {
    if (clearFirstLogin) {
      const result = await this.db.query(
        `UPDATE usuarios
         SET contrasena = $1,
             primer_login = false,
             updated_at = NOW()
         WHERE id = $2
         RETURNING id`,
        [passwordHash, id]
      );
      return result.rowCount;
    }

    const result = await this.db.query(
      `UPDATE usuarios
       SET contrasena = $1,
           updated_at = NOW()
       WHERE id = $2
       RETURNING id`,
      [passwordHash, id]
    );
    return result.rowCount;
  }

  async touchLastLogin(id) {
    await this.db.query(
      'UPDATE usuarios SET ultimo_login = NOW() WHERE id = $1',
      [id]
    );
  }

  async listLegacyAuditors() {
    const result = await this.db.query(
      "SELECT nombre FROM usuarios WHERE tipo = 'AUDITOR' ORDER BY nombre"
    );
    return result.rows;
  }

  async listActiveAuditors() {
    const result = await this.db.query(`
      SELECT
        u.id,
        u.usuario,
        u.nombre_completo,
        u.activo,
        u.ultimo_login,
        u.created_at
      FROM usuarios u
      INNER JOIN roles r ON u.rol_id = r.id
      WHERE r.codigo = 'AUDITOR'
        AND u.activo = true
      ORDER BY u.nombre_completo
    `);

    return result.rows;
  }

  async listUsers() {
    const result = await this.db.query(`
      SELECT
        u.id,
        u.usuario,
        u.nombre_completo,
        u.activo,
        u.created_at,
        u.ultimo_login,
        u.rol_id,
        r.id as rol_id,
        r.codigo as rol_codigo,
        r.nombre as rol_nombre
      FROM usuarios u
      LEFT JOIN roles r ON u.rol_id = r.id
      ORDER BY u.usuario
    `);

    return result.rows;
  }

  async userExistsByUsername(usuario) {
    const result = await this.db.query(
      'SELECT id FROM usuarios WHERE usuario = $1',
      [usuario]
    );
    return result.rows.length > 0;
  }

  async roleExists(rolId) {
    const result = await this.db.query(
      'SELECT id FROM roles WHERE id = $1',
      [rolId]
    );
    return result.rows.length > 0;
  }

  async nextUserId() {
    const result = await this.db.query(
      'SELECT COALESCE(MAX(id), 0) + 1 as next_id FROM usuarios'
    );
    return result.rows[0].next_id;
  }

  async insertUser({
    id,
    usuario,
    nombreCompleto,
    passwordHash,
    rolId,
    activo
  }) {
    const result = await this.db.query(`
      INSERT INTO usuarios (
        id,
        usuario,
        nombre_completo,
        contrasena,
        rol_id,
        activo,
        created_at,
        updated_at
      )
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      RETURNING id, usuario, nombre_completo, rol_id, activo
    `, [id, usuario, nombreCompleto, passwordHash, rolId, activo]);

    return result.rows[0] || null;
  }

  async userExistsById(id) {
    const result = await this.db.query(
      'SELECT id FROM usuarios WHERE id = $1',
      [id]
    );
    return result.rows.length > 0;
  }

  async deleteUser(id) {
    const result = await this.db.query(
      'DELETE FROM usuarios WHERE id = $1',
      [id]
    );
    return result.rowCount;
  }

  async listUsersForExport() {
    const result = await this.db.query(`
      SELECT
        u.id,
        u.usuario,
        u.nombre_completo,
        CASE WHEN u.activo = true THEN 'Activo' ELSE 'Inactivo' END as estado,
        r.codigo as rol,
        TO_CHAR(u.created_at, 'DD/MM/YYYY') as fecha_registro,
        TO_CHAR(u.ultimo_login, 'DD/MM/YYYY HH24:MI') as ultimo_login
      FROM usuarios u
      LEFT JOIN roles r ON u.rol_id = r.id
      ORDER BY u.id
    `);

    return result.rows;
  }

  async getUserById(id) {
    const result = await this.db.query(`
      SELECT id, usuario, nombre_completo, activo, created_at, rol_id
      FROM usuarios
      WHERE id = $1
    `, [id]);

    return result.rows[0] || null;
  }

  async updateUser(id, data = {}) {
    const updates = [];
    const values = [];
    let idx = 1;

    if (data.usuario !== undefined) {
      updates.push(`usuario = $${idx++}`);
      values.push(data.usuario);
    }

    if (data.nombre_completo !== undefined) {
      updates.push(`nombre_completo = $${idx++}`);
      values.push(data.nombre_completo);
    }

    if (data.rol_id !== undefined) {
      updates.push(`rol_id = $${idx++}`);
      values.push(data.rol_id);
    }

    if (data.activo !== undefined) {
      updates.push(`activo = $${idx++}`);
      values.push(data.activo);
    }

    if (data.passwordHash !== undefined) {
      updates.push(`contrasena = $${idx++}`);
      values.push(data.passwordHash);
    }

    updates.push('updated_at = NOW()');
    values.push(id);

    const result = await this.db.query(
      `UPDATE usuarios
       SET ${updates.join(', ')}
       WHERE id = $${idx}`,
      values
    );

    return result.rowCount;
  }
}

module.exports = UsersRepository;
