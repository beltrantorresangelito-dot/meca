class RolesRepository {
  constructor(db) {
    this.db = db;
  }

  async findActiveRoleByCode(codigo) {
    const result = await this.db.query(`
      SELECT redirect_url, nombre, activo
      FROM roles
      WHERE codigo = $1 AND activo = true
    `, [codigo]);
    return result.rows[0] || null;
  }

  async updateRedirect(id, redirectUrl) {
    const result = await this.db.query(`
      UPDATE roles
      SET redirect_url = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING id, codigo, nombre, redirect_url
    `, [redirectUrl, id]);
    return result.rows[0] || null;
  }

  async listAllRoles() {
    const result = await this.db.query(`
      SELECT id, codigo, nombre, activo, redirect_url, created_at, updated_at
      FROM roles
      ORDER BY id
    `);
    return result.rows;
  }

  async roleExists(id) {
    const result = await this.db.query(
      'SELECT id FROM roles WHERE id = $1',
      [id]
    );
    return result.rows.length > 0;
  }

  async findRoleById(id) {
    const result = await this.db.query(
      'SELECT id, nombre, activo FROM roles WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  }

  async findRoleByCodeExcludingId(codigo, id) {
    const result = await this.db.query(
      'SELECT id FROM roles WHERE codigo = $1 AND id != $2',
      [codigo, id]
    );
    return result.rows[0] || null;
  }

  async updateRole(id, { codigo, nombre, activo }) {
    const result = await this.db.query(`
      UPDATE roles
      SET codigo = $1,
          nombre = $2,
          activo = $3,
          updated_at = NOW()
      WHERE id = $4
      RETURNING id, codigo, nombre, activo, created_at, updated_at
    `, [codigo, nombre, activo, id]);
    return result.rows[0] || null;
  }

  async deleteRolePermissions(id) {
    const result = await this.db.query(
      'DELETE FROM rol_pestanas WHERE rol_id = $1 RETURNING id',
      [id]
    );
    return result.rowCount;
  }

  async insertRolePermissions(id, permissions = [], { ignoreConflicts = false } = {}) {
    if (!permissions.length) return 0;

    const values = [];
    const placeholders = [];
    let idx = 1;

    for (const code of permissions) {
      placeholders.push(`($${idx++}, $${idx++})`);
      values.push(id, code);
    }

    const conflict = ignoreConflicts ? ' ON CONFLICT DO NOTHING' : '';
    const result = await this.db.query(
      `INSERT INTO rol_pestanas (rol_id, pestana_codigo)
       VALUES ${placeholders.join(', ')}${conflict}`,
      values
    );
    return result.rowCount;
  }

  async createRole({ codigo, nombre, activo }) {
    const result = await this.db.query(`
      INSERT INTO roles (codigo, nombre, activo, created_at, updated_at)
      VALUES ($1, $2, $3, NOW(), NOW())
      RETURNING id, codigo, nombre, activo
    `, [codigo, nombre, activo]);
    return result.rows[0] || null;
  }

  async roleExistsByCode(codigo) {
    const result = await this.db.query(
      'SELECT id FROM roles WHERE codigo = $1',
      [codigo]
    );
    return result.rows.length > 0;
  }

  async setRoleActive(id, activo) {
    const result = await this.db.query(`
      UPDATE roles
      SET activo = $1, updated_at = NOW()
      WHERE id = $2
      RETURNING id, codigo, nombre, activo, updated_at
    `, [activo, id]);
    return result.rows[0] || null;
  }

  async reactivateRole(id) {
    const result = await this.db.query(`
      UPDATE roles
      SET activo = true, updated_at = NOW()
      WHERE id = $1
      RETURNING id, codigo, nombre, activo, updated_at
    `, [id]);
    return result.rows[0] || null;
  }

  async countUsersByRole(id) {
    const result = await this.db.query(
      'SELECT COUNT(*) as total FROM usuarios WHERE rol_id = $1',
      [id]
    );
    return parseInt(result.rows[0]?.total || 0, 10);
  }

  async deleteRole(id) {
    const result = await this.db.query(
      'DELETE FROM roles WHERE id = $1',
      [id]
    );
    return result.rowCount;
  }

  async listAllTabs() {
    const result = await this.db.query(
      'SELECT * FROM pestanas_sistema ORDER BY orden, id'
    );
    return result.rows;
  }

  async listRoleTabs(roleId) {
    const result = await this.db.query(
      'SELECT pestana_codigo FROM rol_pestanas WHERE rol_id = $1',
      [roleId]
    );
    return result.rows;
  }

  async getActiveUserRole(userId) {
    const result = await this.db.query(
      `SELECT rol_id
       FROM usuarios
       WHERE id = $1
         AND activo = true`,
      [userId]
    );

    return result.rows[0]?.rol_id || null;
  }

  async listVisibleTabs(roleId) {
    const result = await this.db.query(`
      SELECT p.*
      FROM pestanas_sistema p
      INNER JOIN rol_pestanas rp
        ON p.codigo = rp.pestana_codigo
      WHERE rp.rol_id = $1
        AND p.visible = true
      ORDER BY p.orden
    `, [roleId]);

    return result.rows;
  }
}

module.exports = RolesRepository;
