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

  async createBreak(data) {
    const result = await this.db.query(
      `
      INSERT INTO quiebres (
        codigo,
        nombre,
        descripcion,
        activo
      )
      VALUES ($1, $2, $3, $4)
      RETURNING
        id,
        codigo,
        nombre,
        descripcion,
        activo,
        created_at,
        updated_at
    `,
      [
        data.codigo,
        data.nombre,
        data.descripcion ?? null,
        data.activo !== false
      ]
    );

    return result.rows[0];
  }


  async updateBreak(id, data) {
    const result = await this.db.query(
      `
      UPDATE quiebres
      SET
        codigo = $1,
        nombre = $2,
        descripcion = $3,
        activo = $4,
        updated_at = NOW()
      WHERE id = $5
      RETURNING
        id,
        codigo,
        nombre,
        descripcion,
        activo,
        created_at,
        updated_at
    `,
      [
        data.codigo,
        data.nombre,
        data.descripcion ?? null,
        data.activo !== false,
        id
      ]
    );

    return result.rows[0] || null;
  }


  async setBreakActive(id, activo) {
    const result = await this.db.query(
      `
      UPDATE quiebres
      SET
        activo = $1,
        updated_at = NOW()
      WHERE id = $2
      RETURNING
        id,
        codigo,
        nombre,
        descripcion,
        activo,
        created_at,
        updated_at
    `,
      [
        Boolean(activo),
        id
      ]
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

  async getCampaignById(id) {
    const result = await this.db.query(
      `
      SELECT
        c.id,
        c.codigo,
        c.descripcion,
        c.activa,
        c.quiebre_id,
        c.created_at,
        c.updated_at,
        q.codigo AS quiebre_codigo,
        q.nombre AS quiebre_nombre
      FROM campanas c
      JOIN quiebres q
        ON q.id = c.quiebre_id
      WHERE c.id = $1
    `,
      [id]
    );

    return result.rows[0] || null;
  }


  async createCampaign(data) {
    const result = await this.db.query(
      `
      INSERT INTO campanas (
        codigo,
        descripcion,
        activa,
        quiebre_id
      )
      VALUES ($1, $2, $3, $4)
      RETURNING
        id,
        codigo,
        descripcion,
        activa,
        quiebre_id,
        created_at,
        updated_at
    `,
      [
        data.codigo,
        data.descripcion,
        data.activa !== false,
        data.quiebreId
      ]
    );

    return result.rows[0];
  }


  async updateCampaign(id, data) {
    const result = await this.db.query(
      `
      UPDATE campanas
      SET
        codigo = $1,
        descripcion = $2,
        activa = $3,
        quiebre_id = $4,
        updated_at = NOW()
      WHERE id = $5
      RETURNING
        id,
        codigo,
        descripcion,
        activa,
        quiebre_id,
        created_at,
        updated_at
    `,
      [
        data.codigo,
        data.descripcion,
        data.activa,
        data.quiebreId,
        id
      ]
    );

    return result.rows[0] || null;
  }


  async setCampaignActive(id, activa) {
    const result = await this.db.query(
      `
      UPDATE campanas
      SET
        activa = $1,
        updated_at = NOW()
      WHERE id = $2
      RETURNING
        id,
        codigo,
        descripcion,
        activa,
        quiebre_id,
        created_at,
        updated_at
    `,
      [
        Boolean(activa),
        id
      ]
    );

    return result.rows[0] || null;
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

  async getMatrixById(id) {
    const result = await this.db.query(
      `
      SELECT
        m.id,
        m.quiebre_id,
        m.codigo,
        m.nombre,
        m.descripcion,
        m.activa,
        m.created_at,
        m.updated_at,
        q.codigo AS quiebre_codigo,
        q.nombre AS quiebre_nombre
      FROM matrices m
      JOIN quiebres q
        ON q.id = m.quiebre_id
      WHERE m.id = $1
    `,
      [id]
    );

    return result.rows[0] || null;
  }


  async createMatrix(data) {
    const result = await this.db.query(
      `
      INSERT INTO matrices (
        quiebre_id,
        codigo,
        nombre,
        descripcion,
        activa
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING
        id,
        quiebre_id,
        codigo,
        nombre,
        descripcion,
        activa,
        created_at,
        updated_at
    `,
      [
        data.quiebreId,
        data.codigo,
        data.nombre,
        data.descripcion ?? null,
        data.activa !== false
      ]
    );

    return result.rows[0];
  }


  async updateMatrix(id, data) {
    const result = await this.db.query(
      `
      UPDATE matrices
      SET
        quiebre_id = $1,
        codigo = $2,
        nombre = $3,
        descripcion = $4,
        activa = $5,
        updated_at = NOW()
      WHERE id = $6
      RETURNING
        id,
        quiebre_id,
        codigo,
        nombre,
        descripcion,
        activa,
        created_at,
        updated_at
    `,
      [
        data.quiebreId,
        data.codigo,
        data.nombre,
        data.descripcion ?? null,
        data.activa,
        id
      ]
    );

    return result.rows[0] || null;
  }



  async setMatrixActive(id, activa) {
    const result = await this.db.query(
      `
      UPDATE matrices
      SET
        activa = $1,
        updated_at = NOW()
      WHERE id = $2
      RETURNING
        id,
        quiebre_id,
        codigo,
        nombre,
        descripcion,
        activa,
        created_at,
        updated_at
    `,
      [
        Boolean(activa),
        id
      ]
    );

    return result.rows[0] || null;
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

  async getCampaignMatrixAssignmentById(id) {
    const result = await this.db.query(
      `
      SELECT
        cm.id,
        cm.campana_id,
        cm.matriz_id,
        cm.vigente_desde,
        cm.vigente_hasta,
        cm.activa,
        cm.created_at,
        cm.updated_at,
        c.codigo AS campana_codigo,
        c.descripcion AS campana_descripcion,
        c.quiebre_id AS campana_quiebre_id,
        m.codigo AS matriz_codigo,
        m.nombre AS matriz_nombre,
        m.quiebre_id AS matriz_quiebre_id
      FROM campana_matriz cm
      JOIN campanas c
        ON c.id = cm.campana_id
      JOIN matrices m
        ON m.id = cm.matriz_id
      WHERE cm.id = $1
    `,
      [id]
    );

    return result.rows[0] || null;
  }


  async createCampaignMatrixAssignment(data) {
    const result = await this.db.query(
      `
      INSERT INTO campana_matriz (
        campana_id,
        matriz_id,
        vigente_desde,
        vigente_hasta,
        activa
      )
      VALUES ($1, $2, $3, $4, $5)
      RETURNING
        id,
        campana_id,
        matriz_id,
        vigente_desde,
        vigente_hasta,
        activa,
        created_at,
        updated_at
    `,
      [
        data.campanaId,
        data.matrizId,
        data.vigenteDesde,
        data.vigenteHasta ?? null,
        data.activa !== false
      ]
    );

    return result.rows[0];
  }


  async updateCampaignMatrixAssignment(id, data) {
    const result = await this.db.query(
      `
      UPDATE campana_matriz
      SET
        campana_id = $1,
        matriz_id = $2,
        vigente_desde = $3,
        vigente_hasta = $4,
        activa = $5,
        updated_at = NOW()
      WHERE id = $6
      RETURNING
        id,
        campana_id,
        matriz_id,
        vigente_desde,
        vigente_hasta,
        activa,
        created_at,
        updated_at
    `,
      [
        data.campanaId,
        data.matrizId,
        data.vigenteDesde,
        data.vigenteHasta ?? null,
        data.activa,
        id
      ]
    );

    return result.rows[0] || null;
  }


  async setCampaignMatrixAssignmentActive(
    id,
    activa
  ) {
    const result = await this.db.query(
      `
      UPDATE campana_matriz
      SET
        activa = $1,
        updated_at = NOW()
      WHERE id = $2
      RETURNING
        id,
        campana_id,
        matriz_id,
        vigente_desde,
        vigente_hasta,
        activa,
        created_at,
        updated_at
    `,
      [
        Boolean(activa),
        id
      ]
    );

    return result.rows[0] || null;
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

  async findCampaignMatrixOverlaps({
    campanaId,
    vigenteDesde,
    vigenteHasta = null,
    excludeId = null
  }) {
    const result = await this.db.query(
      `
      SELECT
        cm.id,
        cm.campana_id,
        cm.matriz_id,
        cm.vigente_desde,
        cm.vigente_hasta,
        cm.activa
      FROM campana_matriz cm
      WHERE cm.campana_id = $1
        AND cm.activa = TRUE
        AND (
          $4::bigint IS NULL
          OR cm.id <> $4
        )
        AND daterange(
              cm.vigente_desde,
              COALESCE(
                cm.vigente_hasta + 1,
                'infinity'::date
              ),
              '[)'
            )
            &&
            daterange(
              $2::date,
              COALESCE(
                $3::date + 1,
                'infinity'::date
              ),
              '[)'
            )
      ORDER BY
        cm.vigente_desde,
        cm.id
    `,
      [
        campanaId,
        vigenteDesde,
        vigenteHasta,
        excludeId
      ]
    );

    return result.rows;
  }

}

module.exports = DomainRepository;
