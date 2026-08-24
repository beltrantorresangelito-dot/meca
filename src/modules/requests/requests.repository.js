class RequestsRepository {
  constructor(db) {
    this.db = db;
  }

  async listByUser(userId) {
    const result = await this.db.query(
      `SELECT *
       FROM solicitudes_requerimientos
       WHERE solicitante_id = $1
       ORDER BY created_at DESC`,
      [userId]
    );
    return result.rows || [];
  }

  async listAll() {
    const result = await this.db.query(
      `SELECT *
       FROM solicitudes_requerimientos
       ORDER BY created_at DESC`
    );
    return result.rows || [];
  }

  async createDynamic(data) {
    const keys = Object.keys(data);
    const values = Object.values(data);
    const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
    const colNames = keys.join(', ');

    const result = await this.db.query(
      `INSERT INTO solicitudes_requerimientos (${colNames})
       VALUES (${placeholders})
       RETURNING *`,
      values
    );

    return result.rows[0];
  }

  async findById(id) {
    const result = await this.db.query(
      `SELECT *
       FROM solicitudes_requerimientos
       WHERE id = $1`,
      [id]
    );

    return result.rows[0] || null;
  }

  async updateStatus(id, data = {}) {
    const {
      estado,
      fecha_aprobacion,
      fecha_inicio_desarrollo,
      fecha_entrega,
      responsable_asignado,
      tiempo_estimado_horas,
      motivo_rechazo
    } = data;

    let query =
      'UPDATE solicitudes_requerimientos SET estado = $1, updated_at = NOW()';

    const values = [estado];
    let idx = 2;

    if (fecha_aprobacion) {
      query += `, fecha_aprobacion = $${idx++}`;
      values.push(fecha_aprobacion);
    }

    if (fecha_inicio_desarrollo) {
      query += `, fecha_inicio_desarrollo = $${idx++}`;
      values.push(fecha_inicio_desarrollo);
    }

    if (fecha_entrega) {
      query += `, fecha_entrega = $${idx++}`;
      values.push(fecha_entrega);
    }

    if (responsable_asignado !== undefined) {
      query += `, responsable_asignado = $${idx++}`;
      values.push(responsable_asignado);
    }

    if (tiempo_estimado_horas !== undefined) {
      query += `, tiempo_estimado_horas = $${idx++}`;
      values.push(tiempo_estimado_horas);
    }

    if (motivo_rechazo !== undefined) {
      query += `, motivo_rechazo = $${idx++}`;
      values.push(motivo_rechazo);
    }

    query += ` WHERE id = $${idx}`;
    values.push(id);

    const result = await this.db.query(query, values);
    return result.rowCount;
  }
}

module.exports = RequestsRepository;
