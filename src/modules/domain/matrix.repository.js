class MatrixRepository {
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



async matrixVersionsTableExists() {
  const result = await this.db.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_name = 'versiones_matriz'
    );
  `);

  return Boolean(result.rows[0]?.exists);
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


async getLegacyEvaluationRulesByVersion(versionId) {
  const checkTable = await this.db.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_name = 'reglas_evaluacion'
    );
  `);

  if (!checkTable.rows[0].exists) {
    return [];
  }

  const result = await this.db.query(`
    SELECT
      id,
      version_id,
      submotivo_origen,
      bloque_origen,
      atributo_origen,
      valor_condicion,
      accion_tipo,
      accion_valor,
      submotivos_afectados,
      excepciones,
      orden,
      activo
    FROM reglas_evaluacion
    WHERE version_id = $1 AND activo = TRUE
    ORDER BY orden
  `, [versionId]);

  return result.rows;
}


async listLegacyFrentes() {
  const result = await this.db.query(`
    SELECT
      vf.id,
      vf.codigo,
      vf.nombre,
      vf.peso_maximo,
      vf.orden,
      vf.activo
    FROM version_frentes vf
    JOIN versiones_matriz vm ON vm.id = vf.version_id
    WHERE vm.activa = TRUE
    ORDER BY vf.orden
  `);

  return result.rows;
}

async listLegacyAtributos(frenteId = null) {
  let sql = `
    SELECT
      va.id,
      va.version_frente_id AS frente_id,
      va.nombre,
      va.peso_maximo,
      va.orden,
      va.activo
    FROM version_atributos va
    JOIN version_frentes vf ON vf.id = va.version_frente_id
    JOIN versiones_matriz vm ON vm.id = vf.version_id
    WHERE vm.activa = TRUE
  `;
  const params = [];

  if (frenteId) {
    sql += ' AND va.version_frente_id = $1 ORDER BY va.orden';
    params.push(frenteId);
  } else {
    sql += ' ORDER BY va.version_frente_id, va.orden';
  }

  const result = await this.db.query(sql, params);
  return result.rows;
}

async listLegacySubMotivos(atributoId = null) {
  let sql = `
    SELECT
      vsm.id,
      vsm.version_atributo_id AS atributo_id,
      vsm.codigo,
      vsm.descripcion,
      vsm.peso_individual,
      vsm.orden,
      vsm.activo
    FROM version_sub_motivos vsm
    JOIN version_atributos va ON va.id = vsm.version_atributo_id
    JOIN version_frentes vf ON vf.id = va.version_frente_id
    JOIN versiones_matriz vm ON vm.id = vf.version_id
    WHERE vm.activa = TRUE
  `;
  const params = [];

  if (atributoId) {
    sql += ' AND vsm.version_atributo_id = $1 ORDER BY vsm.orden';
    params.push(atributoId);
  } else {
    sql += ' ORDER BY vsm.version_atributo_id, vsm.orden';
  }

  const result = await this.db.query(sql, params);
  return result.rows;
}

async listLegacyEvaluationRulesAdmin() {
  const result = await this.db.query(`
    SELECT
      re.*,
      vm.version as version_nombre
    FROM reglas_evaluacion re
    JOIN versiones_matriz vm ON re.version_id = vm.id
    ORDER BY vm.id, re.orden
  `);

  return result.rows;
}


async withTransaction(work) {
  // Producción: pool.connect(). Tests: si el fake no expone connect,
  // se usa la misma dependencia con BEGIN/COMMIT/ROLLBACK.
  const client = typeof this.db.connect === 'function'
    ? await this.db.connect()
    : this.db;

  const shouldRelease = client !== this.db && typeof client.release === 'function';

  try {
    await client.query('BEGIN');
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (_) {
      // No ocultar el error original.
    }
    throw error;
  } finally {
    if (shouldRelease) client.release();
  }
}

async getActiveVersionId(client) {
  const result = await client.query(
    'SELECT id FROM versiones_matriz WHERE activa = TRUE LIMIT 1'
  );
  return result.rows[0]?.id || null;
}

async findFrontByCode(client, versionId, codigo, excludeId = null) {
  const params = [versionId, codigo];
  let sql =
    'SELECT id FROM version_frentes WHERE version_id = $1 AND codigo = $2';

  if (excludeId !== null) {
    params.push(excludeId);
    sql += ' AND id != $3';
  }

  const result = await client.query(sql, params);
  return result.rows[0] || null;
}

async getFrontByIdAndVersion(client, id, versionId) {
  const result = await client.query(
    `SELECT id, codigo, nombre, peso_maximo, orden, activo
     FROM version_frentes
     WHERE id = $1 AND version_id = $2`,
    [id, versionId]
  );
  return result.rows[0] || null;
}

async sumActiveFrontWeights(client, versionId, excludeId = null) {
  const params = [versionId];
  let sql =
    'SELECT COALESCE(SUM(peso_maximo), 0) AS total FROM version_frentes WHERE version_id = $1 AND activo = TRUE';

  if (excludeId !== null) {
    params.push(excludeId);
    sql += ' AND id != $2';
  }

  const result = await client.query(sql, params);
  return parseFloat(result.rows[0]?.total || 0);
}

async insertFront(client, data) {
  const result = await client.query(`
    INSERT INTO version_frentes (
      version_id,
      codigo,
      nombre,
      peso_maximo,
      orden,
      activo,
      created_at,
      updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
    RETURNING id, codigo, nombre, peso_maximo, orden, activo
  `, [
    data.versionId,
    data.codigo,
    data.nombre,
    data.pesoMaximo,
    data.orden,
    data.activo
  ]);

  return result.rows[0];
}

async updateFront(client, id, data) {
  const result = await client.query(`
    UPDATE version_frentes
    SET codigo = $1,
        nombre = $2,
        peso_maximo = $3,
        orden = $4,
        activo = $5,
        updated_at = NOW()
    WHERE id = $6
    RETURNING id, codigo, nombre, peso_maximo, orden, activo
  `, [
    data.codigo,
    data.nombre,
    data.pesoMaximo,
    data.orden,
    data.activo,
    id
  ]);

  return result.rows[0] || null;
}

async deleteFrontTree(client, id, versionId) {
  const front = await this.getFrontByIdAndVersion(client, id, versionId);
  if (!front) return null;

  // Borrado explícito y transaccional para no depender de la configuración
  // ON DELETE CASCADE del entorno.
  await client.query(`
    DELETE FROM version_sub_motivos
    WHERE version_atributo_id IN (
      SELECT va.id
      FROM version_atributos va
      WHERE va.version_frente_id = $1
    )
  `, [id]);

  await client.query(
    'DELETE FROM version_atributos WHERE version_frente_id = $1',
    [id]
  );

  await client.query(
    'DELETE FROM version_frentes WHERE id = $1 AND version_id = $2',
    [id, versionId]
  );

  return front;
}

}

module.exports = MatrixRepository;
