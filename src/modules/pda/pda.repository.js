class PdaRepository {
  constructor(db) {
    this.db = db;
  }

  async tableExists() {
    const result = await this.db.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'pda_cabecera'
      );
    `);

    return Boolean(result.rows?.[0]?.exists);
  }

  async listPending() {
    const result = await this.db.query(`
      SELECT *
      FROM pda_cabecera
      WHERE estado IN ('pendiente', 'notificado', 'en_gestion')
      ORDER BY created_at DESC
    `);

    return result.rows || [];
  }

  async listTracking() {
    const result = await this.db.query(`
      SELECT *
      FROM pda_cabecera
      WHERE estado = 'en_seguimiento'
      ORDER BY created_at DESC
    `);

    return result.rows || [];
  }

  async listHistory() {
    const result = await this.db.query(`
      SELECT *
      FROM pda_cabecera
      WHERE estado IN ('completado', 'escalado', 'corregido')
      ORDER BY created_at DESC
      LIMIT 50
    `);

    return result.rows || [];
  }

  async findHeaderById(pdaId) {
    const result = await this.db.query(
      'SELECT * FROM pda_cabecera WHERE id = $1',
      [pdaId]
    );

    return result.rows?.[0] || null;
  }

  async listActions(pdaId) {
    const result = await this.db.query(
      'SELECT * FROM pda_acciones WHERE pda_id = $1 ORDER BY id',
      [pdaId]
    );

    return result.rows || [];
  }

  async exportRows() {
    const result = await this.db.query(`
      SELECT
        pc.id,
        pc.agente,
        pc.fecha_deteccion,
        pc.estado,
        pc.promedio_basal,
        pc.cuartil_basal,
        COUNT(pa.id) as total_acciones,
        SUM(CASE WHEN pa.completado = true THEN 1 ELSE 0 END) as acciones_completadas
      FROM pda_cabecera pc
      LEFT JOIN pda_acciones pa ON pc.id = pa.pda_id
      GROUP BY
        pc.id,
        pc.agente,
        pc.fecha_deteccion,
        pc.estado,
        pc.promedio_basal,
        pc.cuartil_basal
      ORDER BY pc.created_at DESC
    `);

    return result.rows || [];
  }
}

module.exports = PdaRepository;
