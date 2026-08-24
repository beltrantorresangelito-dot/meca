class QuartileCriteriaRepository {
  constructor(db) {
    this.db = db;
  }

  async listAll() {
    const result = await this.db.query(
      'SELECT * FROM criterios_cuartiles ORDER BY fecha_vigencia_desde DESC, orden ASC'
    );
    return result.rows || [];
  }

  async listActiveByDate(fecha) {
    const result = await this.db.query(
      `SELECT * FROM criterios_cuartiles
       WHERE activo = true
         AND fecha_vigencia_desde <= $1
         AND (fecha_vigencia_hasta IS NULL OR fecha_vigencia_hasta >= $1)
       ORDER BY orden ASC`,
      [fecha]
    );
    return result.rows || [];
  }

  async create(data) {
    const {
      cuartil, nombre, limite_inferior, limite_superior,
      color_hex, icono, orden, fecha_vigencia_desde,
      fecha_vigencia_hasta, activo
    } = data;

    const fechaHasta = fecha_vigencia_hasta || null;

    const result = await this.db.query(
      `INSERT INTO criterios_cuartiles
       (cuartil, nombre, limite_inferior, limite_superior, color_hex, icono, orden,
        fecha_vigencia_desde, fecha_vigencia_hasta, creado_por, activo)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        cuartil, nombre, limite_inferior, limite_superior,
        color_hex, icono, orden, fecha_vigencia_desde,
        fechaHasta, 'admin', activo !== false
      ]
    );

    return result.rows?.[0] || null;
  }

  async update(id, data) {
    const {
      cuartil, nombre, limite_inferior, limite_superior,
      color_hex, icono, orden, fecha_vigencia_desde,
      fecha_vigencia_hasta, activo
    } = data;

    const fechaHasta = fecha_vigencia_hasta || null;

    const result = await this.db.query(
      `UPDATE criterios_cuartiles
       SET cuartil = $1, nombre = $2, limite_inferior = $3, limite_superior = $4,
           color_hex = $5, icono = $6, orden = $7, activo = $8,
           fecha_vigencia_desde = $9, fecha_vigencia_hasta = $10,
           updated_at = CURRENT_TIMESTAMP
       WHERE id = $11
       RETURNING *`,
      [
        cuartil, nombre, limite_inferior, limite_superior,
        color_hex, icono, orden, activo !== false,
        fecha_vigencia_desde, fechaHasta, id
      ]
    );

    return result.rows?.[0] || null;
  }

  async findBasicById(id) {
    const result = await this.db.query(
      'SELECT id, nombre FROM criterios_cuartiles WHERE id = $1',
      [id]
    );
    return result.rows?.[0] || null;
  }

  async deactivate(id) {
    const result = await this.db.query(
      'UPDATE criterios_cuartiles SET activo = false, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
      [id]
    );
    return result.rowCount;
  }

  async activate(id) {
    const result = await this.db.query(
      'UPDATE criterios_cuartiles SET activo = true, updated_at = CURRENT_TIMESTAMP WHERE id = $1 RETURNING *',
      [id]
    );
    return result.rows?.[0] || null;
  }
}

module.exports = QuartileCriteriaRepository;
