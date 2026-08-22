class DomainRepository {
  constructor(db = null) {
    // Carga perezosa:
    // - producción sin inyección -> usa pool PostgreSQL real
    // - tests con fake DB -> no carga/abre PostgreSQL al importar el módulo
    this.db = db || require('../../../models/database').pool;
  }

  async listBreaks({ activeOnly = true } = {}) {
    let sql = `
      SELECT id, codigo, nombre, descripcion, activo, created_at, updated_at
      FROM quiebres
    `;
    if (activeOnly) sql += ` WHERE activo = TRUE`;
    sql += ` ORDER BY nombre, id`;
    return (await this.db.query(sql)).rows;
  }

  async getBreakById(id) {
    const result = await this.db.query(
      `SELECT id, codigo, nombre, descripcion, activo, created_at, updated_at
       FROM quiebres
       WHERE id = $1`,
      [id]
    );
    return result.rows[0] || null;
  }

  async listCampaignsByBreak(breakId, { activeOnly = true } = {}) {
    let sql = `
      SELECT
        c.id,
        c.codigo,
        c.descripcion,
        c.activa,
        c.quiebre_id,
        q.codigo AS quiebre_codigo,
        q.nombre AS quiebre_nombre
      FROM campanas c
      JOIN quiebres q ON q.id = c.quiebre_id
      WHERE c.quiebre_id = $1
    `;
    if (activeOnly) sql += ` AND c.activa = TRUE`;
    sql += ` ORDER BY c.codigo, c.id`;
    return (await this.db.query(sql, [breakId])).rows;
  }

  async listMatricesByBreak(breakId, { activeOnly = true } = {}) {
    let sql = `
      SELECT id, quiebre_id, codigo, nombre, descripcion, activa, created_at, updated_at
      FROM matrices
      WHERE quiebre_id = $1
    `;
    if (activeOnly) sql += ` AND activa = TRUE`;
    sql += ` ORDER BY nombre, id`;
    return (await this.db.query(sql, [breakId])).rows;
  }

  async listCampaignMatrixAssignments(campaignId) {
    return (await this.db.query(
      `
      SELECT
        cm.id,
        cm.campana_id,
        cm.matriz_id,
        cm.vigente_desde,
        cm.vigente_hasta,
        cm.activa,
        m.codigo AS matriz_codigo,
        m.nombre AS matriz_nombre
      FROM campana_matriz cm
      JOIN matrices m ON m.id = cm.matriz_id
      WHERE cm.campana_id = $1
      ORDER BY cm.vigente_desde DESC, cm.id DESC
      `,
      [campaignId]
    )).rows;
  }

  async resolveEvaluationContext(campaignId, date = null) {
    const result = date
      ? await this.db.query(
          `SELECT * FROM resolver_contexto_evaluacion($1, $2::date)`,
          [campaignId, date]
        )
      : await this.db.query(
          `SELECT * FROM resolver_contexto_evaluacion($1, CURRENT_DATE)`,
          [campaignId]
        );

    return result.rows;
  }

  async getDomainConsistency() {
    return (await this.db.query(`
      SELECT
        (SELECT COUNT(*)::int
           FROM campanas
          WHERE quiebre_id IS NULL) AS campanas_sin_quiebre,

        (SELECT COUNT(*)::int
           FROM versiones_matriz
          WHERE matriz_id IS NULL) AS versiones_sin_matriz,

        (SELECT COUNT(*)::int
           FROM campana_matriz cm
           JOIN campanas c ON c.id = cm.campana_id
           JOIN matrices m ON m.id = cm.matriz_id
          WHERE c.quiebre_id <> m.quiebre_id) AS relaciones_quiebre_cruzado,

        (SELECT COUNT(*)::int
           FROM campanas c
          WHERE NOT EXISTS (
            SELECT 1
            FROM campana_matriz cm
            WHERE cm.campana_id = c.id
              AND cm.activa = TRUE
          )) AS campanas_sin_matriz_activa
    `)).rows[0];
  }
}

module.exports = DomainRepository;
