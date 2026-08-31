class MatrixRepository {
  constructor(db = null) {
    // Carga perezosa: los tests pueden inyectar un fake DB sin abrir PostgreSQL.
    // En producción, al no recibir db, se usa el pool real.
    this.db = db || require('../../../models/database').pool;
  }

  async getLegacyActiveMatrixVersion(matrizId) {
    const result = await this.db.query(`
        SELECT *
        FROM versiones_matriz
        WHERE matriz_id = $1
          AND activa = TRUE
        ORDER BY fecha_vigencia DESC, id DESC
        LIMIT 1
    `, [matrizId]);

    return result.rows[0] || null;
}


  async getLegacyEvaluationActiveVersion(matrizId) {
    const result = await this.db.query(`
        SELECT *
        FROM versiones_matriz
        WHERE matriz_id = $1
          AND activa = TRUE
        ORDER BY fecha_vigencia DESC, id DESC
        LIMIT 1
    `, [matrizId]);

    return result.rows[0] || null;
}

async getLegacyMatrixVersionByDate(matrizId, date) {
    const result = await this.db.query(`
        SELECT *
        FROM versiones_matriz
        WHERE matriz_id = $1
          AND fecha_vigencia <= $2
        ORDER BY fecha_vigencia DESC, id DESC
        LIMIT 1
    `, [
        matrizId,
        date
    ]);
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

async listLegacyMatrixVersions(matrizId = null) {
  const params = [];

  let sql = `
    SELECT
      id,
      matriz_id,
      version,
      descripcion,
      fecha_vigencia,
      activa,
      creado_por,
      creado_en,
      publicado_por,
      publicado_en
    FROM versiones_matriz
  `;

  if (matrizId !== null && matrizId !== undefined) {
    params.push(matrizId);

    sql += `
      WHERE matriz_id = $1
      ORDER BY fecha_vigencia DESC, creado_en DESC, id DESC
    `;
  } else {
    /*
     * Compatibilidad legacy:
     * el endpoint histórico sin matriz conserva
     * exactamente su orden original.
     */
    sql += `
      ORDER BY creado_en DESC
    `;
  }

  const result = await this.db.query(sql, params);

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


async listLegacyFrentes(matrizId = null) {
  const hasMatrizId =
    matrizId !== null &&
    matrizId !== undefined &&
    matrizId !== '';

  const params = [];

  let sql = `
    SELECT
      vf.id,
      vf.codigo,
      vf.nombre,
      vf.peso_maximo,
      vf.orden,
      vf.activo
    FROM version_frentes vf
    JOIN versiones_matriz vm
      ON vm.id = vf.version_id
    WHERE vm.activa = TRUE
  `;

  if (hasMatrizId) {
    params.push(Number(matrizId));
    sql += ` AND vm.matriz_id = $1`;
  }

  sql += ` ORDER BY vf.orden`;

  const result =
    await this.db.query(sql, params);

  return result.rows;
}

async listLegacyAtributos(
  frenteId = null,
  matrizId = null
) {
  let sql = `
    SELECT
      va.id,
      va.version_frente_id AS frente_id,
      va.nombre,
      va.peso_maximo,
      va.orden,
      va.activo
    FROM version_atributos va
    JOIN version_frentes vf
      ON vf.id = va.version_frente_id
    JOIN versiones_matriz vm
      ON vm.id = vf.version_id
    WHERE vm.activa = TRUE
  `;

  const params = [];

  const hasMatrizId =
    matrizId !== null &&
    matrizId !== undefined &&
    matrizId !== '';

  if (hasMatrizId) {
    params.push(Number(matrizId));

    sql +=
      ` AND vm.matriz_id = $${params.length}`;
  }

  if (frenteId) {
    params.push(frenteId);

    sql +=
      ` AND va.version_frente_id = $${params.length}`;
  }

  if (frenteId) {
    sql += ` ORDER BY va.orden`;
  } else {
    sql +=
      ` ORDER BY va.version_frente_id, va.orden`;
  }

  const result =
    await this.db.query(
      sql,
      params
    );

  return result.rows;
}

async listLegacySubMotivos(
  atributoId = null,
  matrizId = null
) {
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
    JOIN version_atributos va
      ON va.id = vsm.version_atributo_id
    JOIN version_frentes vf
      ON vf.id = va.version_frente_id
    JOIN versiones_matriz vm
      ON vm.id = vf.version_id
    WHERE vm.activa = TRUE
  `;

  const params = [];

  const hasMatrizId =
    matrizId !== null &&
    matrizId !== undefined &&
    matrizId !== '';

  if (hasMatrizId) {
    params.push(Number(matrizId));

    sql +=
      ` AND vm.matriz_id = $${params.length}`;
  }

  if (atributoId) {
    params.push(atributoId);

    sql +=
      ` AND vsm.version_atributo_id = $${params.length}`;
  }

  if (atributoId) {
    sql += ` ORDER BY vsm.orden`;
  } else {
    sql +=
      ` ORDER BY vsm.version_atributo_id, vsm.orden`;
  }

  const result =
    await this.db.query(
      sql,
      params
    );

  return result.rows;
}

async listLegacyEvaluationRulesAdmin(matrizId = null) {
  const params = [];

  let sql = `
    SELECT
      re.*,
      vm.version AS version_nombre
    FROM reglas_evaluacion re
    JOIN versiones_matriz vm
      ON re.version_id = vm.id
  `;

  if (
    matrizId !== null &&
    matrizId !== undefined &&
    matrizId !== ''
  ) {
    params.push(Number(matrizId));

    sql += `
      WHERE vm.matriz_id = $1
    `;
  }

  sql += `
    ORDER BY vm.id, re.orden
  `;

  const result = await this.db.query(sql, params);

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


async getActiveFront(client, frontId, versionId) {
  const result = await client.query(
    `SELECT id, codigo, nombre, peso_maximo, orden, activo
     FROM version_frentes
     WHERE id = $1 AND version_id = $2 AND activo = TRUE`,
    [frontId, versionId]
  );
  return result.rows[0] || null;
}

async getAttributeInActiveVersion(client, attributeId, versionId) {
  const result = await client.query(`
    SELECT
      va.id,
      va.version_frente_id AS frente_id,
      va.nombre,
      va.peso_maximo,
      va.orden,
      va.activo
    FROM version_atributos va
    JOIN version_frentes vf ON vf.id = va.version_frente_id
    WHERE va.id = $1
      AND vf.version_id = $2
  `, [attributeId, versionId]);

  return result.rows[0] || null;
}

async findAttributeByName(
  client,
  versionId,
  frontId,
  nombre,
  excludeId = null
) {
  const params = [versionId, frontId, nombre];
  let sql = `
    SELECT va.id
    FROM version_atributos va
    JOIN version_frentes vf ON vf.id = va.version_frente_id
    WHERE vf.version_id = $1
      AND va.version_frente_id = $2
      AND va.nombre = $3
  `;

  if (excludeId !== null) {
    params.push(excludeId);
    sql += ' AND va.id != $4';
  }

  const result = await client.query(sql, params);
  return result.rows[0] || null;
}

async sumActiveAttributeWeights(
  client,
  versionId,
  frontId,
  excludeId = null
) {
  const params = [versionId, frontId];
  let sql = `
    SELECT COALESCE(SUM(va.peso_maximo), 0) AS total
    FROM version_atributos va
    JOIN version_frentes vf ON vf.id = va.version_frente_id
    WHERE vf.version_id = $1
      AND va.version_frente_id = $2
      AND va.activo = TRUE
  `;

  if (excludeId !== null) {
    params.push(excludeId);
    sql += ' AND va.id != $3';
  }

  const result = await client.query(sql, params);
  return parseFloat(result.rows[0]?.total || 0);
}

async insertAttribute(client, data) {
  const result = await client.query(`
    INSERT INTO version_atributos (
      version_frente_id,
      nombre,
      peso_maximo,
      orden,
      activo,
      created_at,
      updated_at
    ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
    RETURNING id,
              version_frente_id AS frente_id,
              nombre,
              peso_maximo,
              orden,
              activo
  `, [
    data.frontId,
    data.nombre,
    data.pesoMaximo,
    data.orden,
    data.activo
  ]);

  return result.rows[0];
}

async updateAttribute(client, id, data) {
  const result = await client.query(`
    UPDATE version_atributos
    SET version_frente_id = $1,
        nombre = $2,
        peso_maximo = $3,
        orden = $4,
        activo = $5,
        updated_at = NOW()
    WHERE id = $6
    RETURNING id,
              version_frente_id AS frente_id,
              nombre,
              peso_maximo,
              orden,
              activo
  `, [
    data.frontId,
    data.nombre,
    data.pesoMaximo,
    data.orden,
    data.activo,
    id
  ]);

  return result.rows[0] || null;
}

async countAttributeSubReasons(client, attributeId) {
  const result = await client.query(
    `SELECT COUNT(*)::int AS total
     FROM version_sub_motivos
     WHERE version_atributo_id = $1`,
    [attributeId]
  );
  return Number(result.rows[0]?.total || 0);
}

async deleteAttributeTree(client, attributeId, versionId) {
  const attribute = await this.getAttributeInActiveVersion(
    client,
    attributeId,
    versionId
  );

  if (!attribute) return null;

  const totalSubReasons = await this.countAttributeSubReasons(
    client,
    attributeId
  );

  await client.query(
    'DELETE FROM version_sub_motivos WHERE version_atributo_id = $1',
    [attributeId]
  );

  await client.query(
    `DELETE FROM version_atributos va
     USING version_frentes vf
     WHERE va.id = $1
       AND va.version_frente_id = vf.id
       AND vf.version_id = $2`,
    [attributeId, versionId]
  );

  return {
    attribute,
    totalSubReasons
  };
}


async getSubReasonInActiveVersion(client, subReasonId, versionId) {
  const result = await client.query(`
    SELECT
      vsm.id,
      vsm.version_atributo_id AS atributo_id,
      vsm.codigo,
      vsm.descripcion,
      vsm.peso_individual,
      vsm.orden,
      vsm.activo,
      vsm.clasificacion
    FROM version_sub_motivos vsm
    JOIN version_atributos va ON va.id = vsm.version_atributo_id
    JOIN version_frentes vf ON vf.id = va.version_frente_id
    WHERE vsm.id = $1
      AND vf.version_id = $2
  `, [subReasonId, versionId]);

  return result.rows[0] || null;
}

async findSubReasonByCode(
  client,
  versionId,
  attributeId,
  codigo,
  excludeId = null
) {
  const params = [versionId, codigo, attributeId];
  let sql = `
    SELECT vsm.id
    FROM version_sub_motivos vsm
    JOIN version_atributos va ON va.id = vsm.version_atributo_id
    JOIN version_frentes vf ON vf.id = va.version_frente_id
    WHERE vf.version_id = $1
      AND vsm.codigo = $2
      AND vsm.version_atributo_id = $3
  `;

  if (excludeId !== null) {
    params.push(excludeId);
    sql += ' AND vsm.id != $4';
  }

  const result = await client.query(sql, params);
  return result.rows[0] || null;
}

async sumActiveSubReasonWeights(
  client,
  versionId,
  attributeId,
  excludeId = null
) {
  const params = [versionId, attributeId];
  let sql = `
    SELECT COALESCE(SUM(vsm.peso_individual), 0) AS total
    FROM version_sub_motivos vsm
    JOIN version_atributos va ON va.id = vsm.version_atributo_id
    JOIN version_frentes vf ON vf.id = va.version_frente_id
    WHERE vf.version_id = $1
      AND vsm.version_atributo_id = $2
      AND vsm.activo = TRUE
  `;

  if (excludeId !== null) {
    params.push(excludeId);
    sql += ' AND vsm.id != $3';
  }

  const result = await client.query(sql, params);
  return parseFloat(result.rows[0]?.total || 0);
}

async insertSubReason(client, data) {
  const result = await client.query(`
    INSERT INTO version_sub_motivos (
      version_atributo_id,
      codigo,
      descripcion,
      peso_individual,
      orden,
      activo,
      created_at,
      updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
    RETURNING id,
              version_atributo_id AS atributo_id,
              codigo,
              descripcion,
              peso_individual,
              orden,
              activo,
              clasificacion
  `, [
    data.attributeId,
    data.codigo,
    data.descripcion,
    data.peso,
    data.orden,
    data.activo
  ]);

  return result.rows[0];
}

async updateSubReason(client, id, data) {
  const result = await client.query(`
    UPDATE version_sub_motivos
    SET version_atributo_id = $1,
        codigo = $2,
        descripcion = $3,
        peso_individual = $4,
        orden = $5,
        activo = $6,
        updated_at = NOW()
    WHERE id = $7
    RETURNING id,
              version_atributo_id AS atributo_id,
              codigo,
              descripcion,
              peso_individual,
              orden,
              activo,
              clasificacion
  `, [
    data.attributeId,
    data.codigo,
    data.descripcion,
    data.peso,
    data.orden,
    data.activo,
    id
  ]);

  return result.rows[0] || null;
}

async deleteSubReason(client, id, versionId) {
  const current = await this.getSubReasonInActiveVersion(
    client,
    id,
    versionId
  );

  if (!current) return null;

  await client.query(`
    DELETE FROM version_sub_motivos vsm
    USING version_atributos va, version_frentes vf
    WHERE vsm.id = $1
      AND vsm.version_atributo_id = va.id
      AND va.version_frente_id = vf.id
      AND vf.version_id = $2
  `, [id, versionId]);

  return current;
}


async getActiveVersionSource(client, matrizId = null) {
  const hasMatrizId =
    matrizId !== null &&
    matrizId !== undefined &&
    matrizId !== '';

  if (hasMatrizId) {
    const parsedMatrizId = Number(matrizId);

    if (
      !Number.isInteger(parsedMatrizId) ||
      parsedMatrizId <= 0
    ) {
      return null;
    }

    const result = await client.query(
      `
        SELECT
          id,
          matriz_id,
          version
        FROM versiones_matriz
        WHERE matriz_id = $1
          AND activa = TRUE
        ORDER BY fecha_vigencia DESC, id DESC
        LIMIT 1
      `,
      [parsedMatrizId]
    );

    return result.rows[0] || null;
  }

  /*
   * Compatibilidad legacy temporal.
   * Mientras existan consumidores que todavía no transportan
   * matriz_id, se conserva el comportamiento histórico.
   */
  const result = await client.query(`
    SELECT
      id,
      matriz_id,
      version
    FROM versiones_matriz
    WHERE activa = TRUE
    LIMIT 1
  `);

  return result.rows[0] || null;
}

async getVersionById(client, id) {
  const result = await client.query(`
    SELECT id, matriz_id, version, descripcion, fecha_vigencia, activa
    FROM versiones_matriz
    WHERE id = $1
  `, [id]);
  return result.rows[0] || null;
}

async findVersionByName(
  client,
  matrizId,
  version
) {
  const result =
    await client.query(
      `
        SELECT
          id,
          matriz_id,
          version
        FROM versiones_matriz
        WHERE matriz_id = $1
          AND version = $2
        LIMIT 1
      `,
      [
        matrizId,
        version
      ]
    );

  return result.rows[0] || null;
}

async insertVersion(client, {
  matrizId,
  version,
  descripcion,
  fechaVigencia = null,
  activa = false
}) {
  const result = await client.query(`
    INSERT INTO versiones_matriz (
      matriz_id,
      version,
      descripcion,
      fecha_vigencia,
      activa,
      creado_por,
      creado_en
    ) VALUES ($1, $2, $3, $4, $5, $6, NOW())
    RETURNING *
  `, [
    matrizId,
    version,
    descripcion,
    fechaVigencia,
    activa,
    'Sistema'
  ]);
  return result.rows[0];
}

async copyVersionTree(client, sourceVersionId, targetVersionId) {
  const frentes = await client.query(`
    SELECT id, codigo, nombre, peso_maximo, orden, activo
    FROM version_frentes
    WHERE version_id = $1
    ORDER BY orden, id
  `, [sourceVersionId]);

  const frontMap = new Map();
  let totalAttributes = 0;
  let totalSubReasons = 0;

  for (const front of frentes.rows) {
    const insertedFront = await client.query(`
      INSERT INTO version_frentes (
        version_id, codigo, nombre, peso_maximo, orden, activo,
        created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      RETURNING id
    `, [
      targetVersionId,
      front.codigo,
      front.nombre,
      front.peso_maximo,
      front.orden,
      front.activo
    ]);

    frontMap.set(front.id, insertedFront.rows[0].id);
  }

  for (const [oldFrontId, newFrontId] of frontMap.entries()) {
    const attrs = await client.query(`
      SELECT id, nombre, peso_maximo, orden, activo
      FROM version_atributos
      WHERE version_frente_id = $1
      ORDER BY orden, id
    `, [oldFrontId]);

    for (const attr of attrs.rows) {
      const insertedAttr = await client.query(`
        INSERT INTO version_atributos (
          version_frente_id, nombre, peso_maximo, orden, activo,
          created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
        RETURNING id
      `, [
        newFrontId,
        attr.nombre,
        attr.peso_maximo,
        attr.orden,
        attr.activo
      ]);

      totalAttributes++;
      const newAttrId = insertedAttr.rows[0].id;

      const subs = await client.query(`
        SELECT codigo, descripcion, peso_individual, orden, activo, clasificacion
        FROM version_sub_motivos
        WHERE version_atributo_id = $1
        ORDER BY orden, id
      `, [attr.id]);

      for (const sub of subs.rows) {
        await client.query(`
          INSERT INTO version_sub_motivos (
            version_atributo_id, codigo, descripcion, peso_individual,
            orden, activo, clasificacion, created_at, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
        `, [
          newAttrId,
          sub.codigo,
          sub.descripcion,
          sub.peso_individual,
          sub.orden,
          sub.activo,
          sub.clasificacion
        ]);
        totalSubReasons++;
      }
    }
  }

  // Las reglas son versionadas. Si existen, el snapshot debe conservarlas.
  const rulesTable = await client.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_name = 'reglas_evaluacion'
    )
  `);

  let totalRules = 0;
  if (rulesTable.rows[0]?.exists) {
    const rules = await client.query(`
      SELECT
        submotivo_origen, bloque_origen, atributo_origen,
        valor_condicion, accion_tipo, accion_valor,
        submotivos_afectados, excepciones, orden, activo
      FROM reglas_evaluacion
      WHERE version_id = $1
      ORDER BY orden, id
    `, [sourceVersionId]);

    for (const rule of rules.rows) {
      await client.query(`
        INSERT INTO reglas_evaluacion (
          version_id, submotivo_origen, bloque_origen, atributo_origen,
          valor_condicion, accion_tipo, accion_valor,
          submotivos_afectados, excepciones, orden, activo
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
      `, [
        targetVersionId,
        rule.submotivo_origen,
        rule.bloque_origen,
        rule.atributo_origen,
        rule.valor_condicion,
        rule.accion_tipo,
        rule.accion_valor,
        rule.submotivos_afectados == null
          ? null
          : JSON.stringify(rule.submotivos_afectados),
        rule.excepciones == null
          ? null
          : JSON.stringify(rule.excepciones),
        rule.orden,
        rule.activo
      ]);
      totalRules++;
    }
  }

  return {
    frentes: frentes.rows.length,
    atributos: totalAttributes,
    sub_motivos: totalSubReasons,
    reglas: totalRules
  };
}

async activateVersion(client, id) {
    const versionId =
        Number(id);

    if (
        !Number.isInteger(versionId) ||
        versionId <= 0
    ) {
        return null;
    }

    // ==================================================
    // 1. OBTENER VERSIÓN QUE SE QUIERE ACTIVAR
    // ==================================================

    const target =
        await this.getVersionById(
            client,
            versionId
        );

    if (!target) {
        return null;
    }

    const matrizId =
        Number(
            target.matriz_id
        );

    if (
        !Number.isInteger(matrizId) ||
        matrizId <= 0
    ) {
        throw new Error(
            `La versión ${versionId} no tiene una matriz válida asociada`
        );
    }


    // ==================================================
    // 2. DESACTIVAR SOLAMENTE VERSIONES
    //    DE LA MISMA MATRIZ
    // ==================================================

    await client.query(
        `
        UPDATE versiones_matriz
        SET activa = FALSE
        WHERE matriz_id = $1
          AND activa = TRUE
          AND id <> $2
        `,
        [
            matrizId,
            versionId
        ]
    );


    // ==================================================
    // 3. ACTIVAR LA VERSIÓN SELECCIONADA
    // ==================================================

    const result =
        await client.query(
            `
            UPDATE versiones_matriz
            SET
                activa = TRUE,
                publicado_por =
                    COALESCE(
                        publicado_por,
                        $2
                    ),
                publicado_en = NOW()
            WHERE id = $1
              AND matriz_id = $3
            RETURNING *
            `,
            [
                versionId,
                'Sistema',
                matrizId
            ]
        );


    return (
        result.rows[0] ||
        null
    );
}

async getVersionIntegrity(client, versionId) {
  const version = await this.getVersionById(client, versionId);
  if (!version) return null;

  const fronts = await client.query(`
    SELECT id, codigo, nombre, peso_maximo
    FROM version_frentes
    WHERE version_id = $1 AND activo = TRUE
    ORDER BY orden, id
  `, [versionId]);

  const violations = [];
  const frontTotal = fronts.rows.reduce(
    (sum, f) => sum + Number(f.peso_maximo || 0), 0
  );

  if (Math.abs(frontTotal - 100) > 0.0001) {
    violations.push({
      nivel: 'frentes',
      mensaje: `La suma total de frentes es ${frontTotal}% y debe ser 100%`
    });
  }

  for (const front of fronts.rows) {
    const attrs = await client.query(`
      SELECT id, nombre, peso_maximo
      FROM version_atributos
      WHERE version_frente_id = $1 AND activo = TRUE
      ORDER BY orden, id
    `, [front.id]);

    const attrTotal = attrs.rows.reduce(
      (sum, a) => sum + Number(a.peso_maximo || 0), 0
    );

    if (Math.abs(attrTotal - Number(front.peso_maximo)) > 0.0001) {
      violations.push({
        nivel: 'atributos',
        frente_id: front.id,
        frente: front.codigo,
        mensaje: `Los atributos suman ${attrTotal}% y el frente tiene ${front.peso_maximo}%`
      });
    }

    for (const attr of attrs.rows) {
      const subs = await client.query(`
        SELECT id, codigo, peso_individual
        FROM version_sub_motivos
        WHERE version_atributo_id = $1 AND activo = TRUE
        ORDER BY orden, id
      `, [attr.id]);

      const subTotal = subs.rows.reduce(
        (sum, s) => sum + Number(s.peso_individual || 0), 0
      );

      if (Math.abs(subTotal - Number(attr.peso_maximo)) > 0.0001) {
        violations.push({
          nivel: 'sub_motivos',
          atributo_id: attr.id,
          atributo: attr.nombre,
          mensaje: `Los sub-motivos suman ${subTotal}% y el atributo tiene ${attr.peso_maximo}%`
        });
      }
    }
  }

  return {
    ok: violations.length === 0,
    version_id: versionId,
    total_frentes: frontTotal,
    violations
  };
}

async validateFrontWeight(client, {
  frenteId,
  nuevoPeso,
  excluirId,
  versionId = null
}) {
  let resolvedVersionId = versionId;

  // Compatibilidad legacy temporal
  if (!resolvedVersionId) {
    const source =
      await this.getActiveVersionSource(client);

    if (!source) {
      return {
        notFound: 'No hay versión activa'
      };
    }

    resolvedVersionId = source.id;
  }

  const params = [resolvedVersionId];

  let sql = `
    SELECT COALESCE(SUM(peso_maximo), 0) AS total
    FROM version_frentes
    WHERE version_id = $1
      AND activo = TRUE
  `;

  if (excluirId) {
    params.push(excluirId);
    sql += ` AND id != $2`;
  }

  const sum = await client.query(
    sql,
    params
  );

  const total =
    Number(sum.rows[0]?.total || 0) +
    Number(nuevoPeso || 0);

  return {
    total,
    max: 100
  };
}

async validateAttributeWeight(client, {
  frenteId,
  nuevoPeso,
  excluirId,
  versionId = null
}) {
  let resolvedVersionId = versionId;

  if (!resolvedVersionId) {
    const source =
      await this.getActiveVersionSource(client);

    if (!source) {
      return {
        notFound: 'No hay versión activa'
      };
    }

    resolvedVersionId = source.id;
  }

  const front =
    await this.getActiveFront(
      client,
      frenteId,
      resolvedVersionId
    );

  if (!front) {
    return {
      notFound: 'Frente no encontrado'
    };
  }

  const params = [
    resolvedVersionId,
    frenteId
  ];

  let sql = `
    SELECT
      COALESCE(SUM(va.peso_maximo), 0) AS total
    FROM version_atributos va
    JOIN version_frentes vf
      ON vf.id = va.version_frente_id
    WHERE vf.version_id = $1
      AND va.version_frente_id = $2
      AND va.activo = TRUE
  `;

  if (excluirId) {
    params.push(excluirId);
    sql += ` AND va.id != $3`;
  }

  const sum = await client.query(
    sql,
    params
  );

  return {
    total:
      Number(sum.rows[0]?.total || 0) +
      Number(nuevoPeso || 0),

    max: Number(front.peso_maximo)
  };
}

async validateSubReasonWeight(client, {
  atributoId,
  nuevoPeso,
  excluirId,
  versionId = null
}) {
  let resolvedVersionId = versionId;

  if (!resolvedVersionId) {
    const source =
      await this.getActiveVersionSource(client);

    if (!source) {
      return {
        notFound: 'No hay versión activa'
      };
    }

    resolvedVersionId = source.id;
  }

  const attr =
    await this.getActiveAttribute(
      client,
      atributoId,
      resolvedVersionId
    );

  if (!attr) {
    return {
      notFound: 'Atributo no encontrado'
    };
  }

  const params = [
    resolvedVersionId,
    atributoId
  ];

  let sql = `
    SELECT
      COALESCE(SUM(vsm.peso_individual), 0) AS total
    FROM version_sub_motivos vsm
    JOIN version_atributos va
      ON va.id = vsm.version_atributo_id
    JOIN version_frentes vf
      ON vf.id = va.version_frente_id
    WHERE vf.version_id = $1
      AND vsm.version_atributo_id = $2
      AND vsm.activo = TRUE
  `;

  if (excluirId) {
    params.push(excluirId);
    sql += ` AND vsm.id != $3`;
  }

  const sum = await client.query(
    sql,
    params
  );

  return {
    total:
      Number(sum.rows[0]?.total || 0) +
      Number(nuevoPeso || 0),

    max: Number(attr.peso_maximo)
  };
}

async getEvaluationRuleById(client, id) {
  const result = await client.query(
    `
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
      WHERE id = $1
      LIMIT 1
    `,
    [id]
  );

  return result.rows[0] || null;
}

async getEvaluationRuleByIdAndVersion(
  client,
  id,
  versionId
) {
  const result = await client.query(
    `
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
      WHERE id = $1
        AND version_id = $2
      LIMIT 1
    `,
    [id, versionId]
  );

  return result.rows[0] || null;
}

async getEvaluationRuleById(client, id) {
    const result =
        await client.query(
            `
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
                WHERE id = $1
                LIMIT 1
            `,
            [id]
        );

    return result.rows[0] || null;
}


async getEvaluationRuleVersion(client, versionId) {
    const result =
        await client.query(
            `
                SELECT
                    id,
                    matriz_id,
                    version,
                    activa,
                    publicado_en
                FROM versiones_matriz
                WHERE id = $1
                LIMIT 1
            `,
            [versionId]
        );

    return result.rows[0] || null;
}

async createEvaluationRule(client, data) {
  const affected = data.submotivos_afectados == null
    ? null
    : JSON.stringify(data.submotivos_afectados);

  const exceptions = data.excepciones == null
    ? null
    : JSON.stringify(data.excepciones);

  const result = await client.query(`
    INSERT INTO reglas_evaluacion (
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
      activo,
      created_at,
      updated_at
    ) VALUES (
      $1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9::jsonb,$10,$11,NOW(),NOW()
    )
    RETURNING *
  `, [
    data.version_id,
    data.submotivo_origen,
    data.bloque_origen,
    data.atributo_origen,
    data.valor_condicion || '0',
    data.accion_tipo || 'marcar_no_aplica',
    data.accion_valor || 'NA',
    affected,
    exceptions,
    data.orden || 0,
    data.activo !== false
  ]);

  return result.rows[0];
}

async updateEvaluationRule(client, id, data) {
  const affected = data.submotivos_afectados == null
    ? null
    : JSON.stringify(data.submotivos_afectados);

  const exceptions = data.excepciones == null
    ? null
    : JSON.stringify(data.excepciones);

  const result = await client.query(`
    UPDATE reglas_evaluacion
    SET
      submotivo_origen = $1,
      bloque_origen = $2,
      atributo_origen = $3,
      valor_condicion = $4,
      accion_tipo = $5,
      accion_valor = $6,
      submotivos_afectados = $7::jsonb,
      excepciones = $8::jsonb,
      orden = $9,
      activo = $10,
      updated_at = NOW()
    WHERE id = $11
    RETURNING *
  `, [
    data.submotivo_origen,
    data.bloque_origen,
    data.atributo_origen,
    data.valor_condicion || '0',
    data.accion_tipo || 'marcar_no_aplica',
    data.accion_valor || 'NA',
    affected,
    exceptions,
    data.orden || 0,
    data.activo !== false,
    id
  ]);

  return result.rows[0] || null;
}

async deleteEvaluationRule(client, id) {
  const result = await client.query(
    'DELETE FROM reglas_evaluacion WHERE id = $1 RETURNING id',
    [id]
  );
  return result.rows[0] || null;
}

async getActiveEvaluationStructure(versionId = null) {
  const tableExists =
    await this.matrixVersionsTableExists();

  if (!tableExists) {
    return {
      version: 'default',
      frentes: [],
      reglas: [],
      message:
        'Tablas de estructura no configuradas aún'
    };
  }

  let selectedVersion = null;

  // ========================================================
  // NUEVO CONTRATO
  // ========================================================
  if (
    versionId !== null &&
    versionId !== undefined &&
    versionId !== ''
  ) {
    const parsedVersionId =
      Number(versionId);

    if (
      !Number.isInteger(parsedVersionId) ||
      parsedVersionId <= 0
    ) {
      return null;
    }

    const result = await this.db.query(
      `
        SELECT
          id,
          matriz_id,
          version,
          fecha_vigencia,
          activa
        FROM versiones_matriz
        WHERE id = $1
        LIMIT 1
      `,
      [parsedVersionId]
    );

    selectedVersion =
      result.rows[0] || null;
  }

  // ========================================================
  // FALLBACK LEGACY
  // ========================================================
  if (!selectedVersion) {
    /*
    * Compatibilidad legacy:
    * sin version_matriz_id explícita conservamos
    * la resolución histórica de una versión activa global.
    *
    * getActiveVersionSource() ya encapsula ese fallback.
    */
    selectedVersion =
      await this.getActiveVersionSource(
        this.db
      );
  }

  if (!selectedVersion) {
    return {
      version: 'default',
      frentes: [],
      reglas: [],
      message:
        'No hay versión activa configurada'
    };
  }

  const structure =
    await this.getLegacyMatrixStructure(
      selectedVersion.id
    );

  const rules =
    await this.getLegacyEvaluationRulesByVersion(
      selectedVersion.id
    );

  return {
    version:
      selectedVersion.version ||
      'default',

    version_matriz_id:
      selectedVersion.id,

    matriz_id:
      selectedVersion.matriz_id || null,

    frentes:
      structure?.frentes || [],

    reglas:
      rules || []
  };
}

}

module.exports = MatrixRepository;
