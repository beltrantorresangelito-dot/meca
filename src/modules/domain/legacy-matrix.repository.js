class DomainRepository {
  constructor(db = null) {
    // Carga perezosa: los tests pueden inyectar un fake DB sin abrir PostgreSQL.
    // En producción, al no recibir db, se usa el pool real.
    this.db = db || require('../../../models/database').pool;
  }

  async getLegacyActiveMatrixVersion() {
    const result = await this.db.query(`
      SELECT *
      FROM versiones_matriz
      WHERE activa = TRUE
      LIMIT 1
    `);

    return result.rows[0] || null;
  }

  async getLegacyEvaluationActiveVersion() {
    const result = await this.db.query(`
      SELECT id, version, descripcion, activa, created_at
      FROM versiones_matriz
      WHERE activa = TRUE
      LIMIT 1
    `);

    return result.rows[0] || null;
  }

  async getLegacyMatrixVersionByDate(date) {
    const result = await this.db.query(`
      SELECT *
      FROM versiones_matriz
      WHERE fecha_vigencia <= $1
      ORDER BY fecha_vigencia DESC
      LIMIT 1
    `, [date]);

    return result.rows[0] || null;
  }

async getLegacyMatrixStructure(versionId) {
  const versionResult = await this.db.query(
    'SELECT * FROM versiones_matriz WHERE id = $1',
    [versionId]
  );

  if (versionResult.rows.length === 0) {
    return null;
  }

  const version = versionResult.rows[0];

  const frentesResult = await this.db.query(`
    SELECT id, codigo, nombre, peso_maximo, orden
    FROM version_frentes
    WHERE version_id = $1 AND activo = TRUE
    ORDER BY orden
  `, [versionId]);

  const estructura = {
    version,
    frentes: []
  };

  for (const frente of frentesResult.rows) {
    const atributosResult = await this.db.query(`
      SELECT id, nombre, peso_maximo, orden
      FROM version_atributos
      WHERE version_frente_id = $1 AND activo = TRUE
      ORDER BY orden
    `, [frente.id]);

    const frenteData = {
      ...frente,
      atributos: []
    };

    for (const atributo of atributosResult.rows) {
      const subMotivosResult = await this.db.query(`
        SELECT id, codigo, descripcion, peso_individual, orden
        FROM version_sub_motivos
        WHERE version_atributo_id = $1 AND activo = TRUE
        ORDER BY orden
      `, [atributo.id]);

      frenteData.atributos.push({
        ...atributo,
        sub_motivos: subMotivosResult.rows
      });
    }

    estructura.frentes.push(frenteData);
  }

  return estructura;
}


async listLegacyMatrixVersions() {
  const result = await this.db.query(`
    SELECT
      id,
      version,
      descripcion,
      fecha_vigencia,
      activa,
      creado_por,
      creado_en,
      publicado_por,
      publicado_en
    FROM versiones_matriz
    ORDER BY creado_en DESC
  `);

  return result.rows;
}

}

module.exports = DomainRepository;
