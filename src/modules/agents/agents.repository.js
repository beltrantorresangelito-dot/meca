class AgentsRepository {
  constructor(db) {
    this.db = db;
  }

  async list({ lider, ubicacion, localidad } = {}) {
    let query = `
      SELECT id, nombre, lider_2026, ubicacion, localidad,
             estado, created_at, categoria_label
      FROM agentes
      WHERE 1=1
    `;

    const params = [];
    let idx = 1;

    if (lider) {
      query += ` AND lider_2026 = $${idx++}`;
      params.push(lider);
    }

    if (ubicacion) {
      query += ` AND ubicacion = $${idx++}`;
      params.push(ubicacion);
    }

    if (localidad) {
      query += ` AND localidad = $${idx++}`;
      params.push(localidad);
    }

    query += ' ORDER BY nombre';

    const result = await this.db.query(query, params);
    return result.rows;
  }

  async update(id, data = {}) {
    const updates = [];
    const values = [];
    let idx = 1;

    for (const field of [
      'nombre',
      'estado',
      'lider_2026',
      'ubicacion',
      'localidad',
      'categoria_label',
      'funciones'
    ]) {
      if (data[field] !== undefined) {
        updates.push(`${field} = $${idx++}`);
        values.push(data[field]);
      }
    }

    if (updates.length === 0) {
      return { noChanges: true, rowCount: 0 };
    }

    updates.push('updated_at = NOW()');
    values.push(id);

    const query =
      `UPDATE agentes SET ${updates.join(', ')} WHERE id = $${idx}`;

    const result = await this.db.query(query, values);

    return {
      noChanges: false,
      rowCount: result.rowCount
    };
  }

  async delete(id) {
    const result = await this.db.query(
      'DELETE FROM agentes WHERE id = $1 RETURNING id',
      [id]
    );

    return result.rowCount;
  }

  async getById(id) {
    const result = await this.db.query(
      'SELECT * FROM agentes WHERE id = $1',
      [id]
    );

    return result.rows[0] || null;
  }

  async listCategories() {
    const result = await this.db.query(`
      SELECT DISTINCT categoria_label
      FROM agentes
      WHERE categoria_label IS NOT NULL
        AND categoria_label != ''
      ORDER BY categoria_label
    `);

    return result.rows.map(row => row.categoria_label);
  }

  async listComplete() {
    const result = await this.db.query(
      'SELECT * FROM agentes ORDER BY id'
    );

    return result.rows;
  }

  async listForExport() {
    const result = await this.db.query(`
      SELECT
        id,
        nombre,
        dni,
        carnet,
        correo,
        estado,
        lider_2026,
        ubicacion,
        localidad,
        categoria_label,
        funciones,
        TO_CHAR(created_at, 'DD/MM/YYYY') as fecha_registro
      FROM agentes
      ORDER BY nombre
    `);

    return result.rows;
  }
}

module.exports = AgentsRepository;
