class SessionsRepository {
  constructor(db) {
    this.db = db;
  }

  async upsertSession({ usuarioId, tokenSesion, ip, dispositivo }) {
    await this.db.query(`
      INSERT INTO sesiones_activas
        (usuario_id, token_sesion, ip, dispositivo, fecha_login, estado)
      VALUES ($1, $2, $3, $4, NOW(), 'activa')
      ON CONFLICT (usuario_id) DO UPDATE
      SET token_sesion = $2,
          ip = $3,
          dispositivo = $4,
          fecha_login = NOW(),
          estado = 'activa'
    `, [usuarioId, tokenSesion, ip, dispositivo]);

    return { success: true };
  }

  async listUserSessions(usuarioId, { activas } = {}) {
    let query = `
      SELECT
        id,
        usuario_id,
        session_token,
        ip_address,
        user_agent,
        dispositivo,
        fecha_inicio,
        ultima_actividad,
        fecha_fin,
        estado,
        created_at
      FROM sesiones_activas
      WHERE usuario_id = $1
    `;
    const params = [usuarioId];

    if (activas === 'true') {
      query += ` AND estado = 'activa'`;
    }

    query += ` ORDER BY fecha_inicio DESC`;

    const result = await this.db.query(query, params);
    return result.rows;
  }

  async closeSession(sessionToken) {
    const result = await this.db.query(`
      UPDATE sesiones_activas
      SET estado = 'cerrada',
          fecha_fin = NOW()
      WHERE session_token = $1 AND estado = 'activa'
      RETURNING id
    `, [sessionToken]);

    return result.rowCount;
  }

  async closeAllForUser(usuarioId) {
    const result = await this.db.query(`
      UPDATE sesiones_activas
      SET estado = 'cerrada',
          fecha_fin = NOW()
      WHERE usuario_id = $1 AND estado = 'activa'
      RETURNING id
    `, [usuarioId]);

    return result.rowCount;
  }

  async insertLoginHistory({ usuarioId, usuario, tipo, ip, dispositivo }) {
    await this.db.query(`
      INSERT INTO historial_login
        (usuario_id, usuario, tipo, ip, dispositivo, fecha)
      VALUES ($1, $2, $3, $4, $5, NOW())
    `, [usuarioId, usuario, tipo, ip, dispositivo]);

    return { success: true };
  }
}

module.exports = SessionsRepository;
