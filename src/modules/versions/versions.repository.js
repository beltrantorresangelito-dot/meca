class VersionsRepository {
  constructor(db) {
    this.db = db;
  }

  async list(tipo) {
    let query = 'SELECT * FROM versiones_sistema';
    const params = [];

    if (tipo && tipo !== 'todos') {
      query += ' WHERE tipo = $1';
      params.push(tipo);
    }

    query += ' ORDER BY fecha_publicacion DESC';

    const result = await this.db.query(query, params);
    return result.rows || [];
  }

  async create(data) {
    const {
      version,
      tipo,
      descripcion,
      publicado_por,
      contenido_html,
      nombre_archivo
    } = data;

    const result = await this.db.query(
      `
        INSERT INTO versiones_sistema (
          version,
          tipo,
          nombre_archivo,
          contenido_html,
          descripcion,
          publicado_por,
          tamano_bytes,
          es_activo,
          fecha_publicacion
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
        RETURNING id
      `,
      [
        version,
        tipo,
        nombre_archivo,
        contenido_html,
        descripcion,
        publicado_por,
        contenido_html.length,
        false
      ]
    );

    return result.rows?.[0]?.id ?? null;
  }

  async deactivateByType(tipo) {
    const result = await this.db.query(
      'UPDATE versiones_sistema SET es_activo = false WHERE tipo = $1',
      [tipo]
    );

    return result.rowCount;
  }

  async activateById(id) {
    const result = await this.db.query(
      'UPDATE versiones_sistema SET es_activo = true WHERE id = $1 RETURNING id',
      [id]
    );

    return result.rows?.[0]?.id ?? null;
  }

  async deleteById(id) {
    const result = await this.db.query(
      'DELETE FROM versiones_sistema WHERE id = $1 RETURNING id',
      [id]
    );

    return result.rows?.[0]?.id ?? null;
  }
}

module.exports = VersionsRepository;
